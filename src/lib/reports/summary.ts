import 'server-only';

import { addDays, differenceInCalendarDays, max, min, parseISO } from 'date-fns';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import { createServiceClient } from '@/lib/supabase/service';
import { syncClosedAttendanceDays } from '@/lib/attendance/forgot-checkout';
import { dayOfWeekEnum, effectiveDayOff, isoWeekForDate } from '@/lib/day-off/weeks';
import { OFFICE_TZ } from '@/lib/utils/date';
import { timeAsync } from '@/lib/perf/timing';
import type {
  AttendanceStatus,
  DayOfWeek,
  DayOffChangeStatus,
  ReportsAttentionItem,
  ReportsDaySummary,
  ReportsEmployeeSummary,
  ReportsSummary,
  ReportsTotals,
} from '@/types';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_RANGE_DAYS = 366;

const REPORT_STATUSES: AttendanceStatus[] = [
  'present',
  'late',
  'absent',
  'leave',
  'holiday',
  'day_off',
];

const SEVERITY_ORDER: Record<ReportsAttentionItem['severity'], number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export interface GetReportsSummaryFilters {
  start: string | null | undefined;
  end: string | null | undefined;
  user_id?: string | null;
  status?: string | null;
}

interface ProfileRow {
  id: string;
  full_name: string;
  work_end_time: string;
  default_day_off: DayOfWeek;
}

interface AttendanceRow {
  user_id: string;
  date: string;
  status: AttendanceStatus;
  check_in_at: string | null;
  check_out_at: string | null;
  late_minutes: number;
  forgot_checkout: boolean;
}

interface LeaveRow {
  user_id: string;
  start_date: string;
  end_date: string;
}

interface DayOffChangeRow {
  user_id: string;
  iso_year: number;
  iso_week: number;
  new_day: DayOfWeek;
  status: DayOffChangeStatus;
}

interface OfficeSettingsRow {
  timezone: string | null;
  grace_period_minutes: number | null;
}

type CountableStatus = Exclude<AttendanceStatus, 'holiday'> | 'holiday';

interface MutableEmployeeSummary {
  user_id: string;
  full_name: string;
  expected_days: number;
  present: number;
  late: number;
  absent: number;
  leave: number;
  holiday: number;
  day_off: number;
  forgot_checkout: number;
  total_late_minutes: number;
}

interface MutableDaySummary {
  date: string;
  present: number;
  late: number;
  absent: number;
  leave: number;
  holiday: number;
  day_off: number;
  forgot_checkout: number;
  total_late_minutes: number;
  late_count: number;
}

export class ReportsSummaryError extends Error {
  constructor(
    message: string,
    public readonly status = 422,
  ) {
    super(message);
    this.name = 'ReportsSummaryError';
  }
}

