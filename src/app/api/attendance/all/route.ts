import { NextResponse, type NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { requireAdmin } from '@/lib/auth/guards';
import { manualAttendanceSchema } from '@/lib/validation/attendance';
import { logActivity } from '@/lib/activity/log';

export async function GET(request: NextRequest) {
  await requireAdmin();
  const service = createServiceClient();
  const { searchParams } = new URL(request.url);

  const userId = searchParams.get('user_id');
  const status = searchParams.get('status');
  const start = searchParams.get('start');
  const end = searchParams.get('end');

  let query = service
    .from('attendance')
    .select('*, profiles!attendance_user_id_fkey(id, full_name, email, work_start_time)')
    .order('date', { ascending: false })
    .limit(200);

  if (userId) query = query.eq('user_id', userId);
  if (status) query = query.eq('status', status);
  if (start) query = query.gte('date', start);
  if (end) query = query.lte('date', end);

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
  const parsed = manualAttendanceSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'Données invalides' },
      { status: 422 },
    );
  }

  const { user_id, date, status, check_in_at, check_out_at, late_minutes, note } = parsed.data;

  const { data, error } = await service
    .from('attendance')
    .upsert(
      {
        user_id,
        date,
        status,
        check_in_at: check_in_at ?? null,
        check_out_at: check_out_at ?? null,
        late_minutes: late_minutes ?? 0,
        note: note ?? null,
        created_by: actorId,
        updated_by: actorId,
      },
      { onConflict: 'user_id,date' },
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logActivity({
    actorId,
    action: 'manual_attendance',
    targetUserId: user_id,
    details: { date, status },
  });

  return NextResponse.json(data, { status: 201 });
}
