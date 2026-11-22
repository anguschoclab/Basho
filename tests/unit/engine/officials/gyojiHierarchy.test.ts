/**
 * Spec (RED) — gyōji hierarchy & accountability.
 *
 * Real structure: an 8-tier ladder (jonokuchi → … → makuuchi → sanyaku →
 * tate), strict division gating (a juryo gyōji never calls makuuchi),
 * seniority-driven progression, hereditary tate titles (Kimura
 * Shōnosuke / Shikimori Inosuke), retirement at 65, and error-led
 * discipline: a makuuchi gyōji with >9 reversed calls in a year takes a
 * salary cut, lower ranks get promotion freezes, a tate's ritual
 * resignation is almost always rejected (~95%).
 * Current: `callsReversed` is written but never consumed — nothing
 * disciplines officials, and `GyojiRank` lacks the lower tiers.
 */
import { describe, it, expect } from "vitest";
import type { Gyoji } from "@/engine/types/gyoji";
import { generateGyoji, assignGyojiToBout, recordGyojiBout } from "@/engine/officials/GyojiService";

describe("division gating", () => {
  it("a juryo-ranked gyōji is never assigned to a makuuchi bout", () => {
    const juryoGyoji = generateGyoji("spec", "juryo", 0);
    expect(assignGyojiToBout([juryoGyoji], "makuuchi")).toBeNull();
  });
});

describe("error accountability consumes callsReversed", () => {
  it("a makuuchi gyōji whose yearly reversals exceed 9 takes a salary cut", () => {
    let g: Gyoji = { ...generateGyoji("spec", "makuuchi", 0), callsReversed: 8 };
    // 9th reversal of the year → discipline flag on the official.
    g = recordGyojiBout(g, "hatsu", 2026, true);
    g = recordGyojiBout(g, "hatsu", 2026, true);
    const flagged = g as Gyoji & { salaryCutPending?: boolean; frozenUntilYear?: number };
    expect(flagged.salaryCutPending === true || (flagged.frozenUntilYear ?? 0) > 2026).toBe(true);
  });
});

describe("hereditary tate titles", () => {
  it("tate-gyōji carry a hereditary title", () => {
    const tate = generateGyoji("spec", "tate", 0) as Gyoji & { hereditaryTitle?: string };
    expect(tate.hereditaryTitle).toBeDefined();
  });
});
