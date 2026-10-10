# Scripts

Manual dev/audit tooling. None of these are invoked by CI or `package.json`
unless noted — they are run ad hoc: `bun scripts/<name>.ts`.

## Audit & gates (referenced by tests/CI)

| Script                      | Purpose                                                                                                                                                                                     |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `audit-orphans.ts`          | Regenerates `.windsurf/audit/baseline-orphans.json` (unreferenced exports, orphan routes, unticked services, unused components). Consumed by `unreferenced-exports` / `orphan-audit` tests. |
| `orphanTracker.ts`          | Renders the orphan baseline as CSV (`.windsurf/audit/orphan-tracker.csv`).                                                                                                                  |
| `engine-reviewer.ts`        | Static checker for removed-API reintroduction (e.g. `processHeyaFinances`) and unannotated world-builder writes. Wired as `src/tests/slow/audit/engineReviewerGate.test.ts`.                |
| `bench-pipelines.ts`        | Tick-pipeline benchmarks (S1 day / S2 week / S3 year). Run by `perf-gate.yml` via `bun`.                                                                                                    |
| `perf-gate-check.ts`        | Compares a perf run against `docs/audit/perf-baseline.json`; fails on >15% regression. Seeds the baseline if missing.                                                                       |
| `report-test-timings.ts`    | Regenerates the `docs/audit/test-timings.json` budget baseline (`bun run test:timings -- <suite>`).                                                                                         |
| `measureFunctions.ts`       | AST function/const-object length measurement; source data for the `functionLengthBudget` ratchet test.                                                                                      |
| `purity-lint.sh`            | Greps engine hot paths for `Math.random`/`Date.now` purity violations. Referenced by `perf-gate.yml`.                                                                                       |
| `check-package-manager.mjs` | `preinstall` hook — blocks non-bun installs.                                                                                                                                                |

## Diagnostics & measurement (manual)

| Script                                                                                    | Purpose                                                                                      |
| ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `determinism-double-run.ts`                                                               | Runs the sim twice from one seed and diffs state — determinism repro.                        |
| `diagnostic-25yr-sim.ts`                                                                  | 25-year diagnostic simulation run.                                                           |
| `repro-year.ts`                                                                           | Reproduces a specific sim year for debugging.                                                |
| `yokozuna_sim.ts`                                                                         | Yokozuna promotion-path simulation probe.                                                    |
| `verify-training-decay.ts`                                                                | Verifies training decay curves against expected values.                                      |
| `measure-kimarite-distribution.ts`                                                        | Kimarite outcome distribution census (`bun run measure:kimarite`).                           |
| `measure-events.ts` / `measure-growth.ts` / `measure-rikishi.ts` / `measure-breakdown.ts` | One-off simulation metric probes (event rates, stat growth, rikishi census, cost breakdown). |
| `test-agents.ts`                                                                          | NPC-AI agent decision probe.                                                                 |
| `list-models.ts`                                                                          | Lists configured LLM models (narrative tooling).                                             |

## Narrative tooling (manual)

| Script                       | Purpose                                                                                       |
| ---------------------------- | --------------------------------------------------------------------------------------------- |
| `bard-orchestrator.ts`       | BardEngine domain generation orchestrator (see `.github/workflows/autonomous-narrative.yml`). |
| `analyzeNarrativeDeps.ts`    | Narrative template dependency analysis.                                                       |
| `emitNarrativeModules.ts`    | Emits narrative domain modules.                                                               |
| `check-jsdoc.ts`             | JSDoc coverage checker.                                                                       |
| `designScan.ts`              | Design-token/style scan.                                                                      |
| `compare-engines.ts`         | Compares bout-physics engine variants (B+ review tooling).                                    |
| `find-dead-test-subjects.ts` | Finds tests whose subjects no longer exist.                                                   |
