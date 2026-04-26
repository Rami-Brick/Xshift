import { NextResponse, type NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { requireAdmin, requireStaff } from '@/lib/auth/guards';
import { canManageEmployeeAccounts } from '@/lib/auth/roles';
import { updateEmployeeSchema, type UpdateEmployeeInput } from '@/lib/validation/employee';
import { logActivity } from '@/lib/activity/log';
import type { Role } from '@/types';

const PROFILE_SELECT =
  'id, full_name, email, role, work_start_time, work_end_time, leave_balance, default_day_off, is_active, avatar_url, created_at, updated_at';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { profile: actorProfile } = await requireStaff();
  const { id } = await params;
  const service = createServiceClient();

  const { data, error } = await service.from('profiles').select(PROFILE_SELECT).eq('id', id).single();

  if (error || !data) {
    return NextResponse.json({ error: 'Employé introuvable' }, { status: 404 });
  }
  if (data.role === 'admin' && !canManageEmployeeAccounts(actorProfile.role)) {
    return NextResponse.json({ error: 'Employé introuvable' }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { userId: actorId, profile: actorProfile } = await requireStaff();
  const { id } = await params;
  const service = createServiceClient();

  const body = await request.json().catch(() => null);
  const parsed = updateEmployeeSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'Données invalides' },
      { status: 422 },
    );
  }

  const updates = sanitizeEmployeeUpdates(actorProfile.role, parsed.data);

  if (!updates) {
    return NextResponse.json(
      { error: 'Les managers peuvent uniquement modifier les horaires et le solde de congés' },
      { status: 403 },
    );
  }

  // Prevent admin from deactivating themselves
  if (id === actorId && updates.is_active === false) {
    return NextResponse.json(
      { error: 'Vous ne pouvez pas désactiver votre propre compte' },
      { status: 422 },
    );
  }

  // Prevent admin from demoting themselves
  if (id === actorId && updates.role === 'employee') {
    return NextResponse.json(
      { error: 'Vous ne pouvez pas changer votre propre rôle' },
      { status: 422 },
    );
  }

  const { data: before } = await service.from('profiles').select(PROFILE_SELECT).eq('id', id).single();

  if (!before) {
    return NextResponse.json({ error: 'Employé introuvable' }, { status: 404 });
  }
  if (before.role === 'admin' && !canManageEmployeeAccounts(actorProfile.role)) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  }

  const { data, error } = await service
    .from('profiles')
    .update(updates)
    .eq('id', id)
    .select(PROFILE_SELECT)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const action = updates.is_active === false ? 'deactivate_employee' : 'update_employee';
  await logActivity({
    actorId,
    action,
    targetUserId: id,
    details: { before, after: updates },
  });

  if (
    updates.default_day_off !== undefined &&
    updates.default_day_off !== before.default_day_off
  ) {
    await logActivity({
      actorId,
      action: 'update_default_day_off',
      targetUserId: id,
      details: { from: before.default_day_off, to: updates.default_day_off },
    });
  }

  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { userId: actorId } = await requireAdmin();
  const { id } = await params;

  if (id === actorId) {
    return NextResponse.json(
      { error: 'Vous ne pouvez pas supprimer votre propre compte' },
      { status: 422 },
    );
  }

  const service = createServiceClient();

  const { data: target, error: targetError } = await service
    .from('profiles')
    .select(PROFILE_SELECT)
    .eq('id', id)
    .single();

  if (targetError || !target) {
    return NextResponse.json({ error: 'Employé introuvable' }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  if (!body || body.confirmation !== target.full_name) {
    return NextResponse.json(
      { error: "Confirmation invalide. Tapez le nom complet de l'employé pour confirmer." },
      { status: 422 },
    );
  }

  const referenceCleanupError = await clearEmployeeReferences(service, id);
  if (referenceCleanupError) {
    return NextResponse.json({ error: referenceCleanupError.message }, { status: 500 });
  }

  const { error } = await service.auth.admin.deleteUser(id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logActivity({
    actorId,
    action: 'delete_employee',
    details: {
      deleted_user_id: id,
      full_name: target.full_name,
      email: target.email,
      role: target.role,
    },
  });

  return NextResponse.json({ success: true });
}

async function clearEmployeeReferences(
  service: ReturnType<typeof createServiceClient>,
  employeeId: string,
) {
  const cleanups = await Promise.all([
    service.from('attendance').update({ created_by: null }).eq('created_by', employeeId),
    service.from('attendance').update({ updated_by: null }).eq('updated_by', employeeId),
    service.from('leave_requests').update({ requested_by: null }).eq('requested_by', employeeId),
    service.from('leave_requests').update({ reviewed_by: null }).eq('reviewed_by', employeeId),
    service.from('day_off_changes').update({ requested_by: null }).eq('requested_by', employeeId),
    service.from('day_off_changes').update({ reviewed_by: null }).eq('reviewed_by', employeeId),
    service.from('office_settings').update({ updated_by: null }).eq('updated_by', employeeId),
    service.from('activity_logs').update({ actor_id: null }).eq('actor_id', employeeId),
    service.from('activity_logs').update({ target_user_id: null }).eq('target_user_id', employeeId),
  ]);

  return cleanups.find((result) => result.error)?.error ?? null;
}

function sanitizeEmployeeUpdates(actorRole: Role, updates: UpdateEmployeeInput): UpdateEmployeeInput | null {
  if (actorRole === 'admin') return updates;

  const forbiddenKeys = Object.keys(updates).filter(
    (key) => !['work_start_time', 'work_end_time', 'leave_balance'].includes(key),
  );

  if (forbiddenKeys.length > 0) {
    return null;
  }

  return {
    ...(updates.work_start_time !== undefined ? { work_start_time: updates.work_start_time } : {}),
    ...(updates.work_end_time !== undefined ? { work_end_time: updates.work_end_time } : {}),
    ...(updates.leave_balance !== undefined ? { leave_balance: updates.leave_balance } : {}),
  };
}
