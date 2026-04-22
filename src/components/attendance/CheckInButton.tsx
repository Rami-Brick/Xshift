'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { MapPin, LogIn, LogOut, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type { Attendance } from '@/types';

interface CheckInButtonProps {
  today: Attendance | null;
  onSuccess: () => void;
}

type Phase = 'idle' | 'locating' | 'submitting';

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
        toast.error('GPS indisponible — délai dépassé');
      } else {
        toast.error('GPS indisponible');
      }
      return;
    }

    const { latitude, longitude, accuracy } = position.coords;

    setPhase('submitting');
    const endpoint = hasCheckedIn ? '/api/checkout' : '/api/checkin';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude, longitude, accuracy }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? 'Erreur lors du pointage');
      } else {
        toast.success(hasCheckedIn ? 'Départ pointé avec succès' : 'Arrivée pointée avec succès');
        onSuccess();
      }
    } catch {
      toast.error('Erreur réseau — réessayez');
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
    ? phase === 'locating' ? 'Localisation…' : 'Pointage…'
    : hasCheckedIn ? 'Pointer le départ' : 'Pointer l\'arrivée';

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
