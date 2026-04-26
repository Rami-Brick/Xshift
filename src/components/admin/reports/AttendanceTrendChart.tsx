'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartCard } from '@/design-kit/compounds/ChartCard';
import type { ReportsDaySummary } from '@/types';

interface AttendanceTrendChartProps {
  data: ReportsDaySummary[];
}

const LABELS: Record<string, string> = {
  present: 'Present',
  late: 'En retard',
  absent: 'Absent',
  leave: 'Conge',
  holiday: 'Ferie',
  day_off: 'Repos',
};

const COLORS: Record<string, string> = {
  present: '#7FD3A8',
  late: '#FFC966',
  absent: '#EE8585',
  leave: '#88AAF0',
  holiday: '#D8DCE2',
  day_off: '#B8BDC7',
};

export default function AttendanceTrendChart({ data }: AttendanceTrendChartProps) {
  const hasData = data.some(
    (day) => day.present + day.late + day.absent + day.leave + day.holiday + day.day_off > 0,
  );

  return (
    <ChartCard title="Evolution des presences" eyebrow="Par jour" className="min-h-[320px]">
      {hasData ? (
        <div className="h-[236px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 6, left: -24, bottom: 0 }}>
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
                cursor={{ fill: 'rgba(30, 83, 255, 0.06)' }}
                formatter={(value, name) => [value, LABELS[String(name)] ?? name]}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Legend
                iconType="circle"
                formatter={(value) => LABELS[String(value)] ?? value}
                wrapperStyle={{ fontSize: 11 }}
              />
              <Bar dataKey="present" stackId="status" fill={COLORS.present} radius={[0, 0, 6, 6]} />
              <Bar dataKey="late" stackId="status" fill={COLORS.late} />
              <Bar dataKey="absent" stackId="status" fill={COLORS.absent} />
              <Bar dataKey="leave" stackId="status" fill={COLORS.leave} />
              <Bar dataKey="holiday" stackId="status" fill={COLORS.holiday} />
              <Bar dataKey="day_off" stackId="status" fill={COLORS.day_off} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <EmptyChart message="Aucune donnee de presence pour cette periode." />
      )}
    </ChartCard>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-[236px] items-center justify-center rounded-xl bg-canvas text-sm text-muted">
      {message}
    </div>
  );
}
