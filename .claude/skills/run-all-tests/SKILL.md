---
name: run-all-tests
description: Runs the fast unit test suite (default test command)
disable-model-invocation: true
---

Run the fast unit test suite to verify codebase integrity (from the repository root):

```bash
bun run test
```

This executes the fast unit tests in `tests/unit/**` only — the standard gate for every change. Slow gates (subprocess audits, year-long simulations, bundle budget) live in `tests/slow/**` and run adhoc via `bun run test:slow` (requires `bun run build` first) or nightly in CI (`slow-tests.yml`). Perf benchmarks run via `bun run test:perf`. For pre-release full verification use `bun run test:all`.

NOTE: `bun test` invokes Bun's native test runner — it does NOT run vitest. Always use `bun run test` or `bunx vitest run`.
