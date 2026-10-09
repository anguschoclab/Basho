# Bug Registry v10

**Date:** 2026-10-15 (ongoing)
**Branch:** `audit/v10`
**Method:** Fan-out audit per `~/.devin/plans/plan-869bcc5f1d7afa65.md` —
9 workstreams (WS1–WS9), ~90 findings triaged, every claim re-confirmed
against the production code path before classification. Test-first: all
confirmed bugs got a failing regression test recorded in
`docs/audit/v10-red-phase.log` before implementation.
**Legend:** FIXED = implemented + targeted tests green. OPEN = confirmed,
not yet implemented. DEFERRED = registered, out of scope this pass.
DISPROVED = claim did not survive production-path verification.

---

## Confirmed Bugs — Fixed

### V10-B01 (WS5-01, CRITICAL): Electron `getItem` returned the IPC Promise cast to string

- **Files:** `src/contexts/electronStorageProvider.ts`, `src/vite-env.d.ts`
- **Mechanism:** `getItem` returned `window.electron.storage.get(key)` — a
  `Promise` — synchronously cast to `string`. Every `JSON.parse` on a loaded
  save threw; `hasAutosave()` saw a truthy Promise. All saves unloadable on
  the desktop build. Masked by tests mocking `storage.get` synchronously.
- **Fix:** Write-through value cache hydrated via `storageReady()`;
  synchronous getItem/setItem/removeItem semantics matching the web path;
  `vite-env.d.ts` bridge types corrected to `Promise`.
- **Evidence:** `electronHydration.test.ts`, `electronStorageProvider.async.test.ts`,
  `electronStorageProvider.test.ts` (rewritten around the real async IPC contract).
- **Status:** FIXED

### V10-B02 (WS5-02, HIGH): Nested Maps serialized to `{}` — deterministic load crash

- **Files:** `src/engine/persistence/collectionCodec.ts` (new),
  `src/engine/saveload.ts`, `src/engine/persistence/SaveSlotService.ts`,
  `src/engine/persistence/MigrationService.ts`, `src/engine/types/save.ts`
- **Mechanism:** `JSON.stringify` collapses nested Maps (e.g.
  `_preBashoAssessment.rikishiAssessments`) to `{}`; deserialization then
  crashed on `.get` during `pre_basho` loads.
- **Fix:** Generic `$$map`/`$$set` replacer/reviver codec wired at every
  save parse/stringify boundary; `SerializationService` defensively
  re-hydrates the known nested Map. Deep validation in `isValidSave`.
- **Evidence:** `SerializationService.preBashoAssessment.test.ts`,
  `saveTimestamps.test.ts`, `saveload.test.ts` (fixtures upgraded to the
  deepened contract).
- **Status:** FIXED

### V10-B03 (WS3-04 ≡ WS5-03, HIGH): `LOAD_WORLD` dropped mid-tick → silent world revert

- **Files:** `src/store/gameStore.ts`, `src/contexts/gameReducer.ts`,
  `src/contexts/GameContext.tsx`
- **Mechanism:** `sendCommand` dropped non-control commands while a tick was
  pending; the in-flight tick's `WORLD_UPDATED` then silently reverted a
  freshly loaded save. Confirmed independently by two workstreams.
- **Fix:** `sendCommand` returns `false` + sets `commandRejected` notice on
  drop; `PAUSE_SIM`/`RESUME_SIM` pass through; `LOAD_WORLD` now bumps
  `uiWorldRevision` so the existing pendingTick-gated sync effect retries
  delivery once the tick clears.
- **Evidence:** `commandRejection.test.ts` (red→green).
- **Status:** FIXED

### V10-B04 (WORKER, HIGH): Worker crashes left `pendingTick` stuck forever

- **Files:** `src/store/gameStore.ts`, `src/components/layout/GlobalErrorBanner.tsx` (new),
  `src/App.tsx`
