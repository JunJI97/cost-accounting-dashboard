import { calculateProjectProfitability, summarize } from '../domain/costing';
import { currency, percent } from '../domain/format';
import type { AllocationBasis, CostDataset } from '../domain/types';

const allocationLabels: Record<AllocationBasis, string> = {
  laborHours: '투입 시간 기준',
  laborCost: '인건비 기준',
  revenue: '매출 기준',
};

const bases: AllocationBasis[] = ['laborHours', 'laborCost', 'revenue'];

export function AllocationComparison({ dataset }: { dataset: CostDataset }) {
  const scopedCostTotal = dataset.indirectCosts
    .filter((cost) => cost.divisionId)
    .reduce((total, cost) => total + cost.amount, 0);
  const globalCostTotal = dataset.indirectCosts
    .filter((cost) => !cost.divisionId)
    .reduce((total, cost) => total + cost.amount, 0);
  const comparisons = bases.map((basis) => {
    const rows = calculateProjectProfitability(dataset, basis);
    const totals = summarize(rows);
    const best = [...rows].sort((a, b) => b.netProfit - a.netProfit)[0];
    const worst = [...rows].sort((a, b) => a.netProfit - b.netProfit)[0];

    return { basis, rows, totals, best, worst };
  });
  const baselineRows = comparisons[0].rows;
  const comparisonDetails = comparisons.map((comparison) => {
    const projectDeltas = comparison.rows
      .map((row) => {
        const baseline = baselineRows.find((item) => item.projectId === row.projectId);
        return {
          projectName: row.projectName,
          delta: baseline ? row.netProfit - baseline.netProfit : 0,
        };
      })
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

    return {
      ...comparison,
      changedProjects: projectDeltas.filter((item) => Math.round(item.delta) !== 0).length,
      largestDelta: projectDeltas[0],
    };
  });

  return (
    <section className="mx-auto max-w-7xl px-5 pb-6">
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-slate-950">배부 엔진 비교</h2>
        <div className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
          <EngineMetric label="전사 공통비 풀" value={currency.format(globalCostTotal)} />
          <EngineMetric label="본부별 공통비 풀" value={currency.format(scopedCostTotal)} />
          <EngineMetric
            label="평균 프로젝트 가중치"
            value={(
              dataset.projects.reduce(
                (total, project) => total + (project.allocationWeight ?? 1),
                0,
              ) / dataset.projects.length
            ).toFixed(2)}
          />
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {comparisonDetails.map(({ basis, totals, best, worst, changedProjects, largestDelta }) => (
            <div key={basis} className="rounded-md border border-slate-200 p-4">
              <p className="text-sm font-semibold text-teal-700">{allocationLabels[basis]}</p>
              <dl className="mt-3 grid gap-2 text-sm">
                <ComparisonRow label="총 배부 공통비" value={currency.format(totals.allocatedIndirectCost)} />
                <ComparisonRow label="전체 순이익" value={currency.format(totals.netProfit)} />
                <ComparisonRow label="전체 이익률" value={percent(totals.netProfit / totals.revenue)} />
                <ComparisonRow label="기준 대비 변동 프로젝트" value={`${changedProjects}개`} />
                <ComparisonRow
                  label="최대 손익 변동"
                  value={
                    largestDelta
                      ? `${largestDelta.projectName} ${currency.format(largestDelta.delta)}`
                      : '-'
                  }
                />
                <ComparisonRow label="최고 수익 프로젝트" value={best.projectName} />
                <ComparisonRow label="최저 수익 프로젝트" value={worst.projectName} />
              </dl>
            </div>
          ))}
        </div>
        <p className="mt-3 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">
          총 배부 공통비와 전체 순이익은 같은 공통비 풀을 전액 배부하므로 기준별로 동일할 수 있습니다.
          차이는 프로젝트별 배부액과 순위 변동에서 확인합니다.
        </p>
      </div>
    </section>
  );
}

function EngineMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-slate-50 p-3">
      <p className="text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function ComparisonRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="max-w-[58%] text-right font-medium text-slate-900">{value}</dd>
    </div>
  );
}
