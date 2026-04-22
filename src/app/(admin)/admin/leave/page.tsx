import { createServiceClient } from '@/lib/supabase/service';
import { timeAsync } from '@/lib/perf/timing';
import { AdminLeaveTable } from '@/components/leave/AdminLeaveTable';
import type { LeaveRequest, Profile } from '@/types';

export default async function AdminLeavePage() {
  const service = createServiceClient();

  const [leaveResult, employeesResult] = await timeAsync('page.admin.leave.data', () => Promise.all([
    service
      .from('leave_requests')
      .select('*, profiles!leave_requests_user_id_fkey(id, full_name, email)')
      .order('created_at', { ascending: false })
      .limit(200),
    service.from('profiles').select('id, full_name').eq('is_active', true).order('full_name'),
  ]));

  const requests = (leaveResult.data ?? []) as (LeaveRequest & { profiles?: Pick<Profile, 'id' | 'full_name' | 'email'> })[];
  const employees = (employeesResult.data ?? []) as Pick<Profile, 'id' | 'full_name'>[];

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-ink tracking-tight">Gestion des congés</h1>
      <AdminLeaveTable initialRequests={requests} employees={employees} />
    </div>
  );
}