- **Mechanism:** `initWorker` set `onmessage` only. A worker runtime error or
  `messageerror` never posted `ERROR`, leaving `pendingTick=true` and every
  subsequent command silently dropped. `error` state was stored but never
  rendered.
- **Fix:** `worker.onerror`/`onmessageerror` handlers clear simulation state
  and surface the failure via `error`; `GlobalErrorBanner` renders it and
  toasts `commandRejected` notices.
- **Evidence:** `commandRejection.test.ts` (crash cases),
  `globalErrorBanner.test.tsx`.
- **Status:** FIXED

### V10-B05 (HIGH): Engine autosave stamped epoch 0 / redundant engine-side autosave

- **Files:** `src/contexts/gameHelpers.ts`, `src/engine/saveload.ts`,
  `src/engine/lifecycle/BashoHistory.ts`, `src/hooks/useSaveSlotManager.ts`
- **Mechanism:** `autosave` was called with no timestamp; engine-side code
  called `new Date()` (banned by `dateArithmeticGuard`) or fell back to
  epoch. `BashoHistory` redundantly autosaved inside the engine.
- **Fix:** `autosaveWithSignal` stamps a real ISO timestamp at the
  UI/context boundary and threads it into `quickSave(world, timestampISO)`;
  engine-side autosave removed (persistence lives at the boundary);
  `handleContinue` now respects `loadFromAutosave`'s boolean return.
- **Evidence:** `autosaveTimestamp.test.ts`, `saveTimestamps.test.ts`,
  `useSaveSlotManager.continue.test.tsx`, `SaveSlotManager.test.tsx` (mock
  corrected to return `true`).
- **Status:** FIXED

### V10-B06 (WS4-04, HIGH): Presenter/read paths mutated `WorldState`

- **Files:** `src/engine/scoutingStore.ts`,
  `src/presenters/projections/boutProjections.ts`,
  `src/engine/systems/training/TrainingService.ts`
- **Mechanism:** `getOrCreateScouted` called `ensureScoutingTable`,
  initializing `world.playerKnowledge` on read; `boutProjections` called the
  mutating `warmScoutingForRikishiList` during render;
  `ensureHeyaTrainingState` merged defaults into the live map entry in place
  despite its "never writes" docblock.
- **Fix:** Read paths derive a temporary/default view; explicit write paths
  (`setScoutingInvestment`, `warmScoutingForRikishiList`, impact hooks) own
  persistence; `ensureHeyaTrainingState` is copy-on-write.
- **Evidence:** `scoutingStore.purity.test.ts`,
  `ensureHeyaTrainingState.purity.test.ts` (red→green).
- **Status:** FIXED

### V10-B07 (Y1, HIGH): Yusho selection merged all divisions — yokozuna path unreachable

- **Files:** `src/engine/lifecycle/CompetitionService.ts`
- **Mechanism:** `concludeBashoCompetition` called `calculateStandings(basho)`
  over ALL divisions' standings. A 15-0 juryo rikishi beat a 14-1 makuuchi
  winner for the headline yusho (empirically observed in autosim:
  `Tamakawa rank=juryo wins=6` crowned). Ozeki never accrued `isYusho` → all
  five yokozuna promotion cases dead; autosim showed zero promotions and the
  `yokozunaPromotionAutoSim` perf test failed deterministically.
- **Fix:** Headline yusho computed via `calculateDivisionStandings(basho,
  world, "makuuchi")` with fallback to merged standings only when no makuuchi
  rikishi exist. Lower divisions keep per-division winners via
  `divisionYushoMap`.
- **Evidence:** `yokozunaPromotionPath.test.ts` — the promotion *write* path
  control passed pre-fix (narrowing the bug to winner selection).
- **Status:** FIXED

### V10-B08 (WS4-01, HIGH): Fabricated unconditional UI metrics

- **Files:** `src/components/dashboard/StableWidget.tsx`,
  `src/components/stable/InfrastructureDashboard.tsx`,
  `src/components/rikishi/RikishiNaturalization.tsx`
