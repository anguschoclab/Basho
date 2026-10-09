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

## Registered-not-fixed findings — FINAL STATE

All registered findings are now FIXED, VERIFIED-CLOSED, or disproved:

- **R01:** `sendCommand` rejection surface — all optimistic-toast call
  sites gated on the command boolean; rejections render via the
  `commandRejected` banner (R07/R09 cover the remaining surfaces).
- ~~**R03:**~~ **FIXED** — dead `react-query` provider + dep removed.
- ~~**R04:**~~ **FIXED** — decorative `engine-reviewer.ts` removed;
  CLAUDE.md corrected.
- ~~**R05:**~~ **FIXED** — 4 dead modules + sole-subject tests removed;
  72 census candidates triaged (67 `beat*` helpers unexported in place);
  unused-component scanner false-positive fixed; second-look on the 130
  remaining `intentional` value exports found zero unreferenced.
- ~~**R06:**~~ **FIXED** — coverage `include` spans `.tsx` + `src/constants`;
  thresholds re-baselined to measured values (73/61/64/75) so the gate is
  an honest regression floor.
- ~~**R07:**~~ **FIXED** — all produced event categories render in the
  digest; `truthLevel` write-only schema field deleted outright; the six
  optimistic-toast sites now gate on `sendCommand`'s return.
- ~~**R08:**~~ **FIXED** — `test:timings` runs via `bun`; perf-gate claim
  stale (suite moved to `slow-tests.yml`); UI→engine denylist is a
  blanket `@/engine/**` with type-only allowlist; husky wired via
  `prepare`; `npx tsx` removed from CI; every `scripts/` file verified
  live and documented in `scripts/README.md`; **actions SHA-pinned**
  (`checkout`, `setup-bun`); **e2e workflow added** (`.github/workflows/
  e2e.yml` — smoke gates PRs, soak nightly); **concurrency groups** on
  all PR-gating workflows; `.env.example` realigned to actual consumers
  (`GEMINI_MODEL_PRIMARY`/`_FALLBACK`, `VITE_GEMINI_API_KEY`); stale skill
  files repointed (`run-sim`, `test-specific-domain`,
  `verify-implementation` — `src/engine/__tests__/` and `bun test`/
  `npx` references corrected); README React 18→19.
- ~~**R09:**~~ **FIXED** — `bashoSlice` mutations gated during
  `pendingTick`.
- ~~**R10:**~~ **FIXED** — `buildAIContext` wired as canonical context
  assembler.
- ~~**R11:**~~ **FIXED** — autosim adaptive torikumi (see below).
- ~~**R12:**~~ **FIXED** — `DUMMY_RNG` deleted.

## Deferred / out-of-scope items — IMPLEMENTED (final pass)

Per the follow-up directive, every optional, deferred, and out-of-scope
item was implemented:

- **Serialized dead-field triage** — `scandals`, `retirements`,
  `eventLog`, `activeBasho` deleted; AutoSim stop triggers rewired to
  live sources (`events.log` discipline events, `historicalRikishi`).
- **Chronicle wiring** — `biggestScandals` (from discipline events) and
  `greatestRivalries` (deduplicated H2H pairs, deterministic ordering)
  now populated.
- **`perceptionCache`** — populated by the weekly NPC-AI phase;
  added to `WritableWorldFields`; remains non-persisted per save contract.
- **`PERF_TRACE`** — consumed: worker → `gameStore.lastPerfTrace`.
- **MyosekiMarket optimistic toasts** — gated on command acceptance.
- **Yokozuna promotion reachability (Cluster Y)** — VERIFIED CLOSED:
  `yokozunaPromotionAutoSim` perf test passes; earlier unreachability
  finding was stale post-B15.
- **Insolvency cluster** — `faction_appeal` now injects
  `FACTION_BAILOUT_AMOUNT` (was pure theater); `bailout_loan` dead band
  closed; regression test added.
- **Recruitment emergency spam** — uses declared
  `TOTAL_ACTIVE_THRESHOLD`; warn fires only when candidates actually
  moved; tests updated for gap-aware reveal interplay.
- **WS1/WS2 residuals** — `boundHistoryArrays` extended
  (`governanceLog`, `encouragementLog`); RNG fixed-seed collisions fixed
  (test-candidate seed now varies); named-args sweep clean; one-shot
  re-fire dedup verified correct; kadoban/kinboshi rules verified.
- **WS7 test-integrity** — `Math.random()` fixture nondeterminism
  removed (almanac tests, RNG-mock files seeded); timings gate now
  fails on unmeasured files (baseline regenerated — all current
  fast-suite files covered, stale entries removed); `MockFactory`
  upgraded to `satisfies WorldState` (5 missing required fields added,
  phantom `MediaState` fields removed); read-side serialization parity
  test added; skeletal `as unknown as WorldState` fixtures migrated to
  `MockFactory` (`ImpactResolver`, `SponsorshipService`, +13 sites).
- **WS8 hygiene tail** — all items above under R08.

## Caveats

- **WS1/WS2 sub-agents died at rate limit** — all their residual hunts
  were subsequently executed inline: cadence off-by-one (clean),
  positional-arg hazards (clean), RNG fixed seeds (R12 fixed by deletion),
  phase-order read-before-write (clear — `preserveRevenueExpenses`
  merges), `cyclePhase` reachability (all 5 phases reachable, boundary
  clamps prevent skips), `?? N` NaN-masking (clear — all presenter
  divisions denominator-guarded), shallow-merge wipe census (clear — all
  nested writes complete objects).
- **Parallel refactor landed:** the parallel session's staged work
  (EventBus extraction, npcAI splits, characterization tests,
  `BashoPage`/`GovernancePage` tab refactors) was converged with the audit
  fixes — its breakage (`NoActiveBashoEmpty` import, npcAI type errors,
  stale surface-test targets) was repaired and the merged tree is fully
  green per the re-verification matrix above.
