# Bug Registry v9

**Date:** 2026-10-06
**Baseline:** `d0d585ff` (origin/main after v8 tail landed)
**Consolidation:** v9 (supersedes v8; findings derived by fresh re-read, not from prior registries)
**Staleness:** Current — prior registries are superseded by this document;
the grep/command-surface sweep methodology described below is the active v9
methodology, not a superseded one.
**Method:** Command-surface enumeration (59 worker handlers × dispatch-site grep),
slice world-mutation audit vs `uiWorldRevision`, determinism/purity/console/`as any`
greps, save/load path trace, prior-verdict carry-forward. v8 (2026-10-01) had already
cleared the historical registry — this registry covers only fresh deltas.

## Confirmed Bugs

### V9-B01: Save import silently regenerates the world — player save data discarded

- **Files:** `src/pages/MainMenu.tsx:246-254`, `src/hooks/useSaveSlotManager.ts:66-80`,
  `src/components/menu/SaveSlotManager.tsx:42`
- **Severity:** High (silent data loss on a player-facing flow)
- **Mechanism:** `SaveSlotManager` accepts `loadWorldDirect` for imports but MainMenu
  never passes it. The fallback calls `createWorld(importedWorld.seed, importedWorld.playerHeyaId)`
  → `START_WORLD` → the worker **generates a brand-new world from the seed** —
  the imported save's entire progress is discarded. The player sees a successful
  import and lands on day 0 of a fresh timeline.
- **Fix:** Add `loadWorldDirect(world: WorldState)` to `GameContext` (dispatches
  `actions.loadWorld` + `sendCommand LOAD_WORLD` — same pairing as `loadFromSlot`),
  pass it through `SaveSlotManager` → `useSaveSlotManager`. Tighten the prop type
  from `unknown` to `WorldState`.
- **Status:** FIXED on `consolidation/v9`.

### V9-B02: Dead auto-sim tri-path — engine feature unreachable + reducer path would desync

- **Files:** `src/engine/worker/types.ts:15` (`AUTO_SIM_DAYS`),
  `src/engine/worker/engine.worker.ts:237` (handler), `src/store/gameStore.ts:158`,
  `src/contexts/GameContext.tsx:292-300,445,467` (`runAutoSim`/`runAutoSimAction` —
  exposed twice in the context value), `src/contexts/timeSlice.ts:23-27`,
  `src/contexts/gameTypes.ts:97`, `src/contexts/gameActions.ts:158-161`
- **Severity:** Medium (dead surface + latent correctness trap)
- **Mechanism:** The full vertical slice exists — engine `runAutoSim`, worker
  `AUTO_SIM_DAYS` handler, reducer `RUN_AUTO_SIM`, context methods — but zero UI
  sites dispatch any of it (grep-verified across pages/components/hooks). Worse,
  the `RUN_AUTO_SIM` slice case sets `world` without bumping `uiWorldRevision`,
  so if anything ever dispatched it, the worker's next `WORLD_UPDATED` would
  silently revert the whole simulation (same class as v8-B12).
- **Fix:** Remove the stranded paths: `AUTO_SIM_DAYS` (type + handler + store
  branch + its test blocks across 5 worker test files), `RUN_AUTO_SIM` (union
  member + slice case + action creator + both context exposures + type entries),
  `timeSlice.test.ts` RUN_AUTO_SIM cases. Keep `src/engine/autoSim.ts` +
  `AutoSimService` — used by `bun run simulate` and sim tests.
- **Status:** FIXED on `consolidation/v9`.

### V9-B03: Dead `RUN_HOLIDAY` reducer path (holiday runs via worker)

- **Files:** `src/contexts/timeSlice.ts:5-21`, `src/contexts/gameTypes.ts:96`,
  `src/contexts/gameActions.ts:147-150`
- **Severity:** Low (dead code + latent desync trap)
- **Mechanism:** `HolidayDialog` dispatches `GO_ON_HOLIDAY` → worker runs
  `runHoliday` and syncs. The `RUN_HOLIDAY` action + creator + slice case are
  never dispatched (grep-verified) and also lack the `uiWorldRevision` bump.
- **Fix:** Removed with B02. `timeSlice.ts` deleted outright (both its cases
  were dead); `HolidayResult`/`AutoSimResult` imports dropped from the contexts.
- **Status:** FIXED on `consolidation/v9`.

### V9-B04: Dead `SET_PLAYER_HEYA` action — `heyaSlice.ts` is a zombie file

- **Files:** `src/contexts/heyaSlice.ts` (entire file), `src/contexts/gameTypes.ts:87`,
  `src/contexts/gameActions.ts:43-46`, `src/contexts/gameReducer.ts:17,93`
- **Severity:** Low
- **Mechanism:** Zero dispatch sites; the case writes `world.playerHeyaId` without
  `uiWorldRevision` bump. Player-heya assignment lives in `CREATE_WORLD`/
  `START_WORLD` flows.
