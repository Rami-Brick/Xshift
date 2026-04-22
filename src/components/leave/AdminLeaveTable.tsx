'use client';

import { useState } from 'react';
import { Plus, Check, X as XIcon, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Chip } from '@/design-kit/primitives/Chip';
import { AdminLeaveDialog } from './AdminLeaveDialog';
import type { LeaveRequest, Profile } from '@/types';
import { formatInTimeZone } from 'date-fns-tz';

type LeaveWithProfile = LeaveRequest & {
  profiles?: Pick<Profile, 'id' | 'full_name' | 'email'>;
};

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

interface Props {
  initialRequests: LeaveWithProfile[];
  employees: Pick<Profile, 'id' | 'full_name'>[];
}

export function AdminLeaveTable({ initialRequests, employees }: Props) {
  const [requests, setRequests] = useState<LeaveWithProfile[]>(initialRequests);
  const [showDialog, setShowDialog] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  async function handleReview(
    id: string,
    status: 'approved' | 'rejected',
    deduct_balance = false,
  ) {
    setActionLoading(id + status);
    const res = await fetch(`/api/leave/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, deduct_balance }),
    });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error ?? 'Erreur');
      setActionLoading(null);
      return;
    }
    toast.success(status === 'approved' ? 'Congé approuvé' : 'Congé refusé');
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, ...json } : r)));
    setActionLoading(null);
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/leave/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error ?? 'Erreur');
      return;
    }
    toast.success('Demande supprimée');
    setRequests((prev) => prev.filter((r) => r.id !== id));
  }

  function handleCreated(req: LeaveWithProfile) {
    setRequests((prev) => [req, ...prev]);
    setShowDialog(false);
  }

  const statusFilter = ['all', 'pending', 'approved', 'rejected', 'cancelled'] as const;
  const [filter, setFilter] = useState<string>('all');

  const visible = filter === 'all' ? requests : requests.filter((r) => r.status === filter);

  return (
    <>
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex gap-2 flex-wrap">
          {statusFilter.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-pill text-sm font-medium transition ${
                filter === s
                  ? 'bg-brand text-white'
                  : 'bg-surface text-muted hover:text-ink shadow-softer'
              }`}
            >
              {s === 'all' ? 'Tous' : STATUS_LABEL[s]}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setShowDialog(true)}
          className="ml-auto inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand text-white font-semibold text-sm hover:opacity-90 transition"
        >
          <Plus size={16} />
          Assigner un congé
        </button>
      </div>

      <div className="bg-surface rounded-xl shadow-softer overflow-hidden">
        {visible.length === 0 ? (
          <div className="p-8 text-center text-muted text-sm">Aucune demande</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-soft text-left">
                  <th className="px-4 py-3 text-caption font-semibold text-muted uppercase tracking-wide">Employé</th>
                  <th className="px-4 py-3 text-caption font-semibold text-muted uppercase tracking-wide">Type</th>
                  <th className="px-4 py-3 text-caption font-semibold text-muted uppercase tracking-wide">Période</th>
                  <th className="px-4 py-3 text-caption font-semibold text-muted uppercase tracking-wide">Durée</th>
                  <th className="px-4 py-3 text-caption font-semibold text-muted uppercase tracking-wide">Statut</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {visible.map((req) => (
                  <tr key={req.id} className="border-b border-soft last:border-0 hover:bg-canvas/50 transition">
                    <td className="px-4 py-3 font-medium text-ink whitespace-nowrap">
                      {req.profiles?.full_name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-muted whitespace-nowrap">
                      {TYPE_LABEL[req.type] ?? req.type}
                    </td>
                    <td className="px-4 py-3 text-muted whitespace-nowrap">
                      {formatInTimeZone(new Date(req.start_date + 'T00:00'), 'Africa/Tunis', 'dd/MM/yyyy')}
                      {' → '}
                      {formatInTimeZone(new Date(req.end_date + 'T00:00'), 'Africa/Tunis', 'dd/MM/yyyy')}
                    </td>
                    <td className="px-4 py-3 text-muted whitespace-nowrap">
                      {daysBetween(req.start_date, req.end_date)} j
                    </td>
                    <td className="px-4 py-3">
                      <Chip variant={statusVariant(req.status)}>
                        {STATUS_LABEL[req.status] ?? req.status}
                      </Chip>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        {req.status === 'pending' && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleReview(req.id, 'approved', true)}
                              disabled={actionLoading === req.id + 'approved'}
                              className="p-1.5 rounded-lg text-trend-up hover:bg-trend-up/10 transition disabled:opacity-40"
                              aria-label="Approuver"
                            >
                              <Check size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReview(req.id, 'rejected')}
                              disabled={actionLoading === req.id + 'rejected'}
                              className="p-1.5 rounded-lg text-trend-down hover:bg-trend-down/10 transition disabled:opacity-40"
                              aria-label="Refuser"
                            >
                              <XIcon size={16} />
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDelete(req.id)}
                          className="p-1.5 rounded-lg text-muted hover:text-trend-down hover:bg-trend-down/10 transition"
                          aria-label="Supprimer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showDialog && (
        <AdminLeaveDialog
          employees={employees}
          onClose={() => setShowDialog(false)}
          onSuccess={handleCreated}
        />
      )}
    </>
  );
}
