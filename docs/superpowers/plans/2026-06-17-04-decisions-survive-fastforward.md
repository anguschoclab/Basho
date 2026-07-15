# Decisions Survive Fast-Forward — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop AutoSim/holiday from silently skipping all loop decisions. Instead, auto-resolve each pending decision using the player's delegation policy, apply its real effect, and report what was decided in a "while you were away" digest — so the decision depth persists across the play mode used for long careers.

**Architecture:** Extract decision _detection_ and _effect application_ into reusable helpers (DRY with the interactive path). Add a policy-keyed default table + an `autonomouslyResolveDecisions` function. In autonomous runs, `phase00_preflight` calls it instead of suppressing decisions; resolutions are logged and surfaced as AutoSim chronicle highlights.

**Tech Stack:** TS engine, `ImpactBuilder`, `phase00_preflight`, `runAutoSim`/`runHoliday`, `ChronicleService`.

---

## Background facts (verified — use these)

- Today, autonomous runs set `world._autonomousSim = true`; `evaluatePendingDecisions` and `applyExpiredQueueDefaults` early-return empty when it's set, and `tickDaily.ts:108` skips the crisis halt. Net effect: **no decisions happen at all during AutoSim/holiday**.
- `runAutoSim` (`src/engine/simulation/AutoSimService.ts`) sets `_autonomousSim`; `runHoliday` (`src/engine/holiday.ts`) sets it too. `AutoSimConfig.delegationPolicy: "conservative" | "balanced" | "aggressive"`.
- `AutoSimResult.chronicle.highlights: string[]` is rendered by `AutoSimResultDialog` (`src/components/game/AutoSimResultDialog.tsx:47`). `ChronicleService.addHighlight(report, string)` (`src/engine/simulation/ChronicleService.ts:64`).
- `LoopDecisionEngine.ts` currently has: `evaluatePendingDecisions(world)`, `resolveLoopDecision(world, decisionId, optionId)`, `applyExpiredQueueDefaults(world)`, and a `QUEUE_DEFAULTS` map. Decision types: `pre_basho_readiness`, `insolvency_response`, `weekly_training_emphasis`, `welfare_diet`. Option ids: `rest`/`push`, `loan`/`austerity`, `intensive`/`conservative`, `premium`/`maintenance`.
- `ImpactBuilder.logEvent(type, category, data, { heyaId })`.

---

### Task 1: Refactor — extract `detectDueDecisions` and `applyDecisionEffect` (behavior-preserving)

**Files:**

- Modify: `src/engine/loop/LoopDecisionEngine.ts`
- Test: `src/engine/loop/__tests__/LoopDecisionEngine.test.ts` (existing — must stay green)

- [ ] **Step 1: Run the existing suite to capture the green baseline**

Run: `npx vitest run src/engine/loop/__tests__/LoopDecisionEngine.test.ts`
Expected: PASS (this is the regression guard for the refactor).

- [ ] **Step 2: Extract `detectDueDecisions`**

