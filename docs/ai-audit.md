# AI Decision-Point Audit

Generated as WS0 of the Advanced AI Integration Megaplan (`~/.devin/plans/plan-2df176218f760468.md`).
Every row was verified against source. Status: **wired** = produces real world-state effects;
**orphaned** = exported but zero engine callers; **log-only** = decided then only logged;
**write-only** = written but never consumed.

## Baseline metrics (WS0, before changes)

Perf baseline (`docs/audit/perf-baseline.json`): S1_single_day p50 4.6ms, S2_weekly p50 276ms,
S3_year p50 3277ms / p99 3410ms. Gate: S3 within 15% on p50/p99.

Post-implementation measurement (same-session A/B, 30 runs each, 2026-09-13): pre-AI base
commit `14b3eaf5` S3 p50 = 3861ms; integrated tree S3 p50 = 4215ms (clean 50-run bench:
4079ms) → **~+9% real AI cost**, under the 15% gate threshold. Note: the committed baseline
is a 5-run sample from 2026-08-09 and is stale relative to current machine state — the
pre-AI commit itself measures +18% over it — so `perf-gate-check` will report a false-positive
regression until the baseline is regenerated (`cp docs/audit/perf-current.json
docs/audit/perf-baseline.json`). Deliberately left for maintainer decision rather than
baking the AI cost in silently.

## Decision points

| Decision point | File | Status | Notes |
|---|---|---|---|
| Weekly NPC strategic loop | `tick/phases/phase01_week_npc_ai.ts` | wired | persona → perception → plan → workers/agents → constraints → `applyNPCDecisionPure` |
| Monthly finance strategy | `npcAI/ticks.ts` `tickMonthlyNPC` | wired | `evaluateFinanceStrategy` → real `buyMyoseki` |
| Perception | `engine/perception.ts`, `npcAI/LeaguePerception.ts` | wired | banded, non-cheating (A7.1) |
| Player surfacing | `advisor/AdvisorService.ts`, `presenters/npcAgentProjections.ts` | wired | IntelligencePanel, NPCAgentFeed |
| NarrativeAgent for **player** heya | `tick/phases/phase06_narrative.ts:103-149` | wired | eventType → `narrativeEventMap` → `BardEngine.resolve` → `logEvent`. Reference pattern for NPC narrative. |
| `BoutAI.chooseTactic` / `chooseTacticForCPU` | `bout/BoutAI.ts` | orphaned | `h2h.determineCPUTactic` has zero engine callers; physics consumes only `playerTactic`/`cpuTacticOverride`; NPC-vs-NPC has no tactics |
| `OpponentModel.observeBoutResult` + `MemoryStore.recordOpponentModel` | `npcAI/OpponentModel.ts`, `npcAI/MemoryStore.ts` | orphaned | `opponentModels` map never populated or consumed |
| `handleNPCCrisis` / `handleNPCMediaEvent` | `npcAI/handlers.ts` | orphaned | no callers; NPCs never resolve crises |
| `MemoryStore.archiveActivePlan` | `npcAI/MemoryStore.ts` | orphaned | plans only archive as `"abandoned"`; `scoreWithMemory` never sees success/partial |
| `TacticalCoordinator.coordinateDecision` | `npcAI/TacticalCoordinator.ts` | orphaned | test-only |
| `decisionHistory` | `OyakataMemory` | write-only | appended weekly, never read by scoring |
| `agentDecisions.{finance,governance,recruitment,rivalry,narrative}` | `npcAI/weekly.ts` | log-only | e.g. recruitment `maxBid` computed then recomputed/ignored by `fillVacanciesForNPCWithBidding` |
| `world.matchmakingOverride` | `systems/governance/PoliticalFavorsService.ts:76` | write-only | serialized, no consumer anywhere — even for the player |
| `heya.activeCrisis` for NPCs | `types/heya.ts:79`, `bard/dramaGenerator.ts` | player-only | `triggerCrisis` guards on `isPlayerOwned`; nothing resolves NPC `activeCrisis`. Reuse this field — do not add parallel state |
| Crisis `impactGenerator`s | `types/crises.ts` | log-only + wrong signature | take `(world)` — no `heyaId`; consequences need real implementation |
| `npcMediaStrategy` archetype tables | `npcMediaStrategy.ts` | wired but primitive | real effects via `handleMediaEvent` (global heat ±5, writes `"Player chose"` onto rulings). `MediaAgent` (richer) is orphaned and emits unhandled `"deflect"` |
| `computeTacticAftermath` | `bout/boutTacticAftermath.ts` | defective | drops `cpuUpdate` for NPC-vs-NPC (`cpuRikishiId` undefined without `playerSide`) — must be refactored per-side |
| `upsertRivalry` | `systems/rivalry/RivalryService.ts` | hazard | mutates `state.pairs` in place — clone before `updateWorldField` |
| `fillVacanciesForNPCWithBidding` call sites | `phase01_week_recruitment.ts:88`, `ticks.ts:199` | duplicated | bid-policy handoff must cover both sites |
| `NPCStrategyService.seededRng` fallback | `NPCStrategyService.ts` | weak | fixed `"npc_strategy"` stream shared across callers/weeks — always pass world-scoped rng |

