# AI Decision-Point Audit v2

> **STALENESS NOTICE**: point-in-time snapshot retained for historical context.
> Wiring classifications were derived via grep sweeps; re-verify against current
> sources before relying on specific verdicts.

Re-audit of the NPC AI architecture ahead of the advanced-AI workstreams (WS1–WS8). Classifies every AI decision surface as **wired** (produces world effects), **passive** (consumed downstream but not decision-driving), **write-only** (set, never read), **dead** (unreachable), or **duplicate** (two competing paths).

Method: source inspection of `src/engine/npcAI`, `src/engine/agents`, `src/engine/tick/phases`, `src/engine/systems/meta`, plus grep sweeps for each suspected orphan. Two regressions found by this audit are enforced by new tests: `audit/npc-legacy-path.test.ts` and `audit/foreign-limit-consistency.test.ts`.

## Corrections to prior assumptions

The earlier plan draft assumed several gaps that did not survive source inspection:

| Assumed gap                           | Finding                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `oyakata.temperament` write-only      | **Disproved** — consumed by `npcRecruitmentStrategy.ts` (Vindictive spite premium) and `NPCStrategyFramework.ts`.                                                                                                                                                                                                                                                                                                                                                                            |
| Foreign-slot enforcement absent       | **Disproved** — `TalentPoolOffers.offerCandidate` enforces `FOREIGN_RIKISHI_LIMIT_PER_HEYA = 1` via `getForeignCountInHeya` (active roster + signed-pending candidates). The real gaps were policy (§13.2/13.3) and a dead inconsistent helper — now fixed.                                                                                                                                                                                                                                  |
| Mid-basho AI absent                   | **Disproved** — `phase01_basho_bouts` runs NPC oyakata interventions on basho days 5–13, and `chooseNpcSideTactic` already consumes record, rivalry heat, fatigue, opponent model, and rank pressure per bout. WS3 narrowed to day-of kyujo, basho posture, and nakabi re-evaluation.                                                                                                                                                                                                        |
| No roster targeting                   | **Disproved** — `evaluateVacancies` computes trait-derived `targetSize`; recruitment bids already use `perceivedTalentSeed` (fog-of-war, not hidden truth). The gaps are the flat `TARGET_ROSTER_SIZE` headroom in `RecruitmentController.allocateVacancies` and unmapped canon §4 ranges.                                                                                                                                                                                                   |
| `behavior.stress`/`motivation` unused | **Disproved** — consumed narratively. The gap is decisional agency (WS4), not dead fields.                                                                                                                                                                                                                                                                                                                                                                                                   |
| `world.factions` unused               | **Disproved** — passive consumers exist (degeiko multiplier, benefactor selection). The gap is coordination, not orphaning (WS5).                                                                                                                                                                                                                                                                                                                                                            |
| Meta drift unimplemented              | **Corrected** — `EraDriftService.processYearlyEraDrift` computes `meta.tone`/`meta.drift` yearly from `globalKimariteStats` (current-era, reset) vs `allTimeKimariteStats` (cumulative), and drift **is consumed by bout physics** (`tickPushBattle`, `tickBeltBattle`, `boutPhaseLoop`, `KimariteSelectionEngine`). The absent half is _manager-side_: nothing in `npcAI/`/`agents/`/`tick/` ever reads `world.meta`. Canon §§7–11 (interpretation, reaction lag, counter-meta) are absent. |

## Findings resolved in WS0