- **Fix:** Removed — `heyaSlice.ts` deleted, union member + creator + reducer
  registration dropped.
- **Status:** FIXED on `consolidation/v9`.

### V9-B05: Dead `CREATE_WORLD` reducer case — main-thread world generation

- **Files:** `src/contexts/gameReducer.ts:9-14,26-58`, `src/contexts/gameTypes.ts:82-86`,
  `src/contexts/gameActions.ts:26-35`
- **Severity:** Low-Medium (divergence trap, not live-broken)
- **Mechanism:** Production never dispatches `CREATE_WORLD` — only tests do
  (`coreSlice.oyakata.test.ts`, `gameReducer.test.ts`). `GameContext.createWorld`
  correctly routes through worker `START_WORLD` (see comment at GameContext.tsx:130-138:
  worker is single source of truth precisely to prevent main/worker generation
  divergence). Keeping a second generation path in the reducer invites exactly
  that divergence. The `generateWorld` adapter's `playerConfig` param is also
  vestigial — accepted but never forwarded.
- **Fix:** Removed — case, action creator, adapter, and now-unused
  `generateInitialWorld`/`applyOyakataCreationConfig` imports. Tests migrated:
  `coreSlice.oyakata.test.ts` deleted (it tested only the dead path; oyakata-config
  application is covered engine-side via `applyOyakataCreationConfig` tests +
  worker `START_WORLD` tests), `gameReducer.test.ts` CREATE_WORLD case switched
  to LOAD_WORLD for the immutability assertion.
- **Status:** FIXED on `consolidation/v9`.

### V9-F01: `golden-path.e2e.test.ts` races worker ticks — clicks dropped, loop exhausts before first advance lands

- **Files:** `e2e/golden-path.e2e.test.ts` (rewritten), reproduced against baseline
  `d0d585ff` — pre-existing, not a v9 regression.
- **Severity:** Test-only (flaky E2E), but masked real app behavior on slow runs.
- **Mechanism (root-caused via instrumented probe, 2026-10-06):** The test's
  hand-rolled advance loop clicked the calendar **Week** button every ~500ms for
  up to 60 iterations. `sendCommand` drops any command while `pendingTick` is set
  (store: "Command TICK_MULTIPLE_DAYS dropped - tick in progress"), and a 7-day
  worker tick under a dev build takes far longer than 500ms — so nearly every
  click was discarded and the loop exhausted before the first `WORLD_UPDATED`
  landed. The failure snapshot's "Week 1 · Off-Season" was simply the world
  pre-first-tick, not a frozen sim. A second observed mode: the first tick lands
  mid-`active_basho` while the page auto-sits on `/basho`, where none of the
  loop's four locators exist. The naive loop also resolved no crisis modals and
  used raw `.click()` with no bounded actionability timeout.
- **Fix:** Rewrote the spec to use the shared helpers (`createNewGame`,
  `dismissOnboardingTour`, `advanceToBasho`, `driveBashoToRecap`,
  `finalizeRecap`) that the other lifecycle specs already use — they poll live
  world state, handle the mid-basho `/basho` redirect, resolve crisis modals,
  and DOM-click through stale Radix overlays. Verified passing in ~22s.
- **Status:** FIXED (post-merge commit).

- **A01: Dual mock factories.** `src/tests/helpers/utils/MockFactory.ts` (118
  consumers) vs `src/tests/unit/engine/utils.ts` (`mockRikishi`, 8 consumers).
  Different APIs, no correctness issue. Debt note only.
- **A02: `worker-command-surface.md`** lists a subset of commands; the surface
  itself is sound — all 59 command types have handlers, the 7 handler-less types
  are worker→UI responses. Only `AUTO_SIM_DAYS` lacked dispatch (→B02).
- **A03: `/museum` route for HistoryDashboard** — intentional, documented.
- **A04: test-side `as any`** — v8 assessed (production code has zero; test
  exemption is deliberate). Re-verified: still zero in `src/` outside tests.
- **A05: determinism** — `Math.random|Date.now` grep over `src/engine` is clean
  (2 comment matches only). `purity-lint.sh` green.
- **A06: `processHeyaFinances`/`tickWeekEconomics`** — gone; only the canary
  strings in `engineReviewerSelfTest.test.ts` remain (by design).

## Doc Drift

- **D01: CLAUDE.md slice list** — names `coreSlice, financeSlice, rosterSlice,
bookmarkSlice` as files. Reality: `bashoSlice`, `timeSlice`, `heyaSlice` +
  `coreSlice` inside `gameReducer.ts`. (After B03/B04 fixes: `bashoSlice` +
  `coreSlice` only.)
- **D02: CLAUDE.md mock-factory line** — points at `src/tests/unit/engine/utils.ts`
  (8 consumers); the dominant factory is `src/tests/helpers/utils/MockFactory.ts`
  (118 consumers).
- **D03: `bookmarkSlice.ts` open in IDE** — file does not exist in the repo and
  never has (no git history); stale editor tab.
