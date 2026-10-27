# Scripts

Manual dev/audit tooling. None of these are invoked by CI or `package.json`
unless noted — they are run ad hoc: `bun scripts/<group>/<name>.ts`.

## Audit & gates (referenced by tests/CI)

| Script                          | Purpose                                                                                                                                                                                     |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `audit/audit-orphans.ts`        | Regenerates `.windsurf/audit/baseline-orphans.json` (unreferenced exports, orphan routes, unticked services, unused components). Consumed by `unreferenced-exports` / `orphan-audit` tests. |
| `audit/orphanTracker.ts`        | Renders the orphan baseline as CSV (`.windsurf/audit/orphan-tracker.csv`).                                                                                                                  |
| `audit/engine-reviewer.ts`      | Static checker for removed-API reintroduction (e.g. `processHeyaFinances`) and unannotated world-builder writes. Wired as `tests/slow/audit/engineReviewerGate.test.ts`.                      |
| `measure/bench-pipelines.ts`    | Tick-pipeline benchmarks (S1 day / S2 week / S3 year). Run by `perf-gate.yml` via `bun`.                                                                                                      |
| `audit/perf-gate-check.ts`      | Compares a perf run against `docs/audit/perf-baseline.json`; fails on >15% regression. Seeds the baseline if missing.                                                                         |
| `audit/report-test-timings.ts`  | Regenerates the `docs/audit/test-timings.json` budget baseline (`bun run test:timings -- <suite>`).                                                                                           |
| `audit/measureFunctions.ts`     | AST function/const-object length measurement; source data for the `functionLengthBudget` ratchet test.                                                                                        |
| `audit/duplicateExports.ts`     | Flags the same export name defined in multiple modules (ambiguous re-export sources).                                                                                                       |
| `audit/purity-lint.sh`          | Greps engine hot paths for `Math.random`/`Date.now` purity violations. Referenced by `perf-gate.yml`.                                                                                         |
| `check-package-manager.mjs`     | `preinstall` hook — blocks non-bun installs.                                                                                                                                                |

## Diagnostics & measurement (manual)

| Script                                                                                              | Purpose                                                                                      |
| --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `sim/determinism-double-run.ts`                                                                     | Runs the sim twice from one seed and diffs state — determinism repro.                        |
| `sim/diagnostic-25yr-sim.ts`                                                                        | 25-year diagnostic simulation run.                                                           |
| `sim/repro-year.ts`                                                                                 | Reproduces a specific sim year for debugging.                                                |
| `sim/yokozuna_sim.ts`                                                                               | Yokozuna promotion-path simulation probe.                                                    |
| `measure/verify-training-decay.ts`                                                                  | Verifies training decay curves against expected values.                                      |
| `measure/measure-kimarite-distribution.ts`                                                          | Kimarite outcome distribution census (`bun run measure:kimarite`).                           |
| `measure/measure-events.ts` / `measure/measure-growth.ts` / `measure/measure-rikishi.ts` / `measure/measure-breakdown.ts` | One-off simulation metric probes (event rates, stat growth, rikishi census, cost breakdown). |
| `sim/test-agents.ts`                                                                                | NPC-AI agent decision probe.                                                                 |
| `narrative/list-models.ts`                                                                          | Lists configured LLM models (narrative tooling).                                             |

## Narrative tooling (manual)

| Script                          | Purpose                                                                                       |
| ------------------------------- | --------------------------------------------------------------------------------------------- |
| `narrative/bard-orchestrator.ts` | BardEngine domain generation orchestrator (see `.github/workflows/autonomous-narrative.yml`). |
| `narrative/analyzeNarrativeDeps.ts` | Narrative template dependency analysis.                                                       |
| `narrative/emitNarrativeModules.ts` | Emits narrative domain modules.                                                               |
| `audit/check-jsdoc.ts`          | JSDoc coverage checker.                                                                       |
| `audit/designScan.ts`           | Design-token/style scan.                                                                      |
| `measure/compare-engines.ts`    | Compares bout-physics engine variants (B+ review tooling).                                    |
| `audit/find-dead-test-subjects.ts` | Finds tests whose subjects no longer exist.                                                  |
