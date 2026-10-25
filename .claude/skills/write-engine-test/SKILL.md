---
name: write-engine-test
description: Write a test that survives this repo's meta-gates and lands in the right tier. Use whenever adding tests — decides unit/ vs slow/ vs perf/ placement, enforces MockFactory discipline, the trainingState-Map gotcha, the vmThreads window caveat, timeout/timings budgets, and the no-tautological-assertion rule. A test written the naive way here will fail meta gates even when its assertions pass.
---

# Writing Tests for This Repo

## 1. Pick the right tier

| Tier | Location | Runs via | Belongs here |
|------|----------|----------|--------------|
| Fast unit | `src/tests/unit/**` (mirrors `src/engine/`) | `bun run test` — every change | Pure logic, single-day ticks, UI components |
| Slow gates | `src/tests/slow/**` | `bun run test:slow` (needs `bun run build` first) | Subprocess audits (eslint/knip/madge/tsx), build-dependent tests, months/years of simulated time |
| Perf | `src/tests/perf/**` | `bun run test:perf` | Benchmarks |

**The line that matters:** anything spawning a subprocess, requiring a prior `bun run build`, or simulating months+ of game time does NOT belong in `unit/` — `noSubprocessInUnitTests` and the timings budget will reject it. Full matrix: `docs/TESTING.md`.

## 2. Meta-gates your test must pass (`src/tests/unit/meta/`)

- `noSubprocessInUnitTests` — no `child_process`, no `runAutoSim`/`generateInitialWorld`+`simulateEntireBasho` pairing in unit/.
- `factoryDiscipline` — only allowlisted factories. Use `src/tests/helpers/utils/MockFactory.ts` (primary, ~118 consumers) or `mockRikishi(id, overrides?)`/`makeMockBasho` from `src/tests/unit/engine/utils.ts`. Don't hand-roll entity literals.
- `testTimingsBudget` — per-file duration budget vs `docs/audit/test-timings.json`. After legit suite reorgs, regenerate: `bun run test:timings -- fast` (suites: `fast`|`slow`|`perf`|`all`).
- `testTimeoutBudget` — no >5s per-test timeouts in unit/; no `vitest.setTimeout` >30s anywhere. A slow test is a misplaced test — move it, don't raise its timeout.
- `weakAssertionAudit` — assertions must observe real outcomes.

## 3. Determinism & environment rules

- **Seeded RNG only** — `rngFromSeed("test_seed", "subsys", "label")` or `new SeededRNG(...)`. Never `Math.random()`/`Date.now()` in engine code under test.
- **`trainingState` in mock worlds is a `Map`** — `new Map([["heyaId", {...}]])`, not a plain object.
- **vmThreads caveat** — under the vm context, `globalThis.window` is a non-configurable getter. Never `Object.defineProperty`/`delete`/`stubGlobal` the `window` global itself; set properties *on* the existing window or spy its methods.

## 4. Write a real assertion, not a tautology

Asserting properties of a static table (`ALL_OUT.modifier > STANDARD.modifier`) proves nothing and passes forever. Exercise the actual engine path the way production calls it — e.g. pass the tactic to `resolveBout` positionally the way `boutResolver.ts` does, not just via `ctx` — and observe the distribution/outcome. See the `verify-implementation` skill for the empirical-check pattern.
