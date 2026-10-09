/**
 * Golden-master characterization for EventBus — a 568-LOC const-object
 * handler map targeted by Phase-2 splits (existing coverage: ~6 tests).
 * Every factory is exercised against a seeded world; the returned event
 * object and the world event log are snapshotted byte-exact.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { EventBus } from "@/engine/EventBus";
import { BardEngine } from "@/engine/bard/BardEngine";
import { makeMockWorld, mockRikishi, makeMockHeya } from "../utils";
import type { WorldState } from "@/engine/types/world";
import type { NarrativeContext } from "@/engine/types/events";

function seededWorld(): WorldState {
  const east = mockRikishi("r-east", { shikona: "Eastho", heyaId: "heya-1" });
  const west = mockRikishi("r-west", { shikona: "Westzan", heyaId: "heya-2" });
  const heya1 = makeMockHeya("heya-1", { name: "East Stable" });
  const heya2 = makeMockHeya("heya-2", { name: "West Stable" });
  return makeMockWorld({
    rikishi: new Map([[east.id, east], [west.id, west]]),
    heyas: new Map([[heya1.id, heya1], [heya2.id, heya2]]),
    activeRikishiIds: new Set([east.id, west.id]),
    year: 2026,
    week: 5,
    dayIndexGlobal: 61,
  });
}

/** Snapshot only the contract surface — event fields + resulting log tail. */
function eventDigest(world: WorldState, ev: unknown) {
  return {
    event: ev,
    logTail: world.events?.log?.slice(-3) ?? [],
    logLen: world.events?.log?.length ?? 0,
  };
}

const CTX: NarrativeContext = {
  rikishiId: "r-east",
  winnerRikishiId: "r-east",
  loserRikishiId: "r-west",
  eastRikishiId: "r-east",
  westRikishiId: "r-west",
  status: "injured",
  incident: "scandal",
  day: 8,
  heat: 80,
} as NarrativeContext;

describe("EventBus — golden master", () => {
  beforeEach(() => BardEngine.resetCache());

  it("medicalReportBase", () => {
    const w = seededWorld();
    expect(eventDigest(w, EventBus.medicalReportBase(w, CTX, "major"))).toMatchSnapshot();
  });
  it("governanceRuling (default + explicit importance)", () => {
    const w = seededWorld();
    const a = EventBus.governanceRuling(w, "heya-1", CTX);
    const b = EventBus.governanceRuling(w, "heya-1", CTX, "minor");
    expect(eventDigest(w, [a, b])).toMatchSnapshot();
  });
  it("trainingUpdate", () => {
    const w = seededWorld();
    expect(eventDigest(w, EventBus.trainingUpdate(w, CTX))).toMatchSnapshot();
  });
  it("financialAlert (regular + insolvency)", () => {
    const w = seededWorld();
    const a = EventBus.financialAlert(w, "heya-1", CTX);
    const b = EventBus.financialAlert(w, "heya-1", { ...CTX, incident: "insolvency" });
    expect(eventDigest(w, [a, b])).toMatchSnapshot();
  });
  it("awardConferred", () => {
    const w = seededWorld();
    expect(eventDigest(w, EventBus.awardConferred(w, { ...CTX, status: "gino-sho" }))).toMatchSnapshot();
  });
  it("lifecycleEvent (injury + retirement importance switch)", () => {
    const w = seededWorld();
    const a = EventBus.lifecycleEvent(w, CTX);
    const b = EventBus.lifecycleEvent(w, { ...CTX, status: "retirement" });
    expect(eventDigest(w, [a, b])).toMatchSnapshot();
  });
  it("bashoStatus (mid-day + headline day-15)", () => {
    const w = seededWorld();
    const a = EventBus.bashoStatus(w, { ...CTX, status: "day_update", day: 8 });
    const b = EventBus.bashoStatus(w, { ...CTX, status: "ended", day: 15 });
    expect(eventDigest(w, [a, b])).toMatchSnapshot();
  });
  it("welfareCompliance (warning + sanctioned)", () => {
    const w = seededWorld();
    const a = EventBus.welfareCompliance(w, "heya-1", { ...CTX, status: "warning" });
    const b = EventBus.welfareCompliance(w, "heya-1", { ...CTX, status: "sanctioned" });
    expect(eventDigest(w, [a, b])).toMatchSnapshot();
  });
  it("boutResolved (normal + kinboshi headline)", () => {
    const w = seededWorld();
    const a = EventBus.boutResolved(w, CTX);
    const b = EventBus.boutResolved(w, { ...CTX, isKinboshi: true });
    expect(eventDigest(w, [a, b])).toMatchSnapshot();
  });
  it("recruitDiscovered", () => {
    const w = seededWorld();
    expect(eventDigest(w, EventBus.recruitDiscovered(w, CTX))).toMatchSnapshot();
  });
  it("monthlyFinanceReport", () => {
    const w = seededWorld();
    expect(eventDigest(w, EventBus.monthlyFinanceReport(w, { ...CTX, heya: "East Stable" }))).toMatchSnapshot();
  });
  it("rivalryHeatSpike (heat<=75 vs >75 importance)", () => {
    const w = seededWorld();
    const a = EventBus.rivalryHeatSpike(w, { ...CTX, heat: 50 });
    const b = EventBus.rivalryHeatSpike(w, { ...CTX, heat: 80 });
    expect(eventDigest(w, [a, b])).toMatchSnapshot();
  });
  it("oyakataMoodShift", () => {
    const w = seededWorld();
    expect(eventDigest(w, EventBus.oyakataMoodShift(w, "heya-1", CTX))).toMatchSnapshot();
  });
  it("managementDecision (default + explicit importance)", () => {
    const w = seededWorld();
    const a = EventBus.managementDecision(w, "heya-1", CTX);
    const b = EventBus.managementDecision(w, "heya-1", CTX, "major");
    expect(eventDigest(w, [a, b])).toMatchSnapshot();
  });
  it("strategyShift", () => {
    const w = seededWorld();
    expect(eventDigest(w, EventBus.strategyShift(w, "heya-1", CTX))).toMatchSnapshot();
  });
  it("facilityUpdate (UPGRADED + DEGRADED)", () => {
    const w = seededWorld();
    const a = EventBus.facilityUpdate(w, "heya-1", CTX, "UPGRADED");
    const b = EventBus.facilityUpdate(w, "heya-1", CTX, "DEGRADED");
    expect(eventDigest(w, [a, b])).toMatchSnapshot();
  });
  it("rosterEvent", () => {
    const w = seededWorld();
    expect(eventDigest(w, EventBus.rosterEvent(w, "heya-1", CTX))).toMatchSnapshot();
  });
  it("prestigeEvent", () => {
    const w = seededWorld();
    expect(eventDigest(w, EventBus.prestigeEvent(w, "heya-1", CTX))).toMatchSnapshot();
  });
  it("lifecycleAction (naturalization + merger)", () => {
    const w = seededWorld();
    const a = EventBus.lifecycleAction(w, CTX, "naturalization");
    const b = EventBus.lifecycleAction(w, { ...CTX, rikishiId: undefined }, "merger");
    expect(eventDigest(w, [a, b])).toMatchSnapshot();
  });
  it("financialAction (loan + market)", () => {
    const w = seededWorld();
    const a = EventBus.financialAction(w, "heya-1", CTX, "loan");
    const b = EventBus.financialAction(w, "heya-1", CTX, "market");
    expect(eventDigest(w, [a, b])).toMatchSnapshot();
  });
});
