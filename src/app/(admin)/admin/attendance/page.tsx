import { createServiceClient } from '@/lib/supabase/service';
import { timeAsync } from '@/lib/perf/timing';
import { formatInTimeZone } from 'date-fns-tz';
import { startOfMonth, endOfMonth } from 'date-fns';
import { AttendanceTable } from '@/components/admin/AttendanceTable';
import type { Attendance, Profile } from '@/types';

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
  const service = createServiceClient();

  const filters = await searchParams;
  const now = new Date();

  const start = filters.start ?? formatInTimeZone(startOfMonth(now), OFFICE_TZ, 'yyyy-MM-dd');
  const end = filters.end ?? formatInTimeZone(endOfMonth(now), OFFICE_TZ, 'yyyy-MM-dd');

  const [attendanceResult, employeesResult, settingsResult] = await timeAsync('page.admin.attendance.data', () => Promise.all([
    (() => {
      let q = service
        .from('attendance')
        .select('*, profiles!attendance_user_id_fkey(id, full_name, email, work_start_time)')
        .order('date', { ascending: false })
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

  const records = (attendanceResult.data ?? []) as (Attendance & { profiles?: Pick<Profile, 'id' | 'full_name' | 'email' | 'work_start_time'> })[];
  const employees = (employeesResult.data ?? []) as Pick<Profile, 'id' | 'full_name' | 'work_start_time'>[];
  const gracePeriodMinutes = (settingsResult.data?.grace_period_minutes ?? 10) as number;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-ink tracking-tight">Présences</h1>
      <AttendanceTable
        initialRecords={records}
        employees={employees}
        initialFilters={{ start, end, user_id: filters.user_id, status: filters.status }}
        gracePeriodMinutes={gracePeriodMinutes}
      />
    </div>
  );
}
