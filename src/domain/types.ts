export type Division = {
  id: string;
  name: string;
};

export type Employee = {
  id: string;
  name: string;
  divisionId: string;
  hourlyRate: number;
};

export type Project = {
  id: string;
  name: string;
  divisionId: string;
  revenue: number;
  allocationWeight?: number;
};

export type TimeEntry = {
  employeeId: string;
  projectId: string;
  hours: number;
};

export type DirectCost = {
  id: string;
  projectId: string;
  label: string;
  amount: number;
};

export type IndirectCost = {
  id: string;
  label: string;
  amount: number;
  divisionId?: string;
};

export type AllocationBasis = 'laborHours' | 'laborCost' | 'revenue';

export type CostDataset = {
  divisions: Division[];
  employees: Employee[];
  projects: Project[];
  timeEntries: TimeEntry[];
  directCosts: DirectCost[];
  indirectCosts: IndirectCost[];
};

export type ProjectProfitability = {
  projectId: string;
  projectName: string;
  divisionName: string;
  revenue: number;
  laborHours: number;
  laborCost: number;
  directCost: number;
  allocatedIndirectCost: number;
  totalCost: number;
  netProfit: number;
  margin: number;
  primaryDriver: string;
};

export type SimulationInput = {
  projectId: string;
  additionalPeople: number;
  hoursPerPerson: number;
  hourlyRate: number;
  revenueDelta: number;
  indirectCostDelta: number;
};

export type SavedScenario = {
  id: string;
  name: string;
  input: SimulationInput;
  createdAt: string;
};
