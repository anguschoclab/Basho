import { describe, it, expect } from "vitest";
import { fillVacanciesForNPCWithBidding } from "@/engine/generation/TalentPoolNPCRecruitment";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import type { WorldState } from "@/engine/types/world";
import type { Id } from "@/engine/types/common";

/**
 * B1 — §5.4 pursuit reservation. Measured (14-yr probe): foreign signings
 * ran ≈0/yr despite ~2k visible candidates and 10–26 open slots, because a
 * pursuing stable's last vacancy is always spent on higher-amount domestic
 * bids before its foreign bids resolve (`b_void_vacancy` starvation). An
 * above-parity pursuer must hold its final vacancy for that pursuit — the
 * real JSA recruiting posture under the one-foreigner rule.
 */
function makePursuitWorld(vacancyCase: "one" | "two"): WorldState {
  const heyas = new Map();
  const oyakata = new Map();
  const hid = "pursuer" as Id;
  const oid = `oyakata_${hid}` as Id;
  heyas.set(hid, MockFactory.createHeya(hid, { oyakataId: oid, rikishiIds: [] }));
  // Believer quirk: aggression >1 = deliberate foreign pursuit, on a fresh
  // stable that has never fielded a foreigner.
  oyakata.set(
    oid,
    MockFactory.createOyakata(oid, { heyaId: hid, quirks: ["Foreign Talent Believer"] })
  );

  const tp = MockFactory.createTalentPool({});
  // Two strong domestics — their bids outrank any foreign pursuit bid.
  for (const cid of ["dom-1", "dom-2"]) {
    const c = MockFactory.createCandidate(cid as Id, {
      candidateId: cid as Id,
      nationality: "Japan",
      poolType: "high_school",
      talentSeed: 98,
      reputationSeed: 98,
    });
    tp.candidates[cid] = c;
    tp.pools.high_school.candidatesVisible.push(cid);
  }
  // One weak foreigner — loses every head-to-head on bid amount.
  const gaijin = MockFactory.createCandidate("gaijin" as Id, {
    candidateId: "gaijin" as Id,
    nationality: "Mongolia",
    poolType: "foreign",
    talentSeed: 20,
    reputationSeed: 20,
  });
  tp.candidates["gaijin"] = gaijin;
  tp.pools.foreign.candidatesVisible.push("gaijin");

  return MockFactory.createWorld({
    heyas,
    oyakata,
    rikishi: new Map(),
    seed: `foreign-pursuit-${vacancyCase}`,
    talentPool: tp,
  });
}

describe("fillVacanciesForNPCWithBidding — foreign pursuit reservation", () => {
  it("a pursuing stable holds its ONLY vacancy for the foreign bid", () => {
    const world = makePursuitWorld("one");
    const impact = fillVacanciesForNPCWithBidding(world, { pursuer: 1 });
    const signed = impact.collections?.rikishiToAdd ?? [];
    expect(signed.map((r) => r.nationality)).toEqual(["Mongolia"]);
  });

  it("with two vacancies the foreigner fills the held slot, domestics fill the rest", () => {
    const world = makePursuitWorld("two");
    const impact = fillVacanciesForNPCWithBidding(world, { pursuer: 2 });
    const signed = impact.collections?.rikishiToAdd ?? [];
    expect(signed.some((r) => r.nationality === "Mongolia")).toBe(true);
    expect(signed.length).toBe(2);
  });
});
