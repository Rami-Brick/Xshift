'use client';

import { useState, type ReactNode } from 'react';
import { Plus, Check, Pencil, X as XIcon, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Chip } from '@/design-kit/primitives/Chip';
import { AdminLeaveDialog } from './AdminLeaveDialog';
import type { LeaveRequestListItem, Profile } from '@/types';
import { formatInTimeZone } from 'date-fns-tz';

const OFFICE_TZ = 'Africa/Tunis';

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

function formatLeaveDate(date: string): string {
  return formatInTimeZone(new Date(date + 'T00:00'), OFFICE_TZ, 'dd/MM/yyyy');
}

interface Props {
  initialRequests: LeaveRequestListItem[];
  employees: Pick<Profile, 'id' | 'full_name'>[];
  canDelete: boolean;
}

interface LeaveActionsProps {
  request: LeaveRequestListItem;
  canDelete: boolean;
  actionLoading: string | null;
  onReview: (id: string, status: 'approved' | 'rejected', deductBalance?: boolean) => void;
  onEdit: (request: LeaveRequestListItem) => void;
  onDelete: (id: string) => void;
}

function MobileDetail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-xl bg-canvas px-3 py-2">
      <dt className="text-caption font-medium text-muted">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold text-ink">{children}</dd>
    </div>
  );
}

function LeaveActions({
  request,
  canDelete,
  actionLoading,
  onReview,
  onEdit,
  onDelete,
}: LeaveActionsProps) {
  return (
    <div className="flex items-center gap-2 justify-end">
      {request.status === 'pending' && (
        <>
          <button
            type="button"
            onClick={() => onReview(request.id, 'approved', true)}
            disabled={actionLoading === request.id + 'approved'}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-trend-up transition hover:bg-trend-up/10 disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-brand/40"
            aria-label="Approuver"
          >
            <Check size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onReview(request.id, 'rejected')}
            disabled={actionLoading === request.id + 'rejected'}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-trend-down transition hover:bg-trend-down/10 disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-brand/40"
            aria-label="Refuser"
          >
            <XIcon size={16} aria-hidden="true" />
          </button>
        </>
      )}
      <button
        type="button"
        onClick={() => onEdit(request)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted transition hover:bg-soft hover:text-ink focus-visible:ring-2 focus-visible:ring-brand/40"
        aria-label="Modifier"
      >
        <Pencil size={14} aria-hidden="true" />
      </button>
      {canDelete && (
        <button
          type="button"
          onClick={() => onDelete(request.id)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted transition hover:bg-trend-down/10 hover:text-trend-down focus-visible:ring-2 focus-visible:ring-brand/40"
          aria-label="Supprimer"
        >
          <Trash2 size={14} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

function LeaveMobileCard(props: LeaveActionsProps) {
  const { request } = props;
  const duration = daysBetween(request.start_date, request.end_date);

  return (
    <article className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-ink">
            {request.profiles?.full_name ?? '—'}
          </h2>
          <p className="mt-0.5 text-caption text-muted">{TYPE_LABEL[request.type] ?? request.type}</p>
        </div>
        <Chip variant={statusVariant(request.status)} className="shrink-0">
          {STATUS_LABEL[request.status] ?? request.status}
        </Chip>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-2">
        <MobileDetail label="Début">{formatLeaveDate(request.start_date)}</MobileDetail>
        <MobileDetail label="Fin">{formatLeaveDate(request.end_date)}</MobileDetail>
        <MobileDetail label="Durée">{duration} j</MobileDetail>
        <MobileDetail label="Type">{TYPE_LABEL[request.type] ?? request.type}</MobileDetail>
      </dl>

      <div className="mt-3 flex justify-end">
        <LeaveActions {...props} />
      </div>
    </article>
  );
}

export function AdminLeaveTable({ initialRequests, employees, canDelete }: Props) {
  const [requests, setRequests] = useState<LeaveRequestListItem[]>(initialRequests);
  const [editTarget, setEditTarget] = useState<LeaveRequestListItem | 'new' | null>(null);
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

  function handleCreated(req: LeaveRequestListItem) {
    setRequests((prev) => [req, ...prev]);
    setEditTarget(null);
  }

  function handleSaved(req: LeaveRequestListItem) {
    setRequests((prev) => prev.map((r) => (r.id === req.id ? { ...r, ...req } : r)));
    setEditTarget(null);
  }

  const statusFilter = ['all', 'pending', 'approved', 'rejected', 'cancelled'] as const;
  const [filter, setFilter] = useState<string>('all');

  const visible = filter === 'all' ? requests : requests.filter((r) => r.status === filter);

  return (
    <>
      <div className="grid grid-cols-1 gap-3 md:flex md:flex-wrap md:items-center">
        <div className="flex flex-wrap gap-2">
          {statusFilter.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              className={`rounded-pill px-3 py-1.5 text-sm font-medium transition focus-visible:ring-2 focus-visible:ring-brand/40 ${
                filter === s
                  ? 'bg-brand text-white'
                  : 'bg-surface text-muted shadow-softer hover:text-ink'
              }`}
            >
              {s === 'all' ? 'Tous' : STATUS_LABEL[s]}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setEditTarget('new')}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-brand/40 md:ml-auto md:w-auto"
        >
          <Plus size={16} aria-hidden="true" />
          Assigner un congé
        </button>
      </div>

      <div className="overflow-hidden rounded-xl bg-surface shadow-softer">
        {visible.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted">Aucune demande</div>
        ) : (
          <>
            <div className="divide-y divide-soft md:hidden">
              {visible.map((request) => (
                <LeaveMobileCard
                  key={request.id}
                  request={request}
                  canDelete={canDelete}
                  actionLoading={actionLoading}
                  onReview={handleReview}
                  onEdit={setEditTarget}
                  onDelete={handleDelete}
                />
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
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
                        {formatLeaveDate(req.start_date)}
                        {' → '}
                        {formatLeaveDate(req.end_date)}
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
                        <LeaveActions
                          request={req}
                          canDelete={canDelete}
                          actionLoading={actionLoading}
                          onReview={handleReview}
                          onEdit={setEditTarget}
                          onDelete={handleDelete}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {editTarget !== null && (
        <AdminLeaveDialog
          request={editTarget === 'new' ? null : editTarget}
          employees={employees}
          onClose={() => setEditTarget(null)}
          onSuccess={editTarget === 'new' ? handleCreated : handleSaved}
        />
      )}
    </>
  );
}
