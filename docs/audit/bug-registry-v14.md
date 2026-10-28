# Bug Registry v14

Findings from the v14 systematic engine audit (megaplan `plan-28481e3472c1453a`). `run_subagent` was unavailable in the executing environment, so the planned fan-out ran as sequential in-parent sweeps over the same thematic/domain checklists — coverage preserved, parallelism lost.

## Baseline (Phase 0, HEAD `29604757`)

| Gate | Result |
|------|--------|
| `bun run type-check` | ✅ clean |
| `bun run test` (unit, incl. meta/audit gates) | ❌→✅ 20 stale EV-* snapshots (see V14-B05), regenerated → 8974 pass / 1 skip |
| `tests/slow/audit/` (8 meta-gates) | ✅ 46/46 |
| `simulationInvariants` (3-yr ID integrity) | ❌ 3 violations → ✅ 0 after fixes below |
| `engine-reviewer.ts` | ✅ no violations |
| `audit-orphans.ts` | 226 unreferenced exports (v13: 108), 8 "unticked services" — see notes |
| `duplicateExports` / `designScan` / `check-jsdoc` | ✅ clean |
| `determinism-double-run.ts` | ✅ PASS — byte-identical ×2 (17,278,790 bytes, horizon=basho) after V14-B10 fix; also wired into `tests/slow/audit/` as a gate (R5) |

## Workstream results (thematic sweeps)

| WS | Surface | Result |
|----|---------|--------|
| T1 determinism/RNG labels | every `rngFromSeed`/`rngForWorld`/`getSystemRNG`/`new SeededRNG` in src/engine | → V14-B04; rest clean (no `Math.random`/`Date.now`) |
| T2 write-path invariants | multi-writer `worldFields` fields (`talentPool`, `candidatePool`, `sponsorPool`, `myosekiMarket`, `history`, `events`) | ✅ all same-field writers compose sequentially or fuse (e.g. `tickWeekTalentPool` extracts-then-rewrites); no unfused siblings found |
| T3 allocation hot paths | `structuredClone`, find-in-loop, `Array.from().filter` chains | ✅ 1 `structuredClone(world)` = dead export `cloneWorldForTick` (V14-N01); no quadratic id loops |
| T4 dead code/orphans | 226 unreferenced exports + 8 unticked services | → notes V14-N01/N02 |
| T5 silent failure | `catch {}`, `?? fallback` masking | ✅ zero empty catches in engine |
| T6 type-safety | `as unknown as` / `as any` census | ✅ 8 + 3 sites, all data-boundary casts (v13 ~16–19 → now 8) |
| D-cluster spot reads | materialization, banzuke snapshot, history ids | → V14-B02, V14-N03, V14-N04 |

## Bugs

### V14-B01 — `applyArrayAppends` admits duplicate `.id` appends (severity: HIGH, invariant violation)

**Evidence:** `simulationInvariants` 3-yr run flagged `duplicate_id governanceLog GR-6B04D9AE`. `reportScandal` labels `ruling_${day}_${heyaId}_${reason}_${governanceLog.length}` — but `governanceLog.length` is stale inside a queued batch, so two rulings for the same heya/day/reason mint identical ids when merged into one impact (four callers can collide: `economics.ts` "Severe Insolvency", `yaocho.ts`, `officiating.ts`, agency escalation).

**Fix (verified):** resolver-level `appendDeduped` in `ImpactResolver.applyArrayAppends` — seeds a seen-set from the target array, remints colliding `.id` appends as `${id}-d${n}`. Deterministic (append order only), preserves both rulings, covers every append field (history, governanceLog, awardLog, events-adjacent arrays, etc.).

**Test-first:** `ImpactResolver.arrayAppends.test.ts` — RED confirmed (both ids collided), GREEN after fix.

**Disposition:** FIXED.

### V14-B02 — `publishBanzukeForSim` history-inject id is not unique-period-scoped (severity: HIGH, invariant violation)

**Evidence:** probe over a 10-basho autosim showed `history` = `…, kyushu-2026, hatsu-2026, haru-2027, …` — a **second** `hatsu-2026` record at index 6 with a different yusho. Root cause is *not* a stale year: this calendar rolls `world.year` at the January boundary (~dayIndex 374) which lands **mid-hatsu** (hatsu begins ~dayIndex 294), so two hatsu basho legitimately run inside `world.year` 2026. The `${bashoName}-${year}` id format cannot distinguish them.