| Finding                                                                                                                                                                                          | Disposition                                                                                                                                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tickWeekNPC` in `npcAI/ticks.ts` duplicated the canonical weekly path with a divergent, shallower decision loop (no plans, memory consolidation, or agent execution). Only consumer was a test. | **Removed** — `worldCircuit.test.ts` migrated to `phase01_week_npc_ai`; `ticks.applyDecision.test.ts` migrated to `applyNPCDecisionPure`. Guarded by `audit/npc-legacy-path.test.ts`. |
| `applyNPCDecision` in `npcAI/ticks.ts` duplicated `applyNPCDecisionPure` (`tick/phases/npc_ai/training.ts`).                                                                                     | **Removed** — single canonical implementation retained.                                                                                                                               |
| `isAtForeignLimit` hardcoded `>= 2` while canon §13.1 and enforcement both use 1. Dead but wrong — any future caller would over-limit a stable.                                                  | **Fixed** — now uses `FOREIGN_RIKISHI_LIMIT_PER_HEYA`. Stale tests rewritten; `audit/foreign-limit-consistency.test.ts` pins both the constant usage and limit-1 behavior.            |

## Open write-only / absent surfaces — WS1–WS7 resolution

All surfaces flagged below have since been wired. This table is retained as
the closure record (what was absent at audit time → what landed).

| Surface                                                        | Audit status                                     | Resolution                                                                                                                                               |
| -------------------------------------------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `world.meta` (tone/drift) as _manager input_                   | Combat-consumed, never perceived by AI           | **WS1** — `MetaPerception.ts` bands dominant family/trend/injury climate from `meta.history`; folded into `LeaguePerception`                             |
| `oyakata.grudges`                                              | Write-only                                       | **WS5** — `grudgeRivalryKeys` maps grudges onto rivalry pairs; `RivalryAgent` escalates via vendetta flag                                                |
| Canon §3.3 tenure record                                       | Absent                                           | **WS5** — `oyakata.tenure` ledger written at basho end, mergers, rulings (`systems/legacy/tenure.ts`)                                                    |
| Canon §8 reaction lag + §11 counter-meta                       | Absent                                           | **WS2** — `ArchetypeAdaptation.ts`: archetype-scaled lag + confirmation gate + counter-meta/embrace postures driving recovery, scouting, bid family bias |
| Canon §13.2–13.3 foreign policy + sunk-cost                    | Absent                                           | **WS6** — `ForeignSlotPolicy.ts`: dual-citizen exemption, persona bid aggression, `foreignRetentionMultiplier`                                           |
| Rikishi decisional agency                                      | Absent                                           | **WS4** — `rikishiAgency/` requests (rest/mentor/transfer) with archetype resolution and unrest escalation                                               |
| Succession triggers beyond age/designated heir                 | Partial                                          | **WS5** — insolvency/scandal/underperformance triggers + trustee caretaker + decaying `legacyModifier`                                                   |
| `electFactionPostures` orphaned (found in WS7 pass)            | `world.factionPostures` never written            | **WS7** — weekly election in `phase01_week_npc_ai`, change-only `GOVERNANCE_RULING` events                                                               |
| Foreign-slot cap at worldgen/mergers (found in WS7 diagnostic) | `RosterFactory`/`executeMerger` bypassed the cap | **WS6-fix** — slot-aware roster assignment + foreign dispersal on merger                                                                                 |

## Semantic discrepancy — resolved in WS6

`getForeignCountInHeya` (enforcement) and `countsAsForeign` (policy) disagreed
on naturalized rikishi. **Resolution: citizenship-aware counting is canonical**
(§5.1 binds the slot to non-citizens). Enforcement moved onto
`countsAsForeign`; naturalized and dual-citizen rikishi free the slot in both
enforcement and policy paths.

## Integration constraints carried forward

- `advanceDaysFast` skips `phase01_daily_micro` — any required daily logic must be its own `activePhases` entry or live in an always-run phase.
- `phase01_basho_bouts` preserves only fields in `PASSTHROUGH_FIELDS` — new bout-time world fields must be added there explicitly.
- `selectNPCHeyasForWeek` rotates ~⅓ of stables during interim weeks — safety-critical checks cannot live only in the weekly NPC phase.
- Basho-finalization hook is `endBasho → concludeBashoCompetition → recordBashoHistory`.
- All mutations through `ImpactBuilder`/`StateImpact`; seeded RNG per domain; NPCs never set `world.pendingCrisis` or halt `advanceOneDay`.
