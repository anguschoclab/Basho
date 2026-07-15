# Gameplay Depth Must-Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the verified defects in the already-merged #3 (core-loop decisions) and #4 (bout tactics) work: two determinism violations, a non-halting multi-day sim loop, hollow decision effects, a tautological tactic test, and an over-tuned tactic win-rate swing.

**Architecture:** All fixes live in the existing deterministic engine. Determinism fixes replace `Date.now()`/`Math.random()` with seeded RNG and deterministic IDs. The worker gains a halt-on-blocking-decision check in its multi-day loops. Tactic balance is tuned via the existing `TACTIC_PROFILES` table; correctness is locked in with a real end-to-end win-rate test.

**Tech Stack:** Vite + React 19 + TypeScript, Vitest (jsdom), Web Worker engine, seeded RNG (`src/engine/rng.ts`).

---

## Verification correction (read first)

The original verification report claimed "Plan 4 — bout tactics don't change who wins." **That was wrong** — it was a flaw in the verification test, which set `ctx.playerTactic` but did not pass the tactic as the 5th positional argument to `resolveBout`, and [boutResolver.ts:372](../../../src/engine/bout/boutResolver.ts) overwrites `bout.playerTactic` from that argument. Re-run with correct wiring over 400 seeded evenly-matched bouts:

```
ALL_OUT: 0.99   STANDARD: 0.48   DEFENSIVE_PULL: 0.03
```

So tactics **do** move win probability — in fact too much (a tactic turns a coin-flip into a near-certain win or loss). The Plan-4 must-fixes are therefore (a) add a genuine end-to-end test so this is actually covered, and (b) rebalance the swing. The "core mechanic is dead" item is withdrawn.

## Scope

**In scope (verified defects):**

1. `Date.now()` in decision ID generation — determinism violation.
2. `Math.random()` in the ozeki petition roll — determinism violation.
3. Multi-day worker loops (`TICK_MULTIPLE_DAYS`, `AUTO_SIM_DAYS`) do not halt on a blocking decision.
4. Loop-decision options are mostly no-ops (`resolveLoopDecision` only implements 2 of the option paths).
5. Tactic test is tautological (asserts table values, never simulates a bout).
6. Tactic win-rate swing is extreme (0.99 / 0.03), making the "gamble" a no-brainer.

**Out of scope — needs product sign-off (do NOT build blind):** The implemented decision taxonomy (`recruit_or_develop`, `ozeki_promotion`, `training_regime`) does not match the approved set (pre-basho readiness, insolvency, weekly training, welfare diet). Task 4 below makes the _existing_ decisions' effects real so the feature is honest, but **the taxonomy swap is a design decision** — raise it with the product owner before re-implementing the decision set. See the "Product sign-off" section at the end.

**Conventions (enforced):** Deterministic only — never `Math.random()`/`Date.now()` in engine code; use `rngFromSeed(seed, system, label)` from `src/engine/rng.ts`. Never fold a player choice into an RNG seed. Run tests with `npx vitest run` (NOT `bun test -- --run`).

---

### Task 1: Deterministic decision IDs (remove `Date.now()`)

**Files:**

- Modify: `src/engine/loop/LoopDecisionEngine.ts:19-21` (the `makeId` helper)
- Test: `src/engine/loop/__tests__/LoopDecisionEngine.test.ts` (add cases)

- [ ] **Step 1: Write the failing test**

Add to `src/engine/loop/__tests__/LoopDecisionEngine.test.ts` inside a new `describe`:

```typescript
describe("evaluatePendingDecisions — determinism", () => {
  it("produces identical decision IDs across two runs of the same world", () => {
    const make = () => {
      const heya = makeHeya("h1", ["r1"]);
      const rikishi = makeRikishi("r1", "makushita", "TestRikishi");
      return makeWorld({
        cyclePhase: "interim",
        playerHeyaId: "h1",
        seed: "seed-xyz",
        heyas: new Map([["h1", heya]]),
        rikishi: new Map([["r1", rikishi]]),
      });
    };
    const a = evaluatePendingDecisions(make());
    const b = evaluatePendingDecisions(make());
    const idsA = (a.worldFields?.pendingDecisions as Array<{ id: string }>).map((d) => d.id);
    const idsB = (b.worldFields?.pendingDecisions as Array<{ id: string }>).map((d) => d.id);
    expect(idsA).toEqual(idsB);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/engine/loop/__tests__/LoopDecisionEngine.test.ts -t "identical decision IDs"`
