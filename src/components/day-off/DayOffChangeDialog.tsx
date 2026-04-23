'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import {
  dayOffChangeRequestSchema,
  type DayOffChangeRequestInput,
} from '@/lib/validation/day-off';
import { DAY_OFF_LABELS_FR } from '@/lib/day-off/weeks';
import type { DayOfWeek, DayOffChangeListItem } from '@/types';

const DAYS: DayOfWeek[] = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
];

interface Props {
  defaultDayOff: DayOfWeek;
  thisEffective: DayOfWeek;
  nextEffective: DayOfWeek;
  onClose: () => void;
  onSuccess: (change: DayOffChangeListItem) => void;
}

export function DayOffChangeDialog({
  defaultDayOff,
  thisEffective,
  nextEffective,
  onClose,
  onSuccess,
}: Props) {
  void defaultDayOff;
  const [target, setTarget] = useState<'this_week' | 'next_week'>('next_week');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
  } = useForm<DayOffChangeRequestInput>({
    resolver: zodResolver(dayOffChangeRequestSchema),
    defaultValues: {
      target: 'next_week',
      new_day: 'sunday',
      reason: '',
    },
  });

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    setValue('target', target);
  }, [target, setValue]);

  const disabledDay = target === 'this_week' ? thisEffective : nextEffective;

  async function onSubmit(data: DayOffChangeRequestInput) {
    const res = await fetch('/api/day-off', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error ?? 'Une erreur est survenue');
      return;
    }
    toast.success('Demande envoyée');
    onSuccess(json as DayOffChangeListItem);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-canvas rounded-2xl shadow-soft w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-soft">
          <h2 className="text-base font-semibold text-ink">Demande de changement</h2>
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
          <div className="space-y-1">
            <label className="text-caption font-medium text-muted">Semaine</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTarget('this_week')}
                className={`px-3 py-2 rounded-xl text-sm font-medium transition border ${
                  target === 'this_week'
                    ? 'bg-brand text-white border-brand'
                    : 'bg-surface text-ink border-soft hover:bg-soft'
                }`}
              >
                Cette semaine
              </button>
              <button
                type="button"
                onClick={() => setTarget('next_week')}
                className={`px-3 py-2 rounded-xl text-sm font-medium transition border ${
                  target === 'next_week'
                    ? 'bg-brand text-white border-brand'
                    : 'bg-surface text-ink border-soft hover:bg-soft'
                }`}
              >
                Semaine prochaine
              </button>
            </div>
          </div>

          <Field label="Nouveau jour de repos" error={errors.new_day?.message}>
            <select {...register('new_day')} className={inputCls}>
              {DAYS.map((d) => (
                <option key={d} value={d} disabled={d === disabledDay}>
                  {DAY_OFF_LABELS_FR[d]}
                  {d === disabledDay ? ' (actuel)' : ''}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Motif (optionnel)" error={errors.reason?.message}>
            <textarea {...register('reason')} rows={3} className={`${inputCls} resize-none`} />
          </Field>

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
              {isSubmitting ? 'Envoi…' : 'Envoyer'}
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
