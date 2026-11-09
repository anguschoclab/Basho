/**
 * v18TalentPool.test.ts
 * ======================
 * Failing-first regression pins for the S7 talent-pool audit findings:
 *
 *  - S7: `reinjectToTalentPool` (src/engine/generation/TalentPoolStateService.ts:82-143)
 *    loses data on released rikishi:
 *      (a) pool classification uses `isForeign` (nationality-only) → naturalized /
 *          dual-citizen rikishi re-enter the "foreign" pool;
 *      (b) the candidate literal drops `dualCitizen`/`citizenshipStatus` → a
 *          re-materialized ex-naturalized rikishi consumes the foreign slot again;
 *      (c) no stats/career are carried → `convertCandidateToRikishi` regenerates
 *          jonokuchi stats and zero career history;
 *      (d) preserved `birthYear` vs pool maxAge 20/24/28 → released veterans are
 *          silently culled at the next `tickTalentPoolYear` refresh.
 *
 *  - S7-34: `countsAsForeignFromRikishi` (src/engine/generation/talentPoolReads.ts:122-124)
 *    is nationality-only, ignoring the citizenship-aware `countsAsForeign` →
 *    naturalized/dual-citizen rikishi wrongly receive the +30 foreign-slot
 *    retention bias in `enforceHardCapRosterOverflow` (src/engine/recruitment/overflow.ts:55).
 *
 *  - S7-42/43: `CandidateGenerator` (src/engine/generation/CandidateGenerator.ts:217-221)
 *    rolls `rng.next() > AMATEUR_STAR_TAG_CHANCE` (≈20%) while the constant
 *    documents an 0.8 chance, and never sets `TalentCandidate.isAmateurStar`,
 *    leaving its readers (src/engine/npc/eventSurfacing.ts:34,
 *    src/pages/CandidatePoolPage.tsx:80) dead.
 *
 *  - S7 prodigy: `convertCandidateToRikishi` (src/engine/generation/CandidateBuilder.ts:363-447)
 *    never propagates `candidate.isEmergentProdigy` — the burnout gate in
 *    weeklyTraining.ts:156 (`rikishi.injuryStatus?.isEmergentProdigy`) is dead code.
 *
 * All pins drive the real production functions + resolveImpacts.
 */
import { describe, it, expect } from "vitest";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import {
  reinjectToTalentPool,
  tickTalentPoolYear,
  finalizeSignedCandidates,
} from "@/engine/generation/TalentPoolService";
import {
  countsAsForeignFromRikishi,
  candidateConsumesForeignSlot,
} from "@/engine/generation/talentPoolReads";
import { enforceHardCapRosterOverflow } from "@/engine/recruitment/overflow";
import { foreignRetentionMultiplier } from "@/engine/npc/ForeignSlotPolicy";
import { countsAsForeign } from "@/engine/utils/citizenshipUtils";
import { convertCandidateToRikishi } from "@/engine/generation/CandidateBuilder";
import { generateCandidate } from "@/engine/generation/CandidateGenerator";
import { AMATEUR_STAR_TAG_CHANCE } from "@/constants/engine/generation";
import { rngFromSeed } from "@/engine/core/rng";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import type { Id } from "@/engine/types/common";
import type { RikishiStats } from "@/engine/types/rikishi";

const YEAR = 2030;
const HEYA = "h-buyer" as Id;

function baseStats(overrides: Partial<RikishiStats> = {}): RikishiStats {
  return {
    power: 82,
    technique: 70,
    speed: 60,
    weight: 160,
    stamina: 70,
    mental: 60,
    adaptability: 50,
    balance: 60,
    aggression: 50,
    experience: 0,
    ...overrides,
  };
}

function worldWithPool(overrides: Parameters<typeof MockFactory.createWorld>[0] = {}) {
  return MockFactory.createWorld({
    seed: "v18-talent-pool",
    year: YEAR,
    heyas: new Map([[HEYA, MockFactory.createHeya(HEYA, { rikishiIds: [] })]]),
    talentPool: MockFactory.createTalentPool(),
    ...overrides,
  });
}

// ── reinjectToTalentPool data loss ──────────────────────────────────────────

