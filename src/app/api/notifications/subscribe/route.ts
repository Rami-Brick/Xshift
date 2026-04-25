import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { pushSubscriptionSchema } from '@/lib/validation/notifications';
import { isStaffRole } from '@/lib/auth/roles';
import type { Role } from '@/types';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = pushSubscriptionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'Données invalides' },
      { status: 422 },
    );
  }

  const service = createServiceClient();

  const { data: profile } = await service
    .from('profiles')
    .select('id, is_active, role')
    .eq('id', user.id)
    .single();

  if (!profile?.is_active) {
    return NextResponse.json({ error: 'Profil introuvable ou inactif' }, { status: 403 });
  }

  if (!isStaffRole(profile.role as Role)) {
    return NextResponse.json(
      { error: 'Notifications réservées aux managers et administrateurs' },
      { status: 403 },
    );
  }

  const { endpoint, keys, device_label } = parsed.data;
  const userAgent = request.headers.get('user-agent');

  const { error: deleteError } = await service
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', endpoint)
    .neq('user_id', user.id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  const { error: upsertError } = await service.from('push_subscriptions').upsert(
    {
      user_id: user.id,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      user_agent: userAgent,
      device_label: device_label ?? null,
      enabled: true,
      failure_count: 0,
      last_failure_at: null,
    },
    { onConflict: 'endpoint' },
  );

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
