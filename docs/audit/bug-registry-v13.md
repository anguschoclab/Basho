# Bug Registry v13

Findings from the v13 workstream audit. Each bug carries severity + disposition. V13-B01/B02 were pre-seeded by the plan and verified against live code.

## Workstream results

| WS | Surface | Result |
|----|---------|--------|
| WS-A | Command surface: `COMMAND_HANDLERS` (engine.worker.ts:24) vs `sendCommand` call sites | ✅ Clean — all handlers composed from domain command modules; `commandSurfaceCoverage` meta gate enforces parity (green in baseline suite) |
| WS-B | `uiWorldRevision` bump coverage | ✅ Clean — every world-mutating bashoSlice case bumps `uiWorldRevision`; `useWorkerSync` propagates via `LOAD_WORLD` (bashoSlice.ts:23–168, gameReducer.ts:35) |
| WS-C | Determinism scan (`Math.random`/`Date.now` in engine) | ✅ Clean — comment hits only; `mathRandomScan` + `rngDeterminism` meta gates green |
| WS-D | Cast census | ✅ `as any`: 0 in production. `as unknown as`: 19 sites (v12: 14; +5 from post-v12 avatar/search commits — all data-boundary casts, acceptable). 3 removed by this cycle → 16 |
| WS-E | Orphan delta | ✅ 108 unreferenced exports — identical to v11/v12; no new orphans introduced by main |
| WS-F | `scripts/purity-lint.sh` | ✅ "No phase purity violations found" |
| WS-G | UI-honesty on touched components | ✅ a11y attributes mirror real visual state; `EmptyState` honest; "Title Streak" displays real field — **honest only after V13-B01 fix** (currently shows inflated counts) |
| WS-H | Perf classification | → V13-B02 |
| WS-I | Persistence surface | ✅ `consecutiveYusho` already on `Rikishi` (rikishi.ts:159), seeded in both factories; `RikishiCareerDTO.consecutiveYusho` added by #1125 is a presenter projection — no save-shape change. Zero-compat directive noted, none needed |
| WS-J | Doc drift | CLAUDE.md accurate post-v12 refresh; only "v12 consolidation" label → v13. Plan-stale paths (`src/test/megaplan/` etc.) confirmed absent |
| WS-K | e2e soak skip on PRs | ✅ Resolved — `e2e.yml:38` `if: schedule \|\| workflow_dispatch`, by design |
| WS-L | Meta-gate inventory | ✅ `noSubprocessInUnitTests`, `testTimingsBudget`, `factoryDiscipline`, `testTimeoutBudget`, `weakAssertionAudit` (meta/) + `functionLengthBudget` (audit/, ≤150 LOC ratchet) — all green at baseline |

## Bugs

### V13-B01 — `consecutiveYusho` never resets (severity: HIGH, data integrity)

**Evidence:** Incremented at `TournamentSimulator.ts:247` (persistBashoState winner block) — the only write site in `src/engine`. Zero reset sites. Consumed by `records.ts:184` (record book entries) and #1125's new "Title Streak" UI.

**Impact:** Every yusho a rikishi wins increments the streak; it never decrements on a non-winning basho. A rikishi with 5 career yusho spread across 10 years displays "consecutive: 5". Non-participants and kyujo rikishi also keep stale streaks.

**Fix spec (verified):** in `persistBashoState`, after the winner `+1` write, sweep `nextRikishiMap` (NOT `standings` — covers kyujo/non-participants too): for `id !== yushoWinnerId && r.consecutiveYusho` → set `{...r, consecutiveYusho: 0}`. Truthy guard keeps it O(affected).

**Test-first:** T1 `consecutiveYusho.test.ts` — RED confirmed (reset never happens).

**Disposition:** FIXED this cycle (Phase 4.3).

### V13-B02 — perf-gate red on all 15 PRs (severity: MEDIUM, CI signal integrity)

