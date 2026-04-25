import type { CostDataset } from '../domain/types';

export const seedProjectNames = [
  'ERP 원가 모듈 구축',
  '클라우드 비용 최적화',
  '신규 SaaS 과금 체계 설계',
  '고객사 수익성 진단',
  '영업 파이프라인 분석',
  '제조 원가 표준화',
  'AI 예측정산 파일럿',
  '데이터 마트 통합',
  '구독 매출 대시보드',
  '내부 통제 리포팅 자동화',
  '공급망 비용 추적',
  '프로젝트 손익 알림 시스템',
  '외주비 정산 프로세스 개선',
  '본부별 예산 모니터링',
  '서비스별 마진 분석',
  '월마감 검증 자동화',
  '인력 투입 계획 시뮬레이터',
  '공통비 배부 정책 개편',
  '경영진 KPI 포털',
  '분기별 성과 리뷰 패키지',
];

export function createSeedDataset(): CostDataset {
  const dataset: CostDataset = {
    divisions: [
      { id: 'div-1', name: '전략기획본부' },
      { id: 'div-2', name: '플랫폼개발본부' },
      { id: 'div-3', name: '데이터분석본부' },
      { id: 'div-4', name: '고객성공본부' },
      { id: 'div-5', name: '경영지원본부' },
    ],
    employees: [
      employee('emp-1', 'E-1001', '김민준', '1988-03-14', 'div-1', 52000),
      employee('emp-2', 'E-1002', '이서연', '1990-07-22', 'div-1', 48000),
      employee('emp-3', 'E-2001', '박도윤', '1985-11-02', 'div-2', 61000),
      employee('emp-4', 'E-2002', '최하윤', '1992-01-19', 'div-2', 58000),
      employee('emp-5', 'E-2003', '정지호', '1994-05-08', 'div-2', 54000),
      employee('emp-6', 'E-3001', '강서준', '1989-09-11', 'div-3', 57000),
      employee('emp-7', 'E-3002', '윤지우', '1993-12-26', 'div-3', 53000),
      employee('emp-8', 'E-4001', '조하린', '1991-04-05', 'div-4', 45000),
      employee('emp-9', 'E-4002', '한유준', '1995-08-17', 'div-4', 43000),
      employee('emp-10', 'E-5001', '오수아', '1987-02-28', 'div-5', 50000),
    ],
    projects: Array.from({ length: 20 }, (_, index) => {
      const id = `prj-${index + 1}`;
      const divisionId = `div-${(index % 5) + 1}`;
      return {
        id,
        projectCode: `PRJ-${String(index + 1).padStart(3, '0')}`,
        divisionId,
        name: seedProjectNames[index],
        revenue: 62000000 + index * 4300000 + (index % 4) * 3500000,
        startDate: `2026-${String((index % 4) + 1).padStart(2, '0')}-01`,
        endDate: `2026-${String((index % 4) + 6).padStart(2, '0')}-28`,
        allocationWeight: 1 + (index % 4) * 0.15,
      };
    }),
    projectAssignments: [],
    timeEntries: [],
    expenses: [],
    directCosts: [],
    indirectCosts: [
      { id: 'ic-1', label: '사무실 임대료', amount: 36000000 },
      { id: 'ic-2', label: '공용 서버 비용', amount: 18000000 },
      { id: 'ic-3', label: '관리부서 급여', amount: 42000000 },
      { id: 'ic-4', label: '공용 SaaS 구독료', amount: 9500000 },
      { id: 'ic-5', label: '플랫폼본부 개발환경 비용', amount: 12000000, divisionId: 'div-2' },
      { id: 'ic-6', label: '데이터본부 분석 인프라', amount: 8400000, divisionId: 'div-3' },
    ],
  };

  dataset.timeEntries = dataset.projects.flatMap((project, projectIndex) =>
    dataset.employees
      .filter((_, employeeIndex) => (projectIndex + employeeIndex) % 3 !== 0)
    .map((employee, employeeIndex) => ({
      id: `te-${projectIndex + 1}-${employeeIndex + 1}`,
      date: `2026-04-${String(((projectIndex + employeeIndex) % 20) + 1).padStart(2, '0')}`,
      employeeId: employee.id,
      projectId: project.id,
      hours: 4 + ((projectIndex * 3 + employeeIndex * 2) % 7),
    })),
  );

  dataset.projectAssignments = dataset.timeEntries.map((entry, index) => {
    const project = dataset.projects.find((item) => item.id === entry.projectId)!;
    return {
      id: `pa-${index + 1}`,
      employeeId: entry.employeeId,
      projectId: entry.projectId,
      startDate: project.startDate ?? '2026-01-01',
      endDate: project.endDate ?? '2026-06-30',
    };
  });

  dataset.directCosts = dataset.projects.flatMap((project, index) => [
    {
      id: `dc-${index + 1}-license`,
      projectId: project.id,
      label: '소프트웨어 라이선스',
      amount: 3500000 + (index % 5) * 900000,
    },
    {
      id: `dc-${index + 1}-outsourcing`,
      projectId: project.id,
      label: '외주비',
      amount: 5200000 + (index % 7) * 1200000,
    },
  ]);

  dataset.expenses = [
    ...dataset.directCosts.map((cost, index) => ({
      id: `exp-d-${index + 1}`,
      expenseDate: `2026-04-${String((index % 20) + 1).padStart(2, '0')}`,
      projectId: cost.projectId,
      expenseType: cost.label.includes('외주') ? '외주비' as const : '직접경비' as const,
      amount: cost.amount,
      description: cost.label,
    })),
    ...dataset.indirectCosts.map((cost, index) => ({
      id: `exp-i-${index + 1}`,
      expenseDate: `2026-04-${String((index % 20) + 1).padStart(2, '0')}`,
      projectId: undefined,
      expenseType: '판관비' as const,
      amount: cost.amount,
      description: cost.label,
    })),
  ];

  return dataset;
}

export const seedData = createSeedDataset();

function employee(
  id: string,
  employeeNo: string,
  name: string,
  birthDate: string,
  divisionId: string,
  hourlyRate: number,
) {
  return {
    id,
    employeeNo,
    name,
    birthDate,
    divisionId,
    hourlyRate,
    baseSalary: hourlyRate * 160,
    overtimeAllowance: Math.round(hourlyRate * 12),
    mealAllowance: 200000,
  };
}
