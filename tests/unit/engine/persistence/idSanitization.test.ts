/**
 * idSanitization.test.ts
 *
 * Deserialization is a repair boundary: every ID-list field on loaded
 * entities must be deduplicated, and remaining ID-integrity violations
 * must be surfaced via warn() rather than silently accepted.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SerializationService } from "@/engine/persistence/SerializationService";
import { makeMockHeya, mockRikishi } from "@tests/unit/engine/utils";
import type { SerializedWorldState } from "@/engine/types/save";

vi.mock("@/engine/utils/Logger", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/engine/utils/Logger")>();
  return { ...actual, warn: vi.fn() };
});

import { warn } from "@/engine/utils/Logger";

describe("SerializationService — ID-list sanitization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sanitizeHeya dedupes rikishiIds", () => {
    const heya = makeMockHeya("h1", { rikishiIds: ["a", "a", "b"] });
    SerializationService.sanitizeHeya(heya);
    expect(heya.rikishiIds).toEqual(["a", "b"]);
  });

  it("sanitizeHeya dedupes staffIds", () => {
    const heya = makeMockHeya("h1", { staffIds: ["s1", "s1", "s2"] });
    SerializationService.sanitizeHeya(heya);
    expect(heya.staffIds).toEqual(["s1", "s2"]);
  });

  it("sanitizeRikishi dedupes tsukebitoIds", () => {
    const r = mockRikishi("r1", { tsukebitoIds: ["j1", "j1", "j2"] });
    SerializationService.sanitizeRikishi(r);
    expect(r.tsukebitoIds).toEqual(["j1", "j2"]);
  });

  it("sanitizeRikishi dedupes menteeIds", () => {
    const r = mockRikishi("r1", { menteeIds: ["m1", "m1"] });
    SerializationService.sanitizeRikishi(r);
    expect(r.menteeIds).toEqual(["m1"]);
  });

  it("deserializeWorld warns on remaining ID-integrity violations", () => {
    const serialized = {
      seed: "test-seed",
      year: 2025,
      week: 1,
      cyclePhase: "interim",
      dayIndexGlobal: 0,
      // Roster lists a rikishi that does not exist — a dangling ref that
      // sanitize cannot repair, so it must surface as a warn().
      heyas: {
        h1: {
          id: "h1",
          name: "Test",
          oyakataId: "o1",
          rikishiIds: ["ghost"],
          funds: 0,
          scandalScore: 0,
        },
      },
      rikishi: {},
      oyakata: { o1: { id: "o1" } },
      activeRikishiIds: [],
      events: { version: "1.0.0", log: [], dedupe: {} },
    } as unknown as SerializedWorldState;

    SerializationService.deserializeWorld(serialized);
    expect(vi.mocked(warn).mock.calls.length).toBeGreaterThan(0);
  });
});
