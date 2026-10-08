---
name: run-all-tests
description: Runs the fast unit test suite (default test command)
disable-model-invocation: true
---

Run the fast unit test suite to verify codebase integrity (from the repository root):

```bash
bunx vitest run
```

This executes the fast unit tests in `src/tests/unit/**` only — the standard gate for every change. Slow gates (subprocess audits, year-long simulations, bundle budget) live in `src/tests/slow/**` and run adhoc via `bun run test:slow` (requires `bun run build` first) or nightly in CI (`slow-tests.yml`). Perf benchmarks run via `bun run test:perf`. For pre-release full verification use `bun run test:all`.
