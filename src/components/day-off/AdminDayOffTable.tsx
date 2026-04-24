'use client';

import { useState } from 'react';
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
          onClick={() => setEditTarget('new')}
          className="ml-auto inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand text-white font-semibold text-sm hover:opacity-90 transition"
        >
          <Plus size={16} />
          Assigner
        </button>
      </div>

      <div className="bg-surface rounded-xl shadow-softer overflow-hidden">
        {visible.length === 0 ? (
          <div className="p-8 text-center text-muted text-sm">Aucun changement</div>
        ) : (
          <>
          {/* Mobile card list */}
          <div className="md:hidden divide-y divide-soft">
            {visible.map((c) => (
              <div key={c.id} className="px-4 py-3 flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-ink text-sm leading-tight">
                    {c.profiles?.full_name ?? '—'}
                  </span>
                  <Chip variant={statusVariant(c.status)}>
                    {STATUS_LABEL[c.status] ?? c.status}
                  </Chip>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted">
                  <span>S{c.iso_week} / {c.iso_year}</span>
                  <span>·</span>
                  <span>{DAY_OFF_LABELS_FR[c.old_day]} → {DAY_OFF_LABELS_FR[c.new_day]}</span>
                </div>
                {c.reason && (
                  <span className="text-xs text-muted truncate">{c.reason}</span>
                )}
                <div className="flex items-center justify-end gap-1.5 mt-0.5">
                  {c.status === 'pending' && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleReview(c.id, 'approved')}
                        disabled={actionLoading === c.id + 'approved'}
                        className="p-2 rounded-lg text-trend-up hover:bg-trend-up/10 transition disabled:opacity-40"
                        aria-label="Approuver"
                      >
                        <Check size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReview(c.id, 'rejected')}
                        disabled={actionLoading === c.id + 'rejected'}
                        className="p-2 rounded-lg text-trend-down hover:bg-trend-down/10 transition disabled:opacity-40"
                        aria-label="Refuser"
                      >
                        <XIcon size={16} />
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => setEditTarget(c)}
                    className="p-2 rounded-lg text-muted hover:text-ink hover:bg-soft transition"
                    aria-label="Modifier"
                  >
                    <Pencil size={15} />
                  </button>
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => handleDelete(c.id)}
                      className="p-2 rounded-lg text-muted hover:text-trend-down hover:bg-trend-down/10 transition"
                      aria-label="Supprimer"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
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
                      <div className="flex items-center gap-2 justify-end">
                        {c.status === 'pending' && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleReview(c.id, 'approved')}
                              disabled={actionLoading === c.id + 'approved'}
                              className="p-1.5 rounded-lg text-trend-up hover:bg-trend-up/10 transition disabled:opacity-40"
                              aria-label="Approuver"
                            >
                              <Check size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReview(c.id, 'rejected')}
                              disabled={actionLoading === c.id + 'rejected'}
                              className="p-1.5 rounded-lg text-trend-down hover:bg-trend-down/10 transition disabled:opacity-40"
                              aria-label="Refuser"
                            >
                              <XIcon size={16} />
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => setEditTarget(c)}
                          className="p-1.5 rounded-lg text-muted hover:text-ink hover:bg-soft transition"
                          aria-label="Modifier"
                        >
                          <Pencil size={14} />
                        </button>
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => handleDelete(c.id)}
                            className="p-1.5 rounded-lg text-muted hover:text-trend-down hover:bg-trend-down/10 transition"
                            aria-label="Supprimer"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
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
