import { describe, expect, it } from 'vitest';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import writeExcelFile from 'write-excel-file/node';
import type { SheetData } from 'write-excel-file/node';
import { parseUserImportWorkbook } from './userImport';

describe('user workbook import', () => {
  it('maps business keys into an internal dataset', async () => {
    const result = await parseUserImportWorkbook(await createWorkbookBuffer());

    expect(result.issues.filter((issue) => issue.severity === 'error')).toHaveLength(0);
    expect(result.dataset.divisions).toHaveLength(1);
    expect(result.dataset.employees[0].employeeNo).toBe('E-1001');
    expect(result.dataset.projects[0].projectCode).toBe('PRJ-001');
    expect(result.dataset.timeEntries[0].employeeId).toBe(result.dataset.employees[0].id);
    expect(result.dataset.timeEntries[0].projectId).toBe(result.dataset.projects[0].id);
    expect(result.dataset.expenses.some((expense) => expense.expenseType === '외주비')).toBe(true);
  });

  it('reports reference errors before applying data', async () => {
    const result = await parseUserImportWorkbook(
      await createWorkbookBuffer({
        timesheets: [{ 일자: '2026-04-01', 사번: 'UNKNOWN', 프로젝트코드: 'PRJ-001', 근무시간: 8 }],
      }),
    );

    expect(result.issues.some((issue) => issue.severity === 'error' && issue.column === '사번')).toBe(true);
  });

  it('recovers from empty inline string cells in edited templates', async () => {
    const workbook = await createWorkbookBuffer();
    const corrupted = injectEmptyInlineStringCell(workbook);
    const result = await parseUserImportWorkbook(corrupted);

    expect(result.issues.filter((issue) => issue.severity === 'error')).toHaveLength(0);
    expect(result.dataset.projects[0].projectCode).toBe('PRJ-001');
  });

  it('accepts database-style sheet names', async () => {
    const result = await parseUserImportWorkbook(await createWorkbookBuffer({}, {
      '인력 마스터': 'Employee_Master',
      '프로젝트 마스터': 'Project_Master',
      '프로젝트 투입': 'Project_Assignment',
      '일일 근무 기록': 'Daily_Timesheet',
      '비용 원장': 'Expense_Ledger',
    }));

    expect(result.issues.filter((issue) => issue.severity === 'error')).toHaveLength(0);
    expect(result.dataset.projects[0].projectCode).toBe('PRJ-001');
  });
});

async function createWorkbookBuffer(
  overrides: Partial<Record<string, Array<Record<string, string | number>>>> = {},
  sheetRenames: Record<string, string> = {},
) {
  const baseSheets = {
    '인력 마스터': [
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
    ],
    '프로젝트 마스터': [
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
    ],
    '프로젝트 투입': [
      {
        프로젝트코드: 'PRJ-001',
        사번: 'E-1001',
        역할: 'PM',
        '투입공수(M/M)': 1.5,
        투입일: '2026-01-01',
        종료일: '2026-06-30',
      },
    ],
    '일일 근무 기록': [
      { 일자: '2026-04-01', 사번: 'E-1001', 프로젝트코드: 'PRJ-001', 근무시간: 8, 업무상세: '설계' },
    ],
    '비용 원장': [
      { 지출일: '2026-04-01', 프로젝트코드: 'PRJ-001', 비용구분: '외주비', 금액: 5000000, 내역: '외주 개발' },
      { 지출일: '2026-04-01', 프로젝트코드: '', 비용구분: '판관비', 금액: 12000000, 내역: '사무실 임대료' },
    ],
  };

  const finalSheets = {
    ...baseSheets,
    ...Object.fromEntries(
      Object.entries(overrides).map(([key, value]) => [
        key === 'timesheets' ? '일일 근무 기록' : key,
        value,
      ]),
    ),
  };

  const workbookSheets = Object.entries(finalSheets).map(([sheet, rows]) => ({
    sheet: sheetRenames[sheet] ?? sheet,
    data: toSheetData(rows as Array<Record<string, string | number>>),
  }));

  const buffer = await writeExcelFile(workbookSheets).toBuffer();
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

function toSheetData(rows: Array<Record<string, string | number>>): SheetData {
  const headers = Object.keys(rows[0] ?? {});
  return [
    headers,
    ...rows.map((row) => headers.map((header) => row[header] ?? '')),
  ];
}

function injectEmptyInlineStringCell(arrayBuffer: ArrayBuffer) {
  const files = unzipSync(new Uint8Array(arrayBuffer));
  const sheetPath = 'xl/worksheets/sheet1.xml';
  const xml = strFromU8(files[sheetPath]);
  files[sheetPath] = strToU8(xml.replace('</sheetData>', '<row r="99"><c r="B99" t="inlineStr"></c></row></sheetData>'));
  return zipSync(files).buffer;
}
