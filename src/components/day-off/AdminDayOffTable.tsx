'use client';

import { useState, type ReactNode } from 'react';
import { Plus, Check, Pencil, X as XIcon, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Chip } from '@/design-kit/primitives/Chip';
import { AdminDayOffDialog } from './AdminDayOffDialog';
import { DAY_OFF_LABELS_FR } from '@/lib/day-off/weeks';
import type { DayOffChangeListItem, Profile } from '@/types';

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
  initialChanges: DayOffChangeListItem[];
  employees: Pick<Profile, 'id' | 'full_name' | 'default_day_off'>[];
  canDelete: boolean;
}

interface DayOffActionsProps {
  change: DayOffChangeListItem;
  canDelete: boolean;
  actionLoading: string | null;
  onReview: (id: string, status: 'approved' | 'rejected') => void;
  onEdit: (change: DayOffChangeListItem) => void;
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

function DayOffActions({
  change,
  canDelete,
  actionLoading,
  onReview,
  onEdit,
  onDelete,
}: DayOffActionsProps) {
  return (
    <div className="flex items-center gap-2 justify-end">
      {change.status === 'pending' && (
        <>
          <button
            type="button"
            onClick={() => onReview(change.id, 'approved')}
            disabled={actionLoading === change.id + 'approved'}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-trend-up transition hover:bg-trend-up/10 disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-brand/40"
            aria-label="Approuver"
          >
            <Check size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onReview(change.id, 'rejected')}
            disabled={actionLoading === change.id + 'rejected'}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-trend-down transition hover:bg-trend-down/10 disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-brand/40"
            aria-label="Refuser"
          >
            <XIcon size={16} aria-hidden="true" />
          </button>
        </>
      )}
      <button
        type="button"
        onClick={() => onEdit(change)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted transition hover:bg-soft hover:text-ink focus-visible:ring-2 focus-visible:ring-brand/40"
        aria-label="Modifier"
      >
        <Pencil size={14} aria-hidden="true" />
      </button>
      {canDelete && (
        <button
          type="button"
          onClick={() => onDelete(change.id)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted transition hover:bg-trend-down/10 hover:text-trend-down focus-visible:ring-2 focus-visible:ring-brand/40"
          aria-label="Supprimer"
        >
          <Trash2 size={14} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

function DayOffMobileCard(props: DayOffActionsProps) {
  const { change } = props;

  return (
    <article className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-ink">
            {change.profiles?.full_name ?? '—'}
          </h2>
          <p className="mt-0.5 text-caption text-muted">
            S{change.iso_week} / {change.iso_year}
          </p>
        </div>
        <Chip variant={statusVariant(change.status)} className="shrink-0">
          {STATUS_LABEL[change.status] ?? change.status}
        </Chip>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-2">
        <MobileDetail label="Semaine">
          S{change.iso_week} / {change.iso_year}
        </MobileDetail>
        <MobileDetail label="Changement">
          {DAY_OFF_LABELS_FR[change.old_day]} → {DAY_OFF_LABELS_FR[change.new_day]}
        </MobileDetail>
      </dl>

      <div className="mt-3 rounded-xl bg-canvas px-3 py-2">
        <p className="text-caption font-medium text-muted">Raison</p>
        <p className="mt-0.5 break-words text-sm font-semibold text-ink">
          {change.reason ?? '—'}
        </p>
      </div>

      <div className="mt-3 flex justify-end">
        <DayOffActions {...props} />
      </div>
    </article>
  );
}

export function AdminDayOffTable({ initialChanges, employees, canDelete }: Props) {
  const [changes, setChanges] = useState<DayOffChangeListItem[]>(initialChanges);
  const [editTarget, setEditTarget] = useState<DayOffChangeListItem | 'new' | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  async function handleReview(id: string, status: 'approved' | 'rejected') {
    setActionLoading(id + status);
    const res = await fetch(`/api/day-off/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error ?? 'Erreur');
      setActionLoading(null);
      return;
    }
    toast.success(status === 'approved' ? 'Changement approuvé' : 'Changement refusé');
    setChanges((prev) => prev.map((c) => (c.id === id ? { ...c, ...json } : c)));
    setActionLoading(null);
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/day-off/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error ?? 'Erreur');
      return;
    }
    toast.success('Changement supprimé');
    setChanges((prev) => prev.filter((c) => c.id !== id));
  }

  function handleCreated(change: DayOffChangeListItem) {
    setChanges((prev) => [change, ...prev]);
    setEditTarget(null);
  }

  function handleSaved(change: DayOffChangeListItem) {
    setChanges((prev) => prev.map((c) => (c.id === change.id ? { ...c, ...change } : c)));
    setEditTarget(null);
  }

  const statusFilter = ['all', 'pending', 'approved', 'rejected', 'cancelled'] as const;
  const [filter, setFilter] = useState<string>('all');
  const visible = filter === 'all' ? changes : changes.filter((c) => c.status === filter);

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
          Assigner
        </button>
      </div>

      <div className="overflow-hidden rounded-xl bg-surface shadow-softer">
        {visible.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted">Aucun changement</div>
        ) : (
          <>
            <div className="divide-y divide-soft md:hidden">
              {visible.map((change) => (
                <DayOffMobileCard
                  key={change.id}
                  change={change}
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
                    <th className="px-4 py-3 text-caption font-semibold text-muted uppercase tracking-wide">
                      Employé
                    </th>
                    <th className="px-4 py-3 text-caption font-semibold text-muted uppercase tracking-wide">
                      Semaine
                    </th>
                    <th className="px-4 py-3 text-caption font-semibold text-muted uppercase tracking-wide">
                      Ancien → Nouveau
                    </th>
                    <th className="px-4 py-3 text-caption font-semibold text-muted uppercase tracking-wide">
                      Raison
                    </th>
                    <th className="px-4 py-3 text-caption font-semibold text-muted uppercase tracking-wide">
                      Statut
                    </th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {visible.map((c) => (
                    <tr
                      key={c.id}
                      className="border-b border-soft last:border-0 hover:bg-canvas/50 transition"
                    >
                      <td className="px-4 py-3 font-medium text-ink whitespace-nowrap">
                        {c.profiles?.full_name ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-muted whitespace-nowrap">
                        S{c.iso_week} / {c.iso_year}
                      </td>
                      <td className="px-4 py-3 text-muted whitespace-nowrap">
                        {DAY_OFF_LABELS_FR[c.old_day]} → {DAY_OFF_LABELS_FR[c.new_day]}
                      </td>
                      <td className="px-4 py-3 text-muted max-w-xs truncate" title={c.reason ?? ''}>
                        {c.reason ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Chip variant={statusVariant(c.status)}>
                          {STATUS_LABEL[c.status] ?? c.status}
                        </Chip>
                      </td>
                      <td className="px-4 py-3">
                        <DayOffActions
                          change={c}
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
        <AdminDayOffDialog
          change={editTarget === 'new' ? null : editTarget}
          employees={employees}
          onClose={() => setEditTarget(null)}
          onSuccess={editTarget === 'new' ? handleCreated : handleSaved}
        />
      )}
    </>
  );
}
