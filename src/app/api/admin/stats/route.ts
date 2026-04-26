import { NextResponse, type NextRequest } from 'next/server';
import { requireStaff } from '@/lib/auth/guards';
import { getAdminStats } from '@/lib/admin/stats';

export async function GET(request: NextRequest) {
  await requireStaff();
  const date = request.nextUrl.searchParams.get('date') ?? undefined;
  const safeDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined;
  return NextResponse.json(await getAdminStats(safeDate));
}
