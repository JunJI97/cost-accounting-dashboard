# NOA Cost Accounting

원가/관리회계 과제용 원가 집계 및 분석 시스템입니다. 5개 본부와 20개 프로젝트를 기준으로 인건비, 직접비, 공통비를 집계하고 프로젝트별 손익과 원가 동인을 분석합니다.

## 주요 기능

- 프로젝트별 손익 계산: 매출, 인건비, 직접비, 배부 공통비, 총원가, 순이익, 이익률
- 공통비 배부 엔진: 투입 시간, 인건비, 매출 기준 배부
- 본부별 공통비 풀: 전사 공통비와 특정 본부 공통비 분리
- 프로젝트별 배부 가중치
- What-if 시뮬레이션: 인력 추가, 매출 증감, 공통비 증감
- 시나리오 저장/적용/삭제
- 데이터 관리: 프로젝트, 직원, Time-sheet, 직접비, 공통비 추가/삭제/수정
- CSV/JSON import/export
- 리포트 CSV export

## 기술 스택

- Vite
- React
- TypeScript
- Tailwind CSS
- Zustand
- TanStack Table
- Recharts
- Papa Parse
- Vitest

## 로컬 실행

```bash
npm install
npm run dev
```

기본 접속 주소:

```text
http://127.0.0.1:5173
```

포트를 고정해서 실행:

```bash
npm run dev -- --host 127.0.0.1 --port 5173
```

## 검증

```bash
npm run test
npm run build
```

## Vercel 배포

- Framework Preset: `Vite`
- Install Command: `npm install`
- Build Command: `npm run build`
- Output Directory: `dist`

`vercel.json`에는 SPA 라우팅을 위한 rewrite 설정이 포함되어 있습니다.

## 시연 흐름

1. `대시보드`에서 전체 매출, 총원가, 순이익, 이익률을 확인합니다.
2. `데이터 관리`에서 프로젝트 매출, 직원 시급, Time-sheet, 직접비, 공통비를 수정합니다.
3. `배부 엔진`에서 투입 시간/인건비/매출 배부 기준별 결과를 비교합니다.
4. `시뮬레이션`에서 특정 프로젝트에 인력을 추가하거나 매출/공통비 변화를 입력합니다.
5. 현재 시나리오를 저장하고 여러 시나리오의 전체 순이익 영향을 비교합니다.
6. `리포트`에서 프로젝트 손익표와 본부별 수익성을 확인하고 CSV로 내보냅니다.

## 데이터 저장 방식

별도 DB 없이 브라우저 localStorage에 저장합니다. 샘플 데이터로 되돌리고 싶으면 `데이터 관리` 탭의 `샘플 데이터 초기화`를 사용하면 됩니다.
