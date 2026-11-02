# Decision Taxonomy Swap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the placeholder loop-decision set (`recruit_or_develop` / `ozeki_promotion` / `training_regime`) with the originally-approved hybrid set — Pre-basho readiness, Insolvency response (blocking), Weekly training emphasis, Welfare diet (queue) — each wired to real engine state via `ImpactBuilder`, with sensible defaults auto-applied when a queue decision is ignored.

**Architecture:** All logic lives in the deterministic engine. Decisions are generated in `evaluatePendingDecisions` (read-only world scan → `StateImpact`), resolved in `resolveLoopDecision` (real mutations via `ImpactBuilder`), and ignored queue decisions are defaulted by a new `applyExpiredQueueDefaults` called from `phase00_preflight`. Blocking decisions set `world.pendingCrisis` (`required: true`) so the existing `CrisisModal` + worker `shouldHaltAdvance` halt the loop; queue decisions sit in `world.pendingDecisions` for the Action Queue.

**Tech Stack:** TypeScript engine, Vitest (jsdom), seeded RNG (`src/engine/rng.ts`), `ImpactBuilder` (`src/engine/core/ImpactBuilder.ts`).

---

## Status: product-approved

The product owner approved swapping the taxonomy (this plan replaces the deferred item from `2026-06-16-gameplay-depth-mustfix.md`). The hybrid tiers and tradeoffs below match the originally-approved Plan 3 table.

## Approved decision set

| Decision                     | Trigger                                                                      | Tier (`required`)     | Options → real effect                                                                                                          |
| ---------------------------- | ---------------------------------------------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Pre-basho readiness**      | entering `pre_basho`, player has ≥1 rikishi with `fatigue > 60` or `injured` | **Blocking** (`true`) | `rest` → at-risk rikishi `fatigue -= 20`, `momentum -= 5` (recover, lose edge); `push` → no change (accept risk)               |
| **Insolvency response**      | weekly tick, player heya `runwayBand ∈ {critical, desperate}`                | **Blocking** (`true`) | `loan` → merge `issueBailoutLoanIfNeeded`; `austerity` → `welfareState.activeDiet = "austerity"`                               |
| **Weekly training emphasis** | `interim` weekly tick, player has a `trainingState`                          | **Queue** (`false`)   | `intensive` → `activeProfile.intensity = "intensive"`; `conservative` → `"conservative"`. **Default if ignored: `"balanced"`** |
| **Welfare diet**             | weekly tick, player heya `welfareState.welfareRisk > 60`                     | **Queue** (`false`)   | `premium` → `activeDiet = "premium"`; `maintenance` → `"maintenance"`. **Default if ignored: `"maintenance"`**                 |

## Verified engine facts (use these — do not re-derive)

- `WorldState.pendingDecisions?: Array<{ id; type; description; deadlineWeek; options: {id;label;impact}[]; required }>` (`src/engine/types/world.ts:226`).
- `WorldState.pendingCrisis?: ActiveCrisis` (`:223`); `_preBashoAssessment?: PreBashoAssessment` (`:287`).
- `Heya`: `funds: number`, `runwayBand: RunwayBand`, `activeLoans?: Loan[]`, `welfareState?: WelfareState` (`src/engine/types/heya.ts`).
- `RunwayBand = "secure" | "comfortable" | "tight" | "critical" | "desperate"` (`src/engine/types/narrative.ts:32`).
- `DietRegimen = "austerity" | "maintenance" | "heavy_bulk" | "premium"`; `WelfareState.{welfareRisk:number, activeDiet:DietRegimen}` (`src/engine/types/economy.ts`).
- `TrainingIntensity = "conservative" | "balanced" | "intensive" | "punishing"`; `HeyaTrainingState.activeProfile.intensity` (`src/engine/types/training.ts`).
- `ImpactBuilder`: `.updateHeya(id, Partial<Heya>)`, `.updateRikishi(id, Partial<Rikishi>)`, `.updateTrainingStateNestedField(id, "activeProfile.intensity", value)`, `.merge(other: StateImpact)`, `.updateWorldField(field, value)`, `.build()` (`src/engine/core/ImpactBuilder.ts`).
- `issueBailoutLoanIfNeeded(world, heyaId): StateImpact` (`src/engine/loans.ts:109`).
- `makeId(prefix, seed, world)` already deterministic (uses `year`,`week`) from the prior plan.
- `shouldHaltAdvance(world)` halts the worker loop on `pendingCrisis` or any `required` decision (`src/engine/loop/shouldHaltAdvance.ts`) — already built.

