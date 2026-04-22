import { NextResponse, type NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { requireAdmin } from '@/lib/auth/guards';
import { reviewLeaveSchema } from '@/lib/validation/leave';
import { logActivity } from '@/lib/activity/log';
import { eachDayOfInterval, parseISO } from 'date-fns';

const LEAVE_SELECT =
  'id, user_id, start_date, end_date, type, status, reason, admin_note, deduct_balance, created_at, updated_at, profiles!leave_requests_user_id_fkey(id, full_name, email)';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { userId: actorId } = await requireAdmin();
  const { id } = await params;
  const service = createServiceClient();

  const body = await request.json().catch(() => null);
  const parsed = reviewLeaveSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'Données invalides' },
      { status: 422 },
    );
  }

  const { status, admin_note, deduct_balance } = parsed.data;

  const { data: leave } = await service
    .from('leave_requests')
    .select('id, user_id, start_date, end_date')
    .eq('id', id)
    .single();

  if (!leave) {
    return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 });
  }

  const { data, error } = await service
    .from('leave_requests')
    .update({
      status,
      admin_note: admin_note ?? null,
      deduct_balance: deduct_balance ?? false,
      reviewed_by: actorId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select(LEAVE_SELECT)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // On approval: create attendance rows + optionally decrement balance
  if (status === 'approved') {
    const days = eachDayOfInterval({
      start: parseISO(leave.start_date),
      end: parseISO(leave.end_date),
    });

    const attendanceRows = days.map((d) => ({
      user_id: leave.user_id,
      date: d.toISOString().slice(0, 10),
      status: 'leave' as const,
      late_minutes: 0,
      forgot_checkout: false,
      created_by: actorId,
      updated_by: actorId,
    }));

    const { error: attendanceError } = await service
      .from('attendance')
      .upsert(attendanceRows, { onConflict: 'user_id,date' });

    if (attendanceError) {
      return NextResponse.json(
        { error: 'Congé mis à jour, mais erreur lors de la création des présences' },
        { status: 500 },
      );
    }

    if (deduct_balance) {
      const { error: balanceError } = await service.rpc('decrement_leave_balance', {
        p_user_id: leave.user_id,
        p_days: days.length,
      });

      if (balanceError) {
        return NextResponse.json(
          { error: 'Congé mis à jour, mais erreur lors de la déduction du solde' },
          { status: 500 },
        );
      }
    }
  }

  const action = status === 'approved' ? 'approve_leave' : status === 'rejected' ? 'reject_leave' : 'cancel_leave';
  await logActivity({
    actorId,
    action,
    targetUserId: leave.user_id,
    details: { leave_id: id, status, deduct_balance },
  });

  return NextResponse.json(data);
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { userId: actorId } = await requireAdmin();
  const { id } = await params;
  const service = createServiceClient();

  const { data: leave } = await service.from('leave_requests').select('user_id').eq('id', id).single();
  if (!leave) {
    return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 });
  }

  const { error } = await service.from('leave_requests').delete().eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logActivity({
    actorId,
    action: 'delete_leave',
    targetUserId: leave.user_id,
    details: { leave_id: id },
  });

  return NextResponse.json({ success: true });
}
