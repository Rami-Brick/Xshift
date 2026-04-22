import { useState } from 'react';
import {
  User,
  Headphones,
  SlidersHorizontal,
  Home,
  Users,
  Calendar,
  BarChart3,
  Settings,
} from 'lucide-react';
import { AppHeader } from '../compounds/AppHeader';
import { KpiCard } from '../compounds/KpiCard';
import { ChartCard } from '../compounds/ChartCard';
import { DonutGauge } from '../compounds/DonutGauge';
import { GaugeLegend } from '../compounds/GaugeLegend';
import { BottomNavBar } from '../compounds/BottomNavBar';
import { SideNavRail } from '../compounds/SideNavRail';
import { Card } from '../primitives/Card';
import { SearchInput } from '../primitives/SearchInput';
import { SelectPill } from '../primitives/SelectPill';
import { Badge } from '../primitives/Badge';
import { InitialAvatar } from '../primitives/InitialAvatar';
import { IconButton } from '../primitives/IconButton';
import { Bell } from 'lucide-react';
import { semantic } from '../tokens/colors';

type TabKey = 'home' | 'people' | 'calendar' | 'reports' | 'settings';

const navItems = [
  { key: 'home' as TabKey, icon: Home, label: 'Home' },
  { key: 'people' as TabKey, icon: Users, label: 'People' },
  { key: 'calendar' as TabKey, icon: Calendar, label: 'Calendar' },
  { key: 'reports' as TabKey, icon: BarChart3, label: 'Reports' },
  { key: 'settings' as TabKey, icon: Settings, label: 'Settings' },
];

const mobileNavItems = navItems.slice(0, 3);

