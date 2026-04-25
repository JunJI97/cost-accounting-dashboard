# CostPilot 개발 문서

## 1. 개발 환경

CostPilot은 Vite 기반 React 단일 페이지 애플리케이션으로 구현되었다. TypeScript를 사용하여 원가 계산 로직과 데이터 구조의 타입 안정성을 확보했고, Zustand를 통해 전역 상태와 localStorage 영속화를 처리한다.

| 항목 | 사용 기술 |
| --- | --- |
| 프레임워크 | Vite, React 19 |
| 언어 | TypeScript |
| 스타일 | Tailwind CSS |
| 상태 관리 | Zustand, zustand/middleware persist |
| 테이블 | TanStack Table |
| 차트 | Recharts |
| 엑셀/CSV | read-excel-file, write-excel-file, Papa Parse |
| PDF | html2canvas, jsPDF |
| 테스트 | Vitest |
| 배포 | Vercel 정적 배포 |

## 2. 실행 방법

```bash
npm install
npm run dev
```

기본 개발 서버 주소는 다음과 같다.

```text
http://127.0.0.1:5173
```

검증 명령은 다음과 같다.

```bash
npm run test
npm run build
```

## 3. 프로젝트 구조

```text
src/
  App.tsx
  main.tsx
  index.css
  data/
    seed.ts
  domain/
    costing.ts
    csvExchange.ts
    format.ts
    types.ts
    userImport.ts
  features/
    AllocationComparison.tsx
    CsvExchangePanel.tsx
    DataEditor.tsx
    ReportSummary.tsx
  store/
    useCostingStore.ts
```

| 경로 | 역할 |
| --- | --- |
| `src/App.tsx` | 전체 탭 구조, 대시보드, 시뮬레이션 UI 구성 |
| `src/data/seed.ts` | 샘플 본부, 인력, 프로젝트, 비용 데이터 생성 |
| `src/domain/types.ts` | 핵심 데이터 타입 정의 |
| `src/domain/costing.ts` | 원가 집계, 공통비 배부, 시뮬레이션 계산 |
| `src/domain/userImport.ts` | 통합 엑셀 템플릿 생성 및 업로드 검증 |
| `src/domain/csvExchange.ts` | CSV/JSON 데이터 교환 유틸리티 |
| `src/features/DataEditor.tsx` | 데이터 관리 화면 |
| `src/features/AllocationComparison.tsx` | 배부 기준 비교 화면 |
| `src/features/CsvExchangePanel.tsx` | 엑셀 가져오기/내보내기 UI |
| `src/features/ReportSummary.tsx` | 경영 인사이트 리포트, PDF/엑셀 저장 |
| `src/store/useCostingStore.ts` | 앱 상태, 데이터 수정 액션, localStorage 저장 |

## 4. 데이터 모델

주요 타입은 `src/domain/types.ts`에 정의되어 있다.

- `Division`: 본부 정보
- `Employee`: 직원 정보와 시간당 표준원가
- `Project`: 프로젝트 정보, 매출, 기간, 배부 가중치
- `ProjectAssignment`: 직원별 프로젝트 투입 기간
- `TimeEntry`: 일자별 프로젝트 근무 시간
- `ExpenseLedger`: 비용 원장
- `IndirectCost`: 별도 공통비 데이터
- `CostDataset`: 앱에서 사용하는 전체 데이터셋
- `ProjectProfitability`: 계산 완료된 프로젝트별 손익 행
- `SimulationInput`: What-if 시뮬레이션 입력값
- `SavedScenario`: 저장된 시나리오

## 5. 상태 관리

`src/store/useCostingStore.ts`는 Zustand store를 생성한다. 상태는 다음 네 가지 축으로 구성된다.

- `dataset`: 본부, 직원, 프로젝트, 근무 기록, 비용 원장 등 전체 데이터
- `allocationBasis`: 현재 공통비 배부 기준
- `simulation`: 시뮬레이션 입력값
- `savedScenarios`: 사용자가 저장한 시뮬레이션 목록

`persist` 미들웨어를 사용해 상태를 `localStorage`의 `noa-costing-settings` 키에 저장한다. 따라서 브라우저 새로고침 후에도 사용자가 수정한 데이터와 시나리오가 유지된다. `resetDataset` 액션은 샘플 데이터, 배부 기준, 시뮬레이션, 저장 시나리오를 모두 기본값으로 되돌린다.

## 6. 원가 계산 로직

핵심 계산은 `src/domain/costing.ts`의 `calculateProjectProfitability` 함수에서 수행된다.

1. 프로젝트별 근무 기록을 모아 총 투입 시간을 계산한다.
2. 직원별 시간당 표준원가와 투입 시간을 곱해 내부 인건비를 계산한다.
3. 비용 원장에서 프로젝트에 연결된 직접경비와 외주비를 집계한다.
4. 프로젝트코드가 없는 판관비 또는 공통비를 공통비 풀로 분류한다.
5. 선택된 배부 기준에 따라 공통비를 프로젝트별로 배부한다.
6. 총원가, 순이익, 이익률, M/M, 주요 원가 동인을 계산하여 반환한다.

공통비 배부 기준은 `AllocationBasis` 타입으로 관리된다.

```ts
type AllocationBasis = 'laborHours' | 'laborCost' | 'revenue';
```

배부 기준별 의미는 다음과 같다.

| 기준 | 배부 방식 |
| --- | --- |
| `laborHours` | 프로젝트별 총 투입 시간 비중 |
| `laborCost` | 프로젝트별 내부 인건비 비중 |
| `revenue` | 프로젝트별 매출 비중 |

