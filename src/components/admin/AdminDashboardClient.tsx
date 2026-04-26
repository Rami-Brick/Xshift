'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { addDays, parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { fr } from 'date-fns/locale';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coffee,
  Medal,
  Plane,
  XCircle,
  Calendar,
  CalendarOff,
  type LucideIcon,
} from 'lucide-react';
import { InitialAvatar } from '@/design-kit/primitives/InitialAvatar';
import { DAY_OFF_LABELS_FR } from '@/lib/day-off/weeks';
import type {
  AdminStats,
  PendingDayOffItem,
  PendingLeaveItem,
  RosterEntry,
  RosterStatus,
} from '@/types';

const OFFICE_TZ = 'Africa/Tunis';

const ACTION_LABEL: Record<string, string> = {
  checkin: 'Arrivée pointée',
  checkout: 'Départ pointé',
  create_employee: 'Employé créé',
  update_employee: 'Employé mis à jour',
  deactivate_employee: 'Employé désactivé',
  delete_employee: 'Employé supprimé',
  update_attendance: 'Présence modifiée',
  manual_attendance: 'Présence manuelle',
  delete_attendance: 'Présence supprimée',
  request_leave: 'Congé demandé',
  approve_leave: 'Congé approuvé',
  reject_leave: 'Congé refusé',
  cancel_leave: 'Congé annulé',
  assign_leave: 'Congé assigné',
  update_leave: 'Congé modifié',
  delete_leave: 'Congé supprimé',
  update_settings: 'Paramètres mis à jour',
  login: 'Connexion',
  request_day_off_change: 'Changement de repos demandé',
  approve_day_off_change: 'Changement de repos approuvé',
  reject_day_off_change: 'Changement de repos refusé',
  cancel_day_off_change: 'Changement de repos annulé',
  assign_day_off_change: 'Changement de repos assigné',
  update_day_off_change: 'Changement de repos modifié',
  delete_day_off_change: 'Changement de repos supprimé',
  update_default_day_off: 'Jour de repos par défaut modifié',
};

const LEAVE_TYPE_LABEL: Record<string, string> = {
  annual: 'Annuel',
  sick: 'Maladie',
  unpaid: 'Sans solde',
  other: 'Autre',
};

const STATUS_META: Record<
  RosterStatus,
  { label: string; pillBg: string; pillText: string }
