import { requireUser } from '@/lib/auth/guards';
import { createClient } from '@/lib/supabase/server';
import { LeavePageClient } from '@/components/leave/LeavePageClient';
import type { LeaveRequest } from '@/types';

export default async function LeavePage() {
  const { profile } = await requireUser();
  const supabase = await createClient();

  const { data } = await supabase
    .from('leave_requests')
    .select('*')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false });

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
