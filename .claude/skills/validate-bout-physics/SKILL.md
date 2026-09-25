---
name: validate-bout-physics
description: Runs bout physics engine comparison and validation
disable-model-invocation: true
---

Run bout physics engine comparison and validation for Combat System B+ (from the repository root):

```bash
bun scripts/compare-engines.ts --count=100 --seed=validation-001
```

This validates determinism, kimarite distribution, winner balance, and duration bounds. Ensures no kimarite drops to zero frequency.
