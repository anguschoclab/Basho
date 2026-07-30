# Post-Basho Press Narrative Implementation Plan

**Objective:** Enrich post-basho press conference narratives with context-aware lines based on champion persona, injury status, career stage, weight journey, master intervention, career highlights, fighting name timing, and cohort achievements.

**Principle:** Tests built BEFORE implementation. Each phase begins with failing tests that define expected behavior. Implementation proceeds only after tests pass.

---

## Code Review Validation (Confirmed)

- `PostBashoPressService.ts` at `@/src/engine/systems/narrative/PostBashoPressService.ts:1-342` uses `BardEngine.has()` + `BardEngine.resolve()` with RNG-gated sections. New generator methods follow the same `generateXxxLines(rikishi, rng, bashoName, year): PbpLine[]` pattern.
- `post_basho_press.json` at `@/src/engine/bard/domains/post_basho_press.json:1-131` has sections: `champion`, `prize_winner`, `ydc_bid`, `ozeki_stake`, `ozeki_comeback_yusho`, `ozeki_comeback_reflection`, `coach_criticism`, `lower_division`. New sub-sections go under `champion` and `prize_winner`.
- `rikishi.ts` at `@/src/engine/types/rikishi.ts:240-277` has optional fields pattern (e.g., `recentlyReturnedFromInjury`, `sanyakuPromotionThisBasho`, `declinePhase`). New fields follow same pattern.
- `BardEngine.ts` `ALL_DOMAIN_NAMES` at line 61-67 includes `post_basho_press` — no new domain needed.
- Tests use `mockRikishi()`, `makeMockWorld()` from `@/src/tests/unit/engine/utils.ts:1-324`. Press tests at `@/src/tests/unit/engine/narrative/postBashoPress.test.ts:1-406` check `lines` array for text content, id suffixes, and tag presence.
- `PostBashoPressService.generatePressConference` is the entry point (line 37-98). It calls sub-generators: `generateChampionLines`, `generatePrizeWinnerLines`, `generateYokozunaBidLines`, `generateOzekiStakeLines`, `generateLowerDivisionChampionLines`.

---

## Phase 1 — New State Fields (rikishi.ts)

### Step 1.1: Add new optional fields to Rikishi interface

Add after line 276 (`consecutiveStrongSekiwake?: number;`) in `@/src/engine/types/rikishi.ts`:

```typescript
  // ── Post-Basho Press Narrative Fields ──────────────────────────

  // Weight gain journey tracking (B3)
  weightJourney?: {
    targetKg: number;
    progressKg: number;
    stalled: boolean;
    phases: string[];
  };

  // Oyakata mid-basho intervention (B2) — cleared at basho start
  interventionUsedThisBasho?: boolean;

  // Freeze-up flag (B12 related) — set when rikishi freezes during bout
  frozeUp?: boolean;

  // Oversleeping incident (B1) — clears after 6 basho cycles
  oversleptBasho?: { bashoName: string; day: number; year: number };

  // Career highlight memories (B7)
  careerHighlights?: Array<{
    type: "debut_win" | "seven_seven_win" | "upset_over_elite" | "yusho" | "playoff_win" | "kinboshi" | "rivalry_defining";
    basho: string;
    opponent?: import("./common").Id;
    description: string;
  }>;

  // Post-retirement career path (B8) — set at retirement
  postRetirementPath?: "oyakata" | "media_pundit" | "sumo_school_coach" | "leave_sumo_world";

  // Recruitment cohort tracking (B10)
  recruitmentCohortId?: string;

  // Fighting name conferred early (B11) — set when shikona given before sekitori rank
  shikonaConferredEarly?: boolean;

  // Pre-sumo background (B4)
  preSumoBackground?: "gymnast" | "judoka" | "baseball" | "soccer" | "wrestler" | "track" | "none";

  // Visual quirk (B5)
  quirks?: {
    poorEyesight?: boolean;
    glasses?: { style: string; acquiredBasho: string };
  };
```

---

## Phase 2 — Post-Basho Press JSON Templates (post_basho_press.json)

