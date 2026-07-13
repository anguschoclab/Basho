# Mentor-Apprentice Training Bonds — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the existing `mentorId` / `menteeIds` fields on `Rikishi` into a functioning training relationship that bleeds senior technique stat into apprentice growth vectors and seeds narrative/rivalry arcs.

**Architecture:** A `MentorshipService` handles pure mentor-assignment logic and growth-bonus calculation. The weekly training tick (`phase01_week_training.ts`) calls into the service after the standard `applyWeeklyTraining` pass. A new `MentorshipUI` component surfaces assignment in the Stable/Roster page.

**Tech Stack:** TypeScript, Vitest (tests), `StateImpact` / `ImpactBuilder` pattern, `rngForWorld`, existing `TrainingService`, `EntityCollection`, TanStack Router (`/stable/roster`), shadcn/ui, Tailwind.

---

## File Map

| Action | Path | Purpose |
|--------|------|---------|
| Create | `src/engine/systems/training/MentorshipService.ts` | Pure mentor logic: assign, validate, bonus calc |
| Create | `src/engine/systems/training/__tests__/MentorshipService.test.ts` | Unit tests |
| Modify | `src/engine/tick/phases/phase01_week_training.ts` | Call mentorship bonus after standard training tick |
| Modify | `src/engine/types/world.ts` | Add `mentorshipLog` event category if not present |
| Create | `src/components/game/MentorAssignmentPanel.tsx` | UI to assign/remove mentor on roster page |
| Modify | `src/pages/StableRoster.tsx` (or equivalent roster page) | Render `MentorAssignmentPanel` per rikishi |

---

## Task 1: MentorshipService — Core Types and Assignment

**Files:**
- Create: `src/engine/systems/training/MentorshipService.ts`
- Create: `src/engine/systems/training/__tests__/MentorshipService.test.ts`

- [ ] **Step 1: Write the failing tests for eligibility and assignment**

```typescript
// src/engine/systems/training/__tests__/MentorshipService.test.ts
import { describe, it, expect } from "vitest";
import { MentorshipService } from "../MentorshipService";
import { mockRikishi } from "../../../__tests__/utils";

describe("MentorshipService", () => {
  it("rejects a mentor below juryo rank", () => {
    const mentor = mockRikishi("mentor1", { rank: "makushita" });
    const apprentice = mockRikishi("app1", { rank: "jonokuchi", heyaId: "heya1" });
    mentor.heyaId = "heya1";
    expect(MentorshipService.canMentor(mentor, apprentice)).toBe(false);
  });

  it("accepts a juryo mentor for a lower-division apprentice in the same heya", () => {
    const mentor = mockRikishi("mentor1", { rank: "juryo", heyaId: "heya1" });
    const apprentice = mockRikishi("app1", { rank: "jonokuchi", heyaId: "heya1" });
    expect(MentorshipService.canMentor(mentor, apprentice)).toBe(true);
  });

  it("rejects cross-heya mentorship", () => {
    const mentor = mockRikishi("mentor1", { rank: "juryo", heyaId: "heya1" });
    const apprentice = mockRikishi("app1", { rank: "jonokuchi", heyaId: "heya2" });
    expect(MentorshipService.canMentor(mentor, apprentice)).toBe(false);
  });

  it("calculates technique bleed bonus proportional to mentor technique", () => {
    const mentor = mockRikishi("mentor1", { rank: "ozeki", technique: 90, heyaId: "heya1" });
    const apprentice = mockRikishi("app1", { rank: "jonokuchi", technique: 40, heyaId: "heya1" });
    const bonus = MentorshipService.calculateTechniqueBleed(mentor, apprentice);
    expect(bonus).toBeGreaterThan(0);
    expect(bonus).toBeLessThanOrEqual(3); // max 3 points per week
  });

  it("returns 0 bleed when apprentice technique is close to mentor", () => {
    const mentor = mockRikishi("mentor1", { rank: "ozeki", technique: 70, heyaId: "heya1" });
    const apprentice = mockRikishi("app1", { rank: "juryo", technique: 68, heyaId: "heya1" });
    const bonus = MentorshipService.calculateTechniqueBleed(mentor, apprentice);
    expect(bonus).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```
