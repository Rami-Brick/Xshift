'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { createEmployeeSchema, updateEmployeeSchema, type CreateEmployeeInput } from '@/lib/validation/employee';
import type { Profile } from '@/types';

interface CreateProps {
  employee?: undefined;
  onClose: () => void;
  onSuccess: (profile: Profile) => void;
}

interface EditProps {
  employee: Profile;
  onClose: () => void;
  onSuccess: (profile: Profile) => void;
}

type Props = CreateProps | EditProps;

type FormInput = CreateEmployeeInput & { is_active?: boolean };

export function EmployeeFormDialog({ employee, onClose, onSuccess }: Props) {
  const isEdit = !!employee;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormInput>({
    resolver: zodResolver(isEdit ? updateEmployeeSchema : createEmployeeSchema) as never,
    defaultValues: isEdit
      ? {
          full_name: employee.full_name,
          phone: employee.phone ?? '',
          work_start_time: employee.work_start_time.slice(0, 5),
          work_end_time: employee.work_end_time.slice(0, 5),
          leave_balance: employee.leave_balance,
          role: employee.role,
          default_day_off: employee.default_day_off,
          is_active: employee.is_active,
        }
      : {
          work_start_time: '08:30',
          work_end_time: '17:30',
          leave_balance: 0,
          role: 'employee',
          default_day_off: 'saturday',
        },
  });

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function onSubmit(data: FormInput) {
    const url = isEdit ? `/api/employees/${employee.id}` : '/api/employees';
    const method = isEdit ? 'PATCH' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const json = await res.json();

    if (!res.ok) {
      toast.error(json.error ?? 'Une erreur est survenue');
      return;
    }

    toast.success(isEdit ? 'Employé mis à jour' : 'Employé créé avec succès');
    onSuccess(json as Profile);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-canvas rounded-2xl shadow-soft w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-soft">
          <h2 className="text-base font-semibold text-ink">
            {isEdit ? 'Modifier l\'employé' : 'Nouvel employé'}
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
          {/* Full name */}
          <Field label="Nom complet" error={errors.full_name?.message}>
            <input {...register('full_name')} className={inputCls} placeholder="Prénom Nom" />
          </Field>

          {/* Email — only on create */}
          {!isEdit && (
            <Field label="Email" error={(errors as Record<string, { message?: string }>).email?.message}>
              <input {...register('email')} type="email" className={inputCls} placeholder="email@exemple.com" />
            </Field>
          )}

          {/* Password — only on create */}
          {!isEdit && (
            <Field label="Mot de passe temporaire" error={(errors as Record<string, { message?: string }>).password?.message}>
              <input {...register('password')} type="password" className={inputCls} placeholder="••••••" />
            </Field>
          )}

          <Field label="Téléphone" error={errors.phone?.message}>
            <input {...register('phone')} className={inputCls} placeholder="+216 XX XXX XXX" />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Heure d'arrivée" error={errors.work_start_time?.message}>
              <input {...register('work_start_time')} type="time" className={inputCls} />
            </Field>
            <Field label="Heure de départ" error={errors.work_end_time?.message}>
              <input {...register('work_end_time')} type="time" className={inputCls} />
            </Field>
          </div>

          <Field label="Jour de repos par défaut" error={errors.default_day_off?.message}>
            <select {...register('default_day_off')} className={inputCls}>
              <option value="monday">Lundi</option>
              <option value="tuesday">Mardi</option>
              <option value="wednesday">Mercredi</option>
              <option value="thursday">Jeudi</option>
              <option value="friday">Vendredi</option>
              <option value="saturday">Samedi</option>
              <option value="sunday">Dimanche</option>
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Solde congés (j)" error={errors.leave_balance?.message}>
              <input {...register('leave_balance')} type="number" min={0} className={inputCls} />
            </Field>
            <Field label="Rôle" error={errors.role?.message}>
              <select {...register('role')} className={inputCls}>
                <option value="employee">Employé</option>
                <option value="admin">Admin</option>
              </select>
            </Field>
          </div>

          {isEdit && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input {...register('is_active')} type="checkbox" className="rounded" />
              <span className="text-sm text-ink">Compte actif</span>
            </label>
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
              {isSubmitting ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Créer'}
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
