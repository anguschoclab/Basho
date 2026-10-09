---
name: run-sim
description: Runs engine determinism check and core simulation tests
disable-model-invocation: true
---

Run the simulation sanity suite (from the repository root):

```bash
bun run test -- src/tests/unit/engine/lifecycle src/tests/unit/engine/matchmaking src/tests/unit/engine/worker
```

Or run the whole fast unit suite:

```bash
bun run test
```

NOTE: `bun test` invokes Bun's native test runner — it does NOT run vitest. Always use `bun run test` or `bunx vitest run`.
