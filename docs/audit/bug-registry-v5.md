# Bug Registry v5

**Date:** 2026-09-12
**Consolidation:** v5 (supersedes v4)

## Bugs Found and Fixed

### V5-B01: `scripts/bench-pipelines.ts` cannot resolve `@/` alias under bun/tsx
- **File:** `tsconfig.json` (root)
- **Severity:** Medium (perf gate benchmark step broken)
- **Root Cause:** Root tsconfig is a references-only solution file with no `compilerOptions.paths`. The `@/*` alias lives only in `tsconfig.app.json`, which bun/tsx don't read when executing scripts. First `@/` import in the engine graph (`src/engine/systems/narrative/RivalryService.ts` → `@/constants/engine/rankDisplay`, added in `04b1c65d`) crashes the benchmark.
- **Fix:** Added `compilerOptions.paths` to root `tsconfig.json` (harmless to `tsc --build` solution mode).
- **Verification:** `bun scripts/bench-pipelines.ts` now completes all 4 scenarios (S1 5.4ms / S2 219ms / S3 2145ms / S4 30133ms).
- **Status:** FIXED in `c6b35380`

### V5-B02: perf-gate gives false assurance — stale baseline + unreadable benchmark
- **File:** `.github/workflows/perf-gate.yml`, `docs/audit/perf-baseline.json`, `docs/audit/perf-current.json`
- **Severity:** Medium (gate is decorative right now)
- **Root Cause:** (a) `perf-baseline.json` last committed 2026-08-09; (b) `perf-current.json` is gitignored — a stale local artifact gets read by `perf-gate-check.ts` producing a misleading "Performance gate passed"; (c) the bench itself couldn't run (V5-B01), so no fresh current file was ever produced locally.
- **Fix:** V5-B01 unblocks the bench; baseline refresh rides the workflow's existing auto-commit on main once install is fixed (V5-B03).
- **Status:** PARTIALLY FIXED (V5-B01); baseline refresh pending on main push

### V5-B03: CI `bun install` fails — ConnectionRefused on registry tarballs
- **File:** `.github/workflows/{lint,typecheck,perf-gate}.yml`
- **Severity:** High (all gates red on main and every PR; merge state BLOCKED repo-wide)
- **Root Cause:** `oven-sh/setup-bun@v2` + bare `bun install` hits `error: ConnectionRefused downloading tarball <pkg>` on ubuntu runners. Registry/network refusal, not a code or lockfile defect (local `bun install` fine; all local gates green).
- **Fix:** Harden install step — `bun install --frozen-lockfile` + retry wrapper (2 attempts), keeping the canonical `bun.lock`.
- **Status:** FIXED (see Phase 4 commit)

### V5-B04: `EventBus` is ~dead code — bout/kensho/day templates unreachable
- **File:** `src/engine/EventBus.ts`, `src/engine/bard/domains/events.json`
- **Severity:** Medium (dead code + misleading template surface)
- **Root Cause:** Only `EventBus.recruitDiscovered` is called anywhere in src. `boutResolved`, the basho status/day resolvers, and every other EventBus method are never invoked. Consequently `events.basho.bout_title|bout_summary|status_*|day_*` and `events.economy.kensho_*` template paths in events.json are never resolved — real BOUT_RESOLVED events flow through `ImpactBuilder.logEvent` → `ImpactResolver`, which reads `data.title`/`data.summary` verbatim (never set → `""`).
- **Fix:** This consolidation merges the (harmless, token-valid) Bard enrichments for future wiring and records the dead path explicitly. Re-wiring bout text through BardEngine or deleting EventBus is a deliberate follow-up decision — flagged in verdict doc, not silently done here.
- **Status:** DOCUMENTED (dead code, not fixed — see verdict §4)

### V5-B05: BOUT_RESOLVED events log with empty title/summary
- **File:** `src/engine/bout/boutResultApplier.ts:333`, `src/engine/systems/media/MediaBoutService.ts:136`, `src/engine/core/ImpactResolver.ts:425-426`
- **Severity:** Low-Medium (log quality; partial UI reach)
- **Root Cause:** `builder.logEvent("BOUT_RESOLVED", "match", ctx, …)` passes a context with no `title`/`summary`; `ImpactResolver` defaults both to `""`. `selectRecentEvents` has no "match" bucket so most are hidden, but MediaBoutService logs the same type under category `"training"` — which IS bucketed — producing blank-title digest rows.
- **Fix:** (Phase 5) Give `ImpactResolver` a type→fallback-title path, or have MediaBoutService put a real title in data. Test-first: Phase 3 writes a failing test asserting non-empty title for queued BOUT_RESOLVED events.
- **Status:** OPEN (test scheduled Phase 3, fix Phase 5)

