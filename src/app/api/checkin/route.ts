import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { haversineDistance } from '@/lib/attendance/geo';
import { calcLateMinutes, resolveStatus } from '@/lib/attendance/status';
import { logActivity } from '@/lib/activity/log';
import { todayDateInOffice } from '@/lib/utils/date';
import {
  dayOfWeekEnum,
  effectiveDayOff,
  isoWeekForNow,
} from '@/lib/day-off/weeks';
import type { DayOfWeek } from '@/types';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const { latitude, longitude, accuracy, device_id, device_label } = body ?? {};

  if (
    typeof latitude !== 'number' ||
    !isFinite(latitude) ||
    typeof longitude !== 'number' ||
    !isFinite(longitude) ||
    typeof accuracy !== 'number' ||
    !isFinite(accuracy)
  ) {
    return NextResponse.json({ code: 'gps_unavailable', error: 'GPS indisponible' }, { status: 422 });
  }

  const service = createServiceClient();

  const week = isoWeekForNow();

  const [{ data: settings }, { data: profile }, { data: overrides }] = await Promise.all([
    service
      .from('office_settings')
      .select(
        'office_latitude, office_longitude, allowed_radius_meters, gps_accuracy_limit_meters, grace_period_minutes',
      )
      .single(),
    service
      .from('profiles')
      .select('work_start_time, default_day_off')
      .eq('id', user.id)
      .single(),
    service
      .from('day_off_changes')
      .select('iso_year, iso_week, new_day, status')
      .eq('user_id', user.id)
      .eq('iso_year', week.iso_year)
      .eq('iso_week', week.iso_week)
      .eq('status', 'approved'),
  ]);

  if (!settings) {
    return NextResponse.json({ error: 'Paramètres du bureau introuvables' }, { status: 500 });
  }
  if (!profile) {
    return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 });
  }

  const effective = effectiveDayOff(
    profile.default_day_off as DayOfWeek,
    overrides ?? [],
    week.iso_year,
    week.iso_week,
  );
  if (effective === dayOfWeekEnum(new Date())) {
    return NextResponse.json(
      {
        code: 'day_off',
        error: "Aujourd'hui est votre jour de repos — pas de pointage nécessaire",
      },
      { status: 422 },
    );
  }

  const distanceM = Math.round(
    haversineDistance(latitude, longitude, settings.office_latitude, settings.office_longitude),
  );
  const roundedAccuracy = Math.round(accuracy);

  if (accuracy > settings.gps_accuracy_limit_meters) {
    return NextResponse.json(
      {
        code: 'gps_accuracy_too_low',
        error: `Précision GPS insuffisante (${roundedAccuracy} m, maximum autorisé : ${settings.gps_accuracy_limit_meters} m)`,
        accuracy: roundedAccuracy,
        limit: settings.gps_accuracy_limit_meters,
        distance: distanceM,
        radius: settings.allowed_radius_meters,
      },
      { status: 422 },
    );
  }

  if (distanceM > settings.allowed_radius_meters) {
    console.warn('Attendance check-in rejected outside geofence', {
      user_id: user.id,
      distance_m: distanceM,
      radius_m: settings.allowed_radius_meters,
      accuracy_m: roundedAccuracy,
      gps_accuracy_limit_m: settings.gps_accuracy_limit_meters,
      latitude: roundCoordinate(latitude),
      longitude: roundCoordinate(longitude),
      user_agent: request.headers.get('user-agent'),
    });

    return NextResponse.json(
      {
        code: 'outside_geofence',
        error: `Vous êtes à ${distanceM} m du bureau (rayon autorisé : ${settings.allowed_radius_meters} m)`,
        distance: distanceM,
        radius: settings.allowed_radius_meters,
        accuracy: roundedAccuracy,
        limit: settings.gps_accuracy_limit_meters,
      },
      { status: 422 },
    );
  }

  const today = todayDateInOffice();

  const { data: existing } = await service
    .from('attendance')
    .select('id, check_in_at')
    .eq('user_id', user.id)
    .eq('date', today)
    .maybeSingle();

  if (existing?.check_in_at) {
    const time = new Date(existing.check_in_at).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Africa/Tunis',
    });
    return NextResponse.json(
      { error: `Vous avez déjà pointé votre arrivée à ${time}` },
      { status: 409 },
    );
  }

  const now = new Date();
  const gracePeriod = settings.grace_period_minutes ?? 10;
  const lateMinutes = calcLateMinutes(profile.work_start_time, gracePeriod, now);
  const status = resolveStatus(lateMinutes, gracePeriod);

  const { error: upsertError } = await service.from('attendance').upsert(
    {
      user_id: user.id,
      date: today,
      check_in_at: now.toISOString(),
      status,
      late_minutes: lateMinutes,
      check_in_latitude: latitude,
      check_in_longitude: longitude,
      check_in_accuracy_meters: accuracy,
      check_in_distance_meters: distanceM,
      forgot_checkout: false,
      ...(typeof device_id === 'string' && device_id ? { device_id, device_label: device_label ?? null } : {}),
    },
    { onConflict: 'user_id,date' },
  );

  if (upsertError) {
    return NextResponse.json({ error: 'Erreur lors du pointage' }, { status: 500 });
  }

  await logActivity({
    actorId: user.id,
    action: 'checkin',
    targetUserId: user.id,
    details: { date: today, status, late_minutes: lateMinutes, distance_m: distanceM, accuracy_m: roundedAccuracy },
  });

  return NextResponse.json({ success: true, status, late_minutes: lateMinutes });
}

function roundCoordinate(value: number): number {
  return Math.round(value * 100_000) / 100_000;
}
