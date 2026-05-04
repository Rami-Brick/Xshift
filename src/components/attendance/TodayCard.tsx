'use client';

import { useState } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { formatInTimeZone } from 'date-fns-tz';
import { fr } from 'date-fns/locale';
import { Card } from '@/design-kit/primitives/Card';
import { Chip } from '@/design-kit/primitives/Chip';
import { CheckInButton } from './CheckInButton';
import { formatTime } from '@/lib/attendance/status';
import type { Attendance } from '@/types';

type UnresolvedPriorDay = { date: string };

function formatPriorDay(date: string): string {
  return formatInTimeZone(`${date}T00:00:00`, 'Africa/Tunis', 'EEEE d MMMM', { locale: fr });
}

const STATUS_LABEL: Record<string, string> = {
  present: 'Présent',
  late: 'En retard',
  absent: 'Absent',
  leave: 'En congé',
  holiday: 'Jour férié',
  day_off: 'Jour de repos',
};

const STATUS_TONE: Record<string, 'lime' | 'amber' | 'trendDown' | 'neutral'> = {
  present: 'lime',
  late: 'amber',
  absent: 'trendDown',
  leave: 'neutral',
  holiday: 'neutral',
  day_off: 'neutral',
};

interface TodayCardProps {
  initialToday: Attendance | null;
  gracePeriodMinutes: number;
  todayDate: string;
  isDayOff?: boolean;
  initialUnresolvedPriorDays?: UnresolvedPriorDay[];
  firstName: string;
}

export function TodayCard({
  initialToday,
  gracePeriodMinutes,
  todayDate,
  isDayOff = false,
  initialUnresolvedPriorDays = [],
  firstName,
}: TodayCardProps) {
  const [today, setToday] = useState<Attendance | null>(initialToday);
  const [unresolvedPriorDays, setUnresolvedPriorDays] =
    useState<UnresolvedPriorDay[]>(initialUnresolvedPriorDays);

  async function refresh() {
    const res = await fetch(
      `/api/attendance/me?start=${todayDate}&end=${todayDate}&include_unresolved=1`,
    );
    if (res.ok) {
      const data = (await res.json()) as {
        records: Attendance[];
        unresolvedPriorDays: UnresolvedPriorDay[];
      };
      setToday(data.records[0] ?? null);
      setUnresolvedPriorDays(data.unresolvedPriorDays ?? []);
    }
  }

  return (
    <div className="relative">
      {unresolvedPriorDays.length > 0 && (
        <div
          role="alert"
          title={unresolvedPriorDays.map((d) => formatPriorDay(d.date)).join(', ')}
          className="absolute left-0 right-0 bottom-full -mb-2 z-10 overflow-hidden rounded-2xl border-2 border-red-700 bg-gradient-to-br from-red-500 to-red-700 px-4 py-3 text-center text-white shadow-[0_10px_30px_rgba(220,38,38,0.45)] animate-[pulse_1.8s_ease-in-out_infinite]"
        >
          <div className="flex items-center justify-center gap-2">
            <AlertTriangle
              size={22}
              className="text-white animate-[pulse_1.2s_ease-in-out_infinite]"
            />
            <p className="text-cardTitle font-extrabold uppercase tracking-wide text-white">
              Attention {firstName} !
            </p>
          </div>
          <p className="mt-1 text-small font-semibold text-white/95">
            {unresolvedPriorDays.length === 1
              ? `Vous avez oublié de pointer votre départ — ${formatPriorDay(unresolvedPriorDays[0].date)}`
              : `Vous avez oublié de pointer votre départ — ${unresolvedPriorDays.length} jours non clôturés`}
          </p>
        </div>
      )}

      <Card tone="surface" className="p-5 pb-6">
      <div className="flex min-h-7 items-center justify-center gap-2">
        {today?.status ? (
          <Chip variant={STATUS_TONE[today.status] ?? 'neutral'}>
            {STATUS_LABEL[today.status] ?? today.status}
          </Chip>
        ) : (
          <span className="sr-only">Pointage du jour</span>
        )}
      </div>

      <div className="mt-3 flex justify-center">
        {isDayOff ? (
          <div className="flex h-36 w-36 flex-col items-center justify-center rounded-full bg-canvas text-center shadow-softer">
            <p className="text-cardTitle font-bold text-ink">Repos</p>
            <p className="mt-1 max-w-24 text-caption text-muted">
              Pas de pointage
            </p>
          </div>
        ) : (
          <CheckInButton today={today} onSuccess={refresh} />
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="bg-canvas rounded-xl p-3 text-center">
          <p className="text-caption text-muted mb-1">Arrivée</p>
          <div className="flex items-center justify-center gap-1.5">
            <Clock size={14} className="text-brand" />
            <span className="text-cardTitle font-bold text-ink">
              {today?.check_in_at ? formatTime(today.check_in_at) : '—'}
            </span>
          </div>
          {(today?.late_minutes ?? 0) > gracePeriodMinutes && (
            <p className="text-caption text-trend-down mt-1">
              +{today!.late_minutes} min de retard
            </p>
          )}
          {(today?.late_minutes ?? 0) > 0 && (today?.late_minutes ?? 0) <= gracePeriodMinutes && (
            <p className="text-caption text-muted mt-1">
              +{today!.late_minutes} min (dans la tolérance)
            </p>
          )}
          {(today?.late_minutes ?? 0) < 0 && (
            <p className="text-caption text-trend-up mt-1">
              {today!.late_minutes} min d&apos;avance
            </p>
          )}
        </div>

        <div className="bg-canvas rounded-xl p-3 text-center">
          <p className="text-caption text-muted mb-1">Départ</p>
          <div className="flex items-center justify-center gap-1.5">
            <Clock size={14} className="text-muted" />
            <span className="text-cardTitle font-bold text-ink">
              {today?.check_out_at ? formatTime(today.check_out_at) : '—'}
            </span>
          </div>
        </div>
      </div>
    </Card>
    </div>
  );
}
