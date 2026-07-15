# Injury & Health Player Agency — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the read-only injury dashboard into real decisions — let the player withdraw an injured wrestler from the tournament (kyūjō) and pay for accelerated treatment — so wrestler health (core to the sumo-manager fantasy) has player agency.

**Architecture:** Two new worker commands (`WITHDRAW_RIKISHI`, `TREAT_INJURY`) backed by two small engine functions that mutate `Rikishi`/`Heya` via `ImpactBuilder`. Add action buttons to the existing `InjuryRecoveryPanel`. No changes to the injury-rolling/recovery tick logic.

**Tech Stack:** Vite + React 19 + TS, Web Worker engine, `ImpactBuilder`, `useGameStore().sendCommand`.

---

## Background facts (verified — use these)

- `Rikishi` (`src/engine/types/rikishi.ts`): `fatigue: number` (72), `injured: boolean` (78), `injuryWeeksRemaining: number` (79), `injuryStatus?` (80), `isKyujo: boolean` (94), `kyujoReason?: "voluntary" | "injury" | "personal"` (95).
- `InjuryService` (`src/engine/systems/health/InjuryService.ts`): `clearInjury(rikishiId): StateImpact` (368), `tickWeekRecovery(world): StateImpact` (239). These return impacts via `ImpactBuilder`.
- `ImpactBuilder`: `.updateRikishi(id, Partial<Rikishi>)`, `.updateHeya(id, Partial<Heya>)`, `.logEvent(type, category, data, { heyaId, rikishiId })`, `.build()` (`src/engine/core/ImpactBuilder.ts`).
- `Heya.funds: number` (`src/engine/types/heya.ts:54`).
- The panel `src/components/game/InjuryRecoveryPanel.tsx` is **display-only** today (no `sendCommand`/`onClick`). Worker handler pattern: `KEY: (cmd) => { const impact = fn(currentWorld, ...); currentWorld = resolveImpacts(currentWorld, [impact]); emitDigest(); syncWorld(); }`; command type added to `src/engine/worker/types.ts`.

## Design decisions

- **Withdraw (kyūjō):** set `isKyujo = true`, `kyujoReason = "injury"`. Free, but the wrestler sits out remaining bouts (loses by default — existing bout logic already treats injured/kyūjō as fusenpai/fusen). Reversible only by recovery.
- **Treat:** spend `TREATMENT_COST_PER_WEEK` (new constant, ¥500,000) per week of injury cut; reduce `injuryWeeksRemaining` by `min(weeks, current)`, clamp ≥ 0; if it reaches 0, also clear `injured`. Guarded by sufficient `funds`.

---

### Task 1: Engine — `withdrawRikishi` and `treatInjury`

**Files:**

- Create: `src/engine/systems/health/HealthActions.ts`
- Create: `src/constants/engine/health.ts` (or append if it exists — check first)
- Test: `src/engine/systems/health/__tests__/HealthActions.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/engine/systems/health/__tests__/HealthActions.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { withdrawRikishi, treatInjury } from "../HealthActions";
import { resolveImpacts } from "../../../core/ImpactResolver";
import { mockRikishi } from "../../../../tests/unit/engine/utils";
import type { WorldState } from "../../../types/world";

function worldWith(rikishiOverrides: Record<string, unknown>, funds = 5_000_000): WorldState {
  const r = mockRikishi("r1", { heyaId: "h1", ...rikishiOverrides });
  return {
    seed: "t",
    year: 1,
    week: 1,
    dayIndexGlobal: 1,
    cyclePhase: "active_basho",
    playerHeyaId: "h1",
    heyas: new Map([["h1", { id: "h1", name: "H", rikishiIds: ["r1"], funds } as never]]),
    rikishi: new Map([["r1", r]]),
    oyakata: new Map(),
    events: { log: [], headlines: [] },
    activeRikishiIds: new Set(["r1"]),
    historicalRikishi: new Map(),
    meta: { tone: "classic", drift: {} },
    globalKimariteStats: {},
  } as unknown as WorldState;
}

describe("withdrawRikishi", () => {
  it("sets kyujo with injury reason", () => {
    const world = worldWith({ injured: true, injuryWeeksRemaining: 3, isKyujo: false });
    const next = resolveImpacts(world, [withdrawRikishi(world, "r1")]);
    const r = next.rikishi.get("r1")!;
    expect(r.isKyujo).toBe(true);
    expect(r.kyujoReason).toBe("injury");
  });
});

describe("treatInjury", () => {
  it("cuts injury weeks and charges the heya", () => {
    const world = worldWith({ injured: true, injuryWeeksRemaining: 4 }, 5_000_000);
    const next = resolveImpacts(world, [treatInjury(world, "r1", 2)]);
    const r = next.rikishi.get("r1")!;
    expect(r.injuryWeeksRemaining).toBe(2);
    expect(next.heyas.get("h1")!.funds).toBe(5_000_000 - 2 * 500_000);
  });

  it("clears injury when weeks reach 0 and refuses when underfunded", () => {
    const cleared = resolveImpacts(
      worldWith({ injured: true, injuryWeeksRemaining: 1 }, 5_000_000),
      [treatInjury(worldWith({ injured: true, injuryWeeksRemaining: 1 }, 5_000_000), "r1", 1)]
    );
    expect(cleared.rikishi.get("r1")!.injured).toBe(false);

    const poorWorld = worldWith({ injured: true, injuryWeeksRemaining: 4 }, 100_000);
    const next = resolveImpacts(poorWorld, [treatInjury(poorWorld, "r1", 2)]);
    expect(next.rikishi.get("r1")!.injuryWeeksRemaining).toBe(4); // unchanged
    expect(next.heyas.get("h1")!.funds).toBe(100_000); // not charged
  });
});
```