## Conventions (enforced)

Deterministic only — never `Math.random()`/`Date.now()`; use `rngFromSeed`. Run tests with `npx vitest run` (NOT `bun test -- --run`). Test helpers `makeWorld`/`makeHeya`/`makeRikishi` already exist at the top of `src/engine/loop/__tests__/LoopDecisionEngine.test.ts`.

---

### Task 1: Replace the decision generators with the four approved decisions

**Files:**

- Modify: `src/engine/loop/LoopDecisionEngine.ts` — replace the three decision blocks in `evaluatePendingDecisions` (current lines ~37-148)
- Test: `src/engine/loop/__tests__/LoopDecisionEngine.test.ts`

- [ ] **Step 1: Write failing tests for the four triggers**

Replace the existing `describe("evaluatePendingDecisions", …)` trigger cases (the `recruit_or_develop`/`ozeki`/`training_regime` cases) with:

```typescript
describe("evaluatePendingDecisions — approved taxonomy", () => {
  it("pre_basho readiness is BLOCKING when a rikishi is fatigued", () => {
    const heya = makeHeya("h1", ["r1"]);
    const r = makeRikishi("r1", "makushita", "Tired");
    (r as unknown as { fatigue: number }).fatigue = 75;
    const world = makeWorld({
      cyclePhase: "pre_basho",
      playerHeyaId: "h1",
      heyas: new Map([["h1", heya]]),
      rikishi: new Map([["r1", r]]),
    });
    const impact = evaluatePendingDecisions(world);
    const decisions = impact.worldFields?.pendingDecisions as Array<{
      type: string;
      required: boolean;
    }>;
    const d = decisions.find((x) => x.type === "pre_basho_readiness");
    expect(d).toBeDefined();
    expect(d!.required).toBe(true);
    expect(impact.worldFields?.pendingCrisis).toBeDefined();
  });

  it("insolvency is BLOCKING when runway is desperate", () => {
    const heya = { ...makeHeya("h1", []), runwayBand: "desperate" } as unknown as ReturnType<
      typeof makeHeya
    >;
    const world = makeWorld({
      cyclePhase: "interim",
      playerHeyaId: "h1",
      week: 2,
      heyas: new Map([["h1", heya]]),
    });
    const impact = evaluatePendingDecisions(world);
    const decisions = impact.worldFields?.pendingDecisions as Array<{
      type: string;
      required: boolean;
    }>;
    expect(decisions.find((x) => x.type === "insolvency_response")?.required).toBe(true);
  });

  it("weekly training emphasis is a QUEUE decision in interim", () => {
    const heya = makeHeya("h1", ["r1"]);
    const world = makeWorld({
      cyclePhase: "interim",
      playerHeyaId: "h1",
      heyas: new Map([["h1", heya]]),
      rikishi: new Map([["r1", makeRikishi("r1", "makushita", "X")]]),
      trainingState: new Map([
        [
          "h1",
          {
            heyaId: "h1",
            activeProfile: {
              intensity: "balanced",
              focus: "neutral",
              styleBias: "neutral",
              recovery: "normal",
            },
            focusSlots: [],
          },
        ],
      ]),
    });
    const impact = evaluatePendingDecisions(world);
    const decisions = impact.worldFields?.pendingDecisions as Array<{
      type: string;
      required: boolean;
    }>;
    const d = decisions.find((x) => x.type === "weekly_training_emphasis");
    expect(d).toBeDefined();
    expect(d!.required).toBe(false);
  });

  it("welfare diet is a QUEUE decision when welfareRisk > 60", () => {
    const heya = {
      ...makeHeya("h1", []),
      welfareState: {
        welfareRisk: 75,
        activeDiet: "maintenance",
        complianceState: "watch",
        weeksInState: 0,
      },
    } as unknown as ReturnType<typeof makeHeya>;
    const world = makeWorld({
      cyclePhase: "interim",
      playerHeyaId: "h1",
      week: 3,
      heyas: new Map([["h1", heya]]),
    });
    const impact = evaluatePendingDecisions(world);
    const decisions = impact.worldFields?.pendingDecisions as Array<{
      type: string;
      required: boolean;
    }>;
    expect(decisions.find((x) => x.type === "welfare_diet")?.required).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run src/engine/loop/__tests__/LoopDecisionEngine.test.ts -t "approved taxonomy"`
