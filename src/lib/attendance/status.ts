import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import { differenceInMinutes } from 'date-fns';
import type { AttendanceStatus } from '@/types';

const OFFICE_TZ = 'Africa/Tunis';

/**
 * Returns minutes late (0 if within grace period).
 * workStartTime: 'HH:mm', gracePeriodMinutes: number, now: Date (UTC)
 */
export function calcLateMinutes(
  workStartTime: string,
  gracePeriodMinutes: number,
  now: Date,
): number {
  const todayStr = formatInTimeZone(now, OFFICE_TZ, 'yyyy-MM-dd');
  const startOfDay = fromZonedTime(`${todayStr} ${normalizeTime(workStartTime)}`, OFFICE_TZ);

  const diffMin = differenceInMinutes(now, startOfDay);
  if (diffMin <= gracePeriodMinutes) return 0;
  return diffMin;
}

function normalizeTime(value: string): string {
  return value.slice(0, 5);
}

export function resolveStatus(lateMinutes: number): AttendanceStatus {
  return lateMinutes > 0 ? 'late' : 'present';
}

export function formatTime(ts: string | null): string {
  if (!ts) return '—';
  return formatInTimeZone(new Date(ts), OFFICE_TZ, 'HH:mm');
}

export function formatDate(dateStr: string): string {
  return formatInTimeZone(new Date(dateStr + 'T00:00:00'), OFFICE_TZ, 'dd MMM yyyy');
}
