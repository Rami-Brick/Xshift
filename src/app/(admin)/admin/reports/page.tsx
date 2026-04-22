import { createServiceClient } from '@/lib/supabase/service';
import { timeAsync } from '@/lib/perf/timing';
import { ReportsClient } from '@/components/admin/ReportsClient';
import type { Profile } from '@/types';

export default async function AdminReportsPage() {
  const service = createServiceClient();

  const { data } = await timeAsync('page.admin.reports.data', () =>
    service
      .from('profiles')
      .select('id, full_name')
      .eq('is_active', true)
      .order('full_name'),
  );

  const employees = (data ?? []) as Pick<Profile, 'id' | 'full_name'>[];

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-ink tracking-tight">Rapports</h1>
      <ReportsClient employees={employees} />
    </div>
  );
}
