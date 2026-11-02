# Scouting Misvaluation & Draft Risk — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persistent `scoutingBias` offset to each scouted candidate that skews initial stat readings by ±10–20 points, decays toward truth over time, and surfaces a `confidence` rating in the UI so recruitment feels like a genuine gamble rather than a slow reveal.

**Architecture:** `FogOfWarService.ts` gets a new `generateScoutingBias` pure function. `TalentPoolService.ts` stores the bias in `TalentPoolEntry` at materialization time. `ScoutingService.getScoutedAttributes` applies the bias as an additional layer on top of existing confidence noise. Bias decays each week as observations accumulate. The recruitment UI (`TalentPoolPanel` or equivalent) renders star-rated confidence bars.

**Tech Stack:** TypeScript, Vitest, `rngFromSeed`, `SeededRNG`, existing `FogOfWarService`, `ScoutingService`, `RecruitmentConstants`, shadcn/ui Badge/Progress.

---

## File Map

| Action | Path                                                                                      | Purpose                                              |
| ------ | ----------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Modify | `src/engine/systems/recruitment/FogOfWarService.ts`                                       | Add `generateScoutingBias`, `decayBias`, `applyBias` |
| Modify | `src/engine/types/talent.ts`                                                              | Add `scoutingBias` field to `TalentPoolEntry`        |
| Modify | `src/engine/systems/generation/TalentPoolMaterialization.ts`                              | Generate bias at materialization                     |
| Modify | `src/engine/systems/recruitment/ScoutingService.ts`                                       | Apply bias in `getScoutedAttributes`                 |
| Modify | `src/engine/tick/phases/phase01_week_recruitment.ts`                                      | Decay bias each week when observations increase      |
| Create | `src/engine/systems/recruitment/__tests__/scoutingBias.test.ts`                           | Unit tests                                           |
| Modify | Recruitment UI component (find via `grep -r "TalentPool\|scoutedRikishi" src/components`) | Show confidence stars                                |

---

## Task 1: Bias Types and Pure Functions in FogOfWarService

**Files:**

- Modify: `src/engine/systems/recruitment/FogOfWarService.ts`
- Create: `src/engine/systems/recruitment/__tests__/scoutingBias.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/engine/systems/recruitment/__tests__/scoutingBias.test.ts
import { describe, it, expect } from "vitest";
import { generateScoutingBias, applyBias, decayBias } from "../FogOfWarService";

describe("generateScoutingBias", () => {
  it("produces a bias in the ±20 range for each stat", () => {
    const bias = generateScoutingBias("candidate-123", 2025);
    for (const val of Object.values(bias.statOffsets)) {
      expect(val).toBeGreaterThanOrEqual(-20);
      expect(val).toBeLessThanOrEqual(20);
    }
  });

  it("produces deterministic output for the same seed", () => {
    const a = generateScoutingBias("candidate-abc", 2025);
    const b = generateScoutingBias("candidate-abc", 2025);
    expect(a.statOffsets.technique).toBe(b.statOffsets.technique);
  });

  it("produces different output for different seeds", () => {
    const a = generateScoutingBias("candidate-aaa", 2025);
    const b = generateScoutingBias("candidate-bbb", 2025);
    // At least one stat should differ
    const diffFound = Object.keys(a.statOffsets).some(
      (k) =>
        a.statOffsets[k as keyof typeof a.statOffsets] !==
        b.statOffsets[k as keyof typeof b.statOffsets]
    );
    expect(diffFound).toBe(true);
  });
});

describe("applyBias", () => {
  it("adds bias offset to true value, clamped to 0–99", () => {
    const result = applyBias(70, 15, 1.0);
    expect(result).toBe(85);
  });

  it("clamps at 99", () => {
    expect(applyBias(95, 20, 1.0)).toBe(99);
  });

  it("scales bias toward 0 as decayFactor approaches 0", () => {
    expect(applyBias(70, 20, 0.0)).toBe(70);
    expect(applyBias(70, 20, 0.5)).toBe(80);
  });
});

describe("decayBias", () => {
  it("reduces bias magnitude when observations increase", () => {
    const bias = generateScoutingBias("c1", 2025);
    const decayed = decayBias(bias, 5);
    expect(decayed.decayFactor).toBeLessThan(bias.decayFactor);
  });

  it("reaches 0 decay factor at 20 observations", () => {
    const bias = generateScoutingBias("c1", 2025);
    const decayed = decayBias(bias, 20);
    expect(decayed.decayFactor).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```
