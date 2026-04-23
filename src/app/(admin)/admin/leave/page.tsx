import { Suspense } from 'react';
import { createServiceClient } from '@/lib/supabase/service';
import { timeAsync } from '@/lib/perf/timing';
import { AdminLeaveTable } from '@/components/leave/AdminLeaveTable';
import type { LeaveRequestListItem, Profile } from '@/types';

export default function AdminLeavePage() {
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-ink tracking-tight">Gestion des congés</h1>
      <Suspense fallback={<LeaveTableSkeleton />}>
        <AdminLeaveContent />
      </Suspense>
    </div>
  );
}

async function AdminLeaveContent() {
  const service = createServiceClient();

  const [leaveResult, employeesResult] = await timeAsync('page.admin.leave.data', () => Promise.all([
    service
      .from('leave_requests')
      .select(
        'id, user_id, start_date, end_date, type, status, reason, admin_note, deduct_balance, created_at, updated_at, profiles!leave_requests_user_id_fkey(id, full_name, email)',
      )
      .order('created_at', { ascending: false })
      .limit(200),
    service.from('profiles').select('id, full_name').eq('is_active', true).order('full_name'),
  ]));

  const requests = (leaveResult.data ?? []).map((row) => ({
    ...row,
    profiles: Array.isArray(row.profiles) ? row.profiles[0] : row.profiles,
  })) as LeaveRequestListItem[];
  const employees = (employeesResult.data ?? []) as Pick<Profile, 'id' | 'full_name'>[];

  return <AdminLeaveTable initialRequests={requests} employees={employees} />;
}

function LeaveTableSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex gap-2 flex-wrap">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-8 w-20 rounded-pill bg-surface shadow-softer animate-pulse" />
          ))}
        </div>
        <div className="ml-auto h-10 w-40 rounded-xl bg-brand/20 animate-pulse" />
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
