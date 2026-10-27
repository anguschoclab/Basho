---
name: sim-diagnostics
description: Pick the right engine measurement/diagnostic script for a simulation question. Use whenever tuning balance, investigating drift/bias, checking determinism, or answering "is X realistic/healthy over N bashos/years" — catalogs every scripts/ harness (25-year diagnostic, determinism double-run, kimarite/bout measurement, growth/events/economy measures, pipeline benchmarks) with what each one actually reports.
---

# Engine Simulation Diagnostics — Which Tool for Which Question

All run from the repo root. These are throwaway-measurement harnesses over `generateInitialWorld` + `runAutoSim` — they print to stdout (the 25-yr diagnostic also writes a JSON report).

| Question | Command | What it reports |
|----------|---------|-----------------|
| Is the sim stable over decades? | `bun scripts/sim/diagnostic-25yr-sim.ts [--duration N]` | Per-year snapshots: population drift, heya insolvency, yokozuna/ozeki counts, foreign-limit violations, Global Cup completion, anomalies + errors |
| Is the sim deterministic? | `bun scripts/sim/determinism-double-run.ts [basho\|year]` | Same seed run twice → byte-identical serialized world, or it fails |
| Quick manual autosim | `bun run simulate -- --seed X --basho N` | WorldFactory → runAutoSim for N bashos |
| Are kimarite frequencies realistic? | `bun run measure:kimarite` | Observed distribution vs real-world targets in `src/constants/engine/kimariteFrequencies.ts` |
| Is bout physics balanced? | `bun scripts/measure/compare-engines.ts --count=100 --seed=X` | Determinism, winner east/west balance, duration bounds, zero-frequency kimarite (see also `validate-bout-physics` skill) |
| Do rikishi stats grow sanely? | `bun scripts/measure/measure-growth.ts` | Stat progression over 6 bashos with a player heya |
| Are events firing sanely? | `bun scripts/measure/measure-events.ts` | Event volume/types over 3 bashos |
| One rikishi's career | `bun scripts/measure/measure-rikishi.ts` | Follows a single active makuuchi rikishi |
| Is the economy balanced? | `bun scripts/measure/measure-breakdown.ts` | Income/expense breakdown over simulated bashos |
| Yokozuna presence over 50 yrs | `bun scripts/sim/yokozuna_sim.ts` | Yokozuna count history per basho |
| Pipeline wall-clock perf | `bun scripts/measure/bench-pipelines.ts` then `bun scripts/audit/perf-gate-check.ts` | Benchmark timings; gate fails on >15% regression vs committed baseline |
| Reproduce the year-stall bug | `bun scripts/sim/repro-year.ts` | In-process repro of the interactive-path stall (advanceDaysFast → endBasho → publishBanzukeUpdate) |

**Interpretation caution:** these scripts all use a fixed seed convention (`e2e-year-of-bashos-v1` for the measure-* family). One seed shows existence, not distribution — vary `--seed`/edit the constant before drawing balance conclusions.