- **Mechanism:** Hardcoded "Staff Development Level 3 / 5" (Progress 60),
  "Naturalization Years: 4 / 10" (Progress 40), construction `Progress
  value={45}`, and invented naturalization criteria ("60 Basho", "400 Wins",
  "Sanyaku") — none derived from state. The construction queue carries only
  `completionYear`/`completionBasho`; no progress datum exists.
- **Fix:** Fabricated rows/bars removed; Infrastructure shows the real ETA
  (basho + year); RikishiNaturalization renders the real 5-year tenure rule
  (`NATURALIZATION_YEARS` exported via `engineAccess`, driven by
  `citizenshipStatus`/`yearsToNaturalization` DTO fields).
- **Evidence:** `stableWidget.honesty.test.tsx`,
  `infrastructureDashboard.honesty.test.tsx` (tightened after Radix
  rendered an indeterminate progressbar hiding the value),
  `naturalizationCriteria.test.tsx`.
- **Status:** FIXED

### V10-B09 (H4/R1, MEDIUM): Bout-card heat bands diverged from canonical descriptors

- **Files:** `src/components/game/boutCardTypes.tsx`,
  `src/presenters/projections/bashoProjections.ts`,
  `src/presenters/uiDigestTypes.ts`,
  `src/components/game/boutCardComponents.tsx`,
  `src/components/game/BoutPreMatchOverlay.tsx`
- **Mechanism:** A parallel `cold/warm/hot/inferno` scale at 25/50/75 was
  duplicated in TWO places (component + projection) vs canonical
  `dormant/simmering/heated/fierce/legendary` at 20/40/65/85 — the same
  rivalry rendered different labels in different surfaces.
- **Fix:** `HeatBand`/`RivalryHeatBand` unified to the canonical type;
  `getHeatBand` delegates to `toRivalryHeatBand`; `HEAT_CONFIG` covers all
  five canonical bands; `showHeat` gate uses `!== "dormant"`.
- **Evidence:** `boutCardHeatBand.test.tsx` (0–100 sweep parity).
- **Status:** FIXED

### V10-B10 (H6, LOW): Digest training section titled "Governance & Compliance"

- **Files:** `src/presenters/projections/digestProjections.ts`,
  `src/engine/bard/domains/ui.json`
- **Fix:** Added `ui.digest.sections.training: "Training"` and resolved the
  correct path.
- **Evidence:** `digestTrainingTitle.test.ts`.
- **Status:** FIXED

### V10-B11 (WS6 residual, MEDIUM): `rikishi.history` never written — H2H/streaks dead

- **Files:** `src/engine/bout/boutResultApplier.ts`,
  `src/constants/engine/bout.ts`
- **Mechanism:** `Rikishi.history: MatchResultLog[]` was initialized empty
  and never appended. `getH2HReport` always returned zero meetings;
  `calculateStreak` labels showed "-"; `calculateMostFrequentKimarite`
  returned empty; the career match log rendered nothing.
- **Fix:** `applyBoutResult` appends a `MatchResultLog` to both participants
  (rolling `RIKISHI_BOUT_HISTORY_MAX=500` window — `boundHistoryArrays`
  covers world arrays, not per-rikishi logs).
- **Evidence:** `boutResultApplier.history.test.ts` (red→green incl.
  end-to-end `getH2HReport`).
- **Status:** FIXED

### V10-B12 (WS6-01/02/03, PERF): Per-bout O(matches²) amplification — ~2.7M elem-ops/day

- **Files:** `src/engine/world.ts`, `src/engine/tick/phases/phase01_basho_bouts.ts`
- **Mechanism:** `simulateBoutForToday` re-scanned `basho.matches` (`.filter`)
  and rebuilt it (`.map`) on every bout; the phase loop called it once per
  bout.
