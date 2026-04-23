'use client';

import useSWR from 'swr';
import { Users, Clock, Calendar, AlertCircle, CalendarOff } from 'lucide-react';
import { KpiCard } from '@/design-kit/compounds/KpiCard';
import { formatInTimeZone } from 'date-fns-tz';
import type { AdminStats } from '@/types';

const OFFICE_TZ = 'Africa/Tunis';

const ACTION_LABEL: Record<string, string> = {
  checkin: 'Arrivée pointée',
  checkout: 'Départ pointé',
  create_employee: 'Employé créé',
  update_employee: 'Employé mis à jour',
  deactivate_employee: 'Employé désactivé',
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

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function AdminDashboardClient({ initialStats }: { initialStats: AdminStats }) {
  const { data: stats } = useSWR<AdminStats>('/api/admin/stats', fetcher, {
    fallbackData: initialStats,
    refreshInterval: 60_000,
  });
  const currentStats = stats ?? initialStats;

  const today = formatInTimeZone(new Date(), OFFICE_TZ, 'EEEE d MMMM yyyy');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink tracking-tight">Tableau de bord</h1>
        <p className="text-sm text-muted mt-0.5 capitalize">{today}</p>
      </div>

      {/* Today KPIs */}
      <div>
        <p className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">Aujourd&apos;hui</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard
            title="Présents"
            value={currentStats.today.present}
            icon={Users}
            iconBg="blue"
          />
          <KpiCard
            title="En retard"
            value={currentStats.today.late}
            icon={Clock}
            iconBg="dark"
          />
          <KpiCard
            title="Absents"
            value={currentStats.today.absent}
            icon={AlertCircle}
            iconBg="black"
          />
          <KpiCard
            title="Congés en attente"
            value={currentStats.pending_leave}
            icon={Calendar}
            iconBg="dark"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-3">
          <KpiCard
            title="Changements de repos"
            value={currentStats.pending_day_off_changes}
            icon={CalendarOff}
            iconBg="dark"
          />
        </div>
      </div>

      {/* Month KPIs */}
      <div>
        <p className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">Ce mois</p>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-surface rounded-xl px-4 py-3 shadow-softer text-center">
            <p className="text-2xl font-bold text-ink">{currentStats.month.present}</p>
            <p className="text-caption text-muted mt-0.5">Présences</p>
          </div>
          <div className="bg-surface rounded-xl px-4 py-3 shadow-softer text-center">
            <p className="text-2xl font-bold text-trend-down">{currentStats.month.late}</p>
            <p className="text-caption text-muted mt-0.5">Retards</p>
          </div>
          <div className="bg-surface rounded-xl px-4 py-3 shadow-softer text-center">
            <p className="text-2xl font-bold text-trend-down">{currentStats.month.absent}</p>
            <p className="text-caption text-muted mt-0.5">Absences</p>
          </div>
        </div>
      </div>

      {/* Recent activity */}
      {currentStats.recent_activity.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">Activité récente</p>
          <div className="bg-surface rounded-xl shadow-softer overflow-hidden">
            {currentStats.recent_activity.map((log) => (
              <div key={log.id} className="flex items-center justify-between px-4 py-3 border-b border-soft last:border-0">
                <div>
                  <p className="text-sm font-medium text-ink">
                    {ACTION_LABEL[log.action] ?? log.action}
                  </p>
                  <p className="text-caption text-muted">
                    {log.actor?.full_name ?? '—'}
                  </p>
                </div>
                <p className="text-caption text-muted whitespace-nowrap">
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
