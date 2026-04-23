import { NextResponse, type NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth/guards';
import { createServiceClient } from '@/lib/supabase/service';
import { adminDayOffSchema } from '@/lib/validation/day-off';
import { logActivity } from '@/lib/activity/log';
import { applyDayOffApproval } from '@/lib/day-off/attendance-sync';
import {
  isoWeekForNow,
  isoWeekForNextWeek,
  effectiveDayOff,
} from '@/lib/day-off/weeks';
import type { ActivityAction, DayOfWeek } from '@/types';

const CHANGE_SELECT =
  'id, user_id, iso_year, iso_week, old_day, new_day, status, reason, admin_note, created_at, updated_at, profiles!day_off_changes_user_id_fkey(id, full_name, email)';

export async function GET(request: NextRequest) {
  await requireAdmin();
  const service = createServiceClient();
  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get('status');
  const userId = searchParams.get('user_id');

  let query = service
    .from('day_off_changes')
    .select(CHANGE_SELECT)
    .order('created_at', { ascending: false });

  if (statusParam) query = query.eq('status', statusParam);
  if (userId) query = query.eq('user_id', userId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data ?? []).map(normalizeResponse);
  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const { userId: actorId } = await requireAdmin();

  const body = await request.json().catch(() => null);
  const parsed = adminDayOffSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'Données invalides' },
      { status: 422 },
    );
  }

  const { user_id, target, new_day, status, reason, admin_note } = parsed.data;
  const nextStatus = status ?? 'approved';
  const service = createServiceClient();

  const { data: profile } = await service
    .from('profiles')
    .select('id, is_active, default_day_off')
    .eq('id', user_id)
    .single();

  if (!profile?.is_active) {
    return NextResponse.json({ error: 'Employé introuvable ou inactif' }, { status: 404 });
  }

  const week =
    typeof target === 'string'
      ? target === 'this_week'
        ? isoWeekForNow()
        : isoWeekForNextWeek()
      : { iso_year: target.iso_year, iso_week: target.iso_week };

  // Compute old_day for audit
  const { data: existingOverrides } = await service
    .from('day_off_changes')
    .select('iso_year, iso_week, new_day, status')
    .eq('user_id', user_id)
    .eq('iso_year', week.iso_year)
    .eq('iso_week', week.iso_week);

  const old_day = effectiveDayOff(
    profile.default_day_off as DayOfWeek,
    existingOverrides ?? [],
    week.iso_year,
    week.iso_week,
  );

  if (new_day === old_day) {
    return NextResponse.json(
      { error: 'Le nouveau jour doit être différent du jour actuel' },
      { status: 422 },
    );
  }

  // Cancel any previous pending/approved row for the same week (keeps the unique partial index happy).
  await service
    .from('day_off_changes')
    .update({ status: 'cancelled', reviewed_by: actorId, reviewed_at: new Date().toISOString() })
    .eq('user_id', user_id)
    .eq('iso_year', week.iso_year)
    .eq('iso_week', week.iso_week)
    .in('status', ['pending', 'approved']);

  const { data, error } = await service
    .from('day_off_changes')
    .insert({
      user_id,
      iso_year: week.iso_year,
      iso_week: week.iso_week,
      old_day,
      new_day,
      status: nextStatus,
      reason: reason ?? null,
      admin_note: admin_note ?? null,
      requested_by: actorId,
      reviewed_by: actorId,
      reviewed_at: new Date().toISOString(),
    })
    .select(CHANGE_SELECT)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (nextStatus === 'approved') {
    const err = await applyDayOffApproval(
      service,
      {
        id: data.id,
        user_id,
        iso_year: week.iso_year,
        iso_week: week.iso_week,
        old_day,
        new_day,
      },
      actorId,
    );
    if (err) return err;
  }

  const action: ActivityAction =
    nextStatus === 'approved' ? 'assign_day_off_change' : 'update_day_off_change';

  await logActivity({
    actorId,
    action,
    targetUserId: user_id,
    details: {
      change_id: data.id,
      iso_year: week.iso_year,
      iso_week: week.iso_week,
      old_day,
      new_day,
      status: nextStatus,
    },
  });

  return NextResponse.json(normalizeResponse(data), { status: 201 });
}

function normalizeResponse<T extends { profiles?: unknown }>(row: T): T {
  if (Array.isArray(row.profiles)) {
    return { ...row, profiles: row.profiles[0] ?? null };
  }
  return row;
}
