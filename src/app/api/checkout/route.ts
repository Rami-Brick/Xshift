import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { haversineDistance } from '@/lib/attendance/geo';
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
  const today = todayDateInOffice();

  const [{ data: settings }, { data: existing }] = await Promise.all([
    service
      .from('office_settings')
      .select('office_latitude, office_longitude, allowed_radius_meters, gps_accuracy_limit_meters')
      .single(),
    service
      .from('attendance')
      .select('id, check_in_at, check_out_at')
      .eq('user_id', user.id)
      .eq('date', today)
      .maybeSingle(),
  ]);

  if (!settings) {
    return NextResponse.json({ error: 'Paramètres du bureau introuvables' }, { status: 500 });
  }

  if (!existing?.check_in_at) {
    return NextResponse.json(
      { error: "Vous devez pointer votre arrivée avant le départ" },
      { status: 422 },
    );
  }

  if (existing.check_out_at) {
    const time = new Date(existing.check_out_at).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Africa/Tunis',
    });
    return NextResponse.json(
      { error: `Vous avez déjà pointé votre départ à ${time}` },
      { status: 409 },
    );
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

  const now = new Date();

  const { error: updateError } = await service
    .from('attendance')
    .update({
      check_out_at: now.toISOString(),
      check_out_latitude: latitude,
      check_out_longitude: longitude,
      check_out_accuracy_meters: accuracy,
      check_out_distance_meters: distanceM,
      forgot_checkout: false,
      ...(typeof device_id === 'string' && device_id ? { device_id, device_label: device_label ?? null } : {}),
    })
    .eq('id', existing.id);

  if (updateError) {
    return NextResponse.json({ error: 'Erreur lors du pointage de départ' }, { status: 500 });
  }

  await logActivity({
    actorId: user.id,
    action: 'checkout',
    targetUserId: user.id,
    details: { date: today, distance_m: distanceM },
  });

  return NextResponse.json({ success: true });
}