Expected: FAIL — the new decision types are not produced yet.

- [ ] **Step 3: Replace the three decision blocks in `evaluatePendingDecisions`**

In `src/engine/loop/LoopDecisionEngine.ts`, delete the three existing decision blocks (the `recruit_or_develop`, `ozeki_promotion`, and `training_regime` blocks) and insert these four. Keep the surrounding `existing`/`newDecisions` scaffolding and the final append + blocking-crisis logic (lines ~150-171) unchanged.

```typescript
// Decision 1: Pre-basho readiness (BLOCKING)
if (world.cyclePhase === "pre_basho" && playerHeya) {
  const atRisk = (playerHeya.rikishiIds ?? []).filter((id) => {
    const r = world.rikishi.get(id);
    return !!r && ((r.fatigue ?? 0) > 60 || r.injured === true);
  });
  if (atRisk.length > 0 && !existing.some((d) => d.type === "pre_basho_readiness")) {
    newDecisions.push({
      id: makeId("prebasho", world.seed, world),
      type: "pre_basho_readiness",
      description: `${atRisk.length} wrestler(s) enter the basho fatigued or injured. Rest them or push for rank?`,
      deadlineWeek: currentWeek + 1,
      required: true,
      options: [
        {
          id: "rest",
          label: "Rest At-Risk Wrestlers",
          impact: "Lower injury risk; some lost conditioning (-momentum).",
        },
        {
          id: "push",
          label: "Push For Rank",
          impact: "Keep conditioning; accept the injury risk.",
        },
      ],
    });
  }
}

// Decision 2: Insolvency response (BLOCKING)
if (
  playerHeya &&
  (playerHeya.runwayBand === "critical" || playerHeya.runwayBand === "desperate") &&
  !existing.some((d) => d.type === "insolvency_response")
) {
  newDecisions.push({
    id: makeId("insolvency", world.seed, world),
    type: "insolvency_response",
    description: `Stable finances are ${playerHeya.runwayBand}. Choose a response:`,
    deadlineWeek: currentWeek + 1,
    required: true,
    options: [
      { id: "loan", label: "Take Emergency Loan", impact: "Cash now; monthly debt repayments." },
      { id: "austerity", label: "Austerity Diet", impact: "Cut costs; raises welfare risk." },
    ],
  });
}

// Decision 3: Weekly training emphasis (QUEUE)
if (
  world.cyclePhase === "interim" &&
  playerHeya &&
  world.trainingState?.get(playerHeya.id) &&
  !existing.some((d) => d.type === "weekly_training_emphasis")
) {
  newDecisions.push({
    id: makeId("training", world.seed, world),
    type: "weekly_training_emphasis",
    description: "Set this week's training emphasis:",
    deadlineWeek: currentWeek + 1,
    required: false,
    options: [
      {
        id: "intensive",
        label: "Intensive",
        impact: "Faster gains; more fatigue and injury risk.",
      },
      { id: "conservative", label: "Conservative", impact: "Slower gains; safer." },
    ],
  });
}

// Decision 4: Welfare diet (QUEUE)
if (
  playerHeya &&
  (playerHeya.welfareState?.welfareRisk ?? 0) > 60 &&
  !existing.some((d) => d.type === "welfare_diet")
) {
  newDecisions.push({
    id: makeId("welfare", world.seed, world),
    type: "welfare_diet",
    description: `Welfare risk is high (${playerHeya.welfareState?.welfareRisk}). Adjust the diet?`,
    deadlineWeek: currentWeek + 1,
    required: false,
    options: [
      { id: "premium", label: "Premium Diet", impact: "Lowers welfare risk; higher cost." },
      { id: "maintenance", label: "Maintenance Diet", impact: "Cheaper; risk persists." },
    ],
  });
}
```

- [ ] **Step 4: Run to verify the new trigger tests pass**

Run: `npx vitest run src/engine/loop/__tests__/LoopDecisionEngine.test.ts -t "approved taxonomy"`
Expected: PASS.

- [ ] **Step 5: Remove now-obsolete old-decision tests**

