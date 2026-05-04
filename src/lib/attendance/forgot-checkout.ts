import 'server-only';

import { addDays, differenceInCalendarDays, parseISO, subDays } from 'date-fns';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import type { SupabaseClient } from '@supabase/supabase-js';
import { OFFICE_TZ } from '@/lib/utils/date';
import { dayOfWeekEnum, effectiveDayOff, isoWeekForDate } from '@/lib/day-off/weeks';
import type { DayOfWeek, DayOffChangeStatus } from '@/types';

const MAX_ABSENCE_SYNC_DAYS = 366;
const ABSENCE_BATCH_SIZE = 500;

interface OfficeSettingsRow {
  forgot_checkout_cutoff_time: string | null;
  timezone: string | null;
}

interface MarkForgotCheckoutsOptions {
  now?: Date;
  userId?: string;
  startDate?: string;
  endDate?: string;
}

interface ProfileRow {
  id: string;
  default_day_off: DayOfWeek;
  created_at: string;
}

interface AttendancePresenceRow {
  user_id: string;
  date: string;
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

export async function syncClosedAttendanceDays(
  service: SupabaseClient,
  options: MarkForgotCheckoutsOptions = {},
): Promise<void> {
  const settings = await loadOfficeSettings(service);
  if (!settings) return;

  const timezone = settings.timezone || OFFICE_TZ;
  const cutoffTime = normalizeTime(settings.forgot_checkout_cutoff_time);
  const cutoffDate = latestClosedCheckoutDate(options.now ?? new Date(), timezone, cutoffTime);
  const range = closedDateRange({
    startDate: options.startDate,
    endDate: options.endDate,
    cutoffDate,
    timezone,
  });

  await markForgotCheckoutsWithSettings(service, settings, { ...options, endDate: range.end ?? cutoffDate });

  if (!range.start || !range.end || range.dates.length === 0) {
    return;
  }

  await createAbsentRows(service, {
    userId: options.userId,
    dates: range.dates,
    startDate: range.start,
    endDate: range.end,
    timezone,
  });
}

export async function markForgotCheckouts(
  service: SupabaseClient,
  options: MarkForgotCheckoutsOptions = {},
): Promise<void> {
  const settings = await loadOfficeSettings(service);
  if (!settings) return;

  await markForgotCheckoutsWithSettings(service, settings, options);
}

async function loadOfficeSettings(service: SupabaseClient): Promise<OfficeSettingsRow | null> {
  const { data: settings, error: settingsError } = await service
    .from('office_settings')
    .select('forgot_checkout_cutoff_time, timezone')
    .single();

  if (settingsError) {
    console.error('Unable to load office settings for forgotten checkout sync', settingsError);
    return null;
  }

  return settings as OfficeSettingsRow | null;
}

async function markForgotCheckoutsWithSettings(
  service: SupabaseClient,
  settings: OfficeSettingsRow,
  options: MarkForgotCheckoutsOptions,
): Promise<void> {
  const timezone = settings.timezone || OFFICE_TZ;
  const cutoffTime = normalizeTime(settings.forgot_checkout_cutoff_time);
  const cutoffDate = latestClosedCheckoutDate(options.now ?? new Date(), timezone, cutoffTime);
  const effectiveEndDate = minDate(options.endDate ?? cutoffDate, cutoffDate);

  let query = service
    .from('attendance')
    .update({ forgot_checkout: true })
    .not('check_in_at', 'is', null)
    .is('check_out_at', null)
    .eq('forgot_checkout', false)
    .lte('date', effectiveEndDate);

  if (options.userId) {
    query = query.eq('user_id', options.userId);
  }
  if (options.startDate) {
    query = query.gte('date', options.startDate);
  }

  const { error } = await query;

  if (error) {
    console.error('Unable to mark forgotten checkouts', error);
  }
}

function normalizeTime(value: string | null | undefined): string {
  return (value ?? '23:00').slice(0, 5);
}

function closedDateRange({
  startDate,
  endDate,
  cutoffDate,
  timezone,
}: {
  startDate?: string;
  endDate?: string;
  cutoffDate: string;
  timezone: string;
}): { start: string | null; end: string | null; dates: string[] } {
  const end = minDate(endDate ?? cutoffDate, cutoffDate);
  const start = startDate ?? end;

  if (start > end) {
    return { start: null, end: null, dates: [] };
  }

  return {
    start,
    end,
    dates: dateStrings(start, end, timezone),
  };
}

async function createAbsentRows(
  service: SupabaseClient,
  options: {
    userId?: string;
    dates: string[];
    startDate: string;
    endDate: string;
    timezone: string;
  },
): Promise<void> {
  const [profilesResult, attendanceResult, leaveResult, dayOffResult] = await Promise.all([
    (() => {
      let query = service
        .from('profiles')
        .select('id, default_day_off, created_at')
        .eq('is_active', true)
        .eq('role', 'employee');

      if (options.userId) {
        query = query.eq('id', options.userId);
      }

      return query;
    })(),
    (() => {
      let query = service
        .from('attendance')
        .select('user_id, date')
        .gte('date', options.startDate)
        .lte('date', options.endDate);

      if (options.userId) {
        query = query.eq('user_id', options.userId);
      }

      return query;
    })(),
    (() => {
      let query = service
        .from('leave_requests')
        .select('user_id, start_date, end_date')
        .eq('status', 'approved')
        .lte('start_date', options.endDate)
        .gte('end_date', options.startDate);

      if (options.userId) {
        query = query.eq('user_id', options.userId);
      }

      return query;
    })(),
    (() => {
      let query = service
        .from('day_off_changes')
        .select('user_id, iso_year, iso_week, new_day, status')
        .eq('status', 'approved');

      if (options.userId) {
        query = query.eq('user_id', options.userId);
      }

      return query;
    })(),
  ]);

  const firstError =
    profilesResult.error ?? attendanceResult.error ?? leaveResult.error ?? dayOffResult.error;

  if (firstError) {
    console.error('Unable to load data for absence sync', firstError);
    return;
  }

  const profiles = (profilesResult.data ?? []) as ProfileRow[];
  if (profiles.length === 0) return;

  const existingAttendance = new Set(
    ((attendanceResult.data ?? []) as AttendancePresenceRow[]).map((row) =>
      keyFor(row.user_id, row.date),
    ),
  );
  const leavesByUser = groupByUser((leaveResult.data ?? []) as LeaveRow[]);
  const dayOffChangesByUser = groupByUser((dayOffResult.data ?? []) as DayOffChangeRow[]);
  const absenceRows: Array<{
    user_id: string;
    date: string;
    status: 'absent';
    late_minutes: number;
    forgot_checkout: boolean;
    note: string;
  }> = [];

  for (const date of options.dates) {
    const dateAtMidday = dateAtNoon(date, options.timezone);
    const { iso_year, iso_week } = isoWeekForDate(dateAtMidday);
    const weekday = dayOfWeekEnum(dateAtMidday);

    for (const profile of profiles) {
      if (existingAttendance.has(keyFor(profile.id, date))) continue;
      if (date < formatInTimeZone(new Date(profile.created_at), options.timezone, 'yyyy-MM-dd')) continue;
      if (isCoveredByLeave(leavesByUser.get(profile.id) ?? [], date)) continue;

      const dayOff = effectiveDayOff(
        profile.default_day_off,
        dayOffChangesByUser.get(profile.id) ?? [],
        iso_year,
        iso_week,
      );

      if (dayOff === weekday) continue;

      absenceRows.push({
        user_id: profile.id,
        date,
        status: 'absent',
        late_minutes: 0,
        forgot_checkout: false,
        note: 'Absence automatique',
      });
    }
  }

  for (let i = 0; i < absenceRows.length; i += ABSENCE_BATCH_SIZE) {
    const batch = absenceRows.slice(i, i + ABSENCE_BATCH_SIZE);
    const { error } = await service
      .from('attendance')
      .upsert(batch, { onConflict: 'user_id,date', ignoreDuplicates: true });

    if (error) {
      console.error('Unable to create automatic absence rows', error);
      return;
    }
  }
}

function latestClosedCheckoutDate(now: Date, timezone: string, cutoffTime: string): string {
  try {
    const today = formatInTimeZone(now, timezone, 'yyyy-MM-dd');
    const todayCutoff = fromZonedTime(`${today} ${cutoffTime}`, timezone);

    if (now.getTime() > todayCutoff.getTime()) {
      return today;
    }

    const todayNoon = fromZonedTime(`${today} 12:00`, timezone);
    return formatInTimeZone(subDays(todayNoon, 1), timezone, 'yyyy-MM-dd');
  } catch (error) {
    console.error('Unable to compute forgotten checkout cutoff date', error);
    return latestClosedCheckoutDate(now, OFFICE_TZ, cutoffTime);
  }
}

function dateStrings(startDate: string, endDate: string, timezone: string): string[] {
  const start = parseISO(`${startDate}T12:00:00`);
  const end = parseISO(`${endDate}T12:00:00`);
  const days = Math.min(differenceInCalendarDays(end, start), MAX_ABSENCE_SYNC_DAYS - 1);

  return Array.from({ length: days + 1 }, (_, i) =>
    formatInTimeZone(addDays(start, i), timezone, 'yyyy-MM-dd'),
  );
}

function dateAtNoon(date: string, timezone: string): Date {
  return fromZonedTime(`${date} 12:00`, timezone);
}

function minDate(a: string, b: string): string {
  return a < b ? a : b;
}

function keyFor(userId: string, date: string): string {
  return `${userId}:${date}`;
}

function groupByUser<T extends { user_id: string }>(rows: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();

  for (const row of rows) {
    const list = map.get(row.user_id) ?? [];
    list.push(row);
    map.set(row.user_id, list);
  }

  return map;
}

function isCoveredByLeave(leaves: LeaveRow[], date: string): boolean {
  return leaves.some((leave) => leave.start_date <= date && leave.end_date >= date);
}
