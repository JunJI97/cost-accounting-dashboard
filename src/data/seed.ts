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
      { id: 'emp-1', name: '김민준', divisionId: 'div-1', hourlyRate: 52000 },
      { id: 'emp-2', name: '이서연', divisionId: 'div-1', hourlyRate: 48000 },
      { id: 'emp-3', name: '박도윤', divisionId: 'div-2', hourlyRate: 61000 },
      { id: 'emp-4', name: '최하윤', divisionId: 'div-2', hourlyRate: 58000 },
      { id: 'emp-5', name: '정지호', divisionId: 'div-2', hourlyRate: 54000 },
      { id: 'emp-6', name: '강서준', divisionId: 'div-3', hourlyRate: 57000 },
      { id: 'emp-7', name: '윤지우', divisionId: 'div-3', hourlyRate: 53000 },
      { id: 'emp-8', name: '조하린', divisionId: 'div-4', hourlyRate: 45000 },
      { id: 'emp-9', name: '한유준', divisionId: 'div-4', hourlyRate: 43000 },
      { id: 'emp-10', name: '오수아', divisionId: 'div-5', hourlyRate: 50000 },
    ],
    projects: Array.from({ length: 20 }, (_, index) => {
      const id = `prj-${index + 1}`;
      const divisionId = `div-${(index % 5) + 1}`;
      return {
        id,
        divisionId,
        name: seedProjectNames[index],
        revenue: 62000000 + index * 4300000 + (index % 4) * 3500000,
        allocationWeight: 1 + (index % 4) * 0.15,
      };
    }),
    timeEntries: [],
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
        employeeId: employee.id,
        projectId: project.id,
        hours: 24 + ((projectIndex * 7 + employeeIndex * 11) % 86),
      })),
  );

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

  return dataset;
}

export const seedData = createSeedDataset();
