import readExcelFile from 'read-excel-file/universal';
import writeExcelFile from 'write-excel-file/universal';
import type { SheetData } from 'write-excel-file/universal';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import type { CostDataset, ExpenseLedger, ExpenseType } from './types';

export type ImportSeverity = 'error' | 'warning';

export type ImportIssue = {
  severity: ImportSeverity;
  sheet: string;
  row: number;
  column: string;
  message: string;
};

export type UserImportResult = {
  dataset: CostDataset;
  issues: ImportIssue[];
  summary: {
    divisions: number;
    employees: number;
    projects: number;
    assignments: number;
    timeEntries: number;
    expenses: number;
  };
};

type SheetRow = Record<string, string>;

const SHEETS = {
  employees: '인력 마스터',
  projects: '프로젝트 마스터',
  assignments: '프로젝트 투입',
  timesheets: '일일 근무 기록',
  expenses: '비용 원장',
} as const;

const SHEET_ALIASES: Record<string, string[]> = {
  [SHEETS.employees]: ['Employee_Master'],
  [SHEETS.projects]: ['Project_Master'],
  [SHEETS.assignments]: ['Project_Assignment'],
  [SHEETS.timesheets]: ['Daily_Timesheet'],
  [SHEETS.expenses]: ['Expense_Ledger'],
};

const EXPENSE_TYPES: ExpenseType[] = ['직접경비', '외주비', '판관비'];

const templateRows: Record<string, Array<Record<string, string | number>>> = {
  '작성 안내': [
    {
      항목: '업로드 방식',
      설명: '이 파일의 5개 데이터 시트를 작성한 뒤 데이터 관리 > CSV/JSON > 가져오기로 업로드합니다.',
    },
    {
      항목: '업무 키',
      설명: '사번, 프로젝트코드, 본부명을 기준으로 앱 내부 ID를 자동 생성합니다. id 컬럼은 작성하지 않습니다.',
    },
    {
      항목: '판관비',
      설명: '판관비는 전사 공통비로 처리되므로 비용 원장의 프로젝트코드를 비워 둡니다.',
    },
    {
      항목: '직접경비/외주비',
      설명: '직접경비와 외주비는 특정 프로젝트 비용이므로 프로젝트코드를 반드시 입력합니다.',
    },
    {
      항목: '날짜',
      설명: '날짜는 2026-04-01 형식으로 입력하는 것을 권장합니다.',
    },
  ],
  [SHEETS.employees]: [
    {
      사번: 'E-1001',
      이름: '김민준',
      생년월일: '1988-03-14',
      본부명: '전략기획본부',
      고용형태: '내부직원',
      월기본급: 8300000,
      연장근로수당: 620000,
      식대: 200000,
      시간당표준원가: 52000,
      재직여부: 'Y',
    },
    {
      사번: 'E-2001',
      이름: '박도윤',
      생년월일: '1985-11-02',
      본부명: '플랫폼개발본부',
      고용형태: '내부직원',
      월기본급: 9760000,
      연장근로수당: 732000,
      식대: 200000,
      시간당표준원가: 61000,
      재직여부: 'Y',
    },
  ],
  [SHEETS.projects]: [
    {
      프로젝트코드: 'PRJ-001',
      프로젝트명: 'ERP 원가 모듈 구축',
      본부명: '전략기획본부',
      고객사: '샘플 고객사',
      계약금액: 120000000,
      시작일: '2026-01-01',
      종료일: '2026-06-30',
      상태: '진행',
    },
    {
      프로젝트코드: 'PRJ-002',
      프로젝트명: '클라우드 비용 최적화',
      본부명: '플랫폼개발본부',
      고객사: '샘플 고객사 B',
      계약금액: 98000000,
      시작일: '2026-02-01',
      종료일: '2026-07-31',
      상태: '진행',
    },
  ],
  [SHEETS.assignments]: [
    {
      프로젝트코드: 'PRJ-001',
      사번: 'E-1001',
      역할: 'PM',
      '투입공수(M/M)': 1.5,
      투입일: '2026-01-01',
      종료일: '2026-06-30',
    },
    {
      프로젝트코드: 'PRJ-002',
      사번: 'E-2001',
      역할: '개발',
      '투입공수(M/M)': 2,
      투입일: '2026-02-01',
      종료일: '2026-07-31',
    },
  ],
  [SHEETS.timesheets]: [
    {
      일자: '2026-04-01',
      사번: 'E-1001',
      프로젝트코드: 'PRJ-001',
      근무시간: 8,
      업무상세: '원가 정책 설계',
    },
    {
      일자: '2026-04-02',
      사번: 'E-2001',
      프로젝트코드: 'PRJ-002',
      근무시간: 7,
      업무상세: '클라우드 비용 분석',
    },
  ],
  [SHEETS.expenses]: [
    {
      지출일: '2026-04-01',
      프로젝트코드: 'PRJ-001',
      비용구분: '직접경비',
      금액: 2500000,
      내역: '소프트웨어 라이선스',
    },
    {
      지출일: '2026-04-01',
      프로젝트코드: 'PRJ-001',
      비용구분: '외주비',
      금액: 5000000,
      내역: '외주 개발',
    },
    {
      지출일: '2026-04-01',
      프로젝트코드: '',
      비용구분: '판관비',
      금액: 12000000,
      내역: '사무실 임대료',
    },
  ],
};

