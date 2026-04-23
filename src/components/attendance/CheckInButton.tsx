'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { MapPin, LogIn, LogOut, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { getDeviceId, getDeviceLabel } from '@/lib/device';
import type { Attendance } from '@/types';

interface CheckInButtonProps {
  today: Attendance | null;
  onSuccess: () => void;
}

type Phase = 'idle' | 'locating' | 'submitting';

type CheckInErrorResponse = {
  code?: string;
  error?: string;
  accuracy?: number;
  limit?: number;
  distance?: number;
  radius?: number;
};

export function CheckInButton({ today, onSuccess }: CheckInButtonProps) {
  const [phase, setPhase] = useState<Phase>('idle');

  const hasCheckedIn = !!today?.check_in_at;
  const hasCheckedOut = !!today?.check_out_at;
  const done = hasCheckedIn && hasCheckedOut;

  async function handlePress() {
    setPhase('locating');

    let position: GeolocationPosition;
    try {
      position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10_000,
          maximumAge: 0,
        });
      });
    } catch (err: unknown) {
      setPhase('idle');
      const code = (err as GeolocationPositionError)?.code;
      if (code === GeolocationPositionError.PERMISSION_DENIED) {
        toast.error('Accès à la localisation refusé');
      } else if (code === GeolocationPositionError.TIMEOUT) {
        toast.error('GPS indisponible - délai dépassé');
      } else {
        toast.error('GPS indisponible');
      }
      return;
    }

    const { latitude, longitude, accuracy } = position.coords;

    setPhase('submitting');
    const endpoint = hasCheckedIn ? '/api/checkout' : '/api/checkin';
    const deviceId = getDeviceId();

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude, longitude, accuracy, device_id: deviceId, device_label: getDeviceLabel(deviceId) }),
      });

      const data = (await res.json()) as CheckInErrorResponse;

      if (!res.ok) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('Pointage refusé', {
            endpoint,
            status: res.status,
            response: data,
            coords: {
              latitude,
              longitude,
              accuracy: Math.round(accuracy),
            },
          });
        }
        toast.error(formatCheckInError(data));
      } else {
        toast.success(hasCheckedIn ? 'Départ pointé avec succès' : 'Arrivée pointée avec succès');
        onSuccess();
      }
    } catch {
      toast.error('Erreur réseau - réessayez');
    } finally {
      setPhase('idle');
    }
  }

  if (done) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-soft text-muted text-sm font-medium">
        <MapPin size={16} />
        Journée terminée
      </div>
    );
  }

  const loading = phase !== 'idle';
  const label = loading
    ? phase === 'locating'
      ? 'Localisation...'
      : 'Pointage...'
    : hasCheckedIn
      ? 'Pointer le départ'
      : "Pointer l'arrivée";

  const Icon = loading ? Loader2 : hasCheckedIn ? LogOut : LogIn;

  return (
    <button
      type="button"
      onClick={handlePress}
      disabled={loading}
      className={cn(
        'flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition',
        'disabled:opacity-60 disabled:cursor-not-allowed',
        hasCheckedIn
          ? 'bg-ink text-white hover:opacity-90'
          : 'bg-brand text-white hover:opacity-90',
      )}
    >
      <Icon size={18} className={loading ? 'animate-spin' : ''} />
      {label}
    </button>
  );
}

function formatCheckInError(data: CheckInErrorResponse): string {
  if (data.code === 'gps_accuracy_too_low' && data.accuracy && data.limit) {
    return `Précision GPS insuffisante (${data.accuracy} m, maximum autorisé : ${data.limit} m)`;
  }

  if (data.code === 'outside_geofence' && data.distance && data.radius) {
    return `Vous êtes à ${data.distance} m du bureau (rayon autorisé : ${data.radius} m)`;
  }

  return data.error ?? 'Erreur lors du pointage';
}
