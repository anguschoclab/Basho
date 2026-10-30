import { describe, it, expect } from "vitest";
import type { BoutResult } from "@/engine/types/basho";
import type { PbpLine } from "@/engine/bout/narrative/pbpTypes";
import type { UIRikishi } from "@/presenters/uiModels";
import {
  getNarrationPbp,
  classifyLine,
  explainerFor,
  badgesForLine,
  selectHeadlineIndex,
} from "@/components/basho/boutReplay/feedModel";

function line(partial: Partial<PbpLine> & { text: string }): PbpLine {
  return { id: `id-${partial.text.slice(0, 8)}`, ...partial };
}

const east = { id: "east-1", shikona: "Higashiyama" } as UIRikishi;
const west = { id: "west-1", shikona: "Nishikawa" } as UIRikishi;

function resultWithLines(pbpLines: PbpLine[], extra: Partial<BoutResult> = {}): BoutResult {
  return {
    boutId: "b1",
    winner: "east",
    winnerRikishiId: "east-1",
    loserRikishiId: "west-1",
    kimarite: "yorikiri",
    kimariteName: "Yorikiri",
    stance: "hidari-yotsu",
    tachiaiWinner: "east",
    duration: 12,
    momentumScore: 0,
    inBoutInjury: null,
    isTimeout: false,
    upset: false,
    kenshoEnvelopes: 0,
    log: [],
    pbpLines,
    ...extra,
  } as BoutResult;
}

describe("getNarrationPbp", () => {
  it("returns structured PbpLine[] with phase/tags/voice preserved (not flattened strings)", () => {
    const lines = [
      line({ text: "They face off.", phase: "opening", voice: "understated" }),
      line({ text: "Yorikiri! Forced out!", phase: "finish", voice: "dramatic", tags: ["dominant"] }),
    ];
    const out = getNarrationPbp(resultWithLines(lines), east, west);
    expect(out).toHaveLength(2);
    expect(out[1].phase).toBe("finish");
    expect(out[1].voice).toBe("dramatic");
    expect(out[1].tags).toEqual(["dominant"]);
  });

  it("drops empty/trivial lines", () => {
    const lines = [line({ text: "" }), line({ text: "ab" }), line({ text: "A real line." })];
    const out = getNarrationPbp(resultWithLines(lines), east, west);
    expect(out).toHaveLength(1);
    expect(out[0].text).toBe("A real line.");
  });

  it("synthesizes structured fallback lines when pbpLines is missing", () => {
    const res = resultWithLines([]);
    delete res.pbpLines;
    const out = getNarrationPbp(res, east, west);
    expect(out.length).toBeGreaterThanOrEqual(4);
    expect(out.some((l) => l.phase === "finish")).toBe(true);
    expect(out.every((l) => typeof l.text === "string" && l.text.length > 2)).toBe(true);
  });

  it("appends kinboshi line to fallback when result.isKinboshi", () => {
    const res = resultWithLines([], { isKinboshi: true });
    delete res.pbpLines;
    const out = getNarrationPbp(res, east, west);
    expect(out.some((l) => l.tags?.includes("kinboshi"))).toBe(true);
  });
});

describe("classifyLine", () => {
  it("flags stakes-tagged dramatic lines as headline", () => {
    const l = line({
      text: "KINBOSHI! The Yokozuna falls!",
      voice: "dramatic",
      tags: ["kinboshi"],
      phase: "finish",
    });
    expect(classifyLine(l)).toBe("headline");
  });

  it("flags gyoji calls as gyoji", () => {
    expect(classifyLine(line({ text: "Hakkeyoi! Nokotta, nokotta!" }))).toBe("gyoji");
    expect(classifyLine(line({ text: "The gyoji points his gunbai east.", phase: "finish" }))).toBe(
      "gyoji"
    );
  });

  it("flags combat-phase narration as action", () => {
    expect(classifyLine(line({ text: "He drives forward.", phase: "momentum" }))).toBe("action");
    expect(classifyLine(line({ text: "Locked in the clinch.", phase: "clinch" }))).toBe("action");
  });

  it("falls back to setup for unmarked lines", () => {
    expect(classifyLine(line({ text: "The crowd settles.", phase: "opening" }))).toBe("setup");
  });
});

describe("explainerFor", () => {
  it("explains kinboshi in plain language", () => {
    const e = explainerFor(line({ text: "x", tags: ["kinboshi"] }));
    expect(e).toBeTruthy();
    expect(e!.toLowerCase()).toContain("yokozuna");
  });

  it("explains kadoban stakes", () => {
    const e = explainerFor(line({ text: "x", tags: ["kadoban"] }));
    expect(e!.toLowerCase()).toContain("ozeki");
  });

  it("explains henka", () => {
    const e = explainerFor(line({ text: "x", tags: ["henka"] }));
    expect(e!.toLowerCase()).toContain("sidestep");
  });

  it("explains mono-ii", () => {
    const e = explainerFor(line({ text: "x", tags: ["mono_ii"] }));
    expect(e!.toLowerCase()).toContain("judges");
  });

  it("explains the ritual phase for newcomers", () => {
    const e = explainerFor(line({ text: "x", phase: "ritual" }));
    expect(e).toBeTruthy();
  });

  it("returns null for self-explanatory action lines", () => {
    expect(explainerFor(line({ text: "x", phase: "momentum" }))).toBeNull();
  });
});

describe("badgesForLine", () => {
  it("maps stakes tags to badge labels", () => {
    const badges = badgesForLine(line({ text: "x", tags: ["kinboshi", "upset", "kadoban"] }));
    const labels = badges.map((b) => b.label);
    expect(labels).toContain("KINBOSHI");
    expect(labels).toContain("UPSET");
    expect(labels).toContain("KADOBAN");
  });

  it("ignores non-badgeable tags", () => {
    const badges = badgesForLine(line({ text: "x", tags: ["crowd_roar", "body_type"] }));
    expect(badges).toHaveLength(0);
  });
});

describe("selectHeadlineIndex", () => {
  it("prefers a kinboshi-tagged line over generic action", () => {
    const lines = [
      line({ text: "They clash.", phase: "tachiai" }),
      line({ text: "He pushes.", phase: "momentum" }),
      line({ text: "Kinboshi!", phase: "finish", tags: ["kinboshi"], voice: "dramatic" }),
    ];
    expect(selectHeadlineIndex(lines)).toBe(2);
  });

  it("prefers title stakes over a plain finish", () => {
    const lines = [
      line({ text: "Yorikiri!", phase: "finish", voice: "dramatic" }),
      line({ text: "The yusho race tightens.", phase: "post_bout", tags: ["title_stakes"] }),
    ];
    expect(selectHeadlineIndex(lines)).toBe(1);
  });

  it("falls back to the last line when nothing is tagged", () => {
    const lines = [line({ text: "a", phase: "opening" }), line({ text: "b", phase: "finish" })];
    expect(selectHeadlineIndex(lines)).toBe(1);
    expect(selectHeadlineIndex([])).toBe(-1);
  });
});
