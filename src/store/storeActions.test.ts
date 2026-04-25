import { beforeEach, describe, expect, it } from 'vitest';
import { useCostingStore } from './useCostingStore';

describe('costing store data actions', () => {
  beforeEach(() => {
    useCostingStore.getState().resetDataset();
  });

  it('adds and deletes a project with related rows', () => {
    const before = useCostingStore.getState().dataset.projects.length;

    useCostingStore.getState().addProject();
    const added = useCostingStore.getState().dataset.projects.at(-1)!;
    expect(useCostingStore.getState().dataset.projects).toHaveLength(before + 1);

    useCostingStore.getState().deleteProject(added.id);
    expect(useCostingStore.getState().dataset.projects).toHaveLength(before);
  });

  it('adds a new non-duplicate time entry', () => {
    const before = useCostingStore.getState().dataset.timeEntries.length;

    useCostingStore.getState().addTimeEntry();

    expect(useCostingStore.getState().dataset.timeEntries.length).toBeGreaterThan(before);
  });

  it('saves and applies a simulation scenario', () => {
    useCostingStore.getState().setSimulation({ revenueDelta: 3000000 });
    useCostingStore.getState().saveScenario();
    const scenario = useCostingStore.getState().savedScenarios[0];

    useCostingStore.getState().setSimulation({ revenueDelta: 0 });
    useCostingStore.getState().applyScenario(scenario.id);

    expect(useCostingStore.getState().simulation.revenueDelta).toBe(3000000);
  });
});
