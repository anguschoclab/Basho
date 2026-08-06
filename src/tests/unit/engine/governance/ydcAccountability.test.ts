 
import { describe, it, expect } from "vitest";
import { KihakuService } from "@/engine/systems/governance/KihakuService";
import { YokozunaService } from "@/engine/systems/governance/YokozunaService";
import { makeMockWorld, mockRikishi } from "../utils";

describe("KihakuService — Fighting Spirit Score", () => {
  it("returns 50 (neutral default) when hasMetrics is false", () => {
    const score = KihakuService.calculateScore({
      comebackWins: 0,
      edgeCrisisSurvived: 0,
      playoffWins: 0,
      yushoContentionWins: 0,
      isMakeKoshi: false,
      absentFinalDay: false,
      hasMetrics: false,
    });
    expect(score).toBe(50);
  });

  it("returns 0 for a rikishi with metrics but all zeros and make-koshi + absentFinalDay", () => {
    const score = KihakuService.calculateScore({
      comebackWins: 0,
      edgeCrisisSurvived: 0,
      playoffWins: 0,
      yushoContentionWins: 0,
      isMakeKoshi: true,
      absentFinalDay: true,
      hasMetrics: true,
    });
    expect(score).toBe(0);
  });

  it("awards +15 per comeback win", () => {
    const score = KihakuService.calculateScore({
      comebackWins: 2,
      edgeCrisisSurvived: 0,
      playoffWins: 0,
      yushoContentionWins: 0,
      isMakeKoshi: false,
      absentFinalDay: false,
      hasMetrics: true,
    });
    expect(score).toBe(30);
  });

  it("awards +10 per edge crisis survived", () => {
    const score = KihakuService.calculateScore({
      comebackWins: 0,
      edgeCrisisSurvived: 3,
      playoffWins: 0,
      yushoContentionWins: 0,
      isMakeKoshi: false,
      absentFinalDay: false,
      hasMetrics: true,
    });
    expect(score).toBe(30);
  });

  it("awards +20 per playoff win", () => {
    const score = KihakuService.calculateScore({
      comebackWins: 0,
      edgeCrisisSurvived: 0,
      playoffWins: 2,
      yushoContentionWins: 0,
      isMakeKoshi: false,
      absentFinalDay: false,
      hasMetrics: true,
    });
    expect(score).toBe(40);
  });

  it("awards +8 per yusho-contention win", () => {
    const score = KihakuService.calculateScore({
      comebackWins: 0,
      edgeCrisisSurvived: 0,
      playoffWins: 0,
      yushoContentionWins: 3,
      isMakeKoshi: false,
      absentFinalDay: false,
      hasMetrics: true,
    });
    expect(score).toBe(24);
  });

  it("applies -20 for make-koshi", () => {
    const score = KihakuService.calculateScore({
      comebackWins: 2,
      edgeCrisisSurvived: 0,
      playoffWins: 0,
      yushoContentionWins: 0,
      isMakeKoshi: true,
      absentFinalDay: false,
      hasMetrics: true,
    });
    expect(score).toBe(10); // 30 - 20 = 10
  });

  it("applies -25 for absentFinalDay", () => {
    const score = KihakuService.calculateScore({
      comebackWins: 2,
      edgeCrisisSurvived: 0,
      playoffWins: 0,
      yushoContentionWins: 0,
      isMakeKoshi: false,
      absentFinalDay: true,
      hasMetrics: true,
    });
    expect(score).toBe(5); // 30 - 25 = 5
  });

  it("clamps score to 100 max", () => {
    const score = KihakuService.calculateScore({
      comebackWins: 10,
      edgeCrisisSurvived: 10,
      playoffWins: 5,
      yushoContentionWins: 5,
      isMakeKoshi: false,
      absentFinalDay: false,
      hasMetrics: true,
    });
    expect(score).toBe(100);
  });

  it("clamps score to 0 min", () => {
    const score = KihakuService.calculateScore({
      comebackWins: 0,
      edgeCrisisSurvived: 0,
      playoffWins: 0,
      yushoContentionWins: 0,
      isMakeKoshi: true,
      absentFinalDay: true,
      hasMetrics: true,
    });
    expect(score).toBe(0);
  });

  it("extracts from basho state with no bout metrics gracefully", () => {
    const basho = {
      boutMetrics: undefined,
      standings: new Map([["r1", { wins: 10, losses: 5, absences: 0 }]]),
      matches: [],
    } as any;
    const input = KihakuService.extractFromBasho("r1", basho, 10, false);
    expect(input.comebackWins).toBe(0);
    expect(input.edgeCrisisSurvived).toBe(0);
    expect(input.playoffWins).toBe(0);
    expect(input.isMakeKoshi).toBe(false);
    expect(input.absentFinalDay).toBe(false);
    expect(input.hasMetrics).toBe(false);
  });
});

