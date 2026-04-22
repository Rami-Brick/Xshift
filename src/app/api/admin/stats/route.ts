import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { requireAdmin } from '@/lib/auth/guards';
import { todayDateInOffice } from '@/lib/utils/date';
import { formatInTimeZone } from 'date-fns-tz';
import { startOfMonth, endOfMonth } from 'date-fns';

const OFFICE_TZ = 'Africa/Tunis';

export async function GET() {
  await requireAdmin();
  const service = createServiceClient();

  const today = todayDateInOffice();
  const now = new Date();
  const monthStart = formatInTimeZone(startOfMonth(now), OFFICE_TZ, 'yyyy-MM-dd');
  const monthEnd = formatInTimeZone(endOfMonth(now), OFFICE_TZ, 'yyyy-MM-dd');

  const [
    { count: totalActive },
    { data: todayRecords },
    { data: monthRecords },
    { data: pendingLeave },
    { data: recentActivity },
  ] = await Promise.all([
    service.from('profiles').select('id', { count: 'exact', head: true }).eq('is_active', true).eq('role', 'employee'),
    service.from('attendance').select('user_id, status, profiles!attendance_user_id_fkey(full_name)').eq('date', today),
    service.from('attendance').select('status').gte('date', monthStart).lte('date', monthEnd),
    service.from('leave_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    service.from('activity_logs').select('id, action, created_at, actor:profiles!activity_logs_actor_id_fkey(full_name)').order('created_at', { ascending: false }).limit(5),
  ]);

  const today_present = (todayRecords ?? []).filter((r) => r.status === 'present' || r.status === 'late').length;
  const today_late = (todayRecords ?? []).filter((r) => r.status === 'late').length;
  const today_absent = (todayRecords ?? []).filter((r) => r.status === 'absent').length;
  const today_leave = (todayRecords ?? []).filter((r) => r.status === 'leave').length;

  const month_present = (monthRecords ?? []).filter((r) => r.status === 'present' || r.status === 'late').length;
  const month_late = (monthRecords ?? []).filter((r) => r.status === 'late').length;
  const month_absent = (monthRecords ?? []).filter((r) => r.status === 'absent').length;

  return NextResponse.json({
    total_active: totalActive ?? 0,
    today: { present: today_present, late: today_late, absent: today_absent, leave: today_leave },
    month: { present: month_present, late: month_late, absent: month_absent },
    pending_leave: pendingLeave ?? 0,
    recent_activity: recentActivity ?? [],
  });
}