export async function downloadUserImportTemplate() {
  const sheets = Object.entries(templateRows).map(([sheet, rows]) => ({
    sheet,
    data: toSheetData(rows),
    columns: Object.keys(rows[0] ?? {}).map(() => ({ width: 18 })),
  }));

  const blob = await writeExcelFile(sheets).toBlob();
  downloadBlob('cost-accounting-import-template.xlsx', blob);
}

export async function parseUserImportWorkbook(file: Blob | ArrayBuffer): Promise<UserImportResult> {
  const workbook = await readWorkbookSafely(file);
  const issues: ImportIssue[] = [];
  const employeeRows = readSheet(workbook, SHEETS.employees, issues);
  const projectRows = readSheet(workbook, SHEETS.projects, issues);
  const assignmentRows = readSheet(workbook, SHEETS.assignments, issues);
  const timesheetRows = readSheet(workbook, SHEETS.timesheets, issues);
  const expenseRows = readSheet(workbook, SHEETS.expenses, issues);

  requireColumns(employeeRows, SHEETS.employees, ['사번', '이름', '본부명', '시간당표준원가'], issues);
  requireColumns(projectRows, SHEETS.projects, ['프로젝트코드', '프로젝트명', '본부명', '계약금액'], issues);
  requireColumns(assignmentRows, SHEETS.assignments, ['프로젝트코드', '사번', '투입일', '종료일'], issues);
  requireColumns(timesheetRows, SHEETS.timesheets, ['일자', '사번', '프로젝트코드', '근무시간'], issues);
  requireColumns(expenseRows, SHEETS.expenses, ['지출일', '비용구분', '금액', '내역'], issues);

  const divisionNames = unique(
    [...employeeRows.map((row) => cell(row, '본부명')), ...projectRows.map((row) => cell(row, '본부명'))]
      .filter(Boolean),
  );
  const divisions = divisionNames.map((name, index) => ({
    id: `div-import-${index + 1}`,
    name,
  }));
  const divisionIdByName = new Map(divisions.map((division) => [division.name, division.id]));

  const employeeNoSet = new Set<string>();
  const employees = employeeRows.flatMap((row, index) => {
    const rowNumber = index + 2;
    const employeeNo = cell(row, '사번');
    const name = cell(row, '이름');
    const divisionName = cell(row, '본부명');
    const hourlyRate = parseAmount(cell(row, '시간당표준원가'));

    required(employeeNo, SHEETS.employees, rowNumber, '사번', issues);
    required(name, SHEETS.employees, rowNumber, '이름', issues);
    required(divisionName, SHEETS.employees, rowNumber, '본부명', issues);
    duplicate(employeeNo, employeeNoSet, SHEETS.employees, rowNumber, '사번', issues);
    numeric(hourlyRate, SHEETS.employees, rowNumber, '시간당표준원가', issues);

    const divisionId = divisionIdByName.get(divisionName);
    if (!divisionId) {
      addIssue(issues, 'error', SHEETS.employees, rowNumber, '본부명', `'${divisionName}' 본부를 찾을 수 없습니다.`);
      return [];
    }

    return [{
      id: `emp-import-${index + 1}`,
      employeeNo,
      name,
      birthDate: cell(row, '생년월일') || undefined,
      divisionId,
      hourlyRate: hourlyRate || 0,
      baseSalary: parseAmount(cell(row, '월기본급')) || 0,
      overtimeAllowance: parseAmount(cell(row, '연장근로수당')) || 0,
      mealAllowance: parseAmount(cell(row, '식대')) || 0,
    }];
  });

  const projectCodeSet = new Set<string>();
  const projects = projectRows.flatMap((row, index) => {
    const rowNumber = index + 2;
    const projectCode = cell(row, '프로젝트코드');
    const name = cell(row, '프로젝트명');
    const divisionName = cell(row, '본부명');
    const revenue = parseAmount(cell(row, '계약금액'));

    required(projectCode, SHEETS.projects, rowNumber, '프로젝트코드', issues);
    required(name, SHEETS.projects, rowNumber, '프로젝트명', issues);
    required(divisionName, SHEETS.projects, rowNumber, '본부명', issues);
    duplicate(projectCode, projectCodeSet, SHEETS.projects, rowNumber, '프로젝트코드', issues);
    numeric(revenue, SHEETS.projects, rowNumber, '계약금액', issues);
    if (revenue === 0) {
      addIssue(issues, 'warning', SHEETS.projects, rowNumber, '계약금액', '계약금액이 0원입니다.');
    }

    const divisionId = divisionIdByName.get(divisionName);
    if (!divisionId) {
      addIssue(issues, 'error', SHEETS.projects, rowNumber, '본부명', `'${divisionName}' 본부를 찾을 수 없습니다.`);
      return [];
    }

    return [{
      id: `prj-import-${index + 1}`,
      projectCode,
      name,
      divisionId,
      revenue: revenue || 0,
      startDate: cell(row, '시작일') || undefined,
      endDate: cell(row, '종료일') || undefined,
      allocationWeight: 1,
    }];
  });

  const employeeIdByNo = new Map(employees.map((employee) => [employee.employeeNo ?? '', employee.id]));
  const projectIdByCode = new Map(projects.map((project) => [project.projectCode ?? '', project.id]));
  const projectById = new Map(projects.map((project) => [project.id, project]));

  const projectAssignments = assignmentRows.flatMap((row, index) => {
    const rowNumber = index + 2;
    const projectCode = cell(row, '프로젝트코드');
    const employeeNo = cell(row, '사번');
    const employeeId = employeeIdByNo.get(employeeNo);
    const projectId = projectIdByCode.get(projectCode);

    required(projectCode, SHEETS.assignments, rowNumber, '프로젝트코드', issues);
    required(employeeNo, SHEETS.assignments, rowNumber, '사번', issues);
    reference(employeeId, SHEETS.assignments, rowNumber, '사번', employeeNo, issues);
    reference(projectId, SHEETS.assignments, rowNumber, '프로젝트코드', projectCode, issues);

    if (!employeeId || !projectId) return [];

    return [{
      id: `pa-import-${index + 1}`,
      employeeId,
      projectId,
      startDate: cell(row, '투입일') || projectById.get(projectId)?.startDate || '',
      endDate: cell(row, '종료일') || projectById.get(projectId)?.endDate || '',
    }];
  });

  const timeEntries = timesheetRows.flatMap((row, index) => {
    const rowNumber = index + 2;
    const projectCode = cell(row, '프로젝트코드');
    const employeeNo = cell(row, '사번');
    const employeeId = employeeIdByNo.get(employeeNo);
    const projectId = projectIdByCode.get(projectCode);
    const hours = parseAmount(cell(row, '근무시간'));
    const date = cell(row, '일자');

    required(date, SHEETS.timesheets, rowNumber, '일자', issues);
    required(projectCode, SHEETS.timesheets, rowNumber, '프로젝트코드', issues);
    required(employeeNo, SHEETS.timesheets, rowNumber, '사번', issues);
    reference(employeeId, SHEETS.timesheets, rowNumber, '사번', employeeNo, issues);
    reference(projectId, SHEETS.timesheets, rowNumber, '프로젝트코드', projectCode, issues);
    numeric(hours, SHEETS.timesheets, rowNumber, '근무시간', issues);

    if (hours > 12) {
      addIssue(issues, 'warning', SHEETS.timesheets, rowNumber, '근무시간', '일 근무시간이 12시간을 초과합니다.');
    }
    if (projectId && date && !isWithinProjectPeriod(date, projectById.get(projectId))) {
      addIssue(issues, 'warning', SHEETS.timesheets, rowNumber, '일자', '프로젝트 기간 밖 근무 기록입니다.');
    }
    if (!employeeId || !projectId) return [];

    return [{
      id: `te-import-${index + 1}`,
      date,
      employeeId,
      projectId,
      hours: hours || 0,
    }];
  });

  const expenses = expenseRows.flatMap((row, index) => {
    const rowNumber = index + 2;
    const expenseType = cell(row, '비용구분') as ExpenseType;
    const projectCode = cell(row, '프로젝트코드');
    const projectId = projectCode ? projectIdByCode.get(projectCode) : undefined;
    const amount = parseAmount(cell(row, '금액'));

    required(cell(row, '지출일'), SHEETS.expenses, rowNumber, '지출일', issues);
    required(expenseType, SHEETS.expenses, rowNumber, '비용구분', issues);
    required(cell(row, '내역'), SHEETS.expenses, rowNumber, '내역', issues);
    numeric(amount, SHEETS.expenses, rowNumber, '금액', issues);
    if (!EXPENSE_TYPES.includes(expenseType)) {
      addIssue(issues, 'error', SHEETS.expenses, rowNumber, '비용구분', '비용구분은 직접경비, 외주비, 판관비 중 하나여야 합니다.');
    }
    if (projectCode && !projectId) {
      reference(projectId, SHEETS.expenses, rowNumber, '프로젝트코드', projectCode, issues);
    }
    if (expenseType === '판관비' && projectCode) {
      addIssue(issues, 'warning', SHEETS.expenses, rowNumber, '프로젝트코드', '판관비는 전사 공통비로 처리되어 프로젝트코드를 무시합니다.');
    }
    if ((expenseType === '직접경비' || expenseType === '외주비') && !projectCode) {
      addIssue(issues, 'error', SHEETS.expenses, rowNumber, '프로젝트코드', '직접경비/외주비에는 프로젝트코드가 필요합니다.');
    }
    if (!EXPENSE_TYPES.includes(expenseType) || !amount) return [];

    return [{
      id: `exp-import-${index + 1}`,
      expenseDate: cell(row, '지출일'),
      projectId: expenseType === '판관비' ? undefined : projectId,
      expenseType,
      amount,
      description: cell(row, '내역'),
    }];
  }) satisfies ExpenseLedger[];

  const directCosts = expenses
    .filter((expense) => expense.projectId && expense.expenseType !== '판관비')
    .map((expense, index) => ({
      id: `dc-import-${index + 1}`,
      projectId: expense.projectId!,
      label: expense.description,
      amount: expense.amount,
    }));
  const indirectCosts = expenses
    .filter((expense) => !expense.projectId && expense.expenseType === '판관비')
    .map((expense, index) => ({
      id: `ic-import-${index + 1}`,
      label: expense.description,
      amount: expense.amount,
    }));

  const dataset = {
    divisions,
    employees,
    projects,
    projectAssignments,
    timeEntries,
    expenses,
    directCosts,
    indirectCosts,
  };

  return {
    dataset,
    issues,
    summary: {
      divisions: divisions.length,
      employees: employees.length,
      projects: projects.length,
      assignments: projectAssignments.length,
      timeEntries: timeEntries.length,
      expenses: expenses.length,
    },
  };
}