npx vitest run src/engine/systems/training/__tests__/MentorshipService.test.ts
```

Expected: FAIL — `MentorshipService` not found.

- [ ] **Step 3: Implement MentorshipService**

```typescript
// src/engine/systems/training/MentorshipService.ts
import type { Rikishi } from "../../types/rikishi";
import { clamp } from "../../utils/math";

const MENTOR_MIN_RANKS = new Set(["juryo", "maegashira", "komusubi", "sekiwake", "ozeki", "yokozuna"]);
const MAX_BLEED = 3; // max technique points per week
const BLEED_THRESHOLD = 10; // gap below which no bleed occurs
const BLEED_SCALE = 0.06; // fraction of gap transferred per week

export const MentorshipService = {
  /** Returns true if mentor is eligible to guide apprentice. */
  canMentor(mentor: Rikishi, apprentice: Rikishi): boolean {
    if (mentor.heyaId !== apprentice.heyaId) return false;
    if (!MENTOR_MIN_RANKS.has(mentor.rank)) return false;
    if (mentor.id === apprentice.id) return false;
    if (mentor.injured || mentor.isRetired) return false;
    return true;
  },

  /**
   * Technique bleed: a fraction of the gap between mentor and apprentice
   * technique flows to the apprentice each week, capped at MAX_BLEED.
   * Returns 0 when gap is below BLEED_THRESHOLD.
   */
  calculateTechniqueBleed(mentor: Rikishi, apprentice: Rikishi): number {
    const gap = mentor.technique - apprentice.technique;
    if (gap < BLEED_THRESHOLD) return 0;
    return clamp(Math.floor(gap * BLEED_SCALE), 0, MAX_BLEED);
  },

  /**
   * Adaptability penalty: mentorship creates dependency, slightly throttling
   * the apprentice's independent adaptability growth.
   * Returns a negative delta (0 to -1).
   */
  calculateAdaptabilityPenalty(mentor: Rikishi, apprentice: Rikishi): number {
    if (!this.canMentor(mentor, apprentice)) return 0;
    const gap = mentor.technique - apprentice.technique;
    if (gap < BLEED_THRESHOLD) return 0;
    return -1;
  },
};
```

- [ ] **Step 4: Run tests to confirm they pass**

```
npx vitest run src/engine/systems/training/__tests__/MentorshipService.test.ts
```

Expected: All 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/systems/training/MentorshipService.ts src/engine/systems/training/__tests__/MentorshipService.test.ts
git commit -m "feat(training): add MentorshipService with eligibility and technique bleed logic"
```

---

## Task 2: Wire Mentorship Bonus into the Weekly Training Tick

**Files:**
- Modify: `src/engine/tick/phases/phase01_week_training.ts`
- Create: `src/engine/systems/training/__tests__/mentorshipTick.test.ts`

- [ ] **Step 1: Write failing integration test**

