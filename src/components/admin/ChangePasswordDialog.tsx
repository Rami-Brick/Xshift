'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import { toast } from 'sonner';

const schema = z
  .object({
    password: z.string().min(4, 'Mot de passe requis (min. 4 caractères)'),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirm'],
  });

type FormInput = z.infer<typeof schema>;

interface Props {
  employeeId: string;
  employeeName: string;
  onClose: () => void;
}

export function ChangePasswordDialog({ employeeId, employeeName, onClose }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormInput>({ resolver: zodResolver(schema) });

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function onSubmit(data: FormInput) {
    const res = await fetch(`/api/employees/${employeeId}/password`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: data.password }),
    });

    const json = await res.json();

    if (!res.ok) {
      toast.error(json.error ?? 'Une erreur est survenue');
      return;
    }

    toast.success('Mot de passe mis à jour');
    onClose();
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
          <div>
            <h2 className="text-base font-semibold text-ink">Changer le mot de passe</h2>
            <p className="text-caption text-muted mt-0.5">{employeeName}</p>
          </div>
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
            <label className="text-caption font-medium text-muted">Nouveau mot de passe</label>
            <input
              {...register('password')}
              type="password"
              className={inputCls}
              placeholder="••••••"
              autoFocus
            />
            {errors.password && <p className="text-caption text-trend-down">{errors.password.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-caption font-medium text-muted">Confirmer le mot de passe</label>
            <input
              {...register('confirm')}
              type="password"
              className={inputCls}
              placeholder="••••••"
            />
            {errors.confirm && <p className="text-caption text-trend-down">{errors.confirm.message}</p>}
          </div>

          <div className="flex justify-end gap-3 pt-1">
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
              {isSubmitting ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputCls =
  'w-full rounded-xl bg-surface border border-soft px-3 py-2 text-sm text-ink placeholder:text-muted outline-none focus:border-brand transition';