async function readWorkbookSafely(file: Blob | ArrayBuffer) {
  try {
    return await readExcelFile(file, { trim: true });
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes('inline string')) {
      throw error;
    }
    return readExcelFile(await sanitizeInlineStringCells(file), { trim: true });
  }
}

async function sanitizeInlineStringCells(file: Blob | ArrayBuffer) {
  const arrayBuffer = file instanceof Blob ? await file.arrayBuffer() : file;
  const files = unzipSync(new Uint8Array(arrayBuffer));

  for (const [path, content] of Object.entries(files)) {
    if (!path.startsWith('xl/worksheets/') || !path.endsWith('.xml')) continue;
    const xml = strFromU8(content);
    const sanitized = xml.replace(/<c([^>]*)\st="inlineStr"([^>]*)><\/c>/g, '<c$1$2></c>');
    if (sanitized !== xml) {
      files[path] = strToU8(sanitized);
    }
  }

  return zipSync(files).buffer;
}

function readSheet(workbook: Awaited<ReturnType<typeof readExcelFile>>, sheetName: string, issues: ImportIssue[]) {
  const allowedNames = [sheetName, ...(SHEET_ALIASES[sheetName] ?? [])];
  const sheet = workbook.find((item) => allowedNames.includes(item.sheet));
  if (!sheet) {
    addIssue(
      issues,
      'error',
      sheetName,
      1,
      '시트',
      `'${sheetName}' 시트가 없습니다. 허용 시트명: ${allowedNames.join(', ')}`,
    );
    return [];
  }

  const [headers = [], ...rows] = sheet.data;
  const normalizedHeaders = headers.map((header) => normalizeCell(header));

  return rows
    .filter((row) => row.some((value) => normalizeCell(value)))
    .map((row) =>
      Object.fromEntries(
        normalizedHeaders.map((header, index) => [header, normalizeCell(row[index])]),
      ),
    );
}

