import { Plus, RefreshCw, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import type {
  CostDataset,
  Employee,
  ExpenseLedger,
  Project,
  ProjectAssignment,
  TimeEntry,
} from '../domain/types';
import { CsvExchangePanel } from './CsvExchangePanel';
import { useCostingStore } from '../store/useCostingStore';

type DataEditorProps = {
  dataset: CostDataset;
};

type DataTab = 'labor' | 'projects' | 'daily' | 'costs' | 'exchange';
type SortDirection = 'asc' | 'desc';
type SortState = {
  table: DataTab;
  key: string;
  direction: SortDirection;
};

const dataTabs: Array<{ id: DataTab; label: string; description: string }> = [
  { id: 'labor', label: '인건비', description: '사번, 급여, 수당 관리' },
  { id: 'projects', label: '프로젝트', description: '인력별 프로젝트 투입기간' },
  { id: 'daily', label: 'Daily Report', description: '일자별 투입시간' },
  { id: 'costs', label: '직접비/공통비', description: '비용 원장 관리' },
  { id: 'exchange', label: '엑셀 연동', description: '통합 엑셀 가져오기/내보내기' },
];

export function DataEditor({ dataset }: DataEditorProps) {
  const [activeTab, setActiveTab] = useState<DataTab>('labor');
  const [sortState, setSortState] = useState<SortState>({
    table: 'labor',
    key: 'employeeNo',
    direction: 'asc',
  });
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const {
    resetDataset,
    updateDatasetPart,
    addEmployee,
    deleteEmployee,
    addTimeEntry,
    deleteTimeEntry,
  } = useCostingStore();

  const updateEmployee = (employeeId: string, patch: Partial<Employee>) => {
    updateDatasetPart(
      'employees',
      dataset.employees.map((employee) =>
        employee.id === employeeId ? { ...employee, ...patch } : employee,
      ),
    );
  };

  const updateProject = (projectId: string, patch: Partial<Project>) => {
    updateDatasetPart(
      'projects',
      dataset.projects.map((project) =>
        project.id === projectId ? { ...project, ...patch } : project,
      ),
    );
  };

  const updateAssignment = (assignmentId: string, patch: Partial<ProjectAssignment>) => {
    updateDatasetPart(
      'projectAssignments',
      dataset.projectAssignments.map((assignment) =>
        assignment.id === assignmentId ? { ...assignment, ...patch } : assignment,
      ),
    );
  };

  const updateTimeEntry = (entryId: string, patch: Partial<TimeEntry>) => {
    updateDatasetPart(
      'timeEntries',
      dataset.timeEntries.map((entry) => (entry.id === entryId ? { ...entry, ...patch } : entry)),
    );
  };

  const updateExpense = (expenseId: string, patch: Partial<ExpenseLedger>) => {
    updateDatasetPart(
      'expenses',
      dataset.expenses.map((expense) =>
        expense.id === expenseId ? { ...expense, ...patch } : expense,
      ),
    );
  };

  const addExpense = () => {
    updateDatasetPart('expenses', [
      {
        id: `exp-custom-${Date.now()}`,
        expenseDate: new Date().toISOString().slice(0, 10),
        projectId: dataset.projects[0]?.id,
        expenseType: '직접경비',
        amount: 1000000,
        description: '신규 지출',
      },
      ...dataset.expenses,
    ]);
  };

  const deleteExpense = (expenseId: string) => {
    updateDatasetPart(
      'expenses',
      dataset.expenses.filter((expense) => expense.id !== expenseId),
    );
  };

  const addAssignment = () => {
    const employeeId = dataset.employees[0]?.id;
    const projectId = dataset.projects[0]?.id;
    if (!employeeId || !projectId) return;
    updateDatasetPart('projectAssignments', [
      {
        id: `pa-custom-${Date.now()}`,
        employeeId,
        projectId,
        startDate: '2026-04-01',
        endDate: '2026-06-30',
      },
      ...dataset.projectAssignments,
    ]);
  };

  const deleteAssignment = (assignmentId: string) => {
    updateDatasetPart(
      'projectAssignments',
      dataset.projectAssignments.filter((assignment) => assignment.id !== assignmentId),
    );
  };

  const requestSort = (table: DataTab, key: string) => {
    setSortState((current) => ({
      table,
      key,
      direction:
        current.table === table && current.key === key && current.direction === 'asc'
          ? 'desc'
          : 'asc',
    }));
  };

  const handleResetDataset = () => {
    resetDataset();
    setIsResetModalOpen(true);
  };

  const sortedEmployees = sortRows(dataset.employees, sortState, 'labor', (employee) => ({
    employeeNo: employee.employeeNo,
    name: employee.name,
    birthDate: employee.birthDate,
    baseSalary: employee.baseSalary,
    overtimeAllowance: employee.overtimeAllowance,
    mealAllowance: employee.mealAllowance,
    hourlyRate: employee.hourlyRate,
  }));
  const sortedAssignments = sortRows(dataset.projectAssignments, sortState, 'projects', (assignment) => {
    const employee = dataset.employees.find((item) => item.id === assignment.employeeId);
    const project = dataset.projects.find((item) => item.id === assignment.projectId);
    return {
      employeeNo: employee?.employeeNo,
      empName: employee?.name,
      projectCode: project?.projectCode,
      projectName: project?.name,
      startDate: assignment.startDate,
      endDate: assignment.endDate,
      revenue: project?.revenue,
    };
  });
  const sortedTimeEntries = sortRows(dataset.timeEntries, sortState, 'daily', (entry) => {
    const employee = dataset.employees.find((item) => item.id === entry.employeeId);
    const project = dataset.projects.find((item) => item.id === entry.projectId);
    return {
      date: entry.date,
      employeeNo: employee?.employeeNo,
      empName: employee?.name,
      projectCode: project?.projectCode,
      hours: entry.hours,
      manMonth: entry.hours / 160,
    };
  });
  const sortedExpenses = sortRows(dataset.expenses, sortState, 'costs', (expense) => {
    const project = dataset.projects.find((item) => item.id === expense.projectId);
    return {
      id: expense.id,
      expenseDate: expense.expenseDate,
      projectCode: project?.projectCode ?? '전사 공통',
      expenseType: expense.expenseType,
      amount: expense.amount,
      description: expense.description,
    };
  });

  return (
    <section className="mx-auto max-w-7xl px-5 pb-6">
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-950">데이터 관리</h2>
            <p className="text-sm text-slate-500">
              엑셀 원장처럼 데이터를 분리해 관리합니다. 변경값은 localStorage에 저장됩니다.
            </p>
          </div>
          <button
            type="button"
            onClick={handleResetDataset}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw size={16} aria-hidden="true" />
            샘플 데이터 초기화
          </button>
        </div>

        <div className="grid min-h-[620px] lg:grid-cols-[240px_1fr]">
          <aside className="border-b border-slate-200 bg-slate-50 p-3 lg:border-b-0 lg:border-r">
            <div className="grid gap-1">
              {dataTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-md px-3 py-3 text-left transition ${
                    activeTab === tab.id
                      ? 'bg-white text-teal-700 shadow-sm ring-1 ring-slate-200'
                      : 'text-slate-600 hover:bg-white'
                  }`}
                >
                  <span className="block text-sm font-semibold">{tab.label}</span>
                  <span className="mt-1 block text-xs text-slate-500">{tab.description}</span>
                </button>
              ))}
            </div>
          </aside>

          <div className="min-w-0 p-4">
            {activeTab === 'labor' && (
              <TablePanel title="인건비" actionLabel="직원 추가" onAction={addEmployee}>
                <div className="overflow-x-auto">
                  <table className="min-w-[980px] w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-100 text-left text-slate-600">
                        <Header>No</Header>
                        <Header sortKey="employeeNo" table="labor" sortState={sortState} onSort={requestSort}>사번</Header>
                        <Header sortKey="name" table="labor" sortState={sortState} onSort={requestSort}>이름</Header>
                        <Header sortKey="birthDate" table="labor" sortState={sortState} onSort={requestSort}>생년월일</Header>
                        <Header sortKey="baseSalary" table="labor" sortState={sortState} onSort={requestSort}>기본급</Header>
                        <Header sortKey="overtimeAllowance" table="labor" sortState={sortState} onSort={requestSort}>연장근로수당</Header>
                        <Header sortKey="mealAllowance" table="labor" sortState={sortState} onSort={requestSort}>식대</Header>
                        <Header sortKey="hourlyRate" table="labor" sortState={sortState} onSort={requestSort}>시급</Header>
                        <Header></Header>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedEmployees.map((employee, index) => (
                        <tr key={employee.id} className="border-b border-slate-100">
                          <Cell>{index + 1}</Cell>
                          <Cell>
                            <TextInput
                              value={employee.employeeNo ?? ''}
                              onChange={(employeeNo) => updateEmployee(employee.id, { employeeNo })}
                            />
                          </Cell>
                          <Cell>
                            <TextInput
                              value={employee.name}
                              onChange={(name) => updateEmployee(employee.id, { name })}
                            />
                          </Cell>
                          <Cell>
                            <TextInput
                              type="date"
                              value={employee.birthDate ?? ''}
                              onChange={(birthDate) => updateEmployee(employee.id, { birthDate })}
                            />
                          </Cell>
                          <Cell>
                            <MoneyInput
                              value={employee.baseSalary ?? 0}
                              onChange={(baseSalary) => updateEmployee(employee.id, { baseSalary })}
                            />
                          </Cell>
                          <Cell>
                            <MoneyInput
                              value={employee.overtimeAllowance ?? 0}
                              onChange={(overtimeAllowance) =>
                                updateEmployee(employee.id, { overtimeAllowance })
                              }
                            />
                          </Cell>
                          <Cell>
                            <MoneyInput
                              value={employee.mealAllowance ?? 0}
                              onChange={(mealAllowance) => updateEmployee(employee.id, { mealAllowance })}
                            />
                          </Cell>
                          <Cell>
                            <MoneyInput
                              value={employee.hourlyRate}
                              onChange={(hourlyRate) => updateEmployee(employee.id, { hourlyRate })}
                            />
                          </Cell>
                          <Cell>
                            <IconButton label="직원 삭제" onClick={() => deleteEmployee(employee.id)} />
                          </Cell>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TablePanel>
            )}

            {activeTab === 'projects' && (
              <TablePanel title="프로젝트" actionLabel="프로젝트 배정 추가" onAction={addAssignment}>
                <div className="overflow-x-auto">
                  <table className="min-w-[980px] w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-100 text-left text-slate-600">
                        <Header>No</Header>
                        <Header sortKey="employeeNo" table="projects" sortState={sortState} onSort={requestSort}>사번</Header>
                        <Header sortKey="empName" table="projects" sortState={sortState} onSort={requestSort}>이름</Header>
                        <Header sortKey="projectCode" table="projects" sortState={sortState} onSort={requestSort}>프로젝트코드</Header>
                        <Header sortKey="projectName" table="projects" sortState={sortState} onSort={requestSort}>프로젝트명</Header>
                        <Header sortKey="startDate" table="projects" sortState={sortState} onSort={requestSort}>투입일</Header>
                        <Header sortKey="endDate" table="projects" sortState={sortState} onSort={requestSort}>종료일</Header>
                        <Header sortKey="revenue" table="projects" sortState={sortState} onSort={requestSort}>매출</Header>
                        <Header></Header>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedAssignments.map((assignment, index) => {
                        const employee = dataset.employees.find((item) => item.id === assignment.employeeId);
                        const project = dataset.projects.find((item) => item.id === assignment.projectId);
                        return (
                          <tr key={assignment.id} className="border-b border-slate-100">
                            <Cell>{index + 1}</Cell>
                            <Cell>{employee?.employeeNo}</Cell>
                            <Cell>{employee?.name}</Cell>
                            <Cell>
                              <TextInput
                                value={project?.projectCode ?? ''}
                                onChange={(projectCode) =>
                                  project && updateProject(project.id, { projectCode })
                                }
                              />
                            </Cell>
                            <Cell>
                              <TextInput
                                value={project?.name ?? ''}
                                onChange={(name) => project && updateProject(project.id, { name })}
                              />
                            </Cell>
                            <Cell>
                              <TextInput
                                type="date"
                                value={assignment.startDate}
                                onChange={(startDate) => updateAssignment(assignment.id, { startDate })}
                              />
                            </Cell>
                            <Cell>
                              <TextInput
                                type="date"
                                value={assignment.endDate}
                                onChange={(endDate) => updateAssignment(assignment.id, { endDate })}
                              />
                            </Cell>
                            <Cell>
                              <MoneyInput
                                value={project?.revenue ?? 0}
                                onChange={(revenue) => project && updateProject(project.id, { revenue })}
                              />
                            </Cell>
                            <Cell>
                              <IconButton
                                label="배정 삭제"
                                onClick={() => deleteAssignment(assignment.id)}
                              />
                            </Cell>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </TablePanel>
            )}

            {activeTab === 'daily' && (
              <TablePanel title="프로젝트별 인력 투입시간 (Daily Report)" actionLabel="투입 시간 추가" onAction={addTimeEntry}>
                <div className="mb-3 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  M/M 기준: 1 M/M = 160시간
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-[880px] w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-100 text-left text-slate-600">
                        <Header>NO</Header>
                        <Header sortKey="date" table="daily" sortState={sortState} onSort={requestSort}>일자</Header>
                        <Header sortKey="employeeNo" table="daily" sortState={sortState} onSort={requestSort}>사번</Header>
                        <Header sortKey="empName" table="daily" sortState={sortState} onSort={requestSort}>이름</Header>
                        <Header sortKey="projectCode" table="daily" sortState={sortState} onSort={requestSort}>프로젝트코드</Header>
                        <Header sortKey="hours" table="daily" sortState={sortState} onSort={requestSort}>근무시간</Header>
                        <Header sortKey="manMonth" table="daily" sortState={sortState} onSort={requestSort}>M/M</Header>
                        <Header></Header>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedTimeEntries.map((entry, index) => {
                        const employee = dataset.employees.find((item) => item.id === entry.employeeId);
                        const project = dataset.projects.find((item) => item.id === entry.projectId);
                        const entryId = entry.id ?? `${entry.employeeId}-${entry.projectId}-${index}`;
                        return (
                          <tr key={entryId} className="border-b border-slate-100">
                            <Cell>{index + 1}</Cell>
                            <Cell>
                              <TextInput
                                type="date"
                                value={entry.date ?? ''}
                                onChange={(date) => updateTimeEntry(entryId, { date })}
                              />
                            </Cell>
                            <Cell>{employee?.employeeNo}</Cell>
                            <Cell>{employee?.name}</Cell>
                            <Cell>{project?.projectCode}</Cell>
                            <Cell>
                              <NumberInput
                                value={entry.hours}
                                width="narrow"
                                onChange={(hours) => updateTimeEntry(entryId, { hours })}
                              />
                            </Cell>
                            <Cell>{(entry.hours / 160).toFixed(3)}</Cell>
                            <Cell>
                              <IconButton
                                label="투입 시간 삭제"
                                onClick={() =>
                                  updateDatasetPart(
                                    'timeEntries',
                                    dataset.timeEntries.filter((item) => item.id !== entryId),
                                  )
                                }
                              />
                            </Cell>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </TablePanel>
            )}

            {activeTab === 'costs' && (
              <TablePanel title="Expense_Ledger" actionLabel="지출 추가" onAction={addExpense}>
                <div className="overflow-x-auto">
                  <table className="min-w-[980px] w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-100 text-left text-slate-600">
                        <Header>No</Header>
                        <Header sortKey="id" table="costs" sortState={sortState} onSort={requestSort}>지출 ID</Header>
                        <Header sortKey="expenseDate" table="costs" sortState={sortState} onSort={requestSort}>지출일</Header>
                        <Header sortKey="projectCode" table="costs" sortState={sortState} onSort={requestSort}>프로젝트 코드</Header>
                        <Header sortKey="expenseType" table="costs" sortState={sortState} onSort={requestSort}>비용 구분</Header>
                        <Header sortKey="amount" table="costs" sortState={sortState} onSort={requestSort}>금액</Header>
                        <Header sortKey="description" table="costs" sortState={sortState} onSort={requestSort}>내역</Header>
                        <Header></Header>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedExpenses.map((expense, index) => {
                        const project = dataset.projects.find((item) => item.id === expense.projectId);
                        return (
                          <tr key={expense.id} className="border-b border-slate-100">
                            <Cell>{index + 1}</Cell>
                            <Cell>{expense.id}</Cell>
                            <Cell>
                              <TextInput
                                type="date"
                                value={expense.expenseDate}
                                onChange={(expenseDate) => updateExpense(expense.id, { expenseDate })}
                              />
                            </Cell>
                            <Cell>
                              <select
                                className="h-9 w-full min-w-[150px] border border-slate-300 bg-white px-2"
                                value={expense.projectId ?? ''}
                                onChange={(event) =>
                                  updateExpense(expense.id, {
                                    projectId: event.target.value === '' ? undefined : event.target.value,
                                  })
                                }
                              >
                                <option value="">전사 공통</option>
                                {dataset.projects.map((item) => (
                                  <option key={item.id} value={item.id}>
                                    {item.projectCode}
                                  </option>
                                ))}
                              </select>
                            </Cell>
                            <Cell>
                              <select
                                className="h-9 w-full min-w-[120px] border border-slate-300 bg-white px-2"
                                value={expense.expenseType}
                                onChange={(event) =>
                                  updateExpense(expense.id, {
                                    expenseType: event.target.value as ExpenseLedger['expenseType'],
                                  })
                                }
                              >
                                <option value="직접경비">직접경비</option>
                                <option value="외주비">외주비</option>
                                <option value="판관비">판관비</option>
                              </select>
                            </Cell>
                            <Cell>
                              <MoneyInput
                                value={expense.amount}
                                onChange={(amount) => updateExpense(expense.id, { amount })}
                              />
                            </Cell>
                            <Cell>
                              <TextInput
                                value={expense.description || project?.name || ''}
                                onChange={(description) => updateExpense(expense.id, { description })}
                              />
                            </Cell>
                            <Cell>
                              <IconButton label="지출 삭제" onClick={() => deleteExpense(expense.id)} />
                            </Cell>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </TablePanel>
            )}

            {activeTab === 'exchange' && <CsvExchangePanel dataset={dataset} />}
          </div>
        </div>
      </div>
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4">
          <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-5 shadow-xl">
            <h3 className="text-base font-semibold text-slate-950">초기화 완료</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              샘플 데이터, 배부 기준, 시뮬레이션, 저장 시나리오를 기본값으로 되돌렸습니다.
            </p>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="h-9 rounded-md bg-teal-700 px-4 text-sm font-medium text-white hover:bg-teal-800"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function TablePanel({
  title,
  actionLabel,
  onAction,
  children,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
        {actionLabel && onAction && (
          <button
            type="button"
            onClick={onAction}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Plus size={15} aria-hidden="true" />
            {actionLabel}
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function Header({
  children,
  sortKey,
  table,
  sortState,
  onSort,
}: {
  children?: ReactNode;
  sortKey?: string;
  table?: DataTab;
  sortState?: SortState;
  onSort?: (table: DataTab, key: string) => void;
}) {
  const active = Boolean(
    sortKey && table && sortState?.table === table && sortState.key === sortKey,
  );

  return (
    <th className="h-9 whitespace-nowrap border border-slate-200 px-2 font-semibold">
      {sortKey && table && onSort ? (
        <button
          type="button"
          onClick={() => onSort(table, sortKey)}
          className="flex w-full items-center justify-between gap-2 text-left"
        >
          <span>{children}</span>
          <span className="text-xs text-slate-400">
            {active ? (sortState?.direction === 'asc' ? '▲' : '▼') : '↕'}
          </span>
        </button>
      ) : (
        children
      )}
    </th>
  );
}

function Cell({ children }: { children?: ReactNode }) {
  return (
    <td className="h-10 whitespace-nowrap border border-slate-200 px-2 align-middle">
      {children}
    </td>
  );
}

function TextInput({
  value,
  type = 'text',
  onChange,
}: {
  value: string;
  type?: string;
  onChange: (value: string) => void;
}) {
  return (
    <input
      className="h-9 w-full min-w-[110px] border border-slate-300 px-2"
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function NumberInput({
  value,
  width = 'default',
  onChange,
}: {
  value: number;
  width?: 'default' | 'narrow';
  onChange: (value: number) => void;
}) {
  return (
    <input
      className={`h-9 w-full border border-slate-300 px-2 text-right ${
        width === 'narrow' ? 'min-w-[72px] max-w-[88px]' : 'min-w-[110px]'
      }`}
      type="number"
      value={Math.round(value)}
      onChange={(event) => onChange(Number(event.target.value))}
    />
  );
}

function MoneyInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="relative">
      <input
      className="h-9 w-full min-w-[130px] border border-slate-300 px-2 pr-8 text-right tabular-nums"
        inputMode="numeric"
        value={formatNumber(value)}
        onChange={(event) => onChange(parseNumber(event.target.value))}
      />
      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-500">
        원
      </span>
    </div>
  );
}

function sortRows<Row>(
  rows: Row[],
  sortState: SortState,
  table: DataTab,
  getValues: (row: Row) => Record<string, string | number | undefined>,
) {
  if (sortState.table !== table) return rows;

  return [...rows].sort((a, b) => {
    const aValue = getValues(a)[sortState.key];
    const bValue = getValues(b)[sortState.key];
    const result = compareValues(aValue, bValue);
    return sortState.direction === 'asc' ? result : -result;
  });
}

function compareValues(aValue: string | number | undefined, bValue: string | number | undefined) {
  if (typeof aValue === 'number' || typeof bValue === 'number') {
    return Number(aValue ?? 0) - Number(bValue ?? 0);
  }

  return String(aValue ?? '').localeCompare(String(bValue ?? ''), 'ko-KR', {
    numeric: true,
  });
}

function formatNumber(value: number) {
  return Math.round(value || 0).toLocaleString('ko-KR');
}

function parseNumber(value: string) {
  const parsed = Number(value.replace(/,/g, '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
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
