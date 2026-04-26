'use client';

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { ChartCard } from '@/design-kit/compounds/ChartCard';
import type { ReportsTotals } from '@/types';

interface StatusBreakdownChartProps {
  totals: ReportsTotals;
}

const STATUS_DATA = [
  { key: 'present_count', label: 'Present', color: '#7FD3A8' },
  { key: 'late_count', label: 'En retard', color: '#FFC966' },
  { key: 'absent_count', label: 'Absent', color: '#EE8585' },
  { key: 'leave_count', label: 'Conge', color: '#88AAF0' },
  { key: 'holiday_count', label: 'Ferie', color: '#D8DCE2' },
  { key: 'day_off_count', label: 'Repos', color: '#B8BDC7' },
] as const;

export default function StatusBreakdownChart({ totals }: StatusBreakdownChartProps) {
  const data = STATUS_DATA.map((item) => ({
    name: item.label,
    value: totals[item.key],
    color: item.color,
  })).filter((item) => item.value > 0);

  return (
    <ChartCard title="Repartition" eyebrow="Statuts" className="min-h-[320px]">
      {data.length > 0 ? (
        <div className="grid min-h-[236px] grid-cols-1 gap-4 sm:grid-cols-[160px_1fr] sm:items-center">
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" innerRadius={46} outerRadius={72} paddingAngle={2}>
                  {data.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [value, name]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2">
            {data.map((item) => (
              <div key={item.name} className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: item.color }} />
                  <span className="truncate text-sm font-medium text-ink">{item.name}</span>
                </div>
                <span className="text-sm font-bold text-ink tabular-nums">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex h-[236px] items-center justify-center rounded-xl bg-canvas text-sm text-muted">
          Aucun statut a afficher.
        </div>
      )}
    </ChartCard>
  );
}