export async function getReportsSummary(filters: GetReportsSummaryFilters): Promise<ReportsSummary> {
  const start = validateDate(filters.start, 'start');
  const end = validateDate(filters.end, 'end');
  const startDate = dateAtNoon(start);
  const endDate = dateAtNoon(end);
  const rangeDays = differenceInCalendarDays(endDate, startDate) + 1;

  if (rangeDays <= 0) {
    throw new ReportsSummaryError('La date de fin doit etre apres la date de debut.');
  }

  if (rangeDays > MAX_RANGE_DAYS) {
    throw new ReportsSummaryError(`La periode ne peut pas depasser ${MAX_RANGE_DAYS} jours.`);
  }

  const status = normalizeStatusFilter(filters.status);

  return timeAsync('reports.summary.data', async () => {
    const service = createServiceClient();
    await syncClosedAttendanceDays(service, {
      startDate: start,
      endDate: end,
      userId: filters.user_id ?? undefined,
    });
    const dateRange = dateRangeStrings(start, end, OFFICE_TZ);
    const today = formatInTimeZone(new Date(), OFFICE_TZ, 'yyyy-MM-dd');
    const weeks = isoWeeksForDates(dateRange);
    const years = Array.from(new Set(weeks.map((w) => w.iso_year)));

    let profilesQuery = service
      .from('profiles')
      .select('id, full_name, work_end_time, default_day_off')
      .eq('is_active', true)
      .eq('role', 'employee')
      .order('full_name');

    if (filters.user_id) profilesQuery = profilesQuery.eq('id', filters.user_id);

    let attendanceQuery = service
      .from('attendance')
      .select('user_id, date, status, check_in_at, check_out_at, late_minutes, forgot_checkout')
      .gte('date', start)
      .lte('date', end);

    if (filters.user_id) attendanceQuery = attendanceQuery.eq('user_id', filters.user_id);

    let leaveQuery = service
      .from('leave_requests')
      .select('user_id, start_date, end_date')
      .eq('status', 'approved')
      .lte('start_date', end)
      .gte('end_date', start);

    if (filters.user_id) leaveQuery = leaveQuery.eq('user_id', filters.user_id);

    let dayOffQuery = service
      .from('day_off_changes')
      .select('user_id, iso_year, iso_week, new_day, status')
      .eq('status', 'approved');

    if (filters.user_id) dayOffQuery = dayOffQuery.eq('user_id', filters.user_id);
    if (years.length > 0) dayOffQuery = dayOffQuery.in('iso_year', years);

    const [
      { data: profiles, error: profilesError },
      { data: attendance, error: attendanceError },
      { data: leaveRows, error: leaveError },
      { data: dayOffRows, error: dayOffError },
      { data: settings, error: settingsError },
    ] = await Promise.all([
      profilesQuery,
      attendanceQuery,
      leaveQuery,
      dayOffQuery,
      service.from('office_settings').select('timezone, grace_period_minutes').single(),
    ]);

    const firstError =
      profilesError ?? attendanceError ?? leaveError ?? dayOffError ?? settingsError;
    if (firstError) {
      throw new ReportsSummaryError(firstError.message, 500);
    }

    const profileList = (profiles ?? []) as ProfileRow[];
    const timezone = ((settings as OfficeSettingsRow | null)?.timezone || OFFICE_TZ) as string;
    const gracePeriodMinutes = (settings as OfficeSettingsRow | null)?.grace_period_minutes ?? 0;

    const attendanceByUserDate = buildAttendanceIndex((attendance ?? []) as AttendanceRow[]);
    const leaveDates = buildLeaveDateSet((leaveRows ?? []) as LeaveRow[], start, end, timezone);
    const dayOffOverridesByUser = buildDayOffOverrides(
      (dayOffRows ?? []) as DayOffChangeRow[],
      weeks,
    );
    const daysByIsoDate = buildDaySummaries(dateRange);
    const employeeSummaries = buildEmployeeSummaries(profileList);

    for (const profile of profileList) {
      const employeeSummary = employeeSummaries.get(profile.id);
      if (!employeeSummary) continue;

      const overrides = dayOffOverridesByUser.get(profile.id) ?? [];

      for (const date of dateRange) {
        const attendanceRow = attendanceByUserDate.get(keyFor(profile.id, date));
        const resolved = resolveReportStatus({
          profile,
          date,
          today,
          attendance: attendanceRow,
          leaveDates,
          dayOffOverrides: overrides,
          gracePeriodMinutes,
          timezone,
        });

        if (!resolved) continue;

        if (isExpectedStatus(resolved.status)) {
          employeeSummary.expected_days += 1;
        }

        if (status && resolved.status !== status) continue;

        addStatusCount(employeeSummary, resolved.status, resolved.lateMinutes);
        if (resolved.forgotCheckout) employeeSummary.forgot_checkout += 1;

        const daySummary = daysByIsoDate.get(date);
        if (daySummary) {
          addStatusCount(daySummary, resolved.status, resolved.lateMinutes);
          if (resolved.forgotCheckout) daySummary.forgot_checkout += 1;
        }
      }
    }

    const employeeRows = finalizeEmployees(Array.from(employeeSummaries.values()));
    const dayRows = finalizeDays(Array.from(daysByIsoDate.values()));
    const totals = buildTotals(employeeRows);

    return {
      filters: {
        start,
        end,
        user_id: filters.user_id || null,
        status,
        timezone,
      },
      totals,
      by_day: dayRows,
      by_employee: employeeRows,
      needs_attention: buildNeedsAttention(employeeRows),
    };
  });
}

