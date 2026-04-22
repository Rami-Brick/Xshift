import { formatInTimeZone, toZonedTime } from 'date-fns-tz';

const OFFICE_TIMEZONE = 'Africa/Tunis';

export function nowInOffice(): Date {
  return toZonedTime(new Date(), OFFICE_TIMEZONE);
}

export function formatOffice(date: Date | string, pattern: string): string {
  return formatInTimeZone(typeof date === 'string' ? new Date(date) : date, OFFICE_TIMEZONE, pattern);
}

export function todayDateInOffice(): string {
  return formatInTimeZone(new Date(), OFFICE_TIMEZONE, 'yyyy-MM-dd');
}

export const OFFICE_TZ = OFFICE_TIMEZONE;
