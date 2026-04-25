import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import {
  BarChart3,
  Calculator,
  Database,
  Gauge,
  GitCompare,
  LayoutDashboard,
  LineChart,
  ScrollText,
  TrendingUp,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell as RechartsCell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { calculateProjectProfitability, simulateAdditionalStaff, summarize } from './domain/costing';
import { currency, number, percent } from './domain/format';
import type { AllocationBasis, ProjectProfitability } from './domain/types';
import { AllocationComparison } from './features/AllocationComparison';
import { DataEditor } from './features/DataEditor';
import { ReportSummary } from './features/ReportSummary';
import { useCostingStore } from './store/useCostingStore';

type TabId = 'dashboard' | 'data' | 'allocation' | 'simulation' | 'report';

const tabs: Array<{ id: TabId; label: string; icon: typeof LayoutDashboard }> = [
  { id: 'dashboard', label: '대시보드', icon: LayoutDashboard },
  { id: 'data', label: '데이터 관리', icon: Database },
  { id: 'allocation', label: '배부 엔진', icon: GitCompare },
  { id: 'simulation', label: '시뮬레이션', icon: LineChart },
  { id: 'report', label: '리포트', icon: ScrollText },
];

const allocationLabels: Record<AllocationBasis, string> = {
  laborHours: '투입 시간',
  laborCost: '인건비',
  revenue: '매출',
};

function App() {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const { dataset, allocationBasis, setAllocationBasis, simulation, setSimulation } =
    useCostingStore();

  const rows = useMemo(
    () => calculateProjectProfitability(dataset, allocationBasis),
    [dataset, allocationBasis],
  );
  const totals = useMemo(() => summarize(rows), [rows]);
  const simulatedRows = useMemo(() => {
    const scenario = simulateAdditionalStaff(dataset, simulation);
    return calculateProjectProfitability(scenario, allocationBasis);
  }, [dataset, allocationBasis, simulation]);
  const simulatedTotals = useMemo(() => summarize(simulatedRows), [simulatedRows]);
  const selectedProject = rows.find((row) => row.projectId === simulation.projectId) ?? rows[0];
  const simulatedProject =
    simulatedRows.find((row) => row.projectId === simulation.projectId) ?? simulatedRows[0];

  const chartRows = rows.slice(0, 8).map((row) => ({
    name: row.projectName.replace(' 관리회계 고도화', ''),
    내부인건비: Math.round(row.internalLaborCost / 1000000),
    외주용역비: Math.round(row.outsourcingCost / 1000000),
    직접경비: Math.round(row.directExpenseCost / 1000000),
    공통비: Math.round(row.allocatedIndirectCost / 1000000),
  }));

  return (
    <main className="min-h-screen bg-[#f6f7f9] text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-5">
          <div className="flex flex-col gap-1">
            <div>
              <p className="text-sm font-semibold text-teal-700">NOA Cost Accounting</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-normal text-slate-950">
                원가 집계 및 관리회계 분석
              </h1>
            </div>
          </div>

          <nav className="mt-5 overflow-x-auto">
            <div className="flex min-w-max gap-2 border-b border-slate-200">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const selected = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`inline-flex h-11 items-center gap-2 border-b-2 px-3 text-sm font-medium transition ${
                      selected
                        ? 'border-teal-700 text-teal-700'
                        : 'border-transparent text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <Icon size={16} aria-hidden="true" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </nav>
        </div>
      </header>

      {activeTab === 'dashboard' && (
        <>
          <Metrics totals={totals} />
          <section className="mx-auto grid max-w-7xl gap-5 px-5 pb-6">
            <DashboardCommandCenter rows={rows} totals={totals} />
            <ProjectProfitCard rows={rows} allocationBasis={allocationBasis} />
            <ChartCard chartRows={chartRows} />
          </section>
        </>
      )}

      {activeTab === 'data' && <DataEditor dataset={dataset} />}

      {activeTab === 'allocation' && (
        <>
          <section className="mx-auto max-w-7xl px-5 py-5">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-slate-950">배부 기준 선택</h2>
                  <p className="text-sm text-slate-500">
                    선택한 기준은 아래 프로젝트 손익표와 대시보드, 시뮬레이션, 리포트 계산에 즉시 반영됩니다.
                  </p>
                </div>
                <AllocationSelector
                  allocationBasis={allocationBasis}
                  setAllocationBasis={setAllocationBasis}
                />
              </div>
            </div>
          </section>
          <section className="mx-auto max-w-7xl px-5 pb-6">
            <ProjectProfitCard rows={rows} allocationBasis={allocationBasis} />
          </section>
          <AllocationComparison dataset={dataset} />
        </>
      )}

      {activeTab === 'simulation' && (
        <>
          <Metrics totals={simulatedTotals} labelPrefix="시뮬레이션" />
          <section className="mx-auto grid max-w-7xl gap-5 px-5 pb-6 xl:grid-cols-[0.8fr_1.2fr]">
            <SimulationPanel
              rows={rows}
              simulatedRows={simulatedRows}
              selectedProject={selectedProject}
              simulatedProject={simulatedProject}
              simulatedTotals={simulatedTotals}
              totals={totals}
            />
            <ProjectProfitCard rows={simulatedRows} allocationBasis={allocationBasis} />
          </section>
        </>
      )}

      {activeTab === 'report' && (
        <ReportSummary rows={rows} />
      )}
    </main>
  );
}

function DashboardCommandCenter({
  rows,
  totals,
}: {
  rows: ProjectProfitability[];
  totals: ReturnType<typeof summarize>;
}) {
  const topProject = [...rows].sort((a, b) => b.netProfit - a.netProfit)[0];
  const weakProject = [...rows].sort((a, b) => a.margin - b.margin)[0];
  const highOutsourcing = [...rows].sort(
    (a, b) => ratio(b.outsourcingCost, b.totalCost) - ratio(a.outsourcingCost, a.totalCost),
  )[0];
  const divisionRows = Object.values(
    rows.reduce<
      Record<string, { divisionName: string; revenue: number; netProfit: number; totalCost: number }>
    >((acc, row) => {
      acc[row.divisionName] ??= {
        divisionName: row.divisionName,
        revenue: 0,
        netProfit: 0,
        totalCost: 0,
      };
      acc[row.divisionName].revenue += row.revenue;
      acc[row.divisionName].netProfit += row.netProfit;
      acc[row.divisionName].totalCost += row.totalCost;
      return acc;
    }, {}),
  ).sort((a, b) => ratio(b.netProfit, b.revenue) - ratio(a.netProfit, a.revenue));
  const lowMarginCount = rows.filter((row) => row.margin < 0.1).length;
  const lossCount = rows.filter((row) => row.netProfit < 0).length;
  const costCoverage = ratio(totals.totalCost, totals.revenue);

  return (
    <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold text-slate-950">경영 현황 요약</h2>
          <p className="text-sm text-slate-500">수익성, 원가 구조, 위험 프로젝트를 한 번에 확인합니다.</p>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <DashboardSignal
            label="원가율"
            value={percent(costCoverage)}
            detail={`매출 ${currency.format(totals.revenue)} 대비 총원가`}
            tone={costCoverage > 0.9 ? 'danger' : costCoverage > 0.75 ? 'warning' : 'good'}
          />
          <DashboardSignal
            label="저마진 프로젝트"
            value={`${number.format(lowMarginCount)}개`}
            detail={`손실 프로젝트 ${number.format(lossCount)}개 포함`}
            tone={lowMarginCount > 5 ? 'danger' : lowMarginCount > 2 ? 'warning' : 'good'}
          />
          <DashboardSignal
            label="최고 수익"
            value={currency.format(topProject.netProfit)}
            detail={topProject.projectName}
            tone="good"
          />
          <DashboardSignal
            label="외주 의존 리스크"
            value={percent(ratio(highOutsourcing.outsourcingCost, highOutsourcing.totalCost))}
            detail={highOutsourcing.projectName}
            tone="purple"
          />
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold text-slate-950">본부별 성과 스냅샷</h2>
          <p className="text-sm text-slate-500">이익률 기준으로 본부 수익성을 정렬했습니다.</p>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="h-9 px-2 font-medium">본부</th>
                <th className="h-9 px-2 text-right font-medium">매출</th>
                <th className="h-9 px-2 text-right font-medium">순이익</th>
                <th className="h-9 px-2 text-right font-medium">이익률</th>
              </tr>
            </thead>
            <tbody>
              {divisionRows.map((division) => (
                <tr key={division.divisionName} className="border-b border-slate-100">
                  <td className="px-2 py-2 font-medium text-slate-900">{division.divisionName}</td>
                  <td className="px-2 py-2 text-right tabular-nums">
                    {currency.format(division.revenue)}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums">
                    {currency.format(division.netProfit)}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums">
                    {percent(ratio(division.netProfit, division.revenue))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">
          개선 우선순위: <b className="text-slate-900">{weakProject.projectName}</b>의 이익률{' '}
          <b className="text-red-700">{percent(weakProject.margin)}</b>을 먼저 점검하세요.
        </div>
      </div>
    </div>
  );
}

function DashboardSignal({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone: 'good' | 'warning' | 'danger' | 'purple';
}) {
  const toneClass = {
    good: 'text-teal-700 bg-teal-50',
    warning: 'text-amber-700 bg-amber-50',
    danger: 'text-red-700 bg-red-50',
    purple: 'text-violet-700 bg-violet-50',
  }[tone];

  return (
    <div className="rounded-md border border-slate-200 p-3">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={`mt-2 inline-flex rounded-md px-2 py-1 text-base font-semibold ${toneClass}`}>
        {value}
      </p>
      <p className="mt-2 truncate text-sm text-slate-600">{detail}</p>
    </div>
  );
}

function AllocationSelector({
  allocationBasis,
  setAllocationBasis,
}: {
  allocationBasis: AllocationBasis;
  setAllocationBasis: (basis: AllocationBasis) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {Object.entries(allocationLabels).map(([value, label]) => (
        <button
          key={value}
          type="button"
          onClick={() => setAllocationBasis(value as AllocationBasis)}
          className={`h-10 rounded-md border px-4 text-sm font-medium transition ${
            allocationBasis === value
              ? 'border-teal-700 bg-teal-700 text-white'
              : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          {label} 배부
        </button>
      ))}
    </div>
  );
}