function validateDate(value: string | null | undefined, label: string): string {
  if (!value || !DATE_RE.test(value)) {
    throw new ReportsSummaryError(`La date "${label}" est invalide.`);
  }
  return value;
}

function normalizeStatusFilter(value: string | null | undefined): AttendanceStatus | null {
  if (!value) return null;
  if (REPORT_STATUSES.includes(value as AttendanceStatus)) {
    return value as AttendanceStatus;
  }
  throw new ReportsSummaryError('Le statut est invalide.');
}

function dateAtNoon(date: string): Date {
  return parseISO(`${date}T12:00:00`);
}

function dateRangeStrings(start: string, end: string, timezone: string): string[] {
  const out: string[] = [];
  const endDate = dateAtNoon(end);
  for (let cursor = dateAtNoon(start); cursor <= endDate; cursor = addDays(cursor, 1)) {
    out.push(formatInTimeZone(cursor, timezone, 'yyyy-MM-dd'));
  }
  return out;
}

function isoWeeksForDates(dates: string[]): Array<{ iso_year: number; iso_week: number }> {
  const seen = new Set<string>();
  const weeks: Array<{ iso_year: number; iso_week: number }> = [];
  for (const date of dates) {
    const week = isoWeekForDate(dateAtNoon(date));
    const key = `${week.iso_year}-${week.iso_week}`;
    if (seen.has(key)) continue;
    seen.add(key);
    weeks.push(week);
  }
  return weeks;
}

function buildAttendanceIndex(rows: AttendanceRow[]): Map<string, AttendanceRow> {
  const index = new Map<string, AttendanceRow>();
  for (const row of rows) {
    index.set(keyFor(row.user_id, row.date), row);
  }
  return index;
}

function buildLeaveDateSet(
  rows: LeaveRow[],
  start: string,
  end: string,
  timezone: string,
): Set<string> {
  const dates = new Set<string>();
  const startDate = dateAtNoon(start);
  const endDate = dateAtNoon(end);

  for (const row of rows) {
    const leaveStart = max([dateAtNoon(row.start_date), startDate]);
    const leaveEnd = min([dateAtNoon(row.end_date), endDate]);
    for (let cursor = leaveStart; cursor <= leaveEnd; cursor = addDays(cursor, 1)) {
      dates.add(keyFor(row.user_id, formatInTimeZone(cursor, timezone, 'yyyy-MM-dd')));
    }
  }

  return dates;
}

function buildDayOffOverrides(
  rows: DayOffChangeRow[],
  allowedWeeks: Array<{ iso_year: number; iso_week: number }>,
): Map<string, DayOffChangeRow[]> {
  const allowed = new Set(allowedWeeks.map((w) => `${w.iso_year}-${w.iso_week}`));
  const map = new Map<string, DayOffChangeRow[]>();

  for (const row of rows) {
    if (!allowed.has(`${row.iso_year}-${row.iso_week}`)) continue;
    const list = map.get(row.user_id) ?? [];
    list.push(row);
    map.set(row.user_id, list);
  }

  return map;
}

function buildDaySummaries(dates: string[]): Map<string, MutableDaySummary> {
  const map = new Map<string, MutableDaySummary>();
  for (const date of dates) {
    map.set(date, {
      date,
      present: 0,
      late: 0,
      absent: 0,
      leave: 0,
      holiday: 0,
      day_off: 0,
      forgot_checkout: 0,
      total_late_minutes: 0,
      late_count: 0,
    });
  }
  return map;
}

