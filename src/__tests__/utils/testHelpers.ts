/**
 * testHelpers.ts
 *
 * Common test utilities and helper functions.
 * Provides reusable test setup and teardown logic.
 */

import { vi } from "vitest";
import { SeededRNG } from "../../engine/rng";

/**
 * Create a mock WorldState with minimal required fields.
 * @param overrides - Optional overrides for the mock
 * @returns Mock WorldState
 */
export function createMockWorldState(overrides: Record<string, unknown> = {}) {
  return {
    seed: "test-seed",
    year: 2024,
    week: 1,
    calendar: {
      year: 2024,
      month: 1,
      day: 1,
      currentWeek: 1,
      bashoNumber: 1,
      isBashoMonth: false,
    },
    heyas: new Map(),
    rikishi: new Map(),
    oyakata: new Map(),
    staff: new Map(),
    sponsors: new Map(),
    events: [],
    history: [],
    playerHeyaId: "player-heya-1",
    cyclePhase: "interim",
    currentBasho: null,
    rng: new SeededRNG("test-seed"),
    ...overrides,
  };
}

/**
 * Create a mock Heya with minimal required fields.
 * @param overrides - Optional overrides for the mock
 * @returns Mock Heya
 */
export function createMockHeya(overrides: Record<string, unknown> = {}) {
  return {
    id: "heya-1",
    name: "Test Stable",
    nameJa: "テスト部屋",
    isPlayerOwned: false,
    prestige: 50,
    funds: 10_000_000,
    location: "Tokyo",
    ichimon: "Dewanoumi",
    oyakataId: "oyakata-1",
    rikishiIds: [],
    staffIds: [],
    ...overrides,
  };
}

/**
 * Create a mock Rikishi with minimal required fields.
 * @param overrides - Optional overrides for the mock
 * @returns Mock Rikishi
 */
export function createMockRikishi(overrides: Record<string, unknown> = {}) {
  return {
    id: "rikishi-1",
    shikona: "Test Rikishi",
    realName: "Test Name",
    heyaId: "heya-1",
    nationality: "Japan",
    origin: "Tokyo",
    birthYear: 2000,
    height: 180,
    weight: 120,
    rank: "jonokuchi",
    rankNumber: 1,
    division: "jonokuchi",
    side: "east",
    style: "oshi",
    archetype: "oshi_specialist",
    isRetired: false,
    injured: false,
    condition: 0.5,
    motivation: 0.5,
    fatigue: 0,
    power: 50,
    technique: 50,
    speed: 50,
    balance: 50,
    stamina: 50,
    mental: 50,
    adaptability: 50,
    momentum: 0,
    experience: 0,
    currentBashoWins: 0,
    currentBashoLosses: 0,
    careerWins: 0,
    careerLosses: 0,
    careerRecord: {
      yusho: 0,
      kinboshi: 0,
      ginboshi: 0,
    },
    stats: {
      strength: 50,
      technique: 50,
      speed: 50,
      stamina: 50,
      mental: 50,
      adaptability: 50,
      balance: 50,
    },
    talentSeed: 50,
    ...overrides,
  };
}

/**
 * Create a mock Oyakata with minimal required fields.
 * @param overrides - Optional overrides for the mock
 * @returns Mock Oyakata
 */
export function createMockOyakata(overrides: Record<string, unknown> = {}) {
  return {
    id: "oyakata-1",
    shikona: "Test Oyakata",
    realName: "Test Name",
    heyaId: "heya-1",
    nationality: "Japan",
    birthYear: 1970,
    archetype: "traditionalist",
    traits: {
      ambition: 50,
      tradition: 50,
      risk: 50,
      compassion: 50,
      patience: 50,
    },
    mood: "content",
    ...overrides,
  };
}

/**
 * Mock a function that returns a value.
 * @param returnValue - The value to return
 * @returns Mocked function
 */
export function mockFn<T>(returnValue: T): () => T {
  return vi.fn(() => returnValue);
}

/**
 * Wait for a specified number of milliseconds.
 * @param ms - Milliseconds to wait
 * @returns Promise that resolves after the delay
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a deferred promise.
 * @returns Object with promise, resolve, and reject functions
 */
export function createDeferred<T>() {
  let resolve: (value: T) => void;
  let reject: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return { promise, resolve: resolve!, reject: reject! };
}

/**
 * Assert that a value is not null or undefined.
 * @param value - The value to check
 * @param message - Optional error message
 * @throws Error if value is null or undefined
 */
export function assertNotNull<T>(
  value: T | null | undefined,
  message?: string
): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(message || `Expected value to not be null or undefined, got ${value}`);
  }
}

/**
 * Assert that a value is defined (not undefined).
 * @param value - The value to check
 * @param message - Optional error message
 * @throws Error if value is undefined
 */
export function assertDefined<T>(value: T | undefined, message?: string): asserts value is T {
  if (value === undefined) {
    throw new Error(message || `Expected value to be defined, got undefined`);
  }
}
