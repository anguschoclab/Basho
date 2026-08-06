 
import { describe, it, expect } from "vitest";
import {
  calculateKachiNokori,
  getKachiNokoriForRikishi,
  buildPostBashoPayload,
  kachiNokoriToMochikyukinPoints,
  KACHI_NOKORI_THRESHOLD,
} from "@/engine/systems/economy/KachiNokoriService";
import { mockRikishi } from "../utils";

describe("calculateKachiNokori", () => {
  it("returns 0 when wins <= 8", () => {
    expect(calculateKachiNokori(0)).toBe(0);
    expect(calculateKachiNokori(7)).toBe(0);
    expect(calculateKachiNokori(8)).toBe(0);
  });

  it("returns wins - 8 when wins > 8", () => {
    expect(calculateKachiNokori(9)).toBe(1);
    expect(calculateKachiNokori(10)).toBe(2);
    expect(calculateKachiNokori(15)).toBe(7);
  });

  it("KACHI_NOKORI_THRESHOLD is 8", () => {
    expect(KACHI_NOKORI_THRESHOLD).toBe(8);
  });
});

describe("getKachiNokoriForRikishi", () => {
  it("returns kachi-nokori for makuuchi rikishi", () => {
    const riki = mockRikishi("r-1", {
      division: "makuuchi",
      currentBashoWins: 11,
    });
    expect(getKachiNokoriForRikishi(riki)).toBe(3);
  });

  it("returns kachi-nokori for juryo rikishi", () => {
    const riki = mockRikishi("r-1", {
      division: "juryo",
      currentBashoWins: 10,
    });
    expect(getKachiNokoriForRikishi(riki)).toBe(2);
  });

  it("returns 0 for makushita and below", () => {
    const riki = mockRikishi("r-1", {
      division: "makushita",
      currentBashoWins: 7,
    });
    expect(getKachiNokoriForRikishi(riki)).toBe(0);
  });

  it("returns 0 when wins <= 8 even for sekitori", () => {
    const riki = mockRikishi("r-1", {
      division: "makuuchi",
      currentBashoWins: 7,
    });
    expect(getKachiNokoriForRikishi(riki)).toBe(0);
  });
});

describe("buildPostBashoPayload", () => {
  it("includes kachi-nokori field", () => {
    const riki = mockRikishi("r-1", { shikona: "Test Rikishi" });
    const payload = buildPostBashoPayload(riki, 11, 4);
    expect(payload.kachiNokori).toBe(3);
  });

  it("includes wins and losses", () => {
    const riki = mockRikishi("r-1", { shikona: "Test Rikishi" });
    const payload = buildPostBashoPayload(riki, 10, 5);
    expect(payload.wins).toBe(10);
    expect(payload.losses).toBe(5);
  });

  it("isKachikoshi is true when wins > losses", () => {
    const riki = mockRikishi("r-1", { shikona: "Test Rikishi" });
    const payload = buildPostBashoPayload(riki, 9, 6);
    expect(payload.isKachikoshi).toBe(true);
    expect(payload.isMakekoshi).toBe(false);
  });

  it("isMakekoshi is true when wins < losses", () => {
    const riki = mockRikishi("r-1", { shikona: "Test Rikishi" });
    const payload = buildPostBashoPayload(riki, 5, 10);
    expect(payload.isKachikoshi).toBe(false);
    expect(payload.isMakekoshi).toBe(true);
  });

  it("kachiNokori is 0 for makekoshi records", () => {
    const riki = mockRikishi("r-1", { shikona: "Test Rikishi" });
    const payload = buildPostBashoPayload(riki, 5, 10);
    expect(payload.kachiNokori).toBe(0);
  });

  it("includes shikona in payload", () => {
    const riki = mockRikishi("r-1", { shikona: "Yokozuna Test" });
    const payload = buildPostBashoPayload(riki, 13, 2);
    expect(payload.shikona).toBe("Yokozuna Test");
  });
});

describe("kachiNokoriToMochikyukinPoints", () => {
  it("converts kachi-nokori to points at given rate", () => {
    expect(kachiNokoriToMochikyukinPoints(3, 0.5)).toBe(1.5);
    expect(kachiNokoriToMochikyukinPoints(5, 1.0)).toBe(5);
  });

  it("returns 0 when kachi-nokori is 0", () => {
    expect(kachiNokoriToMochikyukinPoints(0, 0.5)).toBe(0);
  });
});
