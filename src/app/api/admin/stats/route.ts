import { NextResponse } from 'next/server';
import { requireStaff } from '@/lib/auth/guards';
import { getAdminStats } from '@/lib/admin/stats';

export async function GET() {
  await requireStaff();
  return NextResponse.json(await getAdminStats());
}
