import { describe, it, expect } from "vitest";
import { updateH2H, generateH2HCommentary } from "../h2h";
import { Rikishi, BoutResult } from "../types";

// Mock minimal Rikishi builder
function createMockRikishi(id: string, name: string): Rikishi {
  return {
    id,
    name,
    shikona: name,
    h2h: {},
    // ...other required fields mock
  } as unknown as Rikishi;
}

describe("H2H System", () => {
  it("should initialize and update H2H records for both winner and loser", () => {
    const r1 = createMockRikishi("r1", "Asashoryu");
    const r2 = createMockRikishi("r2", "Hakuho");

    const result = {
      winnerRikishiId: "r1",
      loserRikishiId: "r2",
      kimarite: "yorikiri",
      duration: 5,
    } as unknown as BoutResult;

    updateH2H(r1, r2, result, "hatsu2026", 2026, 1);

    // R1 vs R2 (R1 wins)
    expect(r1.h2h!["r2"]).toBeDefined();
    expect(r1.h2h!["r2"].wins).toBe(1);
    expect(r1.h2h!["r2"].losses).toBe(0);
    expect(r1.h2h!["r2"].streak).toBe(1);
    expect(r1.h2h!["r2"].lastMatch?.kimarite).toBe("yorikiri");

    // R2 vs R1 (R2 loses)
    expect(r2.h2h!["r1"]).toBeDefined();
    expect(r2.h2h!["r1"].wins).toBe(0);
    expect(r2.h2h!["r1"].losses).toBe(1);
    expect(r2.h2h!["r1"].streak).toBe(-1);
  });

  it("should track streaks correctly over multiple matches", () => {
    const r1 = createMockRikishi("r1", "Asashoryu");
    const r2 = createMockRikishi("r2", "Hakuho");

    const result1 = { winnerRikishiId: "r1", loserRikishiId: "r2", kimarite: "oshidashi" } as unknown as BoutResult;
    const result2 = { winnerRikishiId: "r1", loserRikishiId: "r2", kimarite: "yorikiri" } as unknown as BoutResult;
    const result3 = { winnerRikishiId: "r2", loserRikishiId: "r1", kimarite: "uwatenage" } as unknown as BoutResult;

    // R1 wins two
    updateH2H(r1, r2, result1, "basho1", 2026, 1);
    updateH2H(r1, r2, result2, "basho1", 2026, 2);
    
    expect(r1.h2h!["r2"].streak).toBe(2);
    expect(r2.h2h!["r1"].streak).toBe(-2);

    // R2 wins one (snapping streak)
    updateH2H(r2, r1, result3, "basho1", 2026, 3);
    
    expect(r1.h2h!["r2"].streak).toBe(-1);
    expect(r2.h2h!["r1"].streak).toBe(1);
    expect(r1.h2h!["r2"].wins).toBe(2);
    expect(r1.h2h!["r2"].losses).toBe(1);
  });

  it("should generate appropriate commentary for first meetings", () => {
    const r1 = createMockRikishi("r1", "Takanohana");
    const r2 = createMockRikishi("r2", "Akebono");

    const commentary = generateH2HCommentary(r1, r2);
    expect(commentary).toMatch(/first time|fresh matchup|first-ever|No data/i);
  });

  it("should generate appropriate commentary for lopsided rivalries", () => {
    const r1 = createMockRikishi("r1", "Goeido");
    const r2 = createMockRikishi("r2", "Kotoshogiku");
    
    // Simulate 5-0 record
    for(let i = 0; i < 5; i++) {
        updateH2H(r1, r2, { winnerRikishiId: "r1", loserRikishiId: "r2", kimarite: "hatakikomi" } as unknown as BoutResult, "b", 2026, i+1);
    }

    const commentary = generateH2HCommentary(r1, r2);
    expect(commentary).toMatch(/dominated|struggled|heavily on Goeido's side|owns this rivalry/i);
  });

  it("should generate appropriate commentary for deadlocks", () => {
    const r1 = createMockRikishi("r1", "Wakanohana");
    const r2 = createMockRikishi("r2", "Musashimaru");
    
    // Simulate 2-2 record
    updateH2H(r1, r2, { winnerRikishiId: "r1", loserRikishiId: "r2", kimarite: "oshidashi" } as unknown as BoutResult, "b", 2026, 1);
    updateH2H(r1, r2, { winnerRikishiId: "r1", loserRikishiId: "r2", kimarite: "oshidashi" } as unknown as BoutResult, "b", 2026, 2);
    updateH2H(r2, r1, { winnerRikishiId: "r2", loserRikishiId: "r1", kimarite: "oshidashi" } as unknown as BoutResult, "b", 2026, 3);
    updateH2H(r2, r1, { winnerRikishiId: "r2", loserRikishiId: "r1", kimarite: "oshidashi" } as unknown as BoutResult, "b", 2026, 4);

    const commentary = generateH2HCommentary(r1, r2);
    expect(commentary).toMatch(/close as it gets|true rivalry|Neither man/i);
  });

  it("should mention recent history specifics", () => {
      const r1 = createMockRikishi("r1", "Terunofuji");
      const r2 = createMockRikishi("r2", "Takakeisho");

      // 1-0 shouldn't trigger lopsided or deadlock, will fallback to recent history or generic
      updateH2H(r1, r2, { winnerRikishiId: "r1", loserRikishiId: "r2", kimarite: "kimedashi" }, "b", 2026, 1);

      const commentary = generateH2HCommentary(r1, r2);
      expect(commentary).toMatch(/kimedashi|leads the series/i);
  });
});
