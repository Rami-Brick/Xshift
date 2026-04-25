import 'server-only';

import webpush from 'web-push';

let configured = false;

function ensureConfigured() {
  if (configured) return;

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;

  if (!publicKey || !privateKey || !subject) {
    throw new Error('VAPID keys not configured');
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

export interface WebPushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

export interface PushTarget {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export type SendResult =
  | { ok: true }
  | { ok: false; expired: boolean; error: unknown };

export async function sendWebPush(
  target: PushTarget,
  payload: WebPushPayload,
): Promise<SendResult> {
  ensureConfigured();

  try {
    await webpush.sendNotification(
      {
        endpoint: target.endpoint,
        keys: { p256dh: target.p256dh, auth: target.auth },
      },
      JSON.stringify(payload),
    );
    return { ok: true };
  } catch (error) {
    const status =
      error && typeof error === 'object' && 'statusCode' in error
        ? (error as { statusCode?: number }).statusCode
        : undefined;
    const expired = status === 404 || status === 410;
    return { ok: false, expired, error };
  }
}
