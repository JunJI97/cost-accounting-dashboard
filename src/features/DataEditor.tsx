import { Plus, RefreshCw, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { currency } from '../domain/format';
import type { CostDataset } from '../domain/types';
import { CsvExchangePanel } from './CsvExchangePanel';
import { useCostingStore } from '../store/useCostingStore';

type DataEditorProps = {
  dataset: CostDataset;
};

export function DataEditor({ dataset }: DataEditorProps) {
  const {
    resetDataset,
    addProject,
    deleteProject,
    updateProjectRevenue,
    updateProjectAllocationWeight,
    addEmployee,
    deleteEmployee,
    updateEmployeeRate,
    addTimeEntry,
    deleteTimeEntry,
    updateTimeEntryHours,
    addDirectCost,
    deleteDirectCost,
    updateDirectCost,
    addIndirectCost,
    deleteIndirectCost,
    updateIndirectCost,
    updateIndirectCostDivision,
  } = useCostingStore();

  return (
    <section className="mx-auto max-w-7xl px-5 pb-6">
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-950">데이터 입력 및 수정</h2>
            <p className="text-sm text-slate-500">
              DB 없이 브라우저 localStorage에 저장됩니다. 샘플과 다르면 초기화로 되돌릴 수 있습니다.
            </p>
          </div>
          <button
            type="button"
            onClick={resetDataset}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw size={16} aria-hidden="true" />
            샘플 데이터 초기화
          </button>
        </div>

        <div className="mb-5">
          <CsvExchangePanel dataset={dataset} />
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          <EditorPanel title="프로젝트 매출">
            <PanelAction label="프로젝트 추가" onClick={addProject} />
            <div className="max-h-80 overflow-y-auto overflow-x-hidden pr-1">
              <div className="grid gap-2">
                {dataset.projects.map((project) => (
                  <div key={project.id} className="rounded-md border border-slate-100 p-2">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">{project.name}</p>
                        <p className="text-xs text-slate-500">
                          {dataset.divisions.find((division) => division.id === project.divisionId)?.name}
                        </p>
                      </div>
                      <IconButton label="프로젝트 삭제" onClick={() => deleteProject(project.id)} />
                    </div>
                    <div className="grid gap-2 sm:grid-cols-[1fr_120px]">
                      <FieldLabel label="매출">
                        <MoneyInput
                          value={project.revenue}
                          onChange={(value) => updateProjectRevenue(project.id, value)}
                        />
                      </FieldLabel>
                      <FieldLabel label="배부 가중치">
                        <NumberInput
                          value={project.allocationWeight ?? 1}
                          step={0.05}
                          onChange={(value) => updateProjectAllocationWeight(project.id, value)}
                        />
                      </FieldLabel>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </EditorPanel>

          <EditorPanel title="직원 시급">
            <PanelAction label="직원 추가" onClick={addEmployee} />
            <div className="max-h-80 overflow-y-auto overflow-x-hidden pr-1">
              <div className="grid gap-2">
                {dataset.employees.map((employee) => (
                  <div
                    key={employee.id}
                    className="grid gap-2 rounded-md border border-slate-100 p-2 sm:grid-cols-[1fr_160px_32px]"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{employee.name}</p>
                      <p className="text-xs text-slate-500">
                        {dataset.divisions.find((division) => division.id === employee.divisionId)?.name}
                      </p>
                    </div>
                    <FieldLabel label="시급">
                      <MoneyInput
                        value={employee.hourlyRate}
                        step={1000}
                        onChange={(value) => updateEmployeeRate(employee.id, value)}
                      />
                    </FieldLabel>
                    <div className="flex items-end">
                      <IconButton label="직원 삭제" onClick={() => deleteEmployee(employee.id)} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </EditorPanel>

          <EditorPanel title="대표 Time-sheet">
            <PanelAction label="투입 시간 추가" onClick={addTimeEntry} />
            <div className="max-h-80 overflow-y-auto overflow-x-hidden pr-1">
              <div className="grid gap-2">
                {dataset.timeEntries.slice(0, 30).map((entry) => (
                  <div
                    key={`${entry.employeeId}-${entry.projectId}`}
                    className="grid gap-2 rounded-md border border-slate-100 p-2 sm:grid-cols-[1fr_110px_32px]"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {dataset.projects.find((project) => project.id === entry.projectId)?.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {dataset.employees.find((employee) => employee.id === entry.employeeId)?.name}
                      </p>
                    </div>
                    <FieldLabel label="투입 시간">
                      <NumberInput
                        value={entry.hours}
                        onChange={(value) =>
                          updateTimeEntryHours(entry.employeeId, entry.projectId, value)
                        }
                      />
                    </FieldLabel>
                    <div className="flex items-end">
                      <IconButton
                        label="투입 시간 삭제"
                        onClick={() => deleteTimeEntry(entry.employeeId, entry.projectId)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </EditorPanel>

          <EditorPanel title="직접비 및 공통비">
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-700">직접비</p>
                  <PanelAction label="직접비 추가" onClick={addDirectCost} compact />
                </div>
                <div className="max-h-64 overflow-y-auto overflow-x-hidden pr-1">
                  {dataset.directCosts.map((cost) => (
                    <div key={cost.id} className="mb-2 rounded-md border border-slate-100 p-2">
                      <div className="flex items-start justify-between gap-2">
                        <CostLine
                          label={`${cost.label} · ${
                            dataset.projects.find((project) => project.id === cost.projectId)?.name
                          }`}
                          amount={cost.amount}
                          onChange={(value) => updateDirectCost(cost.id, value)}
                        />
                        <IconButton label="직접비 삭제" onClick={() => deleteDirectCost(cost.id)} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-700">공통비</p>
                  <PanelAction label="공통비 추가" onClick={addIndirectCost} compact />
                </div>
                <div className="max-h-64 overflow-y-auto overflow-x-hidden pr-1">
                  {dataset.indirectCosts.map((cost) => (
                    <div key={cost.id} className="mb-2 rounded-md border border-slate-100 p-2">
                      <div className="flex items-start justify-between gap-2">
                        <CostLine
                          label={cost.label}
                          amount={cost.amount}
                          onChange={(value) => updateIndirectCost(cost.id, value)}
                        />
                        <IconButton label="공통비 삭제" onClick={() => deleteIndirectCost(cost.id)} />
                      </div>
                      <label className="grid gap-1 text-sm">
                        <span className="text-slate-600">공통비 풀</span>
                        <select
                          className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm"
                          value={cost.divisionId ?? ''}
                          onChange={(event) =>
                            updateIndirectCostDivision(
                              cost.id,
                              event.target.value === '' ? undefined : event.target.value,
                            )
                          }
                        >
                          <option value="">전사 공통</option>
                          {dataset.divisions.map((division) => (
                            <option key={division.id} value={division.id}>
                              {division.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </EditorPanel>
        </div>
      </div>
    </section>
  );
}

function EditorPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-md border border-slate-200 p-3">
      <h3 className="mb-3 text-sm font-semibold text-slate-900">{title}</h3>
      {children}
    </div>
  );
}

function CostLine({
  label,
  amount,
  onChange,
}: {
  label: string;
  amount: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="mb-2 grid flex-1 gap-2 text-sm">
      <span className="line-clamp-1 text-slate-600">{label}</span>
      <MoneyInput value={amount} onChange={onChange} />
    </label>
  );
}

function PanelAction({
  label,
  compact,
  onClick,
}: {
  label: string;
  compact?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`mb-3 inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 ${
        compact ? 'h-8 px-2' : 'h-9 px-3'
      }`}
    >
      <Plus size={15} aria-hidden="true" />
      {label}
    </button>
  );
}

function IconButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex size-8 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-500 hover:bg-red-50 hover:text-red-700"
    >
      <Trash2 size={15} aria-hidden="true" />
    </button>
  );
}

function FieldLabel({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="text-xs font-medium text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function MoneyInput({
  value,
  step = 100000,
  onChange,
}: {
  value: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <input
      className="h-9 w-full rounded-md border border-slate-300 px-2 text-sm"
      min={0}
      step={step}
      type="number"
      value={Math.round(value)}
      title={currency.format(value)}
      onChange={(event) => onChange(Number(event.target.value))}
    />
  );
}

function NumberInput({
  value,
  step = 1,
  onChange,
}: {
  value: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <input
      className="h-9 w-full rounded-md border border-slate-300 px-2 text-sm"
      min={0}
      step={step}
      type="number"
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
    />
  );
}
