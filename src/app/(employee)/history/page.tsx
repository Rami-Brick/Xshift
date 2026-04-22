import { Suspense } from 'react';
import { requireUserCached } from '@/lib/auth/guards';
import { createClient } from '@/lib/supabase/server';
import { timeAsync } from '@/lib/perf/timing';
import { formatInTimeZone } from 'date-fns-tz';
import { startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { formatTime, formatDate } from '@/lib/attendance/status';
import { MonthFilter } from '@/components/attendance/MonthFilter';
import type { Attendance } from '@/types';

const OFFICE_TZ = 'Africa/Tunis';

const STATUS_LABEL: Record<string, string> = {
  present: 'Présent',
  late: 'En retard',
  absent: 'Absent',
  leave: 'En congé',
  holiday: 'Jour férié',
  day_off: 'Jour de repos',
};

function statusClasses(status: string): string {
  if (status === 'present') return 'bg-trend-up/10 text-trend-up';
  if (status === 'late' || status === 'absent') return 'bg-trend-down/10 text-trend-down';
  return 'bg-soft text-muted';
}

function buildMonthOptions(count = 12): Array<{ label: string; value: string }> {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = subMonths(now, i);
    const value = formatInTimeZone(d, OFFICE_TZ, 'yyyy-MM');
    const raw = formatInTimeZone(d, OFFICE_TZ, 'MMMM yyyy');
    const label = raw.charAt(0).toUpperCase() + raw.slice(1);
    return { value, label };
  });
}

interface PageProps {
  searchParams: Promise<{ month?: string }>;
}

export default async function HistoryPage({ searchParams }: PageProps) {
  const { profile } = await requireUserCached();
  const { month } = await searchParams;
  const now = new Date();
  const monthOptions = buildMonthOptions();

  const selectedMonth = month ?? formatInTimeZone(now, OFFICE_TZ, 'yyyy-MM');

  const [year, mon] = selectedMonth.split('-').map(Number);
  const refDate = new Date(year, mon - 1, 1);
  const monthStart = formatInTimeZone(startOfMonth(refDate), OFFICE_TZ, 'yyyy-MM-dd');
  const monthEnd = formatInTimeZone(endOfMonth(refDate), OFFICE_TZ, 'yyyy-MM-dd');

  return (
    <div className="space-y-4 px-4 pt-5 pb-4">
      <h1 className="text-section font-bold text-ink tracking-tight">Historique</h1>
      <MonthFilter options={monthOptions} selected={selectedMonth} />
      <Suspense fallback={<HistorySkeleton />}>
        <HistoryContent userId={profile.id} monthStart={monthStart} monthEnd={monthEnd} />
      </Suspense>
    </div>
  );
}

async function HistoryContent({
  userId,
  monthStart,
  monthEnd,
}: {
  userId: string;
  monthStart: string;
  monthEnd: string;
}) {
  const supabase = await createClient();

  const { data: records } = await timeAsync('page.employee.history.data', () =>
    supabase
      .from('attendance')
      .select('id, date, check_in_at, check_out_at, status, late_minutes, forgot_checkout')
      .eq('user_id', userId)
      .gte('date', monthStart)
      .lte('date', monthEnd)
      .order('date', { ascending: false }),
  );

  const rows = (records ?? []) as Attendance[];

  const presentCount = rows.filter((r) => r.status === 'present' || r.status === 'late').length;
  const lateCount = rows.filter((r) => r.status === 'late').length;
  const absentCount = rows.filter((r) => r.status === 'absent').length;

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        <SummaryTile label="Présences" value={presentCount} />
        <SummaryTile label="Retards" value={lateCount} tone="down" />
        <SummaryTile label="Absences" value={absentCount} tone="down" />
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-muted text-small">Aucune présence ce mois-ci</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <div
              key={row.id}
              className="bg-surface rounded-xl px-4 py-3 shadow-softer flex items-center justify-between"
            >
              <div>
                <p className="text-small font-semibold text-ink">{formatDate(row.date)}</p>
                <p className="text-caption text-muted mt-0.5">
                  {formatTime(row.check_in_at)} - {formatTime(row.check_out_at)}
                  {(row.late_minutes ?? 0) > 0 && (
                    <span className="text-trend-down ml-1">
                      (+{row.late_minutes} min)
                    </span>
                  )}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={`text-caption font-semibold px-2 py-1 rounded-md ${statusClasses(row.status)}`}>
                  {STATUS_LABEL[row.status] ?? row.status}
                </span>
                {row.forgot_checkout && (
                  <span className="text-caption text-trend-down font-medium">Oubli départ</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function SummaryTile({ label, value, tone }: { label: string; value: number; tone?: 'down' }) {
  return (
    <div className="bg-surface rounded-xl px-3 py-3 shadow-softer text-center">
      <p className={`text-section font-bold ${tone === 'down' ? 'text-trend-down' : 'text-ink'}`}>{value}</p>
      <p className="text-caption text-muted mt-0.5">{label}</p>
    </div>
  );
}

function HistorySkeleton() {
  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-surface shadow-softer animate-pulse" />
        ))}
      </div>
      <div className="space-y-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-surface shadow-softer animate-pulse" />
        ))}
      </div>
    </>
  );
}