**Fix (verified):** exported pure `nextBashoRecordId(history, bashoName, year)` — canonical id when free, deterministic `-r${n}` suffix on collision; used at the inject site (`AutoSimService.ts:247`).

**Test-first:** `autoSim.yearBoundary.test.ts` — 3 cases, RED confirmed (helper absent), GREEN after implementation.

**Disposition:** FIXED.

### V14-B03 — `mediaState.headlines` absent from ID-integrity audit (severity: MEDIUM, coverage gap)

**Evidence:** `world.mediaState.headlines` is an id-bearing array (`MH-*` uuids minted in `MediaBoutService`/`MediaEventService`/`MediaPreBashoService`, capped at 250 via `.slice`) but was not in `checkIdFieldInArray`'s list — the same dup-risk class as `events.log` without the guard.

**Fix:** added `checkIdFieldInArray("mediaState.headlines", world.mediaState?.headlines)` to `auditPooledArrayIds`.

**Disposition:** FIXED.

### V14-B04 — `MediaEventService` governance-headline label can remint identical `MH-*` ids (severity: MEDIUM, determinism)

**Evidence:** label `gov::${heyaId}::${templatePath}::${week}` — two same-template headlines for one heya in one week (e.g. two scandals — proven possible by the GR-label fixes in `29604757`) rebuild the same `SeededRNG` → identical `MH-*` id → duplicate in `mediaState.headlines`.

**Fix:** label extended with `dayIndexGlobal` + optional caller `salt`; `ScandalService` passes `salt: reason`.

**Disposition:** FIXED.

### V14-B05 — 20 stale `EV-*` golden snapshots in `eventBus.characterization.test.ts` (severity: LOW, test hygiene)

**Evidence:** unit suite baseline red — `idRngLabel` change in `29604757` remints event ids; snapshots baked the old ids.

**Disposition:** FIXED — snapshots regenerated (`vitest -u`), documented per the label-changes-shift-ids convention.

## Non-findings checked and cleared

- **`tickWeekTalentPool` composition:** extracts `refreshImpact.worldFields.talentPool` and layers discovery/emergency reveals into a single write — `refreshAllPools` emits no events, nothing dropped. Correct fusion.
- **`myosekiMarket` multi-writers:** each transaction writes `myosekiMarket` in its own independent impact — no same-batch collision possible.
- **Orphan audit delta (226 vs 108):** includes the new `idIntegrity` API surface and projection exports; 8 "unticked services" (`kimarite`, `awards`, `CareerService`, `rookieFactory`, `ReplayMetadata`, `KeshoMawashiGenerator`, `narrativeDescriptions`, `almanac/index`) are on-demand modules — heuristic false-positives, not unwired services. **NOTED.**
- **`NPCStrategyService` `"npc_strategy"` constant-seed fallback:** no `.uuid()` calls — worst case is statistically-uniform NPC decisions when callers omit `providedRng`; `npcAIWorkers.ts` passes rng. **NOTED.**

## Deferred items landed this cycle (previously PROPOSED/NOTED)

### V14-B06 — double-materialization guard for stale `signed` candidates (severity: MEDIUM → FIXED)

**Evidence:** `materializeCandidateToRikishiInternal` had no `world.rikishi.has(candidate.personId)` check — a `signed` candidate surviving a pool refresh would mint a second rikishi entity under the same id and re-append `heya.rikishiIds` (the refresh-collision path itself was fixed in `29604757`; this was the residual defense-in-depth gap).

**Fix:** guard wraps the rikishi/heya writes in `materializeCandidateToRikishiInternal`; an already-materialized personId emits no entity writes while the stale candidate is still stripped from `candidates`/pool lists (prevents per-tick retry churn).

**Test-first:** `talentPoolService.test.ts` "materialization duplicate guard" ×2 — RED confirmed (`rikishiToAdd` length 1), GREEN after fix.

**Disposition:** FIXED.

### V14-B07 — `persistBanzukeSnapshot` patched `history[last]` positionally (severity: MEDIUM → FIXED)

