import { Suspense } from 'react';
import { createServiceClient } from '@/lib/supabase/service';
import { timeAsync } from '@/lib/perf/timing';
import { AdminDayOffTable } from '@/components/day-off/AdminDayOffTable';
import type { DayOffChangeListItem, Profile } from '@/types';

export default function AdminDayOffPage() {
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-ink tracking-tight">Jours de repos</h1>
      <Suspense fallback={<DayOffTableSkeleton />}>
        <AdminDayOffContent />
      </Suspense>
    </div>
  );
}

async function AdminDayOffContent() {
  const service = createServiceClient();

  const [changesResult, employeesResult] = await timeAsync(
    'page.admin.day-off.data',
    () =>
      Promise.all([
        service
          .from('day_off_changes')
          .select(
            'id, user_id, iso_year, iso_week, old_day, new_day, status, reason, admin_note, created_at, updated_at, profiles!day_off_changes_user_id_fkey(id, full_name, email)',
          )
          .order('created_at', { ascending: false })
          .limit(200),
        service
          .from('profiles')
          .select('id, full_name, default_day_off')
          .eq('is_active', true)
          .order('full_name'),
      ]),
  );

  const rows = (changesResult.data ?? []).map((row) => ({
    ...row,
    profiles: Array.isArray(row.profiles) ? row.profiles[0] : row.profiles,
  })) as DayOffChangeListItem[];
  const employees = (employeesResult.data ?? []) as Pick<
    Profile,
    'id' | 'full_name' | 'default_day_off'
  >[];

  return <AdminDayOffTable initialChanges={rows} employees={employees} />;
}

function DayOffTableSkeleton() {
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
