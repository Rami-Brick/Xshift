import { NextResponse, type NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { requireAdmin } from '@/lib/auth/guards';
import { createEmployeeSchema } from '@/lib/validation/employee';
import { logActivity } from '@/lib/activity/log';

export async function GET(request: NextRequest) {
  const { userId } = await requireAdmin();
  void userId;

  const service = createServiceClient();
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('q') ?? '';
  const activeOnly = searchParams.get('active') !== 'false';

  let query = service
    .from('profiles')
    .select(
      'id, full_name, email, phone, position, department, role, work_start_time, work_end_time, leave_balance, is_active, avatar_url, created_at, updated_at',
    )
    .order('full_name', { ascending: true });

  if (activeOnly) query = query.eq('is_active', true);
  if (search) query = query.ilike('full_name', `%${search}%`);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const { userId: actorId } = await requireAdmin();

  const body = await request.json().catch(() => null);
  const parsed = createEmployeeSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'Données invalides' },
      { status: 422 },
    );
  }

  const { email, password, full_name, phone, position, department, work_start_time, work_end_time, leave_balance, role } = parsed.data;

  const service = createServiceClient();

  // Fetch default times from office_settings
  const { data: settings } = await service.from('office_settings').select('default_work_start_time, default_work_end_time').single();

  const { data: authUser, error: authError } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError || !authUser.user) {
    return NextResponse.json(
      { error: authError?.message ?? 'Erreur lors de la création du compte' },
      { status: 500 },
    );
  }

  // Upsert instead of insert: the on_auth_user_created trigger may have already
  // inserted a sparse row (id, email, full_name, role only). We overwrite it with
  // the full data the admin provided.
  const { error: profileError } = await service.from('profiles').upsert({
    id: authUser.user.id,
    full_name,
    email,
    phone: phone ?? null,
    position: position ?? null,
    department: department ?? null,
    role: role ?? 'employee',
    work_start_time: work_start_time ?? settings?.default_work_start_time ?? '08:30',
    work_end_time: work_end_time ?? settings?.default_work_end_time ?? '17:30',
    leave_balance: leave_balance ?? 0,
    is_active: true,
  }, { onConflict: 'id' });

  if (profileError) {
    // Rollback auth user
    await service.auth.admin.deleteUser(authUser.user.id);
    return NextResponse.json(
      { error: 'Erreur lors de la création du profil' },
      { status: 500 },
    );
  }

  await logActivity({
    actorId,
    action: 'create_employee',
    targetUserId: authUser.user.id,
    details: { email, full_name },
  });

  // Return the new profile
  const { data: newProfile } = await service
    .from('profiles')
    .select(
      'id, full_name, email, phone, position, department, role, work_start_time, work_end_time, leave_balance, is_active, avatar_url, created_at, updated_at',
    )
    .eq('id', authUser.user.id)
    .single();
  return NextResponse.json(newProfile, { status: 201 });
}
