import { describe, it, expect, vi, afterEach } from "vitest";
import { PromotionNarrative } from "@/engine/narrative/promotionBands";
import { BardEngine } from "@/engine/bard/BardEngine";
import { SeededRNG } from "@/engine/core/rng";
import {
  getOzekiRunProse,
  getYokozunaRunProse,
  getKadobanProse,
} from "@/engine/narrative/NarrativeProse";
import type {
  OzekiRunBand,
  YokozunaRunBand,
  KadobanBand,
  YokozunaSupportBand,
} from "@/engine/narrative/NarrativeBands";

/**
 * Promotion narrative bands — owned by the narrative layer (PromotionNarrative /
 * NarrativeBands / NarrativeProse), consumed by presenters. These tests lock
 * the threshold boundaries, the kadoban precedence order, and the band↔JSON-key
 * equality that the ui.digest.promotion.* / ui.digest.kadoban.* template paths
 * depend on.
 */

afterEach(() => {
  vi.restoreAllMocks();
});

describe("getOzekiRunBand", () => {
  it("maps wins below the brink threshold to 'building'", () => {
    expect(PromotionNarrative.getOzekiRunBand(0)).toBe("building");
    expect(PromotionNarrative.getOzekiRunBand(19)).toBe("building");
    expect(PromotionNarrative.getOzekiRunBand(29)).toBe("building");
  });

  it("maps wins in [30, 33) to 'brink'", () => {
    expect(PromotionNarrative.getOzekiRunBand(30)).toBe("brink");
    expect(PromotionNarrative.getOzekiRunBand(31)).toBe("brink");
    expect(PromotionNarrative.getOzekiRunBand(32)).toBe("brink");
  });

  it("maps wins at or above the 33-win promotion threshold to 'imminent'", () => {
    expect(PromotionNarrative.getOzekiRunBand(33)).toBe("imminent");
    expect(PromotionNarrative.getOzekiRunBand(34)).toBe("imminent");
    expect(PromotionNarrative.getOzekiRunBand(45)).toBe("imminent");
  });
});

describe("getYokozunaSupportBand", () => {
  it("maps heat below the adequate threshold to 'insufficient'", () => {
    expect(PromotionNarrative.getYokozunaSupportBand(0)).toBe("insufficient");
    expect(PromotionNarrative.getYokozunaSupportBand(49)).toBe("insufficient");
  });

  it("maps heat in [50, 75) to 'adequate'", () => {
    expect(PromotionNarrative.getYokozunaSupportBand(50)).toBe("adequate");
    expect(PromotionNarrative.getYokozunaSupportBand(74)).toBe("adequate");
  });

  it("maps heat at or above the strong-support threshold to 'strong'", () => {
    expect(PromotionNarrative.getYokozunaSupportBand(75)).toBe("strong");
    expect(PromotionNarrative.getYokozunaSupportBand(100)).toBe("strong");
  });
});

describe("getYokozunaRunBand", () => {
  it("two-plus yusho with strong support is 'unanimous'", () => {
    expect(PromotionNarrative.getYokozunaRunBand(2, 0, 75)).toBe("unanimous");
    expect(PromotionNarrative.getYokozunaRunBand(2, 0, 100)).toBe("unanimous");
    expect(PromotionNarrative.getYokozunaRunBand(3, 0, 80)).toBe("unanimous");
  });

  it("two-plus yusho below strong support is 'borderline'", () => {
    expect(PromotionNarrative.getYokozunaRunBand(2, 0, 74)).toBe("borderline");
    expect(PromotionNarrative.getYokozunaRunBand(2, 1, 0)).toBe("borderline");
  });

  it("one yusho plus one jun-yusho is 'partial'", () => {
    expect(PromotionNarrative.getYokozunaRunBand(1, 1, 0)).toBe("partial");
    expect(PromotionNarrative.getYokozunaRunBand(1, 1, 90)).toBe("partial");
  });

  it("a lone yusho is 'testing'", () => {
    expect(PromotionNarrative.getYokozunaRunBand(1, 0, 0)).toBe("testing");
    expect(PromotionNarrative.getYokozunaRunBand(1, 0, 90)).toBe("testing");
  });

  it("no yusho is 'standard'", () => {
    expect(PromotionNarrative.getYokozunaRunBand(0, 0, 0)).toBe("standard");
    expect(PromotionNarrative.getYokozunaRunBand(0, 2, 90)).toBe("standard");
  });
});

