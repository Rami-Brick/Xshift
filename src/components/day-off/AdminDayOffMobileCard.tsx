'use client';

import { useId, useState } from 'react';
import { ChevronDown, Check, Pencil, X as XIcon, Trash2 } from 'lucide-react';
import { Chip } from '@/design-kit/primitives/Chip';
import { DAY_OFF_LABELS_FR } from '@/lib/day-off/weeks';
import { cn } from '@/lib/utils/cn';
import type { DayOffChangeListItem } from '@/types';

const STATUS_LABEL: Record<string, string> = {
  pending: 'En attente',
  approved: 'Approuvé',
  rejected: 'Refusé',
  cancelled: 'Annulé',
};

function statusVariant(status: string): 'lime' | 'trendDown' | 'neutral' | 'brand' {
  if (status === 'approved') return 'lime';
  if (status === 'rejected') return 'trendDown';
  if (status === 'pending') return 'brand';
  return 'neutral';
}

interface Props {
  change: DayOffChangeListItem;
  canDelete: boolean;
  actionLoading: string | null;
  onReview: (id: string, status: 'approved' | 'rejected') => void;
  onEdit: (change: DayOffChangeListItem) => void;
  onDelete: (id: string) => void;
}

export function AdminDayOffMobileCard({ change, canDelete, actionLoading, onReview, onEdit, onDelete }: Props) {
  const [expanded, setExpanded] = useState(false);
  const detailsId = useId();

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
            <div className="font-medium text-ink truncate">{change.profiles?.full_name ?? '—'}</div>
            <div className="text-caption text-muted mt-0.5">S{change.iso_week} / {change.iso_year}</div>
          </div>
          <ChevronDown
            size={18}
            className={cn('text-muted transition-transform flex-shrink-0 mt-1', expanded && 'rotate-180')}
          />
        </div>
        <div className="flex items-center gap-2 mt-3">
          <Chip variant={statusVariant(change.status)}>
            {STATUS_LABEL[change.status] ?? change.status}
          </Chip>
          <span className="text-caption text-muted">
            {DAY_OFF_LABELS_FR[change.old_day]} → {DAY_OFF_LABELS_FR[change.new_day]}
          </span>
        </div>
      </button>

      {expanded && (
        <div id={detailsId} className="px-4 pb-4 pt-1 space-y-3 border-t border-soft">
          <div>
            <div className="text-caption text-muted uppercase tracking-wide">Raison</div>
            <div className="text-sm text-ink mt-0.5 whitespace-pre-wrap">{change.reason ?? '—'}</div>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {change.status === 'pending' && (
              <>
                <button
                  type="button"
                  onClick={() => onReview(change.id, 'approved')}
                  disabled={actionLoading === change.id + 'approved'}
                  className="flex-1 min-w-[8rem] inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-trend-up/10 text-trend-up font-medium text-sm hover:bg-trend-up/20 transition disabled:opacity-40"
                >
                  <Check size={14} />
                  Approuver
                </button>
                <button
                  type="button"
                  onClick={() => onReview(change.id, 'rejected')}
                  disabled={actionLoading === change.id + 'rejected'}
                  className="flex-1 min-w-[8rem] inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-trend-down/10 text-trend-down font-medium text-sm hover:bg-trend-down/20 transition disabled:opacity-40"
                >
                  <XIcon size={14} />
                  Refuser
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => onEdit(change)}
              className="flex-1 min-w-[8rem] inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-canvas text-ink font-medium text-sm hover:bg-soft transition"
            >
              <Pencil size={14} />
              Modifier
            </button>
            {canDelete && (
              <button
                type="button"
                onClick={() => onDelete(change.id)}
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