> Confirm `mockRikishi` accepts an overrides object (`src/tests/unit/engine/utils.ts:26`) and `resolveImpacts` path (`src/engine/core/ImpactResolver.ts`).

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/engine/systems/health/__tests__/HealthActions.test.ts`
Expected: FAIL — module `../HealthActions` not found.

- [ ] **Step 3: Add the constant**

Check `src/constants/engine/health.ts` exists (`ls src/constants/engine/health.ts`). If it does, append; otherwise create it:

```typescript
/** Yen charged per week of injury removed via paid treatment. */
export const TREATMENT_COST_PER_WEEK = 500_000;
```

- [ ] **Step 4: Implement `HealthActions.ts`**

Create `src/engine/systems/health/HealthActions.ts`:

```typescript
import type { WorldState } from "../../types/world";
import type { StateImpact } from "../../core/StateImpact";
import { createImpactBuilder } from "../../core/ImpactBuilder";
import { TREATMENT_COST_PER_WEEK } from "../../../constants/engine/health";

/** Withdraw a rikishi from competition (kyūjō) due to injury. */
export function withdrawRikishi(world: WorldState, rikishiId: string): StateImpact {
  const builder = createImpactBuilder("withdrawRikishi");
  const r = world.rikishi.get(rikishiId);
  if (!r) return builder.build();
  builder.updateRikishi(rikishiId, { isKyujo: true, kyujoReason: "injury" });
  builder.logEvent(
    "LIFECYCLE_EVENT",
    "health",
    { rikishiId, heyaId: r.heyaId, status: "withdrawn_kyujo" },
    { rikishiId, heyaId: r.heyaId }
  );
  return builder.build();
}

/** Pay to cut `weeks` off a rikishi's injury recovery; charges the heya. */
export function treatInjury(world: WorldState, rikishiId: string, weeks: number): StateImpact {
  const builder = createImpactBuilder("treatInjury");
  const r = world.rikishi.get(rikishiId);
  if (!r || !r.injured) return builder.build();
  const heya = world.heyas.get(r.heyaId);
  if (!heya) return builder.build();

  const cut = Math.min(Math.max(0, weeks), r.injuryWeeksRemaining ?? 0);
  const cost = cut * TREATMENT_COST_PER_WEEK;
  if (cut <= 0 || (heya.funds ?? 0) < cost) return builder.build(); // refuse if underfunded

  const remaining = (r.injuryWeeksRemaining ?? 0) - cut;
  builder.updateRikishi(rikishiId, {
    injuryWeeksRemaining: remaining,
    injured: remaining > 0,
  });
  builder.updateHeya(heya.id, { funds: (heya.funds ?? 0) - cost });
  builder.logEvent(
    "LIFECYCLE_EVENT",
    "health",
    { rikishiId, heyaId: heya.id, status: "treated", weeksCut: cut, cost },
    { rikishiId, heyaId: heya.id }
  );
  return builder.build();
}
```

> Confirm `EngineEventType` includes `"LIFECYCLE_EVENT"` and `EventCategory` includes `"health"` (used elsewhere — see `InjuryService.toInjuryEvent`). If `"health"` is not a valid category, use `"narrative"`.

- [ ] **Step 5: Run to verify pass**

Run: `npx vitest run src/engine/systems/health/__tests__/HealthActions.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/engine/systems/health/HealthActions.ts src/constants/engine/health.ts src/engine/systems/health/__tests__/HealthActions.test.ts
git commit -m "feat(health): withdrawRikishi and treatInjury engine actions"
```

---

### Task 2: Worker commands `WITHDRAW_RIKISHI` and `TREAT_INJURY`

**Files:**

- Modify: `src/engine/worker/types.ts`
- Modify: `src/engine/worker/engine.worker.ts`

- [ ] **Step 1: Add command types**

In `src/engine/worker/types.ts`, add to the `EngineCommand` union:

```typescript
  | { type: "WITHDRAW_RIKISHI"; rikishiId: string }
  | { type: "TREAT_INJURY"; rikishiId: string; weeks: number }