Expected: FAIL — IDs differ (they embed `Date.now()`).

- [ ] **Step 3: Replace `makeId` with a deterministic ID**

In `src/engine/loop/LoopDecisionEngine.ts`, replace the `makeId` function (lines 19-21):

```typescript
// Deterministic ID: a decision of a given type/seed within a (year, week) is unique.
function makeId(prefix: string, seed: string, world: WorldState): string {
  return `${prefix}-${seed}-y${world.year ?? 0}-w${world.week ?? 0}`;
}
```

Then update every call site in `evaluatePendingDecisions` to pass `world` and use a per-decision prefix that is unique within the tick. The current calls are `makeId("recruit", world.seed)`, `makeId("ozeki", r.id)`, `makeId("train", world.seed)`. Change them to:

```typescript
// Decision 1 (recruit_or_develop):
id: makeId("recruit", world.seed, world),
// Decision 2 (ozeki_promotion) — include rikishi id so concurrent candidates differ:
id: makeId(`ozeki-${r.id}`, world.seed, world),
// Decision 3 (training_regime):
id: makeId("train", world.seed, world),
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/engine/loop/__tests__/LoopDecisionEngine.test.ts`
Expected: PASS (all existing cases + the new determinism case).

- [ ] **Step 5: Confirm no remaining `Date.now()` in the file**

Run: `grep -n "Date.now" src/engine/loop/LoopDecisionEngine.ts`
Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add src/engine/loop/LoopDecisionEngine.ts src/engine/loop/__tests__/LoopDecisionEngine.test.ts
git commit -m "fix(loop): deterministic decision IDs (remove Date.now)"
```

---

### Task 2: Seeded RNG for the ozeki petition (remove `Math.random()`)

**Files:**

- Modify: `src/engine/loop/LoopDecisionEngine.ts:212-214` (the petition roll) + add import
- Test: `src/engine/loop/__tests__/LoopDecisionEngine.test.ts`

- [ ] **Step 1: Write the failing test**

Add to the determinism `describe` in `src/engine/loop/__tests__/LoopDecisionEngine.test.ts`:

```typescript
it("ozeki petition outcome is deterministic for a fixed world+decision", () => {
  const buildWorld = () => {
    const heya = makeHeya("h1", ["r1"]);
    const sekiwake = makeRikishi("r1", "sekiwake", "Petitioner");
    const world = makeWorld({
      cyclePhase: "post_basho",
      playerHeyaId: "h1",
      seed: "seed-ozeki",
      heyas: new Map([["h1", heya]]),
      rikishi: new Map([["r1", sekiwake]]),
      pendingDecisions: [
        {
          id: "ozeki-r1-fixed",
          type: "ozeki_promotion",
          description: "x",
          deadlineWeek: 3,
          required: true,
          options: [],
        },
      ],
    });
    return world;
  };
  const a = resolveLoopDecision(buildWorld(), "ozeki-r1-fixed", "petition");
  const b = resolveLoopDecision(buildWorld(), "ozeki-r1-fixed", "petition");
  // Same seed + same decision id => same rikishi update (promotion or mental penalty)
  const ua =
    a.entities?.rikishiUpdates instanceof Map ? a.entities.rikishiUpdates.get("r1") : undefined;
  const ub =
    b.entities?.rikishiUpdates instanceof Map ? b.entities.rikishiUpdates.get("r1") : undefined;
  expect(JSON.stringify(ua)).toEqual(JSON.stringify(ub));
});
```

> Note: confirm the impact's entity-update accessor name by checking `src/engine/core/StateImpact.ts` (`entities.rikishiUpdates`). If the property differs, match it in both the test and the assertion.

- [ ] **Step 2: Run test to verify it fails (flaky/non-deterministic)**

Run: `npx vitest run src/engine/loop/__tests__/LoopDecisionEngine.test.ts -t "ozeki petition outcome is deterministic"`
Expected: FAIL intermittently — `Math.random()` makes the two runs disagree.

- [ ] **Step 3: Replace `Math.random()` with seeded RNG**

In `src/engine/loop/LoopDecisionEngine.ts`, add the import near the top:

```typescript
import { rngFromSeed } from "../rng";
```

Replace line 214 (`const success = Math.random() < 0.8;`) with:

```typescript
const rng = rngFromSeed(`loop_ozeki_${world.seed}_${decisionId}`, "loop", "petition");
const success = rng.next() < 0.8;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/engine/loop/__tests__/LoopDecisionEngine.test.ts -t "ozeki petition outcome is deterministic"`
Expected: PASS, consistently (run it 3×).

- [ ] **Step 5: Confirm no remaining `Math.random()` in the file**

Run: `grep -n "Math.random" src/engine/loop/LoopDecisionEngine.ts`
Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add src/engine/loop/LoopDecisionEngine.ts src/engine/loop/__tests__/LoopDecisionEngine.test.ts
git commit -m "fix(loop): seed the ozeki petition roll (remove Math.random)"
```