describe("reinjectToTalentPool — citizenship and career must survive re-entry", () => {
  it("a dual-citizen released rikishi does not re-enter the foreign pool and keeps citizenship", () => {
    const world = worldWithPool();
    const veteran = MockFactory.createRikishi("v-dual", {
      nationality: "Mongolia",
      citizenshipStatus: "dual",
      origin: "Mongolia",
      birthYear: 2000,
    });

    const w1 = resolveImpacts(world, [reinjectToTalentPool(world, veteran)]);
    const tp = w1.talentPool!;

    // PIN (RED): isForeign() is nationality-only — the dual citizen lands in
    // the foreign pool even though they hold Japanese citizenship.
    expect(tp.pools.foreign.candidatesVisible).not.toContain("v-dual");

    // PIN (RED): the candidate literal never copies citizenship fields, so
    // re-materialization would consume the heya's single foreign slot again.
    const cand = tp.candidates["v-dual"];
    expect(cand?.dualCitizen).toBe(true);
    expect(candidateConsumesForeignSlot(cand)).toBe(false);
  });

  it("a naturalized released rikishi does not re-enter the foreign pool and keeps citizenship", () => {
    const world = worldWithPool();
    const veteran = MockFactory.createRikishi("v-nat", {
      nationality: "Georgia",
      citizenshipStatus: "naturalized",
      origin: "Georgia",
      birthYear: 2000,
    });
    // Sanity: the rikishi no longer counts against the foreign slot.
    expect(countsAsForeign(veteran, YEAR)).toBe(false);

    const w1 = resolveImpacts(world, [reinjectToTalentPool(world, veteran)]);
    const tp = w1.talentPool!;

    // PIN (RED): lands in the foreign pool on nationality alone.
    expect(tp.pools.foreign.candidatesVisible).not.toContain("v-nat");
    // PIN (RED): citizenship is dropped → the re-entry consumes a slot again.
    expect(candidateConsumesForeignSlot(tp.candidates["v-nat"])).toBe(false);
  });

  it("a re-signed veteran keeps career-appropriate stats and history after materialization", () => {
    const world = worldWithPool();
    const veteran = MockFactory.createRikishi("v-career", {
      nationality: "Japan",
      division: "makuuchi",
      rank: "maegashira",
      rankNumber: 8,
      careerWins: 45,
      careerLosses: 30,
      stats: baseStats({ experience: 30 }),
      birthYear: 1999,
    });

    // Real path: release → reinject → sign → finalize (what the weekly
    // recruitment phase does after a suitor resolution).
    const w1 = resolveImpacts(world, [reinjectToTalentPool(world, veteran)]);
    const reentered = w1.talentPool!.candidates["v-career"];
    expect(reentered).toBeDefined();

    const signedPool = {
      ...w1.talentPool!,
      candidates: {
        ...w1.talentPool!.candidates,
        "v-career": {
          ...reentered,
          availabilityState: "signed" as const,
          competingSuitors: [
            {
              heyaId: HEYA,
              interestBand: "high" as const,
              offerType: "standard" as const,
              deadlineWeek: 1,
            },
          ],
        },
      },
    };
    const wSign = { ...w1, talentPool: signedPool };
    const w2 = resolveImpacts(wSign, [finalizeSignedCandidates(wSign)]);

    const minted = w2.rikishi.get("v-career");
    expect(minted).toBeDefined();

    // PIN (RED): the reinjected candidate carries no stats or career record,
    // so convertCandidateToRikishi regenerates a fresh jonokuchi debutant —
    // 45 career wins and the veteran stat line are silently zeroed.
    expect(minted?.careerWins).toBe(45);
    expect(minted?.stats.experience).toBeGreaterThanOrEqual(30);
  });

  it("a released veteran is not silently culled by the next yearly pool refresh", () => {
    const world = worldWithPool();
    // 30-year-old released rikishi — far past every pool's maxAge (20/24/28).
    const veteran = MockFactory.createRikishi("v-old", {
      nationality: "Japan",
      birthYear: YEAR - 30,
      careerWins: 60,
    });

    const w1 = resolveImpacts(world, [reinjectToTalentPool(world, veteran)]);
    expect(w1.talentPool?.candidates["v-old"]).toBeDefined();

    const w2 = resolveImpacts(w1, [tickTalentPoolYear(w1)]);

    // PIN (RED): reinjectToTalentPool preserves birthYear, so the age-out
    // filter removes the free-agent veteran at the very next yearly refresh.
    expect(w2.talentPool?.candidates["v-old"]).toBeDefined();
  });
});

// ── foreign-slot retention bias ─────────────────────────────────────────────

