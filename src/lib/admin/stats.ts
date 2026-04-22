import 'server-only';

import { formatInTimeZone } from 'date-fns-tz';
import { startOfMonth, endOfMonth } from 'date-fns';
import { createServiceClient } from '@/lib/supabase/service';
import { todayDateInOffice } from '@/lib/utils/date';
import { timeAsync } from '@/lib/perf/timing';
import type { AdminStats } from '@/types';

const OFFICE_TZ = 'Africa/Tunis';

export async function getAdminStats(): Promise<AdminStats> {
  return timeAsync('admin.stats.data', async () => {
    const service = createServiceClient();
    const today = todayDateInOffice();
    const now = new Date();
    const monthStart = formatInTimeZone(startOfMonth(now), OFFICE_TZ, 'yyyy-MM-dd');
    const monthEnd = formatInTimeZone(endOfMonth(now), OFFICE_TZ, 'yyyy-MM-dd');

    const [
      { count: totalActive },
      { data: todayRecords },
      { data: monthRecords },
      { count: pendingLeave },
      { data: recentActivity },
    ] = await Promise.all([
      service.from('profiles').select('id', { count: 'exact', head: true }).eq('is_active', true).eq('role', 'employee'),
      service.from('attendance').select('user_id, status').eq('date', today),
      service.from('attendance').select('status').gte('date', monthStart).lte('date', monthEnd),
      service.from('leave_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      service
        .from('activity_logs')
        .select('id, action, created_at, actor:profiles!activity_logs_actor_id_fkey(full_name)')
        .order('created_at', { ascending: false })
        .limit(5),
    ]);

    const today_present = (todayRecords ?? []).filter((r) => r.status === 'present' || r.status === 'late').length;
    const today_late = (todayRecords ?? []).filter((r) => r.status === 'late').length;
    const today_absent = (todayRecords ?? []).filter((r) => r.status === 'absent').length;
    const today_leave = (todayRecords ?? []).filter((r) => r.status === 'leave').length;

    const month_present = (monthRecords ?? []).filter((r) => r.status === 'present' || r.status === 'late').length;
    const month_late = (monthRecords ?? []).filter((r) => r.status === 'late').length;
    const month_absent = (monthRecords ?? []).filter((r) => r.status === 'absent').length;

    const activity = (recentActivity ?? []).map((log) => {
      const actor = Array.isArray(log.actor) ? (log.actor[0] ?? null) : (log.actor ?? null);

      return {
        id: log.id,
        action: log.action,
        created_at: log.created_at,
        actor,
      };
    }) as AdminStats['recent_activity'];

    return {
      total_active: totalActive ?? 0,
      today: { present: today_present, late: today_late, absent: today_absent, leave: today_leave },
      month: { present: month_present, late: month_late, absent: month_absent },
      pending_leave: pendingLeave ?? 0,
      recent_activity: activity,
    };
  });
}