npx vitest run src/engine/systems/recruitment/__tests__/scoutingBias.test.ts
```

Expected: FAIL — functions not found.

- [ ] **Step 3: Add bias types and pure functions to FogOfWarService**

Add to `src/engine/systems/recruitment/FogOfWarService.ts` (after existing exports):

```typescript
export interface ScoutingBias {
  /** True stat offsets applied when scouting level is low. Range ±20 per stat. */
  statOffsets: {
    power: number;
    speed: number;
    balance: number;
    technique: number;
    aggression: number;
    experience: number;
  };
  /**
   * How strongly the bias still applies. 1.0 = full bias, 0.0 = no bias (truth known).
   * Decays as timesObserved increases.
   */
  decayFactor: number;
}

const BIAS_MAX = 20;
const DECAY_OBS_FULL = 20; // at this many observations, bias is fully gone

/** Generate a seeded per-candidate scouting bias. */
export function generateScoutingBias(candidateId: string, year: number): ScoutingBias {
  const rng = rngFromSeed(`bias_${candidateId}_${year}`, "scouting", "bias");
  const statKeys = ["power", "speed", "balance", "technique", "aggression", "experience"] as const;
  const statOffsets = {} as ScoutingBias["statOffsets"];
  for (const key of statKeys) {
    const magnitude = Math.floor(rng.next() * BIAS_MAX);
    const sign = rng.next() < 0.5 ? -1 : 1;
    statOffsets[key] = magnitude * sign;
  }
  return { statOffsets, decayFactor: 1.0 };
}

/** Apply a bias offset to a true value, scaled by decayFactor. */
export function applyBias(trueValue: number, offset: number, decayFactor: number): number {
  const scaled = Math.round(offset * decayFactor);
  return clamp(trueValue + scaled, 0, 99);
}

