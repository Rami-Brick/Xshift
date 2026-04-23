import { requireUserCached } from '@/lib/auth/guards';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { timeAsync } from '@/lib/perf/timing';
import { TodayCard } from '@/components/attendance/TodayCard';
import { KpiCard } from '@/design-kit/compounds/KpiCard';
import { formatTime, formatDate } from '@/lib/attendance/status';
import { todayDateInOffice } from '@/lib/utils/date';
import { formatInTimeZone } from 'date-fns-tz';
import { startOfMonth, endOfMonth } from 'date-fns';
import { CalendarDays, Clock, Palmtree } from 'lucide-react';
import {
  dayOfWeekEnum,
  effectiveDayOff,
  isoWeekForNow,
} from '@/lib/day-off/weeks';
import type { Attendance, DayOfWeek } from '@/types';

const STATUS_LABEL: Record<string, string> = {
  present: 'Présent',
  late: 'En retard',
  absent: 'Absent',
  leave: 'En congé',
  holiday: 'Jour férié',
  day_off: 'Jour de repos',
};

export default async function DashboardPage() {
  const { profile } = await requireUserCached();
  const supabase = await createClient();

  const today = todayDateInOffice();
  const now = new Date();
  const monthStart = formatInTimeZone(startOfMonth(now), 'Africa/Tunis', 'yyyy-MM-dd');
  const monthEnd = formatInTimeZone(endOfMonth(now), 'Africa/Tunis', 'yyyy-MM-dd');

  const [{ data: todayRecord }, { data: monthRecords }, { data: recent }, { data: settings }] = await timeAsync('page.employee.dashboard.data', () => Promise.all([
    supabase
      .from('attendance')
      .select('id, user_id, date, check_in_at, check_out_at, status, late_minutes, forgot_checkout')
      .eq('user_id', profile.id)
      .eq('date', today)
      .maybeSingle(),
    supabase
      .from('attendance')
      .select('status, late_minutes')
      .eq('user_id', profile.id)
      .gte('date', monthStart)
      .lte('date', monthEnd),
    supabase
      .from('attendance')
      .select('id, date, check_in_at, check_out_at, status')
      .eq('user_id', profile.id)
      .order('date', { ascending: false })
      .limit(5),
    supabase
      .from('office_settings')
      .select('grace_period_minutes')
      .single(),
  ]));

  const presentCount = monthRecords?.filter((r) => r.status === 'present' || r.status === 'late').length ?? 0;
  const lateCount = monthRecords?.filter((r) => r.status === 'late').length ?? 0;

  const firstName = profile.full_name.split(' ')[0];

  // Is today the effective day off for this employee?
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

  return (
    <div className="space-y-5 px-4 pt-5 pb-2">
      {/* Greeting */}
      <div>
        <p className="text-muted text-small">Bonjour,</p>
        <h1 className="text-section font-bold text-ink tracking-tight">{firstName}</h1>
        <p className="text-caption text-muted mt-0.5 capitalize">
          {formatInTimeZone(now, 'Africa/Tunis', 'EEEE d MMMM yyyy', { locale: undefined })}
        </p>
      </div>

      {/* Today check-in card */}
      <TodayCard
        initialToday={todayRecord as Attendance | null}
        gracePeriodMinutes={settings?.grace_period_minutes ?? 10}
        isDayOff={isDayOff}
      />

      {/* KPI row */}
      <div className="grid grid-cols-3 gap-3">
        <KpiCard
          title="Présents ce mois"
          value={String(presentCount)}
          icon={CalendarDays}
        />
        <KpiCard
          title="Retards"
          value={String(lateCount)}
          icon={Clock}
        />
        <KpiCard
          title="Solde congés"
          value={String(profile.leave_balance)}
          icon={Palmtree}
        />
      </div>

      {/* Recent attendance */}
      {(recent?.length ?? 0) > 0 && (
        <div>
          <p className="text-small font-semibold text-muted uppercase tracking-wide mb-3">
            Présences récentes
          </p>
          <div className="space-y-2">
            {recent!.map((row) => (
              <div
                key={row.id}
                className="flex items-center justify-between bg-surface rounded-xl px-4 py-3 shadow-softer"
              >
                <div>
                  <p className="text-small font-medium text-ink">{formatDate(row.date)}</p>
                  <p className="text-caption text-muted">
                    {formatTime(row.check_in_at)} → {formatTime(row.check_out_at)}
                  </p>
                </div>
                <span className={`text-caption font-semibold px-2 py-1 rounded-md
                  ${row.status === 'present' ? 'bg-trend-up/10 text-trend-up' : ''}
                  ${row.status === 'late' ? 'bg-trend-down/10 text-trend-down' : ''}
                  ${row.status === 'absent' ? 'bg-trend-down/10 text-trend-down' : ''}
                  ${row.status === 'leave' || row.status === 'holiday' ? 'bg-soft text-muted' : ''}
                `}>
                  {STATUS_LABEL[row.status] ?? row.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