function Metrics({
  totals,
  labelPrefix,
}: {
  totals: ReturnType<typeof summarize>;
  labelPrefix?: string;
}) {
  const prefix = labelPrefix ? `${labelPrefix} ` : '';

  return (
    <section className="mx-auto grid max-w-7xl gap-4 px-5 py-5 sm:grid-cols-2 xl:grid-cols-4">
      <Metric icon={TrendingUp} label={`${prefix}총 매출`} value={currency.format(totals.revenue)} />
      <Metric icon={Calculator} label={`${prefix}총 원가`} value={currency.format(totals.totalCost)} />
      <Metric icon={Gauge} label={`${prefix}순이익`} value={currency.format(totals.netProfit)} />
      <Metric
        icon={BarChart3}
        label={`${prefix}평균 이익률`}
        value={percent(totals.netProfit / totals.revenue)}
      />
    </section>
  );
}

function ProjectProfitCard({
  rows,
  allocationBasis,
}: {
  rows: ProjectProfitability[];
  allocationBasis: AllocationBasis;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-950">프로젝트 손익</h2>
          <p className="text-sm text-slate-500">5개 본부, 20개 프로젝트 기준</p>
        </div>
        <span className="text-sm font-medium text-teal-700">
          현재 기준: {allocationLabels[allocationBasis]}
        </span>
      </div>
      <ProfitabilityTable rows={rows} />
    </div>
  );
}

