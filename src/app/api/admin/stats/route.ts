import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/guards';
import { getAdminStats } from '@/lib/admin/stats';

export async function GET() {
  await requireAdmin();
  return NextResponse.json(await getAdminStats());
}
