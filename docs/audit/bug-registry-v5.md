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

### V5-B03: `bun install` fails everywhere — lockfile pinned to private Artifactory mirror
- **File:** `bun.lock`, `bunfig.toml`
- **Severity:** High (all gates red on main and every PR; merge state BLOCKED repo-wide; also broke local installs off-network)
- **Root Cause:** `bun.lock` contained **948 tarball URLs** pointing at `https://artifactory.ubisoft.org/{artifactory/,}api/npm/npm/...` — a private corporate mirror baked in when the lockfile was generated on-network. Off that network every `bun install` fails `DNSResolveFailed`/`ConnectionRefused` — exactly the CI symptom. (Initially misdiagnosed as transient registry refusal.)
- **Fix:** Rewrote all 948 URLs to `https://registry.npmjs.org/` (integrity hashes are content hashes — valid regardless of mirror), and pinned `[install] registry = "https://registry.npmjs.org"` in `bunfig.toml` so re-resolution can't re-bake a private mirror.
- **Verification:** `bun install` completes off-network (18 packages, 845ms); lockfile now resolves lucide-react@1.39.0 / typescript-eslint@8.69.0 from npmjs.
- **Status:** FIXED in `b62067c8`

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
- **Fix:** `ImpactResolver.resolveImpacts` now derives honest fallback text when `data.title`/`data.summary` are absent: title = humanized event type (`BOUT_RESOLVED` → "Bout Resolved"); summary = `"<winner> defeated <loser> by <kimarite>."` when those context fields exist, else type label + shikona. Never fabricates entities.
- **Verification:** `queuedEventNarrative.test.ts` (3 tests) red → green.
- **Status:** FIXED in `f356662a`

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
- **Fix:** Updated to ~830 files / ~7,400 tests + added command-path note documenting the uiWorldRevision → LOAD_WORLD sync.
- **Status:** FIXED (Phase 8 cleanup commit)

### V5-B08: Stale local `package-lock.json`
- **Severity:** Low — untracked artifact pins lucide-react 1.31.0 vs package.json 1.34.0; can mislead any npm invocation. `bun.lock` is canonical (`packageManager: bun@1.3.14`).
- **Fix:** Deleted local file (was never tracked).
- **Status:** FIXED in `5f3c7952`

### V5-B09: Player bout tactics silently discarded — reducer/worker dual-path divergence
- **Files:** `src/contexts/bashoSlice.ts` (SIMULATE_BOUT/SIMULATE_ALL_BOUTS/END_BASHO), `src/contexts/GameContext.tsx:112-135`, `src/engine/tick/phases/phase01_basho_bouts.ts:50`, `src/store/gameStore.ts:160`, `src/engine/worker/types.ts`
- **Severity:** High (player-facing feature is a no-op; state silently overwritten)
- **Root Cause:** `setBoutTactic` stores tactics in reducer UI state (`state.boutTactics`) only. `simulateBout`/`simulateAllBouts`/`endBasho` dispatch to the **main-thread reducer**, which calls `worldEngine.simulateBoutForToday(world, idx, playerTactic)` — the tactic influences `resolveBout`/`kimariteClassifier` and the watched result. But `sendCommand` is a bare `postMessage`; no `EngineCommand` carries tactics and `LOAD_WORLD` is only sent on save-load (`GameContext.tsx:286,304`). When `advanceDay` → `TICK_DAY` reaches the worker, the worker's `currentWorld` still has every match unplayed; `phase01_basho_bouts` re-resolves the whole day calling `simulateBoutForToday(currentWorld, 0)` **without tactics**, then `WORLD_UPDATED` overwrites the reducer world. The tactic's effect on the watched bout is discarded; if the tactic altered the outcome the persisted result differs from what the player watched. `endBasho`'s main-thread `endBasho`+`publishBanzukeUpdate` is likewise never synced — the worker re-derives basho conclusion on the next tick.
- **Evidence:** `phase01_basho_bouts.ts:50` `simulateBoutForToday(currentWorld, 0)` (no tactic param); `types.ts` has no tactic-bearing command; `sendCommand` (`gameStore.ts:160`) attaches no world. Bout physics is seed-deterministic (`boutResolver.ts:576`), so non-tactic bouts re-resolve identically — masking the defect except where tactics matter.
- **Fix:** Tactics moved onto `world.boutTactics` (field already existed on WorldState + save schema, never wired): `SET_BOUT_TACTIC` writes it, `phase01_basho_bouts` forwards `world.boutTactics[boutId]` into `simulateBoutForToday`, `simulateBoutForToday` consumes the tactic after applying it, `advanceBashoDay` clears leftovers per day. Every world-mutating bashoSlice case bumps `state.uiWorldRevision`; a GameContext effect pushes `LOAD_WORLD` to the worker whenever it changes (gated on `pendingTick`, retried when the flag clears — `sendCommand` drops commands mid-tick). The synchronous main-thread animation path is preserved; the worker can no longer diverge.
- **Verification:** `phase01_basho_bouts.tactics.test.ts` red → green; 443 context/tick tests green.
- **Residual edge:** a tactic set while `pendingTick` is true can be overwritten by the in-flight tick's WORLD_UPDATED (worker stays authoritative — correct precedence, tactic choice lost). Documented.
- **Status:** FIXED in `e74380f7`

