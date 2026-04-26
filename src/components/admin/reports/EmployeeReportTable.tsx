import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import type { ReactNode } from 'react';
import type { ReportsEmployeeSummary } from '@/types';

interface EmployeeReportTableProps {
  rows: ReportsEmployeeSummary[];
  statusFilter: string;
}

export function EmployeeReportTable({ rows, statusFilter }: EmployeeReportTableProps) {
  return (
    <div className="bg-surface rounded-xl shadow-softer overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-soft px-4 py-3">
        <div>
          <h2 className="text-base font-bold text-ink">Performance employees</h2>
          <p className="text-caption text-muted">
            Trie par priorite de suivi{statusFilter ? ' selon le filtre actif' : ''}
          </p>
        </div>
        <span className="rounded-pill bg-soft px-2.5 py-1 text-caption font-semibold text-muted">
          {rows.length} employees
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="p-8 text-center text-sm text-muted">Aucun employee actif.</div>
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-soft text-left">
                  <Th>Employee</Th>
                  <Th>Jours attendus</Th>
                  <Th>Presence</Th>
                  <Th>Retards</Th>
                  <Th>Absences</Th>
                  <Th>Conges</Th>
                  <Th>Repos</Th>
                  <Th>Retard moyen</Th>
                  <Th>Oublis</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.user_id} className="border-b border-soft last:border-0 hover:bg-canvas/50">
                    <td className="px-4 py-3 font-semibold text-ink whitespace-nowrap">
                      {row.full_name}
                    </td>
                    <Td>{row.expected_days}</Td>
                    <Td>
                      <span className="font-semibold text-ink">{formatPercent(row.attendance_rate)}</span>
                      <span className="ml-1 text-muted">({row.present + row.late})</span>
                    </Td>
                    <Td>{row.late}</Td>
                    <Td>
                      <span className={row.absent > 0 ? 'font-semibold text-trend-down' : ''}>
                        {row.absent}
                      </span>
                    </Td>
                    <Td>{row.leave}</Td>
                    <Td>{row.day_off}</Td>
                    <Td>{row.avg_late_minutes} min</Td>
                    <Td>{row.forgot_checkout}</Td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/employees/${row.user_id}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-soft text-muted transition hover:bg-subtle hover:text-ink"
                        aria-label={`Voir ${row.full_name}`}
                      >
                        <ArrowUpRight size={15} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-2 p-3 md:hidden">
            {rows.map((row) => (
              <Link
                key={row.user_id}
                href={`/admin/employees/${row.user_id}`}
                className="block rounded-xl bg-canvas p-3 transition hover:bg-soft"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{row.full_name}</p>
                    <p className="mt-0.5 text-caption text-muted">
                      Presence {formatPercent(row.attendance_rate)} · {row.expected_days} jours
                    </p>
                  </div>
                  <ArrowUpRight size={16} className="shrink-0 text-muted" />
                </div>
                <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                  <MiniStat label="Retards" value={row.late} />
                  <MiniStat label="Abs." value={row.absent} danger={row.absent > 0} />
                  <MiniStat label="Moy." value={`${row.avg_late_minutes}m`} />
                  <MiniStat label="Oublis" value={row.forgot_checkout} />
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Th({ children }: { children?: ReactNode }) {
  return (
    <th className="px-4 py-3 text-caption font-semibold uppercase tracking-wide text-muted">
      {children}
    </th>
  );
}

function Td({ children }: { children: ReactNode }) {
  return <td className="px-4 py-3 text-muted whitespace-nowrap">{children}</td>;
}

function MiniStat({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: string | number;
  danger?: boolean;
}) {
  return (
    <div className="rounded-lg bg-surface px-2 py-2">
      <p className={`text-sm font-bold tabular-nums ${danger ? 'text-trend-down' : 'text-ink'}`}>
        {value}
      </p>
      <p className="mt-0.5 truncate text-[10px] font-medium text-muted">{label}</p>
    </div>
  );
}

function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return '0%';
  return `${value.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}%`;
}