/** Reduce decayFactor based on total observations accumulated. */
export function decayBias(bias: ScoutingBias, totalObservations: number): ScoutingBias {
  const newDecay = clamp(1 - totalObservations / DECAY_OBS_FULL, 0, 1);
  return { ...bias, decayFactor: newDecay };
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```
npx vitest run src/engine/systems/recruitment/__tests__/scoutingBias.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/systems/recruitment/FogOfWarService.ts src/engine/systems/recruitment/__tests__/scoutingBias.test.ts
git commit -m "feat(scouting): add generateScoutingBias, applyBias, decayBias to FogOfWarService"
```

---

## Task 2: Store Bias on TalentPoolEntry

**Files:**

- Modify: `src/engine/types/talent.ts`
- Modify: `src/engine/systems/generation/TalentPoolMaterialization.ts`
- Create: `src/engine/systems/generation/__tests__/talentPoolBias.test.ts`

- [ ] **Step 1: Add `scoutingBias` to `TalentPoolEntry` type**

Open `src/engine/types/talent.ts`. Find the `TalentPoolEntry` (or equivalent candidate) interface and add:

```typescript
import type { ScoutingBias } from "../systems/recruitment/FogOfWarService";

// Inside TalentPoolEntry interface:
scoutingBias?: ScoutingBias;
```

- [ ] **Step 2: Write failing test for materialization**

```typescript
// src/engine/systems/generation/__tests__/talentPoolBias.test.ts
import { describe, it, expect } from "vitest";
import { materializeCandidate } from "../TalentPoolMaterialization";
import type { WorldState } from "../../../types/world";

describe("materializeCandidate", () => {
  it("attaches a scoutingBias to each materialized candidate", () => {
    const mockWorld = {
      id: "w1",
      seed: "seed",
      year: 2025,
      week: 10,
      rikishi: new Map(),
      heyas: new Map(),
      events: [],
      trainingState: new Map(),
      governanceLog: [],
      currentBasho: null,
    } as unknown as WorldState;

    // materializeCandidate signature may vary — adjust call to match existing API
    const candidate = materializeCandidate(mockWorld, "h1", "rng-seed-test");
    expect(candidate.scoutingBias).toBeDefined();
    expect(candidate.scoutingBias?.decayFactor).toBe(1.0);
  });
});
```

- [ ] **Step 3: Run test to confirm it fails**

```
npx vitest run src/engine/systems/generation/__tests__/talentPoolBias.test.ts
```

Expected: FAIL.

- [ ] **Step 4: Generate bias in `TalentPoolMaterialization.ts`**

Open `src/engine/systems/generation/TalentPoolMaterialization.ts`. Find where a new candidate object is constructed (look for a return statement building a candidate shape). Add:

```typescript
import { generateScoutingBias } from "../../recruitment/FogOfWarService";

// When building the candidate, add:
scoutingBias: generateScoutingBias(candidate.id, world.year),
```

- [ ] **Step 5: Run test**

```
npx vitest run src/engine/systems/generation/__tests__/talentPoolBias.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/engine/types/talent.ts src/engine/systems/generation/TalentPoolMaterialization.ts src/engine/systems/generation/__tests__/talentPoolBias.test.ts
git commit -m "feat(scouting): attach scoutingBias to TalentPoolEntry at materialization"
```

---

## Task 3: Apply Bias in ScoutingService.getScoutedAttributes

**Files:**

- Modify: `src/engine/systems/recruitment/ScoutingService.ts`
- Create: `src/engine/systems/recruitment/__tests__/scoutedAttributesBias.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// src/engine/systems/recruitment/__tests__/scoutedAttributesBias.test.ts
import { describe, it, expect } from "vitest";
import { ScoutingService } from "../ScoutingService";
import { mockRikishi } from "../../../__tests__/utils";
import { generateScoutingBias } from "../FogOfWarService";

describe("ScoutingService.getScoutedAttributes with bias", () => {
  it("returns biased values when scoutingLevel is low and bias decayFactor is 1", () => {
    const r = mockRikishi("r1", { technique: 50, power: 50 });
    // High positive bias on technique
    const bias = {
      statOffsets: { power: 0, speed: 0, balance: 0, technique: 15, aggression: 0, experience: 0 },
      decayFactor: 1.0,
    };
    const scouted = ScoutingService.createScoutedView(1, r, null, 0, "none");
    const attrs = ScoutingService.getScoutedAttributesWithBias(scouted, bias, `seed-r1`);
    // The displayed technique value should reflect bias (will be in narrative string)
    expect(attrs).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```
npx vitest run src/engine/systems/recruitment/__tests__/scoutedAttributesBias.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Add `getScoutedAttributesWithBias` to ScoutingService**

In `src/engine/systems/recruitment/ScoutingService.ts`, add after the existing `getScoutedAttributes` method:

```typescript
import { applyBias, type ScoutingBias } from "./FogOfWarService";

// Inside the ScoutingService object:
getScoutedAttributesWithBias(
  scouted: ScoutedRikishi,
  bias: ScoutingBias,
  seed?: string
) {
  const base = this.getScoutedAttributes(scouted, seed);
  if (!bias || bias.decayFactor === 0) return base;

  const biased = { ...base };
  const attrKeys = ["power", "speed", "balance", "technique", "aggression", "experience"] as const;
  for (const key of attrKeys) {
    const attr = base[key];
    if (attr && typeof attr === "object" && "value" in attr) {
      // attr.value is a qualitative label string; we bias the underlying number
      // The true number is in scouted.attributes[key]
      const trueStat = scouted.attributes[key as keyof typeof scouted.attributes] ?? 50;
      const offset = bias.statOffsets[key] ?? 0;
      const biasedValue = applyBias(trueStat, offset, bias.decayFactor);
      biased[key] = {
        ...attr,
        value: NarrativeService.describeAttribute(key, biasedValue),
        biased: true,
      };
    }
  }
  return biased;
},
```

- [ ] **Step 4: Run test**

```
npx vitest run src/engine/systems/recruitment/__tests__/scoutedAttributesBias.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/systems/recruitment/ScoutingService.ts src/engine/systems/recruitment/__tests__/scoutedAttributesBias.test.ts
git commit -m "feat(scouting): apply scoutingBias in getScoutedAttributesWithBias"
```

---

## Task 4: Decay Bias in the Weekly Recruitment Phase

**Files:**

- Modify: `src/engine/tick/phases/phase01_week_recruitment.ts`
- Create: `src/engine/systems/recruitment/__tests__/biasDecayTick.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// src/engine/systems/recruitment/__tests__/biasDecayTick.test.ts
import { describe, it, expect } from "vitest";
import { decayTalentPoolBias } from "../../tick/phases/phase01_week_recruitment";
import type { WorldState } from "../../../types/world";
import { generateScoutingBias } from "../FogOfWarService";

describe("decayTalentPoolBias", () => {
  it("reduces decayFactor on entries that have been observed", () => {
    const bias = generateScoutingBias("c1", 2025);
    const entry = { id: "c1", timesObserved: 5, scoutingBias: bias };
    const world = { talentPool: { entries: [entry] } } as unknown as WorldState;

    const impact = decayTalentPoolBias(world);
    const updated = (impact.talentPoolUpdates ?? []).find((u: { id: string }) => u.id === "c1");
    expect(updated?.scoutingBias?.decayFactor).toBeLessThan(1.0);
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```
npx vitest run src/engine/systems/recruitment/__tests__/biasDecayTick.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Add `decayTalentPoolBias` export to `phase01_week_recruitment.ts`**

Open `src/engine/tick/phases/phase01_week_recruitment.ts`. Add before the main phase export:

```typescript
import { decayBias } from "../../systems/recruitment/FogOfWarService";
import { createImpactBuilder } from "../../core/ImpactBuilder";
import type { StateImpact } from "../../core/StateImpact";

export function decayTalentPoolBias(world: WorldState): StateImpact {
  const builder = createImpactBuilder("decayTalentPoolBias");
  const entries = world.talentPool?.entries ?? [];
  for (const entry of entries) {
    if (!entry.scoutingBias) continue;
    const decayed = decayBias(entry.scoutingBias, entry.timesObserved ?? 0);
    if (decayed.decayFactor !== entry.scoutingBias.decayFactor) {
      builder.updateTalentPoolEntry(entry.id, { scoutingBias: decayed });
    }
  }
  return builder.build();
}
```

Then call `decayTalentPoolBias` inside the weekly recruitment phase logic and apply the impact using the existing `StateImpact` application pattern in the file.

- [ ] **Step 4: Run test**

```
npx vitest run src/engine/systems/recruitment/__tests__/biasDecayTick.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/tick/phases/phase01_week_recruitment.ts src/engine/systems/recruitment/__tests__/biasDecayTick.test.ts
git commit -m "feat(scouting): decay scoutingBias each week as observations accumulate"
```

---

## Task 5: Confidence Stars in Recruitment UI

**Files:**

- Modify: Recruitment/TalentPool UI component (find with `grep -r "timesObserved\|scoutingLevel" src/components --include="*.tsx" -l`)

- [ ] **Step 1: Locate the recruitment panel**

```
grep -r "scoutingLevel\|timesObserved" src/components --include="*.tsx" -l
```

Open the found file. This is where candidate stats are displayed.

- [ ] **Step 2: Add a `ScoutingConfidenceBadge` inline component**

At the top of the file, add:

```tsx
function ScoutingConfidenceBadge({ level, biased }: { level: number; biased: boolean }) {
  const stars = level >= 90 ? 5 : level >= 70 ? 4 : level >= 45 ? 3 : level >= 20 ? 2 : 1;
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={i < stars ? "text-yellow-400" : "text-muted-foreground/30"}>
          ★
        </span>
      ))}
      {biased && <span className="text-xs text-amber-500 ml-1">est.</span>}
    </div>
  );
}
```

- [ ] **Step 3: Render the badge next to each stat**

For each stat display in the candidate card, pass `biased={attr.biased ?? false}` and `level={scouted.scoutingLevel}` to `ScoutingConfidenceBadge`. Replace the raw `scoutingLevel` label text with the star badge.

- [ ] **Step 4: Manual smoke test**

Start dev server (`bun run dev`), navigate to the recruitment/scouting page. Confirm:

1. New candidates show 1–2 stars (low confidence).
2. After scouting investment or multiple observations, stars increase.
3. Stats on fresh candidates are visibly off from their eventual revealed values.
4. `est.` label appears on biased stats.

- [ ] **Step 5: Commit**

```bash
git add src/components/
git commit -m "feat(ui): show confidence stars on recruitment candidate stats"
```

---

## Verification Checklist

- [ ] `npx vitest run src/engine/systems/recruitment/__tests__/` — all new tests pass
- [ ] `npx vitest run src/engine/systems/generation/__tests__/` — existing + new tests pass
- [ ] Bias is seeded deterministically — same candidate seed produces same bias every time
- [ ] Bias decays to 0 at 20 observations — no permanent distortion
- [ ] `npx tsc --noEmit` — zero type errors
