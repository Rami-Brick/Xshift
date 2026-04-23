import { NextResponse, type NextRequest } from 'next/server';
import { eachDayOfInterval, parseISO } from 'date-fns';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { isStaffRole } from '@/lib/auth/roles';
import { adminLeaveUpdateSchema, employeeLeaveUpdateSchema } from '@/lib/validation/leave';
import { logActivity } from '@/lib/activity/log';
import type { LeaveStatus, Profile } from '@/types';

const LEAVE_SELECT =
  'id, user_id, start_date, end_date, type, status, reason, admin_note, deduct_balance, created_at, updated_at, profiles!leave_requests_user_id_fkey(id, full_name, email)';

type LeaveMutationRow = {
  id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  type: string;
  status: LeaveStatus;
  reason: string | null;
  admin_note: string | null;
  deduct_balance: boolean;
};

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const service = createServiceClient();
  const actor = await getActor();

  if (!actor) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const { data: leave } = await service
    .from('leave_requests')
    .select('id, user_id, start_date, end_date, type, status, reason, admin_note, deduct_balance')
    .eq('id', id)
    .single();

  if (!leave) {
    return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 });
  }

  if (isStaffRole(actor.profile.role)) {
    return updateLeaveAsAdmin(request, service, actor.userId, leave as LeaveMutationRow);
  }

  if (leave.user_id !== actor.userId) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  }

  return updateLeaveAsEmployee(request, service, actor.userId, leave as LeaveMutationRow);
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const service = createServiceClient();
  const actor = await getActor();

  if (!actor) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  if (actor.profile.role !== 'admin') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  }

  const { data: leave } = await service.from('leave_requests').select('user_id').eq('id', id).single();
  if (!leave) {
    return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 });
  }

  const { error } = await service.from('leave_requests').delete().eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logActivity({
    actorId: actor.userId,
    action: 'delete_leave',
    targetUserId: leave.user_id,
    details: { leave_id: id },
  });

  return NextResponse.json({ success: true });
}

async function updateLeaveAsEmployee(
  request: NextRequest,
  service: ReturnType<typeof createServiceClient>,
  actorId: string,
  leave: LeaveMutationRow,
) {
  if (leave.status !== 'pending' && leave.status !== 'approved') {
    return NextResponse.json(
      { error: 'Seules les demandes en attente ou approuvées peuvent être modifiées' },
      { status: 422 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = employeeLeaveUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'Données invalides' },
      { status: 422 },
    );
  }

  const { start_date, end_date, type, reason } = parsed.data;

  if (end_date < start_date) {
    return NextResponse.json(
      { error: 'La date de fin doit être après la date de début' },
      { status: 422 },
    );
  }

  if (leave.status === 'approved') {
    const rollbackError = await rollbackApprovedLeave(service, leave);
    if (rollbackError) return rollbackError;
  }

  const { data, error } = await service
    .from('leave_requests')
    .update({
      start_date,
      end_date,
      type,
      reason: reason ?? null,
      status: 'pending',
      admin_note: null,
      deduct_balance: false,
      reviewed_by: null,
      reviewed_at: null,
    })
    .eq('id', leave.id)
    .select(LEAVE_SELECT)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logActivity({
    actorId,
    action: 'update_leave',
    targetUserId: leave.user_id,
    details: { leave_id: leave.id, from_status: leave.status, to_status: 'pending' },
  });

  return NextResponse.json(normalizeLeaveResponse(data));
}

async function updateLeaveAsAdmin(
  request: NextRequest,
  service: ReturnType<typeof createServiceClient>,
  actorId: string,
  leave: LeaveMutationRow,
) {
  const body = await request.json().catch(() => null);
  const parsed = adminLeaveUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'Données invalides' },
      { status: 422 },
    );
  }

  const updates = parsed.data;
  const startDate = updates.start_date ?? leave.start_date;
  const endDate = updates.end_date ?? leave.end_date;
  const nextStatus = updates.status ?? leave.status;
  const nextDeductBalance = updates.deduct_balance ?? false;

  if (endDate < startDate) {
    return NextResponse.json(
      { error: 'La date de fin doit être après la date de début' },
      { status: 422 },
    );
  }

  if (leave.status === 'approved') {
    const rollbackError = await rollbackApprovedLeave(service, leave);
    if (rollbackError) return rollbackError;
  }

  const reviewFields =
    nextStatus === 'approved' || nextStatus === 'rejected' || nextStatus === 'cancelled'
      ? { reviewed_by: actorId, reviewed_at: new Date().toISOString() }
      : { reviewed_by: null, reviewed_at: null };

  const { data, error } = await service
    .from('leave_requests')
    .update({
      ...(updates.user_id ? { user_id: updates.user_id } : {}),
      start_date: startDate,
      end_date: endDate,
      type: updates.type ?? leave.type,
      reason: updates.reason ?? leave.reason,
      status: nextStatus,
      admin_note: updates.admin_note ?? leave.admin_note,
      deduct_balance: nextStatus === 'approved' ? nextDeductBalance : false,
      ...reviewFields,
    })
    .eq('id', leave.id)
    .select(LEAVE_SELECT)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (nextStatus === 'approved') {
    const approvalError = await applyLeaveApproval(
      service,
      {
        user_id: updates.user_id ?? leave.user_id,
        start_date: startDate,
        end_date: endDate,
      },
      actorId,
      nextDeductBalance,
    );
    if (approvalError) return approvalError;
  }

  const action = resolveLeaveAction(leave.status, nextStatus);
  await logActivity({
    actorId,
    action,
    targetUserId: updates.user_id ?? leave.user_id,
    details: { leave_id: leave.id, from_status: leave.status, to_status: nextStatus },
  });

  return NextResponse.json(normalizeLeaveResponse(data));
}

