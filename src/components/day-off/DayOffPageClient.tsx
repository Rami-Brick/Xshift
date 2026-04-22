'use client';

import { useState } from 'react';
import { Plus, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Chip } from '@/design-kit/primitives/Chip';
import { DayOffChangeDialog } from './DayOffChangeDialog';
import { DAY_OFF_LABELS_FR, effectiveDayOff } from '@/lib/day-off/weeks';
import type { DayOffChangeListItem, DayOfWeek } from '@/types';

const STATUS_LABEL: Record<string, string> = {
  pending: 'En attente',
  approved: 'Approuvé',
  rejected: 'Refusé',
  cancelled: 'Annulé',
};

function statusVariant(status: string): 'lime' | 'trendDown' | 'neutral' | 'brand' {
  if (status === 'approved') return 'lime';
  if (status === 'rejected') return 'trendDown';
  if (status === 'pending') return 'brand';
  return 'neutral';
}

interface Props {
  initialChanges: DayOffChangeListItem[];
  defaultDayOff: DayOfWeek;
  thisWeek: { iso_year: number; iso_week: number };
  nextWeek: { iso_year: number; iso_week: number };
}

export function DayOffPageClient({
  initialChanges,
  defaultDayOff,
  thisWeek,
  nextWeek,
}: Props) {
  const [changes, setChanges] = useState<DayOffChangeListItem[]>(initialChanges);
  const [showForm, setShowForm] = useState(false);

  const thisEffective = effectiveDayOff(defaultDayOff, changes, thisWeek.iso_year, thisWeek.iso_week);
  const nextEffective = effectiveDayOff(defaultDayOff, changes, nextWeek.iso_year, nextWeek.iso_week);

  const hasThisOverride = changes.some(
    (c) => c.status === 'approved' && c.iso_year === thisWeek.iso_year && c.iso_week === thisWeek.iso_week,
  );
  const hasNextOverride = changes.some(
    (c) => c.status === 'approved' && c.iso_year === nextWeek.iso_year && c.iso_week === nextWeek.iso_week,
  );

  function handleCreated(change: DayOffChangeListItem) {
    setChanges((prev) => [change, ...prev]);
    setShowForm(false);
  }

  async function handleCancel(id: string) {
    const res = await fetch(`/api/day-off/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'cancelled' }),
    });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error ?? 'Erreur');
      return;
    }
    toast.success('Demande annulée');
    setChanges((prev) => prev.map((c) => (c.id === id ? { ...c, ...json } : c)));
  }

  return (
    <>
      <div className="bg-surface rounded-xl px-4 py-4 shadow-softer flex items-center justify-between">
        <div>
          <p className="text-caption text-muted">Jour de repos par défaut</p>
          <p className="text-section font-bold text-ink mt-0.5">{DAY_OFF_LABELS_FR[defaultDayOff]}</p>
          <p className="text-caption text-muted mt-1">
            Contactez votre administrateur pour modifier ce jour.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand text-white font-semibold text-sm hover:opacity-90 transition"
        >
          <Plus size={16} />
          Demander
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <WeekCard
          title="Cette semaine"
          day={thisEffective}
          isOverride={hasThisOverride}
        />
        <WeekCard
          title="Semaine prochaine"
          day={nextEffective}
          isOverride={hasNextOverride}
        />
      </div>

      {changes.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-muted text-small">Aucune demande</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-caption font-semibold text-muted uppercase tracking-wide">
            Demandes récentes
          </p>
          {changes.map((c) => (
            <div key={c.id} className="bg-surface rounded-xl px-4 py-3 shadow-softer">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-small font-semibold text-ink">
                    {DAY_OFF_LABELS_FR[c.old_day]} → {DAY_OFF_LABELS_FR[c.new_day]}
                  </p>
                  <p className="text-caption text-muted mt-0.5">
                    Semaine {c.iso_week} / {c.iso_year}
                  </p>
                  {c.reason && (
                    <p className="text-caption text-muted mt-1 italic">{c.reason}</p>
                  )}
                  {c.admin_note && (
                    <p className="text-caption text-muted mt-1">Note : {c.admin_note}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Chip variant={statusVariant(c.status)}>
                    {STATUS_LABEL[c.status] ?? c.status}
                  </Chip>
                  {c.status === 'pending' && (
                    <button
                      type="button"
                      onClick={() => handleCancel(c.id)}
                      className="p-1.5 rounded-lg text-muted hover:text-trend-down hover:bg-trend-down/10 transition"
                      aria-label="Annuler"
                    >
                      <XCircle size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <DayOffChangeDialog
          defaultDayOff={defaultDayOff}
          thisEffective={thisEffective}
          nextEffective={nextEffective}
          onClose={() => setShowForm(false)}
          onSuccess={handleCreated}
        />
      )}
    </>
  );
}

function WeekCard({
  title,
  day,
  isOverride,
}: {
  title: string;
  day: DayOfWeek;
  isOverride: boolean;
}) {
  return (
    <div className="bg-surface rounded-xl px-4 py-4 shadow-softer">
      <p className="text-caption text-muted">{title}</p>
      <p className="text-section font-bold text-ink mt-0.5">{DAY_OFF_LABELS_FR[day]}</p>
      <div className="mt-1">
        <Chip variant={isOverride ? 'lime' : 'neutral'}>
          {isOverride ? 'Modifié' : 'Par défaut'}
        </Chip>
      </div>
    </div>
  );
}
