import { describe, it, expect } from "vitest";
import { hometownTier, applyHometownBonus } from "@/engine/basho/geography";
import { generateBoutNarrative } from "@/engine/bout/boutNarrative";
import { BardEngine } from "@/engine/bard/BardEngine";
import { mockRikishi } from "@tests/unit/engine/utils";
import { makeBoutResult, makeBoutWorld } from "@tests/helpers/boutTestHelpers";
import type { BashoName, BoutResult } from "@/engine/types/basho";

/**
 * Home-region effect (W E): the hometown system uses real geography —
 * prefecture-exact for the host city, plus a wider regional tier, so a
 * Kumamoto native gets crowd support at the Kyushu basho in Fukuoka.
 */

const preBoutLines = (r: BoutResult) => (r.pbpLines ?? []).filter((l) => l.phase === "pre_bout");
const postBoutLines = (r: BoutResult) => (r.pbpLines ?? []).filter((l) => l.phase === "post_bout");

describe("hometownTier — prefecture and region matching", () => {
  it("exact prefecture match at the host city → home tier", () => {
    expect(hometownTier("Fukuoka", "Fukuoka")).toBe("home");
    expect(hometownTier("Tokyo", "Tokyo")).toBe("home");
    expect(hometownTier("Osaka", "Osaka")).toBe("home");
  });

  it("host-city-to-prefecture equivalence → home tier", () => {
    // Nagoya sits in Aichi — an Aichi native is home at the Nagoya basho.
    expect(hometownTier("Aichi", "Nagoya")).toBe("home");
  });

  it("same region, different prefecture → region tier", () => {
    // Kyushu basho (Fukuoka): Kumamoto, Nagasaki, and Okinawa natives all
    // get regional crowd support — Okinawa counts as part of Kyushu here.
    expect(hometownTier("Kumamoto", "Fukuoka")).toBe("region");
    expect(hometownTier("Nagasaki", "Fukuoka")).toBe("region");
    expect(hometownTier("Okinawa", "Fukuoka")).toBe("region");
    expect(hometownTier("Kagoshima", "Fukuoka")).toBe("region");
  });

  it("Kansai region at the Osaka basho → region tier", () => {
    expect(hometownTier("Hyogo", "Osaka")).toBe("region");
    expect(hometownTier("Kyoto", "Osaka")).toBe("region");
  });

  it("Kanto region at a Tokyo basho → region tier", () => {
    expect(hometownTier("Kanagawa", "Tokyo")).toBe("region");
    expect(hometownTier("Saitama", "Tokyo")).toBe("region");
  });

  it("Chubu region at the Nagoya basho → region tier", () => {
    expect(hometownTier("Shizuoka", "Nagoya")).toBe("region");
    expect(hometownTier("Gifu", "Nagoya")).toBe("region");
  });

  it("different region → null", () => {
    expect(hometownTier("Tokyo", "Fukuoka")).toBeNull();
    expect(hometownTier("Fukuoka", "Tokyo")).toBeNull();
    expect(hometownTier("Osaka", "Nagoya")).toBeNull();
  });

  it("foreign or missing origins → null", () => {
    expect(hometownTier("Mongolia", "Tokyo")).toBeNull();
    expect(hometownTier(undefined, "Tokyo")).toBeNull();
    expect(hometownTier("Tokyo", undefined)).toBeNull();
  });
});

describe("applyHometownBonus — bout-clone mental boost", () => {
  it("home tier applies a larger mental bonus than region tier", () => {
    const base = mockRikishi("r-1", { mental: 60 });
    const home = applyHometownBonus(base, "home");
    const region = applyHometownBonus(base, "region");

    expect(home.stats!.mental).toBeGreaterThan(base.stats!.mental!);
    expect(region.stats!.mental).toBeGreaterThan(base.stats!.mental!);
    expect(home.stats!.mental!).toBeGreaterThan(region.stats!.mental!);
    // Original rikishi object is untouched — bonus is bout-clone only.
    expect(base.stats!.mental).toBe(60);
  });

  it("null tier is a no-op", () => {
    const base = mockRikishi("r-2", { mental: 60 });
    const out = applyHometownBonus(base, null);
    expect(out.stats!.mental).toBe(60);
  });
});