---

### Task 3: Multi-day worker loops halt on a blocking decision

**Files:**

- Modify: `src/engine/worker/engine.worker.ts:110-149` (`TICK_MULTIPLE_DAYS`) and `:150-172` (`AUTO_SIM_DAYS`)
- Test: `src/engine/loop/__tests__/multiDayHalt.test.ts` (new — tests the halt predicate at the engine level, since the worker itself is hard to unit-test)

The worker cannot easily be unit-tested (Web Worker globals). Extract the halt condition into a tiny pure helper in the engine, unit-test that, and call it from both worker loops.

- [ ] **Step 1: Write the failing test**

Create `src/engine/loop/__tests__/multiDayHalt.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { shouldHaltAdvance } from "../shouldHaltAdvance";
import type { WorldState } from "../../types/world";

const base = { pendingCrisis: undefined, pendingDecisions: [] } as unknown as WorldState;

describe("shouldHaltAdvance", () => {
  it("does not halt when there is no blocking decision", () => {
    expect(shouldHaltAdvance(base)).toBe(false);
  });
  it("halts when a pendingCrisis exists", () => {
    const w = {
      ...base,
      pendingCrisis: { id: "c1", type: "loop_decision", title: "x", description: "x", options: [] },
    } as unknown as WorldState;
    expect(shouldHaltAdvance(w)).toBe(true);
  });
  it("halts when a required pendingDecision exists even without a crisis", () => {
    const w = {
      ...base,
      pendingDecisions: [
        { id: "d1", type: "x", description: "x", deadlineWeek: 1, required: true, options: [] },
      ],
    } as unknown as WorldState;
    expect(shouldHaltAdvance(w)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/engine/loop/__tests__/multiDayHalt.test.ts`
Expected: FAIL with "Cannot find module '../shouldHaltAdvance'".

- [ ] **Step 3: Create the helper**

Create `src/engine/loop/shouldHaltAdvance.ts`:

```typescript
import type { WorldState } from "../types/world";

/**
 * True when a multi-day fast-advance loop must stop and hand control back to
 * the player because a blocking decision is pending. Mirrors the gate pattern
 * in src/engine/holiday.ts (evaluateGates -> break).
 */
export function shouldHaltAdvance(world: WorldState): boolean {
  if (world.pendingCrisis) return true;
  const decisions = world.pendingDecisions ?? [];
  return decisions.some((d) => d.required);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/engine/loop/__tests__/multiDayHalt.test.ts`
Expected: PASS.

- [ ] **Step 5: Wire the helper into both worker loops**

In `src/engine/worker/engine.worker.ts`, add the import with the other engine imports:

```typescript
import { shouldHaltAdvance } from "../loop/shouldHaltAdvance";
```

In `TICK_MULTIPLE_DAYS`, after the `if (useFast) { ... } else { ... }` block that advances `currentWorld` (right after line 133, before the PROGRESS post), insert:

```typescript
if (shouldHaltAdvance(currentWorld)) {
  self.postMessage({
    type: "PROGRESS",
    message: `Paused for a decision on day ${i + step} of ${days}.`,
    current: i + step,
    total: days,
  });
  break;
}
```

In `AUTO_SIM_DAYS`, immediately after `currentWorld = tickOrchestrator(currentWorld);` (line 158), insert:

```typescript
if (shouldHaltAdvance(currentWorld)) break;
```

(Leave the existing `emitDigest()` + `WORLD_UPDATED` post after each loop — they run on break too, so the UI re-renders and `CrisisModal` opens.)

- [ ] **Step 6: Run the full loop + worker-adjacent suite**

