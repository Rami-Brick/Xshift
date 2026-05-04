import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { todayDateInOffice } from '@/lib/utils/date';
import { syncClosedAttendanceDays } from '@/lib/attendance/forgot-checkout';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const start = searchParams.get('start');
  const end = searchParams.get('end');
  const includeUnresolved = searchParams.get('include_unresolved') === '1';

  const service = createServiceClient();
  await syncClosedAttendanceDays(service, {
    userId: user.id,
    startDate: start ?? todayDateInOffice(),
    endDate: end ?? todayDateInOffice(),
  });

  let query = supabase
    .from('attendance')
    .select('id, user_id, date, check_in_at, check_out_at, status, late_minutes, forgot_checkout')
    .eq('user_id', user.id)
    .order('date', { ascending: false });

  if (start) query = query.gte('date', start);
  if (end) query = query.lte('date', end);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (includeUnresolved) {
    const { data: unresolved, error: unresolvedError } = await supabase
      .from('attendance')
      .select('date')
      .eq('user_id', user.id)
      .lt('date', todayDateInOffice())
      .not('check_in_at', 'is', null)
      .is('check_out_at', null)
      .order('date', { ascending: false })
      .limit(5);

    if (unresolvedError) {
      return NextResponse.json({ error: unresolvedError.message }, { status: 500 });
    }

    return NextResponse.json({ records: data, unresolvedPriorDays: unresolved ?? [] });
  }

  return NextResponse.json(data);
}
