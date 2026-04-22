import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import type { DayOffChangeListItem } from '@/types';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const service = createServiceClient();

  const [{ data: profile }, { data: changes, error }] = await Promise.all([
    service.from('profiles').select('id, default_day_off').eq('id', user.id).single(),
    service
      .from('day_off_changes')
      .select(
        'id, user_id, iso_year, iso_week, old_day, new_day, status, reason, admin_note, created_at, updated_at',
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  if (!profile) {
    return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 });
  }
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    default_day_off: profile.default_day_off,
    changes: (changes ?? []) as DayOffChangeListItem[],
  });
}
