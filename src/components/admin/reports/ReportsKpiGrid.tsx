import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Timer,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import type { ReportsSummary } from '@/types';

interface ReportsKpiGridProps {
  summary: ReportsSummary;
}

export function ReportsKpiGrid({ summary }: ReportsKpiGridProps) {
  const { totals } = summary;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
      <KpiCard
        icon={CheckCircle2}
        label="Presence"
        value={formatPercent(totals.attendance_rate)}
        detail={`${totals.present_count + totals.late_count}/${totals.expected_days} jours`}
        tone="green"
      />
      <KpiCard
        icon={Clock3}
        label="Retards"
        value={formatPercent(totals.late_rate)}
        detail={`${totals.late_count} arrivees`}
        tone="amber"
      />
      <KpiCard
        icon={XCircle}
        label="Absences"
        value={String(totals.absent_count)}
        detail="jours absents"
        tone="red"
      />
      <KpiCard
        icon={Timer}
        label="Retard moyen"
        value={`${totals.avg_late_minutes} min`}
        detail={`${totals.total_late_minutes} min total`}
        tone="blue"
      />
      <KpiCard
        icon={AlertTriangle}
        label="Oublis depart"
        value={String(totals.forgot_checkout_count)}
        detail="pointages incomplets"
        tone="red"
      />
      <KpiCard
        icon={CalendarDays}
        label="Conges"
        value={String(totals.leave_count)}
        detail="jours approuves"
        tone="slate"
      />
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
  tone: keyof typeof toneMap;
}) {
  const colors = toneMap[tone];
  return (
    <div className="bg-surface rounded-xl p-4 shadow-softer min-w-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-caption font-semibold uppercase tracking-wide text-muted">{label}</p>
          <p className="mt-2 text-2xl font-bold text-ink tabular-nums leading-none">{value}</p>
        </div>
        <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${colors.bg}`}>
          <Icon size={17} className={colors.fg} />
        </span>
      </div>
      <p className="mt-3 truncate text-caption text-muted">{detail}</p>
    </div>
  );
}

function formatPercent(value: number): string {
  return `${value.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}%`;
}

const toneMap = {
  green: { bg: 'bg-[#E4F7EC]', fg: 'text-[#126B38]' },
  amber: { bg: 'bg-[#FFF2CC]', fg: 'text-[#8A5A00]' },
  red: { bg: 'bg-[#FDE7E7]', fg: 'text-[#B42318]' },
  blue: { bg: 'bg-[#E7EDFF]', fg: 'text-brand' },
  slate: { bg: 'bg-soft', fg: 'text-muted' },
};