```typescript
// src/engine/systems/training/__tests__/mentorshipTick.test.ts
import { describe, it, expect } from "vitest";
import { mockRikishi } from "../../../__tests__/utils";
import { applyMentorshipBonuses } from "../MentorshipService";
import type { WorldState } from "../../../types/world";

function makeWorld(mentor: ReturnType<typeof mockRikishi>, apprentice: ReturnType<typeof mockRikishi>): WorldState {
  const rikishi = new Map([[mentor.id, mentor], [apprentice.id, apprentice]]);
  return {
    id: "w1", seed: "seed", year: 2025, week: 1, dayIndexGlobal: 1,
    cyclePhase: "interim", rikishi, heyas: new Map(), events: [],
    trainingState: new Map(), governanceLog: [], currentBasho: null,
  } as unknown as WorldState;
}

describe("applyMentorshipBonuses", () => {
  it("increases apprentice technique when mentor has high technique", () => {
    const mentor = mockRikishi("m1", { rank: "ozeki", technique: 90, heyaId: "h1" });
    const apprentice = mockRikishi("a1", { rank: "jonokuchi", technique: 40, heyaId: "h1" });
    mentor.menteeIds = [apprentice.id];
    apprentice.mentorId = mentor.id;

    const world = makeWorld(mentor, apprentice);
    const impact = applyMentorshipBonuses(world);

    const updates = impact.rikishiUpdates ?? [];
    const appUpdate = updates.find((u: { id: string }) => u.id === apprentice.id);
    expect(appUpdate?.technique).toBeGreaterThan(40);
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```
npx vitest run src/engine/systems/training/__tests__/mentorshipTick.test.ts
```

Expected: FAIL — `applyMentorshipBonuses` not exported.

- [ ] **Step 3: Add `applyMentorshipBonuses` to MentorshipService**

Add to the bottom of `src/engine/systems/training/MentorshipService.ts`:

```typescript
import type { WorldState } from "../../types/world";
import { EntityCollection } from "../../core/EntityCollection";
import { createImpactBuilder } from "../../core/ImpactBuilder";
import type { StateImpact } from "../../core/StateImpact";

export function applyMentorshipBonuses(world: WorldState): StateImpact {
  const builder = createImpactBuilder("applyMentorshipBonuses");
  const allRikishi = EntityCollection.getActiveRikishi(world);

  for (const apprentice of allRikishi) {
    if (!apprentice.mentorId) continue;
    const mentor = world.rikishi.get(apprentice.mentorId);
    if (!mentor) continue;
    if (!MentorshipService.canMentor(mentor, apprentice)) continue;

    const techniqueBleed = MentorshipService.calculateTechniqueBleed(mentor, apprentice);
    const adaptabilityPenalty = MentorshipService.calculateAdaptabilityPenalty(mentor, apprentice);

    if (techniqueBleed === 0 && adaptabilityPenalty === 0) continue;

    builder.updateRikishi(apprentice.id, {
      technique: clamp(apprentice.technique + techniqueBleed, 0, 99),
      adaptability: clamp(apprentice.adaptability + adaptabilityPenalty, 0, 99),
    });
  }

  return builder.build();
}
```

- [ ] **Step 4: Call `applyMentorshipBonuses` in the weekly training phase**

Open `src/engine/tick/phases/phase01_week_training.ts`. At the end of the weekly training block (after `applyWeeklyTraining` result is applied), add:

```typescript
import { applyMentorshipBonuses } from "../../systems/training/MentorshipService";

// ... existing weekly training logic ...

// After applyWeeklyTraining impact is applied to world:
const mentorshipImpact = applyMentorshipBonuses(world);
// Apply mentorshipImpact using the existing impact application pattern in this file
```

Follow the same pattern used for applying `applyWeeklyTraining`'s `StateImpact` in the existing phase file.

- [ ] **Step 5: Run the integration test**

```
npx vitest run src/engine/systems/training/__tests__/mentorshipTick.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/engine/systems/training/MentorshipService.ts src/engine/systems/training/__tests__/mentorshipTick.test.ts src/engine/tick/phases/phase01_week_training.ts
git commit -m "feat(training): apply mentorship technique bleed in weekly tick"
```

---

## Task 3: Mentor Assignment Mutation (assign / unassign)

**Files:**
- Modify: `src/engine/systems/training/MentorshipService.ts`
- Create: `src/engine/systems/training/__tests__/mentorAssignment.test.ts`

- [ ] **Step 1: Write failing tests for assign / unassign**

```typescript
// src/engine/systems/training/__tests__/mentorAssignment.test.ts
import { describe, it, expect } from "vitest";
import { assignMentor, removeMentor } from "../MentorshipService";
import { mockRikishi } from "../../../__tests__/utils";
import type { WorldState } from "../../../types/world";