Delete any remaining test cases in this file that reference `recruit_or_develop`, `ozeki_promotion`, or `training_regime` (they assert behavior this task removed). Keep the determinism tests (`identical decision IDs`) but update their expectations to the new types if they assert a specific type.

- [ ] **Step 6: Run the whole file**

Run: `npx vitest run src/engine/loop/__tests__/LoopDecisionEngine.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/engine/loop/LoopDecisionEngine.ts src/engine/loop/__tests__/LoopDecisionEngine.test.ts
git commit -m "feat(loop): generate the approved decision taxonomy"
```

---

### Task 2: Implement real effects for all new options in `resolveLoopDecision`

**Files:**

- Modify: `src/engine/loop/LoopDecisionEngine.ts` — replace the option-effect bodies in `resolveLoopDecision` (current lines ~200-242)
- Test: `src/engine/loop/__tests__/LoopDecisionEngine.test.ts`

- [ ] **Step 1: Write failing effect tests**

Add:

```typescript
describe("resolveLoopDecision — approved effects", () => {
  function withDecision(type: string, optId: string, extra: Record<string, unknown> = {}) {
    return makeWorld({
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
          required: type.includes("pre_basho") || type.includes("insolvency"),
          options: [{ id: optId, label: optId, impact: "x" }],
        },
      ],
      ...extra,
    });
  }

  it("pre_basho rest reduces fatigue for at-risk rikishi", () => {
    const r = makeRikishi("r1", "makushita", "X");
    (r as unknown as { fatigue: number }).fatigue = 80;
    const world = withDecision("pre_basho_readiness", "rest", { rikishi: new Map([["r1", r]]) });
    const impact = resolveLoopDecision(world, "pre_basho_readiness-1", "rest");
    const upd =
      impact.entities?.rikishiUpdates instanceof Map
        ? impact.entities.rikishiUpdates.get("r1")
        : undefined;
    expect((upd as { fatigue: number }).fatigue).toBe(60); // 80 - 20
  });

  it("insolvency austerity sets activeDiet to austerity", () => {
    const world = withDecision("insolvency_response", "austerity");
    const impact = resolveLoopDecision(world, "insolvency_response-1", "austerity");
    const upd =
      impact.entities?.heyaUpdates instanceof Map
        ? impact.entities.heyaUpdates.get("h1")
        : undefined;
    expect((upd as { welfareState: { activeDiet: string } }).welfareState.activeDiet).toBe(
      "austerity"
    );
  });

  it("weekly_training_emphasis intensive sets training intensity", () => {
    const world = withDecision("weekly_training_emphasis", "intensive", {
      trainingState: new Map([
        [
          "h1",
          {
            heyaId: "h1",
            activeProfile: {
              intensity: "balanced",
              focus: "neutral",
              styleBias: "neutral",
              recovery: "normal",
            },
            focusSlots: [],
          },
        ],
      ]),
    });
    const impact = resolveLoopDecision(world, "weekly_training_emphasis-1", "intensive");
    const upd =
      impact.entities?.trainingStateUpdates instanceof Map
        ? impact.entities.trainingStateUpdates.get("h1")
        : undefined;
    expect(JSON.stringify(upd)).toContain("intensive");
  });

  it("removes the decision after resolution", () => {
    const world = withDecision("welfare_diet", "premium");
    const impact = resolveLoopDecision(world, "welfare_diet-1", "premium");
    expect(impact.worldFields?.pendingDecisions).toEqual([]);
  });
});
```

> Confirm `impact.entities.heyaUpdates` / `rikishiUpdates` / `trainingStateUpdates` accessor names against `src/engine/core/StateImpact.ts` before running; align the test if they differ.

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run src/engine/loop/__tests__/LoopDecisionEngine.test.ts -t "approved effects"`
Expected: FAIL.

- [ ] **Step 3: Replace the effect bodies in `resolveLoopDecision`**

Add the import at the top of the file (next to the existing imports):

```typescript
import { issueBailoutLoanIfNeeded } from "../loans";
```

In `resolveLoopDecision`, after the decision-removal lines (`builder.updateWorldField("pendingDecisions", remaining)` and the `pendingCrisis` clear), delete the old `recruit_or_develop` / `training_regime` / `ozeki_promotion` effect blocks and insert:

```typescript
const heya = world.playerHeyaId ? world.heyas.get(world.playerHeyaId) : undefined;