Run: `npx vitest run src/engine/loop`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/engine/loop/shouldHaltAdvance.ts src/engine/loop/__tests__/multiDayHalt.test.ts src/engine/worker/engine.worker.ts
git commit -m "fix(worker): halt multi-day advance on blocking decision"
```

---

### Task 4: Make loop-decision option effects real (remove no-ops)

**Files:**

- Modify: `src/engine/loop/LoopDecisionEngine.ts:200-242` (`resolveLoopDecision`)
- Test: `src/engine/loop/__tests__/LoopDecisionEngine.test.ts`

Today `resolveLoopDecision` only applies effects for `recruit_or_develop:train_current` and `ozeki_promotion:petition`. The `training_regime` options (`power_focus`, `technique_focus`, `balanced`) and the other `recruit_or_develop` options do nothing — the player makes a choice with zero consequence. Give each option a concrete, deterministic effect via `transientContext` flags that the training/recruitment phases already read, or document the consumer.

- [ ] **Step 1: Write the failing test**

Add to `src/engine/loop/__tests__/LoopDecisionEngine.test.ts`:

```typescript
describe("resolveLoopDecision — effects are not no-ops", () => {
  function worldWithDecision(type: string, optionId: string) {
    return {
      world: makeWorld({
        seed: "s",
        playerHeyaId: "h1",
        heyas: new Map([["h1", makeHeya("h1", ["r1"])]]),
        rikishi: new Map([["r1", makeRikishi("r1", "makushita", "X")]]),
        pendingDecisions: [
          {
            id: `${type}-1`,
            type,
            description: "x",
            deadlineWeek: 2,
            required: false,
            options: [{ id: optionId, label: optionId, impact: "x" }],
          },
        ],
      }),
      decisionId: `${type}-1`,
      optionId,
    };
  }

  it("training_regime power_focus writes a deterministic training buff", () => {
    const { world, decisionId } = worldWithDecision("training_regime", "power_focus");
    const impact = resolveLoopDecision(world, decisionId, "power_focus");
    const tc = impact.worldFields?.transientContext as Record<string, unknown>;
    expect(tc?.trainingRegime).toBe("power_focus");
  });

  it("removes the resolved decision from pendingDecisions", () => {
    const { world, decisionId } = worldWithDecision("training_regime", "balanced");
    const impact = resolveLoopDecision(world, decisionId, "balanced");
    const remaining = impact.worldFields?.pendingDecisions as Array<unknown>;
    expect(remaining).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/engine/loop/__tests__/LoopDecisionEngine.test.ts -t "training_regime power_focus"`
Expected: FAIL — `transientContext.trainingRegime` is undefined (no effect applied).

- [ ] **Step 3: Implement real effects**

In `src/engine/loop/LoopDecisionEngine.ts`, inside `resolveLoopDecision`, after the existing `recruit_or_develop` block and before the `ozeki_promotion` block, add a `training_regime` handler and broaden `recruit_or_develop`:

```typescript
if (decision.type === "training_regime") {
  // Deterministic regime flag consumed by phase01_week_training.
  builder.updateWorldField("transientContext", {
    ...world.transientContext,
    trainingRegime: optionId, // "power_focus" | "technique_focus" | "balanced"
  } as never);
}

if (decision.type === "recruit_or_develop") {
  if (optionId === "train_current") {
    builder.updateWorldField("transientContext", {
      ...world.transientContext,
      trainingGrowthBuff: 1.05,
    } as never);
  } else if (optionId === "scout_youth" || optionId === "recruit_veteran") {
    // Flag a recruitment intent the recruitment phase can act on next tick.
    builder.updateWorldField("transientContext", {
      ...world.transientContext,
      recruitmentIntent: optionId,
    } as never);
  }
}
```

> Consumer note: `trainingRegime`, `trainingGrowthBuff`, and `recruitmentIntent` must be read by the corresponding phase. Confirm `phase01_week_training.ts` (training) and the recruitment phase read these flags; if a flag is not yet consumed, add a follow-up task — do not leave a written-but-unread flag. (The existing `trainingGrowthBuff` is already written by the prior implementation; verify it is consumed and, if not, file it.)

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/engine/loop/__tests__/LoopDecisionEngine.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/loop/LoopDecisionEngine.ts src/engine/loop/__tests__/LoopDecisionEngine.test.ts
git commit -m "fix(loop): apply real effects for all decision options"
```

---

### Task 5: Real end-to-end tactic win-rate test (replace tautology)

**Files:**

- Create: `src/tests/unit/engine/bout/tacticWinRate.test.ts`
- Reference (no change): `src/engine/bout/boutResolver.ts`, `src/tests/unit/engine/utils.ts` (`mockRikishi`, `makeMockBasho`)

The existing `src/engine/bout/__tests__/tacticProfiles.test.ts` only asserts static table values. Add a test that actually simulates bouts and asserts the **outcome** moves with the tactic, passing the tactic the way the real code does — as the 5th positional argument to `resolveBout`.

- [ ] **Step 1: Write the test (expected to pass once wiring is correct — it documents the contract)**

Create `src/tests/unit/engine/bout/tacticWinRate.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { resolveBout } from "@/engine/bout/boutResolver";
import { mockRikishi, makeMockBasho } from "../utils";
import type { BoutContext } from "@/engine/bout/boutUtils";
import type { BoutTactic } from "@/engine/types/combat";

// IMPORTANT: tactic must be passed as the 5th positional arg; resolveBout
// overwrites bout.playerTactic from this parameter (boutResolver.ts:372).
function eastWinRate(tactic: BoutTactic, n = 300): number {
  let wins = 0;
  for (let day = 1; day <= n; day++) {
    const east = mockRikishi("r-east", {
      power: 60,
      speed: 60,
      balance: 60,
      technique: 60,
      momentum: 50,
      fatigue: 0,
    });
    const west = mockRikishi("r-west", {
      power: 60,
      speed: 60,
      balance: 60,
      technique: 60,
      momentum: 50,
      fatigue: 0,
    });
    const basho = makeMockBasho();
    const ctx: BoutContext = {
      id: `b-${day}`,
      day,
      rikishiEastId: east.id,
      rikishiWestId: west.id,
      playerSide: "east",
    };
    const { result } = resolveBout(ctx, east, west, basho, tactic);
    if (result.winner === "east") wins++;
  }
  return wins / n;
}

describe("tactic win-rate (end-to-end)", () => {
  it("moves ALL_OUT > STANDARD > DEFENSIVE_PULL", () => {
    const allOut = eastWinRate("ALL_OUT");
    const standard = eastWinRate("STANDARD");
    const defensive = eastWinRate("DEFENSIVE_PULL");
    expect(allOut).toBeGreaterThan(standard);
    expect(standard).toBeGreaterThan(defensive);
  });

  it("is deterministic: identical winner for the same tactic+seed", () => {
    const mk = () => {
      const east = mockRikishi("r-east", { power: 60, speed: 60, balance: 60 });
      const west = mockRikishi("r-west", { power: 60, speed: 60, balance: 60 });
      const basho = makeMockBasho();
      const ctx: BoutContext = {
        id: "b-1",
        day: 7,
        rikishiEastId: east.id,
        rikishiWestId: west.id,
        playerSide: "east",
      };
      return resolveBout(ctx, east, west, basho, "ALL_OUT").result.winner;
    };
    expect(mk()).toBe(mk());
  });
});
```

- [ ] **Step 2: Run the test**

Run: `npx vitest run src/tests/unit/engine/bout/tacticWinRate.test.ts`
Expected: PASS (direction holds; deterministic). If direction FAILS, the tactic wiring regressed — stop and investigate before Task 6.

- [ ] **Step 3: Commit**

```bash
git add src/tests/unit/engine/bout/tacticWinRate.test.ts
git commit -m "test(bout): real end-to-end tactic win-rate coverage"
```

---

### Task 6: Rebalance the extreme tactic win-rate swing

**Files:**

- Modify: `src/engine/bout/tacticProfiles.ts` (the `tachiaiPowerModifier` values)
- Test: `src/tests/unit/engine/bout/tacticWinRate.test.ts` (extend with bound assertions)

Measured swing for evenly-matched wrestlers is ALL_OUT ≈ 0.99 and DEFENSIVE_PULL ≈ 0.03. A tactic that turns a 50/50 into a near-certain win (for only a fatigue cost) removes the gamble. Reduce `tachiaiPowerModifier` magnitudes so tactics meaningfully but not decisively shift the outcome.

> **The target band below is a starting recommendation, not a product mandate.** Confirm the desired win-rate window with the product owner; adjust the constants and the test bounds together.

- [ ] **Step 1: Add the failing bound assertions**

Append to `describe("tactic win-rate (end-to-end)")` in `src/tests/unit/engine/bout/tacticWinRate.test.ts`:

```typescript
it("keeps the swing bounded (no auto-win / auto-loss) for evenly matched wrestlers", () => {
  const allOut = eastWinRate("ALL_OUT");
  const defensive = eastWinRate("DEFENSIVE_PULL");
  // A tactic should tilt, not decide. Tune with product; bounds are generous.
  expect(allOut).toBeLessThan(0.85);
  expect(defensive).toBeGreaterThan(0.15);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/tests/unit/engine/bout/tacticWinRate.test.ts -t "keeps the swing bounded"`
Expected: FAIL — ALL_OUT ≈ 0.99 (> 0.85), DEFENSIVE_PULL ≈ 0.03 (< 0.15).

- [ ] **Step 3: Reduce the modifiers**

In `src/engine/bout/tacticProfiles.ts`, lower the `tachiaiPowerModifier` magnitudes. Change `ALL_OUT` from `10` to `4`, `OSHI_THRUST` from `4` to `2`, `YOTSU_BELT` from `2` to `1`, `DEFENSIVE_PULL` from `-6` to `-3`. Leave `HENKA` (`-10`) — its modifier is a tachiai feint, not a straight power add, and is consumed by the henka branch in `physics/tachiai.ts`. Example for `ALL_OUT`:

```typescript
  ALL_OUT: {
    id: "ALL_OUT",
    label: "All-Out Attack",
    desc: "Maximum aggression. Higher win chance at a steep fatigue and injury cost.",
    kimariteWeightBias: { push: 1.4 },
    tachiaiPowerModifier: 4, // was 10 — bounded swing
    fatigueCost: 8,
    injuryRiskMultiplier: 1.5,
    momentumOnWin: 4,
    momentumOnLoss: -4,
  },
```

- [ ] **Step 4: Run the win-rate test to verify bounds + direction both hold**

Run: `npx vitest run src/tests/unit/engine/bout/tacticWinRate.test.ts`
Expected: PASS — direction preserved AND swing within bounds. If a bound still fails, nudge the constant (not the test band, unless product changed the target) and re-run.

- [ ] **Step 5: Confirm the static profile test still passes**

Run: `npx vitest run src/engine/bout/__tests__/tacticProfiles.test.ts`
Expected: PASS (its assertions are relative — `ALL_OUT > STANDARD > DEFENSIVE_PULL` — and survive the rescale).

- [ ] **Step 6: Commit**

```bash
git add src/engine/bout/tacticProfiles.ts src/tests/unit/engine/bout/tacticWinRate.test.ts
git commit -m "balance(bout): bound tactic win-rate swing"
```

---

## Final verification (run after all tasks)

- [ ] Full suite green: `npx vitest run` → all files pass (was 134 files / 1279 tests before this work; new tests add to that).
- [ ] No determinism violations remain in new code: `grep -rn "Math.random\|Date.now" src/engine/loop src/engine/bout/tacticProfiles.ts` → no output.
- [ ] Production build compiles: `npx vite build` → "built in …", no errors.
- [ ] Manual (`bun run dev`): trigger a `required` loop decision, then use "Sim Full Basho" / multi-day advance → the run halts and the decision modal opens (Task 3). Resolve each option → world reflects the effect (Task 4). In an active basho, set a player bout to ALL_OUT vs STANDARD → win tilt is noticeable but not automatic (Task 6).

## Product sign-off needed (not built here)

The merged decision taxonomy (`recruit_or_develop`, `ozeki_promotion`, `training_regime`) differs from the approved set (pre-basho readiness, insolvency response, weekly training emphasis, welfare diet). Tasks 1-4 make the _existing_ decisions correct and non-hollow, but **before investing in a taxonomy rewrite, confirm with the product owner** whether to (a) keep the current set, or (b) replace it with the approved set. If (b), that is a separate plan: each new decision needs a real tradeoff wired to `Heya.funds` / `Rikishi.fatigue` / `welfareState` via the `ImpactBuilder`, plus the blocking/queue tier per the approved hybrid design.

---

## Self-review notes

- **Spec coverage:** Must-fixes 1-6 each map to Tasks 1-6. The taxonomy item is explicitly deferred with a sign-off section (matching the original "or get sign-off" wording).
- **Type/name consistency:** `shouldHaltAdvance` named identically in helper, test, and worker import. `makeId` new signature `(prefix, seed, world)` applied at all three call sites. `transientContext` flags (`trainingRegime`, `trainingGrowthBuff`, `recruitmentIntent`) named consistently between Task 4 code and test, with a consumer-verification note to avoid written-but-unread flags.
- **No placeholders:** every code step shows the actual code; the only intentionally open value is the Task 6 balance band, flagged as product-tunable with concrete defaults.
