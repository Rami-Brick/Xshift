import { Suspense } from 'react';
import { createServiceClient } from '@/lib/supabase/service';
import { timeAsync } from '@/lib/perf/timing';
import { EmployeeList } from '@/components/admin/EmployeeList';
import type { Profile } from '@/types';

export default function AdminEmployeesPage() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink tracking-tight">Employés</h1>
      </div>
      <Suspense fallback={<EmployeeListSkeleton />}>
        <AdminEmployeesContent />
      </Suspense>
    </div>
  );
}

async function AdminEmployeesContent() {
  const service = createServiceClient();

  const { data } = await timeAsync('page.admin.employees.data', () =>
    service
      .from('profiles')
      .select(
        'id, full_name, email, phone, position, department, role, work_start_time, work_end_time, leave_balance, is_active, avatar_url, created_at, updated_at',
      )
      .order('full_name', { ascending: true }),
  );

  const employees = (data ?? []) as Profile[];

  return <EmployeeList initialEmployees={employees} />;
}

function EmployeeListSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex gap-3 flex-wrap">
        <div className="h-10 flex-1 min-w-48 rounded-xl bg-surface shadow-softer animate-pulse" />
        <div className="h-10 w-36 rounded-xl bg-brand/20 animate-pulse" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-surface shadow-softer animate-pulse" />
        ))}
      </div>
    </div>
  );
}
