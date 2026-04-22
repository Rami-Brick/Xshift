'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Chip } from '@/design-kit/primitives/Chip';
import { AttendanceEditDialog } from './AttendanceEditDialog';
import { formatTime, formatDate } from '@/lib/attendance/status';
import type { Attendance, Profile } from '@/types';

type AttendanceWithProfile = Attendance & {
  profiles?: Pick<Profile, 'id' | 'full_name' | 'email'>;
};

const STATUS_LABEL: Record<string, string> = {
  present: 'Présent',
  late: 'En retard',
  absent: 'Absent',
  leave: 'En congé',
  holiday: 'Jour férié',
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
  initialRecords: AttendanceWithProfile[];
  employees: Pick<Profile, 'id' | 'full_name'>[];
  initialFilters: Filters;
}

export function AttendanceTable({ initialRecords, employees, initialFilters }: AttendanceTableProps) {
  const [records, setRecords] = useState<AttendanceWithProfile[]>(initialRecords);
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [loading, setLoading] = useState(false);
  const [editTarget, setEditTarget] = useState<AttendanceWithProfile | 'new' | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();

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

  async function handleDelete(id: string) {
    if (deletingId !== id) {
      setDeletingId(id);
      return;
    }
    const res = await fetch(`/api/attendance/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error ?? 'Erreur lors de la suppression');
      setDeletingId(null);
      return;
    }
    toast.success('Entrée supprimée');
    setRecords((prev) => prev.filter((r) => r.id !== id));
    setDeletingId(null);
  }

  function handleSaved(saved: AttendanceWithProfile) {
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
    router.refresh();
  }

  return (
    <>
      {/* Filters */}
      <div className="flex flex-wrap gap-3 bg-surface rounded-xl p-4 shadow-softer">
        <div className="flex flex-col gap-1">
          <label className="text-caption text-muted">Du</label>
          <input
            type="date"
            value={filters.start ?? ''}
            onChange={(e) => applyFilters({ ...filters, start: e.target.value })}
            className="rounded-xl bg-canvas border border-soft px-3 py-2 text-sm text-ink outline-none focus:border-brand"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-caption text-muted">Au</label>
          <input
            type="date"
            value={filters.end ?? ''}
            onChange={(e) => applyFilters({ ...filters, end: e.target.value })}
            className="rounded-xl bg-canvas border border-soft px-3 py-2 text-sm text-ink outline-none focus:border-brand"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-caption text-muted">Employé</label>
          <select
            value={filters.user_id ?? ''}
            onChange={(e) => applyFilters({ ...filters, user_id: e.target.value || undefined })}
            className="rounded-xl bg-canvas border border-soft px-3 py-2 text-sm text-ink outline-none focus:border-brand"
          >
            <option value="">Tous</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>{e.full_name}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-caption text-muted">Statut</label>
          <select
            value={filters.status ?? ''}
            onChange={(e) => applyFilters({ ...filters, status: e.target.value || undefined })}
            className="rounded-xl bg-canvas border border-soft px-3 py-2 text-sm text-ink outline-none focus:border-brand"
          >
            <option value="">Tous</option>
            <option value="present">Présent</option>
            <option value="late">En retard</option>
            <option value="absent">Absent</option>
            <option value="leave">En congé</option>
            <option value="holiday">Jour férié</option>
          </select>
        </div>
        <div className="flex items-end ml-auto">
          <button
            type="button"
            onClick={() => setEditTarget('new')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand text-white font-semibold text-sm hover:opacity-90 transition"
          >
            <Plus size={16} />
            Ajouter
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface rounded-xl shadow-softer overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted text-sm">Chargement…</div>
        ) : records.length === 0 ? (
          <div className="p-8 text-center text-muted text-sm">Aucune présence pour cette période</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-soft text-left">
                  <th className="px-4 py-3 text-caption font-semibold text-muted uppercase tracking-wide">Date</th>
                  <th className="px-4 py-3 text-caption font-semibold text-muted uppercase tracking-wide">Employé</th>
                  <th className="px-4 py-3 text-caption font-semibold text-muted uppercase tracking-wide">Arrivée</th>
                  <th className="px-4 py-3 text-caption font-semibold text-muted uppercase tracking-wide">Départ</th>
                  <th className="px-4 py-3 text-caption font-semibold text-muted uppercase tracking-wide">Statut</th>
                  <th className="px-4 py-3 text-caption font-semibold text-muted uppercase tracking-wide">Retard</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {records.map((row) => (
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
                      {(row.late_minutes ?? 0) > 0 ? `+${row.late_minutes} min` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => setEditTarget(row)}
                          className="p-1.5 rounded-lg text-muted hover:text-ink hover:bg-soft transition"
                          aria-label="Modifier"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(row.id)}
                          className={`p-1.5 rounded-lg transition ${
                            deletingId === row.id
                              ? 'bg-trend-down text-white'
                              : 'text-trend-down hover:bg-trend-down/10'
                          }`}
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

      {editTarget !== null && (
        <AttendanceEditDialog
          record={editTarget === 'new' ? null : editTarget}
          employees={employees}
          onClose={() => setEditTarget(null)}
          onSuccess={handleSaved}
        />
      )}
    </>
  );
}
