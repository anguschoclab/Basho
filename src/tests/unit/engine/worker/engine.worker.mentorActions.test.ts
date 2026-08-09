import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { mockRikishi, makeMockWorld, makeMockHeya } from "../utils";
import type { EngineCommand, EngineEvent } from "@/engine/worker/types";
import type { WorldState } from "@/engine/types/world";
import { assignMentor } from "@/engine/lineage";
import { resolveImpacts } from "@/engine/core/ImpactResolver";

const originalSelf = globalThis.self;
const originalPostMessage = globalThis.postMessage;
const originalOnmessage = globalThis.onmessage;

const mockPostMessage = vi.fn();

interface MockWorkerGlobal {
  postMessage: (message: EngineEvent) => void;
  onmessage: ((event: MessageEvent<EngineCommand>) => void) | null;
  self?: any;
}

const mockGlobal = globalThis as unknown as MockWorkerGlobal;
mockGlobal.postMessage = mockPostMessage;
mockGlobal.onmessage = null;
if (!mockGlobal.self) {
  mockGlobal.self = globalThis;
}

afterAll(() => {
  if (originalPostMessage === undefined) {
    delete (globalThis as any).postMessage;
  } else {
    mockGlobal.postMessage = originalPostMessage;
  }
  if (originalOnmessage === undefined) {
    delete (globalThis as any).onmessage;
  } else {
    mockGlobal.onmessage = originalOnmessage;
  }
  if (originalSelf === undefined) {
    delete (globalThis as any).self;
  } else {
    mockGlobal.self = originalSelf;
  }
});

vi.mock("@/presenters/uiDigest", () => ({
  buildWeeklyDigest: vi.fn((world) => ({
    mockDigest: true,
    worldSeed: world?.seed,
  })),
}));

vi.mock("@/engine/systems/generation/WorldFactory", () => ({
  generateInitialWorld: vi.fn((seed) => makeMockWorld({ seed })),
}));

vi.mock("@/engine/tick/tickOrchestrator", () => ({
  tickOrchestrator: vi.fn((world) => ({ ...world, ticked: true })),
  advanceDaysFastOrchestrator: vi.fn((world, days) => ({
    ...world,
    ticked: true,
    daysAdvanced: days,
  })),
  cloneWorldForTick: vi.fn((world) => world),
}));

await import("@/engine/worker/engine.worker");

function makeWorldWithPair(
  mentorOverrides: Partial<ReturnType<typeof mockRikishi>> = {},
  apprenticeOverrides: Partial<ReturnType<typeof mockRikishi>> = {}
): WorldState {
  const mentor = mockRikishi("mentor", { rank: "maegashira", heyaId: "h1", ...mentorOverrides });
  const apprentice = mockRikishi("apprentice", {
    rank: "makushita",
    heyaId: "h1",
    ...apprenticeOverrides,
  });
  const rikishi = new Map([
    [mentor.id, mentor],
    [apprentice.id, apprentice],
  ]);
  const heya = makeMockHeya("h1", { rikishiIds: Array.from(rikishi.keys()) });
  return makeMockWorld({
    rikishi,
    heyas: new Map([["h1", heya]]),
    lineage: [],
    rivalriesState: { pairs: {}, version: "1.0.0" } as any,
  });
}

