import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const endpoint = request.nextUrl.searchParams.get('endpoint');

  if (!endpoint) {
    return NextResponse.json({ subscribed: false });
  }

  const service = createServiceClient();

  const { data } = await service
    .from('push_subscriptions')
    .select('id')
    .eq('user_id', user.id)
    .eq('endpoint', endpoint)
    .eq('enabled', true)
    .maybeSingle();

  return NextResponse.json({ subscribed: Boolean(data) });
}