function buildEmployeeSummaries(profiles: ProfileRow[]): Map<string, MutableEmployeeSummary> {
  const map = new Map<string, MutableEmployeeSummary>();
  for (const profile of profiles) {
    map.set(profile.id, {
      user_id: profile.id,
      full_name: profile.full_name,
      expected_days: 0,
      present: 0,
      late: 0,
      absent: 0,
      leave: 0,
      holiday: 0,
      day_off: 0,
      forgot_checkout: 0,
      total_late_minutes: 0,
    });
  }
  return map;
}

function resolveReportStatus({
  profile,
  date,
  today,
  attendance,
  leaveDates,
  dayOffOverrides,
  gracePeriodMinutes,
  timezone,
}: {
  profile: ProfileRow;
  date: string;
  today: string;
  attendance: AttendanceRow | undefined;
  leaveDates: Set<string>;
  dayOffOverrides: DayOffChangeRow[];
  gracePeriodMinutes: number;
  timezone: string;
}): { status: AttendanceStatus; lateMinutes: number; forgotCheckout: boolean } | null {
  if (attendance) {
    const lateMinutes = attendance.late_minutes ?? 0;
    const status =
      attendance.status === 'present' && lateMinutes > gracePeriodMinutes
        ? 'late'
        : attendance.status;
    return {
      status,
      lateMinutes,
      forgotCheckout: attendance.forgot_checkout,
    };
  }

  if (!shouldResolveUnrecordedDate(date, today, profile.work_end_time, timezone)) {
    return null;
  }

  if (leaveDates.has(keyFor(profile.id, date))) {
    return { status: 'leave', lateMinutes: 0, forgotCheckout: false };
  }

  const dateAtMidday = dateAtNoon(date);
  const { iso_year, iso_week } = isoWeekForDate(dateAtMidday);
  const weekday = dayOfWeekEnum(dateAtMidday);
  const offDay = effectiveDayOff(profile.default_day_off, dayOffOverrides, iso_year, iso_week);

  if (offDay === weekday) {
    return { status: 'day_off', lateMinutes: 0, forgotCheckout: false };
  }

  return { status: 'absent', lateMinutes: 0, forgotCheckout: false };
}

function shouldResolveUnrecordedDate(
  date: string,
  today: string,
  workEndTime: string,
  timezone: string,
): boolean {
  if (date < today) return true;
  if (date > today) return false;

  const workEnd = fromZonedTime(`${date} ${workEndTime.slice(0, 5)}`, timezone);
  return Date.now() > workEnd.getTime();
}

function isExpectedStatus(status: AttendanceStatus): boolean {
  return status === 'present' || status === 'late' || status === 'absent';
}

function addStatusCount(
  summary: MutableEmployeeSummary | MutableDaySummary,
  status: CountableStatus,
  lateMinutes: number,
) {
  summary[status] += 1;
  if (status === 'late') {
    summary.total_late_minutes += Math.max(0, lateMinutes);
    if ('late_count' in summary) summary.late_count += 1;
  }
}

function finalizeEmployees(rows: MutableEmployeeSummary[]): ReportsEmployeeSummary[] {
  return rows
    .map((row) => {
      const avgLate = row.late > 0 ? Math.round(row.total_late_minutes / row.late) : 0;
      const attendanceRate = rate(row.present + row.late, row.expected_days);
      const punctualityRate = rate(row.present, row.expected_days);
      const lateRate = rate(row.late, row.expected_days);
      return {
        user_id: row.user_id,
        full_name: row.full_name,
        expected_days: row.expected_days,
        present: row.present,
        late: row.late,
        absent: row.absent,
        leave: row.leave,
        holiday: row.holiday,
        day_off: row.day_off,
        forgot_checkout: row.forgot_checkout,
        total_late_minutes: row.total_late_minutes,
        avg_late_minutes: avgLate,
        attendance_rate: attendanceRate,
        punctuality_rate: punctualityRate,
        late_rate: lateRate,
        attention_score: row.absent * 3 + row.late * 2 + row.forgot_checkout,
      };
    })
    .sort((a, b) => {
      const diff = b.attention_score - a.attention_score;
      if (diff !== 0) return diff;
      return a.full_name.localeCompare(b.full_name);
    });
}

