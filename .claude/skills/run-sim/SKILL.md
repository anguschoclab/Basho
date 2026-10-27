---
name: run-sim
description: Runs engine determinism check, headless sim, and core simulation tests
disable-model-invocation: true
---

Quick engine simulation sanity checks (from the repository root):

```bash
# Byte-identical determinism gate: same seed twice, compare serialized world
bun scripts/sim/determinism-double-run.ts basho   # 2-basho horizon
bun scripts/sim/determinism-double-run.ts year    # 1-year horizon

# Headless autosim entry point (WorldFactory → runAutoSim)
bun run simulate -- --seed myseed --basho 3

# Targeted core-loop tests
bun run test -- tests/unit/engine/lifecycle tests/unit/engine/matchmaking tests/unit/engine/worker

# Whole fast unit suite
bun run test
```

NOTE: `bun test` invokes Bun's native test runner — it does NOT run vitest. Always use `bun run test` or `bunx vitest run`.
