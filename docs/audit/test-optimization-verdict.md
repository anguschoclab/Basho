# Test Suite Optimization — Verdict

Generated: 2026-10-08 · Implements `docs/test-suite-optimization-plan.md`

## Measured outcome

| Metric                               | Before                                 | After           | Method                                                            |
| ------------------------------------ | -------------------------------------- | --------------- | ----------------------------------------------------------------- |
| `bun run test` wall clock            | ~50+ min baseline → 66s post-vmThreads | **~25s**        | `vmThreads` + `fileParallelism` + `fsModuleCache`                 |
| `bun run test:slow` (hook-inclusive) | 511s                                   | **174s**        | In-file consolidation (see below)                                 |
| `bun run test:perf`                  | —                                      | 129.5s          | measured; **1 pre-existing failure** noted below                  |
| Fast suite size                      | 864 files                              | 866 files       | +3 meta gates, +moved files                                       |
| Dead subjects found                  | —                                      | **0 deletions** | `find-dead-test-subjects.ts` (1 intentional pin: `menu-core.tsx`) |

**Pre-existing failure (not from this work):**
`src/tests/perf/yokozunaPromotionAutoSim.perf.test.ts` fails deterministically —
the seeded `runAutoSim` does not produce a yokozuna promotion within 18 basho
under current engine tuning. Only the filename changed here; the same sim
outcome was already failing before this pass (the nightly perf job is the only
runner, so it went unnoticed). Engine-balance fix is out of scope.

Environment overhead share: ~75% of runtime → ~7% (vmThreads).

## What was done, by plan phase

### Phase 0 — Instrumentation

- `scripts/report-test-timings.ts` — per-file timing reporter; **uses the JUnit
  reporter** because vitest's JSON `duration` excludes hook time (the
  consolidated `beforeAll` sims would read as 0s).
- `docs/audit/test-timings.json` — committed baseline, regenerated via
  `bun run test:timings -- <suite>`.
- `slowTestThreshold: 2000` in `vitest.config.ts` — slow tests flagged inline.

### Phase 1 — Dead/obsolete audit

- `scripts/find-dead-test-subjects.ts` — resolves real import specifiers
  (template-literal fixture code stripped) and `join(BASE, ...)` chains via
  const-binding analysis. Result: **one** flagged path,
  `src/components/ui/menu-core.tsx` — intentional regression pin asserting the
  file stays deleted (`toBe(false)`). Zero dead subjects = zero deletions.
- ci-gates filename registry: kept as-is — the `toContain(filename)` assertions
  are deliberate required-coverage pins, not incidentally fragile.

### Phase 2 — Consolidation

- **`src/tests/helpers/fsScan.ts`** — canonical `findFiles`/`collectSource`/
  `readSrcFile`/`readRepoFile`/`listSrcDir` + `SRC`/`REPO_ROOT` anchors.
  Migrated ~30 local helper definitions across 26 files (19 identical
  `readFile` bodies codemodded; `walk`/`collectFiles`/`findTsFiles`/
  `findMdFiles`/`findTestFiles`/`findSnapshotFiles` folded into `findFiles`).
- **Duplicate gate removed**: `headless-playthrough`'s "wired state fields are
  read by UI" scan deleted — `ci-gates` `UI_READ_FIELDS` is a strict superset
  (adds `candidatePool`, `lineage`, plus `INTERNAL_ONLY_FIELDS` docs).
- **In-file redundant work collapsed**:
  - `headless-playthrough`: 7 identical 364-day sims → 1 shared `beforeAll` sim.
  - `simulationInvariants`: 4 × ~106s 3-year `runAutoSim` → 1 shared sim
    (**425s → 103s**; per-seed variety was incidental, not semantic).
  - `lintStrictGate`: 2 × `bunx eslint .` → 1 `--format json` run feeding both
    assertions (~26s, halved).
  - `orphan-audit`: 7 × `audit-orphans.ts` subprocess runs → 3 (consistency
    pair shared; the 3 fixture scenarios merged into one scan — disjoint
    symbols).
  - `advanceCalendarDays`: 10 generated-world advances → 3 shared worlds.

