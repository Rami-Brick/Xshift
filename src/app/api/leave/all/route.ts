import { NextResponse, type NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { requireAdmin } from '@/lib/auth/guards';
import { adminLeaveSchema } from '@/lib/validation/leave';
import { logActivity } from '@/lib/activity/log';
import { eachDayOfInterval, parseISO } from 'date-fns';

export async function GET(request: NextRequest) {
  await requireAdmin();
  const service = createServiceClient();
  const { searchParams } = new URL(request.url);

  const userId = searchParams.get('user_id');
  const status = searchParams.get('status');

  let query = service
    .from('leave_requests')
    .select('*, profiles!leave_requests_user_id_fkey(id, full_name, email)')
    .order('created_at', { ascending: false })
    .limit(200);

  if (userId) query = query.eq('user_id', userId);
  if (status) query = query.eq('status', status as never);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const { userId: actorId } = await requireAdmin();
  const service = createServiceClient();

  const body = await request.json().catch(() => null);
  const parsed = adminLeaveSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'Données invalides' },
      { status: 422 },
    );
  }

  const { user_id, start_date, end_date, type, reason, admin_note, deduct_balance, status } = parsed.data;

  if (end_date < start_date) {
    return NextResponse.json(
      { error: 'La date de fin doit être après la date de début' },
      { status: 422 },
    );
  }

  const finalStatus = status ?? 'approved';

  const { data, error } = await service
    .from('leave_requests')
    .insert({
      user_id,
      start_date,
      end_date,
      type,
      reason: reason ?? null,
      admin_note: admin_note ?? null,
      status: finalStatus,
      deduct_balance: deduct_balance ?? false,
      requested_by: actorId,
      reviewed_by: actorId,
      reviewed_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (finalStatus === 'approved') {
    const days = eachDayOfInterval({
      start: parseISO(start_date),
      end: parseISO(end_date),
    });

    const { error: attendanceError } = await service
      .from('attendance')
      .upsert(
        days.map((d) => ({
          user_id,
          date: d.toISOString().slice(0, 10),
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
        { error: 'Congé créé, mais erreur lors de la création des présences' },
        { status: 500 },
      );
    }

    if (deduct_balance) {
      const { error: balanceError } = await service.rpc('decrement_leave_balance', {
        p_user_id: user_id,
        p_days: days.length,
      });

      if (balanceError) {
        return NextResponse.json(
          { error: 'Congé créé, mais erreur lors de la déduction du solde' },
          { status: 500 },
        );
      }
    }
  }

  await logActivity({
    actorId,
    action: 'assign_leave',
    targetUserId: user_id,
    details: { start_date, end_date, type, status: finalStatus },
  });

  return NextResponse.json(data, { status: 201 });
}
