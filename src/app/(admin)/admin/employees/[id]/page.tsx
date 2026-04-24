import { createServiceClient } from '@/lib/supabase/service';
import { requireStaffCached } from '@/lib/auth/guards';
import { canManageEmployeeAccounts } from '@/lib/auth/roles';
import { timeAsync } from '@/lib/perf/timing';
import { notFound } from 'next/navigation';
import { formatInTimeZone } from 'date-fns-tz';
import { startOfMonth, endOfMonth } from 'date-fns';
import { InitialAvatar } from '@/design-kit/primitives/InitialAvatar';
import { Chip } from '@/design-kit/primitives/Chip';
import { formatTime, formatDate } from '@/lib/attendance/status';
import { EmployeeDetailActions } from '@/components/admin/EmployeeDetailActions';
import type { Profile, Attendance } from '@/types';

const OFFICE_TZ = 'Africa/Tunis';

const STATUS_LABEL: Record<string, string> = {
  present: 'Présent',
  late: 'En retard',
  absent: 'Absent',
  leave: 'En congé',
  holiday: 'Jour férié',
  day_off: 'Jour de repos',
};

function statusChip(status: string): 'lime' | 'trendDown' | 'neutral' {
  if (status === 'present') return 'lime';
  if (status === 'late' || status === 'absent') return 'trendDown';
  return 'neutral';
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminEmployeeDetailPage({ params }: PageProps) {
  const { profile: viewer } = await requireStaffCached();
  const { id } = await params;
  const service = createServiceClient();

  const now = new Date();
  const monthStart = formatInTimeZone(startOfMonth(now), OFFICE_TZ, 'yyyy-MM-dd');
  const monthEnd = formatInTimeZone(endOfMonth(now), OFFICE_TZ, 'yyyy-MM-dd');

  const [{ data: profile }, { data: monthRecords }, { data: recent }] = await timeAsync('page.admin.employee.detail.data', () => Promise.all([
    service
      .from('profiles')
      .select(
        'id, full_name, email, role, work_start_time, work_end_time, leave_balance, default_day_off, is_active, avatar_url, created_at, updated_at',
      )
      .eq('id', id)
      .single(),
    service
      .from('attendance')
      .select('status, late_minutes')
      .eq('user_id', id)
      .gte('date', monthStart)
      .lte('date', monthEnd),
    service
      .from('attendance')
      .select('id, user_id, date, check_in_at, check_out_at, status, late_minutes, forgot_checkout')
      .eq('user_id', id)
      .order('date', { ascending: false })
      .limit(10),
  ]));

  if (!profile) notFound();

  const p = profile as Profile;
  if (p.role === 'admin' && !canManageEmployeeAccounts(viewer.role)) {
    notFound();
  }

  const records = (recent ?? []) as Attendance[];
  const presentCount = (monthRecords ?? []).filter((r) => r.status === 'present' || r.status === 'late').length;
  const lateCount = (monthRecords ?? []).filter((r) => r.status === 'late').length;

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start">
        <div className="flex items-start gap-4 min-w-0 flex-1">
          <InitialAvatar name={p.full_name} size={56} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-ink tracking-tight break-words">{p.full_name}</h1>
              {p.role === 'admin' && <Chip variant="brand">Admin</Chip>}
              {p.role === 'manager' && <Chip variant="dark">Manager</Chip>}
              {!p.is_active && <Chip variant="dark">Inactif</Chip>}
            </div>
            <p className="text-sm text-muted mt-0.5 break-words">{p.email}</p>
          </div>
        </div>
        <EmployeeDetailActions employee={p} viewerRole={viewer.role} />
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <InfoCard label="Horaire" value={`${p.work_start_time} → ${p.work_end_time}`} />
        <InfoCard label="Solde congés" value={`${p.leave_balance} j`} />
        <InfoCard label="Présences ce mois" value={String(presentCount)} />
        <InfoCard label="Retards ce mois" value={String(lateCount)} />
        <InfoCard label="Membre depuis" value={formatInTimeZone(new Date(p.created_at), OFFICE_TZ, 'dd MMM yyyy')} />
      </div>

      {/* Recent attendance */}
      {records.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">
            Présences récentes
          </p>
          <div className="space-y-2">
            {records.map((row) => (
              <div
                key={row.id}
                className="flex items-center justify-between bg-surface rounded-xl px-4 py-3 shadow-softer"
              >
                <div>
                  <p className="text-sm font-medium text-ink">{formatDate(row.date)}</p>
                  <p className="text-caption text-muted">
                    {formatTime(row.check_in_at)} → {formatTime(row.check_out_at)}
                  </p>
                </div>
                <Chip variant={statusChip(row.status)}>
                  {STATUS_LABEL[row.status] ?? row.status}
                </Chip>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface rounded-xl px-4 py-3 shadow-softer">
      <p className="text-caption text-muted">{label}</p>
      <p className="text-sm font-semibold text-ink mt-0.5">{value}</p>
    </div>
  );
}
