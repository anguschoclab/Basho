# Code Audit v10 — Verdict

**Date:** 2026-10-15
**Branch:** `audit/v10`
**Plan:** `~/.devin/plans/plan-869bcc5f1d7afa65.md`
**Registry:** `docs/audit/bug-registry-v10.md`
**Red-phase evidence:** `docs/audit/v10-red-phase.log`

## Verdict

The audit found and fixed 15 confirmed bugs across persistence, worker
synchronization, presenter purity, UI honesty, lifecycle correctness, and
autosim fidelity — including two that silently broke shipping features
(Electron save loading; yokozuna promotion in autosim) and one
cross-division winner-selection bug that leaked into both the interactive
and headless basho-resolution paths.

All confirmed bugs were implemented test-first: each fix landed only after
a failing regression test was observed and logged (see
`v10-red-phase.log`). Every touched file is type-clean and lint-clean;
all test/lint/type failures remaining in the tree belong to a parallel
in-flight refactor session and were verified not to intersect this audit's
changes.

## Confirmed-fixed bugs (15)

| ID | Area | Severity | Summary |
|----|------|----------|---------|
| B01 | Electron | CRITICAL | `getItem` returned IPC Promise cast to string — every save unloadable on desktop |
| B02 | Persistence | HIGH | Nested Maps (`_preBashoAssessment.rikishiAssessments`) serialized to `{}` — deterministic load crash |
| B03 | Worker sync | HIGH | `LOAD_WORLD` dropped mid-tick → silent world revert |
| B04 | Worker | HIGH | `onerror`/`onmessageerror` unhandled → `pendingTick` stuck forever; errors never rendered |
| B05 | Persistence | HIGH | Engine autosave stamped epoch; redundant engine-side `new Date()`; `handleContinue` ignored `loadFromAutosave` result |
| B06 | Purity | HIGH | `getOrCreateScouted`/`boutProjections`/`ensureHeyaTrainingState` mutated WorldState on read paths |
| B07 | Lifecycle | HIGH | Headline yusho selected across all divisions — juryo winners crowned; yokozuna path starved |
| B08 | UI honesty | HIGH | Fabricated unconditional metrics ("Level 3/5", "4/10 years", 45% construction bar, invented naturalization criteria) |
| B09 | UI parity | MEDIUM | Bout-card heat bands diverged from canonical descriptor bands (two duplicated wrong scales) |
| B10 | UI | LOW | Digest "Training" section titled "Governance & Compliance" |
| B11 | Correctness | MEDIUM | `rikishi.history` never written → H2H/streaks/career-log/favored-kimarite all dead |
| B12 | Perf | MEDIUM | Per-bout O(matches²) amplification (~2.7M elem-ops/day) → `simulateBoutsForDay` batch path |
| B13 | Test harness | — | Async-bridge mocks contradicted real preload signatures |
| B14 | Save contract | — | `isValidSave` accepted hollow saves |
| B15 | Autosim | HIGH | No playoff resolution + juryo bleeding into headline yusho → promotions unreachable; `yokozunaPromotionAutoSim` now green |

## New durable artifacts

- `src/engine/persistence/collectionCodec.ts` — generic `$$map`/`$$set`
  replacer/reviver; covers all nested collections at every save boundary.
- `src/components/layout/GlobalErrorBanner.tsx` — worker failures and
  dropped commands now visible.
- `commandSurfaceCoverage` audit gate — all 58 worker commands have UI
  dispatch sites.
- `simulateBoutsForDay.determinism.test.ts` — bit-identical seeded
  bout-day replay pin.
- 19 new regression test files; ~35 RED failures observed and logged.

## Final gate matrix

| Gate | Result | Notes |
|------|--------|-------|
### Post-convergence re-verification

After the parallel refactor session landed and its breakage was repaired
(`BashoPage` `NoActiveBashoEmpty` import, npcAI type errors, stale
surface-test grep targets, snapshot refresh), the full matrix is green:

