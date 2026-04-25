import { Download, FileJson, FileSpreadsheet, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import type { SheetData } from 'write-excel-file/universal';
import {
  downloadCsv,
  downloadJson,
  getCsvFiles,
  parseDatasetCsv,
  parseDatasetJson,
  type ExportFileDefinition,
} from '../domain/csvExchange';
import {
  downloadUserImportTemplate,
  parseUserImportWorkbook,
  type UserImportResult,
} from '../domain/userImport';
import type { CostDataset } from '../domain/types';
import { useCostingStore } from '../store/useCostingStore';

export function CsvExchangePanel({ dataset }: { dataset: CostDataset }) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [message, setMessage] = useState('엑셀 템플릿 또는 CSV/JSON 파일을 가져올 수 있습니다.');
  const [importResult, setImportResult] = useState<UserImportResult | null>(null);
  const [exportFormat, setExportFormat] = useState<'xlsx' | 'csv' | 'json'>('xlsx');
  const [exportTarget, setExportTarget] = useState<'all' | ExportFileDefinition['key']>('all');
  const [isExporting, setIsExporting] = useState(false);
  const { setDataset, updateDatasetPart } = useCostingStore();

  async function handleImport(file: File) {
    try {
      if (/\.(xlsx|xls)$/i.test(file.name)) {
        const result = await parseUserImportWorkbook(file);
        setImportResult(result);
        setMessage(
          result.issues.some((issue) => issue.severity === 'error')
            ? `${file.name} 파일에 수정이 필요한 오류가 있습니다.`
            : `${file.name} 파일을 검토했습니다. 반영할 수 있습니다.`,
        );
        return;
      }

      const text = await file.text();
      if (file.name.toLowerCase().endsWith('.json')) {
        setDataset(parseDatasetJson(text));
        setMessage(`${file.name} 전체 데이터셋을 가져왔습니다.`);
        return;
      }

      const result = parseDatasetCsv(text, dataset);
      updateDatasetPart(result.key, result.rows);
      setMessage(`${file.name} 파일을 ${getLabel(result.key)} 데이터로 반영했습니다.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '파일을 가져오지 못했습니다.');
    }
  }

  const errors = importResult?.issues.filter((issue) => issue.severity === 'error') ?? [];
  const warnings = importResult?.issues.filter((issue) => issue.severity === 'warning') ?? [];
  const canApplyImport = importResult && errors.length === 0;
  const issueGroups = groupIssuesBySheet(importResult?.issues ?? []);
  const exportFiles = getCsvFiles();

  async function handleExport() {
    setIsExporting(true);
    try {
      if (exportFormat === 'json') {
        downloadJson(dataset);
        setMessage('전체 데이터셋을 JSON으로 내보냈습니다.');
        return;
      }

      if (exportTarget === 'all') {
        if (exportFormat === 'xlsx') {
          await downloadDatasetExcel(dataset, exportFiles);
          setMessage('전체 데이터셋을 엑셀 파일로 내보냈습니다.');
          return;
        }

        for (const file of exportFiles) {
          downloadCsv(dataset, file.key);
        }
        setMessage('전체 데이터셋을 CSV 파일 여러 개로 내보냈습니다.');
        return;
      }

      if (exportFormat === 'xlsx') {
        const target = exportFiles.find((file) => file.key === exportTarget);
        await downloadDatasetExcel(dataset, target ? [target] : exportFiles);
        setMessage(`${target?.label ?? '선택 데이터'} 데이터를 엑셀로 내보냈습니다.`);
        return;
      }

      downloadCsv(dataset, exportTarget);
      setMessage(`${getLabel(exportTarget)} 데이터를 CSV로 내보냈습니다.`);
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">데이터 가져오기 / 내보내기</p>
          <p className="mt-1 text-sm text-slate-500">{message}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void downloadUserImportTemplate()}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <FileSpreadsheet size={15} aria-hidden="true" />
            엑셀 템플릿
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex h-9 items-center gap-2 rounded-md bg-teal-700 px-3 text-sm font-medium text-white hover:bg-teal-800"
          >
            <Upload size={15} aria-hidden="true" />
            가져오기
          </button>
        </div>
      </div>
      <div className="mt-3 rounded-md border border-slate-200 bg-white p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <label className="block">
            <span className="text-xs font-semibold text-slate-500">내보내기 형식</span>
            <select
              className="mt-1 h-9 min-w-[130px] rounded-md border border-slate-300 bg-white px-2 text-sm"
              value={exportFormat}
              onChange={(event) => {
                const value = event.target.value as typeof exportFormat;
                setExportFormat(value);
                if (value === 'json') {
                  setExportTarget('all');
                }
              }}
            >
              <option value="xlsx">엑셀</option>
              <option value="csv">CSV</option>
              <option value="json">JSON</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-500">내보내기 대상</span>
            <select
              className="mt-1 h-9 min-w-[190px] rounded-md border border-slate-300 bg-white px-2 text-sm"
              value={exportTarget}
              disabled={exportFormat === 'json'}
              onChange={(event) => setExportTarget(event.target.value as typeof exportTarget)}
            >
              <option value="all">전체 데이터셋</option>
              {exportFiles.map((file) => (
                <option key={file.key} value={file.key}>
                  {file.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => void handleExport()}
            disabled={isExporting}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100"
          >
            {exportFormat === 'json' ? <FileJson size={15} aria-hidden="true" /> : <Download size={15} aria-hidden="true" />}
            {isExporting ? '내보내는 중' : '내보내기'}
          </button>
        </div>
      </div>
      <div className="mt-3 grid gap-2 text-sm text-slate-600 lg:grid-cols-3">
        <ImportGuide
          title="1. 템플릿 작성"
          body="엑셀 템플릿을 내려받아 사번, 프로젝트코드, 본부명 기준으로 작성합니다."
        />
        <ImportGuide
          title="2. 업로드 검토"
          body="오류는 반영을 막고, 경고는 확인 후 반영할 수 있게 표시합니다."
        />
        <ImportGuide
          title="3. 전체 교체"
          body="오류가 없으면 업로드 파일 기준으로 데이터를 교체하고 모든 화면을 재계산합니다."
        />
      </div>
      <div className="mt-3 rounded-md bg-white px-3 py-2 text-sm leading-6 text-slate-600">
        <b className="text-slate-900">작성 규칙:</b> 판관비는 프로젝트코드를 비우고, 직접경비/외주비는
        프로젝트코드를 입력합니다. 일일 근무 기록은 사번과 프로젝트코드가 마스터 시트에 먼저 존재해야 합니다.
      </div>
      <input
        ref={fileInputRef}
        className="hidden"
        type="file"
        accept=".xlsx,.xls,.csv,.json,text/csv,application/json"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleImport(file);
          event.target.value = '';
        }}
      />
      {importResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4">
          <div className="max-h-[86vh] w-full max-w-3xl overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
            <div className="border-b border-slate-200 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-base font-semibold text-slate-950">엑셀 가져오기 검토</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {errors.length > 0
                      ? '오류를 수정한 뒤 다시 업로드해야 반영할 수 있습니다.'
                      : warnings.length > 0
                        ? '경고를 확인했습니다. 필요하면 그대로 반영할 수 있습니다.'
                        : '오류와 경고가 없습니다. 전체 데이터를 교체할 수 있습니다.'}
                  </p>
                </div>
                <div className="flex gap-2 text-sm">
                  <span className="rounded-md bg-red-50 px-2 py-1 font-semibold text-red-700">
                    오류 {errors.length}
                  </span>
                  <span className="rounded-md bg-amber-50 px-2 py-1 font-semibold text-amber-700">
                    경고 {warnings.length}
                  </span>
                </div>
              </div>
            </div>
            <div className="max-h-[58vh] overflow-y-auto p-4">
              <div
                className={`mb-4 rounded-md px-3 py-3 text-sm font-medium ${
                  errors.length > 0
                    ? 'bg-red-50 text-red-800'
                    : warnings.length > 0
                      ? 'bg-amber-50 text-amber-800'
                      : 'bg-teal-50 text-teal-800'
                }`}
              >
                {errors.length > 0
                  ? '반영 불가: 아래 오류를 수정한 뒤 파일을 다시 업로드하세요.'
                  : warnings.length > 0
                    ? '반영 가능: 경고 항목은 데이터 품질 확인용입니다.'
                    : '반영 가능: 업로드 데이터가 검증을 통과했습니다.'}
              </div>
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                <ImportSummary label="본부" value={importResult.summary.divisions} />
                <ImportSummary label="직원" value={importResult.summary.employees} />
                <ImportSummary label="프로젝트" value={importResult.summary.projects} />
                <ImportSummary label="투입" value={importResult.summary.assignments} />
                <ImportSummary label="근무기록" value={importResult.summary.timeEntries} />
                <ImportSummary label="비용" value={importResult.summary.expenses} />
              </div>

              {importResult.issues.length > 0 ? (
                <div className="mt-4 space-y-4">
                  {issueGroups.map((group) => (
                    <div key={group.sheet} className="rounded-md border border-slate-200">
                      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-2">
                        <p className="text-sm font-semibold text-slate-900">{group.sheet}</p>
                        <p className="text-xs font-medium text-slate-500">
                          오류 {group.errors} · 경고 {group.warnings}
                        </p>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[620px] text-sm">
                          <thead>
                            <tr className="border-b border-slate-200 text-left text-slate-500">
                              <th className="h-9 px-2 font-medium">구분</th>
                              <th className="h-9 px-2 font-medium">행</th>
                              <th className="h-9 px-2 font-medium">컬럼</th>
                              <th className="h-9 px-2 font-medium">내용</th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.issues.slice(0, 30).map((issue, index) => (
                              <tr
                                key={`${issue.sheet}-${issue.row}-${issue.column}-${index}`}
                                className="border-b border-slate-100"
                              >
                                <td className="px-2 py-2">
                                  <span
                                    className={`rounded-md px-2 py-1 text-xs font-semibold ${
                                      issue.severity === 'error'
                                        ? 'bg-red-50 text-red-700'
                                        : 'bg-amber-50 text-amber-700'
                                    }`}
                                  >
                                    {issue.severity === 'error' ? '오류' : '경고'}
                                  </span>
                                </td>
                                <td className="px-2 py-2">{issue.row}</td>
                                <td className="px-2 py-2">{issue.column}</td>
                                <td className="px-2 py-2">{issue.message}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {group.issues.length > 30 && (
                        <p className="px-3 py-2 text-sm text-slate-500">
                          이 시트의 이슈가 많아 상위 30개만 표시합니다.
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-md bg-teal-50 px-3 py-3 text-sm font-medium text-teal-800">
                  오류와 경고가 없습니다. 바로 반영할 수 있습니다.
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 p-4">
              <button
                type="button"
                onClick={() => setImportResult(null)}
                className="h-9 rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                닫기
              </button>
              <button
                type="button"
                disabled={!canApplyImport}
                onClick={() => {
                  if (!importResult) return;
                  setDataset(importResult.dataset);
                  setMessage('엑셀 데이터를 반영했습니다. 대시보드와 리포트에서 재계산 결과를 확인하세요.');
                  setImportResult(null);
                }}
                className="h-9 rounded-md bg-teal-700 px-4 text-sm font-medium text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                전체 교체 반영
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ImportGuide({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
      <p className="font-semibold text-slate-900">{title}</p>
      <p className="mt-1 leading-5">{body}</p>
    </div>
  );
}

function ImportSummary({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-slate-50 px-3 py-2">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-base font-semibold text-slate-950">{value.toLocaleString('ko-KR')}</p>
    </div>
  );
}

function getLabel(key: keyof CostDataset) {
  return getCsvFiles().find((file) => file.key === key)?.label ?? key;
}

async function downloadDatasetExcel(dataset: CostDataset, files: ExportFileDefinition[]) {
  const { default: writeExcelFile } = await import('write-excel-file/universal');
  const sheets = files.map((file) => {
    const rows = dataset[file.key] as Array<Record<string, unknown>>;
    return {
      sheet: sanitizeSheetName(file.label),
      data: toSheetData(rows),
      columns: getColumnWidths(rows),
    };
  });
  const blob = await writeExcelFile(sheets).toBlob();
  downloadBlob(
    files.length === 1
      ? `${files[0].filename.replace(/\.csv$/, '')}.xlsx`
      : `cost-accounting-dataset-${new Date().toISOString().slice(0, 10)}.xlsx`,
    blob,
  );
}

function toSheetData(rows: Array<Record<string, unknown>>): SheetData {
  const headers = Object.keys(rows[0] ?? {});
  return [
    headers,
    ...rows.map((row) =>
      headers.map((header) => {
        const value = row[header];
        return value === undefined || value === null ? '' : String(value);
      }),
    ),
  ];
}

function getColumnWidths(rows: Array<Record<string, unknown>>) {
  const headers = Object.keys(rows[0] ?? {});
  return headers.map((header) => ({
    width: Math.min(
      Math.max(
        header.length + 4,
        ...rows.slice(0, 30).map((row) => String(row[header] ?? '').length + 2),
      ),
      34,
    ),
  }));
}

function sanitizeSheetName(name: string) {
  return name.replace(/[\[\]\/\\:*?]/g, ' ').slice(0, 31).trim() || 'Sheet';
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function groupIssuesBySheet(issues: UserImportResult['issues']) {
  return Object.values(
    issues.reduce<
      Record<
        string,
        {
          sheet: string;
          errors: number;
          warnings: number;
          issues: UserImportResult['issues'];
        }
      >
    >((acc, issue) => {
      acc[issue.sheet] ??= { sheet: issue.sheet, errors: 0, warnings: 0, issues: [] };
      acc[issue.sheet].issues.push(issue);
      if (issue.severity === 'error') {
        acc[issue.sheet].errors += 1;
      } else {
        acc[issue.sheet].warnings += 1;
      }
      return acc;
    }, {}),
  );
}
