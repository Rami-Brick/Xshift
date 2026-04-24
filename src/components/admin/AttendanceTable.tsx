'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { Plus, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Chip } from '@/design-kit/primitives/Chip';
import { AttendanceEditDialog } from './AttendanceEditDialog';
import { formatTime, formatDate } from '@/lib/attendance/status';
import type { AttendanceListItem, Profile } from '@/types';

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

interface Filters {
  start?: string;
  end?: string;
  user_id?: string;
  status?: string;
}

interface AttendanceTableProps {
  initialRecords: AttendanceListItem[];
  employees: Pick<Profile, 'id' | 'full_name' | 'work_start_time'>[];
  initialFilters: Filters;
  gracePeriodMinutes: number;
  canDelete: boolean;
}

interface AttendanceActionProps {
  row: AttendanceListItem;
  canDelete: boolean;
  onEdit: (row: AttendanceListItem) => void;
  onDelete: (row: AttendanceListItem) => void;
}

function buildSuspectDevices(records: AttendanceListItem[]): Set<string> {
  const deviceToEmployees = new Map<string, Set<string>>();
  for (const r of records) {
    if (!r.device_id) continue;
    let set = deviceToEmployees.get(r.device_id);
    if (!set) { set = new Set(); deviceToEmployees.set(r.device_id, set); }
    set.add(r.user_id);
  }
  const suspects = new Set<string>();
  for (const [id, set] of deviceToEmployees) {
    if (set.size > 1) suspects.add(id);
  }
  return suspects;
}

function LateMinutesValue({
  minutes,
  gracePeriodMinutes,
}: {
  minutes: number | null | undefined;
  gracePeriodMinutes: number;
}) {
  const m = minutes ?? 0;
  if (m < 0) return <span className="text-trend-up">{m} min</span>;
  if (m > gracePeriodMinutes) return <span className="text-trend-down">+{m} min</span>;
  if (m > 0) return <span className="text-muted">+{m} min</span>;
  return <span className="text-muted">—</span>;
}

function MobileDetail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-xl bg-canvas px-3 py-2">
      <dt className="text-caption font-medium text-muted">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold text-ink">{children}</dd>
    </div>
  );
}