### Step 2.1: Add new champion sub-sections

Add inside `champion` object in `@/src/engine/bard/domains/post_basho_press.json`:

```json
    "weight_journey": [
      "'My weight just wasn't increasing as planned — I struggled to bulk up for the longest time,' %SHIKONA% admits.",
      "'There were months where the scale wouldn't move no matter what I ate,' %SHIKONA% reflects on his bulk journey.",
      "%SHIKONA% credits his breakthrough to finally filling out his frame: 'The weight came, and with it, the power.'"
    ],
    "master_intervention": [
      "'My master intervened before match 7 — that conversation changed everything,' %SHIKONA% reveals.",
      "%SHIKONA% credits his oyakata's mid-basho intervention: 'He saw something in me that I'd lost sight of.'",
      "'The master pulled me aside and reset my mindset — I owe this title to that moment,' %SHIKONA% says gratefully."
    ],
    "early_struggle": [
      "'There were certainly times when I couldn't really see the path ahead,' %SHIKONA% admits of his long road to the title.",
      "%SHIKONA% reflects on the journey: 'Five tournaments of struggle before this moment — every one taught me something.'",
      "'I doubted myself many times over the years — but I kept showing up,' %SHIKONA% says with quiet emotion."
    ],
    "career_highlight_reflection": [
      "%SHIKONA% reflects on a favorite memory: 'That 7-7 bout win was the moment I knew I could do this.'",
      "'My favorite sumo memory? Beating %OPPONENT% on senshuraku — that changed everything,' %SHIKONA% recalls.",
      "%SHIKONA% smiles at the memory: 'The day I got my first kinboshi — that's when I started believing a title was possible.'"
    ]
```

### Step 2.2: Add new prize_winner sub-sections

Add inside `prize_winner` object:

```json
    "fighting_name_vindication": [
      "'To have it conferred upon me while still in a cotton sash — and now to win this prize,' %SHIKONA% says with pride.",
      "%SHIKONA% reflects on his early shikona: 'They gave me this name before I was salaried. Today I proved I deserved it.'",
      "'The fighting name was a burden when I was young — now it's a badge of honor,' %SHIKONA% declares."
    ],
    "cohort_pride": [
      "'All four lads in this photo went on to make salaried level — I'm just the first to win a prize,' %SHIKONA% says proudly.",
      "%SHIKONA% credits his recruitment class: 'We pushed each other from day one. This prize belongs to all of us.'",
      "'My cohort — every one of them made sekitori. That kind of competition forges you,' %SHIKONA% reflects."
    ]
```

---

## Phase 3 — PostBashoPressService Generator Methods

### Step 3.1: Extend generateChampionLines

Add after the `growth` section (after line 152) in `@/src/engine/systems/narrative/PostBashoPressService.ts`:

```typescript
    // Weight journey — if champion has significant weight gain progress
    if (champion.weightJourney && champion.weightJourney.progressKg >= 15) {
      const wjLine = BardEngine.resolve(rng, "post_basho_press.champion.weight_journey", {
        SHIKONA: champion.shikona,
        rikishiId: champion.id,
      });
      if (wjLine.text) {
        lines.push({ text: wjLine.text, id: `${baseId}-weight-journey`, phase: "post_bout", tags: ["post_basho_press"] });
      }
    }

    // Master intervention — if oyakata intervened during this basho
    if (champion.interventionUsedThisBasho) {
      const intLine = BardEngine.resolve(rng, "post_basho_press.champion.master_intervention", {
        SHIKONA: champion.shikona,
        rikishiId: champion.id,
      });
      if (intLine.text) {
        lines.push({ text: intLine.text, id: `${baseId}-intervention`, phase: "post_bout", tags: ["post_basho_press"] });
      }
    }

    // Early struggle — for champions with 5+ basho before first yusho
    const totalBashoCount = champion.careerHistory?.length ?? 0;
    const yushoCount = champion.careerHistory?.filter(h => h.isYusho).length ?? 0;
    if (totalBashoCount >= 5 && yushoCount <= 1) {
      const struggleLine = BardEngine.resolve(rng, "post_basho_press.champion.early_struggle", {
        SHIKONA: champion.shikona,
        rikishiId: champion.id,
      });
      if (struggleLine.text) {
        lines.push({ text: struggleLine.text, id: `${baseId}-struggle`, phase: "post_bout", tags: ["post_basho_press"] });
      }
    }

    // Career highlight reflection — if champion has recorded career highlights
    if (champion.careerHighlights && champion.careerHighlights.length > 0) {
      const highlight = champion.careerHighlights[champion.careerHighlights.length - 1];
      const highlightLine = BardEngine.resolve(rng, "post_basho_press.champion.career_highlight_reflection", {
        SHIKONA: champion.shikona,
        OPPONENT: highlight.opponent ?? "his rival",
        rikishiId: champion.id,
      });
      if (highlightLine.text) {
        lines.push({ text: highlightLine.text, id: `${baseId}-highlight`, phase: "post_bout", tags: ["post_basho_press"] });
      }
    }
```

