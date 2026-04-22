'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { adminLeaveSchema, type AdminLeaveInput } from '@/lib/validation/leave';
import type { LeaveRequest, Profile } from '@/types';
import { formatInTimeZone } from 'date-fns-tz';

type LeaveWithProfile = LeaveRequest & {
  profiles?: Pick<Profile, 'id' | 'full_name' | 'email'>;
};

interface Props {
  employees: Pick<Profile, 'id' | 'full_name'>[];
  onClose: () => void;
  onSuccess: (req: LeaveWithProfile) => void;
}

export function AdminLeaveDialog({ employees, onClose, onSuccess }: Props) {
  const today = formatInTimeZone(new Date(), 'Africa/Tunis', 'yyyy-MM-dd');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AdminLeaveInput>({
    resolver: zodResolver(adminLeaveSchema),
    defaultValues: {
      start_date: today,
      end_date: today,
      type: 'annual',
      status: 'approved',
      deduct_balance: true,
    },
  });

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function onSubmit(data: AdminLeaveInput) {
    const res = await fetch('/api/leave/all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error ?? 'Une erreur est survenue');
      return;
    }
    toast.success('Congé assigné');
    onSuccess(json as LeaveWithProfile);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-canvas rounded-2xl shadow-soft w-full max-w-md overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b border-soft">
          <h2 className="text-base font-semibold text-ink">Assigner un congé</h2>
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
            <select {...register('user_id')} className={inputCls}>
              <option value="">Choisir…</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.full_name}</option>
              ))}
            </select>
          </Field>

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

          <Field label="Statut" error={errors.status?.message}>
            <select {...register('status')} className={inputCls}>
              <option value="approved">Approuvé</option>
              <option value="pending">En attente</option>
            </select>
          </Field>

          <Field label="Note admin" error={errors.admin_note?.message}>
            <textarea {...register('admin_note')} rows={2} className={`${inputCls} resize-none`} />
          </Field>

          <label className="flex items-center gap-2 cursor-pointer">
            <input {...register('deduct_balance')} type="checkbox" className="rounded" />
            <span className="text-sm text-ink">Déduire du solde de congés</span>
          </label>

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
              {isSubmitting ? 'Assignation…' : 'Assigner'}
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