### V5-B11: `resolveImpacts` mutates input world's `events.log` via shared reference
- **Files:** `src/engine/core/ImpactResolver.ts:409,416-428`, `src/engine/events.ts:46-53,128`
- **Severity:** Low-Medium (documented-but-fragile contract violation; currently masked)
- **Root Cause:** `resolveImpacts` does `result = { ...world }` — `result.events` aliases the input's `events` object. `logEngineEvent` → `ensureEventsState` (explicitly "mutates world.events in-place") then `events.log.push(ev)` — appending into the INPUT world's log. The shallow copy only protects top-level fields. Currently masked because callers discard the pre-tick world and `createSelector` memoizes on world-identity (new ref each tick → no stale reads).
- **Risk:** Any caller that retains the pre-resolve world (replay, diffs, undo, save-comparison, tests) observes it mutated — violating the resolver's "immutable patches" contract (ImpactResolver.ts:401).
- **Fix:** `resolveImpacts` detaches events state before logging (copies `log` + `dedupe`) whenever `result.events` still aliases the input world's object.
- **Verification:** `impactResolver.immutability.test.ts` (2 tests) red → green.
- **Status:** FIXED in `f356662a`

### V5-B10: Orphaned components + misleading constant-arg call (minor cleanup)
- **Severity:** Low
- **Findings:** (a) `ExhibitionInvitationsPanel` is tested but never mounted — `RegionalHubPage.tsx:175-214` renders `pendingExhibitions` inline instead. (b) `RequireWorld` component unused; only its `useRequireWorld` hook is consumed by pages. (c) `phase00_preflight.ts:152` calls `getInterimWeeks("hatsu","haru")` — args are ignored today (returns constant `INTERIM_WEEKS`, `calendar.ts:141`), but if the function ever becomes pair-aware the hardcoded pair silently yields wrong interim length after non-hatsu basho.
- **Fix:** (a) `ExhibitionInvitationsPanel` mounted in `RegionalHubPage.tsx` with `projectExhibitions` and command dispatches (clearing orphan audit); (b) `RequireWorld` retained as approved lightweight wrapper component; (c) `phase00_preflight.ts:152` passes dynamic current and next basho names via `getNextBashoName(current)`.
- **Status:** FIXED (v6 consolidation)

### V5-B12: `phase01_basho_bouts` silently drops world-field updates resolved inside `simulateBoutForToday`
- **Files:** `src/engine/tick/phases/phase01_basho_bouts.ts`, `src/engine/world.ts` (`simulateBoutForToday`, `advanceBashoDay`)
- **Severity:** Medium-High — latent data-loss defect exposed by the V5-B11 fix
- **Root Cause:** The phase resolves bout impacts into an intermediate `currentWorld` via internal `resolveImpacts` calls, then returns only a delta `StateImpact` — the pipeline applies that delta to the *input* world, discarding `currentWorld`. At baseline this only "worked" for `events` because `logEngineEvent` mutated the input world's `events.log` through the shared reference (the exact leak V5-B11 removed). Every other world field written inside bout resolution — `mediaState`, `rivalriesState`, `transientContext`, `playerKnowledge` — was silently dropped even at baseline; bout-driven media/rivalry/scouting updates never reached the pipeline output.
- **Symptom (post-V5-B11):** `headless-playthrough.test.ts` failed with missing `economy` + `match` event categories — all 50 bouts resolved but zero `BOUT_RESOLVED`/`AWARD_CONFERRED` events in the log.
- **Fix:** The phase now re-exports any changed world field (`events`, `boutTactics`, `mediaState`, `rivalriesState`, `transientContext`, `playerKnowledge`) through its returned impact, so internally-resolved state reaches the pipeline output.
- **Verification:** `headless-playthrough.test.ts` 9/9 green — `match/BOUT_RESOLVED: 50`, `economy` restored.
- **Status:** FIXED (this branch)

