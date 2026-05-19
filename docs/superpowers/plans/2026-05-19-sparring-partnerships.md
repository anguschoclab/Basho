# Sparring Partnership System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add intra-heya sparring partnerships that produce archetype-based chemistry bonuses (or ruts) during the weekly training tick, seed rivalries after extended sparring, and introduce keiko (cross-heya) exchange agreements with a small espionage risk.

**Architecture:** `SparringService.ts` is a pure service that calculates chemistry scores and growth deltas. `WorldState` gets a `sparringPairs` map stored per heya. The weekly training phase calls `SparringService.applyWeeklySparring` after standard training. `RivalryService` gains a path for sparring-born rivalry seeding. A `SparringPanel` component in the Training page surfaces assignment.

**Tech Stack:** TypeScript, Vitest, `StateImpact`/`ImpactBuilder`, `rngForWorld`, existing `TrainingService`, `RivalryService`, shadcn/ui, Tailwind.

---

## File Map

| Action | Path | Purpose |
|--------|------|---------|
| Create | `src/engine/systems/training/SparringService.ts` | Core sparring logic |
| Create | `src/engine/systems/training/__tests__/SparringService.test.ts` | Unit tests |
| Modify | `src/engine/types/training.ts` | Add `SparringPair` and `SparringState` to training types |
| Modify | `src/engine/types/world.ts` | Add `sparringPairs: Map<heyaId, SparringState>` |
| Modify | `src/engine/tick/phases/phase01_week_training.ts` | Call `applyWeeklySparring` |
| Modify | `src/engine/systems/narrative/RivalryService.ts` | Add `seedSparringRivalry` |
| Create | `src/components/game/SparringPanel.tsx` | UI: assign/remove pairs |
| Modify | Training page (find via `grep -r "Training\|training" src/pages --include="*.tsx" -l`) | Render SparringPanel |

---

## Task 1: SparringPair Type and Chemistry Scoring

**Files:**
- Modify: `src/engine/types/training.ts`
- Create: `src/engine/systems/training/SparringService.ts`
- Create: `src/engine/systems/training/__tests__/SparringService.test.ts`

- [ ] **Step 1: Add types to `training.ts`**

Open `src/engine/types/training.ts`. Add:

```typescript
export interface SparringPair {
  aId: string;
  bId: string;
  weeksActive: number;
  /** Archetype compatibility: "friction" (different = growth) | "rut" (same = diminishing) */
  chemistry: "friction" | "rut" | "neutral";
}

export interface SparringState {
  heyaId: string;
  pairs: SparringPair[];
  /** Optional cross-heya keiko agreement: opponent heyaId */
  keikoPartnerId?: string;
  keikoWeeksActive?: number;
}
```

- [ ] **Step 2: Add `sparringPairs` to WorldState**

Open `src/engine/types/world.ts`. In the `WorldState` interface, add:

```typescript
import type { SparringState } from "./training";

// Inside WorldState:
sparringPairs?: Map<string, SparringState>; // keyed by heyaId
```

- [ ] **Step 3: Write failing tests**