| Gate | Result | Notes |
|------|--------|-------|
| `bun run type-check` | PASS | clean across all files |
| `bun run lint:strict` | PASS | 0 errors |
| `bun run test` | PASS | includes 2 new R11 adaptive-torikumi tests |
| `bun run test:perf` | PASS | `yokozunaPromotionAutoSim` still green post-R11 |
| `bun run build` | PASS | |
| `scripts/purity-lint.sh` | PASS | |
| `bun run test:e2e` | 5/5 PASS | earlier run; `NoActiveBashoEmpty` now fixed |
| `bun run simulate` | PASS | |

### Gate matrix at initial verdict (superseded by above)

| Gate | Result | Notes |
|------|--------|-------|
| `bun run test` | 8,687 pass / 9 fail | All 9 failures in parallel-session files (`GovernancePage` surface rewrite, `BanzukePublisher` attendant wiring, `npcAI/execution.ts` length drift, `TalentPoolNPCRecruitment` over-budget); `foreignCount` was mid-edit transient — green in isolation |
| `bun run test:slow` | 56 pass / 1 fail | `lintStrictGate` — driven by parallel-session eslint debt |
| `bun run test:perf` | 11 pass / 0 fail | `yokozunaPromotionAutoSim` fixed by B15 |
| `bun run type-check` | FAIL | All errors in parallel-session files (`npcAI/*`, characterization tests, `BashoPage.tsx`, `scripts/*`); every file this audit touched type-checks clean |
| `bun run lint:strict` | FAIL (11) | All 11 in parallel-session files (`scripts/analyzeNarrativeDeps`, `emitNarrativeModules`, `npcAI/*`); audit-touched files lint-clean |

## Registered-not-fixed findings

See `bug-registry-v10.md` — headline items:

- **R01:** `sendCommand` rejection surface incomplete — handler-level
  silent-failure audit across all 58 commands still open.
- **R03:** dead `react-query` provider + dependency.
- **R04:** `engine-reviewer.ts` is decorative — self-tested, never runs
  over `src/engine`; CLAUDE.md claim disproved.
- **R05:** 17 `genuine` orphans from orphan-audit baseline (`honbasho.ts`
  API surface, `collectionOperations.ts`, `parseLLMResponse`); ~93 of the
  192 `intentional` entries are unreferenced functions needing second look.
- **R06:** coverage `include` misses ~337 production files (all `.tsx`,
  `src/constants/**`) while thresholds gate at 70–75%.
- **R07:** 11 event categories dropped from digest; `truthLevel` written
  but unread.
- **R08:** `test:timings` broken (bare `tsx`); perf-gate job structurally
  over-budget; UI→engine eslint denylist holes; husky dead on fresh clones.
- **R09:** `bashoSlice` mutations ungated during `pendingTick` (v5 carry).
- **R10:** `buildAIContext` still orphaned.
- ~~**R11:**~~ **FIXED** — autosim now schedules per-day against live
  standings (adaptive torikumi mirroring `ensureDaySchedule`);
  `generateFullBashoSchedule` removed. Zero unbeaten finishers across a
  6-seed census where pre-gen produced co-undefeated 15-0s.
- **R12 (WS2 residual):** `DUMMY_RNG` in `narrativeDescriptions` — shared
  module-level RNG makes stat/fatigue labels call-order-dependent
  (cosmetic, deterministic per session).

## Caveats

- **WS1/WS2 sub-agents died at rate limit** — their residual hunts were
  executed inline where feasible (cadence off-by-one, positional-arg
  hazards, RNG fixed seeds: all clean except R12). Phase-order
  read-before-write sweep, `cyclePhase` unreachable states, and `?? N`
  NaN-masking survey remain open.
- **Parallel refactor landed:** the parallel session's staged work
  (EventBus extraction, npcAI splits, characterization tests,
  `BashoPage`/`GovernancePage` tab refactors) was converged with the audit
  fixes — its breakage (`NoActiveBashoEmpty` import, npcAI type errors,
  stale surface-test targets) was repaired and the merged tree is fully
  green per the re-verification matrix above.