if (decision.type === "pre_basho_readiness" && optionId === "rest" && heya) {
  for (const id of heya.rikishiIds ?? []) {
    const r = world.rikishi.get(id);
    if (!r || !((r.fatigue ?? 0) > 60 || r.injured)) continue;
    builder.updateRikishi(id, {
      fatigue: Math.max(0, (r.fatigue ?? 0) - 20),
      momentum: Math.max(0, (r.momentum ?? 50) - 5),
    });
  }
  // "push" intentionally has no effect — the player accepts the risk.
}

if (decision.type === "insolvency_response" && heya) {
  if (optionId === "loan") {
    builder.merge(issueBailoutLoanIfNeeded(world, heya.id));
  } else if (optionId === "austerity") {
    builder.updateHeya(heya.id, {
      welfareState: { ...heya.welfareState, activeDiet: "austerity" },
    } as never);
  }
}

if (
  decision.type === "weekly_training_emphasis" &&
  heya &&
  (optionId === "intensive" || optionId === "conservative")
) {
  builder.updateTrainingStateNestedField(heya.id, "activeProfile.intensity", optionId);
}

if (
  decision.type === "welfare_diet" &&
  heya &&
  (optionId === "premium" || optionId === "maintenance")
) {
  builder.updateHeya(heya.id, {
    welfareState: { ...heya.welfareState, activeDiet: optionId },
  } as never);
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/engine/loop/__tests__/LoopDecisionEngine.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/loop/LoopDecisionEngine.ts src/engine/loop/__tests__/LoopDecisionEngine.test.ts
git commit -m "feat(loop): real effects for approved decision options"
```

---

### Task 3: Auto-apply defaults for ignored queue decisions

**Files:**

- Modify: `src/engine/loop/LoopDecisionEngine.ts` — add `applyExpiredQueueDefaults`
- Modify: `src/engine/tick/phases/phase00_preflight.ts` — call it (currently calls `evaluatePendingDecisions` at line ~67)
- Test: `src/engine/loop/__tests__/LoopDecisionEngine.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
describe("applyExpiredQueueDefaults", () => {
  it("applies the default and removes a queue decision past its deadline", () => {
    const world = makeWorld({
      seed: "s",
      playerHeyaId: "h1",
      week: 5,
      heyas: new Map([["h1", makeHeya("h1", [])]]),
      trainingState: new Map([
        [
          "h1",
          {
            heyaId: "h1",
            activeProfile: {
              intensity: "intensive",
              focus: "neutral",
              styleBias: "neutral",
              recovery: "normal",
            },
            focusSlots: [],
          },
        ],
      ]),
      pendingDecisions: [
        {
          id: "wt-1",
          type: "weekly_training_emphasis",
          description: "x",
          deadlineWeek: 3,
          required: false,
          options: [],
        },
      ],
    });
    const impact = applyExpiredQueueDefaults(world);
    // default intensity is "balanced"
    const upd =
      impact.entities?.trainingStateUpdates instanceof Map
        ? impact.entities.trainingStateUpdates.get("h1")
        : undefined;
    expect(JSON.stringify(upd)).toContain("balanced");
    expect(impact.worldFields?.pendingDecisions).toEqual([]);
  });

  it("does not touch a queue decision still within its deadline", () => {
    const world = makeWorld({
      seed: "s",
      playerHeyaId: "h1",
      week: 2,
      heyas: new Map([["h1", makeHeya("h1", [])]]),
      pendingDecisions: [
        {
          id: "wt-1",
          type: "weekly_training_emphasis",
          description: "x",
          deadlineWeek: 3,
          required: false,
          options: [],
        },
      ],
    });
    const impact = applyExpiredQueueDefaults(world);
    expect(impact.worldFields?.pendingDecisions).toBeUndefined();
  });
});
```

Add `applyExpiredQueueDefaults` to the imports at the top of the test file:

```typescript
import {
  evaluatePendingDecisions,
  resolveLoopDecision,
  applyExpiredQueueDefaults,
} from "../LoopDecisionEngine";
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/engine/loop/__tests__/LoopDecisionEngine.test.ts -t "applyExpiredQueueDefaults"`
Expected: FAIL — function not exported.

- [ ] **Step 3: Implement `applyExpiredQueueDefaults`**

Add to `src/engine/loop/LoopDecisionEngine.ts`:

```typescript
/** Default option per queue decision type when the player ignores it. */
const QUEUE_DEFAULTS: Record<string, string> = {
  weekly_training_emphasis: "balanced",
  welfare_diet: "maintenance",
};

/**
 * Apply sensible defaults to non-required (queue) decisions whose deadline has
 * passed, then drop them. Keeps blocking decisions untouched (they must be
 * resolved by the player). Deterministic — pure function of world state.
 */
export function applyExpiredQueueDefaults(world: WorldState): StateImpact {
  const builder = createImpactBuilder("applyExpiredQueueDefaults");
  const decisions = world.pendingDecisions ?? [];
  const currentWeek = world.week ?? 1;
  const heya = world.playerHeyaId ? world.heyas.get(world.playerHeyaId) : undefined;

  const expired = decisions.filter((d) => !d.required && currentWeek > d.deadlineWeek);
  if (expired.length === 0) return builder.build();

  for (const d of expired) {
    const def = QUEUE_DEFAULTS[d.type];
    if (!def || !heya) continue;
    if (d.type === "weekly_training_emphasis") {
      builder.updateTrainingStateNestedField(heya.id, "activeProfile.intensity", def);
    } else if (d.type === "welfare_diet") {
      builder.updateHeya(heya.id, {
        welfareState: { ...heya.welfareState, activeDiet: def },
      } as never);
    }
  }

  const remaining = decisions.filter((d) => !expired.includes(d));
  builder.updateWorldField("pendingDecisions", remaining);
  return builder.build();
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/engine/loop/__tests__/LoopDecisionEngine.test.ts -t "applyExpiredQueueDefaults"`
Expected: PASS.

- [ ] **Step 5: Wire into preflight**

In `src/engine/tick/phases/phase00_preflight.ts`, find the existing `evaluatePendingDecisions` call (~line 67) and the import line. Update the import:

```typescript
import { evaluatePendingDecisions, applyExpiredQueueDefaults } from "../../loop/LoopDecisionEngine";
```

Immediately after the line that captures `evaluatePendingDecisions(world)`'s impact, add a second impact and ensure both are returned/merged the same way the existing one is. If preflight returns a single impact, merge them:

```typescript
const decisionImpact = evaluatePendingDecisions(world);
const defaultsImpact = applyExpiredQueueDefaults(world);
// Merge defaultsImpact into whatever aggregation preflight already does with decisionImpact.
```

> Match the file's existing impact-aggregation style (it may push into an array of impacts or merge via `ImpactBuilder.merge`). Apply `defaultsImpact` the same way `decisionImpact` is applied so it actually reaches `resolveImpacts`.

- [ ] **Step 6: Run the preflight + loop suites**

Run: `npx vitest run src/engine/loop src/engine/tick`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/engine/loop/LoopDecisionEngine.ts src/engine/loop/__tests__/LoopDecisionEngine.test.ts src/engine/tick/phases/phase00_preflight.ts
git commit -m "feat(loop): auto-apply defaults for ignored queue decisions"
```

---

### Task 4: Remove dead code from the superseded taxonomy

The old decisions fed `transientContext` flags (`trainingRegime`, `trainingGrowthBuff`, `recruitmentIntent`) consumed by `TrainingService` and a dedicated recruitment phase. With the old decisions gone, those flags are never set, so the consumers are dead code.

**Files:**

- Modify: `src/engine/systems/training/TrainingService.ts` — remove the `trainingRegime` / `trainingGrowthBuff` read/apply/clear blocks (lines ~110-113, ~248-266, ~359-365)
- Delete: `src/engine/tick/phases/phase01_week_recruitment.ts` and its test `src/engine/tick/phases/__tests__/phase01_week_recruitment.test.ts`
- Modify: `src/engine/tick/phases/index.ts` (remove the export line ~17), `src/engine/tick/pipelines/bashoPipeline.ts:31`, `src/engine/tick/pipelines/offSeasonPipeline.ts:31` (remove `phases.phase01_week_recruitment`)
- Delete: `src/engine/systems/training/__tests__/TrainingServiceFlagConsumption.test.ts`

- [ ] **Step 1: Confirm the flags have no other writers**

Run: `grep -rn "trainingRegime\|trainingGrowthBuff\|recruitmentIntent" src/engine | grep -v "__tests__"`
Expected: after Tasks 1-2, the only matches are the consumer sites listed above (no writers remain). If any writer remains, stop — the cleanup is premature.

- [ ] **Step 2: Remove the `TrainingService` flag handling**

In `src/engine/systems/training/TrainingService.ts`, delete the three blocks that read `tc?.trainingRegime` / `tc?.trainingGrowthBuff`, apply them to `finalGrowth`, and clear them from `transientContext`. Leave the rest of `applyWeeklyTraining` intact.

- [ ] **Step 3: Remove the recruitment phase and its wiring**

- Delete `src/engine/tick/phases/phase01_week_recruitment.ts` and `src/engine/tick/phases/__tests__/phase01_week_recruitment.test.ts`.
- In `src/engine/tick/phases/index.ts`, delete the `export * from "./phase01_week_recruitment";` line.
- In `src/engine/tick/pipelines/bashoPipeline.ts` and `src/engine/tick/pipelines/offSeasonPipeline.ts`, delete the `phases.phase01_week_recruitment,` entry.
- Delete `src/engine/systems/training/__tests__/TrainingServiceFlagConsumption.test.ts`.

- [ ] **Step 4: Confirm nothing references the removed symbols**

Run: `grep -rn "phase01_week_recruitment\|trainingRegime\|trainingGrowthBuff\|recruitmentIntent" src`
Expected: no output.

- [ ] **Step 5: Run the full suite**

Run: `npx vitest run`
Expected: PASS (no broken imports, no orphaned-flag tests).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore(loop): remove dead code from superseded decision taxonomy"
```

---

### Task 5: Full verification

- [ ] **Step 1: Determinism + dead-code greps**

Run: `grep -rn "Math.random\|Date.now" src/engine/loop`
Expected: no output.
Run: `grep -rn "recruit_or_develop\|ozeki_promotion\|training_regime" src/engine`
Expected: no output (old types fully gone).

- [ ] **Step 2: Full suite**

Run: `npx vitest run`
Expected: all files pass.

- [ ] **Step 3: Build**

Run: `npx vite build`
Expected: "built in …", no errors.

- [ ] **Step 4: Manual smoke test**

Run: `bun run dev`. Then:

- Drive a player heya into `runwayBand: "desperate"` (or seed it) and advance a week → multi-day advance halts, `CrisisModal` shows the **Insolvency response**; pick "Take Emergency Loan" → a loan appears and funds rise; pick "Austerity Diet" on a fresh run → diet flips to austerity.
- Enter `pre_basho` with a fatigued wrestler → blocking **Pre-basho readiness**; "Rest" lowers that wrestler's fatigue.
- In `interim`, see **Weekly training emphasis** and **Welfare diet** (when risk > 60) appear in the Action Queue (non-blocking). Ignore the training one past its deadline → intensity defaults to `balanced` and the card disappears.

- [ ] **Step 5: Commit (if any manual-fix tweaks were needed)**

```bash
git add -A
git commit -m "test(loop): verify approved decision taxonomy end-to-end"
```

---

## Self-review notes

- **Spec coverage:** All four approved decisions (pre-basho readiness, insolvency, weekly training, welfare diet) are generated (Task 1), have real effects (Task 2), queue ones default-on-ignore (Task 3); superseded code removed (Task 4); verified (Task 5).
- **Type/name consistency:** decision `type` strings (`pre_basho_readiness`, `insolvency_response`, `weekly_training_emphasis`, `welfare_diet`) and option ids (`rest`/`push`, `loan`/`austerity`, `intensive`/`conservative`, `premium`/`maintenance`) are identical across Tasks 1-3 and `QUEUE_DEFAULTS`. `applyExpiredQueueDefaults` named identically in engine, export, test import, and preflight. Enum values match the verified types (`DietRegimen`, `TrainingIntensity`).
- **Placeholder scan:** every code step shows real code using verified APIs (`updateHeya`, `updateRikishi`, `updateTrainingStateNestedField`, `merge`, `issueBailoutLoanIfNeeded`). The two "confirm accessor name / match aggregation style" notes are verification guards, not deferred implementation — the surrounding code is complete.
- **Reuse:** leans on existing `issueBailoutLoanIfNeeded`, `ImpactBuilder`, `makeId`, `shouldHaltAdvance`, `CrisisModal`, and the Action Queue rather than new infrastructure.

```

```
