import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { isStaffRole } from '@/lib/auth/roles';
import {
  employeeDayOffUpdateSchema,
  adminDayOffUpdateSchema,
} from '@/lib/validation/day-off';
import { logActivity } from '@/lib/activity/log';
import { applyDayOffApproval, rollbackDayOffApproval } from '@/lib/day-off/attendance-sync';
import type { ActivityAction, DayOfWeek, DayOffChangeStatus, Profile } from '@/types';

const CHANGE_SELECT =
  'id, user_id, iso_year, iso_week, old_day, new_day, status, reason, admin_note, created_at, updated_at, profiles!day_off_changes_user_id_fkey(id, full_name, email)';

type ChangeRow = {
  id: string;
  user_id: string;
  iso_year: number;
  iso_week: number;
  old_day: DayOfWeek;
  new_day: DayOfWeek;
  status: DayOffChangeStatus;
  reason: string | null;
  admin_note: string | null;
};

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const service = createServiceClient();
  const actor = await getActor();

  if (!actor) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const { data: change } = await service
    .from('day_off_changes')
    .select('id, user_id, iso_year, iso_week, old_day, new_day, status, reason, admin_note')
    .eq('id', id)
    .single();

  if (!change) return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 });

  if (isStaffRole(actor.profile.role)) {
    return updateAsAdmin(request, service, actor.userId, change as ChangeRow);
  }

  if (change.user_id !== actor.userId) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  }
  return updateAsEmployee(request, service, actor.userId, change as ChangeRow);
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const service = createServiceClient();
  const actor = await getActor();

  if (!actor) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  if (actor.profile.role !== 'admin') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  }

  const { data: change } = await service
    .from('day_off_changes')
    .select('id, user_id, iso_year, iso_week, old_day, new_day, status, reason, admin_note')
    .eq('id', id)
    .single();

  if (!change) return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 });

  if (change.status === 'approved') {
    const err = await rollbackDayOffApproval(service, change as ChangeRow);
    if (err) return err;
  }

  const { error } = await service.from('day_off_changes').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logActivity({
    actorId: actor.userId,
    action: 'delete_day_off_change',
    targetUserId: change.user_id,
    details: { change_id: id },
  });

  return NextResponse.json({ success: true });
}

async function updateAsEmployee(
  request: NextRequest,
  service: ReturnType<typeof createServiceClient>,
  actorId: string,
  change: ChangeRow,
) {
  if (change.status !== 'pending') {
    return NextResponse.json(
      { error: 'Seules les demandes en attente peuvent être modifiées' },
      { status: 422 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = employeeDayOffUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'Données invalides' },
      { status: 422 },
    );
  }

  const updates = parsed.data;

  // If only status=cancelled was requested, just transition.
  if (updates.status === 'cancelled' && !updates.new_day && updates.reason === undefined) {
    const { data, error } = await service
      .from('day_off_changes')
      .update({ status: 'cancelled' })
      .eq('id', change.id)
      .select(CHANGE_SELECT)
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await logActivity({
      actorId,
      action: 'cancel_day_off_change',
      targetUserId: change.user_id,
      details: { change_id: change.id, from_status: change.status },
    });
    return NextResponse.json(normalizeResponse(data));
  }

  // Otherwise edit new_day / reason (stays pending)
  const new_day = updates.new_day ?? change.new_day;
  if (new_day === change.old_day) {
    return NextResponse.json(
      { error: 'Le jour choisi est déjà votre jour de repos' },
      { status: 422 },
    );
  }

  const { data, error } = await service
    .from('day_off_changes')
    .update({
      new_day,
      reason: updates.reason === undefined ? change.reason : updates.reason,
      status: updates.status === 'cancelled' ? 'cancelled' : 'pending',
    })
    .eq('id', change.id)
    .select(CHANGE_SELECT)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const action: ActivityAction = updates.status === 'cancelled'
    ? 'cancel_day_off_change'
    : 'update_day_off_change';

  await logActivity({
    actorId,
    action,
    targetUserId: change.user_id,
    details: { change_id: change.id, new_day, from_status: change.status },
  });

  return NextResponse.json(normalizeResponse(data));
}

async function updateAsAdmin(
  request: NextRequest,
  service: ReturnType<typeof createServiceClient>,
  actorId: string,
  change: ChangeRow,
) {
  const body = await request.json().catch(() => null);
  const parsed = adminDayOffUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'Données invalides' },
      { status: 422 },
    );
  }

  const updates = parsed.data;
  const nextStatus = updates.status ?? change.status;
  const nextUserId = updates.user_id ?? change.user_id;
  const nextIsoYear = updates.iso_year ?? change.iso_year;
  const nextIsoWeek = updates.iso_week ?? change.iso_week;
  const nextNewDay = updates.new_day ?? change.new_day;

  if (nextNewDay === change.old_day) {
    return NextResponse.json(
      { error: 'Le nouveau jour doit être différent du jour par défaut' },
      { status: 422 },
    );
  }

  // Roll back previous approval before re-applying / rejecting / cancelling.
  if (change.status === 'approved') {
    const err = await rollbackDayOffApproval(service, change);
    if (err) return err;
  }

  const reviewFields: Record<string, unknown> =
    nextStatus === 'approved' || nextStatus === 'rejected' || nextStatus === 'cancelled'
      ? { reviewed_by: actorId, reviewed_at: new Date().toISOString() }
      : { reviewed_by: null, reviewed_at: null };

  const { data, error } = await service
    .from('day_off_changes')
    .update({
      user_id: nextUserId,
      iso_year: nextIsoYear,
      iso_week: nextIsoWeek,
      new_day: nextNewDay,
      status: nextStatus,
      admin_note: updates.admin_note === undefined ? change.admin_note : updates.admin_note,
      reason: updates.reason === undefined ? change.reason : updates.reason,
      ...reviewFields,
    })
    .eq('id', change.id)
    .select(CHANGE_SELECT)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (nextStatus === 'approved') {
    const err = await applyDayOffApproval(
      service,
      {
        id: change.id,
        user_id: nextUserId,
        iso_year: nextIsoYear,
        iso_week: nextIsoWeek,
        old_day: change.old_day,
        new_day: nextNewDay,
      },
      actorId,
    );
    if (err) return err;
  }

  const action = resolveAction(change.status, nextStatus);
  await logActivity({
    actorId,
    action,
    targetUserId: nextUserId,
    details: {
      change_id: change.id,
      from_status: change.status,
      to_status: nextStatus,
      iso_year: nextIsoYear,
      iso_week: nextIsoWeek,
      new_day: nextNewDay,
    },
  });

  return NextResponse.json(normalizeResponse(data));
}

async function getActor(): Promise<{
  userId: string;
  profile: Pick<Profile, 'id' | 'role' | 'is_active'>;
} | null> {
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

function resolveAction(from: DayOffChangeStatus, to: DayOffChangeStatus): ActivityAction {
  if (to === 'approved') return 'approve_day_off_change';
  if (to === 'rejected') return 'reject_day_off_change';
  if (to === 'cancelled') return 'cancel_day_off_change';
  void from;
  return 'update_day_off_change';
}

function normalizeResponse<T extends { profiles?: unknown }>(row: T): T {
  if (Array.isArray(row.profiles)) {
    return { ...row, profiles: row.profiles[0] ?? null };
  }
  return row;
}
