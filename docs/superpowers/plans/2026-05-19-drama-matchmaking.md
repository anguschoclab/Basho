# Drama-Aware Matchmaking — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "drama budget" post-processing pass to the Swiss matchmaking algorithm that evaluates narrative value of proposed pairings on key days (Day 15, 7–7 records, yusho races) and performs legal swaps to maximize story payoff, flagging resulting bouts with a `DramaPairing` marker that BardEngine can consume for richer pre-bout narrative.

**Architecture:** `DramaMatchmaker.ts` is a pure function that takes a proposed schedule and the world state and returns an optimized schedule. `SwissAlgorithm.ts` calls `DramaMatchmaker.applyDramaBudget` after its own pass. `BoutSchedule` type gets a new optional `dramaticContext` field. `boutNarrative.ts` uses this field to select elevated templates.

**Tech Stack:** TypeScript, Vitest, existing `SwissAlgorithm`, `MatchmakingPhases`, `BashoState`, `Rikishi`, `BardEngine`, `RivalryHeatService`.

---

## File Map

| Action | Path | Purpose |
|--------|------|---------|
| Create | `src/engine/matchmaking/DramaMatchmaker.ts` | Pure drama-swap logic |
| Create | `src/engine/matchmaking/__tests__/DramaMatchmaker.test.ts` | Unit tests |
| Modify | `src/engine/types/basho.ts` | Add `dramaticContext` to `BoutSchedule` / match type |
| Modify | `src/engine/matchmaking/SwissAlgorithm.ts` | Call `applyDramaBudget` after standard pass |
| Modify | `src/engine/bout/boutNarrative.ts` | Check `dramaticContext` to select elevated templates |

---

## Task 1: DramaRule Types and Scoring

**Files:**
- Create: `src/engine/matchmaking/DramaMatchmaker.ts`
- Create: `src/engine/matchmaking/__tests__/DramaMatchmaker.test.ts`

- [ ] **Step 1: Write failing tests for drama scoring**

```typescript
// src/engine/matchmaking/__tests__/DramaMatchmaker.test.ts
import { describe, it, expect } from "vitest";
import { scoreDrama, DramaContext } from "../DramaMatchmaker";
import { mockRikishi } from "../../__tests__/utils";

function makeScoredRikishi(overrides: Partial<ReturnType<typeof mockRikishi>>) {
  return mockRikishi("r1", overrides);
}

describe("scoreDrama", () => {
  it("returns 100 for a 7-7 vs 7-7 pairing on day 15", () => {
    const a = makeScoredRikishi({ currentBashoWins: 7, currentBashoLosses: 7 });
    const b = makeScoredRikishi({ currentBashoWins: 7, currentBashoLosses: 7 });
    const score = scoreDrama(a, b, 15);
    expect(score).toBe(100);
  });

  it("returns 80 for two yusho co-leaders facing each other", () => {
    const a = makeScoredRikishi({ currentBashoWins: 13, currentBashoLosses: 1 });
    const b = makeScoredRikishi({ currentBashoWins: 13, currentBashoLosses: 1 });
    const score = scoreDrama(a, b, 14);
    expect(score).toBeGreaterThanOrEqual(80);
  });

  it("returns 0 for an average day-3 pairing", () => {
    const a = makeScoredRikishi({ currentBashoWins: 2, currentBashoLosses: 0 });
    const b = makeScoredRikishi({ currentBashoWins: 1, currentBashoLosses: 1 });
    const score = scoreDrama(a, b, 3);
    expect(score).toBe(0);
  });

  it("classifies a 7-7 pairing as kadoban_survival context", () => {
    const a = makeScoredRikishi({ currentBashoWins: 7, currentBashoLosses: 7, rank: "ozeki" });
    const b = makeScoredRikishi({ currentBashoWins: 10, currentBashoLosses: 4 });
    const ctx = scoreDrama(a, b, 15, { returnContext: true });
    expect((ctx as DramaContext).label).toBe("kadoban_survival");
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```
npx vitest run src/engine/matchmaking/__tests__/DramaMatchmaker.test.ts
```

Expected: FAIL — `DramaMatchmaker` not found.

- [ ] **Step 3: Implement `DramaMatchmaker.ts` with scoring**

```typescript
// src/engine/matchmaking/DramaMatchmaker.ts
import type { Rikishi } from "../types/rikishi";
import type { BashoState } from "../types/basho";