### Phase 3 — Reorganization

- `unit/` root cleared: `ErrorBoundary`, `ui-ref-forwarding` → `components/`;
  `bootstrap`, `react-compiler-gate`, `react-version`, `toolchain-version`,
  `vite-config`, `useref-types` → `build/`.
- New `src/tests/unit/meta/` for suite-self gates: `noSubprocessInUnitTests`,
  `testTimeoutBudget`, `weakAssertionAudit`, `testTimingsBudget` (new),
  `factoryDiscipline` (new).
- Perf naming normalized: `simulationDeterminism.perf.test.ts`,
  `tournamentSimulatorPerf.perf.test.ts`.

### Phase 4 — Performance

- `fileParallelism: true` on the fast config — verified safe: only two unit
  files write to disk and both use unique `tmpdir()` paths; the fixture-writing
  tests live in `slow/` (which stays serial — `orphan-audit` writes into `src/`
  while knip/madge scan it). **66s → 27.7s** wall.
- `fsModuleCache: true` + removed `--no-cache` — the flag never prevented stale
  results (vitest always re-executes tests); it only disabled the transform
  cache. Warm-run transform share: 29% → 7%.
- Slow-suite parallelism: **solved by consolidation, not concurrency** —
  `simulationInvariants` was 83% of the suite; sharing one sim removed the
  bottleneck without racing `orphan-audit`'s `src/` fixtures. The nightly
  workflow now runs `slow-engine-sims` and `slow-audit-gates` as parallel jobs.
- Coverage: already scoped correctly (`coverage.include` lists production
  dirs only; `test:coverage` uses the fast config which excludes slow/perf).

### Phase 5 — Guardrails

- `meta/noSubprocessInUnitTests` — extended: `runAutoSim` banned in `unit/`
  (always long-horizon; `generateInitialWorld`/`advanceDaysFast` stay legal —
  fast on small mock worlds).
- `meta/testTimingsBudget` — fails if any fast-suite file exceeds 10s measured
  duration in the committed baseline (headroom absorbs parallel-contention
  inflation), or the baseline references moved files.
- `meta/factoryDiscipline` — fails if a non-allowlisted test file defines a
  local `makeWorld`/`makeRikishi`/`makeHeya`/`mockRikishi`/`createMockWorld`-class
  factory. 132 existing offenders grandfathered in an allowlist (signature
  census: most are custom-signature builders — mass migration deferred per the
  plan's risk section; the list shrinks opportunistically, and a second test
  fails if an entry goes stale).
- `slow-tests.yml` — `concurrency` group cancels superseded runs; split into
  parallel engine-sims / audit-gates jobs.

## Deliberately not done

- **Mass factory migration** (132 files): signature census showed the majority
  are custom-signature builders, not bare duplicates — blind migration risks
  silently changing mock defaults. Gated against growth instead.
- **Dead-test deletions**: the subject scan found none — suite is clean.
- **`--root` flag on `audit-orphans.ts`**: evaluated for test isolation;
  unnecessary once fixture scenarios share one scan run.

## How to verify

```bash
bun run test            # ~26s, 866 files
bun run test:slow       # ~3min, 11 files
bun run test:timings -- all   # regenerate docs/audit/test-timings.json
```

## Curation pass — fast/slow re-tier (2026-10-24)

Re-measured all suites into `docs/audit/test-timings.json` and re-tiered the
categorical fast-suite violators found. RED→GREEN verified through the
meta-gate suite (evidence below).

### Demotions (3 files — two violation categories)

| File | Measured | Category | Destination |
|---|---|---|---|
| `unit/engine/simulation/TournamentSimulatorJunYusho.test.ts` | 4,856–5,402ms | generated-world basho harness (`generateInitialWorld`+`simulateEntireBasho` ×5) | `slow/engine/simulation/` |
| `unit/engine/simulation/junYushoIdBug.test.ts` | 4,153–4,720ms | generated-world basho harness (×4) | `slow/engine/simulation/` |
| `unit/audit/commandSurfaceCoverage.test.ts` | 2,515–2,796ms | whole-repo scan, O(commands × files) re-walk — scales with repo growth | `slow/audit/` |

