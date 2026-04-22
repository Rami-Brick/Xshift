import {
  addWeeks,
  getISOWeek,
  getISOWeekYear,
  parseISO,
  startOfISOWeek,
  addDays as fnAddDays,
} from 'date-fns';
import { toZonedTime, formatInTimeZone } from 'date-fns-tz';
import type { DayOfWeek, DayOffChange } from '@/types';

const OFFICE_TZ = 'Africa/Tunis';

const DAY_INDEX_TO_NAME: Record<number, DayOfWeek> = {
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
  7: 'sunday',
};

const DAY_NAME_TO_INDEX: Record<DayOfWeek, number> = {
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
  sunday: 7,
};

export function isoWeekForDate(d: Date): { iso_year: number; iso_week: number } {
  const zoned = toZonedTime(d, OFFICE_TZ);
  return { iso_year: getISOWeekYear(zoned), iso_week: getISOWeek(zoned) };
}

export function isoWeekForNow(): { iso_year: number; iso_week: number } {
  return isoWeekForDate(new Date());
}

export function isoWeekForNextWeek(): { iso_year: number; iso_week: number } {
  return isoWeekForDate(addWeeks(new Date(), 1));
}

export function dayOfWeekEnum(d: Date): DayOfWeek {
  const zoned = toZonedTime(d, OFFICE_TZ);
  const day = zoned.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const iso = day === 0 ? 7 : day;
  return DAY_INDEX_TO_NAME[iso];
}

export function dayOfWeekToIndex(day: DayOfWeek): number {
  return DAY_NAME_TO_INDEX[day];
}

/** Monday (index 1) → date; Sunday (index 7) → date. Anchored to ISO week in office TZ. */
export function dateForIsoWeekday(iso_year: number, iso_week: number, day: DayOfWeek): string {
  // Build the Monday of the ISO week at noon (avoids DST edge cases), then offset.
  // We anchor via the simple trick: Jan 4th is always in ISO week 1 of iso_year.
  const jan4 = parseISO(`${iso_year}-01-04T12:00:00`);
  const week1Monday = startOfISOWeek(jan4);
  const targetMonday = fnAddDays(week1Monday, (iso_week - 1) * 7);
  const targetDate = fnAddDays(targetMonday, DAY_NAME_TO_INDEX[day] - 1);
  return formatInTimeZone(targetDate, OFFICE_TZ, 'yyyy-MM-dd');
}

/**
 * Resolve the effective day off for a given ISO week:
 *  - An approved override row for that (user, year, week) wins → its new_day.
 *  - Otherwise the profile's default_day_off.
 */
export function effectiveDayOff(
  profileDefault: DayOfWeek,
  overrides: Pick<DayOffChange, 'iso_year' | 'iso_week' | 'new_day' | 'status'>[],
  iso_year: number,
  iso_week: number,
): DayOfWeek {
  const match = overrides.find(
    (o) => o.status === 'approved' && o.iso_year === iso_year && o.iso_week === iso_week,
  );
  return match ? match.new_day : profileDefault;
}

export const DAY_OFF_LABELS_FR: Record<DayOfWeek, string> = {
  monday: 'Lundi',
  tuesday: 'Mardi',
  wednesday: 'Mercredi',
  thursday: 'Jeudi',
  friday: 'Vendredi',
  saturday: 'Samedi',
  sunday: 'Dimanche',
};
