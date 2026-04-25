'use client';

import { useEffect, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { toast } from 'sonner';
import {
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
  getCurrentSubscription,
} from '@/lib/notifications/client';

type Status =
  | { kind: 'loading' }
  | { kind: 'unsupported' }
  | { kind: 'denied' }
  | { kind: 'idle'; subscribed: boolean };

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';

type Variant = 'dropdown' | 'sheet';

interface Props {
  variant?: Variant;
}

const STYLES: Record<Variant, { base: string; muted: string; iconSize: number }> = {
  dropdown: {
    base: 'flex w-full items-center gap-3 px-4 py-2.5 text-sm text-ink hover:bg-soft transition disabled:opacity-60',
    muted: 'flex w-full items-center gap-3 px-4 py-2.5 text-sm text-muted opacity-60',
    iconSize: 15,
  },
  sheet: {
    base: 'flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-ink hover:bg-soft transition disabled:opacity-60',
    muted: 'flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-muted opacity-60',
    iconSize: 18,
  },
};

export function NotificationPermissionButton({ variant = 'dropdown' }: Props = {}) {
  const styles = STYLES[variant];
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [status, setStatus] = useState<Status>({ kind: 'loading' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isPushSupported()) {
      setStatus({ kind: 'unsupported' });
      return;
    }

    let cancelled = false;

    navigator.serviceWorker.ready
      .then(async (reg) => {
        if (cancelled) return;
        setRegistration(reg);

        if (Notification.permission === 'denied') {
          setStatus({ kind: 'denied' });
          return;
        }

        const sub = await getCurrentSubscription(reg);
        setStatus({
          kind: 'idle',
          subscribed: Boolean(sub) && Notification.permission === 'granted',
        });
      })
      .catch(() => {
        if (!cancelled) setStatus({ kind: 'unsupported' });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleEnable() {
    if (!registration) return;
    if (!VAPID_PUBLIC_KEY) {
      toast.error('Clé VAPID non configurée');
      return;
    }

    setBusy(true);
    try {
      await subscribeToPush(registration, VAPID_PUBLIC_KEY);
      setStatus({ kind: 'idle', subscribed: true });
      toast.success('Notifications activées');
    } catch (err) {
      console.error('[NotificationPermissionButton] subscribe failed', err);
      const message = err instanceof Error ? err.message : 'subscribe_failed';
      if (message === 'permission_denied') {
        setStatus({ kind: 'denied' });
        toast.error('Permission refusée');
      } else {
        toast.error(`Impossible d'activer les notifications: ${message}`);
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleDisable() {
    if (!registration) return;

    setBusy(true);
    try {
      await unsubscribeFromPush(registration);
      setStatus({ kind: 'idle', subscribed: false });
      toast.success('Notifications désactivées');
    } catch {
      toast.error('Impossible de désactiver les notifications');
    } finally {
      setBusy(false);
    }
  }

  if (status.kind === 'loading') {
    return (
      <button type="button" disabled className={styles.muted}>
        <Bell size={styles.iconSize} className="text-muted" />
        Chargement...
      </button>
    );
  }

  if (status.kind === 'unsupported') {
    return (
      <button
        type="button"
        disabled
        className={styles.muted}
        title="Notifications non disponibles dans ce navigateur"
      >
        <BellOff size={styles.iconSize} className="text-muted" />
        Notifications indisponibles
      </button>
    );
  }

  if (status.kind === 'denied') {
    return (
      <button
        type="button"
        disabled
        className={styles.muted}
        title="Réactivez les notifications dans les paramètres du navigateur"
      >
        <BellOff size={styles.iconSize} className="text-muted" />
        Notifications bloquées
      </button>
    );
  }

  if (status.subscribed) {
    return (
      <button
        type="button"
        onClick={handleDisable}
        disabled={busy}
        className={styles.base}
      >
        <BellOff size={styles.iconSize} className="text-muted" />
        {busy ? 'Désactivation...' : 'Désactiver les notifications'}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleEnable}
      disabled={busy}
      className={styles.base}
    >
      <Bell size={styles.iconSize} className="text-muted" />
      {busy ? 'Activation...' : 'Activer les notifications'}
    </button>
  );
}
