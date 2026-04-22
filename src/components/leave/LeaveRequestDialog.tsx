'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { leaveRequestSchema, type LeaveRequestInput } from '@/lib/validation/leave';
import type { LeaveRequest } from '@/types';
import { formatInTimeZone } from 'date-fns-tz';

interface Props {
  onClose: () => void;
  onSuccess: (req: LeaveRequest) => void;
}

export function LeaveRequestDialog({ onClose, onSuccess }: Props) {
  const today = formatInTimeZone(new Date(), 'Africa/Tunis', 'yyyy-MM-dd');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LeaveRequestInput>({
    resolver: zodResolver(leaveRequestSchema),
    defaultValues: {
      start_date: today,
      end_date: today,
      type: 'annual',
    },
  });

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function onSubmit(data: LeaveRequestInput) {
    const res = await fetch('/api/leave', {
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
    onSuccess(json as LeaveRequest);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-canvas rounded-2xl shadow-soft w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-soft">
          <h2 className="text-base font-semibold text-ink">Demande de congé</h2>
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
          <Field label="Type" error={errors.type?.message}>
            <select {...register('type')} className={inputCls}>
              <option value="annual">Congé annuel</option>
              <option value="sick">Maladie</option>
              <option value="unpaid">Sans solde</option>
              <option value="other">Autre</option>
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Du" error={errors.start_date?.message}>
              <input {...register('start_date')} type="date" className={inputCls} />
            </Field>
            <Field label="Au" error={errors.end_date?.message}>
              <input {...register('end_date')} type="date" className={inputCls} />
            </Field>
          </div>
          <Field label="Motif (optionnel)" error={errors.reason?.message}>
            <textarea {...register('reason')} rows={2} className={`${inputCls} resize-none`} />
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