function finalizeDays(rows: MutableDaySummary[]): ReportsDaySummary[] {
  return rows.map((row) => ({
    date: row.date,
    present: row.present,
    late: row.late,
    absent: row.absent,
    leave: row.leave,
    holiday: row.holiday,
    day_off: row.day_off,
    forgot_checkout: row.forgot_checkout,
    avg_late_minutes: row.late_count > 0 ? Math.round(row.total_late_minutes / row.late_count) : 0,
  }));
}

function buildTotals(rows: ReportsEmployeeSummary[]): ReportsTotals {
  const totals = rows.reduce(
    (acc, row) => {
      acc.expected_days += row.expected_days;
      acc.present_count += row.present;
      acc.late_count += row.late;
      acc.absent_count += row.absent;
      acc.leave_count += row.leave;
      acc.holiday_count += row.holiday;
      acc.day_off_count += row.day_off;
      acc.forgot_checkout_count += row.forgot_checkout;
      acc.total_late_minutes += row.total_late_minutes;
      return acc;
    },
    {
      employee_count: rows.length,
      expected_days: 0,
      present_count: 0,
      late_count: 0,
      absent_count: 0,
      leave_count: 0,
      holiday_count: 0,
      day_off_count: 0,
      forgot_checkout_count: 0,
      total_late_minutes: 0,
      avg_late_minutes: 0,
      attendance_rate: 0,
      punctuality_rate: 0,
      late_rate: 0,
    } satisfies ReportsTotals,
  );

  totals.avg_late_minutes =
    totals.late_count > 0 ? Math.round(totals.total_late_minutes / totals.late_count) : 0;
  totals.attendance_rate = rate(totals.present_count + totals.late_count, totals.expected_days);
  totals.punctuality_rate = rate(totals.present_count, totals.expected_days);
  totals.late_rate = rate(totals.late_count, totals.expected_days);

  return totals;
}

function buildNeedsAttention(rows: ReportsEmployeeSummary[]): ReportsAttentionItem[] {
  const items: ReportsAttentionItem[] = [];

  for (const row of rows) {
    if (row.absent >= 2) {
      items.push({
        user_id: row.user_id,
        full_name: row.full_name,
        reason: 'Absences repetees',
        severity: 'high',
        count: row.absent,
      });
    }
    if (row.late >= 3) {
      items.push({
        user_id: row.user_id,
        full_name: row.full_name,
        reason: 'Retards frequents',
        severity: 'medium',
        count: row.late,
      });
    }
    if (row.forgot_checkout >= 2) {
      items.push({
        user_id: row.user_id,
        full_name: row.full_name,
        reason: 'Departs oublies',
        severity: 'medium',
        count: row.forgot_checkout,
      });
    }
    if (row.late > 0 && row.avg_late_minutes > 10) {
      items.push({
        user_id: row.user_id,
        full_name: row.full_name,
        reason: 'Retard moyen eleve',
        severity: 'low',
        count: row.avg_late_minutes,
      });
    }
  }

  return items.sort((a, b) => {
    const severity = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (severity !== 0) return severity;
    if (b.count !== a.count) return b.count - a.count;
    return a.full_name.localeCompare(b.full_name);
  });
}

function rate(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

function keyFor(userId: string, date: string): string {
  return `${userId}:${date}`;
}
