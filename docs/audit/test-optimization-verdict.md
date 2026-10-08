# Test Suite Optimization — Verdict

Generated: 2026-10-08 · Implements `docs/test-suite-optimization-plan.md`

## Measured outcome

| Metric                               | Before                                  | After           | Method                                                            |
| ------------------------------------ | --------------------------------------- | --------------- | ----------------------------------------------------------------  |
| `bun run test` wall clock            | ~50+ min baseline → 66s post-vmThreads  | **~25s**        | `vmThreads` + `fileParallelism` + `fsModuleCache`                 |
| `bun run test:slow` (hook-inclusive) | 511s                                    | **174s**        | In-file consolidation (see below)                                 |
| `bun run test:perf`                  | —                                       | 129.5s          | measured; **1 pre-existing failure** noted below                  |
| Fast suite size                      | 864 files                               | 866 files       | +3 meta gates, +moved files                                       |
| Dead subjects found                  | —                                       | **0 deletions** | `find-dead-test-subjects.ts` (1 intentional pin: `menu-core.tsx`) |

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
