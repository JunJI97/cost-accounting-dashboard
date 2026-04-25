import { currency, number, percent } from '../domain/format';
import { downloadRowsCsv } from '../domain/csvExchange';
import type { ProjectProfitability } from '../domain/types';

export function ReportSummary({ rows }: { rows: ProjectProfitability[] }) {
  const totals = rows.reduce(
    (acc, row) => {
      acc.revenue += row.revenue;
      acc.totalCost += row.totalCost;
      acc.netProfit += row.netProfit;
      acc.internalLaborCost += row.internalLaborCost;
      acc.outsourcingCost += row.outsourcingCost;
      acc.allocatedIndirectCost += row.allocatedIndirectCost;
      acc.manMonths += row.manMonths;
      return acc;
    },
    {
      revenue: 0,
      totalCost: 0,
      netProfit: 0,
      internalLaborCost: 0,
      outsourcingCost: 0,
      allocatedIndirectCost: 0,
      manMonths: 0,
    },
  );
  const topProfit = [...rows].sort((a, b) => b.netProfit - a.netProfit)[0];
  const bottomProfit = [...rows].sort((a, b) => a.netProfit - b.netProfit)[0];
  const highLabor = [...rows].sort(
    (a, b) => ratio(b.internalLaborCost, b.totalCost) - ratio(a.internalLaborCost, a.totalCost),
  )[0];
  const highOutsourcing = [...rows].sort(
    (a, b) => ratio(b.outsourcingCost, b.totalCost) - ratio(a.outsourcingCost, a.totalCost),
  )[0];
  const highIndirect = [...rows].sort(
    (a, b) => ratio(b.allocatedIndirectCost, b.totalCost) - ratio(a.allocatedIndirectCost, a.totalCost),
  )[0];
  const topProjects = [...rows].sort((a, b) => b.netProfit - a.netProfit).slice(0, 5);
  const riskProjects = [...rows].sort((a, b) => a.margin - b.margin).slice(0, 5);
  const outsourcingProjects = [...rows]
    .sort((a, b) => ratio(b.outsourcingCost, b.totalCost) - ratio(a.outsourcingCost, a.totalCost))
    .slice(0, 5);
  const mmEfficiencyRows = [...rows]
    .sort((a, b) => ratio(b.netProfit, b.manMonths) - ratio(a.netProfit, a.manMonths))
    .slice(0, 5);
  const sensitivityRows = [...rows]
    .sort(
      (a, b) =>
        ratio(b.allocatedIndirectCost, b.netProfit) - ratio(a.allocatedIndirectCost, a.netProfit),
    )
    .slice(0, 5);

  const divisionRows = Object.values(
    rows.reduce<
      Record<
        string,
        {
          divisionName: string;
          revenue: number;
          internalLaborCost: number;
          outsourcingCost: number;
          totalCost: number;
          netProfit: number;
        }
      >
    >(
      (acc, row) => {
        acc[row.divisionName] ??= {
          divisionName: row.divisionName,
          revenue: 0,
          internalLaborCost: 0,
          outsourcingCost: 0,
          totalCost: 0,
          netProfit: 0,
        };
        acc[row.divisionName].revenue += row.revenue;
        acc[row.divisionName].internalLaborCost += row.internalLaborCost;
        acc[row.divisionName].outsourcingCost += row.outsourcingCost;
        acc[row.divisionName].totalCost += row.totalCost;
        acc[row.divisionName].netProfit += row.netProfit;
        return acc;
      },
      {},
    ),
  ).sort((a, b) => b.netProfit - a.netProfit);
  const bestDivision = [...divisionRows].sort(
    (a, b) => ratio(b.netProfit, b.revenue) - ratio(a.netProfit, a.revenue),
  )[0];
  const laborHeavyDivision = [...divisionRows].sort(
    (a, b) => ratio(b.internalLaborCost, b.totalCost) - ratio(a.internalLaborCost, a.totalCost),
  )[0];
  const outsourcingHeavyDivision = [...divisionRows].sort(
    (a, b) => ratio(b.outsourcingCost, b.totalCost) - ratio(a.outsourcingCost, a.totalCost),
  )[0];
  const lossProjects = rows.filter((row) => row.netProfit < 0).length;
  const lowMarginProjects = rows.filter((row) => row.margin < 0.1).length;
  const outsourcingRatio = ratio(totals.outsourcingCost, totals.totalCost);
  const internalLaborRatio = ratio(totals.internalLaborCost, totals.totalCost);
  const insightComments = [
    `본부별 수익성 기준으로 ${bestDivision.divisionName}가 이익률 ${percent(
      ratio(bestDivision.netProfit, bestDivision.revenue),
    )}로 가장 효율적입니다. 매출 대비 순이익 전환율이 높아 현재 배부 기준에서도 우수한 수익 구조를 보입니다.`,
    `${laborHeavyDivision.divisionName}는 총원가 중 내부 인건비 비중이 ${percent(
      ratio(laborHeavyDivision.internalLaborCost, laborHeavyDivision.totalCost),
    )}로 높습니다. 투입 공수, 역할별 단가, 프로젝트별 M/M 계획 대비 실적을 우선 점검하는 것이 좋습니다.`,
    `${outsourcingHeavyDivision.divisionName}는 외주 용역비 비중이 ${percent(
      ratio(outsourcingHeavyDivision.outsourcingCost, outsourcingHeavyDivision.totalCost),
    )}로 가장 높습니다. 외주 범위와 단가 계약을 분리 관리하면 SI 기업형 원가 통제 포인트가 명확해집니다.`,
    `${highOutsourcing.projectName}는 프로젝트 단위에서 외주 용역비 부담이 가장 큽니다. 매출 규모 대비 외주 투입 효과를 별도 KPI로 추적할 필요가 있습니다.`,
    `${lowMarginProjects}개 프로젝트는 이익률 10% 미만입니다. 이 구간은 견적 단가, 추가 투입 시간, 외주비 정산 조건을 묶어서 재검토하는 것이 좋습니다.`,
  ];

  function exportProjectProfitability() {
    downloadRowsCsv(
      'noa-project-profitability.csv',
      rows.map((row) => ({
        projectId: row.projectId,
        projectName: row.projectName,
        divisionName: row.divisionName,
        revenue: Math.round(row.revenue),
        laborHours: Math.round(row.laborHours),
        internalLaborCost: Math.round(row.internalLaborCost),
        laborCost: Math.round(row.laborCost),
        outsourcingCost: Math.round(row.outsourcingCost),
        directExpenseCost: Math.round(row.directExpenseCost),
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
        internalLaborCost: Math.round(division.internalLaborCost),
        outsourcingCost: Math.round(division.outsourcingCost),
        totalCost: Math.round(division.totalCost),
        netProfit: Math.round(division.netProfit),
        margin: Number((ratio(division.netProfit, division.revenue) * 100).toFixed(2)),
      })),
    );
  }

  function exportReportInsights() {
    downloadRowsCsv(
      'management-insight-report.csv',
      [
        ...topProjects.map((row) => toInsightRow('수익성 상위', row)),
        ...riskProjects.map((row) => toInsightRow('개선 후보', row)),
        ...outsourcingProjects.map((row) => toInsightRow('외주 의존도', row)),
        ...mmEfficiencyRows.map((row) => toInsightRow('M/M 효율', row)),
        ...sensitivityRows.map((row) => toInsightRow('공통비 민감도', row)),
      ],
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-5 py-5 pb-8">
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-semibold text-slate-950">경영 인사이트 리포트</h2>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={exportReportInsights}
              className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              리포트 CSV
            </button>
            <button
              type="button"
              onClick={exportDivisionProfitability}
              className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              본부별 CSV
            </button>
            <button
              type="button"
              onClick={exportProjectProfitability}
              className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              상세 손익 CSV
            </button>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <ReportMetric label="전체 이익률" value={percent(ratio(totals.netProfit, totals.revenue))} />
          <ReportMetric label="외주비 비중" value={percent(outsourcingRatio)} />
          <ReportMetric label="내부 인건비 비중" value={percent(internalLaborRatio)} />
          <ReportMetric label="손실 프로젝트" value={`${number.format(lossProjects)}개`} />
        </div>
        <div className="mt-4 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-md bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-900">AI 분석 코멘트</h3>
            <div className="mt-3 space-y-3 text-sm leading-6 text-slate-700">
              {insightComments.map((comment) => (
                <p key={comment}>{comment}</p>
              ))}
            </div>
          </div>

          <div className="rounded-md border border-slate-200 p-4">
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
                내부 인건비 비중이 가장 높은 프로젝트는 <b>{highLabor.projectName}</b>입니다.
              </li>
              <li>
                외주 용역비 비중이 가장 높은 프로젝트는 <b>{highOutsourcing.projectName}</b>입니다.
              </li>
              <li>
                공통비 배부 부담이 가장 큰 프로젝트는 <b>{highIndirect.projectName}</b>입니다.
              </li>
            </ul>
          </div>

          <div className="rounded-md border border-slate-200 p-4 xl:col-span-2">
            <h3 className="text-sm font-semibold text-slate-900">수익성 상위 프로젝트</h3>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-500">
                    <th className="h-9 px-2 font-medium">프로젝트</th>
                    <th className="h-9 px-2 font-medium">본부</th>
                    <th className="h-9 px-2 text-right font-medium">매출</th>
                    <th className="h-9 px-2 text-right font-medium">순이익</th>
                    <th className="h-9 px-2 text-right font-medium">이익률</th>
                    <th className="h-9 px-2 font-medium">주요 원가 동인</th>
                  </tr>
                </thead>
                <tbody>
                  {topProjects.map((row) => (
                    <ProjectInsightRow key={row.projectId} row={row} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-md border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-900">개선 후보 프로젝트</h3>
            <div className="mt-3 space-y-2">
              {riskProjects.map((row) => (
                <RankCard
                  key={row.projectId}
                  title={row.projectName}
                  value={percent(row.margin)}
                  description={`순이익 ${currency.format(row.netProfit)} · ${row.primaryDriver} 부담`}
                  tone={row.margin < 0 ? 'danger' : 'warning'}
                />
              ))}
            </div>
          </div>

          <div className="rounded-md border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-900">외주 의존도 Top 5</h3>
            <div className="mt-3 space-y-2">
              {outsourcingProjects.map((row) => (
                <RankCard
                  key={row.projectId}
                  title={row.projectName}
                  value={percent(ratio(row.outsourcingCost, row.totalCost))}
                  description={`외주 용역비 ${currency.format(row.outsourcingCost)}`}
                  tone="purple"
                />
              ))}
            </div>
          </div>

          <div className="rounded-md border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-900">M/M 효율 상위</h3>
            <div className="mt-3 space-y-2">
              {mmEfficiencyRows.map((row) => (
                <RankCard
                  key={row.projectId}
                  title={row.projectName}
                  value={currency.format(ratio(row.netProfit, row.manMonths))}
                  description={`${row.manMonths.toFixed(2)} M/M 기준 순이익`}
                  tone="good"
                />
              ))}
            </div>
          </div>

          <div className="rounded-md border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-900">공통비 민감도</h3>
            <div className="mt-3 space-y-2">
              {sensitivityRows.map((row) => (
                <RankCard
                  key={row.projectId}
                  title={row.projectName}
                  value={percent(ratio(row.allocatedIndirectCost, Math.max(row.netProfit, 1)))}
                  description={`배부 공통비 ${currency.format(row.allocatedIndirectCost)}`}
                  tone="neutral"
                />
              ))}
            </div>
          </div>

          <div className="rounded-md border border-slate-200 p-4 xl:col-span-2">
            <h3 className="text-sm font-semibold text-slate-900">본부별 수익성</h3>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-500">
                    <th className="h-9 px-2 font-medium">본부</th>
                    <th className="h-9 px-2 font-medium">매출</th>
                    <th className="h-9 px-2 font-medium">내부 인건비</th>
                    <th className="h-9 px-2 font-medium">외주 용역비</th>
                    <th className="h-9 px-2 font-medium">순이익</th>
                    <th className="h-9 px-2 font-medium">이익률</th>
                  </tr>
                </thead>
                <tbody>
                  {divisionRows.map((division) => (
                    <tr key={division.divisionName} className="border-b border-slate-100">
                      <td className="px-2 py-2 font-medium">{division.divisionName}</td>
                      <td className="px-2 py-2">{currency.format(division.revenue)}</td>
                      <td className="px-2 py-2">{currency.format(division.internalLaborCost)}</td>
                      <td className="px-2 py-2">{currency.format(division.outsourcingCost)}</td>
                      <td className="px-2 py-2">{currency.format(division.netProfit)}</td>
                      <td className="px-2 py-2">{percent(ratio(division.netProfit, division.revenue))}</td>
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

function ReportMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function ProjectInsightRow({ row }: { row: ProjectProfitability }) {
  return (
    <tr className="border-b border-slate-100">
      <td className="px-2 py-2 font-medium text-slate-900">{row.projectName}</td>
      <td className="px-2 py-2 text-slate-600">{row.divisionName}</td>
      <td className="px-2 py-2 text-right tabular-nums">{currency.format(row.revenue)}</td>
      <td className="px-2 py-2 text-right tabular-nums">{currency.format(row.netProfit)}</td>
      <td className="px-2 py-2 text-right tabular-nums">{percent(row.margin)}</td>
      <td className="px-2 py-2 text-slate-600">{row.primaryDriver}</td>
    </tr>
  );
}

function RankCard({
  title,
  value,
  description,
  tone,
}: {
  title: string;
  value: string;
  description: string;
  tone: 'good' | 'warning' | 'danger' | 'purple' | 'neutral';
}) {
  const toneClass = {
    good: 'text-teal-700',
    warning: 'text-amber-700',
    danger: 'text-red-700',
    purple: 'text-violet-700',
    neutral: 'text-slate-700',
  }[tone];

  return (
    <div className="rounded-md bg-slate-50 px-3 py-2">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 truncate text-sm font-medium text-slate-900">{title}</p>
        <p className={`shrink-0 text-sm font-semibold tabular-nums ${toneClass}`}>{value}</p>
      </div>
      <p className="mt-1 truncate text-xs text-slate-500">{description}</p>
    </div>
  );
}

function toInsightRow(category: string, row: ProjectProfitability) {
  return {
    category,
    projectId: row.projectId,
    projectName: row.projectName,
    divisionName: row.divisionName,
    revenue: Math.round(row.revenue),
    totalCost: Math.round(row.totalCost),
    internalLaborCost: Math.round(row.internalLaborCost),
    outsourcingCost: Math.round(row.outsourcingCost),
    allocatedIndirectCost: Math.round(row.allocatedIndirectCost),
    manMonths: Number(row.manMonths.toFixed(2)),
    netProfit: Math.round(row.netProfit),
    margin: Number((row.margin * 100).toFixed(2)),
    primaryDriver: row.primaryDriver,
  };
}

function ratio(numerator: number, denominator: number) {
  if (!Number.isFinite(denominator) || denominator === 0) {
    return 0;
  }
  return numerator / denominator;
}
