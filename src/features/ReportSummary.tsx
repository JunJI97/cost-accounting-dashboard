import { currency, percent } from '../domain/format';
import { downloadRowsCsv } from '../domain/csvExchange';
import type { ProjectProfitability } from '../domain/types';

export function ReportSummary({ rows }: { rows: ProjectProfitability[] }) {
  const topProfit = [...rows].sort((a, b) => b.netProfit - a.netProfit)[0];
  const bottomProfit = [...rows].sort((a, b) => a.netProfit - b.netProfit)[0];
  const highLabor = [...rows].sort((a, b) => b.laborCost / b.totalCost - a.laborCost / a.totalCost)[0];
  const highIndirect = [...rows].sort(
    (a, b) => b.allocatedIndirectCost / b.totalCost - a.allocatedIndirectCost / a.totalCost,
  )[0];

  const divisionRows = Object.values(
    rows.reduce<Record<string, { divisionName: string; revenue: number; netProfit: number }>>(
      (acc, row) => {
        acc[row.divisionName] ??= { divisionName: row.divisionName, revenue: 0, netProfit: 0 };
        acc[row.divisionName].revenue += row.revenue;
        acc[row.divisionName].netProfit += row.netProfit;
        return acc;
      },
      {},
    ),
  ).sort((a, b) => b.netProfit - a.netProfit);

  function exportProjectProfitability() {
    downloadRowsCsv(
      'noa-project-profitability.csv',
      rows.map((row) => ({
        projectId: row.projectId,
        projectName: row.projectName,
        divisionName: row.divisionName,
        revenue: Math.round(row.revenue),
        laborHours: Math.round(row.laborHours),
        laborCost: Math.round(row.laborCost),
        directCost: Math.round(row.directCost),
        allocatedIndirectCost: Math.round(row.allocatedIndirectCost),
        totalCost: Math.round(row.totalCost),
        netProfit: Math.round(row.netProfit),
        margin: Number((row.margin * 100).toFixed(2)),
        primaryDriver: row.primaryDriver,
      })),
    );
  }

  function exportDivisionProfitability() {
    downloadRowsCsv(
      'noa-division-profitability.csv',
      divisionRows.map((division) => ({
        divisionName: division.divisionName,
        revenue: Math.round(division.revenue),
        netProfit: Math.round(division.netProfit),
        margin: Number(((division.netProfit / division.revenue) * 100).toFixed(2)),
      })),
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-5 pb-8">
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-semibold text-slate-950">과제 발표용 리포트</h2>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={exportProjectProfitability}
              className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              손익표 CSV
            </button>
            <button
              type="button"
              onClick={exportDivisionProfitability}
              className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              본부별 CSV
            </button>
          </div>
        </div>
        <div className="mt-4 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-md bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-900">원가 동인 분석</h3>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
              <li>
                최고 수익 프로젝트는 <b>{topProfit.projectName}</b>이며 순이익은{' '}
                <b>{currency.format(topProfit.netProfit)}</b>입니다.
              </li>
              <li>
                수익성이 가장 낮은 프로젝트는 <b>{bottomProfit.projectName}</b>이며 주요 원가 동인은{' '}
                <b>{bottomProfit.primaryDriver}</b>입니다.
              </li>
              <li>
                인건비 비중이 가장 높은 프로젝트는 <b>{highLabor.projectName}</b>입니다.
              </li>
              <li>
                공통비 배부 부담이 가장 큰 프로젝트는 <b>{highIndirect.projectName}</b>입니다.
              </li>
            </ul>
          </div>

          <div className="rounded-md border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-900">본부별 수익성</h3>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-500">
                    <th className="h-9 px-2 font-medium">본부</th>
                    <th className="h-9 px-2 font-medium">매출</th>
                    <th className="h-9 px-2 font-medium">순이익</th>
                    <th className="h-9 px-2 font-medium">이익률</th>
                  </tr>
                </thead>
                <tbody>
                  {divisionRows.map((division) => (
                    <tr key={division.divisionName} className="border-b border-slate-100">
                      <td className="px-2 py-2 font-medium">{division.divisionName}</td>
                      <td className="px-2 py-2">{currency.format(division.revenue)}</td>
                      <td className="px-2 py-2">{currency.format(division.netProfit)}</td>
                      <td className="px-2 py-2">{percent(division.netProfit / division.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
