/**
 * testHelpers.ts
 *
 * Common test utilities and helper functions.
 * Provides reusable test setup and teardown logic.
 */

import { vi } from "vitest";

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
    activeRikishiIds: new Set(),
    oyakata: new Map(),
    staff: new Map(),
    sponsors: new Map(),
    events: [],
    history: [],
    playerHeyaId: "player-heya-1",
    cyclePhase: "interim",
    currentBasho: null,
    rng: {
      next: () => 0.5,
      seed: "test-seed",
      int: () => 0,
    },
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
    archetype: "oshi",
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

/**
 * Mock the Electron API on the global window object for tests.
 * Sets window.__ELECTRON__ = true and stubs all electronCustom methods.
 * @param opts - Optional overrides for mock return values
 * @returns Mocked API objects for assertions
 */
export function mockElectronAPI(opts?: {
  appPath?: string;
  storageKeys?: Record<string, unknown>;
}) {
  const fsMock = {
    writeFile: vi.fn().mockResolvedValue(true),
    readFile: vi.fn().mockResolvedValue(null),
    exists: vi.fn().mockResolvedValue(false),
    mkdir: vi.fn().mockResolvedValue(true),
    readDir: vi.fn().mockResolvedValue([]),
    deleteFile: vi.fn().mockResolvedValue(true),
  };

  const appPathMock = {
    getPath: vi.fn().mockResolvedValue(opts?.appPath ?? "/fake/userData"),
  };

  const storageMock = {
    get: vi.fn().mockReturnValue(null),
    set: vi.fn().mockReturnValue(undefined),
    delete: vi.fn().mockReturnValue(undefined),
    clear: vi.fn().mockReturnValue(undefined),
    keys: vi.fn().mockResolvedValue(opts?.storageKeys ?? {}),
    size: vi.fn().mockReturnValue(0),
  };

  const windowMock = {
    minimize: vi.fn().mockReturnValue(undefined),
    maximize: vi.fn().mockReturnValue(undefined),
    isMaximized: vi.fn().mockResolvedValue(false),
    close: vi.fn().mockReturnValue(undefined),
    hide: vi.fn().mockReturnValue(undefined),
    show: vi.fn().mockReturnValue(undefined),
  };

  const dialogMock = {
    showSaveDialog: vi.fn().mockResolvedValue({ canceled: false, filePath: "" }),
    showOpenDialog: vi.fn().mockResolvedValue({ canceled: false, filePaths: [] }),
  };

  const appMock = {
    getVersion: vi.fn().mockReturnValue("1.0.0"),
    getPlatform: vi.fn().mockReturnValue("darwin"),
  };

  const notificationMock = {
    show: vi.fn().mockResolvedValue(undefined),
  };

  const electronCustom = {
    fs: fsMock,
    appPath: appPathMock,
    storage: storageMock,
    window: windowMock,
    dialog: dialogMock,
    app: appMock,
    notification: notificationMock,
    onMenuEvent: vi.fn().mockReturnValue(vi.fn()),
  };

  Object.defineProperty(global, "window", {
    value: {
      __ELECTRON__: true,
      electronCustom,
    },
    writable: true,
    configurable: true,
  });

  return {
    fs: fsMock,
    appPath: appPathMock,
    storage: storageMock,
    window: windowMock,
    dialog: dialogMock,
    app: appMock,
    notification: notificationMock,
    electronCustom,
  };
}

/**
 * Clear the Electron mock from the global window object.
 * Call this in afterEach to prevent test pollution.
 */
export function clearElectronMock() {
  Object.defineProperty(global, "window", {
    value: undefined,
    writable: true,
    configurable: true,
  });
}