### Slow-tier dispositions (all 16 files — kept)

| File | Measured | Rule satisfied |
|---|---|---|
| `simulationInvariants` | 145.2s | 3-year `runAutoSim` |
| `orphan-audit` | 56.0s | `npx tsx` subprocess + writes `__audit_*` fixtures into `src/` (self-cleans) |
| `lintStrictGate` | 28.2s | `bunx eslint` subprocess |
| `yokozunaPromotionAutoSim` | 11.5s | `runAutoSim` multi-basho |
| `advanceCalendarDays` | 7.7s | long-horizon tick sim |
| `autoSimCoreLoop` | 6.0s | `runAutoSim` (relocated v13; baseline row added this pass) |
| `yokozunaPresence` | 6.0s | multi-basho generated-world sim |
| `knipGuard` | 3.0s | `knip` subprocess |
| `TournamentSimulatorJunYusho` | 2.6s | demoted this pass |
| `circularDependency` | 2.3s | `madge` subprocess |
| `commandSurfaceCoverage` | 2.0s | demoted this pass |
| `junYushoIdBug` | 1.8s | demoted this pass |
| `headless-playthrough` | 0.6s | 364-day `advanceDaysFast` (long-horizon rule) |
| `phasePurity` | 0.1s | not strictly categorical — ts-morph project load; kept for `slow/audit` cohesion (promotion candidate if that dir ever splits) |
| `engineReviewerGate` | 0.1s | `bun scripts/engine-reviewer.ts` subprocess (baseline row added this pass) |
| `bundleBudget` | 0.0s | requires `dist/` — build-dependent |

### Guardrail changes

- `noSubprocessInUnitTests` gained a third rule: `generateInitialWorld` ×
  `simulateEntireBasho` co-occurrence is banned in `unit/` (the harness
  signature). Authored **before** the moves and observed RED naming exactly
  the two files.
- `testTimeoutBudget` hole closed: now also catches the trailing
  `}, N);` timeout form (how the demoted files' eight `60000` budgets went
  unnoticed), scoped to `unit/` — `slow/` legitimately uses 60–900s timeouts.
- `report-test-timings.ts` gained `e2e-smoke`/`e2e-soak` suites via
  Playwright's JUnit reporter (`PLAYWRIGHT_JUNIT_OUTPUT_NAME`); e2e files are
  recorded by basename under their own suite keys.

### RED→GREEN evidence

1. New co-occurrence rule committed-in-tree → `noSubprocessInUnitTests` RED,
   naming `TournamentSimulatorJunYusho` + `junYushoIdBug` (2 violations).
2. `git mv` × 3 → `testTimingsBudget` RED on stale baseline paths (all 3).
3. `bun run test:timings -- fast` regen → all meta gates GREEN (149 tests).
4. Targeted slow run of moved files → 10/10 green (6.56s).

### Consequences & watchlist

- Fast suite: 966 → 963 files, ~−12.9s measured (top file now
  `duplicateExportGate` 2.6s — parallel-contention variance, watchlist).
- Slow suite: 13 → 16 files; engine job +~9s, audit job +~2s measured.
- Fast watchlist (1–2s band, no action): `duplicateExportGate` 2.6s,
  `HistoryDashboard` 1.8s, `tacticWinRate` 1.7s, `worldCircuit` 1.4s,
  `replacementLoop` 1.3s, `RosterList`/`RecruitingTab`/`TalentPoolPage` ~1.1s.
- `docs/TESTING.md` created — canonical five-tier matrix incl. e2e smoke/soak
  placement and the combat-test granularity rule.
- Timing-script caveat discovered: suites read the JSON at process start, so
  concurrent `--suite` runs clobber each other — run them sequentially (a
  `--xml` re-parse repairs any lost suite without re-running it).
