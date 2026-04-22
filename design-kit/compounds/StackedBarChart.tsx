import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { semantic } from '../tokens/colors';

export interface StackedBarDatum {
  label: string;
  annual: number;
  personal: number;
  other: number;
}

export interface StackedBarChartProps {
  data: StackedBarDatum[];
  height?: number;
  barSize?: number;
  colors?: { annual: string; personal: string; other: string };
}

export function StackedBarChart({
  data,
  height = 180,
  barSize = 10,
  colors = {
    annual: semantic.data.blue,
    personal: semantic.data.lime,
    other: semantic.data.black,
  },
}: StackedBarChartProps) {
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <BarChart data={data} barCategoryGap="28%" margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
          <XAxis dataKey="label" hide />
          <YAxis hide />
          <Bar dataKey="annual" stackId="x" fill={colors.annual} radius={[0, 0, 6, 6]} barSize={barSize} />
          <Bar dataKey="personal" stackId="x" fill={colors.personal} barSize={barSize} />
          <Bar dataKey="other" stackId="x" fill={colors.other} radius={[6, 6, 0, 0]} barSize={barSize} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
