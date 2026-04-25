import { describe, expect, it } from 'vitest';
import { seedData } from '../data/seed';
import { parseDatasetCsv, parseDatasetJson } from './csvExchange';

describe('csv exchange', () => {
  it('detects projects csv and converts numeric revenue', () => {
    const result = parseDatasetCsv('id,name,divisionId,revenue,allocationWeight\nprj-x,Test,div-1,1200000,1.5');

    expect(result.key).toBe('projects');
    expect(result.rows[0]).toMatchObject({
      id: 'prj-x',
      revenue: 1200000,
      allocationWeight: 1.5,
    });
  });

  it('rejects unknown division references for scoped indirect costs', () => {
    expect(() =>
      parseDatasetCsv('id,label,amount,divisionId\nic-x,Scoped,1000,missing-division', seedData),
    ).toThrow("본부 ID 'missing-division'");
  });

  it('detects timesheet csv and converts hours', () => {
    const result = parseDatasetCsv('employeeId,projectId,hours\nemp-1,prj-1,42');

    expect(result.key).toBe('timeEntries');
    expect(result.rows[0]).toMatchObject({
      employeeId: 'emp-1',
      hours: 42,
    });
  });

  it('accepts Korean timesheet csv and maps business keys', () => {
    const result = parseDatasetCsv('일자,사번,프로젝트코드,근무시간\n2026-04-01,E-1001,PRJ-001,8', seedData);

    expect(result.key).toBe('timeEntries');
    expect(result.rows[0]).toMatchObject({
      date: '2026-04-01',
      employeeId: 'emp-1',
      projectId: 'prj-1',
      hours: 8,
    });
  });

  it('accepts Korean project csv and comma formatted amounts', () => {
    const result = parseDatasetCsv(
      '프로젝트코드,프로젝트명,본부명,계약금액,시작일,종료일\nPRJ-X,테스트 프로젝트,전략기획본부,"120,000,000",2026-01-01,2026-06-30',
      seedData,
    );

    expect(result.key).toBe('projects');
    expect(result.rows[0]).toMatchObject({
      id: 'PRJ-X',
      projectCode: 'PRJ-X',
      divisionId: 'div-1',
      revenue: 120000000,
    });
  });

  it('creates related divisions when Korean project csv has new division names', () => {
    const result = parseDatasetCsv(
      '프로젝트코드,프로젝트명,본부명,계약금액\nPRJ-X,테스트 프로젝트,1번 본부,5000000',
      seedData,
    );

    expect(result.key).toBe('projects');
    expect(result.relatedRows?.divisions).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: '1번 본부' })]),
    );
    expect(result.rows[0]).toMatchObject({
      divisionId: 'div-csv-1번-본부',
    });
  });

  it('detects project assignment csv', () => {
    const result = parseDatasetCsv(
      'id,employeeId,projectId,startDate,endDate\npa-1,emp-1,prj-1,2026-01-01,2026-06-30',
      seedData,
    );

    expect(result.key).toBe('projectAssignments');
    expect(result.rows[0]).toMatchObject({
      id: 'pa-1',
      startDate: '2026-01-01',
    });
  });

  it('detects expense ledger csv', () => {
    const result = parseDatasetCsv(
      'id,expenseDate,projectId,expenseType,amount,description\nexp-1,2026-04-01,prj-1,외주비,2000000,외주 개발',
      seedData,
    );

    expect(result.key).toBe('expenses');
    expect(result.rows[0]).toMatchObject({
      id: 'exp-1',
      expenseType: '외주비',
      amount: 2000000,
    });
  });

  it('rejects unknown project references when a dataset is provided', () => {
    expect(() =>
      parseDatasetCsv('employeeId,projectId,hours\nemp-1,missing-project,42', seedData),
    ).toThrow("프로젝트 ID 'missing-project'");
  });

  it('reports unsupported headers', () => {
    expect(() => parseDatasetCsv('wrong,columns\n1,2')).toThrow('지원하지 않는 CSV 형식');
  });

  it('accepts full dataset json', () => {
    const result = parseDatasetJson(JSON.stringify(seedData));

    expect(result.projects).toHaveLength(20);
    expect(result.divisions).toHaveLength(5);
  });
});
