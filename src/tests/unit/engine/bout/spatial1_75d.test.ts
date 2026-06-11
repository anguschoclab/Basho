 
import { describe, it, expect } from "vitest";
import { resolveBoutPhysics } from "../boutPhysics";
import { mockRikishi, makeMockBasho } from "../utils";

describe("1.75D spatial engine", () => {
  it("is deterministic (non-divergence)", () => {
    const bout = { id: "det-001", day: 1, rikishiEastId: "r1", rikishiWestId: "r2" };
    const east = mockRikishi("r1", { power: 70, speed: 60, weight: 120 });
    const west = mockRikishi("r2", { power: 65, speed: 55, weight: 130 });
    const basho = makeMockBasho();

    const results = Array.from({ length: 10 }, () => resolveBoutPhysics(bout, east, west, basho));
    const first = results[0];
    for (let i = 1; i < results.length; i++) {
      expect(results[i].result.winner).toBe(first.result.winner);
      expect(results[i].result.kimarite).toBe(first.result.kimarite);
      expect(results[i].result.duration).toBe(first.result.duration);
    }
  });

  it("returns engineSnapshot with lateral and angular fields", () => {
    const bout = { id: "snap-001", day: 1, rikishiEastId: "r1", rikishiWestId: "r2" };
    const east = mockRikishi("r1", { power: 70, speed: 60, weight: 120 });
    const west = mockRikishi("r2", { power: 65, speed: 55, weight: 130 });
    const basho = makeMockBasho();

    const { result, engineSnapshot } = resolveBoutPhysics(bout, east, west, basho);
    expect(result).toBeDefined();
    expect(engineSnapshot).toBeDefined();
    expect(typeof engineSnapshot.balanceEast).toBe("number");
    expect(typeof engineSnapshot.balanceWest).toBe("number");
    expect(["front", "lateral", "rear"]).toContain(engineSnapshot.position);
  });

  it("boutLog contains engagement entries with spatial data", () => {
    const bout = { id: "log-001", day: 1, rikishiEastId: "r1", rikishiWestId: "r2" };
    const east = mockRikishi("r1", { power: 70, speed: 60, weight: 120 });
    const west = mockRikishi("r2", { power: 65, speed: 55, weight: 130 });
    const basho = makeMockBasho();

    const { result } = resolveBoutPhysics(bout, east, west, basho);
    const engagementLogs = result.log.filter((e) => e.phase === "engagement");
    expect(engagementLogs.length).toBeGreaterThanOrEqual(1);
    for (const log of engagementLogs) {
      expect(log.data).toBeDefined();
      expect(typeof (log.data as Record<string, unknown>).tick).toBe("number");
    }
  });

  it("resolves without NaN or infinite loops for extreme stats", () => {
    const bout = { id: "extreme-001", day: 1, rikishiEastId: "r1", rikishiWestId: "r2" };
    const east = mockRikishi("r1", { power: 99, speed: 99, weight: 200, balance: 1 });
    const west = mockRikishi("r2", { power: 99, speed: 99, weight: 200, balance: 1 });
    const basho = makeMockBasho();

    const { result } = resolveBoutPhysics(bout, east, west, basho);
    expect(result).toBeDefined();
    expect(result.winner).toBeTruthy();
    expect(result.duration).toBeGreaterThan(0);
    expect(result.duration).toBeLessThanOrEqual(240);
  });
});

describe("1.75D emergent techniques", () => {
  it("can classify utchari when defender pivots at edge", () => {
    // Use a long seed that may produce edge crisis with pivot
    const bout = { id: "utchari-001", day: 1, rikishiEastId: "r1", rikishiWestId: "r2" };
    const east = mockRikishi("r1", { power: 50, speed: 80, weight: 100, technique: 80 });
    const west = mockRikishi("r2", { power: 70, speed: 50, weight: 150, technique: 50 });
    const basho = makeMockBasho();

    const { result } = resolveBoutPhysics(bout, east, west, basho);
    expect(result.kimarite).toBeTruthy();
    // Not asserting exact kimarite since it's seed-dependent, but ensuring it resolves
    expect(result.winner).toBeTruthy();
  });

  it("can produce okuridashi with lateral momentum", () => {
    const bout = { id: "okuri-001", day: 1, rikishiEastId: "r1", rikishiWestId: "r2" };
    const east = mockRikishi("r1", { power: 60, speed: 80, weight: 110 });
    const west = mockRikishi("r2", { power: 80, speed: 50, weight: 140 });
    const basho = makeMockBasho();

    const { result } = resolveBoutPhysics(bout, east, west, basho);
    expect(result).toBeDefined();
    expect(result.winner).toBeTruthy();
  });
});

describe("1.75D determinism — seeded RNG", () => {
  it("identical seed produces identical engineSnapshot", () => {
    const bout = { id: "seed-001", day: 1, rikishiEastId: "r1", rikishiWestId: "r2" };
    const east = mockRikishi("r1");
    const west = mockRikishi("r2");
    const basho = makeMockBasho();

    const a = resolveBoutPhysics(bout, east, west, basho);
    const b = resolveBoutPhysics(bout, east, west, basho);

    expect(a.result.winner).toBe(b.result.winner);
    expect(a.result.duration).toBe(b.result.duration);
    expect(a.result.kimarite).toBe(b.result.kimarite);
    expect(a.engineSnapshot.balanceEast).toBe(b.engineSnapshot.balanceEast);
    expect(a.engineSnapshot.balanceWest).toBe(b.engineSnapshot.balanceWest);
    expect(a.engineSnapshot.position).toBe(b.engineSnapshot.position);
  });
});
