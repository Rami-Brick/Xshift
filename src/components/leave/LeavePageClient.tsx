'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Chip } from '@/design-kit/primitives/Chip';
import { LeaveRequestDialog } from './LeaveRequestDialog';
import type { LeaveRequest } from '@/types';
import { formatInTimeZone } from 'date-fns-tz';

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
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.round(ms / 86_400_000) + 1;
}

interface Props {
  initialRequests: LeaveRequest[];
  leaveBalance: number;
}

export function LeavePageClient({ initialRequests, leaveBalance }: Props) {
  const [requests, setRequests] = useState<LeaveRequest[]>(initialRequests);
  const [showForm, setShowForm] = useState(false);

  function handleCreated(req: LeaveRequest) {
    setRequests((prev) => [req, ...prev]);
    setShowForm(false);
  }

  return (
    <>
      {/* Balance card */}
      <div className="bg-surface rounded-xl px-4 py-4 shadow-softer flex items-center justify-between">
        <div>
          <p className="text-caption text-muted">Solde de congés</p>
          <p className="text-section font-bold text-ink mt-0.5">{leaveBalance} jour{leaveBalance !== 1 ? 's' : ''}</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand text-white font-semibold text-sm hover:opacity-90 transition"
        >
          <Plus size={16} />
          Demander
        </button>
      </div>

      {/* Requests list */}
      {requests.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-muted text-small">Aucune demande de congé</p>
        </div>
      ) : (
        <div className="space-y-2">
          {requests.map((req) => (
            <div
              key={req.id}
              className="bg-surface rounded-xl px-4 py-3 shadow-softer"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-small font-semibold text-ink">
                    {TYPE_LABEL[req.type] ?? req.type}
                  </p>
                  <p className="text-caption text-muted mt-0.5">
                    {formatInTimeZone(new Date(req.start_date + 'T00:00'), 'Africa/Tunis', 'dd MMM')}
                    {' → '}
                    {formatInTimeZone(new Date(req.end_date + 'T00:00'), 'Africa/Tunis', 'dd MMM yyyy')}
                    {' · '}
                    {daysBetween(req.start_date, req.end_date)} j
                  </p>
                  {req.reason && (
                    <p className="text-caption text-muted mt-1 italic">{req.reason}</p>
                  )}
                  {req.admin_note && (
                    <p className="text-caption text-muted mt-1">Note : {req.admin_note}</p>
                  )}
                </div>
                <Chip variant={statusVariant(req.status)}>
                  {STATUS_LABEL[req.status] ?? req.status}
                </Chip>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <LeaveRequestDialog
          onClose={() => setShowForm(false)}
          onSuccess={handleCreated}
        />
      )}
    </>
  );
}
