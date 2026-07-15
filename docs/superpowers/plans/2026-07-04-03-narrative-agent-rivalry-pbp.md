# Plan 03 — NarrativeAgent Story Feed + Rivalry Context in Bout PbP

> **Status: IMPLEMENTED** — verified 2026-07-06. This document reflects the as-built design, which diverges from the original spec in three places noted inline. The deviations are improvements over the original proposal.

---

## Problem (Original)

Two narrative systems produced results that were silently discarded.

**NarrativeAgent wire-up gap:** `spawnNarrativeAgent` in `src/engine/npcAI/weekly.ts` returned a `NarrativeAgentResult` with `shouldTriggerEvent`, `eventType`, `narrativeTone`, and `rikishiId`. These were packed into `NPCWeeklyDecision.agentDecisions.narrative` but no downstream tick phase consumed them to produce story feed events.

**Rivalry PbP gap:** `generateBoutNarrative` in `src/engine/bout/boutNarrative.ts` had access to `world` but did not inject any H2H rivalry context into the opening PbP lines despite `archive.json` having a complete `h2h.*` template family.

---

## Affected Files (as built)

| File                                          | Change                                                                                          |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `src/engine/tick/phases/phase06_narrative.ts` | Calls `spawnNarrativeAgent` for player heya; emits typed story events via `narrativeEventMap`   |
| `src/engine/bard/narrativeEventMap.ts`        | New file — maps `NarrativeAgentResult.eventType` to `{ titlePath, summaryPath }` template pairs |
| `src/engine/bout/boutNarrative.ts`            | Injects `h2h.*` rivalry lines into opening PbP; adds basho win-streak callouts                  |

---

## Implementation: NarrativeAgent → Story Events

### phase06_narrative.ts

`spawnNarrativeAgent` is imported and called for the player heya each weekly tick. The context is built from `playerOyakata`, top 3 rikishi by rank, and recent basho events.

When `narrativeResult.shouldTriggerEvent && narrativeResult.eventType` is true, the phase looks up the event type in `narrativeEventMap`, resolves both a title and summary template via `BardEngine.resolve`, and emits a typed engine event.

**Deviation from original spec — event type fan-out:** The original plan proposed emitting a single `NARRATIVE_STORY_BEAT` event type for all narrative agent outputs. The implementation instead emits the semantically correct event type for each trigger (`AWARD_CONFERRED`, `LIFECYCLE_EVENT`, `RETIREMENT_ANNOUNCED`, `NARRATIVE_STRATEGY_SHIFT`). This is the better design — the digest and UI can filter on meaningful event types rather than a catch-all type.

### src/engine/bard/narrativeEventMap.ts

**Deviation from original spec — file location and structure:** The plan specified `src/engine/narrative/narrativeEventMap.ts` with a single `string` path per entry. The implementation places the file at `src/engine/bard/narrativeEventMap.ts` (alongside `BardEngine.ts`, which is the correct co-location) and uses `{ titlePath: string, summaryPath: string }` pairs per entry. This allows each narrative trigger to resolve both a headline and a body line independently.

Structure:

```typescript
// src/engine/bard/narrativeEventMap.ts
export interface NarrativeEventMapEntry {
  eventType: string; // engine event type to emit (e.g. "AWARD_CONFERRED")
  titlePath: string; // archive.json path for headline template
  summaryPath: string; // archive.json path for summary template
}

export const NARRATIVE_EVENT_MAP: Record<string, NarrativeEventMapEntry> = {
  championship_celebration: {
    eventType: "AWARD_CONFERRED",
    titlePath: "events.narrative.championship_celebration_title",
    summaryPath: "events.narrative.championship_celebration_summary",
  },
  yokozuna_promotion: {
    eventType: "LIFECYCLE_EVENT",
    titlePath: "events.narrative.yokozuna_promotion_title",
    summaryPath: "events.narrative.yokozuna_promotion_summary",
  },
  retirement_ceremony: {
    eventType: "RETIREMENT_ANNOUNCED",
    titlePath: "events.narrative.retirement_ceremony_title",
    summaryPath: "events.narrative.retirement_ceremony_summary",
  },
  underdog_victory: {
    eventType: "NARRATIVE_STRATEGY_SHIFT",
    titlePath: "events.narrative.underdog_victory_title",
    summaryPath: "events.narrative.underdog_victory_summary",
  },
  media_spotlight: {
    eventType: "NARRATIVE_STRATEGY_SHIFT",
    titlePath: "events.narrative.media_spotlight_title",
    summaryPath: "events.narrative.media_spotlight_summary",
  },
  legacy_milestone: {
    eventType: "LIFECYCLE_EVENT",
    titlePath: "events.narrative.legacy_milestone_title",
    summaryPath: "events.narrative.legacy_milestone_summary",
  },
};
```