describe("hometown narrative — region tier", () => {
  it("regional rikishi at the Kyushu basho gets a hometown pre-bout line", () => {
    BardEngine.resetCache();
    const east = mockRikishi("r-east", { shikona: "KumamotoStar", origin: "Kumamoto" });
    const west = mockRikishi("r-west", { shikona: "TokyoMan", origin: "Tokyo" });
    const world = makeBoutWorld(east, west);
    const result = makeBoutResult();

    generateBoutNarrative(result, east, west, "kyushu" as BashoName, 5, "seed-hr-1", world);

    const hometownLines = preBoutLines(result).filter((l) => l.tags?.includes("hometown"));
    expect(hometownLines.length).toBeGreaterThan(0);
    expect(hometownLines.some((l) => l.text.includes("KumamotoStar"))).toBe(true);
  });

  it("exact-prefecture rikishi still gets the home line at Kyushu", () => {
    BardEngine.resetCache();
    const east = mockRikishi("r-east", { shikona: "FukuokaSon", origin: "Fukuoka" });
    const west = mockRikishi("r-west", { shikona: "Outsider", origin: "Aomori" });
    const world = makeBoutWorld(east, west);
    const result = makeBoutResult();

    generateBoutNarrative(result, east, west, "kyushu" as BashoName, 5, "seed-hr-2", world);

    const hometownLines = preBoutLines(result).filter((l) => l.tags?.includes("hometown"));
    expect(hometownLines.length).toBeGreaterThan(0);
  });

  it("an Aichi native at the Nagoya basho is treated as home", () => {
    BardEngine.resetCache();
    const east = mockRikishi("r-east", { shikona: "AichiAce", origin: "Aichi" });
    const west = mockRikishi("r-west", { shikona: "Visitor", origin: "Fukuoka" });
    const world = makeBoutWorld(east, west);
    const result = makeBoutResult();

    generateBoutNarrative(result, east, west, "nagoya" as BashoName, 5, "seed-hr-3", world);

    const hometownLines = preBoutLines(result).filter((l) => l.tags?.includes("hometown"));
    expect(hometownLines.length).toBeGreaterThan(0);
  });

  it("a region-tier winner gets a hometown post-bout line", () => {
    BardEngine.resetCache();
    const winner = mockRikishi("r-east", { shikona: "NagasakiHero", origin: "Nagasaki" });
    const loser = mockRikishi("r-west", { shikona: "AwayMan", origin: "Hokkaido" });
    const world = makeBoutWorld(winner, loser);
    const result = makeBoutResult({
      winner: "east",
      winnerRikishiId: winner.id,
      loserRikishiId: loser.id,
    });

    generateBoutNarrative(result, winner, loser, "kyushu" as BashoName, 5, "seed-hr-4", world);

    const hometownLines = postBoutLines(result).filter((l) => l.tags?.includes("hometown"));
    expect(hometownLines.length).toBeGreaterThan(0);
  });

  it("no hometown line for a non-regional matchup", () => {
    BardEngine.resetCache();
    const east = mockRikishi("r-east", { shikona: "TokyoA", origin: "Tokyo" });
    const west = mockRikishi("r-west", { shikona: "OsakaB", origin: "Osaka" });
    const world = makeBoutWorld(east, west);
    const result = makeBoutResult({
      winner: "east",
      winnerRikishiId: east.id,
      loserRikishiId: west.id,
    });

    generateBoutNarrative(result, east, west, "kyushu" as BashoName, 5, "seed-hr-5", world);

    const hometownLines = (result.pbpLines ?? []).filter((l) => l.tags?.includes("hometown"));
    expect(hometownLines).toHaveLength(0);
  });
});
