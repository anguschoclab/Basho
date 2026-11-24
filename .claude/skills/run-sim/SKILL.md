---
name: run-sim
description: Runs engine determinism check, headless autosim, the 25-year diagnostic, and core simulation tests
disable-model-invocation: true
---

Quick engine simulation sanity checks (from the repository root):

```bash
# Byte-identical determinism gate: same seed twice, compare serialized world
bun scripts/sim/determinism-double-run.ts basho   # 2-basho horizon
bun scripts/sim/determinism-double-run.ts year    # 1-year horizon

# Headless autosim entry point (WorldFactory → runAutoSim)
bun run simulate -- --seed myseed --basho 3

# Canonical 25-year NPC-only diagnostic (economy, population drift, yokozuna
# presence, foreign limits, Global Cup; writes a JSON report)
bun scripts/sim/diagnostic-25yr-sim.ts              # default: 25 years
bun scripts/sim/diagnostic-25yr-sim.ts --duration 5 # shorter horizon for iteration

# Targeted core-loop tests
bun run test -- tests/unit/engine/lifecycle tests/unit/engine/matchmaking tests/unit/engine/worker

# Whole fast unit suite
bun run test
```

For the full catalog of measurement/probe harnesses (kimarite distribution, growth, events, economy breakdown, pipeline benchmarks), see the `sim-diagnostics` skill.

NOTE: `bun test` invokes Bun's native test runner — it does NOT run vitest. Always use `bun run test` or `bunx vitest run`.