function requireColumns(rows: SheetRow[], sheet: string, columns: string[], issues: ImportIssue[]) {
  const headers = new Set(Object.keys(rows[0] ?? {}));
  for (const column of columns) {
    if (!headers.has(column)) {
      addIssue(issues, 'error', sheet, 1, column, `'${column}' 컬럼이 필요합니다.`);
    }
  }
}

function cell(row: SheetRow, key: string) {
  return String(row[key] ?? '').trim();
}

function parseAmount(value: string) {
  const normalized = String(value).replace(/,/g, '').replace(/[^\d.-]/g, '');
  if (!normalized) return 0;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function required(value: string, sheet: string, row: number, column: string, issues: ImportIssue[]) {
  if (!value) {
    addIssue(issues, 'error', sheet, row, column, '필수값이 비어 있습니다.');
  }
}

function numeric(value: number, sheet: string, row: number, column: string, issues: ImportIssue[]) {
  if (!Number.isFinite(value)) {
    addIssue(issues, 'error', sheet, row, column, '숫자로 변환할 수 없습니다.');
  }
}

function duplicate(value: string, seen: Set<string>, sheet: string, row: number, column: string, issues: ImportIssue[]) {
  if (!value) return;
  if (seen.has(value)) {
    addIssue(issues, 'error', sheet, row, column, `'${value}' 값이 중복되었습니다.`);
    return;
  }
  seen.add(value);
}

function reference(value: string | undefined, sheet: string, row: number, column: string, rawValue: string, issues: ImportIssue[]) {
  if (!rawValue) return;
  if (!value) {
    addIssue(issues, 'error', sheet, row, column, `'${rawValue}' 값을 찾을 수 없습니다.`);
  }
}

function addIssue(
  issues: ImportIssue[],
  severity: ImportSeverity,
  sheet: string,
  row: number,
  column: string,
  message: string,
) {
  issues.push({ severity, sheet, row, column, message });
}

function unique(values: string[]) {
  return [...new Set(values)];
}

function isWithinProjectPeriod(date: string, project: { startDate?: string; endDate?: string } | undefined) {
  if (!project?.startDate || !project.endDate) return true;
  return date >= project.startDate && date <= project.endDate;
}

function toSheetData(rows: Array<Record<string, string | number>>): SheetData {
  const headers = Object.keys(rows[0] ?? {});
  return [
    headers,
    ...rows.map((row) => headers.map((header) => row[header] ?? '')),
  ];
}

function normalizeCell(value: unknown) {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return String(value ?? '').trim();
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