### V5-B13: Missing `combat.phases.drama` templates for `debut_showcase` and `yokozuna_hunt`
- **Files:** `src/engine/bard/domains/combat.json`, `src/engine/matchmaking/DramaMatchmaker.ts:82-84,353,368`, `src/engine/bout/boutNarrative.ts:246`
- **Severity:** Low — `BardEngine.resolve` returns `{ text: "" }` for unmapped paths, pushing a blank line into bout PBP whenever `DramaMatchmaker` labels a bout `debut_showcase` (rookie vs sanyaku) or `yokozuna_hunt` (komusubi/sekiwake vs yokozuna, days 10-14). Pre-existing; surfaced as warnings in the full suite.
- **Fix:** Added 4 variants each for both labels in `combat.json`, matching existing drama-template style and `%EAST%`/`%WEST%` tokens.
- **Status:** FIXED (this branch)

### V5-B14: BardEngine domains never preloaded in headless/test sims
- **Files:** `src/engine/bard/BardEngine.ts:93-106` (async `import()` loading), `src/bootstrap.tsx:28` (app preloads; tests do not)
- **Severity:** Low — in `advanceDaysFast`-style synchronous sims the dynamic `import()` never resolves mid-run, so every domain-path `resolve()` returns `""` (the `npc.strategy.*` warnings in the full suite). App behavior is correct (bootstrap awaits `loadDomains()`); test-only fidelity gap.
- **Fix:** `headless-playthrough.test.ts` now `await BardEngine.loadDomains()` in `beforeAll`, mirroring app bootstrap.
- **Status:** FIXED (this branch)

## PR-Level Findings (rolled into verdict table)

| PR | Finding | Disposition |
|----|---------|-------------|
| #917 | Scribe doc "fix" is factually FALSE — claims `pure` flag ignored & `touches:[]` falls back to full snapshot. Code: `pipelineRunner.ts:116` honors `pure`; `createShallowSnapshot` filters `[]`→snapshots nothing (lines 76-79). | REJECT |
| #938 | Adds second "Ozeki Promotion Watch" widget using proxy `consecutiveStrongSekiwake/3` — main already shows the REAL criterion `sekiwakeThreeBashoWins/33` (BanzukePublisher.ts:313: `>= 33 && wins >= 10`). Would render duplicate same-label widgets. | REJECT |
| #934 vs #936 | Both retype RikishiPotentialPanel. #934 wins: imports shared `NumericStat` (rikishi.ts:42), deletes `PanelStatKey` union AND redundant `CURRENT_KEY` identity map, `?? 0` guards. #936 keeps local union + identity map. | #934 CHERRY-PICK, #936 SUPERSEDED |
| #919 | 114-file PR titled "matchmaking optimization": ~90 files are prettier reformat churn (incl. trailing-comma REMOVAL vs repo config) + test-file reformatting + tsbuildinfo. The real optimization is confined to `matchmaking/LowerDivisionSwiss.ts` + `SwissAlgorithm.ts` (`.filter().sort()` → loop+sort, semantically equivalent). | CHERRY-PICK the 2 matchmaking files only |
| #920 vs #943 | Both edit `events.json` `basho.bout_title`/`bout_summary` (dead paths, V5-B04). #920's variants are richer (valid `%WINNER%/%LOSER%/%KIMARITE%/%DAY%` tokens — all in NarrativeContext). #943 uniquely enriches `kensho_*` + `day_*` (also dead paths). | Merge #943 keys + #920 bout variants (hand-merge) |
| #940 | Fixes 5 un-awaited `expect(...).resolves` assertions — latent false-positive tests. | CHERRY-PICK |
