import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { createSeedDataset, seedProjectNames } from '../data/seed';
import type { AllocationBasis, CostDataset, SavedScenario, SimulationInput } from '../domain/types';

type CostingState = {
  dataset: CostDataset;
  allocationBasis: AllocationBasis;
  simulation: SimulationInput;
  savedScenarios: SavedScenario[];
  setDataset: (dataset: CostDataset) => void;
  updateDatasetPart: <Key extends keyof CostDataset>(key: Key, value: CostDataset[Key]) => void;
  resetDataset: () => void;
  setAllocationBasis: (basis: AllocationBasis) => void;
  setSimulation: (patch: Partial<SimulationInput>) => void;
  saveScenario: () => void;
  applyScenario: (scenarioId: string) => void;
  deleteScenario: (scenarioId: string) => void;
  updateProjectRevenue: (projectId: string, revenue: number) => void;
  updateProjectAllocationWeight: (projectId: string, allocationWeight: number) => void;
  addProject: () => void;
  deleteProject: (projectId: string) => void;
  updateEmployeeRate: (employeeId: string, hourlyRate: number) => void;
  addEmployee: () => void;
  deleteEmployee: (employeeId: string) => void;
  updateTimeEntryHours: (employeeId: string, projectId: string, hours: number) => void;
  addTimeEntry: () => void;
  deleteTimeEntry: (employeeId: string, projectId: string) => void;
  updateDirectCost: (costId: string, amount: number) => void;
  addDirectCost: () => void;
  deleteDirectCost: (costId: string) => void;
  updateIndirectCost: (costId: string, amount: number) => void;
  updateIndirectCostDivision: (costId: string, divisionId: string | undefined) => void;
  addIndirectCost: () => void;
  deleteIndirectCost: (costId: string) => void;
};

const defaultSimulation: SimulationInput = {
  projectId: 'prj-1',
  additionalPeople: 2,
  hoursPerPerson: 120,
  hourlyRate: 54000,
  revenueDelta: 0,
  indirectCostDelta: 0,
};

const storage = createJSONStorage<CostingState>(() =>
  typeof window === 'undefined'
    ? {
        getItem: () => null,
        setItem: () => undefined,
        removeItem: () => undefined,
      }
    : window.localStorage,
);

