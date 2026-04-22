import { requireUserCached } from '@/lib/auth/guards';
import { createClient } from '@/lib/supabase/server';
import { timeAsync } from '@/lib/perf/timing';
import { LeavePageClient } from '@/components/leave/LeavePageClient';
import type { LeaveRequest } from '@/types';

export default async function LeavePage() {
  const { profile } = await requireUserCached();
  const supabase = await createClient();

  const { data } = await timeAsync('page.employee.leave.data', () =>
    supabase
      .from('leave_requests')
      .select('id, user_id, start_date, end_date, type, status, reason, admin_note, created_at, updated_at')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false }),
  );

  const requests = (data ?? []) as LeaveRequest[];

  return (
    <div className="space-y-4 px-4 pt-5 pb-4">
      <h1 className="text-section font-bold text-ink tracking-tight">Congés</h1>
      <LeavePageClient
        initialRequests={requests}
        leaveBalance={profile.leave_balance}
      />
    </div>
  );
}
