import { NextResponse, type NextRequest } from 'next/server';
import { requireStaff } from '@/lib/auth/guards';
import { getReportsSummary, ReportsSummaryError } from '@/lib/reports/summary';

export async function GET(request: NextRequest) {
  await requireStaff();

  const { searchParams } = request.nextUrl;

  try {
    const summary = await getReportsSummary({
      start: searchParams.get('start'),
      end: searchParams.get('end'),
      user_id: searchParams.get('user_id'),
      status: searchParams.get('status'),
    });

    return NextResponse.json(summary);
  } catch (error) {
    if (error instanceof ReportsSummaryError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