In `src/engine/loop/LoopDecisionEngine.ts`, add a pure function that returns the decisions due this tick (move the four trigger `if`-blocks' construction logic here), and have `evaluatePendingDecisions` consume it:

```typescript
/** Pure: which decisions are due this tick for the player heya (no world mutation). */
export function detectDueDecisions(world: WorldState): LoopDecision[] {
  if (world._autonomousSim) {
    // detection still runs in autonomous mode; the caller decides what to do with them
  }
  const out: LoopDecision[] = [];
  const currentWeek = world.week ?? 1;
  const playerHeya = world.playerHeyaId ? world.heyas.get(world.playerHeyaId) : undefined;
  const existing = world.pendingDecisions ?? [];
  if (!playerHeya) return out;

  // (move the four existing detection blocks here, pushing to `out` instead of `newDecisions`)
  // pre_basho_readiness, insolvency_response, weekly_training_emphasis, welfare_diet
  // — keep the exact same predicates, makeId calls, options, and `required` flags.

  return out;
}
```

Then rewrite `evaluatePendingDecisions` to use it (keeping the autonomous early-return and the pending/crisis writes exactly as before):

```typescript
export function evaluatePendingDecisions(world: WorldState): StateImpact {
  const builder = createImpactBuilder("evaluatePendingDecisions");
  if (world._autonomousSim) return builder.build();
  const existing = world.pendingDecisions ?? [];
  const newDecisions = detectDueDecisions(world);
  if (newDecisions.length > 0) {
    builder.updateWorldField("pendingDecisions", [...existing, ...newDecisions]);
  }
  const blocking = [...existing, ...newDecisions].filter((d) => d.required);
  if (blocking.length > 0 && !world.pendingCrisis) {
    const first = blocking[0];
    builder.updateWorldField("pendingCrisis", {
      id: first.id,
      type: "loop_decision",
      title: first.description,
      description: first.description,
      options: first.options.map((o) => ({
        id: o.id,
        label: o.label,
        description: o.impact,
        impactGenerator: () => createImpactBuilder("loopDecision").build(),
      })),
    } as never);
  }
  return builder.build();
}
```

- [ ] **Step 3: Extract `applyDecisionEffect`**

Move the per-option mutation bodies out of `resolveLoopDecision` into a shared helper, and have `resolveLoopDecision` call it:

```typescript
/** Apply a decision option's real engine effect to the builder. Shared by the
 *  interactive (resolveLoopDecision) and autonomous (auto-resolve) paths. */
export function applyDecisionEffect(
  world: WorldState,
  builder: ReturnType<typeof createImpactBuilder>,
  decisionType: string,
  optionId: string
): void {
  const heya = world.playerHeyaId ? world.heyas.get(world.playerHeyaId) : undefined;
  if (!heya) return;

  if (decisionType === "pre_basho_readiness" && optionId === "rest") {
    for (const id of heya.rikishiIds ?? []) {
      const r = world.rikishi.get(id);
      if (!r || !((r.fatigue ?? 0) > 60 || r.injured)) continue;
      builder.updateRikishi(id, {
        fatigue: Math.max(0, (r.fatigue ?? 0) - 20),
        momentum: Math.max(0, (r.momentum ?? 50) - 5),
      });
    }
  }
  if (decisionType === "insolvency_response") {
    if (optionId === "loan") builder.merge(issueBailoutLoanIfNeeded(world, heya.id));
    else if (optionId === "austerity")
      builder.updateHeya(heya.id, {
        welfareState: { ...heya.welfareState, activeDiet: "austerity" },
      } as never);
  }
  if (
    decisionType === "weekly_training_emphasis" &&
    (optionId === "intensive" || optionId === "conservative")
  ) {
    builder.updateTrainingStateNestedField(heya.id, "activeProfile.intensity", optionId);
  }
  if (decisionType === "welfare_diet" && (optionId === "premium" || optionId === "maintenance")) {
    builder.updateHeya(heya.id, {
      welfareState: { ...heya.welfareState, activeDiet: optionId },
    } as never);
  }
}
```

In `resolveLoopDecision`, replace the inline effect blocks with `applyDecisionEffect(world, builder, decision.type, optionId);` (keep the decision-removal and `pendingCrisis` clear logic).

- [ ] **Step 4: Run the suite — refactor must be behavior-preserving**

Run: `npx vitest run src/engine/loop/__tests__/LoopDecisionEngine.test.ts`
Expected: PASS (same tests, unchanged behavior).

- [ ] **Step 5: Commit**

```bash
git add src/engine/loop/LoopDecisionEngine.ts
git commit -m "refactor(loop): extract detectDueDecisions and applyDecisionEffect"
```

---

### Task 2: Policy defaults + `autonomouslyResolveDecisions`

**Files:**

- Modify: `src/engine/loop/LoopDecisionEngine.ts`
- Test: `src/engine/loop/__tests__/LoopDecisionEngine.test.ts`

- [ ] **Step 1: Write the failing test**

Add:

```typescript
describe("autonomouslyResolveDecisions", () => {
  it("resolves due decisions with the policy default and logs an event", () => {
    const heya = makeHeya("h1", ["r1"]);
    const r = makeRikishi("r1", "makushita", "Tired");
    (r as unknown as { fatigue: number }).fatigue = 80;
    const world = makeWorld({
      cyclePhase: "pre_basho",
      playerHeyaId: "h1",
      _autonomousSim: true,
      heyas: new Map([["h1", heya]]),
      rikishi: new Map([["r1", r]]),
    });
    const impact = autonomouslyResolveDecisions(world, "balanced");
    // balanced default for pre_basho_readiness is "rest" -> fatigue reduced
    const upd =
      impact.entities?.rikishiUpdates instanceof Map
        ? impact.entities.rikishiUpdates.get("r1")
        : undefined;
    expect((upd as { fatigue: number }).fatigue).toBe(60);
    // and it does NOT leave anything pending
    expect(impact.worldFields?.pendingDecisions).toBeUndefined();
    expect(impact.worldFields?.pendingCrisis).toBeUndefined();
    // and it logs a decision event
    expect((impact.events ?? []).some((e) => e.type === "DECISION_AUTO_RESOLVED")).toBe(true);
  });
});
```

Add `autonomouslyResolveDecisions` to the test import list at the top of the file.

> Confirm `EngineEventType` allows `"DECISION_AUTO_RESOLVED"`; if the union is closed, add it to the event-type union (`src/engine/types/` events file) or use an existing narrative type like `"LIFECYCLE_EVENT"` and assert on `data.status` instead.

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/engine/loop/__tests__/LoopDecisionEngine.test.ts -t "autonomouslyResolveDecisions"`
Expected: FAIL — function not exported.

- [ ] **Step 3: Implement defaults + resolver**

Add to `src/engine/loop/LoopDecisionEngine.ts`:

```typescript
type DelegationPolicy = "conservative" | "balanced" | "aggressive";

/** Default option each policy picks per decision type when auto-delegating. */
const DELEGATION_DEFAULTS: Record<DelegationPolicy, Record<string, string>> = {
  conservative: {
    pre_basho_readiness: "rest",
    insolvency_response: "loan",
    weekly_training_emphasis: "conservative",
    welfare_diet: "premium",
  },
  balanced: {
    pre_basho_readiness: "rest",
    insolvency_response: "loan",
    weekly_training_emphasis: "intensive",
    welfare_diet: "maintenance",
  },
  aggressive: {
    pre_basho_readiness: "push",
    insolvency_response: "austerity",
    weekly_training_emphasis: "intensive",
    welfare_diet: "maintenance",
  },
};

/** Autonomous path: detect due decisions, apply the policy default, log each. Never leaves anything pending. */
export function autonomouslyResolveDecisions(
  world: WorldState,
  policy: DelegationPolicy
): StateImpact {
  const builder = createImpactBuilder("autonomouslyResolveDecisions");
  const due = detectDueDecisions(world);
  if (due.length === 0) return builder.build();
  const table = DELEGATION_DEFAULTS[policy] ?? DELEGATION_DEFAULTS.balanced;
  const heyaId = world.playerHeyaId;
  for (const d of due) {
    const optionId = table[d.type] ?? d.options[0]?.id;
    if (!optionId) continue;
    applyDecisionEffect(world, builder, d.type, optionId);
    builder.logEvent(
      "DECISION_AUTO_RESOLVED",
      "narrative",
      {
        status: "auto_resolved",
        decisionType: d.type,
        optionId,
        summary: `${d.description} → ${optionId}`,
      },
      heyaId ? { heyaId } : undefined
    );
  }
  return builder.build();
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/engine/loop/__tests__/LoopDecisionEngine.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/loop/LoopDecisionEngine.ts src/engine/loop/__tests__/LoopDecisionEngine.test.ts
git commit -m "feat(loop): autonomous decision resolution via delegation policy"
```

---

### Task 3: Wire autonomous resolution into the tick + carry the policy

**Files:**

- Modify: `src/engine/types/world.ts` (add `_autonomousPolicy`)
- Modify: `src/engine/tick/phases/phase00_preflight.ts`
- Modify: `src/engine/simulation/AutoSimService.ts` (set policy)
- Test: `src/tests/unit/engine/banzukePromotion.test.ts` (existing — must stay green; proves no freeze)

- [ ] **Step 1: Add the policy field**

In `src/engine/types/world.ts`, beside `_autonomousSim`:

```typescript
  /** Delegation policy used to auto-resolve loop decisions during autonomous runs. */
  _autonomousPolicy?: "conservative" | "balanced" | "aggressive";
```

- [ ] **Step 2: Branch preflight on autonomous vs interactive**

In `src/engine/tick/phases/phase00_preflight.ts`, replace the two existing decision calls (around lines 67-72) with:

```typescript
// 5/6. Loop decisions: auto-resolve in autonomous runs, otherwise surface for the player.
if (world._autonomousSim) {
  builder.merge(autonomouslyResolveDecisions(world, world._autonomousPolicy ?? "balanced"));
} else {
  builder.merge(evaluatePendingDecisions(world));
  builder.merge(applyExpiredQueueDefaults(world));
}
```

Update the import:

```typescript
import {
  evaluatePendingDecisions,
  applyExpiredQueueDefaults,
  autonomouslyResolveDecisions,
} from "../../loop/LoopDecisionEngine";
```

- [ ] **Step 3: Pass the policy from AutoSim**

In `src/engine/simulation/AutoSimService.ts`, where it sets `_autonomousSim` (the `let currentWorld: WorldState = { ...world, _autonomousSim: true };` line), also set the policy:

```typescript
let currentWorld: WorldState = {
  ...world,
  _autonomousSim: true,
  _autonomousPolicy: config.delegationPolicy,
};
```

- [ ] **Step 4: Run the freeze regression + loop suites**

Run: `npx vitest run src/tests/unit/engine/banzukePromotion.test.ts src/engine/loop`
Expected: PASS — the 12-basho AutoSim still completes (no freeze) AND now exercises auto-resolution.

- [ ] **Step 5: Commit**

```bash
git add src/engine/types/world.ts src/engine/tick/phases/phase00_preflight.ts src/engine/simulation/AutoSimService.ts
git commit -m "feat(loop): auto-resolve decisions during autonomous runs with delegation policy"
```

---

### Task 4: Surface a "while you were away" digest in the AutoSim result

**Files:**

- Modify: `src/engine/simulation/AutoSimService.ts`
- Test: `src/tests/unit/engine/autoSimDigest.test.ts` (new)

- [ ] **Step 1: Write the failing test**

Create `src/tests/unit/engine/autoSimDigest.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { runAutoSim } from "@/engine/simulation/AutoSimService";
import { generateInitialWorld } from "@/engine/systems/generation/WorldFactory";

describe("AutoSim while-you-were-away digest", () => {
  it("adds auto-resolved decisions to the chronicle highlights", () => {
    const world = generateInitialWorld("digest-test-001");
    const result = runAutoSim(world, {
      duration: { type: "basho", count: 2 },
      stopConditions: ["never"],
      verbosity: "standard",
      delegationPolicy: "balanced",
      observerMode: true,
    });
    const hasDecisionHighlight = result.chronicle.highlights.some((h) => /Auto-decided|→/.test(h));
    expect(hasDecisionHighlight).toBe(true);
  });
});
```

> If 2 basho is not enough to trigger any decision for this seed, raise `count` to 4 or pick a seed whose player heya hits a trigger (e.g. forces a fatigued wrestler). The assertion only needs at least one auto-resolved decision over the run.

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/tests/unit/engine/autoSimDigest.test.ts`
Expected: FAIL — no decision highlights yet.

- [ ] **Step 3: Collect decision events into highlights**

In `src/engine/simulation/AutoSimService.ts`, after the `while` loop ends and before building the result, scan the final world's event log for auto-resolved decisions and add them as highlights (cap to keep the dialog readable):

```typescript
const decisionEvents = (currentWorld.events?.log ?? [])
  .filter((e) => (e as { type?: string }).type === "DECISION_AUTO_RESOLVED")
  .slice(-10);
for (const e of decisionEvents) {
  const summary =
    (e as { data?: { summary?: string } }).data?.summary ?? "Auto-decided a stable matter";
  ChronicleService.addHighlight(chronicle, `Auto-decided: ${summary}`);
}
```

> Confirm the event-log accessor (`currentWorld.events.log`) and that `ChronicleService` is already imported in this file (it is — `createEmptyReport`/`addHighlight` are used for yusho highlights).

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/tests/unit/engine/autoSimDigest.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/simulation/AutoSimService.ts src/tests/unit/engine/autoSimDigest.test.ts
git commit -m "feat(autosim): surface auto-resolved decisions in the result digest"
```

---

## Final verification

- [ ] `npx vitest run` — full suite green (incl. `banzukePromotion` — no freeze).
- [ ] `npx vite build` — clean.
- [ ] Manual: run AutoSim a few basho from the Time Controls → the result dialog lists "Auto-decided: …" entries reflecting the delegation policy (try `conservative` vs `aggressive` and confirm the chosen options differ).

## Self-review notes

- **Coverage:** detection + effect extraction (T1), policy resolver (T2), tick wiring + policy carry (T3), digest surfacing (T4) = decisions now happen and are reported during fast-forward.
- **Type consistency:** decision-type strings and option ids match Task 1's `applyDecisionEffect`, Task 2's `DELEGATION_DEFAULTS`, and the existing `LoopDecisionEngine` taxonomy exactly. `DelegationPolicy` mirrors `AutoSimConfig.delegationPolicy`.
- **Determinism:** `autonomouslyResolveDecisions` is a pure function of world state + a fixed table — no RNG, no `Date.now`. Holiday runs (which also set `_autonomousSim`, default policy "balanced") get the same behavior for free.
- **Reuse:** shares `detectDueDecisions`/`applyDecisionEffect` with the interactive path (DRY); reuses `chronicle.highlights` (already rendered by `AutoSimResultDialog`) so no dialog change is required.