```typescript
// src/engine/systems/training/__tests__/SparringService.test.ts
import { describe, it, expect } from "vitest";
import { SparringService } from "../SparringService";
import { mockRikishi } from "../../../__tests__/utils";

describe("SparringService.calculateChemistry", () => {
  it("returns friction when archetypes differ (push vs technique)", () => {
    const a = mockRikishi("a1", { combatProfile: { archetype: "pusher" } as any });
    const b = mockRikishi("b1", { combatProfile: { archetype: "technician" } as any });
    expect(SparringService.calculateChemistry(a, b)).toBe("friction");
  });

  it("returns rut when both are the same archetype", () => {
    const a = mockRikishi("a1", { combatProfile: { archetype: "pusher" } as any });
    const b = mockRikishi("b1", { combatProfile: { archetype: "pusher" } as any });
    expect(SparringService.calculateChemistry(a, b)).toBe("rut");
  });

  it("returns neutral when one archetype is missing", () => {
    const a = mockRikishi("a1", {});
    const b = mockRikishi("b1", {});
    expect(SparringService.calculateChemistry(a, b)).toBe("neutral");
  });
});

describe("SparringService.calculateGrowthDelta", () => {
  it("produces a positive power bonus for friction pair where b has higher power than a", () => {
    const a = mockRikishi("a1", { power: 50, technique: 70 });
    const b = mockRikishi("b1", { power: 80, technique: 50 });
    const pair = { aId: "a1", bId: "b1", weeksActive: 3, chemistry: "friction" as const };
    const delta = SparringService.calculateGrowthDelta(a, b, pair);
    expect(delta.aGain.power).toBeGreaterThan(0);
  });

  it("produces smaller gains in a rut pair", () => {
    const a = mockRikishi("a1", { power: 60, technique: 60 });
    const b = mockRikishi("b1", { power: 62, technique: 62 });
    const pair = { aId: "a1", bId: "b1", weeksActive: 10, chemistry: "rut" as const };
    const deltaRut = SparringService.calculateGrowthDelta(a, b, pair);

    const pairFriction = { ...pair, chemistry: "friction" as const };
    const deltaFriction = SparringService.calculateGrowthDelta(a, b, pairFriction);

    const rutTotal = Object.values(deltaRut.aGain).reduce((s, v) => s + v, 0);
    const frictionTotal = Object.values(deltaFriction.aGain).reduce((s, v) => s + v, 0);
    expect(rutTotal).toBeLessThanOrEqual(frictionTotal);
  });
});
```

- [ ] **Step 4: Run tests to confirm they fail**

```
npx vitest run src/engine/systems/training/__tests__/SparringService.test.ts
```

Expected: FAIL.

- [ ] **Step 5: Implement SparringService**

```typescript
// src/engine/systems/training/SparringService.ts
import type { Rikishi } from "../../types/rikishi";
import type { SparringPair } from "../../types/training";
import { clamp } from "../../utils/math";

const PUSH_ARCHETYPES = new Set(["pusher", "thruster", "oshi"]);
const TECH_ARCHETYPES = new Set(["technician", "yotsu", "belt_fighter", "grappler"]);

export const SparringService = {
  calculateChemistry(a: Rikishi, b: Rikishi): "friction" | "rut" | "neutral" {
    const archA = (a.combatProfile as any)?.archetype as string | undefined;
    const archB = (b.combatProfile as any)?.archetype as string | undefined;
    if (!archA || !archB) return "neutral";
    if (archA === archB) return "rut";
    const aIsPush = PUSH_ARCHETYPES.has(archA);
    const bIsPush = PUSH_ARCHETYPES.has(archB);
    if (aIsPush !== bIsPush) return "friction";
    return "neutral";
  },

  calculateGrowthDelta(
    a: Rikishi,
    b: Rikishi,
    pair: SparringPair
  ): { aGain: Partial<Rikishi>; bGain: Partial<Rikishi> } {
    const multiplier = pair.chemistry === "friction" ? 1.0
      : pair.chemistry === "rut" ? 0.3
      : 0.6;

    // Stat bleed: each partner gains a fraction of the gap toward the other's stronger stats
    const gapPower = b.power - a.power;
    const gapTech = b.technique - a.technique;
    const gapBalance = b.balance - a.balance;

    const BLEED = 0.04;
    const aGain = {
      power: clamp(Math.floor(Math.max(0, gapPower) * BLEED * multiplier), 0, 2),
      technique: clamp(Math.floor(Math.max(0, gapTech) * BLEED * multiplier), 0, 2),
      balance: clamp(Math.floor(Math.max(0, gapBalance) * BLEED * multiplier), 0, 1),
    };
    const bGain = {
      power: clamp(Math.floor(Math.max(0, -gapPower) * BLEED * multiplier), 0, 2),
      technique: clamp(Math.floor(Math.max(0, -gapTech) * BLEED * multiplier), 0, 2),
      balance: clamp(Math.floor(Math.max(0, -gapBalance) * BLEED * multiplier), 0, 1),
    };

    return { aGain, bGain };
  },
};
```

- [ ] **Step 6: Run tests to confirm they pass**

```
npx vitest run src/engine/systems/training/__tests__/SparringService.test.ts
```

