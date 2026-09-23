# Bug Registry v7

**Date:** 2026-09-23
**Consolidation:** v7 (supersedes v6; findings derived by fresh re-read, not from prior registries)

## Method

Independent sweep: repo-wide grep passes (determinism, type escapes, security sinks,
dead command paths, console noise, tracked artifacts) + full reads of all 35 open PR
diffs (merge-base, three-dot) + targeted reads of load-bearing files
(`tickDaily.ts`, `engine.worker.ts`, `BardEngine.ts`, `h2h.ts`,
`phase05_monthly_boundary.ts`, `save.ts`, `pipelineRunner.ts`, contexts/slices).

## Bugs / Defects Found

### V7-B01: `PREPAY_LOAN` command path is dead — loan prepayment unreachable
- **Files:** `src/engine/worker/types.ts:24`, `src/engine/worker/engine.worker.ts:737`,
  `src/engine/loans.ts:238` (`prepayLoan` — fully implemented via ImpactBuilder)
- **Severity:** Medium (player-facing feature gap)
- **Root Cause:** Handler + engine fn exist end-to-end, but no UI site dispatches
  `PREPAY_LOAN` (zero references outside worker/types/tests). Same failure class as
  historical governance/media vertical-slice gaps.
- **Fix:** Wire a "Prepay" affordance per active loan in
  `src/components/economy/DebtSection.tsx` dispatching
  `sendCommand({ type: "PREPAY_LOAN", heyaId, loanId })`, guarded by funds check.
- **Status:** CONFIRMED — fix scheduled (Wave 5 + Phase 5)

### V7-B02: `PAUSE_SIM` / `RESUME_SIM` dead — auto-sim cannot be paused
- **Files:** `src/engine/worker/engine.worker.ts:121,171,219,791-798`,
  `src/engine/worker/types.ts:36-37`
- **Severity:** Low-Medium (built-but-unreachable UX control)
- **Root Cause:** `simPaused` is honored at the top of both multi-day tick loops, and
  handlers exist, but no UI dispatches either command. A user starting a multi-week
  auto-advance has no interrupt short of waiting.
- **Fix:** Expose pause/resume control where `TICK_MULTIPLE_DAYS`/`AUTO_SIM_DAYS`
  is triggered (`GameContext.tsx:152-159` / `gameStore.ts:150`), or remove the
  commands. Decision: wire minimal pause/resume in the sim progress affordance.
- **Status:** CONFIRMED — fix scheduled (Phase 5)

### V7-B03: `CLEAR_TSUKEBITO` dead command (redundant with `REMOVE_TSUKEBITO`)
- **Files:** `src/engine/worker/types.ts:104`, `src/engine/worker/engine.worker.ts:623`
- **Severity:** Low (dead code)
- **Root Cause:** Handler clears all juniors for a senior; UI only ever dispatches
  `REMOVE_TSUKEBITO` (single) — no clear-all affordance exists.
- **Fix:** Remove `CLEAR_TSUKEBITO` type + handler (zero-compat consolidation
  permits API removal), OR wire a clear-all button. Decision at fix time; default:
  delete dead surface.
- **Status:** CONFIRMED — disposition: REMOVE (documented)

### V7-B04: `GET_DIGEST` dead command
- **Files:** `src/engine/worker/types.ts:38`, `src/engine/worker/engine.worker.ts:799`
- **Severity:** Low
- **Root Cause:** Every mutating handler already calls `syncAndDigest()`; nothing
  ever needs a standalone digest pull.
- **Fix:** Remove type + handler (same rationale as V7-B03).
- **Status:** CONFIRMED — disposition: REMOVE (documented)

### V7-B05: Generated artifacts tracked in repo root
- **Files:** `simulation-results.json`, `test-list.txt`, `test-results.json`
  (all tracked; `simulation-results.json` is even listed in `.gitignore:38`)
- **Severity:** Low (hygiene; churn + confusion risk)
- **Fix:** `git rm --cached` all three; add `test-list.txt` + `test-results.json`
  to `.gitignore`.
- **Status:** CONFIRMED — fix scheduled (Phase 5)

### V7-B06: `CLAUDE.md` documents stale coverage thresholds
- **File:** `.claude/CLAUDE.md` ("lines 60%, branches 50%")
- **Severity:** Low (doc truthfulness)
- **Root Cause:** `vitest.config.ts` actual thresholds are lines 70 / branches 75 /
  functions 65 / statements 70.
- **Fix:** Correct CLAUDE.md (folds into Phase 8 metrics update).
- **Status:** CONFIRMED — fix scheduled

### V7-B07: `bun run type-check` broken on Windows
- **File:** `package.json:15` (`node_modules/@typescript/native/bin/tsc --build --force`)
- **Severity:** Medium (gate unreachable on Windows without workaround)
- **Root Cause:** bun cannot exec the POSIX shebang bin `tsc` on Windows (no .cmd
  shim); binary works via `node node_modules/@typescript/native/bin/tsc`.