function ChartCard({
  chartRows,
}: {
  chartRows: Array<{
    name: string;
    내부인건비: number;
    외주용역비: number;
    직접경비: number;
    공통비: number;
  }>;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-base font-semibold text-slate-950">원가 구성 Top 8</h2>
      <div className="mt-4 h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartRows}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip formatter={(value) => `${number.format(Number(value))}백만원`} />
            <Legend />
            <Bar dataKey="내부인건비" stackId="cost" fill="#0f766e" />
            <Bar dataKey="외주용역비" stackId="cost" fill="#7c3aed" />
            <Bar dataKey="직접경비" stackId="cost" fill="#2563eb" />
            <Bar dataKey="공통비" stackId="cost" fill="#f59e0b" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function ratio(numerator: number, denominator: number) {
  if (!Number.isFinite(denominator) || denominator === 0) {
    return 0;
  }
  return numerator / denominator;
}

function SimulationPanel({
  rows,
  simulatedRows,
  selectedProject,
  simulatedProject,
  totals,
  simulatedTotals,
}: {
  rows: ProjectProfitability[];
  simulatedRows: ProjectProfitability[];
  selectedProject: ProjectProfitability;
  simulatedProject: ProjectProfitability;
  totals: ReturnType<typeof summarize>;
  simulatedTotals: ReturnType<typeof summarize>;
}) {
  const {
    dataset,
    allocationBasis,
    simulation,
    savedScenarios,
    setSimulation,
    saveScenario,
    applyScenario,
    deleteScenario,
  } = useCostingStore();
  const projectDeltaRows = simulatedRows
    .map((row) => {
      const before = rows.find((target) => target.projectId === row.projectId);
      return {
        ...row,
        profitDelta: before ? row.netProfit - before.netProfit : 0,
      };
    })
    .sort((a, b) => Math.abs(b.profitDelta) - Math.abs(a.profitDelta))
    .slice(0, 5);
  const scenarioRows = savedScenarios.map((scenario) => {
    const scenarioDataset = simulateAdditionalStaff(dataset, scenario.input);
    const scenarioTotals = summarize(calculateProjectProfitability(scenarioDataset, allocationBasis));
    const projectName =
      dataset.projects.find((project) => project.id === scenario.input.projectId)?.name ??
      '삭제된 프로젝트';

    return {
      ...scenario,
      projectName,
      totalProfitDelta: scenarioTotals.netProfit - totals.netProfit,
    };
  });
  const waterfallRows = buildWaterfallRows(selectedProject, simulatedProject);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-semibold text-slate-950">What-if 분석</h2>
        <button
          type="button"
          onClick={saveScenario}
          className="h-9 rounded-md bg-teal-700 px-3 text-sm font-medium text-white hover:bg-teal-800"
        >
          현재 시나리오 저장
        </button>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="text-sm font-medium text-slate-700">대상 프로젝트</span>
          <select
            className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
            value={simulation.projectId}
            onChange={(event) => setSimulation({ projectId: event.target.value })}
          >
            {dataset.projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>
        <NumberField
          label="추가 인력"
          suffix="명"
          value={simulation.additionalPeople}
          onChange={(additionalPeople) => setSimulation({ additionalPeople })}
        />
        <NumberField
          label="1인당 투입 시간"
          suffix="시간/월"
          value={simulation.hoursPerPerson}
          onChange={(hoursPerPerson) => setSimulation({ hoursPerPerson })}
        />
        <NumberField
          label="시급"
          format="currency"
          suffix="원/시간"
          value={simulation.hourlyRate}
          step={1000}
          onChange={(hourlyRate) => setSimulation({ hourlyRate })}
        />
        <NumberField
          label="매출 증감"
          format="currency"
          suffix="원"
          value={simulation.revenueDelta}
          step={1000000}
          min={-selectedProject.revenue}
          onChange={(revenueDelta) => setSimulation({ revenueDelta })}
        />
        <NumberField
          label="공통비 증감"
          format="currency"
          suffix="원"
          value={simulation.indirectCostDelta}
          step={1000000}
          min={-1000000000}
          onChange={(indirectCostDelta) => setSimulation({ indirectCostDelta })}
        />
      </div>

      <div className="mt-5 rounded-md bg-slate-50 p-4">
        <p className="text-sm font-semibold text-slate-800">{selectedProject.projectName}</p>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <Result label="현재 순이익" value={currency.format(selectedProject.netProfit)} />
          <Result label="변경 후 순이익" value={currency.format(simulatedProject.netProfit)} />
          <Result
            label="프로젝트 영향"
            value={currency.format(simulatedProject.netProfit - selectedProject.netProfit)}
          />
          <Result
            label="전체 영향"
            value={currency.format(simulatedTotals.netProfit - totals.netProfit)}
          />
        </dl>
      </div>

      <div className="mt-5 rounded-md border border-slate-200 p-4">
        <p className="text-sm font-semibold text-slate-900">이익 변화 폭포수</p>
        <div className="mt-3 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={waterfallRows} margin={{ top: 12, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `${number.format(Number(value))}백만`} />
              <Tooltip
                formatter={(_, __, item) =>
                  `${currency.format(Number(item.payload.displayValue))}`
                }
              />
              <Bar dataKey="base" stackId="waterfall" fill="transparent" />
              <Bar dataKey="value" stackId="waterfall">
                {waterfallRows.map((row) => (
                  <RechartsCell key={row.name} fill={row.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-5">
        <p className="text-sm font-semibold text-slate-900">영향도 Top 5</p>
        <div className="mt-2 space-y-2">
          {projectDeltaRows.map((row) => (
            <div
              key={row.projectId}
              className="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-2 text-sm"
            >
              <span className="truncate text-slate-700">{row.projectName}</span>
              <span className="font-semibold text-slate-950">{currency.format(row.profitDelta)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <p className="text-sm font-semibold text-slate-900">저장된 시나리오</p>
        <div className="mt-2 grid gap-2">
          {scenarioRows.length === 0 ? (
            <div className="rounded-md border border-dashed border-slate-300 px-3 py-4 text-sm text-slate-500">
              저장된 시나리오가 없습니다.
            </div>
          ) : (
            scenarioRows.map((scenario) => (
              <div key={scenario.id} className="rounded-md border border-slate-200 p-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">{scenario.name}</p>
                    <p className="mt-1 truncate text-slate-500">{scenario.projectName}</p>
                  </div>
                  <p
                    className={`shrink-0 font-semibold ${
                      scenario.totalProfitDelta >= 0 ? 'text-teal-700' : 'text-red-700'
                    }`}
                  >
                    {currency.format(scenario.totalProfitDelta)}
                  </p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => applyScenario(scenario.id)}
                    className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    적용
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteScenario(scenario.id)}
                    className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs font-medium text-red-700 hover:bg-red-50"
                  >
                    삭제
                  </button>
                  <span className="inline-flex h-8 items-center rounded-md bg-slate-50 px-2 text-xs text-slate-500">
                    인력 {scenario.input.additionalPeople}명 · 매출 {currency.format(scenario.input.revenueDelta)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function buildWaterfallRows(
  selectedProject: ProjectProfitability,
  simulatedProject: ProjectProfitability,
) {
  const currentProfit = selectedProject.netProfit;
  const revenueImpact = simulatedProject.revenue - selectedProject.revenue;
  const internalLaborImpact = -(simulatedProject.internalLaborCost - selectedProject.internalLaborCost);
  const outsourcingImpact = -(simulatedProject.outsourcingCost - selectedProject.outsourcingCost);
  const indirectImpact = -(
    simulatedProject.allocatedIndirectCost - selectedProject.allocatedIndirectCost
  );
  const directExpenseImpact = -(
    simulatedProject.directExpenseCost - selectedProject.directExpenseCost
  );
  const finalProfit = simulatedProject.netProfit;

  const changes = [
    { name: '매출 증감', amount: revenueImpact },
    { name: '내부 인건비', amount: internalLaborImpact },
    { name: '외주 용역비', amount: outsourcingImpact },
    { name: '직접경비', amount: directExpenseImpact },
    { name: '공통비 배부', amount: indirectImpact },
  ].filter((row) => Math.round(row.amount) !== 0);

  let runningProfit = currentProfit;
  const rows = [
    {
      name: '현재 이익',
      base: 0,
      value: Math.round(currentProfit / 1000000),
      displayValue: currentProfit,
      fill: '#334155',
    },
  ];

  for (const change of changes) {
    const nextProfit = runningProfit + change.amount;
    rows.push({
      name: change.name,
      base: Math.round(Math.min(runningProfit, nextProfit) / 1000000),
      value: Math.round(Math.abs(change.amount) / 1000000),
      displayValue: change.amount,
      fill: change.amount >= 0 ? '#0f766e' : '#dc2626',
    });
    runningProfit = nextProfit;
  }

  rows.push({
    name: '예상 이익',
    base: 0,
    value: Math.round(finalProfit / 1000000),
    displayValue: finalProfit,
    fill: '#2563eb',
  });

  return rows;
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-md bg-teal-50 text-teal-700">
          <Icon size={20} aria-hidden="true" />
        </div>
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="text-lg font-semibold text-slate-950">{value}</p>
        </div>
      </div>
    </div>
  );
}

function ProfitabilityTable({ rows }: { rows: ProjectProfitability[] }) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'netProfit', desc: true }]);
  const columns = useMemo<ColumnDef<ProjectProfitability>[]>(
    () => [
      { accessorKey: 'projectName', header: '프로젝트' },
      { accessorKey: 'divisionName', header: '본부' },
      {
        accessorKey: 'revenue',
        header: '매출',
        cell: ({ getValue }) => currency.format(getValue<number>()),
      },
      {
        accessorKey: 'internalLaborCost',
        header: '내부 인건비',
        cell: ({ getValue }) => currency.format(getValue<number>()),
      },
      {
        accessorKey: 'manMonths',
        header: 'M/M',
        cell: ({ getValue }) => getValue<number>().toFixed(2),
      },
      {
        accessorKey: 'outsourcingCost',
        header: '외주 용역비',
        cell: ({ getValue }) => currency.format(getValue<number>()),
      },
      {
        accessorKey: 'directExpenseCost',
        header: '직접경비',
        cell: ({ getValue }) => currency.format(getValue<number>()),
      },
      {
        accessorKey: 'allocatedIndirectCost',
        header: '배부 공통비',
        cell: ({ getValue }) => currency.format(getValue<number>()),
      },
      {
        accessorKey: 'netProfit',
        header: '순이익',
        cell: ({ getValue }) => currency.format(getValue<number>()),
      },
      {
        accessorKey: 'margin',
        header: '이익률',
        cell: ({ getValue }) => percent(getValue<number>()),
      },
      { accessorKey: 'primaryDriver', header: '원가 동인' },
    ],
    [],
  );
  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1180px] border-collapse text-sm">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="border-b border-slate-200">
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="h-10 whitespace-nowrap px-3 text-left font-semibold text-slate-600"
                >
                  <button
                    type="button"
                    onClick={header.column.getToggleSortingHandler()}
                    className="rounded-sm hover:text-slate-950"
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </button>
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50">
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="h-11 whitespace-nowrap px-3 text-slate-700">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function NumberField({
  label,
  value,
  suffix,
  format = 'number',
  step = 1,
  min = 0,
  onChange,
}: {
  label: string;
  value: number;
  suffix?: string;
  format?: 'number' | 'currency';
  step?: number;
  min?: number;
  onChange: (value: number) => void;
}) {
  const displayValue = format === 'currency' ? formatNumberInput(value) : String(value);

  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <div className="relative mt-1">
        <input
          className={`h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm tabular-nums ${
            suffix ? 'pr-20' : ''
          } ${format === 'currency' ? 'text-right' : ''}`}
          inputMode={step % 1 === 0 ? 'numeric' : 'decimal'}
          value={displayValue}
          onChange={(event) => {
            const nextValue =
              format === 'currency'
                ? parseFormattedNumber(event.target.value)
                : Number(event.target.value);
            onChange(Math.max(min, Number.isFinite(nextValue) ? nextValue : 0));
          }}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-500">
            {suffix}
          </span>
        )}
      </div>
    </label>
  );
}

function formatNumberInput(value: number) {
  return Math.round(value).toLocaleString('ko-KR');
}

function parseFormattedNumber(value: string) {
  const normalized = value.replace(/,/g, '').replace(/[^\d.-]/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function Result({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-slate-500">{label}</dt>
      <dd className="mt-1 font-semibold text-slate-950">{value}</dd>
    </div>
  );
}

export default App;