Expected: All tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src/engine/systems/training/SparringService.ts src/engine/systems/training/__tests__/SparringService.test.ts src/engine/types/training.ts src/engine/types/world.ts
git commit -m "feat(training): add SparringService with chemistry and growth delta logic"
```

---

## Task 2: Weekly Sparring Tick

**Files:**
- Modify: `src/engine/systems/training/SparringService.ts`
- Create: `src/engine/systems/training/__tests__/sparringTick.test.ts`
- Modify: `src/engine/tick/phases/phase01_week_training.ts`

- [ ] **Step 1: Write failing integration test**

```typescript
// src/engine/systems/training/__tests__/sparringTick.test.ts
import { describe, it, expect } from "vitest";
import { applyWeeklySparring } from "../SparringService";
import { mockRikishi } from "../../../__tests__/utils";
import type { WorldState } from "../../../types/world";
import type { SparringState } from "../../../types/training";

function makeWorld(a: ReturnType<typeof mockRikishi>, b: ReturnType<typeof mockRikishi>, state: SparringState): WorldState {
  const sparringPairs = new Map([[a.heyaId, state]]);
  return {
    id: "w1", seed: "s", year: 2025, week: 5, dayIndexGlobal: 35,
    cyclePhase: "interim", rikishi: new Map([[a.id, a], [b.id, b]]),
    heyas: new Map(), events: [], trainingState: new Map(), governanceLog: [],
    currentBasho: null, sparringPairs,
  } as unknown as WorldState;
}