export function HomeScreen() {
  const [tab, setTab] = useState<TabKey>('home');

  return (
    <div className="min-h-dvh w-full bg-canvas">
      <div className="mx-auto flex w-full max-w-[1400px] gap-6 px-4 py-4 md:px-6 md:py-6 lg:px-8 lg:py-8">
        {/* Desktop sidebar */}
        <div className="hidden md:block">
          <SideNavRail
            items={navItems}
            activeKey={tab}
            onChange={setTab}
            brand={<span className="text-displayXl leading-none font-bold text-data-lime">·</span>}
            className="sticky top-6"
          />
        </div>

        <main className="relative min-w-0 flex-1">
          {/* Mobile header (the existing dashboard header) */}
          <div className="md:hidden">
            <AppHeader
              variant="dashboard"
              eyebrow="Dashboard"
              eyebrowBadge="PRO"
              title="Employee Summary"
              avatarName="Amelia Park"
            />
          </div>

          {/* Desktop header */}
          <header className="hidden md:flex items-center justify-between gap-4 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-small text-muted">Dashboard</span>
                <Badge tone="lime">PRO</Badge>
              </div>
              <h1 className="mt-1 text-displayLg font-bold tracking-tight text-ink">
                Employee Summary
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <SearchInput
                variant="pill"
                placeholder="Search employees, teams…"
                className="w-80"
              />
              <SelectPill
                value="Department"
                options={['Department', 'Engineering', 'HR', 'Sales']}
              />
              <IconButton icon={Bell} label="Notifications" size="md" />
              <InitialAvatar name="Amelia Park" size={40} />
            </div>
          </header>

          {/* Mobile toolbar row */}
          <div className="md:hidden mt-4 px-1 flex items-center gap-2">
            <SearchInput variant="icon" placeholder="Search" />
            <SelectPill
              value="Department"
              options={['Department', 'Engineering', 'HR', 'Sales']}
              className="flex-1"
            />
            <button
              type="button"
              aria-label="Filter"
              className="inline-flex h-10 items-center gap-1.5 rounded-pill bg-surface px-3 shadow-iconBtn text-body text-ink"
            >
              <SlidersHorizontal size={16} />
              <span>Filter</span>
            </button>
          </div>

          {/* KPI grid — 1 col on phone, 2 on sm, 4 on lg */}
          <section className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              title="Head Count"
              value={327}
              icon={User}
              iconBg="blue"
              trend={{ dir: 'up', pct: 4.7 }}
              subLabel="New Hires"
            />
            <KpiCard
              title="HR to employee"
              value={75}
              icon={Headphones}
              iconBg="black"
              trend={{ dir: 'down', pct: 1.2 }}
              subLabel="New Hires"
            />
            <KpiCard
              title="Open positions"
              value={24}
              icon={Users}
              iconBg="dark"
              trend={{ dir: 'up', pct: 2.1 }}
              subLabel="This quarter"
            />
            <KpiCard
              title="Avg. tenure"
              value="3.4y"
              icon={Calendar}
              iconBg="blue"
              trend={{ dir: 'up', pct: 0.4 }}
              subLabel="All staff"
            />
          </section>

          {/* Charts row — stacks on mobile, side-by-side from lg up */}
          <section className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-[1.15fr_1fr]">
            <ChartCard
              eyebrow="Employment Agreement Tracker"
              title="Contact status"
              affordance
            >
              <div className="flex flex-col items-center gap-4 lg:flex-row lg:items-center lg:gap-8">
                <DonutGauge
                  size={260}
                  strokeWidth={30}
                  startAngle={-210}
                  endAngle={30}
                  gapDegrees={6}
                  segments={[
                    { name: 'Permanent', value: 80, color: semantic.data.blue },
                    { name: 'Contract', value: 11.5, color: semantic.data.lime },
                    { name: 'Part-Time', value: 8.5, color: semantic.data.black },
                  ]}
                  centerValue={800}
                  centerLabel="Total Employees"
                />
                <div className="w-full lg:max-w-xs">
                  <GaugeLegend
                    items={[
                      { color: semantic.data.blue, label: 'Permanent', value: '80%' },
                      { color: semantic.data.lime, label: 'Contract', value: '11.5%' },
                      { color: semantic.data.black, label: 'Part-Time', value: '8.5%' },
                    ]}
                  />
                  <p className="mt-4 hidden text-small text-muted lg:block">
                    800 employees across three agreement types. Permanent
                    contracts remain the dominant pattern at 80%.
                  </p>
                </div>
              </div>
            </ChartCard>

            <ChartCard
              eyebrow="Hiring pipeline"
              title="Recent activity"
              affordance
            >
              <ul className="divide-y divide-soft">
                {[
                  { name: 'Elisabeth Kim Tjow', role: 'HR Generalist', status: 'Offer sent' },
                  { name: 'Mark Lee', role: 'DevOps Specialist', status: 'Interview' },
                  { name: 'Aisha Nakamura', role: 'Product Designer', status: 'Screening' },
                  { name: 'Theodorus Ronald', role: 'Backend Engineer', status: 'Interview' },
                ].map((row) => (
                  <li key={row.name} className="flex items-center gap-3 py-2.5">
                    <InitialAvatar name={row.name} size={40} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-body font-semibold text-ink">{row.name}</p>
                      <p className="truncate text-caption text-muted">{row.role}</p>
                    </div>
                    <span className="shrink-0 text-small font-medium text-brand">
                      {row.status}
                    </span>
                  </li>
                ))}
              </ul>
            </ChartCard>
          </section>

          <div className="mt-4">
            <Card tone="surface" padding="md" withChevron>
              <p className="text-small text-muted">Employee</p>
              <p className="mt-1 text-cardTitle font-semibold text-ink">Tracker</p>
            </Card>
          </div>

          {/* Padding so the floating mobile nav doesn't cover content */}
          <div className="h-24 md:h-0" />

          {/* Mobile floating pill nav */}
          <div className="md:hidden">
            <BottomNavBar<TabKey>
              items={mobileNavItems}
              activeKey={tab === 'reports' || tab === 'settings' ? 'home' : tab}
              onChange={setTab}
              variant="static"
              className="fixed bottom-4 left-1/2 -translate-x-1/2"
            />
          </div>
        </main>
      </div>
    </div>
  );
}
