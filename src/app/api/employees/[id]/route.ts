import { NextResponse, type NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { requireAdmin } from '@/lib/auth/guards';
import { updateEmployeeSchema } from '@/lib/validation/employee';
import { logActivity } from '@/lib/activity/log';

const PROFILE_SELECT =
  'id, full_name, email, phone, position, department, role, work_start_time, work_end_time, leave_balance, is_active, avatar_url, created_at, updated_at';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  await requireAdmin();
  const { id } = await params;
  const service = createServiceClient();

  const { data, error } = await service.from('profiles').select(PROFILE_SELECT).eq('id', id).single();

  if (error || !data) {
    return NextResponse.json({ error: 'Employé introuvable' }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { userId: actorId } = await requireAdmin();
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

  const updates = parsed.data;

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

  return NextResponse.json(data);
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { userId: actorId } = await requireAdmin();
  const { id } = await params;

  if (id === actorId) {
    return NextResponse.json(
      { error: 'Vous ne pouvez pas supprimer votre propre compte' },
      { status: 422 },
    );
  }

  const service = createServiceClient();

  // Soft-delete: set is_active = false
  const { error } = await service.from('profiles').update({ is_active: false }).eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logActivity({
    actorId,
    action: 'deactivate_employee',
    targetUserId: id,
    details: { soft_delete: true },
  });

  return NextResponse.json({ success: true });
}
