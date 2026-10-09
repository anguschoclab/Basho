/**
 * engine.worker.scoutCandidate.test.ts
 *
 * Regression tests for silent command failures (audit WS7-09).
 *
 * OFFER_CONTRACT and POACH_CANDIDATE post `{type:"ERROR"}` when the service
 * declines; SCOUT_CANDIDATE (and SCOUT_POOL) drop `ok:false` results silently
 * — the UI then shows its unconditional success toast. Pin the consistent
 * failure-signaling contract.
 */
import { describe, it, expect, vi, beforeEach, afterAll, type Mock } from "vitest";
import { MockFactory } from "../../../helpers/utils/MockFactory";
import type { EngineCommand, EngineEvent } from "@/engine/worker/types";

const originalSelf = globalThis.self;
const originalPostMessage = globalThis.postMessage;
const originalOnmessage = globalThis.onmessage;

const mockPostMessage = vi.fn();
const mockGlobal = globalThis as unknown as {
  postMessage: (m: EngineEvent) => void;
  onmessage: ((e: MessageEvent<EngineCommand>) => void) | null;
  self?: any;
};
mockGlobal.postMessage = mockPostMessage;
mockGlobal.onmessage = null;
if (!mockGlobal.self) mockGlobal.self = globalThis;

afterAll(() => {
  if (originalPostMessage === undefined) delete (globalThis as any).postMessage;
  else mockGlobal.postMessage = originalPostMessage;
  if (originalOnmessage === undefined) delete (globalThis as any).onmessage;
  else mockGlobal.onmessage = originalOnmessage;
  if (originalSelf === undefined) delete (globalThis as any).self;
  else mockGlobal.self = originalSelf;
});

vi.mock("@/presenters/uiDigest", () => ({
  buildWeeklyDigest: vi.fn(() => ({ mockDigest: true })),
}));

vi.mock("@/engine/systems/generation/TalentPoolService", () => ({
  offerCandidate: vi.fn(),
  scoutPool: vi.fn(),
  scoutCandidate: vi.fn(),
}));

await import("@/engine/worker/engine.worker");
const talentpool = await import("@/engine/systems/generation/TalentPoolService");

describe("engine.worker — recruitment failure signaling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const triggerMessage = async (data: EngineCommand) => {
    if (mockGlobal.onmessage) {
      await mockGlobal.onmessage({ data } as MessageEvent<EngineCommand>);
    }
  };

  it("SCOUT_CANDIDATE posts ERROR when the service declines", async () => {
    await triggerMessage({ type: "LOAD_WORLD", world: MockFactory.createWorld({}) });
    vi.clearAllMocks();

    (talentpool.scoutCandidate as Mock).mockReturnValue({
      ok: false,
      reason: "Candidate already fully scouted",
    });

    await triggerMessage({
      type: "SCOUT_CANDIDATE",
      candidateId: "c1",
      effort: 3,
    });

    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "ERROR", message: "Candidate already fully scouted" })
    );
  });

  it("SCOUT_POOL posts ERROR when the service reports failure", async () => {
    await triggerMessage({ type: "LOAD_WORLD", world: MockFactory.createWorld({}) });
    vi.clearAllMocks();

    (talentpool.scoutPool as Mock).mockReturnValue({
      ok: false,
      reason: "Insufficient funds",
    });

    await triggerMessage({
      type: "SCOUT_POOL",
      pool: "regional",
      revealCount: 3,
    } as unknown as EngineCommand);

    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "ERROR" })
    );
  });
});
