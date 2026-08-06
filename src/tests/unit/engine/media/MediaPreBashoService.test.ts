 
import { describe, it, expect } from "vitest";
import { buildMediaDigest } from "@/engine/systems/media/MediaPreBashoService";
import { MockFactory } from "../../../helpers/utils/MockFactory";
import type { MediaHeadline } from "@/engine/types/media";

function makeHeadline(overrides: Partial<MediaHeadline> = {}): MediaHeadline {
  return {
    id: "h1",
    week: 1,
    tier: "national",
    beat: "rivalry",
    tone: "dramatic",
    rikishiIds: [],
    heyaIds: [],
    title: "Test Headline",
    impact: 50,
    tags: [],
    ...overrides,
  } as MediaHeadline;
}

describe("buildMediaDigest", () => {
  it("returns empty digest when mediaState is undefined", () => {
    const world = MockFactory.createWorld({ mediaState: undefined } as any);
    const digest = buildMediaDigest(world);
    expect(digest.topHeadlines).toEqual([]);
    expect(digest.hotRikishi).toEqual([]);
    expect(digest.hotHeya).toEqual([]);
    expect(digest.weeklyGazette).toEqual([]);
  });

  it("returns weeklyGazette with only non-empty titles", () => {
    const world = MockFactory.createWorld({
      mediaState: {
        version: "1.0.0",
        headlines: [
          makeHeadline({ id: "h1", title: "Valid Title", impact: 90 }),
          makeHeadline({ id: "h2", title: "", impact: 80 }),
          makeHeadline({ id: "h3", title: "Another Valid", impact: 70 }),
        ],
        mediaHeat: {},
        heyaPressure: {},
        bashoStreaks: {},
        streakHeadlinesFired: {},
        promoWatchFired: {},
        retirementWatchFired: {},
        titleRaceDayFired: {},
        injuryWithdrawalFired: {},
        mediaHeatHistory: {},
        absenceAnnouncements: [],
      } as any,
    } as any);
    const digest = buildMediaDigest(world);
    expect(digest.weeklyGazette).toEqual(["Valid Title", "Another Valid"]);
  });

  it("returns empty weeklyGazette when no headlines have titles", () => {
    const world = MockFactory.createWorld({
      mediaState: {
        version: "1.0.0",
        headlines: [
          makeHeadline({ id: "h1", title: "", impact: 90 }),
          makeHeadline({ id: "h2", title: "", impact: 80 }),
        ],
        mediaHeat: {},
        heyaPressure: {},
        bashoStreaks: {},
        streakHeadlinesFired: {},
        promoWatchFired: {},
        retirementWatchFired: {},
        titleRaceDayFired: {},
        injuryWithdrawalFired: {},
        mediaHeatHistory: {},
        absenceAnnouncements: [],
      } as any,
    } as any);
    const digest = buildMediaDigest(world);
    expect(digest.weeklyGazette).toEqual([]);
  });

  it("returns hotRikishi sorted by heat descending", () => {
    const world = MockFactory.createWorld({
      rikishi: new Map([
        ["r1", MockFactory.createRikishi("r1", { shikona: "Alpha" })],
        ["r2", MockFactory.createRikishi("r2", { shikona: "Beta" })],
        ["r3", MockFactory.createRikishi("r3", { shikona: "Gamma" })],
      ]),
      mediaState: {
        version: "1.0.0",
        headlines: [],
        mediaHeat: { r1: 30, r2: 80, r3: 50 },
        heyaPressure: {},
        bashoStreaks: {},
        streakHeadlinesFired: {},
        promoWatchFired: {},
        retirementWatchFired: {},
        titleRaceDayFired: {},
        injuryWithdrawalFired: {},
        mediaHeatHistory: {},
        absenceAnnouncements: [],
      } as any,
    } as any);
    const digest = buildMediaDigest(world);
    expect(digest.hotRikishi.length).toBe(3);
    expect(digest.hotRikishi[0].id).toBe("r2");
    expect(digest.hotRikishi[1].id).toBe("r3");
    expect(digest.hotRikishi[2].id).toBe("r1");
  });

  it("returns hotHeya sorted by pressure descending", () => {
    const world = MockFactory.createWorld({
      heyas: new Map([
        ["h1", MockFactory.createHeya("h1", { name: "Stable One" })],
        ["h2", MockFactory.createHeya("h2", { name: "Stable Two" })],
      ]),
      mediaState: {
        version: "1.0.0",
        headlines: [],
        mediaHeat: {},
        heyaPressure: { h1: 20, h2: 60 },
        bashoStreaks: {},
        streakHeadlinesFired: {},
        promoWatchFired: {},
        retirementWatchFired: {},
        titleRaceDayFired: {},
        injuryWithdrawalFired: {},
        mediaHeatHistory: {},
        absenceAnnouncements: [],
      } as any,
    } as any);
    const digest = buildMediaDigest(world);
    expect(digest.hotHeya.length).toBe(2);
    expect(digest.hotHeya[0].id).toBe("h2");
    expect(digest.hotHeya[1].id).toBe("h1");
  });

  it("limits topHeadlines to 5 sorted by impact", () => {
    const headlines: MediaHeadline[] = [];
    for (let i = 0; i < 8; i++) {
      headlines.push(
        makeHeadline({ id: `h${i}`, title: `Title ${i}`, impact: i * 10 })
      );
    }
    const world = MockFactory.createWorld({
      mediaState: {
        version: "1.0.0",
        headlines,
        mediaHeat: {},
        heyaPressure: {},
        bashoStreaks: {},
        streakHeadlinesFired: {},
        promoWatchFired: {},
        retirementWatchFired: {},
        titleRaceDayFired: {},
        injuryWithdrawalFired: {},
        mediaHeatHistory: {},
        absenceAnnouncements: [],
      } as any,
    } as any);
    const digest = buildMediaDigest(world);
    expect(digest.topHeadlines.length).toBe(5);
    expect(digest.topHeadlines[0].impact).toBe(70);
    expect(digest.topHeadlines[4].impact).toBe(30);
  });
});
