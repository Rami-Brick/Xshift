import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { leaveRequestSchema } from '@/lib/validation/leave';
import { logActivity } from '@/lib/activity/log';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('leave_requests')
    .select('id, user_id, start_date, end_date, type, status, reason, admin_note, deduct_balance, created_at, updated_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = leaveRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'Données invalides' },
      { status: 422 },
    );
  }

  const { start_date, end_date, type, reason } = parsed.data;

  if (end_date < start_date) {
    return NextResponse.json(
      { error: 'La date de fin doit être après la date de début' },
      { status: 422 },
    );
  }

  const service = createServiceClient();

  const { data: profile } = await service
    .from('profiles')
    .select('id, is_active')
    .eq('id', user.id)
    .single();

  if (!profile?.is_active) {
    return NextResponse.json({ error: 'Profil introuvable ou inactif' }, { status: 403 });
  }

  const { data, error } = await service
    .from('leave_requests')
    .insert({
      user_id: user.id,
      start_date,
      end_date,
      type,
      reason: reason ?? null,
      status: 'pending',
      requested_by: user.id,
    })
    .select('id, user_id, start_date, end_date, type, status, reason, admin_note, deduct_balance, created_at, updated_at')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logActivity({
    actorId: user.id,
    action: 'request_leave',
    targetUserId: user.id,
    details: { start_date, end_date, type },
  });

  return NextResponse.json(data, { status: 201 });
}
