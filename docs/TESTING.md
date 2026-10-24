# Testing Guide

Canonical reference for the test tiers, membership rules, and gates. Suite
sizes/timings below reflect `docs/audit/test-timings.json` (refresh:
`bun run test:timings -- <suite>`).

## The five tiers

| Tier | Location / selector | Runner | Cadence | Membership rule |
|---|---|---|---|---|
| **Fast unit** | `src/tests/unit/**` (plus any `*.test.ts(x)` under `src/`) | `bun run test` (`vitest.config.ts`: jsdom, `vmThreads`, `fileParallelism`, `fsModuleCache`) | every change / PR CI | ~963 files. Must not: import `child_process`, call `runAutoSim`, pair `generateInitialWorld` with `simulateEntireBasho`, require prior `bun run build`, or exceed the 10s per-file budget (target <2s) |
| **Slow gates** | `src/tests/slow/{audit,engine}/**` | `bun run test:slow` (`vitest.slow.config.ts`: serial, 600s timeout) | adhoc / nightly `slow-tests.yml` (parallel `slow-engine-sims` + `slow-audit-gates` jobs; audit job builds first) | spawns a subprocess (eslint/knip/madge/tsx/engine-reviewer), requires `bun run build` output, simulates months/years of game time, or scans the whole repo in a way that scales with repo growth |
| **Perf** | `src/tests/perf/**` (`*.perf.test.ts` convention) | `bun run test:perf` (`vitest.perf.config.ts`) | adhoc / nightly `perf-gate` job | timing-asserting benchmarks, not correctness gates |
| **E2E smoke** | `e2e/` matching `(golden-path\|reload-restore).e2e.test.ts` | `bun run test:e2e:smoke` (Playwright `smoke` project) | PR gate + main pushes (`e2e.yml`, 15-min timeout) | golden-path browser flows, ~30–45s local |
| **E2E soak** | `e2e/` matching `(full-basho-lifecycle\|year-of-bashos).e2e.test.ts` | `bun run test:e2e:soak` (Playwright `soak` project) | nightly + manual only (`if: schedule \|\| workflow_dispatch`, 25-min timeout) | long-horizon browser lifecycles, ~8–10 min CI (~25 min measured on dev hardware) |

Vitest configs all exclude `e2e/**` and `**/*.e2e.test.ts`; the two systems
never overlap.

## Where a test belongs — the decision rule

Tier by **execution cost category**, not by what it tests:

- **Subprocess spawning** (anything importing `child_process` — eslint, knip,
  madge, tsx, engine-reviewer) → `slow/audit/`. Never `unit/`; the meta gate
  fails.
- **Requires `bun run build` artifacts** (reads `dist/`) → `slow/audit/`
  (the audit CI job builds first).
- **Long-horizon simulation** — `runAutoSim`, or `generateInitialWorld` +
  `simulateEntireBasho` together (real worldgen × full 15-day basho ≈ 1s+ per
  pairing), or multi-hundred-day `advanceDaysFast` → `slow/engine/`.
  `simulateEntireBasho`/`advanceDaysFast`/`generateInitialWorld` *alone* on
  mock or small worlds are fine in `unit/`.
- **Whole-repo scans that scale with repo growth** (walk `src/` per entity,
  e.g. O(commands × files)) → `slow/audit/`. Single-pass fs/AST reads are fine
  in `unit/audit/` (they're how the structural gates work).
- **Timing assertions** (p50/p99 budgets) → `perf/`.
- **Browser flows** → `e2e/`; filename decides the project (`golden-path` /
  `reload-restore` → smoke; `full-basho-lifecycle` / `year-of-bashos` → soak).

**Combat tests** follow the same rule: per-bout sims on mock worlds
(`unit/engine/bout/`, ~93 files) are legitimately fast; whole-basho or
multi-basho sims on generated worlds are slow-tier; bout timing assertions
belong in `perf/`; browser-rendered lifecycle coverage is the e2e soak.

## Meta gates (`src/tests/unit/meta/`)

The suite polices itself — these run inside the fast suite:

- `noSubprocessInUnitTests` — bans `child_process` imports, `runAutoSim(`
  calls, and `generateInitialWorld`+`simulateEntireBasho` co-occurrence
  in `unit/`.
- `testTimingsBudget` — reads committed `docs/audit/test-timings.json`; fails
  if a fast file exceeds 10s measured, a baseline entry points at a
  moved/deleted file, or a fast file is unmeasured.
- `testTimeoutBudget` — bans per-test timeouts >5s in `unit/` (both
  `it("x", N)` and trailing `}, N);` forms) and `vitest.setTimeout` >30s
  anywhere.
- `factoryDiscipline` — new local entity factories outside the grandfathered
  allowlist fail; stale allowlist entries fail.
- `weakAssertionAudit` — bans assertion-free / `expect(true)`-only files.

## Timing baseline

`bun run test:timings -- <suite>` runs the suite with the JUnit reporter and
merges per-file durations (hook-inclusive — vitest's JSON reporter hides
`beforeAll` work) into `docs/audit/test-timings.json`. Suites: `fast`,
`slow`, `perf`, `e2e-smoke`, `e2e-soak`, `all`. Notes:

- Run `bun run build` before `--suite slow` (`bundleBudget` needs `dist/`).
- A mid-regen `testTimingsBudget` failure is expected and self-healing: the
  gate reads the stale committed file while the run rewrites it. The script
  warns "timings reflect a failing/partial run" but still writes; the next
  `bun run test` is green.
- Suites not run in an invocation keep their existing rows — but concurrent
  invocations can clobber each other (the file is read once at start). Run
  suites sequentially.
- jsdom setup cost is ~60–75% of single-file runs and disappears at suite
  scale — judge files by the committed baseline, not targeted runs.

## Current shape (2026-10-24 baseline)

| Suite | Files | Tests | Measured total |
|---|---|---|---|
| fast | 963 | 8,916 | ~74s file-time |
| slow | 16 | 66 | ~273s (serial) |
| perf | 5 | 14 | ~154s |
| e2e-smoke | 2 | 3 | ~40s |
| e2e-soak | 2 | 2 | ~25 min (`year-of-bashos` dominates at ~24.7m) |

Slow-tier inventory: subprocess audits (`lintStrictGate`, `knipGuard`,
`circularDependency`, `orphan-audit`, `engineReviewerGate`), build-dependent
(`bundleBudget`), long sims (`simulationInvariants`, `advanceCalendarDays`,
`yokozunaPromotionAutoSim`, `yokozunaPresence`, `autoSimCoreLoop`,
`headless-playthrough`, `junYushoIdBug`, `TournamentSimulatorJunYusho`),
repo-scaling scans (`commandSurfaceCoverage`, `phasePurity`).

## Conventions

- Prefer shared helpers: `fsScan.ts` for fs walks, `MockFactory.ts` /
  `engine/utils.ts` (`mockRikishi`, `makeMockWorld`) for entities —
  `factoryDiscipline` enforces.
- Share expensive setup: if several `it`s assert on the same sim/scan result,
  compute once in `beforeAll` (see `headless-playthrough`, `orphan-audit`).
- Seeded RNG only — never `Math.random()` in engine code paths under test.
- Under `vmThreads`, `globalThis.window` is non-configurable — spy on window
  properties, never redefine `window` itself.
