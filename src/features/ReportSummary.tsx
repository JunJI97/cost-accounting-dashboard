import { useRef, useState } from 'react';
import type { SheetData } from 'write-excel-file/universal';
import { currency, number, percent } from '../domain/format';
import type { ProjectProfitability } from '../domain/types';

export function ReportSummary({ rows }: { rows: ProjectProfitability[] }) {
  const reportRef = useRef<HTMLDivElement | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [pdfMessage, setPdfMessage] = useState('');
  const [excelMessage, setExcelMessage] = useState('');
  const totals = rows.reduce(
    (acc, row) => {
      acc.revenue += row.revenue;
      acc.totalCost += row.totalCost;
      acc.netProfit += row.netProfit;
      acc.internalLaborCost += row.internalLaborCost;
      acc.outsourcingCost += row.outsourcingCost;
      acc.allocatedIndirectCost += row.allocatedIndirectCost;
      acc.manMonths += row.manMonths;
      return acc;
    },
    {
      revenue: 0,
      totalCost: 0,
      netProfit: 0,
      internalLaborCost: 0,
      outsourcingCost: 0,
      allocatedIndirectCost: 0,
      manMonths: 0,
    },
  );
  const topProfit = [...rows].sort((a, b) => b.netProfit - a.netProfit)[0];
  const bottomProfit = [...rows].sort((a, b) => a.netProfit - b.netProfit)[0];
  const highLabor = [...rows].sort(
    (a, b) => ratio(b.internalLaborCost, b.totalCost) - ratio(a.internalLaborCost, a.totalCost),
  )[0];
  const highOutsourcing = [...rows].sort(
    (a, b) => ratio(b.outsourcingCost, b.totalCost) - ratio(a.outsourcingCost, a.totalCost),
  )[0];
  const highIndirect = [...rows].sort(
    (a, b) => ratio(b.allocatedIndirectCost, b.totalCost) - ratio(a.allocatedIndirectCost, a.totalCost),
  )[0];
  const topProjects = [...rows].sort((a, b) => b.netProfit - a.netProfit).slice(0, 5);
  const riskProjects = [...rows].sort((a, b) => a.margin - b.margin).slice(0, 5);
  const outsourcingProjects = [...rows]
    .sort((a, b) => ratio(b.outsourcingCost, b.totalCost) - ratio(a.outsourcingCost, a.totalCost))
    .slice(0, 5);
  const mmEfficiencyRows = [...rows]
    .sort((a, b) => ratio(b.netProfit, b.manMonths) - ratio(a.netProfit, a.manMonths))
    .slice(0, 5);
  const sensitivityRows = [...rows]
    .sort(
      (a, b) =>
        ratio(b.allocatedIndirectCost, b.netProfit) - ratio(a.allocatedIndirectCost, a.netProfit),
    )
    .slice(0, 5);

  const divisionRows = Object.values(
    rows.reduce<
      Record<
        string,
        {
          divisionName: string;
          revenue: number;
          internalLaborCost: number;
          outsourcingCost: number;
          totalCost: number;
          netProfit: number;
        }
      >
    >(
      (acc, row) => {
        acc[row.divisionName] ??= {
          divisionName: row.divisionName,
          revenue: 0,
          internalLaborCost: 0,
          outsourcingCost: 0,
          totalCost: 0,
          netProfit: 0,
        };
        acc[row.divisionName].revenue += row.revenue;
        acc[row.divisionName].internalLaborCost += row.internalLaborCost;
        acc[row.divisionName].outsourcingCost += row.outsourcingCost;
        acc[row.divisionName].totalCost += row.totalCost;
        acc[row.divisionName].netProfit += row.netProfit;
        return acc;
      },
      {},
    ),
  ).sort((a, b) => b.netProfit - a.netProfit);
  const bestDivision = [...divisionRows].sort(
    (a, b) => ratio(b.netProfit, b.revenue) - ratio(a.netProfit, a.revenue),
  )[0];
  const laborHeavyDivision = [...divisionRows].sort(
    (a, b) => ratio(b.internalLaborCost, b.totalCost) - ratio(a.internalLaborCost, a.totalCost),
  )[0];
  const outsourcingHeavyDivision = [...divisionRows].sort(
    (a, b) => ratio(b.outsourcingCost, b.totalCost) - ratio(a.outsourcingCost, a.totalCost),
  )[0];
  const lossProjects = rows.filter((row) => row.netProfit < 0).length;
  const lowMarginProjects = rows.filter((row) => row.margin < 0.1).length;
  const outsourcingRatio = ratio(totals.outsourcingCost, totals.totalCost);
  const internalLaborRatio = ratio(totals.internalLaborCost, totals.totalCost);
  const insightComments = [
    `본부별 수익성 기준으로 ${bestDivision.divisionName}가 이익률 ${percent(
      ratio(bestDivision.netProfit, bestDivision.revenue),
    )}로 가장 효율적입니다. 매출 대비 순이익 전환율이 높아 현재 배부 기준에서도 우수한 수익 구조를 보입니다.`,
    `${laborHeavyDivision.divisionName}는 총원가 중 내부 인건비 비중이 ${percent(
      ratio(laborHeavyDivision.internalLaborCost, laborHeavyDivision.totalCost),
    )}로 높습니다. 투입 공수, 역할별 단가, 프로젝트별 M/M 계획 대비 실적을 우선 점검하는 것이 좋습니다.`,
    `${outsourcingHeavyDivision.divisionName}는 외주 용역비 비중이 ${percent(
      ratio(outsourcingHeavyDivision.outsourcingCost, outsourcingHeavyDivision.totalCost),
    )}로 가장 높습니다. 외주 범위와 단가 계약을 분리 관리하면 SI 기업형 원가 통제 포인트가 명확해집니다.`,
    `${highOutsourcing.projectName}는 프로젝트 단위에서 외주 용역비 부담이 가장 큽니다. 매출 규모 대비 외주 투입 효과를 별도 KPI로 추적할 필요가 있습니다.`,
    `${lowMarginProjects}개 프로젝트는 이익률 10% 미만입니다. 이 구간은 견적 단가, 추가 투입 시간, 외주비 정산 조건을 묶어서 재검토하는 것이 좋습니다.`,
  ];

  async function exportReportExcel() {
    if (isExportingExcel) return;

    setIsExportingExcel(true);
    setExcelMessage('리포트 엑셀을 생성하고 있습니다.');
    try {
      await saveWorkbook(`management-insight-report-${today()}.xlsx`, [
        {
          sheet: '요약 KPI',
          data: toSheetData(
            ['지표', '값'],
            [
              ['전체 매출', Math.round(totals.revenue)],
              ['총 원가', Math.round(totals.totalCost)],
              ['순이익', Math.round(totals.netProfit)],
              ['전체 이익률', percent(ratio(totals.netProfit, totals.revenue))],
              ['외주비 비중', percent(outsourcingRatio)],
              ['내부 인건비 비중', percent(internalLaborRatio)],
              ['손실 프로젝트', lossProjects],
            ],
          ),
          columns: [{ width: 22 }, { width: 28 }],
        },
        {
          sheet: 'AI 분석 코멘트',
          data: toSheetData(
            ['No', '코멘트'],
            insightComments.map((comment, index) => [index + 1, comment]),
          ),
          columns: [{ width: 8 }, { width: 100 }],
        },
        makeProjectSheet('수익성 상위', topProjects),
        makeProjectSheet('개선 후보', riskProjects),
        makeProjectSheet('외주 의존도', outsourcingProjects),
        makeProjectSheet('MM 효율', mmEfficiencyRows),
        makeProjectSheet('공통비 민감도', sensitivityRows),
        {
          sheet: '본부별 수익성',
          data: toSheetData(
            ['본부', '매출', '내부 인건비', '외주 용역비', '총원가', '순이익', '이익률'],
            divisionRows.map((division) => [
              division.divisionName,
              Math.round(division.revenue),
              Math.round(division.internalLaborCost),
              Math.round(division.outsourcingCost),
              Math.round(division.totalCost),
              Math.round(division.netProfit),
              percent(ratio(division.netProfit, division.revenue)),
            ]),
          ),
          columns: [{ width: 22 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 12 }],
        },
      ]);
      setExcelMessage('리포트 엑셀 다운로드를 시작했습니다.');
    } catch (error) {
      setExcelMessage(error instanceof Error ? `엑셀 생성 실패: ${error.message}` : '엑셀 생성 중 오류가 발생했습니다.');
    } finally {
      setIsExportingExcel(false);
    }
  }

  async function exportReportPdf() {
    if (!reportRef.current || isExportingPdf) return;

    setIsExportingPdf(true);
    setPdfMessage('PDF를 생성하고 있습니다.');
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);
      const canvas = await html2canvas(reportRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        windowWidth: 1280,
        onclone: (documentClone) => {
          const style = documentClone.createElement('style');
          style.textContent = `
            * {
              color: #0f172a !important;
              border-color: #e2e8f0 !important;
              box-shadow: none !important;
            }
            body, section, div, table, tr, td, th {
              background-color: #ffffff !important;
            }
            .bg-slate-50, .bg-teal-50, .bg-amber-50, .bg-red-50, .bg-violet-50 {
              background-color: #f8fafc !important;
            }
            .text-slate-500, .text-slate-600, .text-slate-700 {
              color: #475569 !important;
            }
            .text-teal-700 { color: #0f766e !important; }
            .text-amber-700 { color: #b45309 !important; }
            .text-red-700 { color: #b91c1c !important; }
            .text-violet-700 { color: #6d28d9 !important; }
            [data-html2canvas-ignore="true"] { display: none !important; }
            [data-report-pdf-root="true"] {
              width: 1120px !important;
              max-width: 1120px !important;
              padding: 24px !important;
              border: 0 !important;
            }
            [data-report-pdf-grid="true"] {
              display: grid !important;
              grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
              gap: 16px !important;
              align-items: start !important;
            }
            [data-report-pdf-wide="true"] {
              grid-column: 1 / -1 !important;
            }
            table {
              table-layout: fixed !important;
              border-collapse: collapse !important;
            }
            th, td {
              white-space: normal !important;
              overflow-wrap: anywhere !important;
              line-height: 1.45 !important;
              vertical-align: top !important;
            }
            p, li, dt, dd, h2, h3 {
              overflow: visible !important;
              text-overflow: clip !important;
              white-space: normal !important;
              line-height: 1.55 !important;
            }
            .truncate {
              overflow: visible !important;
              text-overflow: clip !important;
              white-space: normal !important;
            }
          `;
          documentClone.head.appendChild(style);
        },
      });
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const imageWidth = pageWidth - margin * 2;
      const pageContentHeight = pageHeight - margin * 2;
      const pageCanvasHeight = Math.floor((pageContentHeight * canvas.width) / imageWidth);
      const pageCanvas = document.createElement('canvas');
      const pageContext = pageCanvas.getContext('2d');

      if (!pageContext) {
        throw new Error('PDF 페이지 캔버스를 생성하지 못했습니다.');
      }

      pageCanvas.width = canvas.width;

      for (let sourceY = 0, pageIndex = 0; sourceY < canvas.height; sourceY += pageCanvasHeight, pageIndex += 1) {
        const sliceHeight = Math.min(pageCanvasHeight, canvas.height - sourceY);
        pageCanvas.height = sliceHeight;
        pageContext.clearRect(0, 0, pageCanvas.width, pageCanvas.height);
        pageContext.drawImage(
          canvas,
          0,
          sourceY,
          canvas.width,
          sliceHeight,
          0,
          0,
          canvas.width,
          sliceHeight,
        );

        if (pageIndex > 0) {
          pdf.addPage();
        }
        const sliceImageHeight = (sliceHeight * imageWidth) / canvas.width;
        pdf.addImage(
          pageCanvas.toDataURL('image/png'),
          'PNG',
          margin,
          margin,
          imageWidth,
          sliceImageHeight,
        );
      }

      pdf.save(`management-insight-report-${new Date().toISOString().slice(0, 10)}.pdf`);
      setPdfMessage('PDF 다운로드를 시작했습니다.');
    } catch (error) {
      setPdfMessage(
        error instanceof Error
          ? `PDF 생성 실패: ${error.message}`
          : 'PDF 생성 중 오류가 발생했습니다.',
      );
    } finally {
      setIsExportingPdf(false);
    }
  }

  return (
    <section className="mx-auto max-w-7xl px-5 py-5 pb-8">
      <div
        ref={reportRef}
        data-report-pdf-root="true"
        className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-950">경영 인사이트 리포트</h2>
            {pdfMessage && (
              <p className="mt-1 text-sm font-medium text-slate-500" data-html2canvas-ignore="true">
                {pdfMessage}
              </p>
            )}
            {excelMessage && (
              <p className="mt-1 text-sm font-medium text-slate-500" data-html2canvas-ignore="true">
                {excelMessage}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2" data-html2canvas-ignore="true">
            <button
              type="button"
              onClick={() => void exportReportPdf()}
              disabled={isExportingPdf}
              className="h-9 rounded-md bg-teal-700 px-3 text-sm font-medium text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {isExportingPdf ? 'PDF 생성 중' : 'PDF 저장'}
            </button>
            <button
              type="button"
              onClick={() => void exportReportExcel()}
              disabled={isExportingExcel}
              className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {isExportingExcel ? '엑셀 생성 중' : '리포트 엑셀'}
            </button>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <ReportMetric label="전체 이익률" value={percent(ratio(totals.netProfit, totals.revenue))} />
          <ReportMetric label="외주비 비중" value={percent(outsourcingRatio)} />
          <ReportMetric label="내부 인건비 비중" value={percent(internalLaborRatio)} />
          <ReportMetric label="손실 프로젝트" value={`${number.format(lossProjects)}개`} />
        </div>
        <div data-report-pdf-grid="true" className="mt-4 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-md bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-900">AI 분석 코멘트</h3>
            <div className="mt-3 space-y-3 text-sm leading-6 text-slate-700">
              {insightComments.map((comment) => (
                <p key={comment}>{comment}</p>
              ))}
            </div>
          </div>

          <div className="rounded-md border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-900">원가 동인 분석</h3>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
              <li>
                최고 수익 프로젝트는 <b>{topProfit.projectName}</b>이며 순이익은{' '}
                <b>{currency.format(topProfit.netProfit)}</b>입니다.
              </li>
              <li>
                수익성이 가장 낮은 프로젝트는 <b>{bottomProfit.projectName}</b>이며 주요 원가 동인은{' '}
                <b>{bottomProfit.primaryDriver}</b>입니다.
              </li>
              <li>
                내부 인건비 비중이 가장 높은 프로젝트는 <b>{highLabor.projectName}</b>입니다.
              </li>
              <li>
                외주 용역비 비중이 가장 높은 프로젝트는 <b>{highOutsourcing.projectName}</b>입니다.
              </li>
              <li>
                공통비 배부 부담이 가장 큰 프로젝트는 <b>{highIndirect.projectName}</b>입니다.
              </li>
            </ul>
          </div>

          <div data-report-pdf-wide="true" className="rounded-md border border-slate-200 p-4 xl:col-span-2">
            <h3 className="text-sm font-semibold text-slate-900">수익성 상위 프로젝트</h3>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-500">
                    <th className="h-9 px-2 font-medium">프로젝트</th>
                    <th className="h-9 px-2 font-medium">본부</th>
                    <th className="h-9 px-2 text-right font-medium">매출</th>
                    <th className="h-9 px-2 text-right font-medium">순이익</th>
                    <th className="h-9 px-2 text-right font-medium">이익률</th>
                    <th className="h-9 px-2 font-medium">주요 원가 동인</th>
                  </tr>
                </thead>
                <tbody>
                  {topProjects.map((row) => (
                    <ProjectInsightRow key={row.projectId} row={row} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-md border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-900">개선 후보 프로젝트</h3>
            <div className="mt-3 space-y-2">
              {riskProjects.map((row) => (
                <RankCard
                  key={row.projectId}
                  title={row.projectName}
                  value={percent(row.margin)}
                  description={`순이익 ${currency.format(row.netProfit)} · ${row.primaryDriver} 부담`}
                  tone={row.margin < 0 ? 'danger' : 'warning'}
                />
              ))}
            </div>
          </div>

          <div className="rounded-md border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-900">외주 의존도 Top 5</h3>
            <div className="mt-3 space-y-2">
              {outsourcingProjects.map((row) => (
                <RankCard
                  key={row.projectId}
                  title={row.projectName}
                  value={percent(ratio(row.outsourcingCost, row.totalCost))}
                  description={`외주 용역비 ${currency.format(row.outsourcingCost)}`}
                  tone="purple"
                />
              ))}
            </div>
          </div>

          <div className="rounded-md border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-900">M/M 효율 상위</h3>
            <div className="mt-3 space-y-2">
              {mmEfficiencyRows.map((row) => (
                <RankCard
                  key={row.projectId}
                  title={row.projectName}
                  value={currency.format(ratio(row.netProfit, row.manMonths))}
                  description={`${row.manMonths.toFixed(2)} M/M 기준 순이익`}
                  tone="good"
                />
              ))}
            </div>
          </div>

          <div className="rounded-md border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-900">공통비 민감도</h3>
            <div className="mt-3 space-y-2">
              {sensitivityRows.map((row) => (
                <RankCard
                  key={row.projectId}
                  title={row.projectName}
                  value={percent(ratio(row.allocatedIndirectCost, Math.max(row.netProfit, 1)))}
                  description={`배부 공통비 ${currency.format(row.allocatedIndirectCost)}`}
                  tone="neutral"
                />
              ))}
            </div>
          </div>

          <div data-report-pdf-wide="true" className="rounded-md border border-slate-200 p-4 xl:col-span-2">
            <h3 className="text-sm font-semibold text-slate-900">본부별 수익성</h3>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-500">
                    <th className="h-9 px-2 font-medium">본부</th>
                    <th className="h-9 px-2 font-medium">매출</th>
                    <th className="h-9 px-2 font-medium">내부 인건비</th>
                    <th className="h-9 px-2 font-medium">외주 용역비</th>
                    <th className="h-9 px-2 font-medium">순이익</th>
                    <th className="h-9 px-2 font-medium">이익률</th>
                  </tr>
                </thead>
                <tbody>
                  {divisionRows.map((division) => (
                    <tr key={division.divisionName} className="border-b border-slate-100">
                      <td className="px-2 py-2 font-medium">{division.divisionName}</td>
                      <td className="px-2 py-2">{currency.format(division.revenue)}</td>
                      <td className="px-2 py-2">{currency.format(division.internalLaborCost)}</td>
                      <td className="px-2 py-2">{currency.format(division.outsourcingCost)}</td>
                      <td className="px-2 py-2">{currency.format(division.netProfit)}</td>
                      <td className="px-2 py-2">{percent(ratio(division.netProfit, division.revenue))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ReportMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function ProjectInsightRow({ row }: { row: ProjectProfitability }) {
  return (
    <tr className="border-b border-slate-100">
      <td className="px-2 py-2 font-medium text-slate-900">{row.projectName}</td>
      <td className="px-2 py-2 text-slate-600">{row.divisionName}</td>
      <td className="px-2 py-2 text-right tabular-nums">{currency.format(row.revenue)}</td>
      <td className="px-2 py-2 text-right tabular-nums">{currency.format(row.netProfit)}</td>
      <td className="px-2 py-2 text-right tabular-nums">{percent(row.margin)}</td>
      <td className="px-2 py-2 text-slate-600">{row.primaryDriver}</td>
    </tr>
  );
}

function RankCard({
  title,
  value,
  description,
  tone,
}: {
  title: string;
  value: string;
  description: string;
  tone: 'good' | 'warning' | 'danger' | 'purple' | 'neutral';
}) {
  const toneClass = {
    good: 'text-teal-700',
    warning: 'text-amber-700',
    danger: 'text-red-700',
    purple: 'text-violet-700',
    neutral: 'text-slate-700',
  }[tone];

  return (
    <div className="rounded-md bg-slate-50 px-3 py-2">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 truncate text-sm font-medium text-slate-900">{title}</p>
        <p className={`shrink-0 text-sm font-semibold tabular-nums ${toneClass}`}>{value}</p>
      </div>
      <p className="mt-1 truncate text-xs text-slate-500">{description}</p>
    </div>
  );
}

function makeProjectSheet(sheet: string, rows: ProjectProfitability[]) {
  return {
    sheet,
    data: toSheetData(
      [
        '프로젝트명',
        '본부',
        '매출',
        '총원가',
        '내부 인건비',
        '외주 용역비',
        '배부 공통비',
        'M/M',
        '순이익',
        '이익률',
        '원가 동인',
      ],
      rows.map((row) => [
        row.projectName,
        row.divisionName,
        Math.round(row.revenue),
        Math.round(row.totalCost),
        Math.round(row.internalLaborCost),
        Math.round(row.outsourcingCost),
        Math.round(row.allocatedIndirectCost),
        Number(row.manMonths.toFixed(2)),
        Math.round(row.netProfit),
        percent(row.margin),
        row.primaryDriver,
      ]),
    ),
    columns: [
      { width: 32 },
      { width: 20 },
      { width: 16 },
      { width: 16 },
      { width: 16 },
      { width: 16 },
      { width: 16 },
      { width: 10 },
      { width: 16 },
      { width: 12 },
      { width: 16 },
    ],
  };
}

function toSheetData(headers: string[], rows: Array<Array<string | number>>): SheetData {
  return [headers, ...rows];
}

async function saveWorkbook(
  filename: string,
  sheets: Array<{ sheet: string; data: SheetData; columns?: Array<{ width: number }> }>,
) {
  const { default: writeExcelFile } = await import('write-excel-file/universal');
  const blob = await writeExcelFile(sheets).toBlob();
  downloadBlob(filename, blob);
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function ratio(numerator: number, denominator: number) {
  if (!Number.isFinite(denominator) || denominator === 0) {
    return 0;
  }
  return numerator / denominator;
}
