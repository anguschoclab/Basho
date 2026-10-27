---
name: test-coverage
description: Runs tests with coverage reporting
disable-model-invocation: true
---

Run the fast unit suite with v8 coverage reporting to identify untested code (from the repository root):

```bash
bun run test:coverage
```

Coverage thresholds (ratchet floor, enforced in `vitest.config.ts`): lines 73%, branches 61%, functions 64%, statements 75%. Coverage runs the fast `tests/unit/**` suite only — slow and perf suites are excluded.