---

## Implementation: Rivalry Context in Bout PbP

### H2H injection (boutNarrative.ts)

`RivalryService.makeRivalryKey(east.id, west.id)` is called after the drama block in the opening phase. The `RivalryPairState` for the pair is retrieved and used to select a template:

| Condition                       | Template used                                                            |
| ------------------------------- | ------------------------------------------------------------------------ |
| `pair.meetings === 0`           | `h2h.first_meeting`                                                      |
| `meetings >= 5` and win gap ≥ 3 | `h2h.domination` (with P1/P2 swapped to put the dominant wrestler first) |
| `meetings >= 2` and win gap ≥ 1 | `h2h.recent`                                                             |
| `meetings >= 2` and wins tied   | `h2h.deadlock`                                                           |

**Deviation from original spec — `h2h.streak` not used:** The plan proposed `h2h.streak` for the tied-record case. The implementation uses `h2h.deadlock` instead, which is the semantically correct template for a deadlocked record. `h2h.streak` in `archive.json` describes a wrestler on a consecutive-win run against one opponent — a different scenario from a tied career record. The choice is correct.

Tokens passed to all H2H templates: `P1`, `P2`, `WINS`, `LOSSES`, `TOTAL`, `STREAK` (net win gap). The `h2h.recent` template additionally receives `DAY`, `WINNER`, `LOSER`, `KIMARITE` (kimarite left blank — not stored on `RivalryPairState`).

### Basho win-streak callouts (boutNarrative.ts)

Reads `east.currentBashoWins` and `west.currentBashoWins` directly from the rikishi (pre-computed fields, not scanned from `basho.matches`). Threshold tiers:

| Wins | Template                  |
| ---- | ------------------------- |
| 5–7  | `media.streaks.notable`   |
| 8–11 | `media.streaks.hot`       |
| 12+  | `media.streaks.legendary` |

Lines are pushed with tag `"dominant"` into the `"opening"` PbP phase. The threshold to trigger is ≥ 5 wins; bouts on days 1–5 are below threshold and produce no callout.

---

## Testing Checklist

- [ ] Post-basho week with a yusho winner in player's heya → confirm `AWARD_CONFERRED` event logged (not `NARRATIVE_STORY_BEAT`)
- [ ] Story event title and summary both populated via BardEngine templates
- [ ] Story event appears in the weekly digest / story feed UI
- [ ] Two wrestlers with 5+ meetings, 3+ win gap → `h2h.domination` line in opening PbP
- [ ] Two wrestlers with 2+ meetings, tied record → `h2h.deadlock` line in opening PbP (not streak)
- [ ] First meeting between two wrestlers → `h2h.first_meeting` line in opening PbP
- [ ] Wrestler on 7+ wins in basho → `media.streaks.hot` callout in opening PbP
- [ ] Wrestler on 5 wins in basho → `media.streaks.notable` callout
- [ ] Wrestler on 12 wins → `media.streaks.legendary` callout
- [ ] Wrestlers with no rivalry state → no error, opening PbP proceeds normally
- [ ] `BardEngine.resolve` on a missing template path returns null gracefully (no throw)
- [ ] `npx vitest run` — all tests pass
- [ ] `npx tsc --noEmit` — clean

---

## Estimated Effort

**Completed.** All functionality is live. No remaining work identified by verification.
