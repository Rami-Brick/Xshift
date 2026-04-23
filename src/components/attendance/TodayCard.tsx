'use client';

import { useState } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { Card } from '@/design-kit/primitives/Card';
import { Chip } from '@/design-kit/primitives/Chip';
import { CheckInButton } from './CheckInButton';
import { formatTime } from '@/lib/attendance/status';
import type { Attendance } from '@/types';

const STATUS_LABEL: Record<string, string> = {
  present: 'Présent',
  late: 'En retard',
  absent: 'Absent',
  leave: 'En congé',
  holiday: 'Jour férié',
  day_off: 'Jour de repos',
};

const STATUS_TONE: Record<string, 'lime' | 'trendDown' | 'neutral'> = {
  present: 'lime',
  late: 'trendDown',
  absent: 'trendDown',
  leave: 'neutral',
  holiday: 'neutral',
  day_off: 'neutral',
};

interface TodayCardProps {
  initialToday: Attendance | null;
  gracePeriodMinutes: number;
  isDayOff?: boolean;
}

export function TodayCard({ initialToday, gracePeriodMinutes, isDayOff = false }: TodayCardProps) {
  const [today, setToday] = useState<Attendance | null>(initialToday);

  async function refresh() {
    const res = await fetch(
      `/api/attendance/me?start=${new Date().toISOString().slice(0, 10)}&end=${new Date().toISOString().slice(0, 10)}`,
    );
    if (res.ok) {
      const data = await res.json();
      setToday(data[0] ?? null);
    }
  }

  return (
    <Card tone="surface" className="p-5 pb-6">
      <div className="flex min-h-7 items-center justify-center gap-2">
        {today?.status ? (
          <Chip variant={STATUS_TONE[today.status] ?? 'neutral'}>
            {STATUS_LABEL[today.status] ?? today.status}
          </Chip>
        ) : (
          <span className="sr-only">Pointage du jour</span>
        )}
        {today?.forgot_checkout && (
          <span className="flex items-center gap-1 text-small text-trend-down font-medium">
            <AlertTriangle size={14} />
            Oubli de départ
          </span>
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
  );
}
