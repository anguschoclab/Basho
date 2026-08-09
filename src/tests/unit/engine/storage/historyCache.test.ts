// @vitest-environment node
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import type { ArchiveService } from "@/engine/storage/opfsArchive";
import type { BoutResult, BashoResult } from "@/engine/types/basho";
import type { AlmanacSnapshot } from "@/engine/almanac";
import type { ArchivedYear } from "@/engine/historyCache";
import { logger } from "@/engine/utils/Logger";

// --- Fake archive service factory ---

interface FakeArchiveOptions {
  boutIds?: string[];
  boutResults?: Map<string, BoutResult | null>;
  awards?: BashoResult[];
  banzukeSnapshots?: Map<number, AlmanacSnapshot | null>;
  throwOnBoutId?: string;
  supported?: boolean;
}

function makeFakeArchive(opts: FakeArchiveOptions = {}): ArchiveService & {
  inFlight: number;
  maxInFlight: number;
  retrieveBoutLogCalls: string[];
} {
  const state = {
    inFlight: 0,
    maxInFlight: 0,
    retrieveBoutLogCalls: [] as string[],
  };

  const boutIds = opts.boutIds ?? [];
  const boutResults = opts.boutResults ?? new Map<string, BoutResult | null>();
  const awards = opts.awards ?? [];
  const banzukeSnapshots = opts.banzukeSnapshots ?? new Map<number, AlmanacSnapshot | null>();
  const supported = opts.supported ?? true;

  return {
    isSupported: () => supported,
    archiveBoutLog: vi.fn(async () => {}),
    retrieveBoutLog: vi.fn(async (_season: number, boutId: string) => {
      state.retrieveBoutLogCalls.push(boutId);
      state.inFlight++;
      state.maxInFlight = Math.max(state.maxInFlight, state.inFlight);
      try {
        await Promise.resolve();
        if (opts.throwOnBoutId === boutId) throw new Error(`fake error for ${boutId}`);
        return boutResults.get(boutId) ?? null;
      } finally {
        state.inFlight--;
      }
    }),
    archiveGazette: vi.fn(async () => {}),
    retrieveGazette: vi.fn(async () => null),
    getArchivedBoutIdsForSeason: vi.fn(async () => boutIds),
    archiveAwards: vi.fn(async () => {}),
    retrieveAwards: vi.fn(async () => awards),
    archiveBanzuke: vi.fn(async () => {}),
    retrieveBanzuke: vi.fn(async (_season: number, bashoNumber: number) => {
      return banzukeSnapshots.get(bashoNumber) ?? null;
    }),
    ...state,
  } as unknown as ArchiveService & typeof state;
}

// --- Mock helpers ---

function makeBoutResult(id: string): BoutResult {
  return {
    boutId: id,
    winner: "east",
    winnerRikishiId: "r-1",
    loserRikishiId: "r-2",
    kimarite: "yorikiri",
    kimariteName: "Yorikiri",
    stance: "hidari-yotsu",
    tachiaiWinner: "east",
    duration: 10,
    upset: false,
    kenshoEnvelopes: 0,
    momentumScore: 0,
    inBoutInjury: null,
    isTimeout: false,
    log: [],
  };
}

function makeBashoResult(id: string): BashoResult {
  return {
    id,
    year: 2024,
    bashoNumber: 1,
    bashoName: "hatsu",
    yusho: "r-1",
    junYusho: ["r-2"],
    prizes: { yushoAmount: 1000, junYushoAmount: 500, specialPrizes: 200 },
  };
}

function makeAlmanacSnapshot(bashoNumber: number): AlmanacSnapshot {
  return {
    year: 2024,
    bashoNumber: bashoNumber as 1 | 2 | 3 | 4 | 5 | 6,
    bashoName: "hatsu",
    makuuchiSummary: { totalBouts: 42, avgWins: 4.5, injuryCount: 1 },
    promotions: [],
    demotions: [],
    retirements: [],
  };
}

// --- Mocks ---

// We mock both archive modules so historyCache picks up our fake.
// The fake is stored on a module-level variable so each test can configure it.
let fakeArchive: ReturnType<typeof makeFakeArchive>;

