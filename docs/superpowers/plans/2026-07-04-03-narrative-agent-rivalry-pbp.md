# Plan 03 — NarrativeAgent Story Feed + Rivalry Context in Bout PbP

## Problem

Two narrative systems produce results that are silently discarded.

**NarrativeAgent wire-up gap:** `spawnNarrativeAgent` in `src/engine/npcAI/weekly.ts` (line 148) returns a `NarrativeAgentResult` with `shouldTriggerEvent`, `eventType`, `narrativeTone`, and `rikishiId`. These fields are packed into `NPCWeeklyDecision.agentDecisions.narrative` but no downstream tick phase reads them to produce a story feed event. The `phase06_narrative.ts` handler works from `world.transientContext.deltas` — it has no path to `NPCWeeklyDecision.agentDecisions.narrative`. The narrative agent fires on championship celebrations, yokozuna promotions, retirements, kinboshi upsets, and media spotlights, but none of these ever become news items the player reads.

**Rivalry PbP gap:** `generateBoutNarrative` in `src/engine/bout/boutNarrative.ts` receives `world` as a parameter (called from `boutResolver.ts:457`). `RivalryService` can retrieve a `RivalryPairState` for any pair in one call. `archive.json` has complete `h2h.*` templates covering first meetings, domination, deadlocks, streaks, and recent encounters. None of these are injected into the bout's opening PbP lines. The rivalry system tracks heat, spite, meeting count, and win/loss records — all of which should be surfaced in the words of the broadcast.

---

## Affected Files

| File | Change |
|------|--------|
| `src/engine/tick/phases/phase06_narrative.ts` | Read `NPCWeeklyDecisions` from world events; emit story feed events from narrative agent results |
| `src/engine/bout/boutNarrative.ts` | Inject `h2h.*` rivalry template into opening PbP after drama block |
| `src/engine/narrative/archive.json` | Verify `h2h.*` token names match what we pass; add any missing streak/opening templates |

---

## Step 1 — Surface NPC Narrative Decisions in phase06_narrative

The NPC AI weekly pipeline logs a `"NPC_DECISION"` event with `{ heyaId, decision: "trigger_event", eventType }` (in `src/engine/npcAI/weekly.ts` lines 291–298), but the player's heya narrative decision does not go through NPC weekly — it goes through the loop decision engine. To close the gap, the simplest path is to have `phase06_narrative.ts` also read from the player heya's `pendingNarrativeTriggers` (a new transient field we write from the NarrativeAgent call site).

**Alternative (simpler):** Move the narrative agent call from `npcAI/weekly.ts` into `phase06_narrative.ts` where its result can be consumed immediately.

**File: `src/engine/tick/phases/phase06_narrative.ts`** — after the existing crisis check:

```typescript
import { spawnNarrativeAgent } from "../../agents/NarrativeAgent";
import type { NarrativeAgentContext } from "../../agents/NarrativeAgent";
import { selectTopRikishi } from "../../../presenters/selectors";
import { NARRATIVE_EVENT_TEMPLATE_PATHS } from "../../narrative/narrativeEventMap";

// --- Narrative Agent: player heya story events ---
const playerHeyaId = world.playerHeyaId;
const playerHeya = playerHeyaId ? world.heyas.get(playerHeyaId) : undefined;
const playerOyakata = playerHeyaId
  ? Array.from(world.oyakata?.values() ?? []).find((o) => o.heyaId === playerHeyaId)
  : undefined;

if (playerHeya && playerOyakata) {
  const topRikishi = selectTopRikishi(world, playerHeyaId, 3);
  const recentAchievements = (world.events ?? [])
    .filter((e) => e.heyaId === playerHeyaId && e.category === "basho")
    .slice(-5)
    .map((e) => e.data?.title ?? "");

  const narrativeCtx: NarrativeAgentContext = {
    oyakata: playerOyakata,
    topRikishi,
    recentAchievements,
    currentBashoPhase: world.cyclePhase,
  };

  const narrativeResult = spawnNarrativeAgent(narrativeCtx);

  if (narrativeResult.shouldTriggerEvent && narrativeResult.eventType) {
    const templatePath = NARRATIVE_EVENT_TEMPLATE_PATHS[narrativeResult.eventType];
    if (templatePath) {
      const rng = rngForWorld(world, "narrative", "agent-event");
      const focalRikishi = narrativeResult.rikishiId
        ? world.rikishi.get(narrativeResult.rikishiId)
        : topRikishi[0];
      const text = BardEngine.resolve(rng, templatePath, {
        heya: playerHeya.name,
        HEYA: playerHeya.name,
        rikishi: focalRikishi?.shikona ?? "",
        RIKISHI: focalRikishi?.shikona ?? "",
        tone: narrativeResult.narrativeTone,
      });
      builder.logEvent(
        "NARRATIVE_STORY_BEAT",
        "narrative",
        {
          heyaId: playerHeyaId,
          rikishiId: narrativeResult.rikishiId,
          title: text.text,
          summary: narrativeResult.reasoning.join(" "),
          eventType: narrativeResult.eventType,
          tone: narrativeResult.narrativeTone,
          importance: "notable",
        },
        { heyaId: playerHeyaId, importance: "notable" }
      );
    }
  }
}
```

