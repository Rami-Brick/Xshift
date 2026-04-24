'use client';

import { useId, useState } from 'react';
import { ChevronDown, Pencil, Trash2 } from 'lucide-react';
import { Chip } from '@/design-kit/primitives/Chip';
import { formatTime, formatDate } from '@/lib/attendance/status';
import { cn } from '@/lib/utils/cn';
import type { AttendanceListItem } from '@/types';

const STATUS_LABEL: Record<string, string> = {
  present: 'Présent',
  late: 'En retard',
  absent: 'Absent',
  leave: 'En congé',
  holiday: 'Jour férié',
  day_off: 'Jour de repos',
};

function statusVariant(status: string): 'lime' | 'trendDown' | 'neutral' {
  if (status === 'present') return 'lime';
  if (status === 'late' || status === 'absent') return 'trendDown';
  return 'neutral';
}

interface Props {
  row: AttendanceListItem;
  suspect: boolean;
  gracePeriodMinutes: number;
  canDelete: boolean;
  onEdit: (row: AttendanceListItem) => void;
  onDelete: (row: AttendanceListItem) => void;
}

export function AttendanceMobileCard({ row, suspect, gracePeriodMinutes, canDelete, onEdit, onDelete }: Props) {
  const [expanded, setExpanded] = useState(false);
  const detailsId = useId();
  const lateMinutes = row.late_minutes ?? 0;

  return (
    <div className="bg-surface rounded-xl shadow-softer">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-controls={detailsId}
        className="w-full p-4 text-left"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="font-medium text-ink truncate">
              {row.profiles?.full_name ?? '—'}
              {row.forgot_checkout && (
                <span className="ml-2 text-caption text-trend-down font-normal">Oubli</span>
              )}
            </div>
            <div className="text-caption text-muted mt-0.5">{formatDate(row.date)}</div>
          </div>
          <ChevronDown
            size={18}
            className={cn('text-muted transition-transform flex-shrink-0 mt-1', expanded && 'rotate-180')}
          />
        </div>
        <div className="flex items-center gap-2 mt-3">
          <Chip variant={statusVariant(row.status)}>
            {STATUS_LABEL[row.status] ?? row.status}
          </Chip>
          <span className="text-caption text-muted">
            {formatTime(row.check_in_at)} → {formatTime(row.check_out_at)}
          </span>
        </div>
      </button>

      {expanded && (
        <div id={detailsId} className="px-4 pb-4 pt-1 space-y-3 border-t border-soft">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-caption text-muted uppercase tracking-wide">Arrivée</dt>
              <dd className="text-ink mt-0.5">{formatTime(row.check_in_at)}</dd>
            </div>
            <div>
              <dt className="text-caption text-muted uppercase tracking-wide">Départ</dt>
              <dd className="text-ink mt-0.5">{formatTime(row.check_out_at)}</dd>
            </div>
            <div>
              <dt className="text-caption text-muted uppercase tracking-wide">Retard</dt>
              <dd className="mt-0.5">
                {lateMinutes < 0 && <span className="text-trend-up">{lateMinutes} min</span>}
                {lateMinutes > gracePeriodMinutes && <span className="text-trend-down">+{lateMinutes} min</span>}
                {lateMinutes > 0 && lateMinutes <= gracePeriodMinutes && (
                  <span className="text-muted">+{lateMinutes} min</span>
                )}
                {lateMinutes === 0 && <span className="text-muted">—</span>}
              </dd>
            </div>
            <div>
              <dt className="text-caption text-muted uppercase tracking-wide">Appareil</dt>
              <dd className="mt-0.5">
                {row.device_label ? (
                  <span
                    className={suspect ? 'text-amber-600 font-medium text-xs' : 'text-muted text-xs'}
                    title={suspect ? 'Appareil partagé — fraude possible' : undefined}
                  >
                    {row.device_label}{suspect && ' ⚠'}
                  </span>
                ) : (
                  <span className="text-muted text-xs">—</span>
                )}
              </dd>
            </div>
          </dl>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => onEdit(row)}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-canvas text-ink font-medium text-sm hover:bg-soft transition"
            >
              <Pencil size={14} />
              Modifier
            </button>
            {canDelete && (
              <button
                type="button"
                onClick={() => onDelete(row)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-trend-down font-medium text-sm hover:bg-trend-down/10 transition"
                aria-label="Supprimer"
              >
                <Trash2 size={14} />
                Supprimer
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
