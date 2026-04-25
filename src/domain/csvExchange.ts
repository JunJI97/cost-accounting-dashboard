import Papa from 'papaparse';
import type {
  CostDataset,
  DirectCost,
  Division,
  Employee,
  ExpenseLedger,
  IndirectCost,
  Project,
  ProjectAssignment,
  TimeEntry,
} from './types';

type DatasetKey = keyof CostDataset;

export type CsvImportResult = {
  key: DatasetKey;
  rows: CostDataset[DatasetKey];
};

export type ExportFileDefinition = { key: DatasetKey; filename: string; label: string };

const csvFiles: ExportFileDefinition[] = [
  { key: 'divisions', filename: 'noa-divisions.csv', label: '본부' },
  { key: 'employees', filename: 'noa-employees.csv', label: '직원' },
  { key: 'projects', filename: 'noa-projects.csv', label: '프로젝트' },
  { key: 'projectAssignments', filename: 'noa-project-assignments.csv', label: '프로젝트 배정' },
  { key: 'timeEntries', filename: 'noa-timesheets.csv', label: 'Time-sheet' },
  { key: 'expenses', filename: 'noa-expense-ledger.csv', label: 'Expense Ledger' },
  { key: 'directCosts', filename: 'noa-direct-costs.csv', label: '직접비' },
  { key: 'indirectCosts', filename: 'noa-indirect-costs.csv', label: '공통비' },
];

export function getCsvFiles() {
  return csvFiles;
}

export function downloadCsv(dataset: CostDataset, key: DatasetKey) {
  const target = csvFiles.find((file) => file.key === key);
  if (!target) return;

  const csv = Papa.unparse(dataset[key] as Array<Record<string, string | number>>);
  downloadText(target.filename, csv, 'text/csv;charset=utf-8');
}

export function downloadJson(dataset: CostDataset) {
  downloadText('noa-dataset.json', JSON.stringify(dataset, null, 2), 'application/json;charset=utf-8');
}

export function downloadRowsCsv<T extends Record<string, string | number>>(
  filename: string,
  rows: T[],
) {
  const csv = Papa.unparse(rows);
  downloadText(filename, csv, 'text/csv;charset=utf-8');
}