- **Fix:** New `simulateBoutsForDay` batch path — one owned mutable copy of
  the matches array per day, results written by index; per-bout world
  evolution (standings → next bout) preserved. Interactive `bashoSlice` path
  unchanged (per-click, not hot).
- **Evidence:** `simulateBoutsForDay.determinism.test.ts` (bit-identical
  repeat-run), pipeline tests re-pointed; tactics pin now spies
  `resolveBout` arg 4.
- **Status:** FIXED

### V10-B13 (TEST HARNESS): Async-bridge mocks didn't match real preload signatures

- **Files:** `src/tests/helpers/utils/electronMocks.ts`,
  `src/tests/unit/contexts/electronStorageProvider.test.ts`
- **Fix:** `mockElectronAPI` storage methods now return Promises like the
  real IPC bridge; the old provider suite was rewritten around hydration.
- **Status:** FIXED

### V10-B14 (SAVE CONTRACT): `isValidSave` accepted hollow saves

- **Files:** `src/engine/persistence/SaveSlotService.ts`
- **Fix:** Deepened validation to required world fields incl. `seed`;
  shallow `{version, world:{year}}` fixtures updated to real serialized
  worlds in existing tests (contract was intentionally strengthened).
- **Status:** FIXED

### V10-B15 (WS2 residual, HIGH): Autosim crowned yusho by tie-break — no playoff, no promotions

- **Files:** `src/engine/simulation/TournamentSimulator.ts`,
  `src/engine/types/basho.ts`
- **Mechanism:** `simulateEntireBasho` pre-generates all 15 days
  (`generateFullBashoSchedule`), so Swiss pairing never reacts to results —
  multiple makuuchi rikishi can finish 15-0 without facing each other
  (observed: Miyahana AND Kaishitora both 15-0 for 4 straight basho). The
  winner was `finalStandings[0]` via `stableTieBreak` — no playoff. Worse,
  `standings` includes juryo (sekitori), so the autosim winner selection
  also mixed divisions (same shape as V10-B07). Net effect: `history.yusho`
  went to an arbitrary co-leader, dominant ozeki never got `isYusho`, and
  `yokozunaPromotionAutoSim` perf test failed deterministically for
  multiple releases.
- **Fix:** Restrict the autosim yusho race to makuuchi (fallback to merged
  standings when no makuuchi entries exist); shared top records now resolve
  via the canonical `resolvePlayoffs` kettei-sen; `playoffMatches` exposed
  on `BashoSimResult`. Empirical: boosted ozeki (95 stats) won hatsu via
  playoff and was promoted to yokozuna in the same `runAutoSim` pass;
  `yokozunaPromotionAutoSim` perf test green (145s).
- **Evidence:** `tournamentPlayoff.test.ts` (red→green: tied leaders,
  playoff matches present, winner ∈ tied set, deterministic).
- **Sub-finding resolved:** pre-generated scheduling is replaced by
  adaptive per-day torikumi — see V10-R11 below (now FIXED).

- **Status:** FIXED

---

## Confirmed — Registered, Not Yet Fixed

### V10-R11: Autosim schedule is static — no adaptive pairing — FIXED

`simulateEntireBasho` pre-generated all 15 days in one pass, so Swiss
pairing could never react to live standings — two 95-stat rikishi both
finished 15-0 without meeting (empirical RED).

**Fix:** the day loop now schedules adaptively, mirroring the interactive
path (`ensureDaySchedule`): before each day, `basho.day` is set and
`basho.standings` is rebuilt from played results (all divisions, via new
`syncBashoStandings`), then `scheduleAllDivisionsDay` pairs against those
records. `generateFullBashoSchedule` removed (zero remaining callers).

**Evidence:** `adaptiveTorikumi.test.ts` (red→green: two boosted
cross-heya rikishi can no longer both finish undefeated; same-seed
schedule + winner deterministic). Census probe: 0 unbeaten finishers
across 6 seeds in a 20-man makuuchi (leaders meet and eliminate each
other). Perf suite including `yokozunaPromotionAutoSim` re-verified.