### V5-B06: Tracked files covered by .gitignore (junk churn vector)
- **Files:** `tsconfig.electron.tsbuildinfo`, `tsconfig.node.tsbuildinfo`, `.jules/{bolt,palette,scout}.md`, `src/tests/unit/helpers/__audit_verification.test.ts`
- **Severity:** Low (repo hygiene; bot PRs keep committing churn — e.g. #932, #944)
- **Root Cause:** Files committed before ignore rules added (`.gitignore:35,92`); commit `745025ea` previously untracked `.jules/` but bot merges re-added journals. On case-insensitive macOS, `.jules/` and `.Jules/` are the same directory — journals physically co-locate with the untracked persona docs.
- **Fix:** `git rm --cached` the tracked set in Phase 4; journals keep regenerating in bot branches and are excluded from every merge.
- **Status:** FIXED (see Phase 4 commit)

### V5-B07: CLAUDE.md stale metrics
- **File:** `.claude/CLAUDE.md`
- **Severity:** Low (docs)
- **Root Cause:** Claims "195 test files, 1703 tests". Reality: 820 files / 7,437 tests (all passing, ~884s).
- **Fix:** Update in Phase 8 cleanup.
- **Status:** OPEN

### V5-B08: Stale local `package-lock.json`
- **Severity:** Low — untracked artifact pins lucide-react 1.31.0 vs package.json 1.34.0; can mislead any npm invocation. `bun.lock` is canonical (`packageManager: bun@1.3.14`).
- **Fix:** delete local file (untracked).
- **Status:** OPEN (local cleanup)

### V5-B09: Player bout tactics silently discarded — reducer/worker dual-path divergence
- **Files:** `src/contexts/bashoSlice.ts` (SIMULATE_BOUT/SIMULATE_ALL_BOUTS/END_BASHO), `src/contexts/GameContext.tsx:112-135`, `src/engine/tick/phases/phase01_basho_bouts.ts:50`, `src/store/gameStore.ts:160`, `src/engine/worker/types.ts`
- **Severity:** High (player-facing feature is a no-op; state silently overwritten)
- **Root Cause:** `setBoutTactic` stores tactics in reducer UI state (`state.boutTactics`) only. `simulateBout`/`simulateAllBouts`/`endBasho` dispatch to the **main-thread reducer**, which calls `worldEngine.simulateBoutForToday(world, idx, playerTactic)` — the tactic influences `resolveBout`/`kimariteClassifier` and the watched result. But `sendCommand` is a bare `postMessage`; no `EngineCommand` carries tactics and `LOAD_WORLD` is only sent on save-load (`GameContext.tsx:286,304`). When `advanceDay` → `TICK_DAY` reaches the worker, the worker's `currentWorld` still has every match unplayed; `phase01_basho_bouts` re-resolves the whole day calling `simulateBoutForToday(currentWorld, 0)` **without tactics**, then `WORLD_UPDATED` overwrites the reducer world. The tactic's effect on the watched bout is discarded; if the tactic altered the outcome the persisted result differs from what the player watched. `endBasho`'s main-thread `endBasho`+`publishBanzukeUpdate` is likewise never synced — the worker re-derives basho conclusion on the next tick.
- **Evidence:** `phase01_basho_bouts.ts:50` `simulateBoutForToday(currentWorld, 0)` (no tactic param); `types.ts` has no tactic-bearing command; `sendCommand` (`gameStore.ts:160`) attaches no world. Bout physics is seed-deterministic (`boutResolver.ts:576`), so non-tactic bouts re-resolve identically — masking the defect except where tactics matter.
- **Fix:** (Phase 5, test-first) Carry tactics to the worker — e.g. a `SET_BOUT_TACTIC`/day-advance command payload, or route interactive bout resolution through the worker. Alternatively (zero-compat latitude): make the worker the sole basho-resolution path and have the reducer's simulate* actions become pure previews not written into `state.world`. Decide in Phase 5 after regression test proves the drop.
- **Status:** OPEN (regression test scheduled Phase 3)

### V5-B11: `resolveImpacts` mutates input world's `events.log` via shared reference
- **Files:** `src/engine/core/ImpactResolver.ts:409,416-428`, `src/engine/events.ts:46-53,128`
- **Severity:** Low-Medium (documented-but-fragile contract violation; currently masked)
- **Root Cause:** `resolveImpacts` does `result = { ...world }` — `result.events` aliases the input's `events` object. `logEngineEvent` → `ensureEventsState` (explicitly "mutates world.events in-place") then `events.log.push(ev)` — appending into the INPUT world's log. The shallow copy only protects top-level fields. Currently masked because callers discard the pre-tick world and `createSelector` memoizes on world-identity (new ref each tick → no stale reads).
- **Risk:** Any caller that retains the pre-resolve world (replay, diffs, undo, save-comparison, tests) observes it mutated — violating the resolver's "immutable patches" contract (ImpactResolver.ts:401).
- **Fix:** (Phase 5, test-first) Before logging, clone events state: `result.events = { ...events, log: [...events.log], dedupe: { ...events.dedupe } }` (or inside `_applyImpact`). Regression test: input world's `events.log.length` unchanged after resolving an impact that queues an event.
- **Status:** OPEN (test scheduled Phase 3)

### V5-B10: Orphaned components + misleading constant-arg call (minor cleanup)
- **Severity:** Low
- **Findings:** (a) `ExhibitionInvitationsPanel` is tested but never mounted — `RegionalHubPage.tsx:175-214` renders `pendingExhibitions` inline instead. (b) `RequireWorld` component unused; only its `useRequireWorld` hook is consumed by pages. (c) `phase00_preflight.ts:152` calls `getInterimWeeks("hatsu","haru")` — args are ignored today (returns constant `INTERIM_WEEKS`, `calendar.ts:141`), but if the function ever becomes pair-aware the hardcoded pair silently yields wrong interim length after non-hatsu basho.
- **Fix:** Phase 4/8 — wire the panel into RegionalHubPage (replace inline JSX) or delete it; delete RequireWorld wrapper; pass the real basho pair to getInterimWeeks.
- **Status:** OPEN

## PR-Level Findings (rolled into verdict table)

| PR | Finding | Disposition |
|----|---------|-------------|
| #917 | Scribe doc "fix" is factually FALSE — claims `pure` flag ignored & `touches:[]` falls back to full snapshot. Code: `pipelineRunner.ts:116` honors `pure`; `createShallowSnapshot` filters `[]`→snapshots nothing (lines 76-79). | REJECT |
| #938 | Adds second "Ozeki Promotion Watch" widget using proxy `consecutiveStrongSekiwake/3` — main already shows the REAL criterion `sekiwakeThreeBashoWins/33` (BanzukePublisher.ts:313: `>= 33 && wins >= 10`). Would render duplicate same-label widgets. | REJECT |
| #934 vs #936 | Both retype RikishiPotentialPanel. #934 wins: imports shared `NumericStat` (rikishi.ts:42), deletes `PanelStatKey` union AND redundant `CURRENT_KEY` identity map, `?? 0` guards. #936 keeps local union + identity map. | #934 CHERRY-PICK, #936 SUPERSEDED |
| #919 | 114-file PR titled "matchmaking optimization": ~90 files are prettier reformat churn (incl. trailing-comma REMOVAL vs repo config) + test-file reformatting + tsbuildinfo. The real optimization is confined to `matchmaking/LowerDivisionSwiss.ts` + `SwissAlgorithm.ts` (`.filter().sort()` → loop+sort, semantically equivalent). | CHERRY-PICK the 2 matchmaking files only |
| #920 vs #943 | Both edit `events.json` `basho.bout_title`/`bout_summary` (dead paths, V5-B04). #920's variants are richer (valid `%WINNER%/%LOSER%/%KIMARITE%/%DAY%` tokens — all in NarrativeContext). #943 uniquely enriches `kensho_*` + `day_*` (also dead paths). | Merge #943 keys + #920 bout variants (hand-merge) |
| #940 | Fixes 5 un-awaited `expect(...).resolves` assertions — latent false-positive tests. | CHERRY-PICK |
