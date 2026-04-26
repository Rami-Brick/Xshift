import { Download, RotateCcw } from 'lucide-react';
import type { ReactNode } from 'react';
import type { AttendanceStatus, Profile } from '@/types';

export interface ReportsFilterState {
  start: string;
  end: string;
  user_id: string;
  status: AttendanceStatus | '';
}

interface ReportsFiltersProps {
  filters: ReportsFilterState;
  employees: Pick<Profile, 'id' | 'full_name'>[];
  exportUrl: string;
  loading: boolean;
  onChange: (next: Partial<ReportsFilterState>) => void;
  onReset: () => void;
}

const STATUS_OPTIONS: Array<{ value: AttendanceStatus | ''; label: string }> = [
  { value: '', label: 'Tous' },
  { value: 'present', label: 'Present' },
  { value: 'late', label: 'En retard' },
  { value: 'absent', label: 'Absent' },
  { value: 'leave', label: 'En conge' },
  { value: 'holiday', label: 'Jour ferie' },
  { value: 'day_off', label: 'Jour de repos' },
];

export function ReportsFilters({
  filters,
  employees,
  exportUrl,
  loading,
  onChange,
  onReset,
}: ReportsFiltersProps) {
  return (
    <div className="bg-surface rounded-xl p-4 shadow-softer">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:flex-1">
          <Field label="Du">
            <input
              type="date"
              value={filters.start}
              onChange={(e) => onChange({ start: e.target.value })}
              className={inputCls}
            />
          </Field>
          <Field label="Au">
            <input
              type="date"
              value={filters.end}
              onChange={(e) => onChange({ end: e.target.value })}
              className={inputCls}
            />
          </Field>
          <Field label="Employe">
            <select
              value={filters.user_id}
              onChange={(e) => onChange({ user_id: e.target.value })}
              className={inputCls}
            >
              <option value="">Tous</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.full_name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Statut">
            <select
              value={filters.status}
              onChange={(e) => onChange({ status: e.target.value as ReportsFilterState['status'] })}
              className={inputCls}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value || 'all'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          {loading && (
            <span className="text-caption font-medium text-muted">Actualisation...</span>
          )}
          <button
            type="button"
            onClick={onReset}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-soft px-3 text-sm font-semibold text-ink transition hover:bg-subtle"
          >
            <RotateCcw size={15} />
            Reinitialiser
          </button>
          <a
            href={exportUrl}
            download
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white transition hover:opacity-90"
          >
            <Download size={16} />
            Export CSV
          </a>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="min-w-0 space-y-1">
      <span className="block text-caption font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}

const inputCls =
  'h-10 w-full rounded-xl border border-soft bg-canvas px-3 text-sm text-ink outline-none transition focus:border-brand';
