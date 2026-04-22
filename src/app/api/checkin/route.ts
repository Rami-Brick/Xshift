import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { haversineDistance } from '@/lib/attendance/geo';
import { calcLateMinutes, resolveStatus } from '@/lib/attendance/status';
import { logActivity } from '@/lib/activity/log';
import { todayDateInOffice } from '@/lib/utils/date';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const { latitude, longitude, accuracy } = body ?? {};

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

  const [{ data: settings }, { data: profile }] = await Promise.all([
    service.from('office_settings').select('*').single(),
    service.from('profiles').select('work_start_time').eq('id', user.id).single(),
  ]);

  if (!settings) {
    return NextResponse.json({ error: 'Paramètres du bureau introuvables' }, { status: 500 });
  }
  if (!profile) {
    return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 });
  }

  if (accuracy > settings.gps_accuracy_limit_meters) {
    return NextResponse.json(
      {
        code: 'gps_accuracy_too_low',
        error: `Précision GPS insuffisante (${Math.round(accuracy)} m, maximum autorisé : ${settings.gps_accuracy_limit_meters} m)`,
        accuracy: Math.round(accuracy),
        limit: settings.gps_accuracy_limit_meters,
      },
      { status: 422 },
    );
  }

  const distanceM = Math.round(
    haversineDistance(latitude, longitude, settings.office_latitude, settings.office_longitude),
  );

  if (distanceM > settings.allowed_radius_meters) {
    return NextResponse.json(
      {
        code: 'outside_geofence',
        error: `Vous êtes à ${distanceM} m du bureau (rayon autorisé : ${settings.allowed_radius_meters} m)`,
        distance: distanceM,
        radius: settings.allowed_radius_meters,
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
    details: { date: today, status, late_minutes: lateMinutes, distance_m: distanceM },
  });

  return NextResponse.json({ success: true, status, late_minutes: lateMinutes });
}
