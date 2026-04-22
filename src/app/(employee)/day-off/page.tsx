import { requireUserCached } from '@/lib/auth/guards';
import { createClient } from '@/lib/supabase/server';
import { timeAsync } from '@/lib/perf/timing';
import { DayOffPageClient } from '@/components/day-off/DayOffPageClient';
import { isoWeekForNow, isoWeekForNextWeek } from '@/lib/day-off/weeks';
import type { DayOffChangeListItem, DayOfWeek } from '@/types';

export default async function DayOffPage() {
  const { profile } = await requireUserCached();
  const supabase = await createClient();

  const { data } = await timeAsync('page.employee.day-off.data', () =>
    supabase
      .from('day_off_changes')
      .select(
        'id, user_id, iso_year, iso_week, old_day, new_day, status, reason, admin_note, created_at, updated_at',
      )
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(20),
  );

  const changes = (data ?? []) as DayOffChangeListItem[];
  const thisWeek = isoWeekForNow();
  const nextWeek = isoWeekForNextWeek();

  return (
    <div className="space-y-4 px-4 pt-5 pb-4">
      <h1 className="text-section font-bold text-ink tracking-tight">Jour de repos</h1>
      <DayOffPageClient
        initialChanges={changes}
        defaultDayOff={profile.default_day_off as DayOfWeek}
        thisWeek={thisWeek}
        nextWeek={nextWeek}
      />
    </div>
  );
}