describe("getKadobanDramaBand", () => {
  it("demotion beats clearing when both thresholds are met (precedence)", () => {
    expect(
      PromotionNarrative.getKadobanDramaBand(
        { isKadoban: true, consecutiveMakeKoshi: 2 },
        8,
        8
      )
    ).toBe("demoted");
  });

  it("kadoban with a confirmed losing record is 'demoted'", () => {
    expect(
      PromotionNarrative.getKadobanDramaBand(
        { isKadoban: true, consecutiveMakeKoshi: 2 },
        0,
        8
      )
    ).toBe("demoted");
  });

  it("kadoban at the kachi-koshi threshold is 'cleared'", () => {
    expect(
      PromotionNarrative.getKadobanDramaBand(
        { isKadoban: true, consecutiveMakeKoshi: 2 },
        8,
        0
      )
    ).toBe("cleared");
    expect(
      PromotionNarrative.getKadobanDramaBand(
        { isKadoban: true, consecutiveMakeKoshi: 1 },
        8,
        5
      )
    ).toBe("cleared");
  });

  it("first kadoban basho still undecided is 'danger'", () => {
    expect(
      PromotionNarrative.getKadobanDramaBand(
        { isKadoban: true, consecutiveMakeKoshi: 1 },
        7,
        7
      )
    ).toBe("danger");
  });

  it("ongoing kadoban campaigns and second make-koshi are 'fighting'", () => {
    expect(
      PromotionNarrative.getKadobanDramaBand(
        { isKadoban: true, consecutiveMakeKoshi: 2 },
        7,
        7
      )
    ).toBe("fighting");
    expect(
      PromotionNarrative.getKadobanDramaBand(
        { isKadoban: false, consecutiveMakeKoshi: 2 },
        5,
        5
      )
    ).toBe("fighting");
  });
});

describe("promotion prose paths", () => {
  it("getOzekiRunProse resolves ui.digest.promotion.ozeki_run for every band", () => {
    const spy = vi.spyOn(BardEngine, "resolve");
    const bands: OzekiRunBand[] = ["building", "brink", "imminent"];
    for (const band of bands) {
      const rng = new SeededRNG(`ozeki-${band}`);
      const text = getOzekiRunProse(rng, band);
      expect(spy).toHaveBeenCalledWith(rng, `ui.digest.promotion.ozeki_run.${band}`);
      expect(text.length).toBeGreaterThan(0);
    }
  });

  it("getYokozunaRunProse resolves ui.digest.promotion.yokozuna_run for every band", () => {
    const spy = vi.spyOn(BardEngine, "resolve");
    const bands: YokozunaRunBand[] = [
      "standard",
      "unanimous",
      "borderline",
      "partial",
      "testing",
    ];
    for (const band of bands) {
      const rng = new SeededRNG(`yokozuna-${band}`);
      const text = getYokozunaRunProse(rng, band);
      expect(spy).toHaveBeenCalledWith(rng, `ui.digest.promotion.yokozuna_run.${band}`);
      expect(text.length).toBeGreaterThan(0);
    }
  });

  it("getKadobanProse resolves ui.digest.kadoban for every band", () => {
    const spy = vi.spyOn(BardEngine, "resolve");
    const bands: KadobanBand[] = ["fighting", "demoted", "cleared", "danger"];
    for (const band of bands) {
      const rng = new SeededRNG(`kadoban-${band}`);
      const text = getKadobanProse(rng, band);
      expect(spy).toHaveBeenCalledWith(rng, `ui.digest.kadoban.${band}`);
      expect(text.length).toBeGreaterThan(0);
    }
  });
});

describe("promotion narrative wrappers", () => {
  it("getOzekiRunNarrative resolves the imminent variant for 33+ wins", () => {
    // Seed "ozeki_run" matches the presenter call site; first variant is the
    // golden string asserted by tests/unit/presenters/uiDigest.test.ts.
    const text = PromotionNarrative.getOzekiRunNarrative(new SeededRNG("ozeki_run"), 34);
    expect(text).toBe(
      "Has reached the traditional 33-win threshold. An Ozeki promotion is imminent."
    );
  });

  it("getYokozunaRunNarrative returns a unanimous variant for a strong 2-yusho case", () => {
    const text = PromotionNarrative.getYokozunaRunNarrative(
      new SeededRNG("yokozuna_run"),
      2,
      0,
      80
    );
    expect([
      "Unanimous Yokozuna Deliberation Council recommendation expected.",
      "The Council eagerly awaits to bestow the highest rank.",
      "A generational talent; promotion is virtually guaranteed after this dominant run.",
      "Unquestionable dominance. The white rope is a mere formality at this point.",
      "Has left no doubt. The Yokozuna promotion council will surely be unanimous.",
    ]).toContain(text);
  });

  it("getKadobanNarrative resolves the fighting variant for an undecided campaign", () => {
    const text = PromotionNarrative.getKadobanNarrative(
      new SeededRNG("kadoban"),
      { isKadoban: true, consecutiveMakeKoshi: 2 },
      7,
      7
    );
    expect([
      "Fighting for survival as Kadoban Ozeki.",
      "Back against the wall. Every bout is a fight to retain the Ozeki rank.",
      "Wrestling under immense pressure with Kadoban status hanging over them.",
      "The battle for survival continues. Must secure a winning record to avoid demotion.",
      "A tense campaign underway. The rank of Ozeki is on the line every day.",
    ]).toContain(text);
  });

  it("is deterministic: same seed produces identical narrative", () => {
    const a = PromotionNarrative.getYokozunaRunNarrative(new SeededRNG("det"), 1, 1, 40);
    const b = PromotionNarrative.getYokozunaRunNarrative(new SeededRNG("det"), 1, 1, 40);
    expect(a).toBe(b);
  });
});

describe("support band field parity", () => {
  it("YokozunaSupportBand literals cover the projected supportLevel union", () => {
    // The YokozunaCandidate.supportLevel field is typed by this band — the
    // union must stay exactly { strong, adequate, insufficient }.
    const bands: YokozunaSupportBand[] = ["strong", "adequate", "insufficient"];
    expect(bands).toHaveLength(3);
  });
});