> = {
  present: { label: 'À l’heure', pillBg: 'bg-[#7FD3A8]', pillText: 'text-[#053D1B]' },
  late: { label: 'En retard', pillBg: 'bg-[#FFC966]', pillText: 'text-[#3D2600]' },
  not_yet: { label: 'Pas encore', pillBg: 'bg-soft', pillText: 'text-muted' },
  on_leave: { label: 'En congé', pillBg: 'bg-[#88AAF0]', pillText: 'text-[#0A2660]' },
  day_off: { label: 'Repos', pillBg: 'bg-soft', pillText: 'text-muted' },
  absent: { label: 'Absent', pillBg: 'bg-[#EE8585]', pillText: 'text-[#4D0808]' },
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function AdminDashboardClient({ initialStats }: { initialStats: AdminStats }) {
  const [date, setDate] = useState<string>(initialStats.date);

  const { data: stats } = useSWR<AdminStats>(
    `/api/admin/stats?date=${date}`,
    fetcher,
    {
      fallbackData: date === initialStats.date ? initialStats : undefined,
      refreshInterval: 60_000,
      keepPreviousData: true,
    },
  );

  const currentStats = stats ?? initialStats;
  const isToday = currentStats.is_today;

  const todayDate = useMemo(
    () => formatInTimeZone(new Date(), OFFICE_TZ, 'yyyy-MM-dd'),
    [],
  );

  function shiftDay(delta: number) {
    const next = addDays(parseISO(`${date}T12:00:00`), delta);
    const nextStr = formatInTimeZone(next, OFFICE_TZ, 'yyyy-MM-dd');
    if (nextStr > todayDate) return;
    setDate(nextStr);
  }

  const dateLabel = formatInTimeZone(
    parseISO(`${currentStats.date}T12:00:00`),
    OFFICE_TZ,
    'EEEE d MMMM',
    { locale: fr },
  );

  const ordered = useMemo(() => orderRoster(currentStats.roster), [currentStats.roster]);
  const counts = countByStatus(currentStats.roster);
  const expected = currentStats.total_active - counts.on_leave - counts.day_off;
  const arrivedOnTime = counts.present;
  const arrivedLate = counts.late;
  const arrivedTotal = arrivedOnTime + arrivedLate;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-ink tracking-tight">Tableau de bord</h1>
          <SummaryChips
            arrivedTotal={arrivedTotal}
            expected={expected}
            late={counts.late}
            absent={counts.absent}
            onLeave={counts.on_leave}
            dayOff={counts.day_off}
          />
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => shiftDay(-1)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-surface shadow-softer text-ink hover:bg-soft"
            aria-label="Jour précédent"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="px-3 h-9 inline-flex items-center rounded-full bg-surface shadow-softer text-sm font-semibold text-ink capitalize min-w-[140px] justify-center">
            {dateLabel}
          </div>
          <button
            type="button"
            onClick={() => shiftDay(1)}
            disabled={currentStats.date >= todayDate}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-surface shadow-softer text-ink hover:bg-soft disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Jour suivant"
          >
            <ChevronRight size={18} />
          </button>
          {!isToday && (
            <button
              type="button"
              onClick={() => setDate(todayDate)}
              className="ml-1 px-3 h-9 rounded-full bg-ink text-white text-sm font-semibold hover:bg-navSlate"
            >
              Aujourd&apos;hui
            </button>
          )}
        </div>
      </div>

      {/* Roster grid */}
      {ordered.length === 0 ? (
        <div className="bg-surface rounded-xl shadow-softer p-8 text-center">
          <p className="text-sm text-muted">Aucun employé actif</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {ordered.map(({ entry, rank }) => (
            <RosterTile key={entry.user_id} entry={entry} rank={rank} isToday={isToday} />
          ))}
        </div>
      )}

      {/* Needs attention */}
      {(currentStats.pending_leave.length > 0 ||
        currentStats.pending_day_off_changes.length > 0) && (
        <div>
          <p className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">
            À traiter
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {currentStats.pending_leave.length > 0 && (
              <PendingLeaveCard items={currentStats.pending_leave} />
            )}
            {currentStats.pending_day_off_changes.length > 0 && (
              <PendingDayOffCard items={currentStats.pending_day_off_changes} />
            )}
          </div>
        </div>
      )}

      {/* Recent activity */}
      {currentStats.recent_activity.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">
            Activité récente
          </p>
          <div className="bg-surface rounded-xl shadow-softer overflow-hidden">
            {currentStats.recent_activity.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between px-4 py-3 border-b border-soft last:border-0"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink truncate">
                    {ACTION_LABEL[log.action] ?? log.action}
                  </p>
                  <p className="text-caption text-muted truncate">
                    {log.actor?.full_name ?? '—'}
                  </p>
                </div>
                <p className="text-caption text-muted whitespace-nowrap ml-3">
                  {formatInTimeZone(new Date(log.created_at), OFFICE_TZ, 'HH:mm')}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryChips({
  arrivedTotal,
  expected,
  late,
  absent,
  onLeave,
  dayOff,
}: {
  arrivedTotal: number;
  expected: number;
  late: number;
  absent: number;
  onLeave: number;
  dayOff: number;
}) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      <Chip
        icon={CheckCircle2}
        label={`${arrivedTotal}/${expected}`}
        bg="bg-[#7FD3A8]"
        fg="text-[#053D1B]"
      />
      {late > 0 && (
        <Chip icon={Clock} label={String(late)} bg="bg-[#FFC966]" fg="text-[#3D2600]" />
      )}
      {absent > 0 && (
        <Chip icon={XCircle} label={String(absent)} bg="bg-[#EE8585]" fg="text-[#4D0808]" />
      )}
      {onLeave > 0 && (
        <Chip icon={Plane} label={String(onLeave)} bg="bg-[#88AAF0]" fg="text-[#0A2660]" />
      )}
      {dayOff > 0 && (
        <Chip icon={Coffee} label={String(dayOff)} bg="bg-soft" fg="text-muted" />
      )}
    </div>
  );
}

function Chip({
  icon: Icon,
  label,
  bg,
  fg,
}: {
  icon: LucideIcon;
  label: string;
  bg: string;
  fg: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 h-7 px-2.5 rounded-pill text-sm font-semibold tabular-nums ${bg} ${fg}`}
    >
      <Icon size={14} strokeWidth={2.25} />
      {label}
    </span>
  );
}

function RosterTile({
  entry,
  rank,
  isToday,
}: {
  entry: RosterEntry;
  rank: number | null;
  isToday: boolean;
}) {
  const meta = STATUS_META[entry.status];
  const detail = rosterDetail(entry, isToday);

  return (
    <Link
      href={`/admin/employees/${entry.user_id}`}
      className="group relative bg-surface rounded-xl shadow-softer p-3 flex flex-col items-center text-center transition hover:shadow-soft hover:-translate-y-0.5"
    >
      {rank !== null && rank <= 3 && <RankMedal rank={rank} />}
      <InitialAvatar name={entry.full_name} size={56} tone="gradient" />
      <p className="mt-2 text-sm font-semibold text-ink truncate w-full leading-tight">
        {entry.full_name}
      </p>
      <p className="text-caption text-muted truncate w-full leading-tight mt-0.5">
        {detail}
      </p>
      <span
        className={`mt-2 inline-flex items-center rounded-pill px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide leading-none h-5 ${meta.pillBg} ${meta.pillText}`}
      >
        {meta.label}
      </span>
    </Link>
  );
}

function RankMedal({ rank }: { rank: number }) {
  const style = MEDAL_STYLES[rank];
  if (!style) return null;
  const label = rank === 1 ? 'Médaille d’or' : rank === 2 ? 'Médaille d’argent' : 'Médaille de bronze';
  return (
    <span
      aria-label={label}
      className="absolute top-1.5 right-1.5"
      style={{
        color: style.color,
        filter: `drop-shadow(0 1px 2px ${style.shadow})`,
      }}
    >
      <Medal size={20} strokeWidth={2.25} fill={style.fill} />
    </span>
  );
}

const MEDAL_STYLES: Record<number, { color: string; fill: string; shadow: string }> = {
  1: { color: '#B97B00', fill: '#FFD24A', shadow: 'rgba(180, 120, 0, 0.5)' },
  2: { color: '#7A8089', fill: '#D8DCE2', shadow: 'rgba(120, 125, 135, 0.45)' },
  3: { color: '#834E14', fill: '#D89561', shadow: 'rgba(140, 80, 30, 0.5)' },
};

function rosterDetail(entry: RosterEntry, isToday: boolean): string {
  switch (entry.status) {
    case 'present':
      return entry.check_in_at ? formatTime(entry.check_in_at) : 'À l’heure';
    case 'late':
      return entry.check_in_at
        ? `${formatTime(entry.check_in_at)} · +${entry.late_minutes} min`
        : `+${entry.late_minutes} min`;
    case 'not_yet':
      return isToday ? 'Pas encore arrivé' : 'Aucun pointage';
    case 'absent':
      return 'Aucun pointage';
    case 'on_leave':
      return 'En congé';
    case 'day_off':
      return 'Jour de repos';
  }
}

function formatTime(ts: string): string {
  return formatInTimeZone(new Date(ts), OFFICE_TZ, 'HH:mm');
}

function countByStatus(roster: RosterEntry[]): Record<RosterStatus, number> {
  const counts: Record<RosterStatus, number> = {
    present: 0,
    late: 0,
    not_yet: 0,
    absent: 0,
    on_leave: 0,
    day_off: 0,
  };
  for (const r of roster) counts[r.status] += 1;
  return counts;
}

const NON_ARRIVAL_ORDER: Record<RosterStatus, number> = {
  present: 0,
  late: 0,
  not_yet: 1,
  on_leave: 2,
  day_off: 3,
  absent: 4,
};

function orderRoster(
  roster: RosterEntry[],
): Array<{ entry: RosterEntry; rank: number | null }> {
  const arrived: RosterEntry[] = [];
  const others: RosterEntry[] = [];

  for (const r of roster) {
    if (r.check_in_at && (r.status === 'present' || r.status === 'late')) {
      arrived.push(r);
    } else {
      others.push(r);
    }
  }

  arrived.sort((a, b) => {
    const ta = a.check_in_at ? new Date(a.check_in_at).getTime() : Infinity;
    const tb = b.check_in_at ? new Date(b.check_in_at).getTime() : Infinity;
    if (ta !== tb) return ta - tb;
    return a.full_name.localeCompare(b.full_name);
  });

  others.sort((a, b) => {
    const diff = NON_ARRIVAL_ORDER[a.status] - NON_ARRIVAL_ORDER[b.status];
    if (diff !== 0) return diff;
    return a.full_name.localeCompare(b.full_name);
  });

  const ranked = arrived.map((entry, i) => ({ entry, rank: i + 1 }));
  const unranked = others.map((entry) => ({ entry, rank: null as number | null }));
  return [...ranked, ...unranked];
}

function PendingLeaveCard({ items }: { items: PendingLeaveItem[] }) {
  return (
    <Link
      href="/admin/leave"
      className="bg-surface rounded-xl shadow-softer p-4 hover:shadow-soft transition block"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-soft">
            <Calendar size={16} className="text-ink" />
          </span>
          <p className="text-sm font-semibold text-ink">Congés en attente</p>
        </div>
        <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 rounded-pill bg-ink text-white text-xs font-bold">
          {items.length}
        </span>
      </div>
      <ul className="space-y-2">
        {items.slice(0, 3).map((item) => (
          <li key={item.id} className="flex items-center gap-2.5">
            <InitialAvatar name={item.full_name} size={32} tone="gradient" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink truncate leading-tight">
                {item.full_name}
              </p>
              <p className="text-caption text-muted truncate leading-tight mt-0.5">
                {LEAVE_TYPE_LABEL[item.type] ?? item.type} ·{' '}
                {formatRange(item.start_date, item.end_date)}
              </p>
            </div>
          </li>
        ))}
      </ul>
      {items.length > 3 && (
        <p className="text-caption text-muted mt-3">
          +{items.length - 3} autre{items.length - 3 > 1 ? 's' : ''}
        </p>
      )}
    </Link>
  );
}

function PendingDayOffCard({ items }: { items: PendingDayOffItem[] }) {
  return (
    <Link
      href="/admin/day-off"
      className="bg-surface rounded-xl shadow-softer p-4 hover:shadow-soft transition block"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-soft">
            <CalendarOff size={16} className="text-ink" />
          </span>
          <p className="text-sm font-semibold text-ink">Changements de repos</p>
        </div>
        <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 rounded-pill bg-ink text-white text-xs font-bold">
          {items.length}
        </span>
      </div>
      <ul className="space-y-2">
        {items.slice(0, 3).map((item) => (
          <li key={item.id} className="flex items-center gap-2.5">
            <InitialAvatar name={item.full_name} size={32} tone="gradient" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink truncate leading-tight">
                {item.full_name}
              </p>
              <p className="text-caption text-muted truncate leading-tight mt-0.5">
                {DAY_OFF_LABELS_FR[item.old_day]} → {DAY_OFF_LABELS_FR[item.new_day]} · S
                {item.iso_week}
              </p>
            </div>
          </li>
        ))}
      </ul>
      {items.length > 3 && (
        <p className="text-caption text-muted mt-3">
          +{items.length - 3} autre{items.length - 3 > 1 ? 's' : ''}
        </p>
      )}
    </Link>
  );
}

function formatRange(start: string, end: string): string {
  if (start === end) {
    return formatInTimeZone(parseISO(`${start}T12:00:00`), OFFICE_TZ, 'd MMM', { locale: fr });
  }
  const startStr = formatInTimeZone(parseISO(`${start}T12:00:00`), OFFICE_TZ, 'd MMM', {
    locale: fr,
  });
  const endStr = formatInTimeZone(parseISO(`${end}T12:00:00`), OFFICE_TZ, 'd MMM', { locale: fr });
  return `${startStr} – ${endStr}`;
}
