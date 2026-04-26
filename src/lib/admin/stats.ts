import 'server-only';

import { fromZonedTime } from 'date-fns-tz';
import { parseISO } from 'date-fns';
import { createServiceClient } from '@/lib/supabase/service';
import { todayDateInOffice } from '@/lib/utils/date';
import { dayOfWeekEnum, effectiveDayOff, isoWeekForDate } from '@/lib/day-off/weeks';
import { timeAsync } from '@/lib/perf/timing';
import type {
  AdminStats,
  AttendanceStatus,
  DayOfWeek,
  DayOffChangeStatus,
  LeaveType,
  PendingDayOffItem,
  PendingLeaveItem,
  RosterEntry,
  RosterStatus,
} from '@/types';

const OFFICE_TZ = 'Africa/Tunis';

interface ProfileRow {
  id: string;
  full_name: string;
  work_end_time: string;
  default_day_off: DayOfWeek;
}

interface AttendanceRow {
  user_id: string;
  status: AttendanceStatus;
  check_in_at: string | null;
  late_minutes: number;
}

interface DayOffChangeRow {
  user_id: string;
  iso_year: number;
  iso_week: number;
  new_day: DayOfWeek;
  status: DayOffChangeStatus;
}

interface OfficeSettingsRow {
  grace_period_minutes: number;
}

