import { NextResponse, type NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { requireStaff } from '@/lib/auth/guards';
import { syncClosedAttendanceDays } from '@/lib/attendance/forgot-checkout';
import { formatInTimeZone } from 'date-fns-tz';

const OFFICE_TZ = 'Africa/Tunis';
const STATUS_VALUES = new Set(['present', 'late', 'absent', 'leave', 'holiday', 'day_off']);

function escapeCSV(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(request: NextRequest) {
  await requireStaff();
  const service = createServiceClient();

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('user_id');
  const status = searchParams.get('status');
  const start = searchParams.get('start');
  const end = searchParams.get('end');

  await syncClosedAttendanceDays(service, {
    startDate: start ?? undefined,
    endDate: end ?? undefined,
    userId: userId ?? undefined,
  });

  let query = service
    .from('attendance')
    .select('date, status, check_in_at, check_out_at, late_minutes, forgot_checkout, profiles!attendance_user_id_fkey(full_name, email)')
    .order('date', { ascending: false })
    .order('check_in_at', { ascending: false, nullsFirst: false })
    .limit(5000);

  if (userId) query = query.eq('user_id', userId);
  if (status && !STATUS_VALUES.has(status)) {
    return NextResponse.json({ error: 'Statut invalide' }, { status: 422 });
  }

  if (status) query = query.eq('status', status as never);
  if (start) query = query.gte('date', start);
  if (end) query = query.lte('date', end);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const STATUS_FR: Record<string, string> = {
    present: 'Présent',
    late: 'En retard',
    absent: 'Absent',
    leave: 'En congé',
    holiday: 'Jour férié',
    day_off: 'Jour de repos',
  };

  const headers = ['Date', 'Employé', 'Email', 'Arrivée', 'Départ', 'Statut', 'Retard (min)', 'Oubli départ'];
  const rows = (data ?? []).map((r) => {
    const profile = r.profiles as unknown as { full_name: string; email: string } | null;
    return [
      r.date,
      profile?.full_name ?? '',
      profile?.email ?? '',
      r.check_in_at ? formatInTimeZone(new Date(r.check_in_at), OFFICE_TZ, 'HH:mm') : '',
      r.check_out_at ? formatInTimeZone(new Date(r.check_out_at), OFFICE_TZ, 'HH:mm') : '',
      STATUS_FR[r.status] ?? r.status,
      r.late_minutes ?? 0,
      r.forgot_checkout ? 'Oui' : 'Non',
    ];
  });

  // UTF-8 BOM for Excel
  const BOM = '﻿';
  const csv = BOM + [headers, ...rows].map((row) => row.map(escapeCSV).join(',')).join('\r\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="presences-${start ?? 'all'}.csv"`,
    },
  });
}