프로젝트에 `allocationWeight`가 있으면 배부 기준 값에 가중치를 곱해 공통비 부담을 조정한다.

## 7. 시뮬레이션 로직

`simulateAdditionalStaff` 함수는 원본 데이터셋을 직접 변경하지 않고, 시뮬레이션용 데이터셋을 새로 만들어 계산한다. 주요 처리 내용은 다음과 같다.

- 대상 프로젝트 매출에 `revenueDelta` 반영
- 가상의 시뮬레이션 인력을 직원 목록에 추가
- 추가 인력 수와 인당 투입 시간을 곱해 대상 프로젝트의 근무 기록 추가
- 공통비 증감값이 있으면 비용 원장 또는 공통비 목록에 반영
- 변경된 데이터셋을 다시 `calculateProjectProfitability`에 전달하여 결과 산출

이 구조를 통해 현재 데이터와 시뮬레이션 결과를 동시에 비교할 수 있다.

## 8. 엑셀 가져오기 검증

`src/domain/userImport.ts`는 통합 엑셀 템플릿 생성과 업로드 검증을 담당한다. 템플릿 시트는 다음과 같다.

- 작성 안내
- 인력 마스터
- 프로젝트 마스터
- 프로젝트 투입
- 일일 근무 기록
- 비용 원장

검증 규칙은 오류와 경고로 구분된다.

| 구분 | 예시 | 처리 방식 |
| --- | --- | --- |
| 오류 | 필수값 누락, 참조할 수 없는 사번/프로젝트코드, 숫자 변환 실패, 중복 사번 | 데이터 반영 차단 |
| 경고 | 일 근무시간 12시간 초과, 프로젝트 기간 밖 근무 기록, 판관비에 프로젝트코드 입력 | 확인 후 반영 가능 |

오류가 없으면 업로드 파일을 기준으로 `CostDataset`을 새로 구성하고, `setDataset` 액션을 통해 전체 데이터를 교체한다.

## 9. 화면별 구현 설명

### 9.1 App.tsx

상단 탭으로 대시보드, 데이터 관리, 배부 엔진, 시뮬레이션, 리포트를 전환한다. `useMemo`를 사용하여 데이터셋 또는 배부 기준이 바뀔 때만 수익성 계산을 다시 수행한다.

### 9.2 DataEditor.tsx

엑셀 원장처럼 데이터를 분리해서 볼 수 있도록 인건비, 프로젝트, Daily Report, 직접비/공통비, 엑셀 연동 탭을 제공한다. 각 행은 인라인 입력으로 수정 가능하며, 정렬 기능도 포함한다.

### 9.3 AllocationComparison.tsx

세 가지 배부 기준을 모두 계산하여 총 배부 공통비, 전체 순이익, 전체 이익률, 기준 대비 변동 프로젝트 수, 최대 손익 변동 프로젝트를 비교한다.

### 9.4 ReportSummary.tsx

계산 결과를 바탕으로 경영 인사이트를 생성한다. 수익성 상위, 개선 후보, 외주 의존도, M/M 효율, 공통비 민감도, 본부별 수익성을 보여주며 PDF와 엑셀로 내보낼 수 있다.

## 10. 테스트 구성

프로젝트에는 Vitest 기반 단위 테스트가 포함되어 있다.

| 테스트 파일 | 검증 대상 |
| --- | --- |
| `src/domain/costing.test.ts` | 원가 계산, 공통비 배부, 시뮬레이션 로직 |
| `src/domain/csvExchange.test.ts` | CSV/JSON 데이터 교환 |
| `src/domain/userImport.test.ts` | 엑셀 업로드 파싱과 검증 |
| `src/store/storeActions.test.ts` | Zustand store 액션 |

테스트 실행 명령은 다음과 같다.

```bash
npm run test
```

## 11. 빌드 및 배포

정적 빌드는 다음 명령으로 수행한다.

```bash
npm run build
```

Vercel 배포 설정은 다음과 같다.

| 항목 | 값 |
| --- | --- |
| Framework Preset | Vite |
| Install Command | `npm install` 또는 `npm ci` |
| Build Command | `npm run build` |
| Output Directory | `dist` |

`vercel.json`에는 SPA 라우팅을 위한 rewrite 설정이 포함되어 있어 새로고침 시에도 앱 화면이 정상적으로 열리도록 한다.

## 12. 구현상의 특징

- 계산 로직을 UI와 분리하여 테스트 가능한 순수 함수 중심으로 작성했다.
- 브라우저 localStorage를 사용하여 별도 서버 없이 과제 제출용 데모를 실행할 수 있다.
- 엑셀 템플릿과 검증 절차를 제공해 실제 현업 데이터 흐름과 유사하게 설계했다.
- PDF와 엑셀 리포트 저장 기능을 제공해 결과 제출과 발표에 활용할 수 있다.
- 배부 기준과 시뮬레이션 입력이 변경될 때 즉시 결과를 재계산하여 인터랙티브한 분석 경험을 제공한다.

## 13. 한계 및 개선 가능성

- 현재 데이터는 브라우저 localStorage에 저장되므로 여러 사용자가 동시에 공유하기 어렵다.
- 업로드는 전체 교체 방식이므로 부분 병합이나 변경 이력 추적 기능은 추후 구현 대상이다.
- 기간별 월간 손익 분석과 예산 대비 실적 비교는 현재 범위에 포함되지 않았다.
- 권한 관리, 로그인, 감사 로그 기능은 백엔드 연동 시 추가할 수 있다.
