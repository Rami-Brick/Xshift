import Link from 'next/link';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { ChartCard } from '@/design-kit/compounds/ChartCard';
import type { ReportsAttentionItem } from '@/types';

interface NeedsAttentionPanelProps {
  items: ReportsAttentionItem[];
}

const SEVERITY_CLASS: Record<ReportsAttentionItem['severity'], string> = {
  high: 'bg-[#FDE7E7] text-[#B42318]',
  medium: 'bg-[#FFF2CC] text-[#8A5A00]',
  low: 'bg-soft text-muted',
};

export function NeedsAttentionPanel({ items }: NeedsAttentionPanelProps) {
  const visible = items.slice(0, 8);

  return (
    <ChartCard title="A traiter" eyebrow="Alertes employees" className="min-h-[280px]">
      {visible.length === 0 ? (
        <div className="flex min-h-[174px] flex-col items-center justify-center rounded-xl bg-canvas text-center">
          <CheckCircle2 size={28} className="text-roleLime" />
          <p className="mt-2 text-sm font-semibold text-ink">Rien a signaler</p>
          <p className="mt-1 text-caption text-muted">Aucune alerte sur cette periode.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((item, index) => (
            <Link
              key={`${item.user_id}-${item.reason}-${index}`}
              href={`/admin/employees/${item.user_id}`}
              className="flex items-center justify-between gap-3 rounded-xl bg-canvas px-3 py-2.5 transition hover:bg-soft"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{item.full_name}</p>
                <p className="truncate text-caption text-muted">{item.reason}</p>
              </div>
              <span
                className={`inline-flex h-7 shrink-0 items-center gap-1 rounded-pill px-2 text-xs font-bold tabular-nums ${SEVERITY_CLASS[item.severity]}`}
              >
                <AlertTriangle size={13} />
                {item.count}
              </span>
            </Link>
          ))}
          {items.length > visible.length && (
            <p className="pt-1 text-caption text-muted">+{items.length - visible.length} autres alertes</p>
          )}
        </div>
      )}
    </ChartCard>
  );
}