### Step 3.2: Extend generatePrizeWinnerLines

Add after the `fought_match_not_situation` section (after line 227):

```typescript
    // Fighting name vindication — if shikona was conferred early (before sekitori)
    if (winner.shikonaConferredEarly) {
      const fnLine = BardEngine.resolve(rng, "post_basho_press.prize_winner.fighting_name_vindication", {
        SHIKONA: winner.shikona,
        rikishiId: winner.id,
      });
      if (fnLine.text) {
        lines.push({ text: fnLine.text, id: `${baseId}-fighting-name`, phase: "post_bout", tags: ["post_basho_press"] });
      }
    }

    // Cohort pride — if all cohort members reached sekitori (check recruitmentCohortId)
    if (winner.recruitmentCohortId) {
      // Note: full cohort check requires world access; simplified — if field is set, generate
      const cohortLine = BardEngine.resolve(rng, "post_basho_press.prize_winner.cohort_pride", {
        SHIKONA: winner.shikona,
        rikishiId: winner.id,
      });
      if (cohortLine.text) {
        lines.push({ text: cohortLine.text, id: `${baseId}-cohort`, phase: "post_bout", tags: ["post_basho_press"] });
      }
    }
```

---

## Phase 4 — Tests (Test-First)

### Step 4.1: Write failing tests for new champion press lines

Create `@/src/tests/unit/engine/narrative/newPressSections.test.ts`:

