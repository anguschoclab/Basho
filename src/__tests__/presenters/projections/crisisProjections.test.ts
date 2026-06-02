/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from "vitest";
import {
  projectCrisisData,
  hasPendingCrisis,
  getPendingCrisis,
  getActiveCrisis,
} from "../../../presenters/projections/crisisProjections";
import { createMockWorldState, createMockHeya } from "../../utils/testHelpers";

const mockCrisis: any = {
  id: "crisis-1",
  type: "welfare_violation",
  title: "Injury Cover-Up",
  description: "A rikishi injury was concealed from the JSA.",
  severity: "high",
  generatedAtWeek: 5,
  options: [],
};

describe("projectCrisisData", () => {
  it("returns safe defaults when playerHeyaId is absent", () => {
    const world = createMockWorldState({ playerHeyaId: undefined });
    const result = projectCrisisData(world as any);
    expect(result).toEqual({
      isActive: false,
      pendingCrisis: null,
      activeCrisis: null,
      hasUnacknowledgedCrisis: false,
      crisisCount: 0,
    });
  });

  it("returns safe defaults when playerHeya is not in map", () => {
    const world = createMockWorldState({ playerHeyaId: "missing-heya" });
    const result = projectCrisisData(world as any);
    expect(result).toEqual({
      isActive: false,
      pendingCrisis: null,
      activeCrisis: null,
      hasUnacknowledgedCrisis: false,
      crisisCount: 0,
    });
  });

  it("reflects activeCrisis when heya has one and no pendingCrisis", () => {
    const heya = createMockHeya({ id: "h1", activeCrisis: mockCrisis });
    const world = createMockWorldState({
      playerHeyaId: "h1",
      heyas: new Map([["h1", heya]]),
      pendingCrisis: undefined,
    });
    const result = projectCrisisData(world as any);
    expect(result.isActive).toBe(true);
    expect(result.activeCrisis).toBe(mockCrisis);
    expect(result.pendingCrisis).toBeNull();
    expect(result.hasUnacknowledgedCrisis).toBe(false);
    expect(result.crisisCount).toBe(1);
  });

  it("reflects pendingCrisis when world has one and heya has no activeCrisis", () => {
    const heya = createMockHeya({ id: "h1" });
    const world = createMockWorldState({
      playerHeyaId: "h1",
      heyas: new Map([["h1", heya]]),
      pendingCrisis: mockCrisis,
    });
    const result = projectCrisisData(world as any);
    expect(result.isActive).toBe(true);
    expect(result.pendingCrisis).toBe(mockCrisis);
    expect(result.activeCrisis).toBeNull();
    expect(result.hasUnacknowledgedCrisis).toBe(true);
    expect(result.crisisCount).toBe(0);
  });

  it("handles both activeCrisis and pendingCrisis simultaneously", () => {
    const pendingCrisis: any = { ...mockCrisis, id: "pending-1" };
    const heya = createMockHeya({ id: "h1", activeCrisis: mockCrisis });
    const world = createMockWorldState({
      playerHeyaId: "h1",
      heyas: new Map([["h1", heya]]),
      pendingCrisis,
    });
    const result = projectCrisisData(world as any);
    expect(result.isActive).toBe(true);
    expect(result.crisisCount).toBe(1);
    expect(result.hasUnacknowledgedCrisis).toBe(true);
    expect(result.activeCrisis).toBe(mockCrisis);
    expect(result.pendingCrisis).toBe(pendingCrisis);
  });

  it("treats undefined pendingCrisis as null", () => {
    const heya = createMockHeya({ id: "h1" });
    const world = createMockWorldState({
      playerHeyaId: "h1",
      heyas: new Map([["h1", heya]]),
      pendingCrisis: undefined,
    });
    const result = projectCrisisData(world as any);
    expect(result.pendingCrisis).toBeNull();
    expect(result.hasUnacknowledgedCrisis).toBe(false);
  });
});

describe("hasPendingCrisis", () => {
  it("returns false when pendingCrisis is undefined", () => {
    const world = createMockWorldState({ pendingCrisis: undefined });
    expect(hasPendingCrisis(world as any)).toBe(false);
  });

  it("returns false when pendingCrisis is null", () => {
    const world = createMockWorldState({ pendingCrisis: null });
    expect(hasPendingCrisis(world as any)).toBe(false);
  });

  it("returns true when pendingCrisis is populated", () => {
    const world = createMockWorldState({ pendingCrisis: mockCrisis });
    expect(hasPendingCrisis(world as any)).toBe(true);
  });
});

describe("getPendingCrisis", () => {
  it("returns null when pendingCrisis is undefined", () => {
    const world = createMockWorldState({ pendingCrisis: undefined });
    expect(getPendingCrisis(world as any)).toBeNull();
  });

  it("returns the crisis object when populated", () => {
    const world = createMockWorldState({ pendingCrisis: mockCrisis });
    expect(getPendingCrisis(world as any)).toBe(mockCrisis);
  });
});

describe("getActiveCrisis", () => {
  it("returns null when playerHeyaId is absent", () => {
    const world = createMockWorldState({ playerHeyaId: undefined });
    expect(getActiveCrisis(world as any)).toBeNull();
  });

  it("returns null when player heya is not found", () => {
    const world = createMockWorldState({ playerHeyaId: "ghost-heya" });
    expect(getActiveCrisis(world as any)).toBeNull();
  });

  it("returns null when heya has no activeCrisis", () => {
    const heya = createMockHeya({ id: "h1" });
    const world = createMockWorldState({
      playerHeyaId: "h1",
      heyas: new Map([["h1", heya]]),
    });
    expect(getActiveCrisis(world as any)).toBeNull();
  });

  it("returns the crisis object when heya has an activeCrisis", () => {
    const heya = createMockHeya({ id: "h1", activeCrisis: mockCrisis });
    const world = createMockWorldState({
      playerHeyaId: "h1",
      heyas: new Map([["h1", heya]]),
    });
    expect(getActiveCrisis(world as any)).toBe(mockCrisis);
  });
});
