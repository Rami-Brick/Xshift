'use client';

import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { BarChart3 } from 'lucide-react';
import { ReportsFilters, type ReportsFilterState } from './reports/ReportsFilters';
import { ReportsKpiGrid } from './reports/ReportsKpiGrid';
import { EmployeeReportTable } from './reports/EmployeeReportTable';
import { NeedsAttentionPanel } from './reports/NeedsAttentionPanel';
import type { AttendanceStatus, Profile, ReportsSummary } from '@/types';

const AttendanceTrendChart = dynamic(() => import('./reports/AttendanceTrendChart'), {
  ssr: false,
  loading: () => <ChartPlaceholder title="Evolution des presences" />,
});

const LateMinutesChart = dynamic(() => import('./reports/LateMinutesChart'), {
  ssr: false,
  loading: () => <ChartPlaceholder title="Retards moyens" />,
});

const StatusBreakdownChart = dynamic(() => import('./reports/StatusBreakdownChart'), {
  ssr: false,
  loading: () => <ChartPlaceholder title="Repartition" />,
});

interface Props {
  employees: Pick<Profile, 'id' | 'full_name'>[];
  initialSummary: ReportsSummary;
}

const fetcher = async (url: string): Promise<ReportsSummary> => {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error ?? 'Erreur lors du chargement des rapports');
  }
  return json;
};

export function ReportsClient({ employees, initialSummary }: Props) {
  const initialFilters = useMemo<ReportsFilterState>(
    () => ({
      start: initialSummary.filters.start,
      end: initialSummary.filters.end,
      user_id: initialSummary.filters.user_id ?? '',
      status: initialSummary.filters.status ?? '',
    }),
    [initialSummary],
  );

  const [filters, setFilters] = useState<ReportsFilterState>(initialFilters);

  const query = useMemo(() => {
    const params = new URLSearchParams({
      start: filters.start,
      end: filters.end,
    });
    if (filters.user_id) params.set('user_id', filters.user_id);
    if (filters.status) params.set('status', filters.status);
    return params.toString();
  }, [filters]);

  const { data, error, isValidating } = useSWR<ReportsSummary>(
    `/api/reports/summary?${query}`,
    fetcher,
    {
      fallbackData: query === queryForSummary(initialSummary) ? initialSummary : undefined,
      keepPreviousData: true,
    },
  );

  const summary = data ?? initialSummary;

  const exportUrl = useMemo(() => {
    const params = new URLSearchParams({
      start: filters.start,
      end: filters.end,
    });
    if (filters.user_id) params.set('user_id', filters.user_id);
    if (filters.status) params.set('status', filters.status);
    return `/api/reports/attendance.csv?${params.toString()}`;
  }, [filters]);

  function resetFilters() {
    setFilters(initialFilters);
  }

  function updateFilters(next: Partial<ReportsFilterState>) {
    setFilters((current) => ({ ...current, ...next }));
  }

  return (
    <div className="space-y-5">
      <ReportsFilters
        filters={filters}
        employees={employees}
        exportUrl={exportUrl}
        loading={isValidating}
        onChange={updateFilters}
        onReset={resetFilters}
      />

      {error && (
        <div className="rounded-xl border border-trend-down/20 bg-red-50 px-4 py-3 text-sm font-medium text-trend-down">
          {error.message}
        </div>
      )}

      <ReportsKpiGrid summary={summary} />

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.8fr)] gap-4">
        <AttendanceTrendChart data={summary.by_day} />
        <StatusBreakdownChart totals={summary.totals} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)] gap-4">
        <LateMinutesChart data={summary.by_day} />
        <NeedsAttentionPanel items={summary.needs_attention} />
      </div>

      <EmployeeReportTable rows={summary.by_employee} statusFilter={filters.status} />
    </div>
  );
}

function queryForSummary(summary: ReportsSummary): string {
  const params = new URLSearchParams({
    start: summary.filters.start,
    end: summary.filters.end,
  });
  if (summary.filters.user_id) params.set('user_id', summary.filters.user_id);
  if (summary.filters.status) params.set('status', summary.filters.status);
  return params.toString();
}

function ChartPlaceholder({ title }: { title: string }) {
  return (
    <div className="bg-surface rounded-xl shadow-softer p-5 min-h-[280px]">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-soft">
          <BarChart3 size={16} className="text-muted" />
        </span>
        <p className="text-sm font-semibold text-ink">{title}</p>
      </div>
      <div className="mt-5 h-44 rounded-xl bg-soft animate-pulse" />
    </div>
  );
}

export type ReportStatusOption = AttendanceStatus | '';