```typescript
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */
import { describe, it, expect } from "vitest";
import { PostBashoPressService } from "@/engine/systems/narrative/PostBashoPressService";
import { makeMockWorld, mockRikishi } from "../utils";

describe("PostBashoPressService — New Champion Sections", () => {
  it("generates weight_journey lines when champion has progressKg >= 15", () => {
    const champion = mockRikishi("wj-champ", {
      shikona: "Bulk Champ",
      rank: "ozeki",
      division: "makuuchi",
      currentBashoWins: 14,
      currentBashoLosses: 1,
      heyaId: "heya-1",
      careerHistory: [],
      weightJourney: { targetKg: 160, progressKg: 18, stalled: false, phases: ["bulking"] },
    } as any);

    const world = makeMockWorld({ rikishi: new Map([["wj-champ", champion]]), year: 2025 });
    const lines = PostBashoPressService.generatePressConference(world, {
      yushoId: "wj-champ", junYushoIds: [], bashoName: "hatsu", year: 2025,
    });

    const hasWeightJourney = lines.some((l) => l.text.includes("Bulk Champ") && l.id.includes("-weight-journey"));
    expect(hasWeightJourney).toBe(true);
    expect(lines.every((l) => !l.text.includes("[MISSING:"))).toBe(true);
  });

  it("does NOT generate weight_journey lines when progressKg < 15", () => {
    const champion = mockRikishi("wj-champ2", {
      shikona: "Slim Champ",
      rank: "ozeki",
      division: "makuuchi",
      currentBashoWins: 14,
      currentBashoLosses: 1,
      heyaId: "heya-1",
      careerHistory: [],
      weightJourney: { targetKg: 160, progressKg: 5, stalled: false, phases: ["bulking"] },
    } as any);

    const world = makeMockWorld({ rikishi: new Map([["wj-champ2", champion]]), year: 2025 });
    const lines = PostBashoPressService.generatePressConference(world, {
      yushoId: "wj-champ2", junYushoIds: [], bashoName: "hatsu", year: 2025,
    });

    const hasWeightJourney = lines.some((l) => l.id.includes("-weight-journey"));
    expect(hasWeightJourney).toBe(false);
  });

  it("generates master_intervention lines when interventionUsedThisBasho is true", () => {
    const champion = mockRikishi("int-champ", {
      shikona: "Saved Champ",
      rank: "ozeki",
      division: "makuuchi",
      currentBashoWins: 13,
      currentBashoLosses: 2,
      heyaId: "heya-1",
      careerHistory: [],
      interventionUsedThisBasho: true,
    } as any);

    const world = makeMockWorld({ rikishi: new Map([["int-champ", champion]]), year: 2025 });
    const lines = PostBashoPressService.generatePressConference(world, {
      yushoId: "int-champ", junYushoIds: [], bashoName: "nagoya", year: 2025,
    });

    const hasIntervention = lines.some((l) => l.text.includes("Saved Champ") && l.id.includes("-intervention"));
    expect(hasIntervention).toBe(true);
    expect(lines.every((l) => !l.text.includes("[MISSING:"))).toBe(true);
  });

  it("generates early_struggle lines for champion with 5+ basho and <=1 yusho", () => {
    const careerHistory = Array.from({ length: 6 }, () => ({ division: "makuuchi", isYusho: false } as any));
    const champion = mockRikishi("strug-champ", {
      shikona: "Long Road",
      rank: "maegashira",
      division: "makuuchi",
      currentBashoWins: 14,
      currentBashoLosses: 1,
      heyaId: "heya-1",
      careerHistory,
    });

    const world = makeMockWorld({ rikishi: new Map([["strug-champ", champion]]), year: 2025 });
    const lines = PostBashoPressService.generatePressConference(world, {
      yushoId: "strug-champ", junYushoIds: [], bashoName: "aki", year: 2025,
    });

    const hasStruggle = lines.some((l) => l.text.includes("Long Road") && l.id.includes("-struggle"));
    expect(hasStruggle).toBe(true);
    expect(lines.every((l) => !l.text.includes("[MISSING:"))).toBe(true);
  });

  it("generates career_highlight_reflection lines when careerHighlights is non-empty", () => {
    const champion = mockRikishi("hl-champ", {
      shikona: "Memory Champ",
      rank: "ozeki",
      division: "makuuchi",
      currentBashoWins: 14,
      currentBashoLosses: 1,
      heyaId: "heya-1",
      careerHistory: [],
      careerHighlights: [{
        type: "seven_seven_win",
        basho: "hatsu",
        opponent: "rival-1",
        description: "Won 7-7 bout on senshuraku",
      }],
    } as any);

    const world = makeMockWorld({ rikishi: new Map([["hl-champ", champion]]), year: 2025 });
    const lines = PostBashoPressService.generatePressConference(world, {
      yushoId: "hl-champ", junYushoIds: [], bashoName: "hatsu", year: 2025,
    });

    const hasHighlight = lines.some((l) => l.text.includes("Memory Champ") && l.id.includes("-highlight"));
    expect(hasHighlight).toBe(true);
    expect(lines.every((l) => !l.text.includes("[MISSING:"))).toBe(true);
  });
});

describe("PostBashoPressService — New Prize Winner Sections", () => {
  it("generates fighting_name_vindication when shikonaConferredEarly is true", () => {
    const champion = mockRikishi("fn-champ", {
      shikona: "Named Early",
      rank: "ozeki",
      division: "makuuchi",
      currentBashoWins: 14,
      currentBashoLosses: 1,
      heyaId: "heya-1",
      careerHistory: [],
    });
    const prizeWinner = mockRikishi("fn-winner", {
      shikona: "Early Name",
      rank: "maegashira",
      division: "makuuchi",
      currentBashoWins: 11,
      currentBashoLosses: 4,
      heyaId: "heya-2",
      shikonaConferredEarly: true,
    } as any);

    const world = makeMockWorld({
      rikishi: new Map([["fn-champ", champion], ["fn-winner", prizeWinner]]),
      year: 2025,
    });
    const lines = PostBashoPressService.generatePressConference(world, {
      yushoId: "fn-champ",
      junYushoIds: [],
      ginoSho: "fn-winner",
      bashoName: "hatsu",
      year: 2025,
    });

    const hasFightingName = lines.some((l) => l.text.includes("Early Name") && l.id.includes("-fighting-name"));
    expect(hasFightingName).toBe(true);
    expect(lines.every((l) => !l.text.includes("[MISSING:"))).toBe(true);
  });

  it("generates cohort_pride when recruitmentCohortId is set", () => {
    const champion = mockRikishi("co-champ", {
      shikona: "Cohort Champ",
      rank: "ozeki",
      division: "makuuchi",
      currentBashoWins: 14,
      currentBashoLosses: 1,
      heyaId: "heya-1",
      careerHistory: [],
    });
    const prizeWinner = mockRikishi("co-winner", {
      shikona: "Cohort Lad",
      rank: "maegashira",
      division: "makuuchi",
      currentBashoWins: 10,
      currentBashoLosses: 5,
      heyaId: "heya-2",
      recruitmentCohortId: "2018-heya-2",
    } as any);

    const world = makeMockWorld({
      rikishi: new Map([["co-champ", champion], ["co-winner", prizeWinner]]),
      year: 2025,
    });
    const lines = PostBashoPressService.generatePressConference(world, {
      yushoId: "co-champ",
      junYushoIds: [],
      kantosho: "co-winner",
      bashoName: "nagoya",
      year: 2025,
    });

    const hasCohort = lines.some((l) => l.text.includes("Cohort Lad") && l.id.includes("-cohort"));
    expect(hasCohort).toBe(true);
    expect(lines.every((l) => !l.text.includes("[MISSING:"))).toBe(true);
  });
});
```