describe("applyWeeklySparring", () => {
  it("increases rikishi stats after a friction pair week", () => {
    const a = mockRikishi("a1", { power: 50, technique: 70, heyaId: "h1", combatProfile: { archetype: "pusher" } as any });
    const b = mockRikishi("b1", { power: 80, technique: 40, heyaId: "h1", combatProfile: { archetype: "technician" } as any });
    const state: SparringState = {
      heyaId: "h1",
      pairs: [{ aId: "a1", bId: "b1", weeksActive: 1, chemistry: "friction" }],
    };
    const world = makeWorld(a, b, state);
    const impact = applyWeeklySparring(world);
    const updates = impact.rikishiUpdates ?? [];
    const aUpd = updates.find((u: { id: string }) => u.id === "a1");
    expect(aUpd?.power).toBeGreaterThan(50);
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```
npx vitest run src/engine/systems/training/__tests__/sparringTick.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Add `applyWeeklySparring` to SparringService**

Append to `src/engine/systems/training/SparringService.ts`:

```typescript
import type { WorldState } from "../../types/world";
import { createImpactBuilder } from "../../core/ImpactBuilder";
import type { StateImpact } from "../../core/StateImpact";

export function applyWeeklySparring(world: WorldState): StateImpact {
  const builder = createImpactBuilder("applyWeeklySparring");
  const allPairStates = world.sparringPairs ?? new Map();

  for (const [heyaId, state] of allPairStates) {
    for (const pair of state.pairs) {
      const a = world.rikishi.get(pair.aId);
      const b = world.rikishi.get(pair.bId);
      if (!a || !b) continue;
      if (a.injured || b.injured) continue;

      const { aGain, bGain } = SparringService.calculateGrowthDelta(a, b, pair);

      if (Object.values(aGain).some((v) => v > 0)) {
        builder.updateRikishi(a.id, {
          power: clamp((a.power ?? 0) + (aGain.power ?? 0), 0, 99),
          technique: clamp((a.technique ?? 0) + (aGain.technique ?? 0), 0, 99),
          balance: clamp((a.balance ?? 0) + (aGain.balance ?? 0), 0, 99),
        });
      }
      if (Object.values(bGain).some((v) => v > 0)) {
        builder.updateRikishi(b.id, {
          power: clamp((b.power ?? 0) + (bGain.power ?? 0), 0, 99),
          technique: clamp((b.technique ?? 0) + (bGain.technique ?? 0), 0, 99),
          balance: clamp((b.balance ?? 0) + (bGain.balance ?? 0), 0, 99),
        });
      }

      // Increment weeksActive on the pair
      const updatedPairs = state.pairs.map((p) =>
        p.aId === pair.aId && p.bId === pair.bId
          ? { ...p, weeksActive: p.weeksActive + 1 }
          : p
      );
      builder.updateSparringState(heyaId, { ...state, pairs: updatedPairs });
    }
  }

  return builder.build();
}
```

Note: `builder.updateSparringState` may need to be added to `ImpactBuilder` if it only handles `rikishiUpdates`. Check `src/engine/core/ImpactBuilder.ts` and add a `sparringStateUpdates` field following the same pattern as `rikishiUpdates`.

- [ ] **Step 4: Call `applyWeeklySparring` in the weekly training phase**

In `src/engine/tick/phases/phase01_week_training.ts`, after applying the main training impact:

```typescript
import { applyWeeklySparring } from "../../systems/training/SparringService";

const sparringImpact = applyWeeklySparring(world);
// apply sparringImpact using existing StateImpact pattern
```

- [ ] **Step 5: Run all sparring tests**

```
npx vitest run src/engine/systems/training/__tests__/sparringTick.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/engine/systems/training/SparringService.ts src/engine/systems/training/__tests__/sparringTick.test.ts src/engine/tick/phases/phase01_week_training.ts src/engine/core/ImpactBuilder.ts
git commit -m "feat(training): wire applyWeeklySparring into weekly tick"
```

---

## Task 3: Sparring-Born Rivalry Seeding

**Files:**
- Modify: `src/engine/systems/narrative/RivalryService.ts`
- Create: `src/engine/systems/narrative/__tests__/sparringRivalry.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// src/engine/systems/narrative/__tests__/sparringRivalry.test.ts
import { describe, it, expect } from "vitest";
import { maybeSeedSparringRivalry } from "../RivalryService";
import { mockRikishi } from "../../../__tests__/utils";
import type { SparringPair } from "../../../types/training";

describe("maybeSeedSparringRivalry", () => {
  it("returns a rivalry seed after 12 weeks of friction sparring", () => {
    const a = mockRikishi("a1", { heyaId: "h1" });
    const b = mockRikishi("b1", { heyaId: "h1" });
    const pair: SparringPair = { aId: "a1", bId: "b1", weeksActive: 12, chemistry: "friction" };
    const result = maybeSeedSparringRivalry(a, b, pair, "rng-seed");
    expect(result).not.toBeNull();
    expect(result?.type).toBe("sparring_rivalry");
  });

  it("does not seed a rivalry before 12 weeks", () => {
    const a = mockRikishi("a1", { heyaId: "h1" });
    const b = mockRikishi("b1", { heyaId: "h1" });
    const pair: SparringPair = { aId: "a1", bId: "b1", weeksActive: 5, chemistry: "friction" };
    expect(maybeSeedSparringRivalry(a, b, pair, "rng-seed")).toBeNull();
  });

  it("does not seed a rivalry for rut pairs", () => {
    const a = mockRikishi("a1", { heyaId: "h1" });
    const b = mockRikishi("b1", { heyaId: "h1" });
    const pair: SparringPair = { aId: "a1", bId: "b1", weeksActive: 15, chemistry: "rut" };
    expect(maybeSeedSparringRivalry(a, b, pair, "rng-seed")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```
npx vitest run src/engine/systems/narrative/__tests__/sparringRivalry.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Add `maybeSeedSparringRivalry` to RivalryService**

Open `src/engine/systems/narrative/RivalryService.ts`. Add:

```typescript
import type { SparringPair } from "../../types/training";
import { rngFromSeed } from "../../rng";

const SPARRING_RIVALRY_WEEKS = 12;
const SPARRING_RIVALRY_CHANCE = 0.4; // 40% chance per week once threshold is crossed

export interface SparringRivalrySeed {
  type: "sparring_rivalry";
  aId: string;
  bId: string;
  intensity: "low" | "medium" | "high";
}

export function maybeSeedSparringRivalry(
  a: ReturnType<typeof import("../../types/rikishi").Rikishi extends infer T ? never : never> | any,
  b: any,
  pair: SparringPair,
  seed: string
): SparringRivalrySeed | null {
  if (pair.chemistry !== "friction") return null;
  if (pair.weeksActive < SPARRING_RIVALRY_WEEKS) return null;

  const rng = rngFromSeed(`sparring_rivalry_${seed}_${pair.aId}_${pair.bId}`, "rivalry", "seed");
  if (!rng.bool(SPARRING_RIVALRY_CHANCE)) return null;

  const intensity = pair.weeksActive >= 20 ? "high" : pair.weeksActive >= 15 ? "medium" : "low";
  return { type: "sparring_rivalry", aId: pair.aId, bId: pair.bId, intensity };
}
```

Note: The type annotation on `a`/`b` is loose — pass `Rikishi` directly at call sites.

- [ ] **Step 4: Run tests to confirm they pass**

```
npx vitest run src/engine/systems/narrative/__tests__/sparringRivalry.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Call `maybeSeedSparringRivalry` inside `applyWeeklySparring`**

In `SparringService.applyWeeklySparring`, after incrementing `weeksActive`, add:

```typescript
import { maybeSeedSparringRivalry } from "../narrative/RivalryService";

const rivalrySeed = maybeSeedSparringRivalry(
  a, b,
  { ...pair, weeksActive: pair.weeksActive + 1 },
  `${world.week}_${heyaId}`
);
if (rivalrySeed) {
  builder.logEvent("SPARRING_RIVALRY_SEEDED", "training", {
    heyaId,
    rikishiIdA: rivalrySeed.aId,
    rikishiIdB: rivalrySeed.bId,
    intensity: rivalrySeed.intensity,
  }, { importance: "notable" });
}
```

- [ ] **Step 6: Commit**

```bash
git add src/engine/systems/narrative/RivalryService.ts src/engine/systems/narrative/__tests__/sparringRivalry.test.ts src/engine/systems/training/SparringService.ts
git commit -m "feat(rivalry): seed sparring-born rivalries after 12 friction weeks"
```

---

## Task 4: Sparring Assignment UI

**Files:**
- Create: `src/components/game/SparringPanel.tsx`
- Modify: Training page (find via `grep -r "Training\|training" src/pages --include="*.tsx" -l`)

- [ ] **Step 1: Create SparringPanel**

```tsx
// src/components/game/SparringPanel.tsx
import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Rikishi } from "@/engine/types/rikishi";
import type { SparringPair } from "@/engine/types/training";
import { SparringService } from "@/engine/systems/training/SparringService";

interface Props {
  heyaRikishi: Rikishi[];
  pairs: SparringPair[];
  onAddPair: (aId: string, bId: string) => void;
  onRemovePair: (aId: string, bId: string) => void;
}

const CHEM_LABELS = {
  friction: { label: "Friction", color: "text-green-500", tip: "Different styles — both grow" },
  rut:     { label: "Rut",     color: "text-amber-500", tip: "Same style — diminishing returns" },
  neutral: { label: "Neutral", color: "text-muted-foreground", tip: "Moderate gains" },
};

export function SparringPanel({ heyaRikishi, pairs, onAddPair, onRemovePair }: Props) {
  const [selectedA, setSelectedA] = useState("");
  const [selectedB, setSelectedB] = useState("");

  const paiредIds = new Set(pairs.flatMap((p) => [p.aId, p.bId]));

  const previewChemistry =
    selectedA && selectedB
      ? SparringService.calculateChemistry(
          heyaRikishi.find((r) => r.id === selectedA)!,
          heyaRikishi.find((r) => r.id === selectedB)!
        )
      : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Sparring Pairs</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {pairs.map((pair) => {
          const a = heyaRikishi.find((r) => r.id === pair.aId);
          const b = heyaRikishi.find((r) => r.id === pair.bId);
          if (!a || !b) return null;
          const chem = CHEM_LABELS[pair.chemistry];
          return (
            <div key={`${pair.aId}-${pair.bId}`} className="flex items-center justify-between gap-2">
              <span className="text-sm">{a.shikona} ↔ {b.shikona}</span>
              <Badge variant="outline" className={chem.color}>{chem.label}</Badge>
              <span className="text-xs text-muted-foreground">{pair.weeksActive}w</span>
              <Button size="sm" variant="ghost" onClick={() => onRemovePair(pair.aId, pair.bId)}>×</Button>
            </div>
          );
        })}

        <div className="flex gap-2 items-center pt-2 border-t">
          <Select value={selectedA} onValueChange={setSelectedA}>
            <SelectTrigger className="w-32 h-7 text-xs"><SelectValue placeholder="Rikishi A" /></SelectTrigger>
            <SelectContent>
              {heyaRikishi.filter((r) => !paiредIds.has(r.id)).map((r) => (
                <SelectItem key={r.id} value={r.id}>{r.shikona}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-muted-foreground">↔</span>
          <Select value={selectedB} onValueChange={setSelectedB}>
            <SelectTrigger className="w-32 h-7 text-xs"><SelectValue placeholder="Rikishi B" /></SelectTrigger>
            <SelectContent>
              {heyaRikishi.filter((r) => !paiредIds.has(r.id) && r.id !== selectedA).map((r) => (
                <SelectItem key={r.id} value={r.id}>{r.shikona}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {previewChemistry && (
            <span className={`text-xs ${CHEM_LABELS[previewChemistry].color}`} title={CHEM_LABELS[previewChemistry].tip}>
              {CHEM_LABELS[previewChemistry].label}
            </span>
          )}
          <Button
            size="sm"
            className="h-7 text-xs"
            disabled={!selectedA || !selectedB}
            onClick={() => { onAddPair(selectedA, selectedB); setSelectedA(""); setSelectedB(""); }}
          >
            Pair
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Add `ADD_SPARRING_PAIR` and `REMOVE_SPARRING_PAIR` actions to GameContext**

In the relevant slice, add handlers that update `world.sparringPairs` directly using an `assignSparringPair` / `removeSparringPair` function exported from `SparringService`.

Add to `SparringService.ts`:

```typescript
export function assignSparringPair(world: WorldState, heyaId: string, aId: string, bId: string): StateImpact {
  const builder = createImpactBuilder("assignSparringPair");
  const a = world.rikishi.get(aId);
  const b = world.rikishi.get(bId);
  if (!a || !b || a.heyaId !== heyaId || b.heyaId !== heyaId) return builder.build();

  const state = world.sparringPairs?.get(heyaId) ?? { heyaId, pairs: [] };
  const chemistry = SparringService.calculateChemistry(a, b);
  const newPair: SparringPair = { aId, bId, weeksActive: 0, chemistry };
  const updated: SparringState = { ...state, pairs: [...state.pairs, newPair] };
  builder.updateSparringState(heyaId, updated);
  return builder.build();
}

export function removeSparringPair(world: WorldState, heyaId: string, aId: string, bId: string): StateImpact {
  const builder = createImpactBuilder("removeSparringPair");
  const state = world.sparringPairs?.get(heyaId);
  if (!state) return builder.build();
  const updated: SparringState = {
    ...state,
    pairs: state.pairs.filter((p) => !(p.aId === aId && p.bId === bId)),
  };
  builder.updateSparringState(heyaId, updated);
  return builder.build();
}
```

- [ ] **Step 3: Render SparringPanel in the training page**

In the training page, add:

```tsx
<SparringPanel
  heyaRikishi={playerRikishi}
  pairs={sparringState?.pairs ?? []}
  onAddPair={(aId, bId) => dispatch({ type: "ADD_SPARRING_PAIR", heyaId, aId, bId })}
  onRemovePair={(aId, bId) => dispatch({ type: "REMOVE_SPARRING_PAIR", heyaId, aId, bId })}
/>
```

- [ ] **Step 4: Manual smoke test**

Start dev server (`npm run dev`). Navigate to the training page:
1. Add a friction pair — confirm chemistry label appears.
2. Add a rut pair — confirm different color.
3. Advance one week — confirm stats of friction pair members tick up slightly.
4. Advance 12 weeks — confirm a rivalry event appears in the event log.

- [ ] **Step 5: Commit**

```bash
git add src/components/game/SparringPanel.tsx src/engine/systems/training/SparringService.ts src/contexts/GameContext.tsx
git commit -m "feat(ui): add SparringPanel with live chemistry preview"
```

---

## Verification Checklist

- [ ] `npx vitest run src/engine/systems/training/__tests__/` — all tests pass
- [ ] `npx vitest run src/engine/systems/narrative/__tests__/` — all tests pass
- [ ] `sparringPairs` initializes to empty Map — no crash on fresh worlds
- [ ] Injured rikishi are skipped in `applyWeeklySparring`
- [ ] `npx tsc --noEmit` — zero type errors
