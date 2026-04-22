import { requireAdmin } from '@/lib/auth/guards';
import { createServiceClient } from '@/lib/supabase/service';
import { EmployeeList } from '@/components/admin/EmployeeList';
import type { Profile } from '@/types';

export default async function AdminEmployeesPage() {
  await requireAdmin();
  const service = createServiceClient();

  const { data } = await service
    .from('profiles')
    .select('*')
    .order('full_name', { ascending: true });

  const employees = (data ?? []) as Profile[];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink tracking-tight">Employés</h1>
      </div>
      <EmployeeList initialEmployees={employees} />
    </div>
  );
}
