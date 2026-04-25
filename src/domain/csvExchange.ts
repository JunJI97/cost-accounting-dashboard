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
  relatedRows?: Partial<CostDataset>;
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

  const rows = normalizeRows(parsed.data, existingDataset);
  const headers = Object.keys(rows[0] ?? {});
  const has = (...required: string[]) => required.every((header) => headers.includes(header));

  if (rows.length === 0) {
    throw new Error('CSV에 데이터 행이 없습니다. 헤더와 최소 1개 이상의 데이터 행을 확인하세요.');
  }

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
    const directCosts = rows.map((row, index) => ({
      id: row.id || `dc-import-${index + 1}`,
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
    const indirectCosts = rows.map((row, index) => ({
      id: row.id || `ic-import-${index + 1}`,
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
    const divisionContext = buildDivisionContext(rows, existingDataset);
    const employees = rows.map((row) => ({
      id: row.id || row.employeeNo,
      employeeNo: row.employeeNo || row.id,
      name: row.name,
      divisionId: resolveImportedDivisionId(row, divisionContext),
      hourlyRate: toNumber(row.hourlyRate),
      birthDate: row.birthDate || undefined,
      baseSalary: toNumber(row.baseSalary),
      overtimeAllowance: toNumber(row.overtimeAllowance),
      mealAllowance: toNumber(row.mealAllowance),
    })) satisfies Employee[];

    validateRequiredIds(employees);
    if (existingDataset) {
      validateReferences(
        employees,
        'divisionId',
        new Set([...existingDataset.divisions, ...divisionContext.createdDivisions].map((division) => division.id)),
        '본부 ID',
      );
    }

    return {
      key: 'employees',
      rows: employees,
      relatedRows: divisionContext.createdDivisions.length > 0 ? { divisions: mergeDivisions(existingDataset, divisionContext.createdDivisions) } : undefined,
    };
  }

  if (has('revenue')) {
    const divisionContext = buildDivisionContext(rows, existingDataset);
    const projects = rows.map((row) => ({
      id: row.id || row.projectCode,
      projectCode: row.projectCode || row.id,
      name: row.name,
      divisionId: resolveImportedDivisionId(row, divisionContext),
      revenue: toNumber(row.revenue),
      startDate: row.startDate || undefined,
      endDate: row.endDate || undefined,
      allocationWeight: row.allocationWeight ? toNumber(row.allocationWeight) : 1,
    })) satisfies Project[];

    validateRequiredIds(projects);
    if (existingDataset) {
      validateReferences(
        projects,
        'divisionId',
        new Set([...existingDataset.divisions, ...divisionContext.createdDivisions].map((division) => division.id)),
        '본부 ID',
      );
    }

    return {
      key: 'projects',
      rows: projects,
      relatedRows: divisionContext.createdDivisions.length > 0 ? { divisions: mergeDivisions(existingDataset, divisionContext.createdDivisions) } : undefined,
    };
  }

  if (has('id', 'name')) {
    const divisions = rows.map((row) => ({
      id: row.id || row.name,
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
  const normalized = typeof value === 'string' ? value.replace(/[,\s원]/g, '') : value;
  const numberValue = Number(normalized ?? 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function normalizeRows(rows: Array<Record<string, string>>, existingDataset?: CostDataset) {
  return rows.map((row) => {
    const normalized = { ...row };
    const write = (key: string, value: string | undefined) => {
      if (value !== undefined) {
        normalized[key] = value;
      }
    };
    const read = (...keys: string[]) => {
      for (const key of keys) {
        const value = row[key];
        if (value !== undefined && value !== '') return value;
      }
      return undefined;
    };

    write('id', normalized.id ?? read('id', 'ID'));
    write('name', normalized.name ?? read('name', '이름', '프로젝트명', '본부명'));
    write('employeeId', normalized.employeeId ?? resolveEmployeeId(read('employeeId', 'emp_id', '사번'), existingDataset));
    write('projectId', normalized.projectId ?? resolveProjectId(read('projectId', 'pjt_code', '프로젝트코드'), existingDataset));
    write('divisionId', normalized.divisionId ?? resolveDivisionId(read('divisionId', 'dept_code', '부서코드', '본부명'), existingDataset));
    write('divisionName', normalized.divisionName ?? read('divisionName', '본부명'));
    write('employeeNo', normalized.employeeNo ?? read('employeeNo', 'emp_id', '사번'));
    write('projectCode', normalized.projectCode ?? read('projectCode', 'pjt_code', '프로젝트코드'));
    write('birthDate', normalized.birthDate ?? read('birthDate', '생년월일'));
    write('baseSalary', normalized.baseSalary ?? read('baseSalary', 'base_salary', '월기본급', '기본급'));
    write('overtimeAllowance', normalized.overtimeAllowance ?? read('overtimeAllowance', '연장근로수당'));
    write('mealAllowance', normalized.mealAllowance ?? read('mealAllowance', '식대'));
    write('hourlyRate', normalized.hourlyRate ?? read('hourlyRate', 'hourly_standard_cost', '시간당표준원가', '시급'));
    write('revenue', normalized.revenue ?? read('revenue', 'contract_amount', '계약금액', '매출'));
    write('startDate', normalized.startDate ?? read('startDate', 'start_date', '투입일', '시작일'));
    write('endDate', normalized.endDate ?? read('endDate', 'end_date', '종료일'));
    write('date', normalized.date ?? read('date', 'work_date', '일자'));
    write('hours', normalized.hours ?? read('hours', 'work_hours', '근무시간'));
    write('expenseDate', normalized.expenseDate ?? read('expenseDate', 'exp_date', '지출일'));
    write('expenseType', normalized.expenseType ?? read('expenseType', 'exp_type', '비용구분'));
    write('amount', normalized.amount ?? read('amount', '금액'));
    write('description', normalized.description ?? read('description', '내역', '업무상세'));
    write('label', normalized.label ?? read('label', '내역'));

    return normalized;
  });
}

function resolveEmployeeId(value: string | undefined, dataset?: CostDataset) {
  if (!value || !dataset) return value;
  return (
    dataset.employees.find((employee) => employee.id === value || employee.employeeNo === value)?.id ?? value
  );
}

function resolveProjectId(value: string | undefined, dataset?: CostDataset) {
  if (!value || !dataset) return value;
  return (
    dataset.projects.find((project) => project.id === value || project.projectCode === value)?.id ?? value
  );
}

function resolveDivisionId(value: string | undefined, dataset?: CostDataset) {
  if (!value || !dataset) return value;
  return dataset.divisions.find((division) => division.id === value || division.name === value)?.id ?? value;
}

function buildDivisionContext(rows: Array<Record<string, string>>, dataset?: CostDataset) {
  const createdDivisions: Division[] = [];
  const idByName = new Map<string, string>();
  for (const division of dataset?.divisions ?? []) {
    idByName.set(division.id, division.id);
    idByName.set(division.name, division.id);
  }

  for (const row of rows) {
    const divisionName = row.divisionName;
    if (!divisionName || idByName.has(divisionName)) continue;
    const division = {
      id: `div-csv-${createdDivisionSafeId(divisionName, createdDivisions.length + 1)}`,
      name: divisionName,
    };
    createdDivisions.push(division);
    idByName.set(division.name, division.id);
    idByName.set(division.id, division.id);
  }

  return { idByName, createdDivisions };
}

function resolveImportedDivisionId(
  row: Record<string, string>,
  context: { idByName: Map<string, string>; createdDivisions: Division[] },
) {
  return context.idByName.get(row.divisionName || row.divisionId) ?? row.divisionId;
}

function mergeDivisions(dataset: CostDataset | undefined, createdDivisions: Division[]) {
  return [...(dataset?.divisions ?? []), ...createdDivisions];
}

function createdDivisionSafeId(value: string, fallback: number) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/^-|-$/g, '');
  return slug || String(fallback);
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