**Evidence:** `S3_year` p50 1339.1→~1902ms (+42%) on all PRs including doc-only #1127/#1133. Committed baseline is 2026-10-08, predating avatar commits. Local clean-main measurement: S3 p50=1464.3ms = **+9.3% vs baseline, under the 15% threshold**; p99 below baseline.

**Root cause:** stale committed baseline + CI runner drift — NOT an engine regression (a real +42% would reproduce locally). Circular-failure mechanism: `perf-gate.yml` re-seeds baseline on main only `if: success()` → stale baseline makes every run fail → baseline never refreshes.

**Disposition:** FIXED this cycle — baseline-update step changed to `if: always()` on main/develop so the baseline rolls forward each main push (re-seed stays CI's job on main; PRs keep the 15% gate vs a fresh baseline). No T5 needed (no code regression to pin).

### V13-B03 — `selectBloodlineRegistry` result unreferenced (severity: LOW, dead code note)

**Evidence:** #1134's .jules journal + inspection: zero consumers of `selectBloodlineRegistry` output (selector exists for a planned bloodline-traits UI surface).

**Disposition:** NOTED — not a bug; selector remains a valid projection for future UI. Orphan-audit counts it among the standing 108; no action.

## Non-findings checked and cleared

- #1123 vs #1128: byte-identical payloads (same blob hashes) — dedupe handled by landing once, not a bug.
- #1130 golden snapshot: PR-supplied `.snap` is untrusted per convention — regenerated locally (documented drift), not a bug.
- #1135's `RikishiProfileBody` 153-LOC over-budget: exists only on the PR branch's churn, not on main — excluded with the churn, not a bug on main.

---

# §D — v13.1 second-pass findings (parallel deep-read, landed on top of v13)

A parallel local session ran an independent module-by-module read of `src/**`
(plan `plan-bffd4f75e88d2ec0.md`) and produced a fix-set the first-pass audit
did not cover. Reconciled onto post-v13 `main` (`7604c634`) in the v13.1 commit.
All items CONFIRMED by trace through the production path unless noted.

## D-A · Kōenkai map-key mismatch (one defect, 5 sites) — FIXED

`world.sponsorPool.koenkais` is keyed by `koenkai.koenkaiId` (`KN_*`,
WorldFactory); five sites read the wrong key:

| Site | Wrong key | Consequence |
|---|---|---|
| `systems/economy/sponsorshipMutations.ts` recruitSponsor | `koenkais.get(heyaId)` | charged funds then silently failed — money loss, no sponsor |
| `engine/loans.ts`, `engine/economics.ts` | `koenkais.get("koenkai_"+id)` | benefactor bailout dead — insolvency always fell to scandal |
| `npcAI/execution.ts` | `koenkais.get(heya.id)` | emergency sponsor drive ignored kōenkai size — always ¥250k floor |
| `components/dashboard/SponsorRecruitmentWidget.tsx` | `koenkais.get(playerHeyaId)` | dedup dead — recruited sponsors re-rendered as recruitable |

## D-B · `ImpactBuilder.merge` snapshot clobber (systemic, 5 sites) — FIXED

`builder.merge` did last-wins `Object.assign` on whole-object snapshots
computed from the same base world. Sites: `phase01_week_npc_ai.ts`
(governanceLog/mediaState/npcBidPolicies — NPC media rulings re-resolved
weekly, `deflect` drained reputation weekly, all-but-last-heya bid policies
wiped), `npcAI/execution.ts` + `weekly/agents.ts` (rivalriesState posture
deltas, unconsumed pendingExhibitions), `phase01_week_governance.ts` +
`myosekiMarket.ts` (market tick snapshot reverted NPC purchases while funds
stayed debited — funds destroyed, no asset received; sanctioned/probation
headlines clobbered). Fix: world-field `overlay` + `mergeAbsorb` pattern —
each merged impact's world fields fold back into the overlay so the next
producer's read-modify-write composes on top.

## D-C · Basho-phase drops — FIXED

`phase01_basho_bouts.ts` PASSTHROUGH_FIELDS dropped oyakata entity updates
(opponent learning) and awardLog appends (kinboshi ledger) every basho day;
oyakata intervention impact merged but never resolved into currentWorld —
stale entity re-export reverted `frozeUp:false`/`motivation:+5` while the
`GOVERNANCE_RULING` event still logged (lying event).
`OyakataIntervention.ts` `interventionUsedThisBasho` never reset — once per
career, not once per basho. Reset added at `banzuke/publish/newRanks.ts`
beside `currentBashoWins` (pinned by the banzuke golden-master drift).

## D-D · In-place mutations in "pure" phases — FIXED

`records.ts updateLeaderboard` mutated shared `RecordEntry` objects (array
copied, entries aliased) — leaked into input world past `pipelineRunner`
shallow rollback. `HistoryService.updateAllTimeRecords` pushed into
`world.records.allTime.*` pre-impact + admitted zero-value entries.
`phase06_yearly_boundary.ts` + `boundHistoryArrays.ts` governanceLog/
encouragementLog bounds computed but never written — unbounded growth.
`tickDaily.ts` halted ticks consumed calendar days without advancing the
weekly counter — a run of halted days starved the weekly tick forever.

## D-E · Data/display defects — FIXED

- `NarrativeService` + `rikishi/transformers/stats.ts`: descriptor clamps to
  [0,1] but callers pass 0-100 → every rikishi ≥1 rendered top band.
- `crisisRegistry.ts`: wrote `injuryStatus.type:"illness"`/`location:"internal"`
  — not in `InjuryType`/`InjuryBodyArea` unions → labels resolved undefined.
- `NakabiService`: `leaderName` searched only ≤5-item notablePerformers —
  non-notable leaders rendered "Unknown leads at 7-1" (now `leaderShikona`
  carried on `NakabiSummary`; projection resolves avatar/shikona).
- `MediaEventService`: player `handleMediaEvent` applied global sweeps —
  "apologize" cooled every rikishi, "deny" pressured every heya; now scoped
  to the responding heya's roster/pressure, matching the NPC variant.
- `TalentPool*` sponsor dual representation: `koenkai.members` vs
  `sponsor.relationships` diverged — mirrored heya-targeted relationships
  into `koenkai.members` at the NPC recruitment write path
  (`npcSponsorStrategyHelpers.ts`) so FinanceCalculator/churn/UI dedup see
  NPC-recruited members.

## D-F · Presenter honesty defects — FIXED

- `sponsorProjection.ts`: `koenkaiIncome` showed full gross; engine credits
  `KOENKAI_INCOME_SPLIT.heyaPortion` (0.7) — was overstated ~43%.
- `medicalProjection.ts`: fabricated `momentum:"stable"` for all;
  `stableMediaHeatBand`/`rivalryPressureBand` hardcoded "neutral" — routed
  through canonical `getCachedPerception`; bespoke welfare/morale/roster
  re-banding aligned to canonical thresholds.
- `medicalProjection.ts` + `facilityProjections.ts`: `getFacilityLevelLabel`
  rendered `rikishi.stats.power.*` prose as a facility badge — wrong domain.
- `TrainingWidget.tsx`: fill `min(100, value*60)%` vs label `(value*100)%` —
  punishing showed "150%" beside a 90% bar.
- `digestProjections.ts`: raw `RivalryTone` enum in copy — "Intense
  bad_blood building up".
- `historyProjections.ts projectHistoryAggregate`: read non-existent
  `playerPrize`/`playerResults`; fully dead — file deleted along with dead
  projections `scoutingProjections.ts`, `stableProjections.ts` and the
  `projectLoanStatus` re-export (unrendered UI types removed).

## D-G · Keyboard-accessibility gaps — FIXED

`onClick` without role/tabIndex/onKeyDown on: `perceptionComponents.tsx`,
`MyStableTab.tsx`, `RecruitingTabSections.tsx`, `StablePageTabs.tsx`,
`BoutCard.tsx`, `HeyaPreviewSections.tsx` — activationKeyHandler convention.

## D-H · §C notes resolved — FIXED

- `AdvisorService.ts` full-log `[...log].reverse().find()` → `scanRecentEvents`.
- `keshoEffects.tsx` `Math.random()` fringe jitter → deterministic per-tassel
  hash (flicker + determinism audit hygiene).
- `MediaPreBashoService` headline slice 50 → canonical `MAX_HEADLINES=250`.
- `MOCHIKYUKIN_POINTS_KACHI_KOSHI_PER_NET_WIN` misnamed vs wins-above-8
  semantics → renamed `MOCHIKYUKIN_POINTS_PER_WIN_ABOVE_EIGHT`.
- `phase00_preflight.ts` lying comment + inconsistent PHASE_TRANSITION logging.
- `perceivedTalent.ts` stale "NOT wired" comment.
- `getSeasonFromBasho` mislabeled 3/6 basho seasons vs `calendar.ts` canon.
- `BloodlineService` surname match compared last token → first token.
- `YouthAcademyService` budget never debited + `toLocaleString` in logged
  event + academy events mis-categorized as `NARRATIVE_CRISIS_TRIGGERED`.
- `InfrastructureService` `completionBasho:"TBD"` rendered in UI.
- `MediaBoutService` bout headlines logged wrong category
  (`BOUT_RESOLVED`/`training`/`meta_shift`).
- `ExhibitionBashoService` "rivalry seeding"/"minor injury" flavor events
  misdescribed effects.
- `HealthActions.treatInjury` left `injuryStatus`/`currentInjury`/`isKyujo`/
  `medicalCertificate` stale until weekly tick.

## D-I · Reconciliation-time discoveries on post-v13 main — FIXED

- `physicsFixes.test.ts` referenced `.state` on the `CombatPhase` union —
  `type-check` was red on `main` (`7604c634`); helper narrowed to the
  `push_battle` variant.
- `scripts/report-test-timings.ts` emitted platform-native path separators
  → committed baseline unreadable cross-platform (`relative()` emits `\` on
  Windows); normalized to `/` — same defect class as v13-B03.
- `boutPhaseLoop.ts::runPhaseLoop` measured 151 LOC — one over the
  functionLengthBudget ratchet on `main`; per-tick momentum/fatigue
  bookkeeping extracted to `trackTickMomentumAndFatigue`.
- `commandSurfaceCoverage.test.ts` re-scanned all files per command type
  (O(types × files) I/O — 30 s+ timeout on Windows) → single-pass
  `dispatchSiteIndex` (658 ms).
- `handleMediaEvent` test mocks lacked `heyas`/`playerHeyaId` after the
  scope fix — tests updated to assert the scoped contract.
- `selectRecentEvents` gained the `recoveries` bucket (recovery/treated
  injury events) — selector shape test updated.
- NakabiHighlightCard test fixtures predated the `leaderShikona` field and
  router `<Link>` path 
— fixtures + `Link` mock added per convention.

## Second-wave PR adjudication

| PR | Verdict |
|----|---------|
| #1147 Bolt execution-loops | **APPROVED — payload landed** (`.filter().sort()` to single-pass in `applyFacilityUpgrade`/`tryMyosekiPurchase`; semantics preserved, `.jules`/branding stripped) |
| #1136 Scribe JSDoc | **APPROVED — payload landed** (`rollDevelopmentProfile` relocated above the `generateCandidate` doc block; stale duplicate JSDoc on `resolveAndApplyBout` removed) |
| #1138 dependabot postcss 8.5.29 to 8.5.31 | **MERGE** — required checks green; perf-gate red = documented V13-B02 baseline drift |
| #1142 dependabot typescript-eslint/parser 8.71 to 8.72 | **MERGE** — same disposition |
| `scout-test-runAutoSim-*` branch | **DELETE** — payload already landed as #1135 in v13 |
| `bard-sansho-variety-*` branch | **DELETE** — landed as #1124 in v13 |
| `ux-recruit-specialist-focus-*` branch | **DELETE** — landed as #1129 in v13 |