describe("engine.worker — ASSIGN_MENTOR / REMOVE_MENTOR", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const triggerMessage = async (data: EngineCommand) => {
    if (mockGlobal.onmessage) {
      await mockGlobal.onmessage({ data } as MessageEvent<EngineCommand>);
    }
  };

  function getWorldUpdated(): WorldState | undefined {
    const call = mockPostMessage.mock.calls.find(
      (c) => (c[0] as { type?: string })?.type === "WORLD_UPDATED"
    );
    return call ? ((call[0] as { world: WorldState }).world as WorldState) : undefined;
  }

  it("ASSIGN_MENTOR applies lineage.assignMentor impact to world", async () => {
    const world = makeWorldWithPair();
    await triggerMessage({ type: "LOAD_WORLD", world });
    vi.clearAllMocks();

    await triggerMessage({
      type: "ASSIGN_MENTOR",
      mentorId: "mentor",
      apprenticeId: "apprentice",
    });

    const updated = getWorldUpdated();
    expect(updated).toBeDefined();
    const apprentice = updated!.rikishi.get("apprentice");
    const mentor = updated!.rikishi.get("mentor");
    expect(apprentice?.mentorId).toBe("mentor");
    expect(mentor?.menteeIds).toContain("apprentice");
    expect(
      updated!.lineage?.some((e) => e.mentorId === "mentor" && e.menteeId === "apprentice")
    ).toBe(true);
    expect(updated!.rivalriesState?.pairs).toBeDefined();
  });

  it("ASSIGN_MENTOR emits WORLD_UPDATED after successful assignment", async () => {
    const world = makeWorldWithPair();
    await triggerMessage({ type: "LOAD_WORLD", world });
    vi.clearAllMocks();

    await triggerMessage({
      type: "ASSIGN_MENTOR",
      mentorId: "mentor",
      apprenticeId: "apprentice",
    });

    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "WORLD_UPDATED" })
    );
  });

  it("ASSIGN_MENTOR leaves world unchanged when eligibility check fails (apprentice is sekitori)", async () => {
    const world = makeWorldWithPair({}, { rank: "juryo" });
    await triggerMessage({ type: "LOAD_WORLD", world });
    vi.clearAllMocks();

    await triggerMessage({
      type: "ASSIGN_MENTOR",
      mentorId: "mentor",
      apprenticeId: "apprentice",
    });

    // No WORLD_UPDATED for failed eligibility
    const updated = getWorldUpdated();
    if (updated) {
      const apprentice = updated.rikishi.get("apprentice");
      expect(apprentice?.mentorId).toBeUndefined();
      expect(updated.lineage).toHaveLength(0);
    }
  });

  it("ASSIGN_MENTOR with non-existent mentor is a no-op", async () => {
    const world = makeWorldWithPair();
    await triggerMessage({ type: "LOAD_WORLD", world });
    vi.clearAllMocks();

    await triggerMessage({
      type: "ASSIGN_MENTOR",
      mentorId: "non-existent",
      apprenticeId: "apprentice",
    });

    const updated = getWorldUpdated();
    if (updated) {
      const apprentice = updated.rikishi.get("apprentice");
      expect(apprentice?.mentorId).toBeUndefined();
    }
  });

  it("REMOVE_MENTOR clears mentorId and menteeIds", async () => {
    const world = makeWorldWithPair();
    // First assign a mentor
    const { ok, impact } = assignMentor(world, "apprentice", "mentor");
    if (ok && impact) {
      const assignedWorld = resolveImpacts(world, [impact]);
      await triggerMessage({ type: "LOAD_WORLD", world: assignedWorld });
    }
    vi.clearAllMocks();

    await triggerMessage({
      type: "REMOVE_MENTOR",
      apprenticeId: "apprentice",
    });

    const updated = getWorldUpdated();
    expect(updated).toBeDefined();
    const apprentice = updated!.rikishi.get("apprentice");
    const mentor = updated!.rikishi.get("mentor");
    expect(apprentice?.mentorId).toBeUndefined();
    expect(mentor?.menteeIds).not.toContain("apprentice");
  });

  it("REMOVE_MENTOR emits WORLD_UPDATED", async () => {
    const world = makeWorldWithPair();
    const { ok, impact } = assignMentor(world, "apprentice", "mentor");
    if (ok && impact) {
      const assignedWorld = resolveImpacts(world, [impact]);
      await triggerMessage({ type: "LOAD_WORLD", world: assignedWorld });
    }
    vi.clearAllMocks();

    await triggerMessage({
      type: "REMOVE_MENTOR",
      apprenticeId: "apprentice",
    });

    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "WORLD_UPDATED" })
    );
  });

  it("REMOVE_MENTOR on apprentice with no mentor is a no-op (empty impact)", async () => {
    const world = makeWorldWithPair();
    await triggerMessage({ type: "LOAD_WORLD", world });
    vi.clearAllMocks();

    await triggerMessage({
      type: "REMOVE_MENTOR",
      apprenticeId: "apprentice",
    });

    // removeMentor returns empty impact when no mentorId — no WORLD_UPDATED
    const updated = getWorldUpdated();
    if (updated) {
      const apprentice = updated.rikishi.get("apprentice");
      expect(apprentice?.mentorId).toBeUndefined();
    }
  });
});
