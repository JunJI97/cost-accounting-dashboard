export type Division = {
  id: string;
  name: string;
};

export type Employee = {
  id: string;
  employeeNo?: string;
  name: string;
  birthDate?: string;
  divisionId: string;
  hourlyRate: number;
  baseSalary?: number;
  overtimeAllowance?: number;
  mealAllowance?: number;
};

export type Project = {
  id: string;
  projectCode?: string;
  name: string;
  divisionId: string;
  revenue: number;
  startDate?: string;
  endDate?: string;
  allocationWeight?: number;
};

export type TimeEntry = {
  id?: string;
  date?: string;
  employeeId: string;
  projectId: string;
  hours: number;
};

export type ProjectAssignment = {
  id: string;
  employeeId: string;
  projectId: string;
  startDate: string;
  endDate: string;
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

export type ExpenseType = '직접경비' | '외주비' | '판관비';

export type ExpenseLedger = {
  id: string;
  expenseDate: string;
  projectId?: string;
  expenseType: ExpenseType;
  amount: number;
  description: string;
};

export type AllocationBasis = 'laborHours' | 'laborCost' | 'revenue';

export type CostDataset = {
  divisions: Division[];
  employees: Employee[];
  projects: Project[];
  projectAssignments: ProjectAssignment[];
  timeEntries: TimeEntry[];
  expenses: ExpenseLedger[];
  directCosts: DirectCost[];
  indirectCosts: IndirectCost[];
};

export type ProjectProfitability = {
  projectId: string;
  projectName: string;
  divisionName: string;
  revenue: number;
  laborHours: number;
  manMonths: number;
  internalLaborCost: number;
  laborCost: number;
  outsourcingCost: number;
  directExpenseCost: number;
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