describe("countsAsForeignFromRikishi — citizenship-aware foreign check (S7-34)", () => {
  it("matches the canonical countsAsForeign for naturalized and dual-citizen rikishi", () => {
    const oyakata = MockFactory.createOyakata("oy-1");
    const naturalized = MockFactory.createRikishi("r-nat", {
      nationality: "Mongolia",
      citizenshipStatus: "naturalized",
    });
    const dual = MockFactory.createRikishi("r-dual", {
      nationality: "Mongolia",
      citizenshipStatus: "dual",
    });
    const tenured = MockFactory.createRikishi("r-ten", {
      nationality: "Georgia",
      joinedHeyaDate: String(YEAR - 6),
    });

    // Canonical semantics (controls — these already pass):
    expect(countsAsForeign(naturalized, YEAR)).toBe(false);
    expect(countsAsForeign(dual, YEAR)).toBe(false);
    expect(countsAsForeign(tenured, YEAR)).toBe(false);
    expect(foreignRetentionMultiplier(naturalized, oyakata, YEAR)).toBe(1);

    // PIN (RED): the overflow path's helper is nationality-only — all three
    // read as foreign even though none consume the slot.
    expect(countsAsForeignFromRikishi(naturalized)).toBe(false);
    expect(countsAsForeignFromRikishi(dual)).toBe(false);
    expect(countsAsForeignFromRikishi(tenured)).toBe(false);
  });

  it("roster overflow releases the weakest rikishi — not the weakest non-naturalized one", () => {
    const CAP_HEYA = "h-cap" as Id;
    const ids: Id[] = [];

    // The naturalized foreigner is the weakest rikishi by every real criterion.
    const naturalized = MockFactory.createRikishi("rel-nat", {
      heyaId: CAP_HEYA,
      nationality: "Mongolia",
      citizenshipStatus: "naturalized",
      talentSeed: 0,
      stats: baseStats({ power: 20, technique: 20, speed: 20, experience: 0 }),
    });
    // A clearly stronger Japanese rikishi (still weak in absolute terms).
    const weakNative = MockFactory.createRikishi("rel-weak", {
      heyaId: CAP_HEYA,
      nationality: "Japan",
      talentSeed: 10,
      stats: baseStats({ experience: 0 }),
    });
    // 29 average fillers so the roster hits the hard cap at 31.
    const roster = new Map<Id, ReturnType<typeof MockFactory.createRikishi>>([
      ["rel-nat", naturalized],
      ["rel-weak", weakNative],
    ]);
    ids.push("rel-nat" as Id, "rel-weak" as Id);
    for (let i = 0; i < 29; i++) {
      const id = `fill-${i}` as Id;
      roster.set(id, MockFactory.createRikishi(id, { heyaId: CAP_HEYA, talentSeed: 50 }));
      ids.push(id);
    }

    const heya = MockFactory.createHeya(CAP_HEYA, { rikishiIds: ids });
    const world = MockFactory.createWorld({
      seed: "v18-overflow",
      year: YEAR,
      heyas: new Map([[CAP_HEYA, heya]]),
      rikishi: roster,
      talentPool: MockFactory.createTalentPool(),
    });
    expect(heya.rikishiIds!.length).toBe(31);

    const next = resolveImpacts(world, [enforceHardCapRosterOverflow(world)]);

    // PIN (RED): the naturalized rikishi gets +30 nationality bias he should
    // not get (he no longer consumes the slot), so the overflow releases
    // rel-weak instead of the genuinely weakest rel-nat.
    expect(next.rikishi.has("rel-nat")).toBe(false);
    expect(next.rikishi.has("rel-weak")).toBe(true);
    // The released free agent is reinjected into the talent pool.
    expect(next.talentPool?.candidates["rel-nat"]).toBeDefined();
  });
});

// ── amateur star tag rate + isAmateurStar flag ──────────────────────────────

describe("CandidateGenerator amateur-star tagging (S7-42/43)", () => {
  it("the amateur_star tag rate approximates the documented AMATEUR_STAR_TAG_CHANCE", () => {
    const rng = rngFromSeed("v18-amateur", "generation", "amateur-star-rate");
    const N = 300;
    let stars = 0;
    for (let i = 0; i < N; i++) {
      const c = generateCandidate({
        id: `am-${i}`,
        rng,
        currentYear: YEAR,
        poolType: "high_school",
      });
      if (c.tags.includes("amateur_star")) stars++;
    }
    const rate = stars / N;
    // PIN (RED): rng.next() > 0.8 yields ~20% stars, not the documented 80%.
    expect(Math.abs(rate - AMATEUR_STAR_TAG_CHANCE)).toBeLessThan(0.2);
  });

  it("generated amateur-star candidates carry the isAmateurStar flag their readers check", () => {
    const rng = rngFromSeed("v18-amateur", "generation", "amateur-star-flag");
    let starred: import("@/engine/types/talent").TalentCandidate | undefined;
    for (let i = 0; i < 100 && !starred; i++) {
      const c = generateCandidate({
        id: `amf-${i}`,
        rng,
        currentYear: YEAR,
        poolType: "high_school",
      });
      if (c.tags.includes("amateur_star")) starred = c;
    }
    expect(starred).toBeDefined();
    // PIN (RED): TalentCandidate.isAmateurStar is never set — eventSurfacing.ts:34
    // and CandidatePoolPage.tsx:80 read a dead field.
    expect(starred?.isAmateurStar).toBe(true);
  });
});

// ── emergent prodigy flag propagation ───────────────────────────────────────

describe("convertCandidateToRikishi — emergent prodigy flag", () => {
  it("propagates isEmergentProdigy so the weeklyTraining burnout gate can fire", () => {
    const candidate = MockFactory.createCandidate("prod-1", {
      isEmergentProdigy: true,
    });
    const rikishi = convertCandidateToRikishi({
      candidate,
      rng: rngFromSeed("v18-prodigy", "generation", "prodigy"),
      currentYear: YEAR,
      heyaId: HEYA,
    });

    // PIN (RED): the flag never reaches the rikishi — applyProdigyBurnout
    // (weeklyTraining.ts:156) gates on rikishi.injuryStatus?.isEmergentProdigy,
    // which stays undefined for every converted recruit.
    expect(rikishi.injuryStatus?.isEmergentProdigy).toBe(true);
  });
});
