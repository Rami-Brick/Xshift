'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatInTimeZone } from 'date-fns-tz';

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

interface LogEntry {
  id: string;
  action: string;
  created_at: string;
  details: Record<string, unknown>;
  actor: { full_name: string; email: string } | null;
  target: { full_name: string } | null;
}

interface LogsResponse {
  data: LogEntry[];
  total: number;
  page: number;
  limit: number;
}

export function LogsClient() {
  const [page, setPage] = useState(1);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const limit = 50;

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await fetch(`/api/logs?page=${page}`);
      if (res.ok) {
        const json: LogsResponse = await res.json();
        setLogs(json.data);
        setTotal(json.total);
      }
      setLoading(false);
    }
    load();
  }, [page]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      <div className="bg-surface rounded-xl shadow-softer overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted text-sm">Chargement…</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-muted text-sm">Aucune activité</div>
        ) : (
          <div className="divide-y divide-soft">
            {logs.map((log) => (
              <div key={log.id} className="px-4 py-3 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">
                    {ACTION_LABEL[log.action] ?? log.action}
                    {log.target && (
                      <span className="text-muted font-normal"> — {log.target.full_name}</span>
                    )}
                  </p>
                  <p className="text-caption text-muted mt-0.5">
                    {log.actor?.full_name ?? 'Système'}
                  </p>
                </div>
                <p className="text-caption text-muted whitespace-nowrap shrink-0">
                  {formatInTimeZone(new Date(log.created_at), OFFICE_TZ, 'dd/MM HH:mm')}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-caption text-muted">
            {total} entrées · Page {page}/{totalPages}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-xl bg-surface shadow-softer text-ink disabled:opacity-40 hover:bg-soft transition"
              aria-label="Page précédente"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-xl bg-surface shadow-softer text-ink disabled:opacity-40 hover:bg-soft transition"
              aria-label="Page suivante"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
