'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { formatInTimeZone } from 'date-fns-tz';
import { startOfMonth, endOfMonth } from 'date-fns';
import type { Profile } from '@/types';

const OFFICE_TZ = 'Africa/Tunis';

interface Props {
  employees: Pick<Profile, 'id' | 'full_name'>[];
}

export function ReportsClient({ employees }: Props) {
  const now = new Date();
  const [userId, setUserId] = useState('');
  const [status, setStatus] = useState('');
  const [start, setStart] = useState(formatInTimeZone(startOfMonth(now), OFFICE_TZ, 'yyyy-MM-dd'));
  const [end, setEnd] = useState(formatInTimeZone(endOfMonth(now), OFFICE_TZ, 'yyyy-MM-dd'));

  function buildUrl() {
    const params = new URLSearchParams({ start, end });
    if (userId) params.set('user_id', userId);
    if (status) params.set('status', status);
    return `/api/reports/attendance.csv?${params.toString()}`;
  }

  return (
    <div className="bg-surface rounded-xl p-6 shadow-softer space-y-5 max-w-lg">
      <p className="text-sm font-semibold text-muted uppercase tracking-wide">Export CSV — Présences</p>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-caption font-medium text-muted">Du</label>
            <input
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className={inputCls}
            />
          </div>
          <div className="space-y-1">
            <label className="text-caption font-medium text-muted">Au</label>
            <input
              type="date"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-caption font-medium text-muted">Employé</label>
          <select value={userId} onChange={(e) => setUserId(e.target.value)} className={inputCls}>
            <option value="">Tous</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>{e.full_name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-caption font-medium text-muted">Statut</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
            <option value="">Tous</option>
            <option value="present">Présent</option>
            <option value="late">En retard</option>
            <option value="absent">Absent</option>
            <option value="leave">En congé</option>
            <option value="holiday">Jour férié</option>
          </select>
        </div>
      </div>

      <a
        href={buildUrl()}
        download
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand text-white font-semibold text-sm hover:opacity-90 transition"
      >
        <Download size={16} />
        Télécharger CSV
      </a>
    </div>
  );
}

const inputCls =
  'w-full rounded-xl bg-canvas border border-soft px-3 py-2 text-sm text-ink placeholder:text-muted outline-none focus:border-brand transition';
