'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
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
      <div className="flex h-40 w-40 flex-col items-center justify-center rounded-full bg-soft text-muted shadow-softer">
        <span className="text-sm font-semibold tracking-wide">Terminé</span>
      </div>
    );
  }

  const loading = phase !== 'idle';
  const isCheckOut = hasCheckedIn;
  const actionLabel = isCheckOut ? 'Pointer le départ' : "Pointer l'arrivée";

  return (
    <div className="relative flex items-center justify-center">
      {/* Pulsing ring — only when idle and not checked in yet */}
      {!loading && !isCheckOut && (
        <span className="absolute inline-flex h-40 w-40 rounded-full bg-brand opacity-15 animate-[ping_2.4s_cubic-bezier(0,0,0.2,1)_infinite]" />
      )}

      <button
        type="button"
        onClick={handlePress}
        disabled={loading}
        aria-label={actionLabel}
        aria-busy={loading}
        className={cn(
          'relative flex h-40 w-40 flex-col items-center justify-center gap-1.5 overflow-hidden rounded-full transition-transform duration-150',
          'hover:scale-[1.03] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60',
          isCheckOut
            ? [
                'shadow-[0_20px_48px_rgba(220,38,38,0.30),inset_0_1px_0_rgba(255,255,255,0.18),inset_0_-12px_24px_rgba(120,0,0,0.18)]',
                'before:absolute before:inset-0 before:rounded-full before:bg-[radial-gradient(circle_at_32%_16%,rgba(255,255,255,0.22),transparent_28%),linear-gradient(170deg,#ef4444_0%,#dc2626_52%,#b91c1c_100%)]',
              ]
            : [
                'shadow-[0_20px_48px_rgba(30,83,255,0.32),inset_0_1px_0_rgba(255,255,255,0.40),inset_0_-12px_28px_rgba(5,25,90,0.16)]',
                'before:absolute before:inset-0 before:rounded-full before:bg-[radial-gradient(circle_at_34%_16%,rgba(255,255,255,0.22),transparent_28%),linear-gradient(170deg,#2a56e8_0%,#1340d4_52%,#0d30b8_100%)]',
              ],
          'after:absolute after:left-[18%] after:top-[10%] after:h-[28%] after:w-[62%] after:rounded-full after:bg-white/10 after:blur-xl',
        )}
      >
        {loading ? (
          <Loader2 size={22} className="relative z-10 animate-spin text-white" />
        ) : (
          <span className="relative z-10 text-lg font-bold tracking-tight text-white leading-none">
            Pointer
          </span>
        )}
      </button>
    </div>
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