## Planned integrations

- **WS1** Bout-level AI: per-side `eastTactic`/`westTactic` in `BoutContext`; `chooseTactic` for every
  non-player side in `resolveBout`; per-side physics in `tachiai`/`tickPushBattle`/`tickBeltBattle`/
  `KimariteSelectionEngine`; per-side `computeTacticAftermath` (fixes dropped cpuUpdate).
- **WS2** Learning loops: `npcAI/opponentLearning.ts` (bout-resolution hook, LRU-bounded models),
  `npcAI/planOutcomes.ts` (success/partial/abandoned), `decisionHistory` stall signals in
  `scoreWithMemory`.
- **WS3** Crisis/media autonomy: seeded bounded NPC crisis trigger → `heya.activeCrisis` →
  `handleNPCCrisis` with real impacts; `MediaAgent` + actor-aware `handleMediaEventForHeya`;
  defined `deflect` semantics.
- **WS4** Execution layer: `npcAI/execution.ts` converting `agentDecisions` into `StateImpact`s via
  canonical services; `npcBidPolicies` world field read at both recruitment sites;
  `matchmakingOverride` consumer in schedule generation; per-domain weekly cooldowns on
  `OyakataMemory`.
- **WS5** Strategic depth: `kadoban_survival`, `yusho_defense`, `faction_ascension`,
  `talent_pipeline` plans; staff hire/fire + academy build/invest via canonical services.
- **WS6** Surfacing: plan-shift/crisis/rivalry/bid categories in NPC feed + `NPCDecisionDTO`;
  league-aware advisor recs; banded opponent intel; `eventSurfacing` relevance grading.
- **WS7** Validation: determinism double-run + seeded replay; 15% perf gate on S3_year; 25-yr
  autosim metric diff vs this baseline; full repo gates.

## Invariants

- Seeded RNG only — dedicated labels per bout/side (`"boutAI"`); no `Math.random`/`Date.now`.
- All world mutations via `ImpactBuilder`/`StateImpact`; clone nested maps (see `upsertRivalry`).
- Banded inputs only — perception/league/public `rikishi.history`, never hidden raw values.
- Engine mutations via worker command path; no new reducer-slice world writes.
- NPC crises must never set `world.pendingCrisis` or halt `advanceOneDay`.
- `world.boutTactics` (player-selected) always wins on the player side.

## Post-implementation findings (WS7)

Long-horizon validation (25-yr diagnostic, seed `sim-25yr-diagnostic-v1`) surfaced and fixed
three pre-existing data-integrity defects the AI work had exposed:

- **BanzukePublisher stats wipe**: `publishBanzukeUpdate` wrote `stats: statsUpdate` (an empty
  object for most rikishi) through the shallow `updateRikishi` merge, wholesale-replacing every
  standings rikishi's stats each basho — silently dropping weight/achievements/experience and
  collapsing stats toward ~50. Now merges `statsUpdate` over the existing stats object.
- **NaN propagation**: `TrainingService` ceiling enforcement ran `Math.min(ceiling, undefined)`
  for `aggression` (never assigned in the growth block) and for any key on a wiped stats object;
  `MentorshipService`/`SparringService`/`TsukebitoService`/welfare arithmetic used `?? 50`,
  which does not catch NaN. All now use `finiteOr` (`utils/math.ts`), and the enforcement loop
  heals non-finite values to 50 rather than persisting them.
- **WeightJourney unbounded breakthrough**: `progressKg >= targetKg` stays true forever after
  completion — the +3 power/+2 balance boost and `weight_milestone` event re-fired every week
  for the rest of a career (avg power reached 380 by year 25; the basho stats wipe had been
  masking it). Now one-shot via a `phases.includes("complete")` guard.

NPC discretionary spending (myoseki, facilities, scandal PR, staff, academy) is gated in
`executeAgentDecisions` by a ¥5M operating reserve plus a critical/desperate `runwayBand`
block, so agent spending can no longer drive a heya to zero between weekly finance ticks.
Post-fix diagnostic: 0 engine errors, stat averages 36-41 (all finite, max world stat 97),
insolvency 5-11 heyas/yr — concentrated in the same structurally income-poor stables serviced
by the existing loan/bailout machinery, not AI spending churn.

## Risks

- Per-side tactic RNG draws in the bout hot path → dedicated seed labels; WS1 RED pins double-run
  equality before implementation.
- Balance shift from real NPC tactics/execution → compare WS7 autosim metrics to WS0 baseline;
  tune magnitudes in `constants/engine/bout.ts`, not logic.
- `buildOpponentModel` is O(history) per bout → memoize per `(rikishiId, week)` in
  `transientContext` if S3 regresses >15%.