export async function getAdminStats(targetDate?: string): Promise<AdminStats> {
  return timeAsync('admin.stats.data', async () => {
    const service = createServiceClient();
    const today = todayDateInOffice();
    const date = targetDate ?? today;
    const isToday = date === today;

    const dateAtNoon = parseISO(`${date}T12:00:00`);
    const { iso_year, iso_week } = isoWeekForDate(dateAtNoon);
    const weekday = dayOfWeekEnum(dateAtNoon);

    const [
      { data: profiles },
      { data: attendance },
      { data: leaveRowsToday },
      { data: dayOffRowsThisWeek },
      { data: settings },
      { data: pendingLeave },
      { data: pendingDayOff },
      { data: recentActivity },
    ] = await Promise.all([
      service
        .from('profiles')
        .select('id, full_name, work_end_time, default_day_off')
        .eq('is_active', true)
        .eq('role', 'employee')
        .order('full_name'),
      service
        .from('attendance')
        .select('user_id, status, check_in_at, late_minutes')
        .eq('date', date),
      service
        .from('leave_requests')
        .select('user_id')
        .eq('status', 'approved')
        .lte('start_date', date)
        .gte('end_date', date),
      service
        .from('day_off_changes')
        .select('user_id, iso_year, iso_week, new_day, status')
        .eq('iso_year', iso_year)
        .eq('iso_week', iso_week)
        .eq('status', 'approved'),
      service.from('office_settings').select('grace_period_minutes').single(),
      service
        .from('leave_requests')
        .select('id, user_id, start_date, end_date, type, profiles!leave_requests_user_id_fkey(full_name)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),
      service
        .from('day_off_changes')
        .select('id, user_id, iso_year, iso_week, old_day, new_day, profiles!day_off_changes_user_id_fkey(full_name)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),
      service
        .from('activity_logs')
        .select('id, action, created_at, actor:profiles!activity_logs_actor_id_fkey(full_name)')
        .order('created_at', { ascending: false })
        .limit(5),
    ]);

    const gracePeriodMinutes = (settings as OfficeSettingsRow | null)?.grace_period_minutes ?? 0;
    const profileList = (profiles ?? []) as ProfileRow[];
    const attendanceByUser = new Map<string, AttendanceRow>();
    for (const row of (attendance ?? []) as AttendanceRow[]) {
      attendanceByUser.set(row.user_id, row);
    }
    const onLeaveUserIds = new Set<string>(
      ((leaveRowsToday ?? []) as Array<{ user_id: string }>).map((r) => r.user_id),
    );
    const dayOffOverridesByUser = new Map<string, DayOffChangeRow[]>();
    for (const row of (dayOffRowsThisWeek ?? []) as DayOffChangeRow[]) {
      const list = dayOffOverridesByUser.get(row.user_id) ?? [];
      list.push(row);
      dayOffOverridesByUser.set(row.user_id, list);
    }

    const nowMs = Date.now();
    const roster: RosterEntry[] = profileList.map((profile) => {
      const att = attendanceByUser.get(profile.id);
      const status = resolveRosterStatus({
        profile,
        attendance: att,
        date,
        isToday,
        nowMs,
        gracePeriodMinutes,
        weekday,
        iso_year,
        iso_week,
        dayOffOverrides: dayOffOverridesByUser.get(profile.id) ?? [],
        leaveCoversToday: onLeaveUserIds.has(profile.id),
      });

      return {
        user_id: profile.id,
        full_name: profile.full_name,
        status,
        check_in_at: att?.check_in_at ?? null,
        late_minutes: att?.late_minutes ?? 0,
      };
    });

    roster.sort(byRosterOrder);

    const pendingLeaveItems: PendingLeaveItem[] = ((pendingLeave ?? []) as Array<{
      id: string;
      user_id: string;
      start_date: string;
      end_date: string;
      type: LeaveType;
      profiles: { full_name: string } | { full_name: string }[] | null;
    }>).map((row) => {
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
      return {
        id: row.id,
        user_id: row.user_id,
        full_name: profile?.full_name ?? '—',
        start_date: row.start_date,
        end_date: row.end_date,
        type: row.type,
      };
    });

    const pendingDayOffItems: PendingDayOffItem[] = ((pendingDayOff ?? []) as Array<{
      id: string;
      user_id: string;
      iso_year: number;
      iso_week: number;
      old_day: DayOfWeek;
      new_day: DayOfWeek;
      profiles: { full_name: string } | { full_name: string }[] | null;
    }>).map((row) => {
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
      return {
        id: row.id,
        user_id: row.user_id,
        full_name: profile?.full_name ?? '—',
        iso_year: row.iso_year,
        iso_week: row.iso_week,
        old_day: row.old_day,
        new_day: row.new_day,
      };
    });

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
      date,
      is_today: isToday,
      total_active: profileList.length,
      roster,
      pending_leave: pendingLeaveItems,
      pending_day_off_changes: pendingDayOffItems,
      recent_activity: activity,
    };
  });
}

interface ResolveArgs {
  profile: ProfileRow;
  attendance: AttendanceRow | undefined;
  date: string;
  isToday: boolean;
  nowMs: number;
  gracePeriodMinutes: number;
  weekday: DayOfWeek;
  iso_year: number;
  iso_week: number;
  dayOffOverrides: DayOffChangeRow[];
  leaveCoversToday: boolean;
}

function resolveRosterStatus({
  profile,
  attendance,
  date,
  isToday,
  nowMs,
  gracePeriodMinutes,
  weekday,
  iso_year,
  iso_week,
  dayOffOverrides,
  leaveCoversToday,
}: ResolveArgs): RosterStatus {
  if (attendance?.status === 'leave') return 'on_leave';
  if (attendance?.status === 'day_off') return 'day_off';
  if (leaveCoversToday) return 'on_leave';

  const effectiveOff = effectiveDayOff(profile.default_day_off, dayOffOverrides, iso_year, iso_week);
  if (effectiveOff === weekday && !attendance?.check_in_at) return 'day_off';

  if (attendance?.check_in_at) {
    return attendance.late_minutes > gracePeriodMinutes ? 'late' : 'present';
  }

  if (!isToday) return 'absent';

  const workEnd = fromZonedTime(`${date} ${profile.work_end_time.slice(0, 5)}`, OFFICE_TZ);
  return nowMs > workEnd.getTime() ? 'absent' : 'not_yet';
}

const STATUS_ORDER: Record<RosterStatus, number> = {
  present: 0,
  late: 1,
  not_yet: 2,
  on_leave: 3,
  day_off: 4,
  absent: 5,
};

function byRosterOrder(a: RosterEntry, b: RosterEntry): number {
  const diff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
  if (diff !== 0) return diff;
  return a.full_name.localeCompare(b.full_name);
}

