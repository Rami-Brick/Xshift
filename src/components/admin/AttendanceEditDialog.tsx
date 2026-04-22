'use client';

import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { fromZonedTime, formatInTimeZone } from 'date-fns-tz';
import { differenceInMinutes } from 'date-fns';
import type { AttendanceListItem, Profile } from '@/types';

const OFFICE_TZ = 'Africa/Tunis';

interface Props {
  record: AttendanceListItem | null;
  employees: Pick<Profile, 'id' | 'full_name' | 'work_start_time'>[];
  gracePeriodMinutes: number;
  onClose: () => void;
  onSuccess: (saved: AttendanceListItem) => void;
}

type FormData = {
  user_id: string;
  date: string;
  status: 'present' | 'late' | 'absent' | 'leave' | 'holiday';
  check_in_at: string;
  check_out_at: string;
  late_minutes: number;
  note: string;
};

function calcLateMinutesLocal(workStartTime: string, checkInLocal: string): number {
  // checkInLocal: 'yyyy-MM-ddTHH:mm' — treat as Tunis local time
  const dateStr = checkInLocal.slice(0, 10);
  const startUTC = fromZonedTime(`${dateStr} ${workStartTime.slice(0, 5)}`, OFFICE_TZ);
  const checkInUTC = fromZonedTime(checkInLocal.replace('T', ' '), OFFICE_TZ);
  return differenceInMinutes(checkInUTC, startUTC);
}

export function AttendanceEditDialog({ record, employees, gracePeriodMinutes, onClose, onSuccess }: Props) {
  const isEdit = !!record;

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    defaultValues: isEdit
      ? {
          user_id: record.user_id,
          date: record.date,
          status: record.status,
          check_in_at: record.check_in_at
            ? formatInTimeZone(new Date(record.check_in_at), OFFICE_TZ, "yyyy-MM-dd'T'HH:mm")
            : '',
          check_out_at: record.check_out_at
            ? formatInTimeZone(new Date(record.check_out_at), OFFICE_TZ, "yyyy-MM-dd'T'HH:mm")
            : '',
          late_minutes: record.late_minutes ?? 0,
          note: record.note ?? '',
        }
      : {
          status: 'present',
          date: formatInTimeZone(new Date(), OFFICE_TZ, 'yyyy-MM-dd'),
          check_in_at: '',
          check_out_at: '',
          late_minutes: 0,
          note: '',
        },
  });

  const checkInAt = useWatch({ control, name: 'check_in_at' });
  const userId = useWatch({ control, name: 'user_id' });

  useEffect(() => {
    if (!checkInAt) return;

    const workStartTime = isEdit
      ? record.profiles?.work_start_time
      : employees.find((e) => e.id === userId)?.work_start_time;

    if (!workStartTime) return;

    const lateMin = calcLateMinutesLocal(workStartTime, checkInAt);
    setValue('late_minutes', lateMin, { shouldDirty: true });
    setValue('status', lateMin > gracePeriodMinutes ? 'late' : 'present', { shouldDirty: true });
  }, [checkInAt, userId, isEdit, record, employees, gracePeriodMinutes, setValue]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function onSubmit(data: FormData) {
    const payload = {
      ...(isEdit ? {} : { user_id: data.user_id, date: data.date }),
      status: data.status,
      check_in_at: data.check_in_at ? new Date(data.check_in_at).toISOString() : null,
      check_out_at: data.check_out_at ? new Date(data.check_out_at).toISOString() : null,
      late_minutes: Number(data.late_minutes),
      note: data.note || null,
    };

    const url = isEdit ? `/api/attendance/${record.id}` : '/api/attendance/all';
    const method = isEdit ? 'PATCH' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(isEdit ? payload : { ...payload, user_id: data.user_id, date: data.date }),
    });

    const json = await res.json();

    if (!res.ok) {
      toast.error(json.error ?? 'Une erreur est survenue');
      return;
    }

    toast.success(isEdit ? 'Présence mise à jour' : 'Présence créée');
    onSuccess(json as AttendanceListItem);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-canvas rounded-2xl shadow-soft w-full max-w-md overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b border-soft">
          <h2 className="text-base font-semibold text-ink">
            {isEdit ? 'Modifier la présence' : 'Ajouter une présence'}
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
          {!isEdit && (
            <>
              <Field label="Employé" error={errors.user_id?.message}>
                <select {...register('user_id')} className={inputCls}>
                  <option value="">Choisir…</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>{e.full_name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Date" error={errors.date?.message}>
                <input {...register('date')} type="date" className={inputCls} />
              </Field>
            </>
          )}

          <Field label="Statut" error={errors.status?.message}>
            <select {...register('status')} className={inputCls}>
              <option value="present">Présent</option>
              <option value="late">En retard</option>
              <option value="absent">Absent</option>
              <option value="leave">En congé</option>
              <option value="holiday">Jour férié</option>
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Arrivée" error={errors.check_in_at?.message}>
              <input {...register('check_in_at')} type="datetime-local" className={inputCls} />
            </Field>
            <Field label="Départ" error={errors.check_out_at?.message}>
              <input {...register('check_out_at')} type="datetime-local" className={inputCls} />
            </Field>
          </div>

          <Field label="Retard (min)" error={errors.late_minutes?.message}>
            <input {...register('late_minutes')} type="number" className={inputCls} />
          </Field>

          <Field label="Note" error={errors.note?.message}>
            <textarea {...register('note')} rows={2} className={`${inputCls} resize-none`} />
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
