import { NextResponse, type NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { requireAdmin } from '@/lib/auth/guards';
import { z } from 'zod';
import { logActivity } from '@/lib/activity/log';

const schema = z.object({
  password: z.string().min(4, 'Mot de passe requis (min. 4 caractères)'),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { userId: actorId } = await requireAdmin();
  const { id } = await params;

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'Données invalides' },
      { status: 422 },
    );
  }

  const service = createServiceClient();

  const { error } = await service.auth.admin.updateUserById(id, {
    password: parsed.data.password,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logActivity({
    actorId,
    action: 'update_employee',
    targetUserId: id,
    details: { password_changed: true },
  });

  return NextResponse.json({ success: true });
}