export type DramaLabel =
  | "make_or_break"       // 7-7 record, any day
  | "yusho_decider"       // two leaders tied for championship
  | "kadoban_survival"    // ozeki at 7-7 (demote or survive)
  | "kinboshi_hunt"       // maegashira vs yokozuna
  | "senshuraku_finale";  // day 15 final bout

export interface DramaContext {
  label: DramaLabel;
  score: number;
}

const DAY_15 = 15;

function wins(r: Rikishi): number { return r.currentBashoWins ?? 0; }
function losses(r: Rikishi): number { return r.currentBashoLosses ?? 0; }

/**
 * Score the narrative drama value of a proposed pairing.
 * Returns a numeric score (0–100) and optionally the DramaContext.
 */
export function scoreDrama(
  a: Rikishi,
  b: Rikishi,
  day: number,
  opts?: { returnContext?: boolean }
): number | DramaContext {
  const wA = wins(a), lA = losses(a), wB = wins(b), lB = losses(b);
  const totalA = wA + lA, totalB = wB + lB;

  // 7–7 make-or-break on Day 15
  if (day === DAY_15 && wA === 7 && lA === 7 && wB === 7 && lB === 7) {
    const ctx: DramaContext = { label: "make_or_break", score: 100 };
    return opts?.returnContext ? ctx : 100;
  }

  // Ozeki kadoban survival (7-7 ozeki, any day from 14+)
  if (day >= 14) {
    const kadoban = (a.rank === "ozeki" && wA === 7 && lA === 7)
      || (b.rank === "ozeki" && wB === 7 && lB === 7);
    if (kadoban) {
      const ctx: DramaContext = { label: "kadoban_survival", score: 90 };
      return opts?.returnContext ? ctx : 90;
    }
  }

  // Yusho leaders tied (within 1 win of each other, both near top)
  if (totalA >= 10 && totalB >= 10) {
    const diff = Math.abs(wA - wB);
    if (diff <= 1 && wA >= 11 && wB >= 11) {
      const ctx: DramaContext = { label: "yusho_decider", score: 80 + (day === DAY_15 ? 15 : 0) };
      return opts?.returnContext ? ctx : ctx.score;
    }
  }

  // Kinboshi hunt: maegashira vs yokozuna
  if (
    (a.rank === "maegashira" && b.rank === "yokozuna") ||
    (b.rank === "maegashira" && a.rank === "yokozuna")
  ) {
    const ctx: DramaContext = { label: "kinboshi_hunt", score: 50 };
    return opts?.returnContext ? ctx : 50;
  }

  // Day 15 finale bonus
  if (day === DAY_15) {
    const ctx: DramaContext = { label: "senshuraku_finale", score: 30 };
    return opts?.returnContext ? ctx : 30;
  }

  return opts?.returnContext ? { label: "make_or_break", score: 0 } : 0;
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```
npx vitest run src/engine/matchmaking/__tests__/DramaMatchmaker.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/matchmaking/DramaMatchmaker.ts src/engine/matchmaking/__tests__/DramaMatchmaker.test.ts
git commit -m "feat(matchmaking): add DramaMatchmaker with scoreDrama logic"
```

---

## Task 2: The Drama Budget Swap Algorithm

**Files:**
- Modify: `src/engine/matchmaking/DramaMatchmaker.ts`
- Create additional tests in `src/engine/matchmaking/__tests__/DramaMatchmaker.test.ts`

- [ ] **Step 1: Write failing tests for swap algorithm**

Append to the existing test file:

```typescript
import { applyDramaBudget } from "../DramaMatchmaker";
import type { MatchPairing } from "../MatchmakingPhases";

describe("applyDramaBudget", () => {
  it("swaps a lower-drama pair to create a 7-7 showdown on day 15", () => {
    // Four rikishi: two at 7-7, two at 5-9 — initially paired 0-1 and 2-3
    const r7a = mockRikishi("r7a", { currentBashoWins: 7, currentBashoLosses: 7, rank: "maegashira", heyaId: "h1" });
    const r7b = mockRikishi("r7b", { currentBashoWins: 7, currentBashoLosses: 7, rank: "maegashira", heyaId: "h2" });
    const r5a = mockRikishi("r5a", { currentBashoWins: 5, currentBashoLosses: 9, rank: "maegashira", heyaId: "h1" });
    const r5b = mockRikishi("r5b", { currentBashoWins: 5, currentBashoLosses: 9, rank: "maegashira", heyaId: "h2" });

    const pairings: MatchPairing[] = [
      { eastId: r7a.id, westId: r5a.id, score: 10 },
      { eastId: r7b.id, westId: r5b.id, score: 10 },
    ];
    const rikishiMap = new Map([
      [r7a.id, r7a], [r7b.id, r7b], [r5a.id, r5a], [r5b.id, r5b]
    ]);

    const optimized = applyDramaBudget(pairings, rikishiMap, 15, new Set());
    // Should swap to produce r7a vs r7b
    const dramaticPair = optimized.find(
      (p) => (p.eastId === r7a.id && p.westId === r7b.id) ||
              (p.eastId === r7b.id && p.westId === r7a.id)
    );
    expect(dramaticPair).toBeDefined();
  });

  it("does not swap if it would create a rematch", () => {
    const rA = mockRikishi("rA", { currentBashoWins: 7, currentBashoLosses: 7, rank: "maegashira" });
    const rB = mockRikishi("rB", { currentBashoWins: 7, currentBashoLosses: 7, rank: "maegashira" });
    const rC = mockRikishi("rC", { currentBashoWins: 5, currentBashoLosses: 9, rank: "maegashira" });
    const rD = mockRikishi("rD", { currentBashoWins: 5, currentBashoLosses: 9, rank: "maegashira" });

    const pairings: MatchPairing[] = [
      { eastId: rA.id, westId: rC.id, score: 10 },
      { eastId: rB.id, westId: rD.id, score: 10 },
    ];
    const rikishiMap = new Map([[rA.id, rA], [rB.id, rB], [rC.id, rC], [rD.id, rD]]);
    // Mark rA and rB as already having faced each other
    const facedSet = new Set([`${rA.id}-${rB.id}`]);

    const optimized = applyDramaBudget(pairings, rikishiMap, 15, facedSet);
    // Should NOT swap — rA vs rB would be a rematch
    const rematched = optimized.find(
      (p) => (p.eastId === rA.id && p.westId === rB.id) ||
              (p.eastId === rB.id && p.westId === rA.id)
    );
    expect(rematched).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```
npx vitest run src/engine/matchmaking/__tests__/DramaMatchmaker.test.ts
```

Expected: FAIL — `applyDramaBudget` not found.

- [ ] **Step 3: Implement `applyDramaBudget`**

Add to `src/engine/matchmaking/DramaMatchmaker.ts`:

```typescript
import type { MatchPairing } from "./MatchmakingPhases";

function pairKey(aId: string, bId: string): string {
  return aId < bId ? `${aId}-${bId}` : `${bId}-${aId}`;
}

/**
 * Post-processing swap pass.
 * Given a proposed schedule, attempts to swap pairs to increase total drama score.
 * Respects the faced set (no rematches) as a hard constraint.
 * Budget: at most 3 swaps per day to avoid wholesale schedule replacement.
 */
export function applyDramaBudget(
  pairings: MatchPairing[],
  rikishiMap: Map<string, Rikishi>,
  day: number,
  facedSet: Set<string>,
  maxSwaps = 3
): Array<MatchPairing & { dramaticContext?: DramaContext }> {
  const result = pairings.map((p) => ({ ...p, dramaticContext: undefined as DramaContext | undefined }));
  let swapsUsed = 0;

  for (let i = 0; i < result.length && swapsUsed < maxSwaps; i++) {
    for (let j = i + 1; j < result.length && swapsUsed < maxSwaps; j++) {
      const pi = result[i], pj = result[j];
      const riA = rikishiMap.get(pi.eastId);
      const riB = rikishiMap.get(pi.westId);
      const riC = rikishiMap.get(pj.eastId);
      const riD = rikishiMap.get(pj.westId);
      if (!riA || !riB || !riC || !riD) continue;

      // Current drama
      const currentScore =
        (scoreDrama(riA, riB, day) as number) +
        (scoreDrama(riC, riD, day) as number);

      // Candidate swap: A-C vs B-D
      const swapKey1 = pairKey(pi.eastId, pj.eastId);
      const swapKey2 = pairKey(pi.westId, pj.westId);
      const swap1Legal = !facedSet.has(swapKey1) && !facedSet.has(swapKey2);

      if (swap1Legal) {
        const swapScore =
          (scoreDrama(riA, riC, day) as number) +
          (scoreDrama(riB, riD, day) as number);
        if (swapScore > currentScore) {
          const ctxAC = scoreDrama(riA, riC, day, { returnContext: true }) as DramaContext;
          const ctxBD = scoreDrama(riB, riD, day, { returnContext: true }) as DramaContext;
          result[i] = { eastId: pi.eastId, westId: pj.eastId, score: swapScore, dramaticContext: ctxAC.score > 0 ? ctxAC : undefined };
          result[j] = { eastId: pi.westId, westId: pj.westId, score: swapScore, dramaticContext: ctxBD.score > 0 ? ctxBD : undefined };
          facedSet.add(swapKey1);
          facedSet.add(swapKey2);
          swapsUsed++;
          continue;
        }
      }

      // Candidate swap: A-D vs B-C
      const swapKey3 = pairKey(pi.eastId, pj.westId);
      const swapKey4 = pairKey(pi.westId, pj.eastId);
      const swap2Legal = !facedSet.has(swapKey3) && !facedSet.has(swapKey4);

      if (swap2Legal) {
        const swapScore2 =
          (scoreDrama(riA, riD, day) as number) +
          (scoreDrama(riB, riC, day) as number);
        if (swapScore2 > currentScore) {
          const ctxAD = scoreDrama(riA, riD, day, { returnContext: true }) as DramaContext;
          const ctxBC = scoreDrama(riB, riC, day, { returnContext: true }) as DramaContext;
          result[i] = { eastId: pi.eastId, westId: pj.westId, score: swapScore2, dramaticContext: ctxAD.score > 0 ? ctxAD : undefined };
          result[j] = { eastId: pi.westId, westId: pj.eastId, score: swapScore2, dramaticContext: ctxBC.score > 0 ? ctxBC : undefined };
          facedSet.add(swapKey3);
          facedSet.add(swapKey4);
          swapsUsed++;
        }
      }
    }
  }

  return result;
}
```

- [ ] **Step 4: Run all DramaMatchmaker tests**

```
npx vitest run src/engine/matchmaking/__tests__/DramaMatchmaker.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/matchmaking/DramaMatchmaker.ts src/engine/matchmaking/__tests__/DramaMatchmaker.test.ts
git commit -m "feat(matchmaking): implement applyDramaBudget swap algorithm"
```

---

## Task 3: Add `dramaticContext` to BashoState Match Type

**Files:**
- Modify: `src/engine/types/basho.ts`

- [ ] **Step 1: Open `src/engine/types/basho.ts` and find the match/bout schedule type**

Look for the interface that has `eastRikishiId`, `westRikishiId`, or `day` fields. This is the match schedule entry type.

- [ ] **Step 2: Add `dramaticContext` field**

```typescript
import type { DramaContext } from "../matchmaking/DramaMatchmaker";

// Inside the match schedule interface:
dramaticContext?: DramaContext;
```

- [ ] **Step 3: Confirm TypeScript compiles**

```
npx tsc --noEmit
```

Expected: Zero new errors (the field is optional, so no call sites break).

- [ ] **Step 4: Commit**

```bash
git add src/engine/types/basho.ts
git commit -m "feat(types): add optional dramaticContext to basho match schedule type"
```

---

## Task 4: Call applyDramaBudget in SwissAlgorithm

**Files:**
- Modify: `src/engine/matchmaking/SwissAlgorithm.ts`

- [ ] **Step 1: Locate `buildSwissTorikumi` or equivalent main export in `SwissAlgorithm.ts`**

Read the file to find where the final `pairings` array is assembled before it is returned.

- [ ] **Step 2: Import and call `applyDramaBudget`**

Add at the top of `SwissAlgorithm.ts`:

```typescript
import { applyDramaBudget } from "./DramaMatchmaker";
```

In `buildSwissTorikumi` (or equivalent), just before the return statement where the pairings are returned:

```typescript
// world and day should already be in scope from calling context; if not, accept them as parameters.
// facedSet is built by buildFacedSet(basho) earlier in the function — reuse it.
const optimizedPairings = applyDramaBudget(pairings, rikishiMap, basho.day, facedSet);
return optimizedPairings;
```

If `rikishiMap` is not already in scope, build it:

```typescript
const rikishiMap = new Map(rikishiArray.map((r) => [r.id, r]));
```

- [ ] **Step 3: Run existing matchmaking tests to confirm nothing broke**

```
npx vitest run src/engine/matchmaking/
```

Expected: All existing tests still PASS.

- [ ] **Step 4: Commit**

```bash
git add src/engine/matchmaking/SwissAlgorithm.ts
git commit -m "feat(matchmaking): call applyDramaBudget after Swiss pass in buildSwissTorikumi"
```

---

## Task 5: BardEngine Drama Template Selection

**Files:**
- Modify: `src/engine/bout/boutNarrative.ts`

- [ ] **Step 1: Read `boutNarrative.ts` to find where pre-bout or bout narrative is generated**

```
grep -n "narrative\|BardEngine\|template" src/engine/bout/boutNarrative.ts | head -30
```

Find the function that generates the narrative array on `BoutResult`.

- [ ] **Step 2: Add drama-context-aware template selection**

In the narrative generation function, check for `dramaticContext` on the match data passed in. If present, prepend a drama-themed narrative line:

```typescript
import { BardEngine } from "../narrative/BardEngine";
import type { DramaContext } from "../matchmaking/DramaMatchmaker";

function getDramaOpeningLine(ctx: DramaContext, rng: SeededRNG): string {
  const templateMap: Record<string, string> = {
    make_or_break: "combat.drama.make_or_break",
    yusho_decider: "combat.drama.yusho_decider",
    kadoban_survival: "combat.drama.kadoban_survival",
    kinboshi_hunt: "combat.drama.kinboshi_hunt",
    senshuraku_finale: "combat.drama.senshuraku_finale",
  };
  const path = templateMap[ctx.label] ?? "combat.drama.generic";
  return BardEngine.resolve(rng, path).text;
}

// In the narrative generation function, if dramaticContext is defined:
if (dramaticContext && dramaticContext.score > 0) {
  const dramaLine = getDramaOpeningLine(dramaticContext, rng);
  narrative.unshift(dramaLine); // prepend as the opening line
}
```

- [ ] **Step 3: Add drama templates to `src/engine/narrative/archive.json`**

Open `src/engine/narrative/archive.json`. Find the `combat` section. Add a `drama` subsection:

```json
"drama": {
  "make_or_break": ["This is the bout that defines a career.", "Seven wins, seven losses — everything on the line.", "There is no tomorrow. Only now."],
  "yusho_decider": ["Two warriors, one trophy.", "The Emperor's Cup will follow the winner of this bout.", "A yusho decided by a single throw."],
  "kadoban_survival": ["An Ozeki fights to keep his rank.", "Demotion or survival — the dohyo will decide.", "The weight of the rope rests on this bout."],
  "kinboshi_hunt": ["A Maegashira circles the highest peak.", "Gold stars are not given — they are seized.", "The crowd leans forward."],
  "senshuraku_finale": ["The final day of the basho is upon us.", "Fifteen days of battle come to their conclusion.", "What the rikishi carried here will be remembered."],
  "generic": ["A pivotal moment in the basho.", "The crowd holds its breath.", "The dohyo is silent before the storm."]
}
```

- [ ] **Step 4: Run all tests**

```
npx vitest run
```

Expected: All tests pass. New drama templates don't break anything.

- [ ] **Step 5: Commit**

```bash
git add src/engine/bout/boutNarrative.ts src/engine/narrative/archive.json
git commit -m "feat(narrative): select drama-aware opening lines when DramaContext is present"
```

---

## Verification Checklist

- [ ] `npx vitest run src/engine/matchmaking/` — all tests pass
- [ ] `npx vitest run src/engine/bout/` — all existing bout tests pass
- [ ] Drama swaps never create rematches (enforce via facedSet)
- [ ] At most 3 swaps per day (maxSwaps guard in place)
- [ ] `npx tsc --noEmit` — zero type errors
- [ ] Manual: advance to basho Day 15 in dev, open the schedule — verify 7-7 rikishi are paired together