---

## Step 2 — Create `narrativeEventMap.ts`

**New file: `src/engine/narrative/narrativeEventMap.ts`** — maps `NarrativeAgentResult.eventType` strings to `archive.json` template paths:

```typescript
export const NARRATIVE_EVENT_TEMPLATE_PATHS: Record<string, string> = {
  championship_celebration: "events.tournament.yusho_celebration",
  yokozuna_promotion:       "events.tournament.yokozuna_promotion",
  retirement_ceremony:      "events.lifecycle.retirement_announcement",
  underdog_victory:         "events.tournament.kinboshi_upset",
  media_spotlight:          "media.spotlight.weekly_feature",
  legacy_milestone:         "events.lifecycle.legacy_milestone",
};
```

Verify each template path exists in `archive.json`. Add any missing paths to `archive.json` using the existing pattern (`title` + `summary` variant pairs, `%HEYA%`/`%RIKISHI%` tokens).

---

## Step 3 — Inject Rivalry Context into Bout Opening PbP

**File: `src/engine/bout/boutNarrative.ts`** — after line 137 (after the drama block, before ring entrance):

```typescript
import { RivalryService } from "../systems/narrative/RivalryService";

// --- Rivalry context injection (opening phase) ---
if (world.rivalriesState) {
  const key = RivalryService.makeRivalryKey(ctx.eastRikishiId, ctx.westRikishiId);
  const rivalriesState = RivalryService.ensureRivalriesState(world);
  const pair = rivalriesState.pairs?.[key];

  if (pair) {
    const rivalryRng = rng.fork?.("rivalry") ?? rng;
    let templatePath: string | null = null;
    const tokens: Record<string, string> = {
      P1: ctx.eastName ?? "",
      P2: ctx.westName ?? "",
      WINS: String(pair.aWins),
      LOSSES: String(pair.bWins),
      TOTAL: String(pair.meetings),
      STREAK: String(Math.abs(pair.aWins - pair.bWins)),
    };

    if (pair.meetings === 0) {
      templatePath = "h2h.first_meeting";
    } else if (pair.meetings >= 5 && Math.abs(pair.aWins - pair.bWins) >= 3) {
      templatePath = "h2h.domination";
      tokens.P1 = pair.aWins > pair.bWins ? (ctx.eastName ?? "") : (ctx.westName ?? "");
      tokens.P2 = pair.aWins > pair.bWins ? (ctx.westName ?? "") : (ctx.eastName ?? "");
    } else if (pair.meetings >= 3 && Math.abs(pair.aWins - pair.bWins) >= 2) {
      templatePath = "h2h.streak";
    } else if (pair.meetings >= 2) {
      templatePath = "h2h.recent";
      tokens.DAY = String(world.currentBasho?.day ?? 1);
      tokens.WINNER = pair.aWins > pair.bWins ? (ctx.eastName ?? "") : (ctx.westName ?? "");
      tokens.LOSER = pair.aWins > pair.bWins ? (ctx.westName ?? "") : (ctx.eastName ?? "");
      tokens.KIMARITE = ""; // last bout kimarite not stored on pair — leave blank or add to RivalryPairState
    }

    if (templatePath) {
      const rivalryLine = BardEngine.resolve(rivalryRng, templatePath, tokens);
      if (rivalryLine?.text) {
        push(rivalryLine.text, "opening");
      }
    }
  }
}
```