describe("YokozunaService — YDC Accountability", () => {
  it("fires praise event for kachi-koshi Yokozuna with high kihaku score", () => {
    const yokozuna = mockRikishi("y1", {
      rank: "yokozuna",
      division: "makuuchi",
      shikona: "Yokozuna Taro",
      currentBashoWins: 12,
      currentBashoLosses: 3,
      kihakuIsenScore: 85,
      consecutiveMakeKoshi: 0,
      heyaId: "heya-1",
    });

    const world = makeMockWorld({
      rikishi: new Map([["y1", yokozuna]]),
      year: 2025,
      currentBashoName: "hatsu",
    });

    const impact = YokozunaService.processYDCCouncil(world);
    const praiseEvent = impact.events?.find(
      (e) => (e.data as any).status === "praise"
    );
    expect(praiseEvent).toBeDefined();
    expect(praiseEvent?.type).toBe("GOVERNANCE_RULING");
    expect((praiseEvent!.data as any).shikona).toBe("Yokozuna Taro");
  });

  it("fires warning event for make-koshi Yokozuna", () => {
    const yokozuna = mockRikishi("y2", {
      rank: "yokozuna",
      division: "makuuchi",
      shikona: "Struggling Yoko",
      currentBashoWins: 5,
      currentBashoLosses: 10,
      consecutiveMakeKoshi: 1,
      heyaId: "heya-1",
    });

    const world = makeMockWorld({
      rikishi: new Map([["y2", yokozuna]]),
      year: 2025,
      currentBashoName: "nagoya",
    });

    const impact = YokozunaService.processYDCCouncil(world);
    const warningEvent = impact.events?.find(
      (e) => (e.data as any).status === "warning"
    );
    expect(warningEvent).toBeDefined();
    expect(warningEvent?.type).toBe("GOVERNANCE_RULING");
  });

  it("fires demand_reflection for 2+ consecutive make-koshi", () => {
    const yokozuna = mockRikishi("y3", {
      rank: "yokozuna",
      division: "makuuchi",
      shikona: "Falling Star",
      currentBashoWins: 6,
      currentBashoLosses: 9,
      consecutiveMakeKoshi: 2,
      heyaId: "heya-1",
    });

    const world = makeMockWorld({
      rikishi: new Map([["y3", yokozuna]]),
      year: 2025,
      currentBashoName: "aki",
    });

    const impact = YokozunaService.processYDCCouncil(world);
    const reflectionEvent = impact.events?.find(
      (e) => (e.data as any).status === "demand_reflection"
    );
    expect(reflectionEvent).toBeDefined();
  });

  it("fires private_cynicism for 3+ consecutive make-koshi", () => {
    const yokozuna = mockRikishi("y4", {
      rank: "yokozuna",
      division: "makuuchi",
      shikona: "Lost Soul",
      currentBashoWins: 4,
      currentBashoLosses: 11,
      consecutiveMakeKoshi: 3,
      heyaId: "heya-1",
    });

    const world = makeMockWorld({
      rikishi: new Map([["y4", yokozuna]]),
      year: 2025,
      currentBashoName: "kyushu",
    });

    const impact = YokozunaService.processYDCCouncil(world);
    const cynicismEvent = impact.events?.find(
      (e) => (e.data as any).status === "private_cynicism"
    );
    expect(cynicismEvent).toBeDefined();
    expect(cynicismEvent?.importance).toBe("minor");
  });

  it("fires absence_criticism when absentFinalDay is true", () => {
    const yokozuna = mockRikishi("y5", {
      rank: "yokozuna",
      division: "makuuchi",
      shikona: "Absent Yoko",
      currentBashoWins: 10,
      currentBashoLosses: 4,
      absentFinalDay: true,
      consecutiveMakeKoshi: 0,
      kihakuIsenScore: 60,
      heyaId: "heya-1",
    });

    const world = makeMockWorld({
      rikishi: new Map([["y5", yokozuna]]),
      year: 2025,
      currentBashoName: "hatsu",
    });

    const impact = YokozunaService.processYDCCouncil(world);
    const absenceEvent = impact.events?.find(
      (e) => (e.data as any).status === "absence_criticism"
    );
    expect(absenceEvent).toBeDefined();
    expect(absenceEvent?.type).toBe("GOVERNANCE_RULING");
  });

  it("fires encouragement for kachi-koshi with moderate kihaku score (50-74)", () => {
    const yokozuna = mockRikishi("y6", {
      rank: "yokozuna",
      division: "makuuchi",
      shikona: "Steady Yoko",
      currentBashoWins: 9,
      currentBashoLosses: 6,
      kihakuIsenScore: 60,
      consecutiveMakeKoshi: 0,
      heyaId: "heya-1",
    });

    const world = makeMockWorld({
      rikishi: new Map([["y6", yokozuna]]),
      year: 2025,
      currentBashoName: "hatsu",
    });

    const impact = YokozunaService.processYDCCouncil(world);
    const encouragementEvent = impact.events?.find(
      (e) => (e.data as any).status === "encouragement"
    );
    expect(encouragementEvent).toBeDefined();
  });

  it("does NOT fire any accountability events for non-Yokozuna rikishi", () => {
    const ozeki = mockRikishi("o1", {
      rank: "ozeki",
      division: "makuuchi",
      shikona: "Ozeki Jiro",
      currentBashoWins: 5,
      currentBashoLosses: 10,
      consecutiveMakeKoshi: 1,
      heyaId: "heya-1",
    });

    const world = makeMockWorld({
      rikishi: new Map([["o1", ozeki]]),
      year: 2025,
      currentBashoName: "hatsu",
    });

    const impact = YokozunaService.processYDCCouncil(world);
    const accountabilityEvents = impact.events?.filter(
      (e) =>
        (e.data as any).status === "warning" ||
        (e.data as any).status === "praise" ||
        (e.data as any).status === "absence_criticism" ||
        (e.data as any).status === "encouragement" ||
        (e.data as any).status === "demand_reflection" ||
        (e.data as any).status === "private_cynicism"
    );
    // Ozeki should not trigger Yokozuna accountability events
    // (they may trigger promotion deliberation events, but not accountability)
    expect(accountabilityEvents?.length ?? 0).toBe(0);
  });

  it("uses GOVERNANCE_RULING event type (not YOKOZUNA_DELIBERATION)", () => {
    const yokozuna = mockRikishi("y7", {
      rank: "yokozuna",
      division: "makuuchi",
      shikona: "Test Yoko",
      currentBashoWins: 5,
      currentBashoLosses: 10,
      consecutiveMakeKoshi: 1,
      heyaId: "heya-1",
    });

    const world = makeMockWorld({
      rikishi: new Map([["y7", yokozuna]]),
      year: 2025,
      currentBashoName: "hatsu",
    });

    const impact = YokozunaService.processYDCCouncil(world);
    const hasOldType = impact.events?.some((e) => (e.type as string) === "YOKOZUNA_DELIBERATION");
    expect(hasOldType).toBe(false);
    const hasNewType = impact.events?.some((e) => e.type === "GOVERNANCE_RULING");
    expect(hasNewType).toBe(true);
  });

  it("includes chairmanName in accountability events", () => {
    const yokozuna = mockRikishi("y8", {
      rank: "yokozuna",
      division: "makuuchi",
      shikona: "Chairman Test",
      currentBashoWins: 5,
      currentBashoLosses: 10,
      consecutiveMakeKoshi: 1,
      heyaId: "heya-1",
    });

    const world = makeMockWorld({
      rikishi: new Map([["y8", yokozuna]]),
      year: 2025,
      currentBashoName: "hatsu",
    });

    const impact = YokozunaService.processYDCCouncil(world);
    const warningEvent = impact.events?.find(
      (e) => (e.data as any).status === "warning"
    );
    expect(warningEvent).toBeDefined();
    expect((warningEvent!.data as any).chairmanName).toBeDefined();
    expect(typeof (warningEvent!.data as any).chairmanName).toBe("string");
  });

  it("includes references array in accountability events", () => {
    const yokozuna = mockRikishi("y9", {
      rank: "yokozuna",
      division: "makuuchi",
      shikona: "Ref Test",
      currentBashoWins: 5,
      currentBashoLosses: 10,
      consecutiveMakeKoshi: 2,
      heyaId: "heya-1",
    });

    const world = makeMockWorld({
      rikishi: new Map([["y9", yokozuna]]),
      year: 2025,
      currentBashoName: "hatsu",
    });

    const impact = YokozunaService.processYDCCouncil(world);
    const reflectionEvent = impact.events?.find(
      (e) => (e.data as any).status === "demand_reflection"
    );
    expect(reflectionEvent).toBeDefined();
    const refs = (reflectionEvent!.data as any).references;
    expect(Array.isArray(refs)).toBe(true);
    expect(refs).toContain("make-koshi record");
    expect(refs).toContain("promotion pledge");
  });

  it("includes publicStatement and privateSentiment in accountability events", () => {
    const yokozuna = mockRikishi("y10", {
      rank: "yokozuna",
      division: "makuuchi",
      shikona: "Sentiment Test",
      currentBashoWins: 4,
      currentBashoLosses: 11,
      consecutiveMakeKoshi: 3,
      heyaId: "heya-1",
    });

    const world = makeMockWorld({
      rikishi: new Map([["y10", yokozuna]]),
      year: 2025,
      currentBashoName: "hatsu",
    });

    const impact = YokozunaService.processYDCCouncil(world);
    const cynicismEvent = impact.events?.find(
      (e) => (e.data as any).status === "private_cynicism"
    );
    expect(cynicismEvent).toBeDefined();
    expect((cynicismEvent!.data as any).publicStatement).toBeDefined();
    expect((cynicismEvent!.data as any).privateSentiment).toBeDefined();
    // Private sentiment should differ from public statement for cynicism events
    expect((cynicismEvent!.data as any).privateSentiment).not.toBe(
      (cynicismEvent!.data as any).publicStatement
    );
  });
});