vi.mock("@/engine/storage/opfsArchive", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/engine/storage/opfsArchive")>();
  return {
    ...actual,
    get opfsArchiveService() {
      return fakeArchive;
    },
  };
});

vi.mock("@/engine/storage/electronArchive", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/engine/storage/electronArchive")>();
  return {
    ...actual,
    get electronArchiveService() {
      return fakeArchive;
    },
  };
});

// Import after mocks are set up
const { historyCache } = await import("@/engine/historyCache");

describe("HistoryLRUCache", () => {
  beforeEach(() => {
    fakeArchive = makeFakeArchive();
    historyCache.clear();
    // Ensure web mode (not Electron)
    (globalThis as unknown as { window: Record<string, unknown> }).window = {
      ...(globalThis as unknown as { window: Record<string, unknown> }).window,
      __ELECTRON__: false,
    };
  });

  describe("loadFromOPFS (via getYear cold path)", () => {
    it("respects concurrency cap of 8 during bout load", async () => {
      const ids = Array.from({ length: 30 }, (_, i) => `b-${i}`);
      const results = new Map<string, BoutResult | null>();
      for (const id of ids) results.set(id, makeBoutResult(id));

      fakeArchive = makeFakeArchive({
        boutIds: ids,
        boutResults: results,
        awards: [makeBashoResult("br-1")],
        banzukeSnapshots: new Map([
          [1, makeAlmanacSnapshot(1)],
          [3, makeAlmanacSnapshot(3)],
          [5, makeAlmanacSnapshot(5)],
          [7, makeAlmanacSnapshot(7)],
          [9, makeAlmanacSnapshot(9)],
          [11, makeAlmanacSnapshot(11)],
        ]),
      });

      const year = await historyCache.getYear(2024);
      expect(year).not.toBeNull();
      expect(fakeArchive.maxInFlight).toBeLessThanOrEqual(8);
      expect(year!.bouts).toHaveLength(30);
    });

    it("filters out null bout results", async () => {
      const ids = ["b-0", "b-1", "b-2", "b-3"];
      const results = new Map<string, BoutResult | null>();
      results.set("b-0", makeBoutResult("b-0"));
      results.set("b-1", null);
      results.set("b-2", makeBoutResult("b-2"));
      results.set("b-3", null);

      fakeArchive = makeFakeArchive({
        boutIds: ids,
        boutResults: results,
        awards: [],
        banzukeSnapshots: new Map([[1, makeAlmanacSnapshot(1)]]),
      });

      const year = await historyCache.getYear(2024);
      expect(year).not.toBeNull();
      expect(year!.bouts).toHaveLength(2);
      expect(year!.bouts.map((b) => b.boutId)).toEqual(["b-0", "b-2"]);
    });

    it("returns null when no bout IDs exist", async () => {
      fakeArchive = makeFakeArchive({ boutIds: [], awards: [] });

      const year = await historyCache.getYear(2024);
      expect(year).toBeNull();
    });

    it("returns null when archive is unsupported", async () => {
      fakeArchive = makeFakeArchive({ supported: false });

      const year = await historyCache.getYear(2024);
      expect(year).toBeNull();
      expect(fakeArchive.getArchivedBoutIdsForSeason).not.toHaveBeenCalled();
    });

    it("loads awards and filters null banzuke snapshots", async () => {
      const ids = ["b-0"];
      const results = new Map([["b-0", makeBoutResult("b-0")]]);
      const awards = [makeBashoResult("br-1"), makeBashoResult("br-2")];
      const snapshots = new Map<number, AlmanacSnapshot | null>([
        [1, makeAlmanacSnapshot(1)],
        [3, makeAlmanacSnapshot(3)],
        [5, makeAlmanacSnapshot(5)],
        [7, makeAlmanacSnapshot(7)],
        [9, makeAlmanacSnapshot(9)],
        [11, null], // Missing basho 11
      ]);

      fakeArchive = makeFakeArchive({
        boutIds: ids,
        boutResults: results,
        awards,
        banzukeSnapshots: snapshots,
      });

      const year = await historyCache.getYear(2024);
      expect(year).not.toBeNull();
      expect(year!.awards).toEqual(awards);
      expect(year!.banzukeSnapshots).toHaveLength(5);
    });

    it("returns null on error from retrieveBoutLog", async () => {
      fakeArchive = makeFakeArchive({
        boutIds: ["b-0", "b-1", "b-2"],
        boutResults: new Map([
          ["b-0", makeBoutResult("b-0")],
          ["b-1", makeBoutResult("b-1")],
        ]),
        throwOnBoutId: "b-2",
        awards: [],
        banzukeSnapshots: new Map(),
      });

      const year = await historyCache.getYear(2024);
      expect(year).toBeNull();
    });

    it("awards field contains BashoResult[] shapes", async () => {
      const awards = [makeBashoResult("br-1")];
      fakeArchive = makeFakeArchive({
        boutIds: ["b-0"],
        boutResults: new Map([["b-0", makeBoutResult("b-0")]]),
        awards,
        banzukeSnapshots: new Map([[1, makeAlmanacSnapshot(1)]]),
      });

      const year = await historyCache.getYear(2024);
      expect(year).not.toBeNull();
      expect(year!.awards[0].id).toBe("br-1");
      expect(year!.awards[0].yusho).toBe("r-1");
    });
  });

  describe("LRU cache behavior", () => {
    it("returns cached year on hit and refreshes LRU order", async () => {
      const data: ArchivedYear = {
        year: 2020,
        bouts: [],
        awards: [],
        banzukeSnapshots: [],
      };
      historyCache.putYear(2020, data);

      const result = await historyCache.getYear(2020);
      expect(result).toBe(data);
      // Should not have hit the archive service
      expect(fakeArchive.getArchivedBoutIdsForSeason).not.toHaveBeenCalled();
    });

    it("evicts oldest year at capacity", async () => {
      // maxCapacity is 3 (from constructor default)
      const y1: ArchivedYear = { year: 1, bouts: [], awards: [], banzukeSnapshots: [] };
      const y2: ArchivedYear = { year: 2, bouts: [], awards: [], banzukeSnapshots: [] };
      const y3: ArchivedYear = { year: 3, bouts: [], awards: [], banzukeSnapshots: [] };
      const y4: ArchivedYear = { year: 4, bouts: [], awards: [], banzukeSnapshots: [] };

      historyCache.putYear(1, y1);
      historyCache.putYear(2, y2);
      historyCache.putYear(3, y3);

      // Access y1 to make it most-recently-used, so y2 becomes oldest
      await historyCache.getYear(1);

      // Add y4 — should evict y2 (oldest)
      historyCache.putYear(4, y4);

      // y2 should be evicted (cold path returns null since fake has no bouts)
      fakeArchive = makeFakeArchive({ boutIds: [], supported: true });
      const y2Result = await historyCache.getYear(2);
      expect(y2Result).toBeNull();

      // y1, y3, y4 should still be cached
      expect(await historyCache.getYear(1)).toBe(y1);
      expect(await historyCache.getYear(3)).toBe(y3);
      expect(await historyCache.getYear(4)).toBe(y4);
    });
  });

  describe("LRU eviction logging", () => {
    let infoSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      infoSpy = vi.spyOn(logger, "info").mockImplementation(() => {});
    });

    afterEach(() => {
      infoSpy.mockRestore();
    });

    it("logs via Logger.info when evicting oldest year", () => {
      const y1: ArchivedYear = { year: 1, bouts: [], awards: [], banzukeSnapshots: [] };
      const y2: ArchivedYear = { year: 2, bouts: [], awards: [], banzukeSnapshots: [] };
      const y3: ArchivedYear = { year: 3, bouts: [], awards: [], banzukeSnapshots: [] };
      const y4: ArchivedYear = { year: 4, bouts: [], awards: [], banzukeSnapshots: [] };

      historyCache.putYear(1, y1);
      historyCache.putYear(2, y2);
      historyCache.putYear(3, y3);
      // Adding y4 evicts y1 (oldest)
      historyCache.putYear(4, y4);

      expect(infoSpy).toHaveBeenCalledWith("Evicting year 1 from RAM.", "HistoryCache", undefined);
    });

    it("does not log when no eviction occurs", () => {
      const y1: ArchivedYear = { year: 1, bouts: [], awards: [], banzukeSnapshots: [] };

      historyCache.putYear(1, y1);

      expect(infoSpy).not.toHaveBeenCalled();
    });
  });
});