- **Fix:** Change script to `node node_modules/@typescript/native/bin/tsc --build
  --force` — portable across shells/OSes.
- **Status:** CONFIRMED — fix scheduled (Phase 5)

### V7-B08: 32 `console.*` calls in production code bypass Logger
- **Files:** 14+ incl. `boutResolver.ts`, `StateImpact.ts`, `BashoManager.ts`,
  `tickDaily.ts`, `TrainingService.ts`, `RivalryService.ts`
- **Severity:** Low (log hygiene; noise in production console)
- **Fix:** Route through `src/engine/utils/Logger.ts` (`warn`/`log`) or remove
  debug leftovers; codemod per file, keeping worker-context logs intentional.
- **Status:** CONFIRMED — fix scheduled (Phase 5, low priority)

### V7-B09: orphan-audit test writes fixtures into `src/engine/systems/`
- **File:** `src/tests/unit/audit/orphan-audit.test.ts:237` (and sibling at ~NsProbe)
- **Severity:** Low (test-harness fragility)
- **Root Cause:** `__audit_coll_<ts>__` / ns fixture dirs are created inside the
  source tree so the orphan scanner can see them; `finally` cleanup covers normal
  runs, but a kill/timeout leaves residue that the *next* orphan audit would flag.
  Observed live during baseline run (dir existed mid-run, cleaned on completion).
- **Fix:** Add an `afterAll` sweep removing any `__audit_*` remnants under
  `src/engine/systems/` (belt-and-suspenders alongside finally).
- **Status:** CONFIRMED — fix scheduled (Phase 5, low priority)

### V7-B10: `phase06_narrative` context relies on implicit lowercase token fallback
- **File:** `src/engine/tick/phases/phase06_narrative.ts:125` (ctx keys `shikona`,
  `heya` lowercase; templates use `%SHIKONA%`/`%HEYA%`)
- **Severity:** None — **DISPROVED as defect.** `BardEngine.interpolate`
  (`BardEngine.ts:225`) resolves `context[key] ?? context[key.toLowerCase()]`, so
  `%SHIKONA%` → `context.shikona` correctly. PR #980's added uppercase keys are
  harmless redundancy, not a fix.
- **Status:** DISPROVED (works correctly via fallback; recorded to prevent
  future mis-triage)

### V7-B11: `.jules/*.md` bot journals tracked on remote branches
- **Severity:** Low (process)
- **Root Cause:** `.gitignore:92` lists `.jules/` but bots committed journal files
  to their branches; gitignore does not protect merges of already-tracked files.
- **Fix:** Strip `.jules/` (and `screenshot.png` in #975) from every merge.
- **Status:** CONFIRMED — enforced in every wave merge

### V7-B12: `AdvisorService` roster injured-count semantics change (PR #993)
- **File:** `src/engine/advisor/AdvisorService.ts` (rosterRecommendations)
- **Severity:** Low (semantic delta inside a "pure perf" PR)
- **Root Cause:** Original counts injured across ALL roster ids (`r && r.injured`);
  PR's fused loop counts injured only among non-retired. New semantics are more
  consistent (injured ratio should be of active roster) — accept deliberately.
- **Fix:** Accept semantic change; pin the new behavior with an explicit test
  (retired-but-injured excluded) — NOT a silent equivalence assumption.
- **Status:** CONFIRMED (deliberate semantic change — test-pinned)

### V7-B13: `getHeyaRoster`/`getHeyaStyleBias` module caches keyed by (heyaId, week) only — cross-world contamination
- **File:** `src/engine/queries.ts:126-159`
- **Severity:** Medium — confirmed live contamination: two `WorldState` objects in
  the same process sharing `heyaId` + `week` receive the first world's roster.
  Reproduced: `phase01_week_welfare(w2)` emitted `inj→act1` from world 1's roster.
  In production: a new `LOAD_WORLD` at the same week number (new game) or any
  second world in-process inherits stale rosters; mid-week `rikishiIds`
  membership changes are also served stale until the weekly
  `clearQueryCaches()` at `tickDaily.ts:136`.
- **Root Cause:** `rosterCache`/`styleBiasCache` are module-level `Map`s keyed by
  `${heyaId}` with only `world.week` as the freshness token — no world identity.
- **Fix:** Re-key caches per world (`WeakMap<WorldState, Map<heyaId, {week, roster}>>`)
  or include `world.id` in the key; also clear on `LOAD_WORLD` in the worker.
- **Reproducer:** `src/tests/unit/engine/v7Equivalence.test.ts` —
  "a second world at the same week does not inherit the first world's roster" (RED).
- **Status:** CONFIRMED — fix scheduled (Phase 5)
