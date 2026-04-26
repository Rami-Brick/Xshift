'use client';

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartCard } from '@/design-kit/compounds/ChartCard';
import type { ReportsDaySummary } from '@/types';

interface LateMinutesChartProps {
  data: ReportsDaySummary[];
}

export default function LateMinutesChart({ data }: LateMinutesChartProps) {
  const hasData = data.some((day) => day.avg_late_minutes > 0);

  return (
    <ChartCard title="Retards moyens" eyebrow="Minutes par jour" className="min-h-[280px]">
      {hasData ? (
        <div className="h-[196px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
              <CartesianGrid stroke="#E5E7EB" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => String(value).slice(8, 10)}
                tickLine={false}
                axisLine={false}
                fontSize={11}
              />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} />
              <Tooltip
                cursor={{ stroke: '#1E53FF', strokeOpacity: 0.2 }}
                formatter={(value) => [`${value} min`, 'Retard moyen']}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Line
                type="monotone"
                dataKey="avg_late_minutes"
                stroke="#1E53FF"
                strokeWidth={3}
                dot={{ r: 2.5, fill: '#1E53FF' }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex h-[196px] items-center justify-center rounded-xl bg-canvas text-sm text-muted">
          Aucun retard moyen sur cette periode.
        </div>
      )}
    </ChartCard>
  );
}
