---
stepsCompleted: []
inputDocuments: []
workflowType: 'prd'
---

# Product Requirements Document - NOA

**Author:** Codex
**Date:** 2026-04-25

## 1. Project Overview

NOA는 5개 본부가 약 20개 프로젝트를 동시에 수행하는 조직을 대상으로, 프로젝트별 원가를 집계하고 공통비를 배부하여 손익과 원가 동인을 분석하는 관리회계 시스템이다.

핵심 목표는 단순 원가 집계가 아니라, 공통비 배부 기준 변경과 인력 투입 변화가 프로젝트별 수익성에 미치는 영향을 빠르게 확인하는 것이다.

## 2. Input Data

### 2.1 Organization

- 본부: 5개
- 프로젝트: 약 20개 동시 수행
- 프로젝트는 특정 본부에 소속되거나, 필요 시 복수 본부 인력이 투입될 수 있다.

### 2.2 Labor Data

- 사원별 급여 또는 시급
- 사원별 본부
- 프로젝트별 투입 시간
- 기간별 Time-sheet

### 2.3 Direct Costs

- 특정 프로젝트에 직접 귀속되는 영수증 또는 비용 항목
- 예: 소프트웨어 라이선스, 외주비, 프로젝트 전용 장비, 출장비

### 2.4 Shared / Indirect Costs

- 특정 프로젝트에 직접 귀속하기 어려운 공통비
- 예: 사무실 임대료, 서버 비용, 관리부서 급여, 공용 SaaS 비용

### 2.5 Revenue

- 프로젝트별 매출
- 매출 비례 배부 시 공통비 배부 기준으로 사용

## 3. Core Logic

### 3.1 Cost Aggregation

- 프로젝트별 인건비 계산: 사원 시급 x 프로젝트 투입 시간
- 프로젝트별 직접비 합산
- 기간별, 본부별, 프로젝트별 원가 집계

### 3.2 Allocation Engine

공통비를 프로젝트에 배부하는 규칙을 제공한다.

- 인건비 기반 배부: 프로젝트별 투입 시간 또는 인건비 비중에 따라 공통비 배부
- 매출 비례 배부: 프로젝트별 매출 비중에 따라 공통비 배부
- 추후 확장: 본부별 공통비 풀, 프로젝트 유형별 가중치, 사용자 정의 배부 기준

### 3.3 What-if Simulation

시뮬레이션 기능은 차별화 포인트로 둔다.

- 특정 프로젝트에 인력을 추가 투입했을 때 총 원가와 순이익 변화 계산
- 배부 기준을 변경했을 때 프로젝트별 손익 변화 비교
- 공통비 증감 또는 특정 비용 항목 추가 시 영향도 계산

## 4. Output

### 4.1 Project P&L

- 매출
- 직접비
- 인건비
- 배부된 공통비
- 총원가
- 순이익
- 이익률

### 4.2 Cost Driver Analysis

- 프로젝트별 원가가 높은 주요 원인 식별
- 예: 인건비 비중 과다, 직접비 급증, 공통비 배부 부담 증가
- 본부별/프로젝트별 비교 분석

## 5. Recommended Tech Stack

빠른 구현을 위해 DB 없이 프론트엔드 중심의 단일 페이지 앱으로 시작한다.

### 5.1 Primary Stack

- Framework: Vite + React + TypeScript
- Styling/UI: Tailwind CSS + shadcn/ui
- State: Zustand with localStorage persistence
- Tables: TanStack Table
- Charts: Recharts
- CSV import/export: Papa Parse
- Test: Vitest
- Data storage: local JSON seed data + browser localStorage

### 5.2 Why This Stack

- DB/API 없이도 샘플 데이터, CSV 업로드, 로컬 저장으로 과제 요구사항 구현 가능
- 원가 배부 엔진을 순수 TypeScript 함수로 분리하면 테스트가 쉽고 설명력이 높음
- 테이블, 차트, 시뮬레이션 폼을 빠르게 만들 수 있음
- 이후 DB가 필요해지면 동일한 계산 엔진을 유지하고 데이터 소스만 교체 가능

### 5.3 Initial App Structure

- `src/data`: 5개 본부, 사원, 프로젝트, 비용, 매출 샘플 데이터
- `src/domain`: 원가 집계, 공통비 배부, 손익 계산, 시뮬레이션 계산 로직
- `src/store`: 앱 상태와 localStorage persistence
- `src/components`: 표, 차트, 필터, 시뮬레이션 입력 UI
- `src/pages` or `src/features`: 대시보드, 프로젝트 손익, 배부 엔진, What-if 분석
- `src/tests`: 배부 엔진과 손익 계산 단위 테스트

## 6. MVP Scope

- 5개 본부와 20개 프로젝트 샘플 데이터 제공
- 프로젝트별 인건비/직접비/공통비/손익 계산
- 인건비 기반 배부와 매출 비례 배부 전환
- 프로젝트별 손익 테이블과 원가 구성 차트
- What-if: 특정 프로젝트에 인력 추가 투입 시 수익성 변화
- CSV 또는 JSON import/export는 선택 기능으로 구현