```

- [ ] **Step 2: Add handlers**

In `src/engine/worker/engine.worker.ts`, add the import:

```typescript
import { withdrawRikishi, treatInjury } from "../systems/health/HealthActions";
```

Add to `COMMAND_HANDLERS`:

```typescript
    WITHDRAW_RIKISHI: (cmd) => {
      if (currentWorld) {
        currentWorld = resolveImpacts(currentWorld, [withdrawRikishi(currentWorld, cmd.rikishiId)]);
        emitDigest();
        syncWorld();
      }
    },
    TREAT_INJURY: (cmd) => {
      if (currentWorld) {
        currentWorld = resolveImpacts(currentWorld, [treatInjury(currentWorld, cmd.rikishiId, cmd.weeks)]);
        emitDigest();
        syncWorld();
      }
    },
```

- [ ] **Step 3: Verify compile**

Run: `npx tsc --build --force 2>&1 | grep -i "worker" || echo "no worker type errors"`
Expected: no worker type errors.

- [ ] **Step 4: Commit**

```bash
git add src/engine/worker/types.ts src/engine/worker/engine.worker.ts
git commit -m "feat(worker): WITHDRAW_RIKISHI and TREAT_INJURY commands"
```

---

### Task 3: Add action buttons to `InjuryRecoveryPanel`

**Files:**

- Modify: `src/components/game/InjuryRecoveryPanel.tsx`

- [ ] **Step 1: Read the panel to find the per-rikishi row**

Run: `grep -n "injuredRikishi\|map(\|injuryWeeksRemaining\|isKyujo" src/components/game/InjuryRecoveryPanel.tsx`
Expected: locate the loop rendering each injured wrestler.

- [ ] **Step 2: Wire `sendCommand` and per-row buttons**

Add near the top of the component body:

```typescript
import { useGameStore } from "@/store/gameStore";
import { Button } from "@/components/ui/button";
// inside component:
const sendCommand = useGameStore((s) => s.sendCommand);
```

In each injured-wrestler row, add two actions (Treat 1 week; Withdraw if not already kyūjō):

```tsx
<div className="mt-1 flex gap-2">
  <Button
    size="sm"
    variant="outline"
    onClick={() => sendCommand({ type: "TREAT_INJURY", rikishiId: r.id, weeks: 1 })}
  >
    Treat 1wk (¥500k)
  </Button>
  {!r.isKyujo && (
    <Button
      size="sm"
      variant="outline"
      onClick={() => sendCommand({ type: "WITHDRAW_RIKISHI", rikishiId: r.id })}
    >
      Withdraw
    </Button>
  )}
</div>
```

> Use the actual loop variable name from Step 1 (shown here as `r`).

- [ ] **Step 3: Manual verify**

Run: `bun run dev`. Open the medical view (`/stable/medical`) with an injured wrestler → "Treat 1wk" reduces `injuryWeeksRemaining` and funds; "Withdraw" marks kyūjō and the button disappears.

- [ ] **Step 4: Commit**

```bash
git add src/components/game/InjuryRecoveryPanel.tsx
git commit -m "feat(medical): treat and withdraw actions for injured wrestlers"
```

---

## Final verification

- [ ] `npx vitest run` — full suite green.
- [ ] `npx vite build` — clean.
- [ ] Manual: medical view treat/withdraw both mutate world state and respect the funds guard.

## Self-review notes

- **Coverage:** engine actions (Task 1) + worker commands (Task 2) + UI (Task 3) = full vertical slice for the two health decisions.
- **Type consistency:** `withdrawRikishi(world, rikishiId)` / `treatInjury(world, rikishiId, weeks)` signatures identical across engine, worker handlers, command union, and UI dispatch. `TREATMENT_COST_PER_WEEK = 500_000` used in engine and reflected in the UI label.
- **Reuse:** `ImpactBuilder`, `resolveImpacts`, existing `Rikishi.isKyujo`/`injuryWeeksRemaining` fields. No change to injury-rolling/recovery tick logic.
- **YAGNI:** scoped to withdraw + paid treatment; "rest vs play-through" intensity tuning is left to the loop-decision system, not duplicated here.