> **Note on `rng.fork`:** if `SeededRNG` does not have a `fork` method, use `rngFromSeed` with a deterministic seed derived from the bout ID + "rivalry": `const rivalryRng = rngFromSeed(${ctx.boutId}-rivalry, "bout", "rivalry")`.

---

## Step 4 — Add Win-Streak Lines to Basho PbP

For in-basho win streaks (separate from rivalry H2H), add a streak detector using the `basho.matches` array:

**File: `src/engine/bout/boutNarrative.ts`** — in the same opening block, after rivalry injection:

```typescript
// Basho win-streak check
if (world.currentBasho && world.currentBasho.day > 2) {
  const checkStreak = (rikishiId: string, name: string) => {
    const priorBouts = world.currentBasho!.matches
      .filter((m) => m.day < world.currentBasho!.day && m.result)
      .reverse();
    let streak = 0;
    for (const m of priorBouts) {
      if (m.result?.winnerRikishiId === rikishiId) streak++;
      else break;
    }
    return streak;
  };

  const eastStreak = checkStreak(ctx.eastRikishiId, ctx.eastName ?? "");
  const westStreak = checkStreak(ctx.westRikishiId, ctx.westName ?? "");
  const bigStreak = eastStreak >= 5 ? { name: ctx.eastName, streak: eastStreak }
    : westStreak >= 5 ? { name: ctx.westName, streak: westStreak }
    : null;

  if (bigStreak) {
    const streakRng = rngFromSeed(`${ctx.boutId}-streak`, "bout", "streak");
    const templatePath = bigStreak.streak >= 10 ? "media.streaks.legendary"
      : bigStreak.streak >= 7 ? "media.streaks.hot"
      : "media.streaks.notable";
    const streakLine = BardEngine.resolve(streakRng, templatePath, {
      SHIKONA: bigStreak.name ?? "",
      STREAK: String(bigStreak.streak),
    });
    if (streakLine?.text) {
      push(streakLine.text, "opening");
    }
  }
}
```

---

## Testing Checklist

- [ ] Post-basho week with a yusho winner in player's heya → confirm `NARRATIVE_STORY_BEAT` event logged with `eventType: "championship_celebration"`
- [ ] Story beat appears in the weekly digest / story feed UI
- [ ] Two wrestlers with 5+ meetings, 3+ win gap → rivalry opening PbP line appears in bout
- [ ] First meeting between two wrestlers → "first meeting" line in opening PbP
- [ ] Wrestler on 7+ win streak in basho → streak callout appears in opening PbP
- [ ] Wrestlers with no rivalry state → no error, opening PbP proceeds normally
- [ ] Template path fallback: if `archive.json` template is missing, `BardEngine.resolve` returns `null` gracefully (verify no throw)
- [ ] `npx vitest run` — all tests pass
- [ ] `npx tsc --noEmit` — clean

---

## Estimated Effort

3–4 days. The narrative agent wire-up is ~40 lines in `phase06_narrative.ts` plus the `narrativeEventMap.ts` file and `archive.json` template verification. The rivalry PbP injection is ~50 lines in `boutNarrative.ts`. Main risk: `RivalryService.ensureRivalriesState` may not have a stable `pairs` record shape — verify the key structure matches `world.rivalriesState.heyaRivalryPairs` (noted as a gotcha in CLAUDE.md: use `rivalriesState.heyaRivalryPairs`, not the removed flat field). Also verify `rng.fork` or use `rngFromSeed` as fallback.
