import { NextResponse, type NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { requireAdmin, requireStaff } from '@/lib/auth/guards';
import { updateAttendanceSchema } from '@/lib/validation/attendance';
import { logActivity } from '@/lib/activity/log';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { userId: actorId } = await requireStaff();
  const { id } = await params;
  const service = createServiceClient();

  const body = await request.json().catch(() => null);
  const parsed = updateAttendanceSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'Données invalides' },
      { status: 422 },
    );
  }

  const { data: before } = await service
    .from('attendance')
    .select('id, user_id, date, check_in_at, check_out_at, status, late_minutes, note')
    .eq('id', id)
    .single();
  if (!before) {
    return NextResponse.json({ error: 'Entrée introuvable' }, { status: 404 });
  }

  const { data, error } = await service
    .from('attendance')
    .update({ ...parsed.data, updated_by: actorId })
    .eq('id', id)
    .select(
      'id, user_id, date, check_in_at, check_out_at, status, late_minutes, forgot_checkout, note, profiles!attendance_user_id_fkey(id, full_name, email, work_start_time)',
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logActivity({
    actorId,
    action: 'update_attendance',
    targetUserId: before.user_id,
    details: { before, after: parsed.data },
  });

  return NextResponse.json(data);
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { userId: actorId } = await requireAdmin();
  const { id } = await params;
  const service = createServiceClient();

  const { data: row } = await service.from('attendance').select('user_id, date, status').eq('id', id).single();
  if (!row) {
    return NextResponse.json({ error: 'Entrée introuvable' }, { status: 404 });
  }

  const { error } = await service.from('attendance').delete().eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logActivity({
    actorId,
    action: 'delete_attendance',
    targetUserId: row.user_id,
    details: { date: row.date, status: row.status },
  });

  return NextResponse.json({ success: true });
}
