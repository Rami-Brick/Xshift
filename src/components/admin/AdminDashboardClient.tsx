'use client';

import useSWR from 'swr';
import { Users, Clock, Calendar, AlertCircle } from 'lucide-react';
import { KpiCard } from '@/design-kit/compounds/KpiCard';
import { formatInTimeZone } from 'date-fns-tz';

const OFFICE_TZ = 'Africa/Tunis';

interface StatsResponse {
  total_active: number;
  today: { present: number; late: number; absent: number; leave: number };
  month: { present: number; late: number; absent: number };
  pending_leave: number;
  recent_activity: Array<{
    id: string;
    action: string;
    created_at: string;
    actor: { full_name: string } | null;
  }>;
}

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
  update_settings: 'Paramètres mis à jour',
  login: 'Connexion',
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function AdminDashboardClient() {
  const { data: stats, isLoading } = useSWR<StatsResponse>('/api/admin/stats', fetcher, {
    refreshInterval: 60_000,
  });

  if (isLoading || !stats) {
    return (
      <div className="space-y-5">
        <h1 className="text-2xl font-bold text-ink tracking-tight">Tableau de bord</h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-surface rounded-xl p-5 shadow-softer animate-pulse h-24" />
          ))}
        </div>
      </div>
    );
  }

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
            value={stats.today.present}
            icon={Users}
            iconBg="blue"
          />
          <KpiCard
            title="En retard"
            value={stats.today.late}
            icon={Clock}
            iconBg="dark"
          />
          <KpiCard
            title="Absents"
            value={stats.today.absent}
            icon={AlertCircle}
            iconBg="black"
          />
          <KpiCard
            title="Congés en attente"
            value={stats.pending_leave}
            icon={Calendar}
            iconBg="dark"
          />
        </div>
      </div>

      {/* Month KPIs */}
      <div>
        <p className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">Ce mois</p>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-surface rounded-xl px-4 py-3 shadow-softer text-center">
            <p className="text-2xl font-bold text-ink">{stats.month.present}</p>
            <p className="text-caption text-muted mt-0.5">Présences</p>
          </div>
          <div className="bg-surface rounded-xl px-4 py-3 shadow-softer text-center">
            <p className="text-2xl font-bold text-trend-down">{stats.month.late}</p>
            <p className="text-caption text-muted mt-0.5">Retards</p>
          </div>
          <div className="bg-surface rounded-xl px-4 py-3 shadow-softer text-center">
            <p className="text-2xl font-bold text-trend-down">{stats.month.absent}</p>
            <p className="text-caption text-muted mt-0.5">Absences</p>
          </div>
        </div>
      </div>

      {/* Recent activity */}
      {stats.recent_activity.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">Activité récente</p>
          <div className="bg-surface rounded-xl shadow-softer overflow-hidden">
            {stats.recent_activity.map((log) => (
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