### Step 4.2: Run tests to confirm they fail (templates don't exist yet)

```bash
bun test src/tests/unit/engine/narrative/newPressSections.test.ts
```

### Step 4.3: After implementing templates + service methods, re-run to confirm pass

```bash
bun test src/tests/unit/engine/narrative/newPressSections.test.ts
bun test src/tests/unit/engine/narrative/postBashoPress.test.ts
```

---

## Phase 5 — Verification

### Full Test Suite

```bash
# Run all press tests
bun test src/tests/unit/engine/narrative/postBashoPress.test.ts
bun test src/tests/unit/engine/narrative/newPressSections.test.ts

# Type check
bun run type-check

# Lint check
bun run lint
```

### Regression Check

- Existing `postBashoPress.test.ts` tests must still pass (no changes to existing generator methods)
- New fields are all optional — no breaking changes to existing rikishi creation
- New JSON templates are additive — existing templates unchanged

---

## Implementation Order

1. **Add state fields** to `rikishi.ts` (Phase 1)
2. **Add JSON templates** to `post_basho_press.json` (Phase 2)
3. **Write failing tests** `newPressSections.test.ts` (Phase 4)
4. **Add service methods** to `PostBashoPressService.ts` (Phase 3)
5. **Run tests** — all should pass (Phase 5)
6. **Type check + lint** (Phase 5)

---

## Files to Modify

| File | Change |
|------|--------|
| `@/src/engine/types/rikishi.ts` | Add 9 new optional fields after line 276 |
| `@/src/engine/bard/domains/post_basho_press.json` | Add 6 new template arrays (4 champion, 2 prize_winner) |
| `@/src/engine/systems/narrative/PostBashoPressService.ts` | Extend `generateChampionLines` (+4 sections) and `generatePrizeWinnerLines` (+2 sections) |
| `@/src/tests/unit/engine/narrative/newPressSections.test.ts` | New test file with 7 test cases |
