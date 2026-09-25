---
name: run-sim
description: Runs engine determinism check and core simulation tests
disable-model-invocation: true
---

Run the simulation sanity suite (from the repository root):

```bash
bun test -- --run src/engine/__tests__/engine.worker.test.ts src/engine/__tests__/lifecycle.test.ts src/engine/__tests__/matchmaking.test.ts
```
