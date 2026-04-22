import 'server-only';
import { NextResponse } from 'next/server';
import type { createServiceClient } from '@/lib/supabase/service';
import { dateForIsoWeekday } from './weeks';
import type { DayOfWeek } from '@/types';

type Service = ReturnType<typeof createServiceClient>;

interface DayOffChangeForSync {
  id: string;
  user_id: string;
  iso_year: number;
  iso_week: number;
  old_day: DayOfWeek;
  new_day: DayOfWeek;
}

/**
 * Apply an approval: upsert an attendance row with status='day_off' for the new_day date.
 * If the row already has check_in_at, abort with 409.
 */
export async function applyDayOffApproval(
  service: Service,
  change: DayOffChangeForSync,
  actorId: string,
): Promise<NextResponse | null> {
  const targetDate = dateForIsoWeekday(change.iso_year, change.iso_week, change.new_day);

  const { data: existing } = await service
    .from('attendance')
    .select('id, check_in_at, status')
    .eq('user_id', change.user_id)
    .eq('date', targetDate)
    .maybeSingle();

  if (existing?.check_in_at) {
    return NextResponse.json(
      { error: "Pointage existant — modifiez la présence avant d'approuver" },
      { status: 409 },
    );
  }

  if (existing?.status === 'leave') {
    return NextResponse.json(
      { error: "Un congé approuvé couvre déjà cette date" },
      { status: 409 },
    );
  }

  const { error } = await service.from('attendance').upsert(
    {
      user_id: change.user_id,
      date: targetDate,
      status: 'day_off' as const,
      late_minutes: 0,
      forgot_checkout: false,
      created_by: actorId,
      updated_by: actorId,
    },
    { onConflict: 'user_id,date' },
  );

  if (error) {
    return NextResponse.json(
      { error: "Changement enregistré, mais erreur lors de la création de la présence" },
      { status: 500 },
    );
  }

  return null;
}

/**
 * Roll back a previously approved change: delete the attendance row for new_day
 * only if it's still a passive day_off marker (no check-in/out).
 */
export async function rollbackDayOffApproval(
  service: Service,
  change: DayOffChangeForSync,
): Promise<NextResponse | null> {
  const targetDate = dateForIsoWeekday(change.iso_year, change.iso_week, change.new_day);

  const { error } = await service
    .from('attendance')
    .delete()
    .eq('user_id', change.user_id)
    .eq('date', targetDate)
    .eq('status', 'day_off')
    .is('check_in_at', null)
    .is('check_out_at', null);

  if (error) {
    return NextResponse.json(
      { error: 'Erreur lors de la réinitialisation de la présence' },
      { status: 500 },
    );
  }

  return null;
}
