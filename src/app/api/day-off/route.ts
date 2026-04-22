import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { dayOffChangeRequestSchema } from '@/lib/validation/day-off';
import { logActivity } from '@/lib/activity/log';
import {
  isoWeekForNow,
  isoWeekForNextWeek,
  effectiveDayOff,
  dateForIsoWeekday,
} from '@/lib/day-off/weeks';
import { todayDateInOffice } from '@/lib/utils/date';
import type { DayOfWeek } from '@/types';

const CHANGE_SELECT =
  'id, user_id, iso_year, iso_week, old_day, new_day, status, reason, admin_note, created_at, updated_at';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('day_off_changes')
    .select(CHANGE_SELECT)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = dayOffChangeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'Données invalides' },
      { status: 422 },
    );
  }

  const { target, new_day, reason } = parsed.data;
  const service = createServiceClient();

  const { data: profile } = await service
    .from('profiles')
    .select('id, is_active, default_day_off')
    .eq('id', user.id)
    .single();

  if (!profile?.is_active) {
    return NextResponse.json({ error: 'Compte inactif' }, { status: 403 });
  }

  const week = target === 'this_week' ? isoWeekForNow() : isoWeekForNextWeek();

  // Look up any existing approved override that would dictate the current "old_day"
  const { data: existingOverrides } = await service
    .from('day_off_changes')
    .select('iso_year, iso_week, new_day, status')
    .eq('user_id', user.id)
    .eq('iso_year', week.iso_year)
    .eq('iso_week', week.iso_week)
    .in('status', ['pending', 'approved']);

  const overrides = existingOverrides ?? [];

  // BR-4: no pending request overlap
  if (overrides.some((o) => o.status === 'pending')) {
    return NextResponse.json(
      { error: 'Une demande est déjà en attente pour cette semaine' },
      { status: 409 },
    );
  }

  const currentEffective = effectiveDayOff(
    profile.default_day_off as DayOfWeek,
    overrides,
    week.iso_year,
    week.iso_week,
  );

  // BR-3: new day must differ from current effective
  if (new_day === currentEffective) {
    return NextResponse.json(
      { error: 'Le jour choisi est déjà votre jour de repos' },
      { status: 422 },
    );
  }

  // BR-5: block if overlap with approved leave covering the target date
  const targetDate = dateForIsoWeekday(week.iso_year, week.iso_week, new_day);
  const { data: overlappingLeave } = await service
    .from('leave_requests')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'approved')
    .lte('start_date', targetDate)
    .gte('end_date', targetDate)
    .limit(1);

  if (overlappingLeave && overlappingLeave.length > 0) {
    return NextResponse.json(
      { error: 'Vous avez déjà un congé approuvé cette semaine' },
      { status: 409 },
    );
  }

  // EC-1: refuse targeting today if already checked in
  const today = todayDateInOffice();
  if (targetDate === today) {
    const { data: todayRow } = await service
      .from('attendance')
      .select('check_in_at')
      .eq('user_id', user.id)
      .eq('date', today)
      .maybeSingle();
    if (todayRow?.check_in_at) {
      return NextResponse.json(
        { error: "Vous avez déjà pointé aujourd'hui — le changement ne peut pas s'appliquer" },
        { status: 409 },
      );
    }
  }

  const { data, error } = await service
    .from('day_off_changes')
    .insert({
      user_id: user.id,
      iso_year: week.iso_year,
      iso_week: week.iso_week,
      old_day: currentEffective,
      new_day,
      status: 'pending',
      reason: reason ?? null,
      requested_by: user.id,
    })
    .select(CHANGE_SELECT)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logActivity({
    actorId: user.id,
    action: 'request_day_off_change',
    targetUserId: user.id,
    details: {
      change_id: data.id,
      iso_year: week.iso_year,
      iso_week: week.iso_week,
      old_day: currentEffective,
      new_day,
    },
  });

  return NextResponse.json(data, { status: 201 });
}
