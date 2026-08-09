# Hidden Gems: Imperfect Scouting for Recruitment Parity — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create competitive parity through recruitment the way real sports get it — **imperfect information**. NPC stables currently value recruits by their _true_ `talentSeed` (perfect information), so the richest stable reliably buys the actual best prospect and dynasties compound. Replace that with per-stable noisy _scouted estimates_: money can no longer reliably buy champions, hidden gems land in weak stables and blossom to their true potential, and dynasties waste fortunes on over-scouted duds.

**Architecture:** One pure helper, `perceivedTalentSeed(world, heyaId, candidate)`, returns a deterministic per-(stable, candidate) estimate = true `talentSeed` + seeded noise, where noise magnitude shrinks with the stable's scouting quality (scout staff + `scouting_office` facility) but never reaches zero. Substitute it for true `talentSeed` in BOTH live NPC recruitment paths. Development/ceilings continue to use TRUE `talentSeed`, so a mis-scouted gem still grows into a champion — that IS the parity mechanism.

**Tech Stack:** TS engine, Vitest (`npx vitest run`), seeded RNG only (`rngFromSeed`/`rngForWorld` — never `Math.random`/`Date.now`), `ImpactBuilder`/`resolveImpacts`. Integration gate: `bun scripts/diagnostic-25yr-sim.ts`.

---

## Why the previous parity lever failed (read first — this plan exists because of it)

