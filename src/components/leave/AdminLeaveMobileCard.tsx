'use client';

import { useId, useState } from 'react';
import { ChevronDown, Check, Pencil, X as XIcon, Trash2 } from 'lucide-react';
import { formatInTimeZone } from 'date-fns-tz';
import { Chip } from '@/design-kit/primitives/Chip';
import { cn } from '@/lib/utils/cn';
import type { LeaveRequestListItem } from '@/types';

const TYPE_LABEL: Record<string, string> = {
  annual: 'Congé annuel',
  sick: 'Maladie',
  unpaid: 'Sans solde',
  other: 'Autre',
};

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

function daysBetween(start: string, end: string): number {
  return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86_400_000) + 1;
}

function fmtDate(d: string): string {
  return formatInTimeZone(new Date(d + 'T00:00'), 'Africa/Tunis', 'dd/MM/yyyy');
}

interface Props {
  req: LeaveRequestListItem;
  canDelete: boolean;
  actionLoading: string | null;
  onReview: (id: string, status: 'approved' | 'rejected', deduct_balance?: boolean) => void;
  onEdit: (req: LeaveRequestListItem) => void;
  onDelete: (id: string) => void;
}

export function AdminLeaveMobileCard({ req, canDelete, actionLoading, onReview, onEdit, onDelete }: Props) {
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
            <div className="font-medium text-ink truncate">{req.profiles?.full_name ?? '—'}</div>
            <div className="text-caption text-muted mt-0.5">
              {fmtDate(req.start_date)} → {fmtDate(req.end_date)}
            </div>
          </div>
          <ChevronDown
            size={18}
            className={cn('text-muted transition-transform flex-shrink-0 mt-1', expanded && 'rotate-180')}
          />
        </div>
        <div className="flex items-center gap-2 mt-3">
          <Chip variant={statusVariant(req.status)}>
            {STATUS_LABEL[req.status] ?? req.status}
          </Chip>
          <span className="text-caption text-muted">
            {TYPE_LABEL[req.type] ?? req.type} · {daysBetween(req.start_date, req.end_date)} j
          </span>
        </div>
      </button>

      {expanded && (
        <div id={detailsId} className="px-4 pb-4 pt-1 space-y-3 border-t border-soft">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-caption text-muted uppercase tracking-wide">Type</dt>
              <dd className="text-ink mt-0.5">{TYPE_LABEL[req.type] ?? req.type}</dd>
            </div>
            <div>
              <dt className="text-caption text-muted uppercase tracking-wide">Durée</dt>
              <dd className="text-ink mt-0.5">{daysBetween(req.start_date, req.end_date)} jours</dd>
            </div>
          </dl>
          <div className="flex flex-wrap gap-2 pt-1">
            {req.status === 'pending' && (
              <>
                <button
                  type="button"
                  onClick={() => onReview(req.id, 'approved', true)}
                  disabled={actionLoading === req.id + 'approved'}
                  className="flex-1 min-w-[8rem] inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-trend-up/10 text-trend-up font-medium text-sm hover:bg-trend-up/20 transition disabled:opacity-40"
                >
                  <Check size={14} />
                  Approuver
                </button>
                <button
                  type="button"
                  onClick={() => onReview(req.id, 'rejected')}
                  disabled={actionLoading === req.id + 'rejected'}
                  className="flex-1 min-w-[8rem] inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-trend-down/10 text-trend-down font-medium text-sm hover:bg-trend-down/20 transition disabled:opacity-40"
                >
                  <XIcon size={14} />
                  Refuser
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => onEdit(req)}
              className="flex-1 min-w-[8rem] inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-canvas text-ink font-medium text-sm hover:bg-soft transition"
            >
              <Pencil size={14} />
              Modifier
            </button>
            {canDelete && (
              <button
                type="button"
                onClick={() => onDelete(req.id)}
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
