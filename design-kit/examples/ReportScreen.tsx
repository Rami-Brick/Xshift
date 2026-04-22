import { AppHeader } from '../compounds/AppHeader';
import { ChartCard } from '../compounds/ChartCard';
import { Heatmap, type HeatmapCell } from '../compounds/Heatmap';
import { StackedBarChart } from '../compounds/StackedBarChart';
import { LegendDot } from '../primitives/LegendDot';
import { Card } from '../primitives/Card';
import { semantic } from '../tokens/colors';

// Hand-tuned absenteeism grid that reads like the reference: a scatter of deep
// blues across the left/center columns, medium blues & one lime accent on the
// right-center, and a few pale cells sprinkled in.
const cells: HeatmapCell[] = [
  // row 0 (1%)
  { row: 0, col: 0, bucket: 5 }, { row: 0, col: 1, bucket: 2 }, { row: 0, col: 2, bucket: 3 }, { row: 0, col: 3, bucket: 0 }, { row: 0, col: 4, bucket: 2 },
  // row 1 (2%)
  { row: 1, col: 0, bucket: 1 }, { row: 1, col: 1, bucket: 3 }, { row: 1, col: 2, bucket: 0 }, { row: 1, col: 3, bucket: 4 }, { row: 1, col: 4, bucket: 1 },
  // row 2 (3%)
  { row: 2, col: 0, bucket: 0 }, { row: 2, col: 1, bucket: 2 }, { row: 2, col: 2, bucket: 1 }, { row: 2, col: 3, bucket: -1 }, { row: 2, col: 4, bucket: 5 },
  // row 3 (4%)
  { row: 3, col: 0, bucket: 2 }, { row: 3, col: 1, bucket: 1 }, { row: 3, col: 2, bucket: 3 }, { row: 3, col: 3, bucket: 4 }, { row: 3, col: 4, bucket: 6 },
  // row 4 (>3%)
  { row: 4, col: 0, bucket: 0 }, { row: 4, col: 1, bucket: 6 }, { row: 4, col: 2, bucket: 5 }, { row: 4, col: 3, bucket: 6 }, { row: 4, col: 4, bucket: 2 },
];

const yLabels = [
  { label: '1%', chip: '1%', chipColor: semantic.data.grid[1] },
  { label: '2%', chip: '2%', chipColor: semantic.data.grid[1] },
  { label: '3%', chip: '3%', chipColor: semantic.data.grid[1] },
  { label: '4%', chip: '4%', chipColor: semantic.data.grid[1] },
  { label: '>3%', chip: '>3%', chipColor: semantic.data.grid[1] },
];

const barData = Array.from({ length: 14 }).map((_, i) => ({
  label: `d${i}`,
  annual: 6 + ((i * 3) % 9),
  personal: 4 + ((i * 5) % 8),
  other: 2 + ((i * 2) % 5),
}));

export function ReportScreen() {
  return (
    <div className="flex flex-col gap-4 pb-32">
      <AppHeader variant="detail" title="Employees absences" />

      <div className="px-5">
        <ChartCard eyebrow="Identify employees with absences" title="Absenteeism" affordance>
          <Heatmap
            rows={5}
            cols={5}
            cells={cells}
            xLabels={['m', 't', 'w', 't', 'f']}
            yLabels={yLabels}
            tileSize={34}
            gap={6}
            n={5}
          />

          <div className="mt-6 flex items-baseline gap-4">
            <div>
              <p className="text-body font-bold text-ink tabular-nums">45</p>
              <p className="text-caption text-muted -mt-0.5">Employees</p>
            </div>
            <div>
              <p className="text-body font-bold text-ink tabular-nums">165</p>
              <p className="text-caption text-muted -mt-0.5">Employees</p>
            </div>
          </div>

          <div className="mt-2">
            <StackedBarChart data={barData} height={140} barSize={10} />
          </div>

          <div className="mt-3 flex items-center gap-5">
            <LegendDot color={semantic.data.blue} label="Annual" />
            <LegendDot color={semantic.data.lime} label="Personal" />
            <LegendDot color={semantic.data.black} label="Other" />
          </div>
        </ChartCard>
      </div>

      <div className="px-5">
        <Card tone="surface" padding="md" withChevron>
          <p className="text-small text-muted">Employee</p>
          <p className="mt-1 text-cardTitle font-semibold text-ink">Tracker</p>
        </Card>
      </div>
    </div>
  );
}
