'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Crosshair } from 'lucide-react';
import { toast } from 'sonner';
import { settingsSchema, type SettingsInput } from '@/lib/validation/settings';
import type { OfficeSettings } from '@/types';

const MapPreview = dynamic(() => import('./MapPreview'), { ssr: false, loading: () => (
  <div className="h-48 rounded-xl bg-soft flex items-center justify-center text-muted text-sm">
    Chargement de la carte…
  </div>
) });

interface Props {
  settings: OfficeSettings;
}

export function SettingsForm({ settings }: Props) {
  const [locating, setLocating] = useState(false);
  const [lastCapturedAccuracy, setLastCapturedAccuracy] = useState<number | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([
    settings.office_latitude,
    settings.office_longitude,
  ]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<SettingsInput>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      office_name: settings.office_name,
      company_name: settings.company_name,
      logo_url: settings.logo_url ?? '',
      office_latitude: settings.office_latitude,
      office_longitude: settings.office_longitude,
      allowed_radius_meters: settings.allowed_radius_meters,
      gps_accuracy_limit_meters: settings.gps_accuracy_limit_meters,
      grace_period_minutes: settings.grace_period_minutes,
      forgot_checkout_cutoff_time: settings.forgot_checkout_cutoff_time,
      default_work_start_time: settings.default_work_start_time,
      default_work_end_time: settings.default_work_end_time,
    },
  });

  const lat = watch('office_latitude');
  const lng = watch('office_longitude');
  const radius = watch('allowed_radius_meters');
  const gpsLimit = watch('gps_accuracy_limit_meters');

  async function captureGPS() {
    setLocating(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10_000,
          maximumAge: 0,
        }),
      );
      const { latitude, longitude, accuracy } = pos.coords;
      const roundedAccuracy = Math.round(accuracy);
      const suggestedLimit = Math.min(Math.max(roundedAccuracy, 10), 2000);
      setValue('office_latitude', latitude, { shouldDirty: true });
      setValue('office_longitude', longitude, { shouldDirty: true });
      setLastCapturedAccuracy(roundedAccuracy);
      setMapCenter([latitude, longitude]);
      if (roundedAccuracy > Number(gpsLimit)) {
        setValue('gps_accuracy_limit_meters', suggestedLimit, { shouldDirty: true });
        toast(`Précision GPS max ajustée à ${suggestedLimit} m`);
        return;
      }
      toast.success('Position capturée');
    } catch {
      toast.error('GPS indisponible');
    } finally {
      setLocating(false);
    }
  }

  async function onSubmit(data: SettingsInput) {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error ?? 'Erreur lors de la sauvegarde');
      return;
    }
    toast.success('Paramètres enregistrés');
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Company info */}
      <section className="bg-surface rounded-xl p-5 shadow-softer space-y-4">
        <p className="text-sm font-semibold text-muted uppercase tracking-wide">Informations</p>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Nom du bureau" error={errors.office_name?.message}>
            <input {...register('office_name')} className={inputCls} />
          </Field>
          <Field label="Société" error={errors.company_name?.message}>
            <input {...register('company_name')} className={inputCls} />
          </Field>
        </div>
        <Field label="URL du logo" error={errors.logo_url?.message}>
          <input {...register('logo_url')} type="url" className={inputCls} placeholder="https://…" />
        </Field>
      </section>

      {/* GPS / geofence */}
      <section className="bg-surface rounded-xl p-5 shadow-softer space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-muted uppercase tracking-wide">Géolocalisation</p>
          <button
            type="button"
            onClick={captureGPS}
            disabled={locating}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand/10 text-brand text-sm font-medium hover:bg-brand/20 transition disabled:opacity-60"
          >
            <Crosshair size={14} />
            {locating ? 'Localisation…' : 'Capturer ma position'}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Latitude" error={errors.office_latitude?.message}>
            <input
              {...register('office_latitude')}
              type="number"
              step="any"
              className={inputCls}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                setValue('office_latitude', v, { shouldDirty: true });
                if (!isNaN(v)) setMapCenter([v, lng]);
              }}
            />
          </Field>
          <Field label="Longitude" error={errors.office_longitude?.message}>
            <input
              {...register('office_longitude')}
              type="number"
              step="any"
              className={inputCls}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                setValue('office_longitude', v, { shouldDirty: true });
                if (!isNaN(v)) setMapCenter([lat, v]);
              }}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Rayon autorisé (m)" error={errors.allowed_radius_meters?.message}>
            <input {...register('allowed_radius_meters')} type="number" min={10} max={2000} className={inputCls} />
          </Field>
          <Field label="Précision GPS max (m)" error={errors.gps_accuracy_limit_meters?.message}>
            <input {...register('gps_accuracy_limit_meters')} type="number" min={10} max={2000} className={inputCls} />
          </Field>
        </div>

        {lastCapturedAccuracy !== null && (
          <p className="text-caption text-muted">
            Dernière précision capturée : {lastCapturedAccuracy} m. Le pointage est refusé si la précision du navigateur dépasse la limite GPS max.
          </p>
        )}

        <MapPreview center={mapCenter} radius={radius} />
      </section>

      {/* Work hours */}
      <section className="bg-surface rounded-xl p-5 shadow-softer space-y-4">
        <p className="text-sm font-semibold text-muted uppercase tracking-wide">Horaires</p>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Heure d'arrivée (défaut)" error={errors.default_work_start_time?.message}>
            <input {...register('default_work_start_time')} className={inputCls} placeholder="08:30" />
          </Field>
          <Field label="Heure de départ (défaut)" error={errors.default_work_end_time?.message}>
            <input {...register('default_work_end_time')} className={inputCls} placeholder="17:30" />
          </Field>
          <Field label="Période de grâce (min)" error={errors.grace_period_minutes?.message}>
            <input {...register('grace_period_minutes')} type="number" min={0} max={60} className={inputCls} />
          </Field>
        </div>
        <Field label="Heure limite oubli départ" error={errors.forgot_checkout_cutoff_time?.message}>
          <input {...register('forgot_checkout_cutoff_time')} className={inputCls} placeholder="23:00" />
        </Field>
      </section>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting || !isDirty}
          className="px-6 py-2.5 rounded-xl bg-brand text-white font-semibold text-sm hover:opacity-90 transition disabled:opacity-60"
        >
          {isSubmitting ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </form>
  );
}

const inputCls =
  'w-full rounded-xl bg-canvas border border-soft px-3 py-2 text-sm text-ink placeholder:text-muted outline-none focus:border-brand transition';

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