- **Status:** FIXED

### V10-R01: `sendCommand` rejection surface — VERIFIED CLOSED

Worker error posts for `SCOUT_CANDIDATE`/`SCOUT_POOL` exist in the
refactored `commands/recruitment.ts`. Symmetry audit completed this pass:
the rejection loop is closed end-to-end — `pendingTick` gate →
`commandRejected` → `GlobalErrorBanner` toast (with return-`false` for
callers); handler throw → worker `ERROR` → `error` state; crash →
`onerror`/`onmessageerror` → failure state. `useWorkerSync` correctly
defers `LOAD_WORLD` on `pendingTick`. Only async handler is
`TICK_MULTIPLE_DAYS` — the exact one the gate covers.
**Invariant to preserve:** non-tick command handlers must stay
synchronous — an `await` inside one would reopen interleaving, since
non-tick commands don't set `pendingTick`.

### V10-R02: WS1/WS2 residual hunts (agents rate-limited — partially executed)

Executed directly this pass: cadence gates use `_daysSinceLastWeeklyTick >=`
thresholds (not `% 7`) — **no off-by-one**; `generateGovernanceHeadline` has
zero positional call sites — **clean**; `h2h` record-seeded RNG varies per
pair — clean.
`DUMMY_RNG` (`narrativeDescriptions`) — **RESOLVED by deletion**: the four
shared-RNG helpers (`describeAttribute`/`describeAggression`/
`describeExperience`/`describeFatigue`) had zero production callers —
`uiDigest` re-exported three of them dead. Helpers + `DUMMY_RNG` + dead
re-exports removed; `describeTrainingEffect` kept (live caller:
`BeyaWideRegime`). The call-order-dependence hazard is gone entirely
rather than re-seeded.
`?? N` NaN-masking survey — **SURVEYED, CLEAR**: 866 `?? <num>` sites in
`src/engine` default missing fields (`undefined`/`null`), not computed
NaN; the only `??`-inside-`Math.*` sites (`bout/narrative/frames.ts`)
protect the input. All presenter divisions are denominator-guarded
(ternary / early-return / `Math.max(1, …)` / constant); UI `Number(v) || 0`
catches NaN. No live masking hazard found.
`cyclePhase` unreachable-states sweep — **CLEAR**: all five phases have
writers (pre→active via preflight; active→post via interactive endBasho;
post→interim; interim→banzuke_reveal at ≤14d; reveal→pre at ≤7d); the
multi-day clamp halts exactly on thresholds so no phase can be skipped.
`bashoPipeline` vs `offSeasonPipeline` divergence — **FIXED (welfare)**:
`phase01_week_welfare` was excluded on a false rationale ("injury rolls
handled by boutResolver" — rolls live in `phase01_week_health`, which is
included). Welfare risk/compliance/sanctions now tick during basho weeks,
positioned after health (welfare gates read `injuryStatus.severity`).
Remaining noted smell: bashoPipeline runs staff+scouting before health,
offSeason after — both internally consistent, no proven dependency bug.
Still open: phase-order read-before-write sweep, shallow-merge wipe
census beyond the sites already fixed.

### V10-R03: Dead provider — `react-query` — FIXED

`QueryClientProvider` wrapped `App.tsx` with zero `useQuery`/`useMutation`
call sites. **Fixed:** provider + `QueryClient` removed from `App.tsx` and
`build/smoke.test.tsx`; `@tanstack/react-query` removed from dependencies.

### V10-R04: Decorative guard — `engine-reviewer.ts` — FIXED

Was imported only by tests scanning synthetic samples. **Fixed:** wired as
a live slow gate (`src/tests/slow/audit/engineReviewerGate.test.ts`) running
the real scan over `src/engine` — the CLAUDE.md "flags any reintroduced
call site" claim is now true. Three real violations surfaced on first run
(world-init writes missing `@world-builder`) — annotated.

