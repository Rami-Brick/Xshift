import { Suspense } from 'react';
import { createServiceClient } from '@/lib/supabase/service';
import { requireStaffCached } from '@/lib/auth/guards';
import { canDeleteAttendance } from '@/lib/auth/roles';
import { timeAsync } from '@/lib/perf/timing';
import { syncClosedAttendanceDays } from '@/lib/attendance/forgot-checkout';
import { formatInTimeZone } from 'date-fns-tz';
import { startOfMonth, endOfMonth } from 'date-fns';
import { AttendanceTable } from '@/components/admin/AttendanceTable';
import type { AttendanceListItem, Profile } from '@/types';

const OFFICE_TZ = 'Africa/Tunis';

interface PageProps {
  searchParams: Promise<{
    user_id?: string;
    status?: string;
    start?: string;
    end?: string;
  }>;
}

export default async function AdminAttendancePage({ searchParams }: PageProps) {
  const filters = await searchParams;
  const now = new Date();

  const start = filters.start ?? formatInTimeZone(startOfMonth(now), OFFICE_TZ, 'yyyy-MM-dd');
  const end = filters.end ?? formatInTimeZone(endOfMonth(now), OFFICE_TZ, 'yyyy-MM-dd');

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-ink tracking-tight">Présences</h1>
      <Suspense fallback={<AttendanceTableSkeleton />}>
        <AdminAttendanceContent filters={filters} start={start} end={end} />
      </Suspense>
    </div>
  );
}

async function AdminAttendanceContent({
  filters,
  start,
  end,
}: {
  filters: Awaited<PageProps['searchParams']>;
  start: string;
  end: string;
}) {
  const { profile } = await requireStaffCached();
  const service = createServiceClient();

  await syncClosedAttendanceDays(service, { startDate: start, endDate: end, userId: filters.user_id });

  const [attendanceResult, employeesResult, settingsResult] = await timeAsync('page.admin.attendance.data', () => Promise.all([
    (() => {
      let q = service
        .from('attendance')
        .select(
          'id, user_id, date, check_in_at, check_out_at, status, late_minutes, forgot_checkout, note, device_id, device_label, profiles!attendance_user_id_fkey(id, full_name, email, work_start_time)',
        )
        .order('date', { ascending: false })
        .order('check_in_at', { ascending: false, nullsFirst: false })
        .gte('date', start)
        .lte('date', end)
        .limit(200);

      if (filters.user_id) q = q.eq('user_id', filters.user_id);
      if (filters.status) q = q.eq('status', filters.status as never);

      return q;
    })(),
    service.from('profiles').select('id, full_name, work_start_time').eq('is_active', true).order('full_name'),
    service.from('office_settings').select('grace_period_minutes').single(),
  ]));

  const records = (attendanceResult.data ?? []).map((row) => ({
    ...row,
    profiles: Array.isArray(row.profiles) ? row.profiles[0] : row.profiles,
  })) as AttendanceListItem[];
  const employees = (employeesResult.data ?? []) as Pick<Profile, 'id' | 'full_name' | 'work_start_time'>[];
  const gracePeriodMinutes = (settingsResult.data?.grace_period_minutes ?? 10) as number;

  return (
    <AttendanceTable
      initialRecords={records}
      employees={employees}
      initialFilters={{ start, end, user_id: filters.user_id, status: filters.status }}
      gracePeriodMinutes={gracePeriodMinutes}
      canDelete={canDeleteAttendance(profile.role)}
    />
  );
}

function AttendanceTableSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3 bg-surface rounded-xl p-4 shadow-softer">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 w-36 rounded-xl bg-canvas animate-pulse" />
        ))}
        <div className="ml-auto h-10 w-28 rounded-xl bg-brand/20 animate-pulse" />
      </div>
      <div className="bg-surface rounded-xl shadow-softer overflow-hidden">
        <div className="h-11 border-b border-soft bg-canvas/50 animate-pulse" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-14 border-b border-soft last:border-0 bg-surface animate-pulse" />
        ))}
      </div>
    </div>
  );
}
