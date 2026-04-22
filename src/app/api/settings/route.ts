import { NextResponse, type NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { requireAdmin } from '@/lib/auth/guards';
import { settingsSchema } from '@/lib/validation/settings';
import { logActivity } from '@/lib/activity/log';

export async function GET() {
  await requireAdmin();
  const service = createServiceClient();

  const { data, error } = await service.from('office_settings').select('*').single();

  if (error || !data) {
    return NextResponse.json({ error: 'Paramètres introuvables' }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function PUT(request: NextRequest) {
  const { userId: actorId } = await requireAdmin();
  const service = createServiceClient();

  const body = await request.json().catch(() => null);
  const parsed = settingsSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'Données invalides' },
      { status: 422 },
    );
  }

  const { data: existing } = await service.from('office_settings').select('id').single();

  if (!existing) {
    return NextResponse.json({ error: 'Paramètres introuvables' }, { status: 404 });
  }

  const { data, error } = await service
    .from('office_settings')
    .update({ ...parsed.data, updated_by: actorId })
    .eq('id', existing.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logActivity({
    actorId,
    action: 'update_settings',
    details: parsed.data,
  });

  return NextResponse.json(data);
}