A bid _handicap_ (scaling strong stables' bids down) was tried and **reverted**: it topped out at 6 unique winners (baseline 5) because the richest stable still bought the _visibly_ best recruit — just slightly less often — AND it delayed cold-start elite emergence (broke the 12-basho yokozuna test) by artificially suppressing strong stables' recruitment.

Imperfect information is structurally different: it doesn't suppress anyone's bids — it makes _valuations diverge_. Elites still get recruited and developed at full speed (so yokozuna emergence should NOT slow), but WHICH stable lands them becomes unpredictable. Do not reintroduce bid-scaling; if this plan under-delivers, tune the noise, not the bids.

## Verified mechanics (cited — use these)

- **Bidding path (weekly gap controller):** `fillVacanciesForNPCWithBidding` (`src/engine/systems/generation/TalentPoolNPCRecruitment.ts`) → `recruitmentStrat.calculateMaxBid(...)`. Inside `calculateMaxBid` (`src/engine/npcRecruitmentStrategy.ts:78-86`): `const talentSeed = candidate?.talentSeed ?? 50; const talentMult = 0.5 + talentSeed / 100; maxBid *= talentMult;` — **true talent read directly.**
- **Non-bidding backfill path (post-basho, live):** `fillVacanciesForNPC` (`TalentPoolNPCRecruitment.ts:17-115`), called from `src/engine/lifecycle/RegistryService.ts:36`. Uses `const talent = c.talentSeed` (line ~61) for scoring AND an affinity gate: `if (talent >= 80 && repScore < 70) affinity = 0.1; if (talent >= 90 && repScore < 85) affinity = 0.05;` — **true top talent refuses low-rep stables**, a second perfect-info concentrator.
- **Candidate model already distinguishes hidden potential:** `TalentCandidate.talentSeed` (`src/engine/types/talent.ts:106`), `potentialStats` "Hidden; revealed via scouting" (`:119-121`), deep-scouting development profile (`:131`), player scouting progress (`:193`). Only the player respects the fog; NPCs bypass it.
- **Development uses TRUE talent:** stat ceilings derive from `talentSeed` (`getStatCeiling` in `src/engine/systems/training/TrainingMath.ts`), so a gem signed cheap still develops to true potential. Do NOT change this.
- **Scout-quality signals:** staff role `"scout"` (`src/engine/types/staff.ts:15`, heya staff via `heya.staffIds` → `world.staff`), and the `scouting_office` facility (`src/engine/types/infrastructure.ts:18,106`).
- Candidates are generated with `talentSeed: rng.int(TALENT_SEED_MIN, TALENT_SEED_MAX)` (`CandidateGenerator.ts:197`).

## Success gate (the ONLY measure that counts)

`bun scripts/diagnostic-25yr-sim.ts` after all tasks:

- `tuningMetrics.uniqueWinnerCount` improves materially — target **≥ 8** (baseline 5; be honest if it lands lower and tune noise, don't fudge).
- Top `beyaDominance` stable **< 20 yusho** /150 (baseline 22–24).
- `heyaCount` still dynamic (founding must keep working, 45→~53).
- **The 12-basho yokozuna test stays GREEN** (`src/tests/unit/engine/banzukePromotion.test.ts`) — the structural advantage over the handicap. If it breaks, the noise is distorting elite emergence; reduce spread rather than shipping a red test.
- Full suite green; diagnostic deterministic across two runs.

---

### Task 1: `perceivedTalentSeed` helper + scouting-quality function

**Files:**

- Create: `src/engine/systems/recruitment/perceivedTalent.ts`
- Create: `src/constants/engine/scoutingPerception.ts`
- Test: `src/tests/unit/engine/recruitment/perceivedTalent.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/tests/unit/engine/recruitment/perceivedTalent.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  perceivedTalentSeed,
  scoutingNoiseSpread,
} from "@/engine/systems/recruitment/perceivedTalent";
import { makeMockWorld, makeMockHeya } from "../utils";
import {
  PERCEPTION_NOISE_BASE,
  PERCEPTION_NOISE_FLOOR,
} from "@/constants/engine/scoutingPerception";
import type { TalentCandidate } from "@/engine/types/talent";

const candidate = (id: string, talentSeed: number) =>
  ({ candidateId: id, talentSeed }) as unknown as TalentCandidate;

function worldWith(heyaIds: string[]) {
  const heyas = new Map(heyaIds.map((id) => [id, makeMockHeya(id, { rikishiIds: [] })]));
  return makeMockWorld({ heyas, rikishi: new Map() });
}

describe("perceivedTalentSeed", () => {
  it("is deterministic: same stable + candidate always yields the same estimate", () => {
    const world = worldWith(["h1"]);
    const c = candidate("c1", 80);
    expect(perceivedTalentSeed(world, "h1", c)).toBe(perceivedTalentSeed(world, "h1", c));
  });

  it("different stables get different estimates of the same candidate (valuations diverge)", () => {
    const world = worldWith(["h1", "h2", "h3", "h4", "h5", "h6"]);
    const c = candidate("c1", 80);
    const estimates = ["h1", "h2", "h3", "h4", "h5", "h6"].map((h) =>
      perceivedTalentSeed(world, h, c)
    );
    expect(new Set(estimates).size).toBeGreaterThan(1);
  });

  it("estimates stay within the noise spread of true talent and inside [0, 100]", () => {
    const world = worldWith(["h1"]);
    for (let t = 10; t <= 95; t += 5) {
      const est = perceivedTalentSeed(world, "h1", candidate(`c${t}`, t));
      expect(Math.abs(est - t)).toBeLessThanOrEqual(PERCEPTION_NOISE_BASE);
      expect(est).toBeGreaterThanOrEqual(0);
      expect(est).toBeLessThanOrEqual(100);
    }
  });

  it("scouting quality tightens the spread but never reaches zero", () => {
    // spread is a pure function of scout quality inputs
    expect(scoutingNoiseSpread(0, false)).toBe(PERCEPTION_NOISE_BASE);
    expect(scoutingNoiseSpread(3, true)).toBeLessThan(scoutingNoiseSpread(0, false));
    expect(scoutingNoiseSpread(99, true)).toBeGreaterThanOrEqual(PERCEPTION_NOISE_FLOOR);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/tests/unit/engine/recruitment/perceivedTalent.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Add the constants**

Create `src/constants/engine/scoutingPerception.ts`:

```typescript
/**
 * Imperfect-information scouting. NPC stables value recruits by a noisy per-stable
 * ESTIMATE of true talentSeed, not the truth — this is the parity engine: money can't
 * reliably buy the actual best prospect, hidden gems slip to small stables and develop
 * to their TRUE potential, dynasties overpay for duds.
 */
export const PERCEPTION_NOISE_BASE = 22; // ± spread with no scouts and no scouting office
export const PERCEPTION_NOISE_PER_SCOUT = 4; // each scout on staff tightens the spread
export const PERCEPTION_NOISE_OFFICE_BONUS = 6; // scouting_office facility tightens it further
export const PERCEPTION_NOISE_FLOOR = 8; // even elite scouting never sees the truth
```

- [ ] **Step 4: Implement the helper**

Create `src/engine/systems/recruitment/perceivedTalent.ts`. FIRST verify the accessors by reading the code: how to count a heya's scout staff (`heya.staffIds` → `world.staff.get(id)?.role === "scout"` — confirm the staff map field name in `src/engine/types/world.ts` and `staff.ts`) and how to detect a built `scouting_office` (read how facilities/infrastructure are stored on `Heya` — e.g. `heya.infrastructure`/`heya.builtFacilities`; find the accessor used by `InfrastructureService` and reuse it). Then:

```typescript
import type { WorldState } from "../../types/world";
import type { TalentCandidate } from "../../types/talent";
import { rngFromSeed } from "../../rng";
import {
  PERCEPTION_NOISE_BASE,
  PERCEPTION_NOISE_PER_SCOUT,
  PERCEPTION_NOISE_OFFICE_BONUS,
  PERCEPTION_NOISE_FLOOR,
} from "../../../constants/engine/scoutingPerception";

/** Noise spread (±) as a pure function of scouting quality. Never zero. */
export function scoutingNoiseSpread(scoutCount: number, hasScoutingOffice: boolean): number {
  const reduction =
    scoutCount * PERCEPTION_NOISE_PER_SCOUT +
    (hasScoutingOffice ? PERCEPTION_NOISE_OFFICE_BONUS : 0);
  return Math.max(PERCEPTION_NOISE_FLOOR, PERCEPTION_NOISE_BASE - reduction);
}

/**
 * A stable's scouted ESTIMATE of a candidate's talent. Deterministic per
 * (stable, candidate): seeded noise, magnitude set by the stable's scouting
 * quality. NPC recruitment must use this instead of true `talentSeed` —
 * perfect information is what lets the richest stable buy every champion.
 */
export function perceivedTalentSeed(
  world: WorldState,
  heyaId: string,
  candidate: TalentCandidate
): number {
  const scoutCount = /* count staff with role === "scout" via verified accessor */ 0;
  const hasOffice = /* verified scouting_office check */ false;
  const spread = scoutingNoiseSpread(scoutCount, hasOffice);
  const rng = rngFromSeed(`scout_${heyaId}_${candidate.candidateId}`, "scouting", "estimate");
  const noise = (rng.next() * 2 - 1) * spread; // uniform in [-spread, +spread]
  return Math.max(0, Math.min(100, candidate.talentSeed + noise));
}
```

Replace the two placeholder expressions with the REAL accessors you verified (this is the one part requiring codebase reading — do not guess field names). Note the seed string contains only ids that exist before any choice — no player/tactic choice folded into a seed.

- [ ] **Step 5: Run to verify it passes**

Run: `npx vitest run src/tests/unit/engine/recruitment/perceivedTalent.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/engine/systems/recruitment/perceivedTalent.ts src/constants/engine/scoutingPerception.ts src/tests/unit/engine/recruitment/perceivedTalent.test.ts
git commit -m "feat(scouting): perceived-talent estimates — imperfect information for NPC recruitment"
```

---

### Task 2: Bidding path uses perceived talent

**Files:**

- Modify: `src/engine/npcRecruitmentStrategy.ts` (`calculateMaxBid`, lines ~78-86)
- Test: `src/tests/unit/engine/recruitment/perceivedBidding.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/tests/unit/engine/recruitment/perceivedBidding.test.ts` — two stables with identical funds/oyakata bid on the same candidate; with perceived talent their bids can differ (impossible today, where both read true talentSeed):

```typescript
import { describe, it, expect } from "vitest";
import { getRecruitmentStrategy } from "@/engine/npcRecruitmentStrategy";
import { perceivedTalentSeed } from "@/engine/systems/recruitment/perceivedTalent";
import { makeMockWorld, makeMockHeya } from "../utils";

describe("perceived-talent bidding", () => {
  it("identical stables produce different bids for the same candidate (divergent valuations)", () => {
    // Build a world with one candidate and MANY identical stables; assert at least
    // two stables' calculateMaxBid outputs differ. Read how existing recruitment
    // tests construct world.talentPool + oyakata fixtures (see
    // src/tests/unit/engine/recruitment/*.test.ts) and reuse that pattern.
    // Assert: new Set(bids).size > 1  — with true-talent reads this is impossible
    // for identical stables, so this test FAILS before the wiring change.
  });
});
```

Flesh the fixture out from the existing recruitment test patterns (they already build `talentPool.candidates` + oyakata). If constructing `calculateMaxBid` fixtures proves brittle, test at the next level instead: run `fillVacanciesForNPCWithBidding` with identical stables and assert the winner isn't always the first heya id — but prefer the direct bid assertion.

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/tests/unit/engine/recruitment/perceivedBidding.test.ts`
Expected: FAIL — identical stables currently compute identical bids (both read true talent).

- [ ] **Step 3: Wire perceived talent into `calculateMaxBid`**

In `src/engine/npcRecruitmentStrategy.ts` (~line 83-86), replace the true-talent read:

```typescript
const candidate = candidateId ? world.talentPool?.candidates?.[candidateId] : undefined;
// Imperfect information: bid on the stable's scouted ESTIMATE, never true talent.
const talentSeed = candidate ? perceivedTalentSeed(world, heya.id, candidate) : 50;
const talentMult = 0.5 + talentSeed / 100;
maxBid *= talentMult;
```

Add the import. Verify no other place in this file reads `candidate.talentSeed` directly (grep the file).

- [ ] **Step 4: Run to verify pass + no recruitment regressions**

Run: `npx vitest run src/tests/unit/engine/recruitment`
Expected: PASS (the population-stability/replacement-loop tests are talent-agnostic and must stay green).

- [ ] **Step 5: Commit**

```bash
git add src/engine/npcRecruitmentStrategy.ts src/tests/unit/engine/recruitment/perceivedBidding.test.ts
git commit -m "feat(recruitment): bids use scouted estimates, not true talent"
```

---

### Task 3: Backfill path + affinity gate use perceived talent (the hidden-gem door)

**Files:**

- Modify: `src/engine/systems/generation/TalentPoolNPCRecruitment.ts` (`fillVacanciesForNPC`, the scoring block ~lines 58-69)
- Test: `src/tests/unit/engine/recruitment/hiddenGem.test.ts`

- [ ] **Step 1: Write the failing test**

The affinity gate currently reads TRUE talent: a true-90 candidate refuses (affinity 0.05) any stable with reputation < 85 — so gems can never join weak stables. With perceived talent, a stable that _underestimates_ a gem faces no gate, and one that overestimates a mediocre prospect may overpay. Create `src/tests/unit/engine/recruitment/hiddenGem.test.ts`:

```typescript
import { describe, it, expect } from "vitest";

describe("hidden gems can join weak stables", () => {
  it("a high-true-talent candidate CAN be signed by a low-reputation stable", () => {
    // Fixture: ONE candidate with talentSeed >= 90; ONE low-reputation stable
    // (reputation < 70) with a vacancy; run fillVacanciesForNPC and resolve.
    // Choose a (heyaId, candidateId) pair whose seeded perception noise puts the
    // stable's estimate BELOW 80 (compute perceivedTalentSeed in the test to pick/verify
    // the pair deterministically — iterate candidate ids c1..c20 and pick one with
    // estimate < 80; fail with a clear message if none found so the fixture is fixed).
    // Assert the candidate IS signed by the weak stable (rikishiToAdd contains it).
    // Under true-talent affinity (0.05) this signing is effectively impossible.
  });
});
```

Build the fixture from the existing `fillVacanciesForNPC`-style test patterns (see the integration test in the recruitment suite for `fillVacanciesForNPCWithBidding` fixtures). The deterministic-pair-selection trick keeps this non-flaky: the test computes the perception estimate first and only proceeds with a pair that demonstrates the mechanism.

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/tests/unit/engine/recruitment/hiddenGem.test.ts`
Expected: FAIL — true-talent affinity gate blocks the signing.

- [ ] **Step 3: Wire perceived talent into the scoring + affinity gate**

In `fillVacanciesForNPC` (`TalentPoolNPCRecruitment.ts` ~lines 58-69), replace the true-talent read:

```typescript
const candidatesWithScores = availableCandidates.map((cId) => {
  const c = currentCandidates[cId];
  // Imperfect information: the stable evaluates its scouted ESTIMATE.
  const talent = perceivedTalentSeed(world, heyaId, c);
  const repScore = heya.reputation ?? 50;
  let affinity = 1.0;
  if (talent >= 80 && repScore < 70) affinity = 0.1;
  if (talent >= 90 && repScore < 85) affinity = 0.05;

  const score = talent * affinity + rng.int(0, 20);
  return { cId, score, c };
});
```

Add the import. The affinity gate now runs on the estimate — an under-scouted gem walks through the door; an over-scouted journeyman gets the star treatment and disappoints.

- [ ] **Step 4: Run to verify pass + full recruitment suite**

Run: `npx vitest run src/tests/unit/engine/recruitment`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/systems/generation/TalentPoolNPCRecruitment.ts src/tests/unit/engine/recruitment/hiddenGem.test.ts
git commit -m "feat(recruitment): backfill path + affinity gate use scouted estimates (hidden gems)"
```

---

### Task 4: Integration gate + noise calibration

**Files:** Tune (values only, if needed): `src/constants/engine/scoutingPerception.ts`

- [ ] **Step 1: Full suite**

Run: `npx vitest run`
Expected: ALL green — including `src/tests/unit/engine/banzukePromotion.test.ts` (the 12-basho yokozuna test). If THAT test breaks, the noise is suppressing elite emergence; reduce `PERCEPTION_NOISE_BASE` before anything else — do not widen the test.

- [ ] **Step 2: 25-year diagnostic**

Run: `bun scripts/diagnostic-25yr-sim.ts`, then:

```bash
node -e '
const r=require("./simulation-results.json");
const tm=r.tuningMetrics, ys=r.yearSnapshots;
console.log("uniqueWinners", tm.uniqueWinnerCount);
console.log("top stables", JSON.stringify(tm.beyaDominance.slice(0,3)));
console.log("heyaCount", Math.min(...ys.map(s=>s.heyaCount)), "-", Math.max(...ys.map(s=>s.heyaCount)));
console.log("yokozuna last8", ys.slice(-8).map(s=>s.yokozunaCount));
'
```

Targets: `uniqueWinnerCount >= 8` (baseline 5); top stable `< 20` yusho; heyaCount still dynamic (~45–53); yokozuna persist.

- [ ] **Step 3: Calibrate (values only)**

If `uniqueWinnerCount < 8`: raise `PERCEPTION_NOISE_BASE` (22 → 28) and/or `PERCEPTION_NOISE_FLOOR` (8 → 12) — more fog, more parity — and re-run Steps 1-2. If the yokozuna test breaks or maxStat/development degrades: lower the spread. Iterate constants only; if after ~3 iterations parity is still < 7, STOP and report honestly with the measured numbers — do not keep cranking, and do not touch bids or economy constants.

- [ ] **Step 4: Determinism check**

Run the diagnostic twice; `uniqueWinnerCount` and final `heyaCount` must be identical. `grep -rn "Math.random\|Date.now" src/engine/systems/recruitment/perceivedTalent.ts` → nothing.

- [ ] **Step 5: Commit the calibration**

```bash
git add src/constants/engine/scoutingPerception.ts
git commit -m "tune(scouting): calibrate perception noise for recruitment parity"
```

---

## Self-review notes

- **Mechanism honesty:** this attacks the actual root cause (perfect information) rather than distorting bids; elites still develop at true potential so yokozuna emergence is preserved — the plan makes that an explicit non-negotiable gate (Task 4 Step 1).
- **Both live paths covered:** bidding (`calculateMaxBid`) AND backfill (`fillVacanciesForNPC` incl. the affinity gate) — the previous effort taught that a lever in a path the sim doesn't fully use does nothing.
- **Determinism:** noise seeded per `(heyaId, candidateId)` via `rngFromSeed` — stable across runs; no choice-derived seeds; no `Math.random`.
- **Player untouched:** the player's scouting fog (`potentialStats`, scouting progress) already exists and is unchanged; this only stops NPCs from cheating past it.
- **Honest exit:** Task 4 has an explicit stop-and-report clause. The 25-year `uniqueWinnerCount` is the only success measure; unit-green alone proves nothing (learned twice now).
- **Type/name consistency:** `perceivedTalentSeed(world, heyaId, candidate)` and `scoutingNoiseSpread(scoutCount, hasScoutingOffice)` named identically across helper, both wiring sites, and all tests; constants match between `scoutingPerception.ts` and imports.