async function rollbackApprovedLeave(
  service: ReturnType<typeof createServiceClient>,
  leave: LeaveMutationRow,
): Promise<NextResponse | null> {
  const dates = dateStringsBetween(leave.start_date, leave.end_date);

  const { error: attendanceError } = await service
    .from('attendance')
    .delete()
    .eq('user_id', leave.user_id)
    .eq('status', 'leave')
    .is('check_in_at', null)
    .is('check_out_at', null)
    .in('date', dates);

  if (attendanceError) {
    return NextResponse.json(
      { error: 'Erreur lors de la réinitialisation des présences de congé' },
      { status: 500 },
    );
  }

  if (!leave.deduct_balance) return null;

  const { data: profile, error: profileError } = await service
    .from('profiles')
    .select('leave_balance')
    .eq('id', leave.user_id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du solde de congés' },
      { status: 500 },
    );
  }

  const refundedBalance = Number(profile.leave_balance ?? 0) + dates.length;
  const { error: refundError } = await service
    .from('profiles')
    .update({ leave_balance: refundedBalance })
    .eq('id', leave.user_id);

  if (refundError) {
    return NextResponse.json(
      { error: 'Erreur lors de la restitution du solde de congés' },
      { status: 500 },
    );
  }

  return null;
}

async function applyLeaveApproval(
  service: ReturnType<typeof createServiceClient>,
  leave: Pick<LeaveMutationRow, 'user_id' | 'start_date' | 'end_date'>,
  actorId: string,
  deductBalance: boolean,
): Promise<NextResponse | null> {
  const dates = dateStringsBetween(leave.start_date, leave.end_date);

  const { error: attendanceError } = await service
    .from('attendance')
    .upsert(
      dates.map((date) => ({
        user_id: leave.user_id,
        date,
        status: 'leave' as const,
        late_minutes: 0,
        forgot_checkout: false,
        created_by: actorId,
        updated_by: actorId,
      })),
      { onConflict: 'user_id,date' },
    );

  if (attendanceError) {
    return NextResponse.json(
      { error: 'Congé mis à jour, mais erreur lors de la création des présences' },
      { status: 500 },
    );
  }

  if (!deductBalance) return null;

  const { error: balanceError } = await service.rpc('decrement_leave_balance', {
    p_user_id: leave.user_id,
    p_days: dates.length,
  });

  if (balanceError) {
    return NextResponse.json(
      { error: 'Congé mis à jour, mais erreur lors de la déduction du solde' },
      { status: 500 },
    );
  }

  return null;
}

async function getActor(): Promise<{ userId: string; profile: Pick<Profile, 'id' | 'role' | 'is_active'> } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const service = createServiceClient();
  const { data: profile } = await service
    .from('profiles')
    .select('id, role, is_active')
    .eq('id', user.id)
    .single();

  if (!profile?.is_active) return null;

  return { userId: user.id, profile: profile as Pick<Profile, 'id' | 'role' | 'is_active'> };
}

function dateStringsBetween(startDate: string, endDate: string): string[] {
  return eachDayOfInterval({
    start: parseISO(startDate),
    end: parseISO(endDate),
  }).map((day) => day.toISOString().slice(0, 10));
}

function resolveLeaveAction(fromStatus: LeaveStatus, toStatus: LeaveStatus) {
  if (toStatus === 'approved') return 'approve_leave';
  if (toStatus === 'rejected') return 'reject_leave';
  if (toStatus === 'cancelled') return 'cancel_leave';
  return fromStatus === toStatus ? 'update_leave' : 'update_leave';
}

function normalizeLeaveResponse<T extends { profiles?: unknown }>(row: T): T {
  if (Array.isArray(row.profiles)) {
    return { ...row, profiles: row.profiles[0] ?? null };
  }
  return row;
}
