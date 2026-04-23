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

    const attendanceCount = (scope: 'today' | 'month', statuses: string[]) => {
      let query = service
        .from('attendance')
        .select('id', { count: 'exact', head: true });

      if (scope === 'today') {
        query = query.eq('date', today);
      } else {
        query = query.gte('date', monthStart).lte('date', monthEnd);
      }

      return statuses.length === 1 ? query.eq('status', statuses[0]) : query.in('status', statuses);
    };

    const [
      { count: totalActive },
      { count: todayPresent },
      { count: todayLate },
      { count: todayAbsent },
      { count: todayLeave },
      { count: monthPresent },
      { count: monthLate },
      { count: monthAbsent },
      { count: pendingLeave },
      { count: pendingDayOffChanges },
      { data: recentActivity },
    ] = await Promise.all([
      service.from('profiles').select('id', { count: 'exact', head: true }).eq('is_active', true).eq('role', 'employee'),
      attendanceCount('today', ['present', 'late']),
      attendanceCount('today', ['late']),
      attendanceCount('today', ['absent']),
      attendanceCount('today', ['leave']),
      attendanceCount('month', ['present', 'late']),
      attendanceCount('month', ['late']),
      attendanceCount('month', ['absent']),
      service.from('leave_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      service.from('day_off_changes').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      service
        .from('activity_logs')
        .select('id, action, created_at, actor:profiles!activity_logs_actor_id_fkey(full_name)')
        .order('created_at', { ascending: false })
        .limit(5),
    ]);

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
      today: {
        present: todayPresent ?? 0,
        late: todayLate ?? 0,
        absent: todayAbsent ?? 0,
        leave: todayLeave ?? 0,
      },
      month: {
        present: monthPresent ?? 0,
        late: monthLate ?? 0,
        absent: monthAbsent ?? 0,
      },
      pending_leave: pendingLeave ?? 0,
      pending_day_off_changes: pendingDayOffChanges ?? 0,
      recent_activity: activity,
    };
  });
}
