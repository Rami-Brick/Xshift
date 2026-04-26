import { createServiceClient } from '@/lib/supabase/service';
import { timeAsync } from '@/lib/perf/timing';
import { ReportsClient } from '@/components/admin/ReportsClient';
import { getReportsSummary } from '@/lib/reports/summary';
import { OFFICE_TZ } from '@/lib/utils/date';
import { endOfMonth, startOfMonth } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import type { Profile } from '@/types';

export default async function AdminReportsPage() {
  const service = createServiceClient();
  const now = new Date();
  const start = formatInTimeZone(startOfMonth(now), OFFICE_TZ, 'yyyy-MM-dd');
  const end = formatInTimeZone(endOfMonth(now), OFFICE_TZ, 'yyyy-MM-dd');

  const [{ data }, initialSummary] = await timeAsync('page.admin.reports.data', () =>
    Promise.all([
      service
        .from('profiles')
        .select('id, full_name')
        .eq('is_active', true)
        .eq('role', 'employee')
        .order('full_name'),
      getReportsSummary({ start, end }),
    ]),
  );

  const employees = (data ?? []) as Pick<Profile, 'id' | 'full_name'>[];

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-ink tracking-tight">Rapports</h1>
      <ReportsClient employees={employees} initialSummary={initialSummary} />
    </div>
  );
}