**Evidence:** `snapshot.ts` patched `world.history.at(-1)` with `nextBanzuke` unconditionally — correct only while `recordBashoHistory` is the last history writer before publish; any writer landing between conclude and publish would get its record corrupted (and the completed basho's record left bare, flipping `hasBanzukeSnapshot`).

**Fix:** the completed basho's record is located by `makeBashoKey(year, bashoNumber)` scanning from the end; no match → no patch (index still written). Canonical `BashoResult` writers always carry both fields (`buildBashoResult`, AutoSim inject).

**Test-first:** `BanzukePublisher.snapshot.test.ts` "patches the completed basho's record by basho key" — decoy-last-record case, RED confirmed (decoy got `nextBanzuke`), GREEN after fix.

**Disposition:** FIXED.

### V14-B08 — AutoSim kyushu-tail ticks real `active_basho` days (severity: MEDIUM → FIXED)

**Evidence:** the post-kyushu year-roll gate ticks until `world.year` increments — but the deferred yearly boundary lands inside the upcoming basho's active window (calendar drift: observed rolling mid-hatsu). `advanceWithGates` therefore entered `pre_basho → active_basho` and resolved real pipeline bout days (rikishi stat diffs, injuries/fatigue, `globalKimariteStats`, `awardLog`, events) before `simulateEntireBasho` replays the basho from scratch — confirmed stat bleed, not just a phase-flag quirk.

**Fix:** the tail is a bounded loop that pins `_interimDaysRemaining` to 1 whenever a `pre_basho` world sits at the transition threshold, so `checkPhaseTransition` can never flip into `active_basho` during the tail; the deferred yearly-boundary phase still rolls `world.year` on its weekly tick. Tail end-state is `pre_basho` at threshold — identical to a normal off-season cusp.

**Test-first:** `autoSim.kyushuTail.test.ts` — Nov-10 calendar so the boundary lands on tail day ~7; RED confirmed (`cyclePhase === "active_basho"` with a live `currentBasho`), GREEN after fix.

**Disposition:** FIXED.

### V14-N05 — `cloneWorldForTick` dead export (severity: LOW → FIXED)

Zero production callers (only a `bashoSlice` comment and `vi.mock` stubs referenced it); the pipeline is fully immutable so the retained `structuredClone` helper had no consumer. **Fixed:** removed from `tickOrchestrator.ts`; stale `cloneWorldForTick` entries stripped from 13 test mock factories.

### V14-B09 — `BardEngine.lruBySeed` anti-repetition lanes leak across worlds in-process (severity: HIGH, determinism → FIXED)

**Evidence:** `lruBySeed` is a module-global `Map<rng.seed, string[]>` (`BardEngine.ts:60`). Two same-seed worlds in one process share a lane: run 2 inherits run 1's recently-used templates, so `resolve`'s rejection loop consumes extra `rng.int` draws and shifts the caller's stream — a mechanical divergence channel for any caller that reuses the rng, exactly the class `determinism-double-run.ts` guards.

**Fix:** `BardEngine.resetCache()` at the two world-lifetime boundaries — `generateInitialWorld` (WorldFactory.ts) and `deserializeWorld` (SerializationService.ts) — symmetric with the existing `resetImpactTimestampCounter()` discipline.

**Verification:** wiring test `worldgenDeterminism.test.ts` (lane reset is unreachable under `NODE_ENV=test`'s `isTest` bypass, so the boundary call is what's pinnable). Empirically NOT the dominant cause of the byte-358 divergence — residual is V14-B10.

**Disposition:** FIXED.

### V14-B10 — residual same-process double-run divergence in heya `funds` (severity: HIGH, determinism → FIXED)

**Evidence:** `bun scripts/sim/determinism-double-run.ts` diverged byte-identically on clean `4ead52a1` and post-fixes (byte 358: `reputation` 35.56 vs 30.56, `funds` 28921250 vs 28572750; run 2 consistently shorter).

**Root cause (confirmed by checkpoint bisection + instrumented runs):** `scripts/sim/bisect-determinism.ts` (eager per-checkpoint fingerprints) isolated the first divergence to the post-basho weekly tick: `npcBidPolicies.shouldBid` flipped `false → true` for 21 heyas plus one `MANAGEMENT_DECISION` reasoningLog diff — while rng draw counts per seed were identical (196,283 each). `src/engine/npc/weekly/agents.ts` returned the module-level `NO_VACANCY_RESULT` singleton by reference; `TacticalCoordinator.boostRecruitment` mutates `recruitment.shouldBid = true` on the result in place. One `recruitment_blitz` heya hitting the no-vacancy path flipped the shared const for the rest of the process — run 1: only heyas processed after the blitz heya inherited `true`; run 2: all 21 (const already poisoned by run 1). `shouldBid:true` then fed `fillVacanciesForNPCWithBidding` → real bids → funds/reputation deltas.

**Fix:** `noVacancyResult()` factory returns a fresh object per call (both no-vacancy return sites).

**Verification:** `tests/unit/engine/npc/recruitmentBidIsolation.test.ts` (RED before fix, GREEN after); `determinism-double-run.ts` now PASSes byte-identical (17,278,790 bytes ×2, horizon=basho).

**Disposition:** FIXED.

## Recommendations

| # | Recommendation | Pointers | Effort |
|---|----------------|----------|--------|
| R1 | **Uuid-label-collision meta-gate in `engine-reviewer.ts`.** ✅ LANDED — the reviewer now flags `rngFromSeed`/`rngForWorld`/`getSystemRNG` call sites whose label is a constant literal (no discriminator) or year-scoped only; `// @rng-fixed` marks intentional constant labels. Baseline is clean (0 violations) and the slow gate `engineReviewerGate.test.ts` enforces it. | `scripts/audit/engine-reviewer.ts` | Medium — needs a small AST pass plus an allowlist for legitimate constant labels |
| R2 | **Disambiguate `makeBashoKey` at index level.** ✅ LANDED — `BashoKey` gained an occurrence-suffix form (`2026-1#2`); `makeBashoKey(year, n, occurrence)`, `bashoOccurrence`/`bashoKeyForRecord` helpers, occurrence-aware `buildHistoryIndex`/`indexBashoResult`/`sortKeyFor`/`compareBashoKey`, and `persistBanzukeSnapshot` now keys the completed record by its history position and derives `prevKey` from the preceding record. Regression coverage in `tests/unit/engine/historyIndex.test.ts`. | `src/engine/history/historyIndex.ts`, `src/engine/banzuke/publish/snapshot.ts` | Medium-large |
| R3 | **Orphan-cleanup policy + keep-list for `audit-orphans`.** ✅ LANDED — `extractKeepExports` (in `scripts/audit/orphanTracker.ts`) gives the audit a `// @keep-export <symbol>` marker so intentional exports are skipped at detection time; the ratchet is enforced by the checked-in `baseline-orphans.json` + `orphan-tracker.csv` merge (append-only ORPH ids) and the `INTENTIONAL_EXPORTS`/`GENUINE_ORPHANS` triage maps gated by `unreferenced-exports.test.ts`. Unit coverage in `orphanTracker.test.ts`. | `scripts/audit/audit-orphans.ts`, `scripts/audit/orphanTracker.ts`, `tests/unit/audit/` | Small-medium |
| R4 | **Promote the kyushu-tail pin to a first-class advance option.** ✅ LANDED — `AdvanceOptions.suppressPhaseTransition` sets a transient `_suppressPhaseTransition` flag (non-persisted, stripped post-tick) that `checkPhaseTransition` honors; `advanceWithGates` threads it through and the AutoSim kyushu tail now calls `advanceWithGates({ suppressPhaseTransition: true, shouldStop: w => w.year > startYear })` instead of counter surgery. | `src/engine/tick/tickDaily.ts`, `src/engine/tick/phases/phase00_preflight.ts`, `src/engine/tick/advanceWithGates.ts`, `src/engine/simulation/AutoSimService.ts`, `src/engine/types/{world,save}.ts` | Medium (flag) |
| R5 | **Wire `determinism-double-run.ts` into the slow gate suite.** ✅ LANDED — `tests/slow/audit/determinismDoubleRun.test.ts` runs the script via execSync with a 480s budget inside the slow suite (same subprocess pattern as `engineReviewerGate.test.ts`). | `tests/slow/audit/determinismDoubleRun.test.ts` | Small |
