import type {
  AllocationBasis,
  CostDataset,
  ProjectProfitability,
  SimulationInput,
} from './types';

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

export function calculateProjectProfitability(
  dataset: CostDataset,
  allocationBasis: AllocationBasis,
): ProjectProfitability[] {
  const employeeById = new Map(dataset.employees.map((employee) => [employee.id, employee]));
  const divisionById = new Map(dataset.divisions.map((division) => [division.id, division]));

  const baseRows = dataset.projects.map((project) => {
    const entries = dataset.timeEntries.filter((entry) => entry.projectId === project.id);
    const laborHours = sum(entries.map((entry) => entry.hours));
    const laborCost = sum(
      entries.map((entry) => {
        const employee = employeeById.get(entry.employeeId);
        return employee ? employee.hourlyRate * entry.hours : 0;
      }),
    );
    const directCost = sum(
      dataset.directCosts
        .filter((cost) => cost.projectId === project.id)
        .map((cost) => cost.amount),
    );

    return {
      project,
      divisionName: divisionById.get(project.divisionId)?.name ?? '미지정',
      laborHours,
      laborCost,
      directCost,
    };
  });

  const allocatedIndirectCostByProject = new Map<string, number>();

  for (const cost of dataset.indirectCosts) {
    const eligibleRows = cost.divisionId
      ? baseRows.filter((row) => row.project.divisionId === cost.divisionId)
      : baseRows;
    const allocationPool = sum(eligibleRows.map((row) => getWeightedBasis(row, allocationBasis)));

    for (const row of eligibleRows) {
      const basisValue = getWeightedBasis(row, allocationBasis);
      const allocatedCost =
        allocationPool > 0
          ? (basisValue / allocationPool) * cost.amount
          : cost.amount / Math.max(eligibleRows.length, 1);
      allocatedIndirectCostByProject.set(
        row.project.id,
        (allocatedIndirectCostByProject.get(row.project.id) ?? 0) + allocatedCost,
      );
    }
  }

  return baseRows.map((row) => {
    const allocatedIndirectCost = allocatedIndirectCostByProject.get(row.project.id) ?? 0;
    const totalCost = row.laborCost + row.directCost + allocatedIndirectCost;
    const netProfit = row.project.revenue - totalCost;
    const margin = row.project.revenue > 0 ? netProfit / row.project.revenue : 0;

    return {
      projectId: row.project.id,
      projectName: row.project.name,
      divisionName: row.divisionName,
      revenue: row.project.revenue,
      laborHours: row.laborHours,
      laborCost: row.laborCost,
      directCost: row.directCost,
      allocatedIndirectCost,
      totalCost,
      netProfit,
      margin,
      primaryDriver: getPrimaryDriver(row.laborCost, row.directCost, allocatedIndirectCost),
    };
  });
}

function getWeightedBasis(
  row: {
    project: { revenue: number; allocationWeight?: number };
    laborHours: number;
    laborCost: number;
  },
  allocationBasis: AllocationBasis,
) {
  const basisValue =
    allocationBasis === 'laborHours'
      ? row.laborHours
      : allocationBasis === 'laborCost'
        ? row.laborCost
        : row.project.revenue;
  return basisValue * Math.max(row.project.allocationWeight ?? 1, 0);
}

export function simulateAdditionalStaff(
  dataset: CostDataset,
  input: SimulationInput,
): CostDataset {
  const scenarioEmployeeId = 'scenario-staff';
  const targetProject = dataset.projects.find((project) => project.id === input.projectId);

  return {
    ...dataset,
    projects: dataset.projects.map((project) =>
      project.id === input.projectId
        ? { ...project, revenue: Math.max(0, project.revenue + input.revenueDelta) }
        : project,
    ),
    employees: [
      ...dataset.employees,
      {
        id: scenarioEmployeeId,
        name: '시뮬레이션 인력',
        divisionId: targetProject?.divisionId ?? 'div-1',
        hourlyRate: input.hourlyRate,
      },
    ],
    timeEntries: [
      ...dataset.timeEntries,
      {
        employeeId: scenarioEmployeeId,
        projectId: input.projectId,
        hours: input.additionalPeople * input.hoursPerPerson,
      },
    ],
    indirectCosts:
      input.indirectCostDelta === 0
        ? dataset.indirectCosts
        : [
            ...dataset.indirectCosts,
            {
              id: 'scenario-indirect-cost',
              label: '시뮬레이션 공통비 조정',
              amount: input.indirectCostDelta,
            },
          ],
  };
}

export function summarize(rows: ProjectProfitability[]) {
  return {
    revenue: sum(rows.map((row) => row.revenue)),
    laborCost: sum(rows.map((row) => row.laborCost)),
    directCost: sum(rows.map((row) => row.directCost)),
    allocatedIndirectCost: sum(rows.map((row) => row.allocatedIndirectCost)),
    totalCost: sum(rows.map((row) => row.totalCost)),
    netProfit: sum(rows.map((row) => row.netProfit)),
  };
}

function getPrimaryDriver(
  laborCost: number,
  directCost: number,
  allocatedIndirectCost: number,
) {
  const drivers = [
    { label: '인건비', value: laborCost },
    { label: '직접비', value: directCost },
    { label: '공통비 배부', value: allocatedIndirectCost },
  ];
  return drivers.sort((a, b) => b.value - a.value)[0].label;
}
