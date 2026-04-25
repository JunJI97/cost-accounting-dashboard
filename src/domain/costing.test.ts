import { describe, expect, it } from 'vitest';
import { seedData } from '../data/seed';
import { calculateProjectProfitability, simulateAdditionalStaff, summarize } from './costing';

describe('costing engine', () => {
  it('allocates the full indirect cost pool', () => {
    const rows = calculateProjectProfitability(seedData, 'laborHours');
    const totals = summarize(rows);
    const indirectPool = seedData.indirectCosts.reduce((sum, cost) => sum + cost.amount, 0);

    expect(Math.round(totals.allocatedIndirectCost)).toBe(indirectPool);
  });

  it('keeps total profit equal to revenue minus all cost buckets', () => {
    const rows = calculateProjectProfitability(seedData, 'revenue');
    const totals = summarize(rows);

    expect(Math.round(totals.netProfit)).toBe(
      Math.round(totals.revenue - totals.laborCost - totals.directCost - totals.allocatedIndirectCost),
    );
  });

  it('applies additional staff to the selected project in simulation', () => {
    const baseline = calculateProjectProfitability(seedData, 'laborCost');
    const scenarioDataset = simulateAdditionalStaff(seedData, {
      projectId: 'prj-1',
      additionalPeople: 2,
      hoursPerPerson: 100,
      hourlyRate: 50000,
      revenueDelta: 0,
      indirectCostDelta: 0,
    });
    const scenario = calculateProjectProfitability(scenarioDataset, 'laborCost');
    const before = baseline.find((row) => row.projectId === 'prj-1')!;
    const after = scenario.find((row) => row.projectId === 'prj-1')!;

    expect(after.laborHours - before.laborHours).toBe(200);
    expect(after.laborCost - before.laborCost).toBe(10000000);
  });

  it('allocates division-scoped indirect costs only within that division', () => {
    const dataset = {
      divisions: [
        { id: 'div-a', name: 'A본부' },
        { id: 'div-b', name: 'B본부' },
      ],
      employees: [
        { id: 'emp-a', name: 'A직원', divisionId: 'div-a', hourlyRate: 100 },
        { id: 'emp-b', name: 'B직원', divisionId: 'div-b', hourlyRate: 100 },
      ],
      projects: [
        { id: 'prj-a', name: 'A프로젝트', divisionId: 'div-a', revenue: 1000 },
        { id: 'prj-b', name: 'B프로젝트', divisionId: 'div-b', revenue: 1000 },
      ],
      timeEntries: [
        { employeeId: 'emp-a', projectId: 'prj-a', hours: 10 },
        { employeeId: 'emp-b', projectId: 'prj-b', hours: 10 },
      ],
      directCosts: [],
      indirectCosts: [{ id: 'ic-a', label: 'A본부 공통비', amount: 500, divisionId: 'div-a' }],
    };

    const rows = calculateProjectProfitability(dataset, 'laborHours');

    expect(rows.find((row) => row.projectId === 'prj-a')?.allocatedIndirectCost).toBe(500);
    expect(rows.find((row) => row.projectId === 'prj-b')?.allocatedIndirectCost).toBe(0);
  });

  it('uses project allocation weights in the allocation basis', () => {
    const dataset = {
      divisions: [{ id: 'div-a', name: 'A본부' }],
      employees: [
        { id: 'emp-a', name: 'A직원', divisionId: 'div-a', hourlyRate: 100 },
        { id: 'emp-b', name: 'B직원', divisionId: 'div-a', hourlyRate: 100 },
      ],
      projects: [
        { id: 'prj-a', name: 'A프로젝트', divisionId: 'div-a', revenue: 1000, allocationWeight: 3 },
        { id: 'prj-b', name: 'B프로젝트', divisionId: 'div-a', revenue: 1000, allocationWeight: 1 },
      ],
      timeEntries: [
        { employeeId: 'emp-a', projectId: 'prj-a', hours: 10 },
        { employeeId: 'emp-b', projectId: 'prj-b', hours: 10 },
      ],
      directCosts: [],
      indirectCosts: [{ id: 'ic-a', label: '전사 공통비', amount: 400 }],
    };

    const rows = calculateProjectProfitability(dataset, 'laborHours');

    expect(rows.find((row) => row.projectId === 'prj-a')?.allocatedIndirectCost).toBe(300);
    expect(rows.find((row) => row.projectId === 'prj-b')?.allocatedIndirectCost).toBe(100);
  });
});
