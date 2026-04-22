import { NextResponse, type NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { requireAdmin } from '@/lib/auth/guards';

export async function GET(request: NextRequest) {
  await requireAdmin();
  const service = createServiceClient();

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const limit = 50;
  const offset = (page - 1) * limit;

  const { data, error, count } = await service
    .from('activity_logs')
    .select(
      'id, action, created_at, details, actor:profiles!activity_logs_actor_id_fkey(full_name, email), target:profiles!activity_logs_target_user_id_fkey(full_name)',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data, total: count ?? 0, page, limit });
}