export function parseDatasetCsv(csv: string, existingDataset?: CostDataset): CsvImportResult {
  const parsed = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  if (parsed.errors.length > 0) {
    throw new Error(parsed.errors[0].message);
  }

  const rows = parsed.data;
  const headers = Object.keys(rows[0] ?? {});
  const has = (...required: string[]) => required.every((header) => headers.includes(header));

  if (has('employeeId', 'projectId', 'startDate', 'endDate')) {
    const assignments = rows.map((row, index) => ({
      id: row.id || `pa-import-${index + 1}`,
      employeeId: row.employeeId,
      projectId: row.projectId,
      startDate: row.startDate,
      endDate: row.endDate,
    })) satisfies ProjectAssignment[];

    if (existingDataset) {
      validateReferences(
        assignments,
        'employeeId',
        new Set(existingDataset.employees.map((employee) => employee.id)),
        '직원 ID',
      );
      validateReferences(
        assignments,
        'projectId',
        new Set(existingDataset.projects.map((project) => project.id)),
        '프로젝트 ID',
      );
    }

    return {
      key: 'projectAssignments',
      rows: assignments,
    };
  }

  if (has('employeeId', 'projectId', 'hours')) {
    const timeEntries = rows.map((row) => ({
      id: row.id || undefined,
      date: row.date || undefined,
      employeeId: row.employeeId,
      projectId: row.projectId,
      hours: toNumber(row.hours),
    })) satisfies TimeEntry[];

    if (existingDataset) {
      validateReferences(
        timeEntries,
        'employeeId',
        new Set(existingDataset.employees.map((employee) => employee.id)),
        '직원 ID',
      );
      validateReferences(
        timeEntries,
        'projectId',
        new Set(existingDataset.projects.map((project) => project.id)),
        '프로젝트 ID',
      );
    }

    return {
      key: 'timeEntries',
      rows: timeEntries,
    };
  }

  if (has('expenseDate', 'expenseType', 'amount', 'description')) {
    const expenses = rows.map((row, index) => ({
      id: row.id || `exp-import-${index + 1}`,
      expenseDate: row.expenseDate,
      projectId: row.projectId || undefined,
      expenseType: row.expenseType as ExpenseLedger['expenseType'],
      amount: toNumber(row.amount),
      description: row.description,
    })) satisfies ExpenseLedger[];

    if (existingDataset) {
      const projectExpenses = expenses.filter((expense) => expense.projectId);
      validateReferences(
        projectExpenses,
        'projectId',
        new Set(existingDataset.projects.map((project) => project.id)),
        '프로젝트 ID',
      );
    }

    return {
      key: 'expenses',
      rows: expenses,
    };
  }

  if (has('projectId', 'label', 'amount')) {
    const directCosts = rows.map((row) => ({
      id: row.id,
      projectId: row.projectId,
      label: row.label,
      amount: toNumber(row.amount),
    })) satisfies DirectCost[];

    validateRequiredIds(directCosts);
    if (existingDataset) {
      validateReferences(
        directCosts,
        'projectId',
        new Set(existingDataset.projects.map((project) => project.id)),
        '프로젝트 ID',
      );
    }

    return {
      key: 'directCosts',
      rows: directCosts,
    };
  }

  if (has('label', 'amount')) {
    const indirectCosts = rows.map((row) => ({
      id: row.id,
      label: row.label,
      amount: toNumber(row.amount),
      divisionId: row.divisionId || undefined,
    })) satisfies IndirectCost[];

    validateRequiredIds(indirectCosts);
    if (existingDataset) {
      const scopedCosts = indirectCosts.filter((cost) => cost.divisionId);
      validateReferences(
        scopedCosts,
        'divisionId',
        new Set(existingDataset.divisions.map((division) => division.id)),
        '본부 ID',
      );
    }

    return {
      key: 'indirectCosts',
      rows: indirectCosts,
    };
  }

  if (has('hourlyRate')) {
    const employees = rows.map((row) => ({
      id: row.id,
      name: row.name,
      divisionId: row.divisionId,
      hourlyRate: toNumber(row.hourlyRate),
    })) satisfies Employee[];

    validateRequiredIds(employees);
    if (existingDataset) {
      validateReferences(
        employees,
        'divisionId',
        new Set(existingDataset.divisions.map((division) => division.id)),
        '본부 ID',
      );
    }

    return {
      key: 'employees',
      rows: employees,
    };
  }

  if (has('revenue')) {
    const projects = rows.map((row) => ({
      id: row.id,
      name: row.name,
      divisionId: row.divisionId,
      revenue: toNumber(row.revenue),
      allocationWeight: row.allocationWeight ? toNumber(row.allocationWeight) : 1,
    })) satisfies Project[];

    validateRequiredIds(projects);
    if (existingDataset) {
      validateReferences(
        projects,
        'divisionId',
        new Set(existingDataset.divisions.map((division) => division.id)),
        '본부 ID',
      );
    }

    return {
      key: 'projects',
      rows: projects,
    };
  }

  if (has('id', 'name')) {
    const divisions = rows.map((row) => ({
      id: row.id,
      name: row.name,
    })) satisfies Division[];

    validateRequiredIds(divisions);

    return {
      key: 'divisions',
      rows: divisions,
    };
  }

  throw new Error(
    `지원하지 않는 CSV 형식입니다. 감지된 컬럼: ${headers.join(', ') || '없음'}`,
  );
}

export function parseDatasetJson(json: string): CostDataset {
  const parsed = JSON.parse(json) as CostDataset;
  const required: DatasetKey[] = [
    'divisions',
    'employees',
    'projects',
    'projectAssignments',
    'timeEntries',
    'expenses',
    'directCosts',
    'indirectCosts',
  ];

  for (const key of required) {
    if (!Array.isArray(parsed[key])) {
      throw new Error(`JSON 데이터에 ${key} 배열이 없습니다.`);
    }
  }

  return parsed;
}

function toNumber(value: string | number | undefined) {
  const numberValue = Number(value ?? 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function validateRequiredIds(rows: Array<{ id?: string }>) {
  const missingIndex = rows.findIndex((row) => !row.id);
  if (missingIndex >= 0) {
    throw new Error(`${missingIndex + 1}번째 행에 id가 없습니다.`);
  }
}

function validateReferences<Row extends Record<string, unknown>>(
  rows: Row[],
  key: keyof Row,
  allowedIds: Set<string>,
  label: string,
) {
  const invalid = rows.find((row) => !allowedIds.has(String(row[key])));
  if (invalid) {
    throw new Error(`${label} '${String(invalid[key])}'를 찾을 수 없습니다.`);
  }
}

function downloadText(filename: string, text: string, type: string) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