function AttendanceActions({ row, canDelete, onEdit, onDelete }: AttendanceActionProps) {
  return (
    <div className="flex items-center gap-2 justify-end">
      <button
        type="button"
        onClick={() => onEdit(row)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted transition hover:bg-soft hover:text-ink focus-visible:ring-2 focus-visible:ring-brand/40"
        aria-label="Modifier"
      >
        <Pencil size={14} aria-hidden="true" />
      </button>
      {canDelete && (
        <button
          type="button"
          onClick={() => onDelete(row)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-trend-down transition hover:bg-trend-down/10 focus-visible:ring-2 focus-visible:ring-brand/40"
          aria-label="Supprimer"
        >
          <Trash2 size={14} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

function AttendanceMobileCard({
  row,
  isSuspect,
  gracePeriodMinutes,
  canDelete,
  onEdit,
  onDelete,
}: AttendanceActionProps & {
  isSuspect: boolean;
  gracePeriodMinutes: number;
}) {
  return (
    <article className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-ink">
            {row.profiles?.full_name ?? '—'}
          </h2>
          <p className="mt-0.5 text-caption text-muted">{formatDate(row.date)}</p>
        </div>
        <Chip variant={statusVariant(row.status)} className="shrink-0">
          {STATUS_LABEL[row.status] ?? row.status}
        </Chip>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-2">
        <MobileDetail label="Arrivée">{formatTime(row.check_in_at)}</MobileDetail>
        <MobileDetail label="Départ">{formatTime(row.check_out_at)}</MobileDetail>
        <MobileDetail label="Retard">
          <LateMinutesValue
            minutes={row.late_minutes}
            gracePeriodMinutes={gracePeriodMinutes}
          />
        </MobileDetail>
        <MobileDetail label="Date">{formatDate(row.date)}</MobileDetail>
      </dl>

      {(row.forgot_checkout || row.device_label) && (
        <div className="mt-3 space-y-2 text-caption">
          {row.forgot_checkout && (
            <p className="rounded-xl bg-trend-down/10 px-3 py-2 font-medium text-trend-down">
              Oubli de départ
            </p>
          )}
          {row.device_label && (
            <p
              className={cnDeviceMessage(isSuspect)}
              title={isSuspect ? 'Appareil partagé — fraude possible' : undefined}
            >
              {isSuspect && <AlertTriangle size={14} aria-hidden="true" />}
              <span className="min-w-0 truncate">{row.device_label}</span>
            </p>
          )}
        </div>
      )}

      <div className="mt-3 flex justify-end">
        <AttendanceActions
          row={row}
          canDelete={canDelete}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </div>
    </article>
  );
}

function cnDeviceMessage(isSuspect: boolean) {
  return [
    'flex items-center gap-2 rounded-xl px-3 py-2 font-medium',
    isSuspect ? 'bg-accent-star/15 text-amber-700' : 'bg-canvas text-muted',
  ].join(' ');
}

export function AttendanceTable({ initialRecords, employees, initialFilters, gracePeriodMinutes, canDelete }: AttendanceTableProps) {
  const [records, setRecords] = useState<AttendanceListItem[]>(initialRecords);
  const suspectDevices = useMemo(() => buildSuspectDevices(records), [records]);
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [loading, setLoading] = useState(false);
  const [editTarget, setEditTarget] = useState<AttendanceListItem | 'new' | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AttendanceListItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  async function applyFilters(next: Filters) {
    setFilters(next);
    setLoading(true);
    const params = new URLSearchParams();
    if (next.start) params.set('start', next.start);
    if (next.end) params.set('end', next.end);
    if (next.user_id) params.set('user_id', next.user_id);
    if (next.status) params.set('status', next.status);

    const res = await fetch(`/api/attendance/all?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setRecords(data);
    }
    setLoading(false);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    const res = await fetch(`/api/attendance/${deleteTarget.id}`, { method: 'DELETE' });
    const json = await res.json();
    setDeleteLoading(false);
    if (!res.ok) {
      toast.error(json.error ?? 'Erreur lors de la suppression');
      return;
    }
    toast.success('Entrée supprimée');
    setRecords((prev) => prev.filter((r) => r.id !== deleteTarget.id));
    setDeleteTarget(null);
  }

  function handleSaved(saved: AttendanceListItem) {
    setRecords((prev) => {
      const idx = prev.findIndex((r) => r.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [saved, ...prev].sort((a, b) => b.date.localeCompare(a.date));
    });
    setEditTarget(null);
  }

  return (
    <>
      {/* Filters */}
      <div className="grid grid-cols-1 gap-3 rounded-xl bg-surface p-4 shadow-softer sm:grid-cols-2 md:flex md:flex-wrap">
        <div className="flex min-w-0 flex-col gap-1">
          <label className="text-caption text-muted">Du</label>
          <input
            type="date"
            value={filters.start ?? ''}
            onChange={(e) => applyFilters({ ...filters, start: e.target.value })}
            className="w-full rounded-xl bg-canvas border border-soft px-3 py-2 text-sm text-ink outline-none transition focus:border-brand focus-visible:ring-2 focus-visible:ring-brand/40"
          />
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <label className="text-caption text-muted">Au</label>
          <input
            type="date"
            value={filters.end ?? ''}
            onChange={(e) => applyFilters({ ...filters, end: e.target.value })}
            className="w-full rounded-xl bg-canvas border border-soft px-3 py-2 text-sm text-ink outline-none transition focus:border-brand focus-visible:ring-2 focus-visible:ring-brand/40"
          />
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <label className="text-caption text-muted">Employé</label>
          <select
            value={filters.user_id ?? ''}
            onChange={(e) => applyFilters({ ...filters, user_id: e.target.value || undefined })}
            className="w-full rounded-xl bg-canvas border border-soft px-3 py-2 text-sm text-ink outline-none transition focus:border-brand focus-visible:ring-2 focus-visible:ring-brand/40"
          >
            <option value="">Tous</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>{e.full_name}</option>
            ))}
          </select>
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <label className="text-caption text-muted">Statut</label>
          <select
            value={filters.status ?? ''}
            onChange={(e) => applyFilters({ ...filters, status: e.target.value || undefined })}
            className="w-full rounded-xl bg-canvas border border-soft px-3 py-2 text-sm text-ink outline-none transition focus:border-brand focus-visible:ring-2 focus-visible:ring-brand/40"
          >
            <option value="">Tous</option>
            <option value="present">Présent</option>
            <option value="late">En retard</option>
            <option value="absent">Absent</option>
            <option value="leave">En congé</option>
            <option value="holiday">Jour férié</option>
          </select>
        </div>
        <div className="flex items-end md:ml-auto">
          <button
            type="button"
            onClick={() => setEditTarget('new')}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-brand/40 md:w-auto"
          >
            <Plus size={16} aria-hidden="true" />
            Ajouter
          </button>
        </div>
      </div>

      {/* Table/list */}
      <div className="overflow-hidden rounded-xl bg-surface shadow-softer">
        {loading ? (
          <div className="p-8 text-center text-sm text-muted">Chargement…</div>
        ) : records.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted">Aucune présence pour cette période</div>
        ) : (
          <>
            <div className="divide-y divide-soft md:hidden">
              {records.map((row) => (
                <AttendanceMobileCard
                  key={row.id}
                  row={row}
                  isSuspect={!!row.device_id && suspectDevices.has(row.device_id)}
                  gracePeriodMinutes={gracePeriodMinutes}
                  canDelete={canDelete}
                  onEdit={setEditTarget}
                  onDelete={setDeleteTarget}
                />
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-soft text-left">
                    <th className="px-4 py-3 text-caption font-semibold text-muted uppercase tracking-wide">Date</th>
                    <th className="px-4 py-3 text-caption font-semibold text-muted uppercase tracking-wide">Employé</th>
                    <th className="px-4 py-3 text-caption font-semibold text-muted uppercase tracking-wide">Arrivée</th>
                    <th className="px-4 py-3 text-caption font-semibold text-muted uppercase tracking-wide">Départ</th>
                    <th className="px-4 py-3 text-caption font-semibold text-muted uppercase tracking-wide">Statut</th>
                    <th className="px-4 py-3 text-caption font-semibold text-muted uppercase tracking-wide">Retard</th>
                    <th className="px-4 py-3 text-caption font-semibold text-muted uppercase tracking-wide">Appareil</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {records.map((row) => {
                    const isSuspect = !!row.device_id && suspectDevices.has(row.device_id);
                    return (
                      <tr key={row.id} className="border-b border-soft last:border-0 hover:bg-canvas/50 transition">
                        <td className="px-4 py-3 font-medium text-ink whitespace-nowrap">{formatDate(row.date)}</td>
                        <td className="px-4 py-3 text-ink whitespace-nowrap">
                          {row.profiles?.full_name ?? '—'}
                          {row.forgot_checkout && (
                            <span className="ml-2 text-caption text-trend-down">Oubli</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted whitespace-nowrap">{formatTime(row.check_in_at)}</td>
                        <td className="px-4 py-3 text-muted whitespace-nowrap">{formatTime(row.check_out_at)}</td>
                        <td className="px-4 py-3">
                          <Chip variant={statusVariant(row.status)}>
                            {STATUS_LABEL[row.status] ?? row.status}
                          </Chip>
                        </td>
                        <td className="px-4 py-3 text-muted">
                          <LateMinutesValue
                            minutes={row.late_minutes}
                            gracePeriodMinutes={gracePeriodMinutes}
                          />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {row.device_label ? (
                            <span
                              className={isSuspect ? 'text-amber-600 font-medium text-xs' : 'text-muted text-xs'}
                              title={isSuspect ? 'Appareil partagé — fraude possible' : undefined}
                            >
                              {row.device_label}{isSuspect && ' !'}
                            </span>
                          ) : (
                            <span className="text-muted text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <AttendanceActions
                            row={row}
                            canDelete={canDelete}
                            onEdit={setEditTarget}
                            onDelete={setDeleteTarget}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {editTarget !== null && (
        <AttendanceEditDialog
          record={editTarget === 'new' ? null : editTarget}
          employees={employees}
          gracePeriodMinutes={gracePeriodMinutes}
          onClose={() => setEditTarget(null)}
          onSuccess={handleSaved}
        />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-canvas rounded-2xl shadow-soft w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-trend-down/10 flex items-center justify-center">
                <AlertTriangle size={18} className="text-trend-down" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-ink">Supprimer cette présence ?</h2>
                <p className="text-caption text-muted mt-0.5">
                  {deleteTarget.profiles?.full_name ?? '—'} · {formatDate(deleteTarget.date)}
                </p>
              </div>
            </div>
            <p className="text-sm text-muted">Cette action est irréversible.</p>
            <div className="flex justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleteLoading}
                className="px-4 py-2 rounded-xl text-sm font-medium text-muted hover:text-ink hover:bg-soft transition focus-visible:ring-2 focus-visible:ring-brand/40"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleteLoading}
                className="px-5 py-2 rounded-xl bg-trend-down text-white font-semibold text-sm hover:opacity-90 transition disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-brand/40"
              >
                {deleteLoading ? 'Suppression…' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
