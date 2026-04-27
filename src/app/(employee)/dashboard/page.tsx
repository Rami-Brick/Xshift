import { requireUserCached } from '@/lib/auth/guards';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { timeAsync } from '@/lib/perf/timing';
import { TodayCard } from '@/components/attendance/TodayCard';
import { todayDateInOffice } from '@/lib/utils/date';
import { formatInTimeZone } from 'date-fns-tz';
import { fr } from 'date-fns/locale';
import {
  dayOfWeekEnum,
  effectiveDayOff,
  isoWeekForNow,
} from '@/lib/day-off/weeks';
import type { Attendance, DayOfWeek } from '@/types';

export default async function DashboardPage() {
  const { profile } = await requireUserCached();
  const supabase = await createClient();

  const today = todayDateInOffice();
  const now = new Date();

  const [{ data: todayRecord }, { data: settings }, { data: unresolvedPriorDays }] = await timeAsync(
    'page.employee.dashboard.data',
    () => Promise.all([
      supabase
        .from('attendance')
        .select('id, user_id, date, check_in_at, check_out_at, status, late_minutes, forgot_checkout')
        .eq('user_id', profile.id)
        .eq('date', today)
        .maybeSingle(),
      supabase
        .from('office_settings')
        .select('grace_period_minutes')
        .single(),
      supabase
        .from('attendance')
        .select('date')
        .eq('user_id', profile.id)
        .lt('date', today)
        .not('check_in_at', 'is', null)
        .is('check_out_at', null)
        .order('date', { ascending: false })
        .limit(5),
    ]),
  );

  const firstName = profile.full_name.split(' ')[0];

  const week = isoWeekForNow();
  const service = createServiceClient();
  const { data: overrides } = await service
    .from('day_off_changes')
    .select('iso_year, iso_week, new_day, status')
    .eq('user_id', profile.id)
    .eq('iso_year', week.iso_year)
    .eq('iso_week', week.iso_week)
    .eq('status', 'approved');

  const effective = effectiveDayOff(
    profile.default_day_off as DayOfWeek,
    overrides ?? [],
    week.iso_year,
    week.iso_week,
  );
  const isDayOff = effective === dayOfWeekEnum(now);

  const hasUnresolved = (unresolvedPriorDays?.length ?? 0) > 0;

  return (
    <div className="px-4 pt-3 pb-2">
      <div className="min-h-[120px] flex flex-col items-center justify-center text-center">
        <p className="text-small font-semibold text-brand">Bonjour</p>
        <h1 className="mt-2 text-displayXl font-bold text-ink leading-none">
          {firstName}
        </h1>
        <p className="text-small text-muted mt-3 capitalize">
          {formatInTimeZone(now, 'Africa/Tunis', 'EEEE d MMMM yyyy', { locale: fr })}
        </p>
      </div>

      <div className={hasUnresolved ? 'mt-28' : 'mt-4'}>
        <TodayCard
          initialToday={todayRecord as Attendance | null}
          gracePeriodMinutes={settings?.grace_period_minutes ?? 10}
          todayDate={today}
          isDayOff={isDayOff}
          initialUnresolvedPriorDays={unresolvedPriorDays ?? []}
          firstName={firstName}
        />
      </div>
    </div>
  );
}