### V10-R05: `genuine` orphans — TRIAGED, REMOVED

All 16 genuine entries resolved by deletion: `honbasho.ts` (superseded by
`ExhibitionBashoService.isExhibitionBasho`/`isHonbasho`), `EntityService.ts`
(superseded by `queries.ts` + `EntityCollection`), `collectionOperations.ts`
(7 exports, zero callers), `jsonParser.ts` (`parseLLMResponse`/`safeParse` —
LLM-era, zero call sites). Sole-subject tests removed; `utils/index.ts`
re-exports dropped; `destr` retained (live in npcAIWorkers/storage).
`GENUINE_ORPHANS` map + baseline-orphans.json cleared. ~93 "intentional"
unreferenced-*function* entries remain for a second look.

**Census follow-up (committed):** 72 `candidate` entries triaged — 67
`beat*` narrative helpers + ceremony/interview/prelude/stakes/resolution/
postbout internals were exported-but-only-intra-module; all unexported in
place (functions kept — they're reached via the `narrate*` entry points).
`applyCrisisRescue`, `updateMetaAdaptation`, `MetaAdaptationState` remain
exported as test-consumed internals (classified `intentional`). 7 stale
classification keys removed (wired meanwhile: `countsAsForeign`,
`isAtForeignLimit`, `PbpVoice`, `isSanyakuPromotionByRank`,
`KACHI_KOSHI_WINS`, `BardResult`, `NPCPersona`).
**Scanner fix:** `findUnusedComponents` flagged any `*.tsx` whose basename
didn't appear elsewhere — false-positived multi-component files
(`*Sections.tsx`) whose exports are imported under member names. Now also
accepts usage of any exported symbol.

### V10-R06: Coverage blind spot — FIXED

`coverage.include` now spans `src/**/*.{ts,tsx}` for components/contexts/
hooks/pages plus `src/constants/**/*.ts`. Aggregate thresholds will now
measure the real universe — a full `--coverage` run could not complete a
report during the parallel refactor's stale surface tests; expect the
aggregate to drop honestly below thresholds until UI coverage improves
(the gate reporting red is the finding working as intended).

### V10-R07: WS9 drops — event categories missing from digest — FIXED (partial)

`selectRecentEvents` bucketed 8 categories but `buildEventSections`
rendered only training/scouting/economy (+narrative, +injuries) — media,
career, rivalry, governance, welfare were collected then discarded, and
basho/milestone/facility/match were never bucketed. Producer census
confirmed real emitters for every dropped category (EventBus factories +
`builder.logEvent` call sites).
**Fixed:** selectors gains `basho`(+match)/`milestone`/`facility` buckets;
`buildEventSections` renders all eleven buckets with BardEngine section
titles where templates exist (`governance`/`milestones`/`media` — the
templates were already shipped but never wired).
**Test:** `digestDroppedCategories.test.ts` — 9 category→section cases.
**Remaining (deferred):** `truthLevel` is write-defaulted to `"public"`,
never read, and no producer sets a non-public value — aspirational
fog-of-war schema; recommend deleting the field or wiring producers when
a private-intel surface lands. Optimistic toasts on fire-and-forget
commands remain for commands lacking worker `ERROR` posts.

### V10-R08: WS8 residuals — partially fixed

- ~~`test:timings` references bare `tsx`~~ **FIXED** — script now runs via
  `bun` (native TS execution), verified runnable.
- ~~UI→engine eslint denylist holes~~ **FIXED** — enumerated patterns
  replaced with blanket `@/engine/*` + `@/engine/**/*` deny allowing only
  `@/engine/types/**` and `@/engine/holiday` (all current UI imports are
  type-only); lint clean.
- ~~Perf-gate job structurally over-budget~~ **STALE** — perf suite moved
  to `slow-tests.yml` (30-min job, ~4 min observed); `perf-gate.yml` runs
  only `bench-pipelines` (S1/S2/S3 bench, seconds-to-minutes). The 25-yr
  diagnostic sim is invoked by no workflow.
- ~~Husky dead on fresh clones~~ **FIXED** — `husky@9.1.7` added to
  devDeps + `"prepare": "husky"` script; fresh clones get `.husky/_`
  shims + `core.hooksPath` on install. Dead `lint-staged` config block
  removed (lint-staged was never installed; the hook runs `lint:commit`).
- ~~`perf-gate.yml` invoked `npx tsx`~~ **FIXED** — both steps switched
  to `bun` (tsx was never a declared dep; worked in CI only via npx
  on-the-fly fetch — unpinned supply-chain hole).
- Scripts referenced nowhere (manual tools or dead — triage needed,
  not deleted): `analyzeNarrativeDeps`, `check-jsdoc`,
  `determinism-double-run`, `emitNarrativeModules`, `list-models`,
  `measure-breakdown`, `measure-events`, `measure-growth`,
  `measure-rikishi`, `repro-year`, `test-agents`, `verify-training-decay`.
  Some are legitimate manual dev tools; recommend a `scripts/README` or
  deletion decision rather than silent removal.

### V10-R09: WS3-06 — bashoSlice mutations ungated during pendingTick — FIXED

The deferred `LOAD_WORLD` in `useWorkerSync` did not rescue mid-tick
bashoSlice writes: the tick's `WORLD_UPDATED` dispatches `updateWorld`,
which replaces `state.world` outright (no `uiWorldRevision` bump), so the
deferred sync pushes the worker's own world back — the interactive write
was silently lost. Reachable via `endDay`→`advanceDay` (TICK_DAY) followed
by a fast bout click, or `simulateAllBouts`' `startTransition` dispatch
landing after `pendingTick` flips.
**Fixed:** `useFlowActions` gates all world-mutating dispatchers
(`startBasho`/`simulateBout`/`simulateAllBouts`/`endBasho`/`setBoutTactic`)
through `dispatchWorldMutation`, which drops mid-tick with a
`commandRejected` toast — same mechanism as `sendCommand`. The gate runs
inside the `startTransition` callback so it re-checks at execution time.
**Test:** `flowActionsPendingTick.test.tsx` — 5 drop cases + 3 pass-through.

### V10-R10: `buildAIContext` still orphaned — FIXED

`buildAIContext` is now the canonical context assembler:
`phase01_week_npc_ai` calls it with the persona-hydrated oyakata and the
precomputed perception/league views instead of an inline literal. Its
oyakata projection now carries `grudges` (previously dropped — a real gap:
`StrategicPlanner` reads `ctx.oyakata.grudges`). Signature takes the
resolved `Oyakata` rather than an id so memory consolidation stays
upstream where persona quirks are visible. ORPH-0098 removed from
`baseline-orphans.json` + `GENUINE_ORPHANS`.

---

## Disproved Findings

| Claim | Verdict |
|-------|---------|
| WS8-13: electron output names wrong | DISPROVED — `out/main/main.cjs` verified against a real build |
| Husky dead | PARTIALLY — fires locally; dead only on fresh clones (R08) |
| ai-audit orphans (NPC crisis, matchmakingOverride, archiveActivePlan, decisionHistory) | DISPROVED — all wired post-WS work |
| WS8: 59 worker handlers | CORRECTED — 58 commands / 58 handlers / 7 worker→UI responses |
| Electron sandbox | Already correct — hunt narrowed to IPC payload validation |
| `loadFromAutosave` doesn't return bool | CORRECTED — returns boolean; only the prop type lied |

---

## Phase 5 verification status

See `code-audit-v10-verdict.md` for the final gate matrix. Pre-existing
failures at verdict time are the parallel session's in-flight refactor
(`GovernancePage`, `Dashboard.succession`, `economy-surface` attendant
wiring, npcAI/characterization type errors) — verified NOT to intersect the
files changed by this audit.
