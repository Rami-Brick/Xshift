'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { DAY_OFF_LABELS_FR } from '@/lib/day-off/weeks';
import type { DayOffChangeListItem, DayOfWeek, Profile, DayOffChangeStatus } from '@/types';

const DAYS: DayOfWeek[] = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
];

type FormData = {
  user_id: string;
  iso_year: number;
  iso_week: number;
  new_day: DayOfWeek;
  status: DayOffChangeStatus;
  admin_note: string;
  reason: string;
  target: 'this_week' | 'next_week' | 'manual';
};

interface Props {
  change: DayOffChangeListItem | null;
  employees: Pick<Profile, 'id' | 'full_name' | 'default_day_off'>[];
  onClose: () => void;
  onSuccess: (change: DayOffChangeListItem) => void;
}

export function AdminDayOffDialog({ change, employees, onClose, onSuccess }: Props) {
  const isEdit = !!change;

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    defaultValues: isEdit
      ? {
          user_id: change.user_id,
          iso_year: change.iso_year,
          iso_week: change.iso_week,
          new_day: change.new_day,
          status: change.status,
          admin_note: change.admin_note ?? '',
          reason: change.reason ?? '',
          target: 'manual',
        }
      : {
          user_id: '',
          iso_year: 0,
          iso_week: 0,
          new_day: 'sunday',
          status: 'approved',
          admin_note: '',
          reason: '',
          target: 'next_week',
        },
  });

  const target = watch('target');

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const [error, setError] = useState<string | null>(null);

  async function onSubmit(data: FormData) {
    setError(null);

    if (isEdit) {
      const body: Record<string, unknown> = {
        user_id: data.user_id,
        new_day: data.new_day,
        status: data.status,
        admin_note: data.admin_note || null,
        reason: data.reason || null,
      };
      if (data.target === 'manual') {
        body.iso_year = Number(data.iso_year);
        body.iso_week = Number(data.iso_week);
      }
      const res = await fetch(`/api/day-off/${change.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? 'Une erreur est survenue');
        setError(json.error ?? null);
        return;
      }
      toast.success('Changement mis à jour');
      onSuccess(json as DayOffChangeListItem);
      return;
    }

    if (!data.user_id) {
      toast.error('Sélectionnez un employé');
      return;
    }

    const body: Record<string, unknown> = {
      user_id: data.user_id,
      new_day: data.new_day,
      status: data.status,
      admin_note: data.admin_note || null,
      reason: data.reason || null,
      target:
        data.target === 'manual'
          ? { iso_year: Number(data.iso_year), iso_week: Number(data.iso_week) }
          : data.target,
    };

    const res = await fetch('/api/day-off/all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error ?? 'Une erreur est survenue');
      setError(json.error ?? null);
      return;
    }
    toast.success('Changement assigné');
    onSuccess(json as DayOffChangeListItem);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-canvas rounded-2xl shadow-soft w-full max-w-md overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b border-soft">
          <h2 className="text-base font-semibold text-ink">
            {isEdit ? 'Modifier le changement' : 'Assigner un changement'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted hover:text-ink hover:bg-soft transition"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <Field label="Employé" error={errors.user_id?.message}>
            <select {...register('user_id')} className={inputCls} disabled={isEdit}>
              <option value="">Choisir…</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.full_name}
                  {e.default_day_off ? ` (par défaut: ${DAY_OFF_LABELS_FR[e.default_day_off]})` : ''}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Semaine cible">
            <select {...register('target')} className={inputCls}>
              <option value="this_week">Cette semaine</option>
              <option value="next_week">Semaine prochaine</option>
              <option value="manual">Saisie manuelle</option>
            </select>
          </Field>

          {target === 'manual' && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Année ISO" error={errors.iso_year?.message}>
                <input
                  {...register('iso_year', { valueAsNumber: true })}
                  type="number"
                  className={inputCls}
                />
              </Field>
              <Field label="Semaine ISO" error={errors.iso_week?.message}>
                <input
                  {...register('iso_week', { valueAsNumber: true })}
                  type="number"
                  min={1}
                  max={53}
                  className={inputCls}
                />
              </Field>
            </div>
          )}

          <Field label="Nouveau jour" error={errors.new_day?.message}>
            <select {...register('new_day')} className={inputCls}>
              {DAYS.map((d) => (
                <option key={d} value={d}>{DAY_OFF_LABELS_FR[d]}</option>
              ))}
            </select>
          </Field>

          <Field label="Statut" error={errors.status?.message}>
            <select {...register('status')} className={inputCls}>
              <option value="pending">En attente</option>
              <option value="approved">Approuvé</option>
              <option value="rejected">Refusé</option>
              <option value="cancelled">Annulé</option>
            </select>
          </Field>

          <Field label="Motif" error={errors.reason?.message}>
            <textarea {...register('reason')} rows={2} className={`${inputCls} resize-none`} />
          </Field>

          <Field label="Note admin" error={errors.admin_note?.message}>
            <textarea {...register('admin_note')} rows={2} className={`${inputCls} resize-none`} />
          </Field>

          {error && (
            <p className="text-caption text-trend-down">{error}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-muted hover:text-ink hover:bg-soft transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-brand text-white font-semibold text-sm hover:opacity-90 transition disabled:opacity-60"
            >
              {isSubmitting ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Assigner'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputCls =
  'w-full rounded-xl bg-surface border border-soft px-3 py-2 text-sm text-ink placeholder:text-muted outline-none focus:border-brand transition';

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="text-caption font-medium text-muted">{label}</label>
      {children}
      {error && <p className="text-caption text-trend-down">{error}</p>}
    </div>
  );
}