export const useCostingStore = create<CostingState>()(
  persist(
    (set) => ({
      dataset: createSeedDataset(),
      allocationBasis: 'laborHours',
      simulation: defaultSimulation,
      savedScenarios: [],
      setDataset: (dataset) => set({ dataset }),
      updateDatasetPart: (key, value) =>
        set((state) => ({
          dataset: {
            ...state.dataset,
            [key]: value,
          },
        })),
      resetDataset: () => set({ dataset: createSeedDataset() }),
      setAllocationBasis: (allocationBasis) => set({ allocationBasis }),
      setSimulation: (patch) =>
        set((state) => ({ simulation: { ...state.simulation, ...patch } })),
      saveScenario: () =>
        set((state) => ({
          savedScenarios: [
            {
              id: `scenario-${Date.now()}`,
              name: `시나리오 ${state.savedScenarios.length + 1}`,
              input: state.simulation,
              createdAt: new Date().toISOString(),
            },
            ...state.savedScenarios,
          ],
        })),
      applyScenario: (scenarioId) =>
        set((state) => {
          const scenario = state.savedScenarios.find((item) => item.id === scenarioId);
          return scenario ? { simulation: scenario.input } : state;
        }),
      deleteScenario: (scenarioId) =>
        set((state) => ({
          savedScenarios: state.savedScenarios.filter((scenario) => scenario.id !== scenarioId),
        })),
      updateProjectRevenue: (projectId, revenue) =>
        set((state) => ({
          dataset: {
            ...state.dataset,
            projects: state.dataset.projects.map((project) =>
              project.id === projectId ? { ...project, revenue } : project,
            ),
          },
        })),
      updateProjectAllocationWeight: (projectId, allocationWeight) =>
        set((state) => ({
          dataset: {
            ...state.dataset,
            projects: state.dataset.projects.map((project) =>
              project.id === projectId ? { ...project, allocationWeight } : project,
            ),
          },
        })),
      addProject: () =>
        set((state) => {
          const id = nextId('prj', state.dataset.projects.map((project) => project.id));
          const divisionId = state.dataset.divisions[0]?.id ?? 'div-1';
          return {
            dataset: {
              ...state.dataset,
              projects: [
                ...state.dataset.projects,
                {
                  id,
                  name: `신규 프로젝트 ${state.dataset.projects.length + 1}`,
                  divisionId,
                  revenue: 50000000,
                  allocationWeight: 1,
                },
              ],
            },
          };
        }),
      deleteProject: (projectId) =>
        set((state) => ({
          dataset: {
            ...state.dataset,
            projects: state.dataset.projects.filter((project) => project.id !== projectId),
            timeEntries: state.dataset.timeEntries.filter((entry) => entry.projectId !== projectId),
            directCosts: state.dataset.directCosts.filter((cost) => cost.projectId !== projectId),
          },
        })),
      updateEmployeeRate: (employeeId, hourlyRate) =>
        set((state) => ({
          dataset: {
            ...state.dataset,
            employees: state.dataset.employees.map((employee) =>
              employee.id === employeeId ? { ...employee, hourlyRate } : employee,
            ),
          },
        })),
      addEmployee: () =>
        set((state) => {
          const id = nextId('emp', state.dataset.employees.map((employee) => employee.id));
          const divisionId = state.dataset.divisions[0]?.id ?? 'div-1';
          return {
            dataset: {
              ...state.dataset,
              employees: [
                ...state.dataset.employees,
                {
                  id,
                  name: `신규 직원 ${state.dataset.employees.length + 1}`,
                  divisionId,
                  hourlyRate: 50000,
                },
              ],
            },
          };
        }),
      deleteEmployee: (employeeId) =>
        set((state) => ({
          dataset: {
            ...state.dataset,
            employees: state.dataset.employees.filter((employee) => employee.id !== employeeId),
            timeEntries: state.dataset.timeEntries.filter((entry) => entry.employeeId !== employeeId),
          },
        })),
      updateTimeEntryHours: (employeeId, projectId, hours) =>
        set((state) => ({
          dataset: {
            ...state.dataset,
            timeEntries: state.dataset.timeEntries.map((entry) =>
              entry.employeeId === employeeId && entry.projectId === projectId
                ? { ...entry, hours }
                : entry,
            ),
          },
        })),
      addTimeEntry: () =>
        set((state) => {
          const pair = state.dataset.employees
            .flatMap((employee) =>
              state.dataset.projects.map((project) => ({
                employeeId: employee.id,
                projectId: project.id,
              })),
            )
            .find(
              (candidate) =>
                !state.dataset.timeEntries.some(
                  (entry) =>
                    entry.employeeId === candidate.employeeId &&
                    entry.projectId === candidate.projectId,
                ),
            );
          if (!pair) return state;

          return {
            dataset: {
              ...state.dataset,
              timeEntries: [{ ...pair, hours: 40 }, ...state.dataset.timeEntries],
            },
          };
        }),
      deleteTimeEntry: (employeeId, projectId) =>
        set((state) => ({
          dataset: {
            ...state.dataset,
            timeEntries: state.dataset.timeEntries.filter(
              (entry) => !(entry.employeeId === employeeId && entry.projectId === projectId),
            ),
          },
        })),
      updateDirectCost: (costId, amount) =>
        set((state) => ({
          dataset: {
            ...state.dataset,
            directCosts: state.dataset.directCosts.map((cost) =>
              cost.id === costId ? { ...cost, amount } : cost,
            ),
          },
        })),
      addDirectCost: () =>
        set((state) => {
          const id = nextId('dc-custom', state.dataset.directCosts.map((cost) => cost.id));
          const projectId = state.dataset.projects[0]?.id;
          if (!projectId) return state;
          return {
            dataset: {
              ...state.dataset,
              directCosts: [
                { id, projectId, label: '신규 직접비', amount: 1000000 },
                ...state.dataset.directCosts,
              ],
            },
          };
        }),
      deleteDirectCost: (costId) =>
        set((state) => ({
          dataset: {
            ...state.dataset,
            directCosts: state.dataset.directCosts.filter((cost) => cost.id !== costId),
          },
        })),
      updateIndirectCost: (costId, amount) =>
        set((state) => ({
          dataset: {
            ...state.dataset,
            indirectCosts: state.dataset.indirectCosts.map((cost) =>
              cost.id === costId ? { ...cost, amount } : cost,
            ),
          },
        })),
      updateIndirectCostDivision: (costId, divisionId) =>
        set((state) => ({
          dataset: {
            ...state.dataset,
            indirectCosts: state.dataset.indirectCosts.map((cost) =>
              cost.id === costId ? { ...cost, divisionId } : cost,
            ),
          },
        })),
      addIndirectCost: () =>
        set((state) => {
          const id = nextId('ic-custom', state.dataset.indirectCosts.map((cost) => cost.id));
          return {
            dataset: {
              ...state.dataset,
              indirectCosts: [
                ...state.dataset.indirectCosts,
                { id, label: '신규 공통비', amount: 1000000 },
              ],
            },
          };
        }),
      deleteIndirectCost: (costId) =>
        set((state) => ({
          dataset: {
            ...state.dataset,
            indirectCosts: state.dataset.indirectCosts.filter((cost) => cost.id !== costId),
          },
        })),
    }),
    {
      name: 'noa-costing-settings',
      storage,
      merge: (persisted, current) => {
        const saved = persisted as Partial<CostingState> | undefined;

        return {
          ...current,
          ...saved,
          dataset: migrateDataset(saved?.dataset ?? current.dataset),
          savedScenarios: saved?.savedScenarios ?? current.savedScenarios,
          simulation: {
            ...defaultSimulation,
            ...saved?.simulation,
          },
        };
      },
    },
  ),
);

function migrateDataset(dataset: CostDataset) {
  return {
    ...dataset,
    projects: dataset.projects.map((project) => {
      const match = project.id.match(/^prj-(\d+)$/);
      const seedIndex = match ? Number(match[1]) - 1 : -1;
      const isOldSeedName = /^P-\d{2} 관리회계 고도화$/.test(project.name);

      return isOldSeedName && seedProjectNames[seedIndex]
        ? { ...project, name: seedProjectNames[seedIndex] }
        : project;
    }),
  };
}

function nextId(prefix: string, ids: string[]) {
  const nextNumber =
    Math.max(
      0,
      ...ids.map((id) => {
        const match = id.match(/(\d+)$/);
        return match ? Number(match[1]) : 0;
      }),
    ) + 1;
  return `${prefix}-${nextNumber}`;
}
