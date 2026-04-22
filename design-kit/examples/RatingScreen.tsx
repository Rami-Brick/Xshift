import { Star } from 'lucide-react';
import { AppHeader } from '../compounds/AppHeader';
import { ChartCard } from '../compounds/ChartCard';
import { SegmentedPercentBar } from '../compounds/SegmentedPercentBar';
import { AvatarRatingList } from '../compounds/AvatarRatingList';
import { LegendDot } from '../primitives/LegendDot';
import { semantic } from '../tokens/colors';

export function RatingScreen() {
  return (
    <div className="flex flex-col gap-4 pb-32">
      <AppHeader variant="detail" title="Employee report" />

      <div className="px-5">
        <ChartCard eyebrow="Performance Evaluation Results" title="Metrics Rating" affordance>
          <div className="flex items-center gap-3">
            <Star size={26} className="fill-accent-star text-accent-star" />
            <span className="text-displayLg font-bold text-ink tabular-nums tracking-tight leading-none">
              7.8
            </span>
            <span className="text-small text-muted leading-tight">
              Average<br />rating
            </span>
          </div>
          <div className="mt-4">
            <SegmentedPercentBar
              height={12}
              segments={[
                { pct: 38, color: semantic.data.blue, label: '38%' },
                { pct: 25, color: semantic.data.lime, label: '25%' },
                { pct: 18, color: semantic.data.black, label: '18%' },
                { pct: 8, color: semantic.border.subtle, label: '8%' },
              ]}
            />
          </div>
          <div className="mt-4 flex items-center justify-between gap-3">
            <LegendDot color={semantic.data.blue} label="Excellent" />
            <LegendDot color={semantic.data.lime} label="Good" />
            <LegendDot color={semantic.data.black} label="Fair" />
            <LegendDot color={semantic.border.subtle} label="Improved" />
          </div>
        </ChartCard>
      </div>

      <div className="px-5">
        <ChartCard eyebrow="Top Satisfaction Score" title="Top 5 Rating" affordance>
          <AvatarRatingList
            rows={[
              { name: 'Elisabeth Kim Tjow', role: 'HR Generalist', roleTone: 'lime', score: 7.8, tag: 'Good', avatarTone: 'lime' },
              { name: 'Mark Lee', role: 'DevOps Specialist', roleTone: 'brand', score: 7.8, tag: 'Good', avatarTone: 'blue' },
              { name: 'Aisha Nakamura', role: 'Product Designer', roleTone: 'lime', score: 8.4, tag: 'Excellent', avatarTone: 'lime' },
              { name: 'Theodorus Ronald', role: 'Backend Engineer', roleTone: 'brand', score: 7.1, tag: 'Good', avatarTone: 'blue' },
              { name: 'Priya Anand', role: 'People Ops Lead', roleTone: 'lime', score: 6.9, tag: 'Fair', avatarTone: 'dark' },
            ]}
          />
        </ChartCard>
      </div>
    </div>
  );
}