function makeWorld(rikishi: ReturnType<typeof mockRikishi>[]): WorldState {
  const map = new Map(rikishi.map((r) => [r.id, r]));
  return { rikishi: map } as unknown as WorldState;
}

describe("assignMentor", () => {
  it("sets mentorId on apprentice and adds to menteeIds on mentor", () => {
    const mentor = mockRikishi("m1", { rank: "ozeki", heyaId: "h1" });
    mentor.menteeIds = [];
    const apprentice = mockRikishi("a1", { rank: "jonokuchi", heyaId: "h1" });
    const world = makeWorld([mentor, apprentice]);

    const impact = assignMentor(world, mentor.id, apprentice.id);
    const updates = impact.rikishiUpdates ?? [];

    expect(updates.find((u: { id: string }) => u.id === apprentice.id)?.mentorId).toBe(mentor.id);
    expect(updates.find((u: { id: string }) => u.id === mentor.id)?.menteeIds).toContain(apprentice.id);
  });

  it("returns empty impact when pairing is invalid", () => {
    const mentor = mockRikishi("m1", { rank: "makushita", heyaId: "h1" });
    const apprentice = mockRikishi("a1", { rank: "jonokuchi", heyaId: "h1" });
    const world = makeWorld([mentor, apprentice]);

    const impact = assignMentor(world, mentor.id, apprentice.id);
    expect(impact.rikishiUpdates ?? []).toHaveLength(0);
  });
});

