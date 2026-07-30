/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */
import { describe, it, expect } from "vitest";
import { recordCareerHighlight, getFavoriteHighlight } from "@/engine/bout/CareerHighlights";
import { mockRikishi } from "../utils";
import type { Rikishi } from "@/engine/types/rikishi";

describe("Career Highlights System (B7)", () => {
  it("recordCareerHighlight adds a debut_win highlight", () => {
    const r = mockRikishi("ch-1", {
      careerHighlights: [],
    } as any);

    const updated = recordCareerHighlight(r, {
      type: "debut_win",
      basho: "2025-hatsu",
      description: "First career win against WestMan",
    });

    expect(updated.careerHighlights).toHaveLength(1);
    expect(updated.careerHighlights![0].type).toBe("debut_win");
    expect(updated.careerHighlights![0].basho).toBe("2025-hatsu");
  });

  it("recordCareerHighlight adds a seven_seven_win highlight", () => {
    const r = mockRikishi("ch-2", {
      careerHighlights: [],
    } as any);

    const updated = recordCareerHighlight(r, {
      type: "seven_seven_win",
      basho: "2025-natsu",
      opponent: "west-1",
      description: "Won 7-7 pressure bout on day 14",
    });

    expect(updated.careerHighlights![0].type).toBe("seven_seven_win");
    expect(updated.careerHighlights![0].opponent).toBe("west-1");
  });

  it("recordCareerHighlight adds a kinboshi highlight", () => {
    const r = mockRikishi("ch-3", {
      careerHighlights: [],
    } as any);

    const updated = recordCareerHighlight(r, {
      type: "kinboshi",
      basho: "2025-akyu",
      opponent: "yokozuna-1",
      description: "Upset win over yokozuna",
    });

    expect(updated.careerHighlights![0].type).toBe("kinboshi");
  });

  it("recordCareerHighlight adds a yusho highlight", () => {
    const r = mockRikishi("ch-4", {
      careerHighlights: [],
    } as any);

    const updated = recordCareerHighlight(r, {
      type: "yusho",
      basho: "2025-haru",
      description: "Tournament championship",
    });

    expect(updated.careerHighlights![0].type).toBe("yusho");
  });

  it("recordCareerHighlight adds a playoff_win highlight", () => {
    const r = mockRikishi("ch-5", {
      careerHighlights: [],
    } as any);

    const updated = recordCareerHighlight(r, {
      type: "playoff_win",
      basho: "2025-nagoya",
      opponent: "rival-1",
      description: "Won playoff for yusho",
    });

    expect(updated.careerHighlights![0].type).toBe("playoff_win");
  });

  it("recordCareerHighlight appends to existing highlights", () => {
    const r = mockRikishi("ch-6", {
      careerHighlights: [
        { type: "debut_win", basho: "2024-hatsu", description: "First win" },
      ],
    } as any);

    const updated = recordCareerHighlight(r, {
      type: "kinboshi",
      basho: "2025-natsu",
      opponent: "yok-1",
      description: "Upset over yokozuna",
    });

    expect(updated.careerHighlights).toHaveLength(2);
  });

  it("getFavoriteHighlight returns the most significant highlight", () => {
    const r = mockRikishi("ch-7", {
      careerHighlights: [
        { type: "debut_win", basho: "2024-hatsu", description: "First win" },
        { type: "yusho", basho: "2025-haru", description: "Tournament win" },
        { type: "kinboshi", basho: "2025-natsu", opponent: "yok-1", description: "Upset" },
      ],
    } as any);

    const favorite = getFavoriteHighlight(r);
    expect(favorite).toBeDefined();
    expect(favorite!.type).toBe("yusho"); // yusho is highest priority
  });

  it("getFavoriteHighlight returns undefined when no highlights", () => {
    const r = mockRikishi("ch-8", {} as any);
    expect(getFavoriteHighlight(r)).toBeUndefined();
  });

  it("getFavoriteHighlight prioritizes yusho over kinboshi", () => {
    const r = mockRikishi("ch-9", {
      careerHighlights: [
        { type: "kinboshi", basho: "2025-natsu", description: "Upset" },
        { type: "yusho", basho: "2025-haru", description: "Tournament win" },
      ],
    } as any);

    const favorite = getFavoriteHighlight(r);
    expect(favorite!.type).toBe("yusho");
  });
});
