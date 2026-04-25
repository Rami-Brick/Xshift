import 'server-only';

import { createServiceClient } from '@/lib/supabase/service';
import { sendWebPush, type WebPushPayload } from '@/lib/notifications/web-push';
import { isStaffRole } from '@/lib/auth/roles';
import type { Role, AttendanceStatus } from '@/types';

interface NotifyArgs {
  employeeId: string;
  employeeName: string;
  attendanceId: string;
  checkInAt: Date;
  status: AttendanceStatus;
}

interface SubscriptionRow {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  failure_count: number;
  profiles: {
    id: string;
    role: Role;
    is_active: boolean;
  } | null;
}

const TIMEZONE = 'Africa/Tunis';

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TIMEZONE,
  }).format(date);
}

function dateKey(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: TIMEZONE,
  }).format(date);
}

export async function notifyStaffOfCheckIn(args: NotifyArgs): Promise<void> {
  const service = createServiceClient();

  const { data, error } = await service
    .from('push_subscriptions')
    .select(
      `
      id,
      user_id,
      endpoint,
      p256dh,
      auth,
      failure_count,
      profiles!inner (
        id,
        role,
        is_active
      )
    `,
    )
    .eq('enabled', true)
    .eq('profiles.is_active', true)
    .in('profiles.role', ['manager', 'admin']);

  if (error) {
    console.error('[notifyStaffOfCheckIn] failed to load subscriptions', error);
    return;
  }

  const rows = (data ?? []) as unknown as SubscriptionRow[];

  for (const row of rows) {
    if (!row.profiles || !isStaffRole(row.profiles.role) || !row.profiles.is_active) {
      throw new Error(
        `[notifyStaffOfCheckIn] !inner guard tripped: subscription ${row.id} returned without staff profile`,
      );
    }
  }

  if (rows.length === 0) return;

  const time = formatTime(args.checkInAt);
  const lateSuffix = args.status === 'late' ? ' (en retard)' : '';
  const payload: WebPushPayload = {
    title: 'Nouveau pointage',
    body: `${args.employeeName} a pointé son arrivée à ${time}${lateSuffix}.`,
    icon: '/icons/icon-192.png',
    badge: '/icons/status-bar.png',
    tag: `attendance-checkin-${dateKey(args.checkInAt)}-${args.employeeId}`,
    url: '/admin/attendance',
    data: {
      type: 'attendance_checkin',
      attendanceId: args.attendanceId,
    },
  };

  const results = await Promise.allSettled(
    rows.map((row) =>
      sendWebPush(
        { endpoint: row.endpoint, p256dh: row.p256dh, auth: row.auth },
        payload,
      ).then((result) => ({ row, result })),
    ),
  );

  const now = new Date().toISOString();

  await Promise.allSettled(
    results.map(async (settled) => {
      if (settled.status !== 'fulfilled') {
        console.error('[notifyStaffOfCheckIn] send rejected', settled.reason);
        return;
      }
      const { row, result } = settled.value;

      if (result.ok) {
        await service
          .from('push_subscriptions')
          .update({ last_success_at: now, failure_count: 0, last_failure_at: null })
          .eq('id', row.id);
        return;
      }

      if (result.expired) {
        await service
          .from('push_subscriptions')
          .update({ enabled: false, last_failure_at: now })
          .eq('id', row.id);
        return;
      }

      console.error('[notifyStaffOfCheckIn] send failed', row.id, result.error);
      const nextCount = row.failure_count + 1;
      await service
        .from('push_subscriptions')
        .update({
          failure_count: nextCount,
          last_failure_at: now,
          enabled: nextCount < 5,
        })
        .eq('id', row.id);
    }),
  );
}