describe("removeMentor", () => {
  it("clears mentorId on apprentice and removes from mentor menteeIds", () => {
    const mentor = mockRikishi("m1", { rank: "ozeki", heyaId: "h1" });
    mentor.menteeIds = ["a1"];
    const apprentice = mockRikishi("a1", { rank: "jonokuchi", heyaId: "h1" });
    apprentice.mentorId = "m1";
    const world = makeWorld([mentor, apprentice]);

    const impact = removeMentor(world, apprentice.id);
    const updates = impact.rikishiUpdates ?? [];

    const appUpdate = updates.find((u: { id: string }) => u.id === apprentice.id);
    expect(appUpdate?.mentorId).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```
npx vitest run src/engine/systems/training/__tests__/mentorAssignment.test.ts
```

Expected: FAIL — `assignMentor` / `removeMentor` not exported.

- [ ] **Step 3: Implement `assignMentor` and `removeMentor` in MentorshipService**

Add to the bottom of `src/engine/systems/training/MentorshipService.ts`:

```typescript
export function assignMentor(world: WorldState, mentorId: string, apprenticeId: string): StateImpact {
  const builder = createImpactBuilder("assignMentor");
  const mentor = world.rikishi.get(mentorId);
  const apprentice = world.rikishi.get(apprenticeId);
  if (!mentor || !apprentice) return builder.build();
  if (!MentorshipService.canMentor(mentor, apprentice)) return builder.build();

  builder.updateRikishi(apprenticeId, { mentorId });
  builder.updateRikishi(mentorId, { menteeIds: [...(mentor.menteeIds ?? []), apprenticeId] });
  return builder.build();
}

export function removeMentor(world: WorldState, apprenticeId: string): StateImpact {
  const builder = createImpactBuilder("removeMentor");
  const apprentice = world.rikishi.get(apprenticeId);
  if (!apprentice?.mentorId) return builder.build();

  const mentor = world.rikishi.get(apprentice.mentorId);
  builder.updateRikishi(apprenticeId, { mentorId: undefined });
  if (mentor) {
    builder.updateRikishi(mentor.id, {
      menteeIds: (mentor.menteeIds ?? []).filter((id) => id !== apprenticeId),
    });
  }
  return builder.build();
}
```

- [ ] **Step 4: Run tests**

```
npx vitest run src/engine/systems/training/__tests__/mentorAssignment.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/systems/training/MentorshipService.ts src/engine/systems/training/__tests__/mentorAssignment.test.ts
git commit -m "feat(training): add assignMentor / removeMentor mutations"
```

---

## Task 4: Rivalry Seeding — When Mentor Faces Mentee in Basho

**Files:**
- Modify: `src/engine/bout/boutResultApplier.ts`
- Create: `src/engine/systems/training/__tests__/mentorRivalrySeed.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// src/engine/systems/training/__tests__/mentorRivalrySeed.test.ts
import { describe, it, expect } from "vitest";
import { checkMentorMenteeBout } from "../MentorshipService";
import { mockRikishi } from "../../../__tests__/utils";

describe("checkMentorMenteeBout", () => {
  it("returns a rivalry seed event when mentor faces mentee", () => {
    const mentor = mockRikishi("m1", { rank: "ozeki", heyaId: "h1" });
    const apprentice = mockRikishi("a1", { rank: "maegashira", heyaId: "h1" });
    apprentice.mentorId = "m1";
    mentor.menteeIds = ["a1"];

    const result = checkMentorMenteeBout(mentor, apprentice);
    expect(result).not.toBeNull();
    expect(result?.type).toBe("mentor_mentee_bout");
  });

  it("returns null for unrelated rikishi", () => {
    const a = mockRikishi("a1", { rank: "ozeki" });
    const b = mockRikishi("b1", { rank: "maegashira" });
    expect(checkMentorMenteeBout(a, b)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```
npx vitest run src/engine/systems/training/__tests__/mentorRivalrySeed.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Add `checkMentorMenteeBout` to MentorshipService**

Add at the bottom of `src/engine/systems/training/MentorshipService.ts`:

```typescript
export interface MentorMenteeBoutEvent {
  type: "mentor_mentee_bout";
  mentorId: string;
  apprenticeId: string;
}

export function checkMentorMenteeBout(
  a: Rikishi,
  b: Rikishi
): MentorMenteeBoutEvent | null {
  if (a.menteeIds?.includes(b.id)) {
    return { type: "mentor_mentee_bout", mentorId: a.id, apprenticeId: b.id };
  }
  if (b.menteeIds?.includes(a.id)) {
    return { type: "mentor_mentee_bout", mentorId: b.id, apprenticeId: a.id };
  }
  return null;
}
```

- [ ] **Step 4: Call `checkMentorMenteeBout` in `boutResultApplier.ts`**

Open `src/engine/bout/boutResultApplier.ts`. After the main result is recorded (before returning), add:

```typescript
import { checkMentorMenteeBout } from "../systems/training/MentorshipService";

// Inside the applyBoutResult function, after result is built:
const mentorEvent = checkMentorMenteeBout(eastRikishi, westRikishi);
if (mentorEvent) {
  logEngineEvent(world, {
    type: "mentor_mentee_bout",
    category: "training",
    phase: "basho",
    importance: "notable",
    heyaId: eastRikishi.heyaId,
    title: `${eastRikishi.shikona} faces their ${mentorEvent.mentorId === eastRikishi.id ? "apprentice" : "mentor"}`,
    summary: `A pivotal moment in the master-apprentice arc on the dohyo.`,
    data: mentorEvent,
    truthLevel: "public",
  });
}
```

- [ ] **Step 5: Run all mentorship tests**

```
npx vitest run src/engine/systems/training/__tests__/
```

Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/engine/systems/training/MentorshipService.ts src/engine/systems/training/__tests__/mentorRivalrySeed.test.ts src/engine/bout/boutResultApplier.ts
git commit -m "feat(training): seed mentor-mentee bout event in basho result applier"
```

---

## Task 5: Mentor Assignment UI Panel

**Files:**
- Create: `src/components/game/MentorAssignmentPanel.tsx`
- Modify: Stable Roster page (check `src/pages/` for file named `Roster`, `StableRoster`, or similar)

- [ ] **Step 1: Find the roster page file**

```
npx vitest run --listFiles | grep -i roster
```

Or check: `ls src/pages/` and `ls src/components/game/` — find the component that renders the rikishi list for a stable.

- [ ] **Step 2: Create MentorAssignmentPanel**

```tsx
// src/components/game/MentorAssignmentPanel.tsx
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Rikishi } from "@/engine/types/rikishi";
import { MentorshipService } from "@/engine/systems/training/MentorshipService";

interface Props {
  apprentice: Rikishi;
  heyaRikishi: Rikishi[];
  onAssign: (mentorId: string) => void;
  onRemove: () => void;
}

export function MentorAssignmentPanel({ apprentice, heyaRikishi, onAssign, onRemove }: Props) {
  const [selected, setSelected] = useState<string>("");

  const eligibleMentors = heyaRikishi.filter((r) =>
    MentorshipService.canMentor(r, apprentice)
  );

  const currentMentor = heyaRikishi.find((r) => r.id === apprentice.mentorId);

  return (
    <div className="flex items-center gap-2 mt-1">
      {currentMentor ? (
        <>
          <Badge variant="secondary">Mentor: {currentMentor.shikona}</Badge>
          <Button size="sm" variant="ghost" onClick={onRemove}>Remove</Button>
        </>
      ) : eligibleMentors.length > 0 ? (
        <>
          <Select onValueChange={setSelected} value={selected}>
            <SelectTrigger className="w-40 h-7 text-xs">
              <SelectValue placeholder="Assign mentor" />
            </SelectTrigger>
            <SelectContent>
              {eligibleMentors.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.shikona} ({m.rank})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            className="h-7 text-xs"
            disabled={!selected}
            onClick={() => selected && onAssign(selected)}
          >
            Assign
          </Button>
        </>
      ) : (
        <span className="text-xs text-muted-foreground">No eligible mentors</span>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Add `ASSIGN_MENTOR` and `REMOVE_MENTOR` actions to GameContext**

In `src/contexts/GameContext.tsx` (or whichever slice handles roster mutations), add two action handlers that call `assignMentor(world, mentorId, apprenticeId)` and `removeMentor(world, apprenticeId)` from `MentorshipService`, then apply the resulting `StateImpact` to world state.

Follow the same pattern used for existing rikishi mutation actions in the slice (e.g., how injury or kyujo state is applied).

- [ ] **Step 4: Integrate panel in roster page**

In the roster page component, for each rikishi row, render:

```tsx
<MentorAssignmentPanel
  apprentice={rikishi}
  heyaRikishi={allHeyaRikishi}
  onAssign={(mentorId) => dispatch({ type: "ASSIGN_MENTOR", mentorId, apprenticeId: rikishi.id })}
  onRemove={() => dispatch({ type: "REMOVE_MENTOR", apprenticeId: rikishi.id })}
/>
```

- [ ] **Step 5: Manual smoke test**

Start dev server (`bun run dev`), navigate to `/stable/roster`. Confirm:
1. Lower-division rikishi show a mentor dropdown populated with juryo+ stablemates.
2. Assigning a mentor shows the badge.
3. Removing a mentor clears the badge.
4. After advancing a week, open the rikishi detail and confirm technique ticked up slightly for apprentices with high-technique mentors.

- [ ] **Step 6: Commit**

```bash
git add src/components/game/MentorAssignmentPanel.tsx src/contexts/GameContext.tsx
git commit -m "feat(ui): add MentorAssignmentPanel to roster page"
```

---

## Verification Checklist

- [ ] `npx vitest run src/engine/systems/training/__tests__/` — all new tests pass
- [ ] No `Math.random()` introduced (use `rngForWorld` if RNG is needed later)
- [ ] `mentorId` / `menteeIds` are written and cleared symmetrically (no orphaned references)
- [ ] `boutResultApplier.ts` does not break existing bout tests: `npx vitest run src/engine/bout/`
- [ ] TypeScript: `npx tsc --noEmit` returns zero errors
