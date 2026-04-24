'use client';

import { useEffect, useState } from 'react';
import { BottomSheet } from '@/design-kit/primitives/BottomSheet';
import type { Profile } from '@/types';

export interface AttendanceFilters {
  start?: string;
  end?: string;
  user_id?: string;
  status?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  filters: AttendanceFilters;
  employees: Pick<Profile, 'id' | 'full_name' | 'work_start_time'>[];
  onApply: (next: AttendanceFilters) => void;
}

const EMPTY: AttendanceFilters = {};

export function AttendanceFiltersSheet({ open, onClose, filters, employees, onApply }: Props) {
  const [draft, setDraft] = useState<AttendanceFilters>(filters);

  useEffect(() => {
    if (open) setDraft(filters);
  }, [open, filters]);

  function apply() {
    onApply(draft);
    onClose();
  }

  function reset() {
    setDraft(EMPTY);
    onApply(EMPTY);
    onClose();
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Filtrer">
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-caption text-muted">Du</label>
            <input
              type="date"
              value={draft.start ?? ''}
              onChange={(e) => setDraft({ ...draft, start: e.target.value || undefined })}
              className="rounded-xl bg-canvas border border-soft px-3 py-2 text-sm text-ink outline-none focus:border-brand"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-caption text-muted">Au</label>
            <input
              type="date"
              value={draft.end ?? ''}
              onChange={(e) => setDraft({ ...draft, end: e.target.value || undefined })}
              className="rounded-xl bg-canvas border border-soft px-3 py-2 text-sm text-ink outline-none focus:border-brand"
            />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-caption text-muted">Employé</label>
          <select
            value={draft.user_id ?? ''}
            onChange={(e) => setDraft({ ...draft, user_id: e.target.value || undefined })}
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
            value={draft.status ?? ''}
            onChange={(e) => setDraft({ ...draft, status: e.target.value || undefined })}
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
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={reset}
            className="flex-1 px-4 py-2.5 rounded-xl bg-canvas text-ink font-medium text-sm hover:bg-soft transition"
          >
            Réinitialiser
          </button>
          <button
            type="button"
            onClick={apply}
            className="flex-1 px-4 py-2.5 rounded-xl bg-brand text-white font-semibold text-sm hover:opacity-90 transition"
          >
            Appliquer
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
