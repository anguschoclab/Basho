# Test Helpers & Mock Factory Convention

## Test Suite Layout

- `src/tests/unit/` — fast unit tests; run by default via `bun run test` on every change and every PR (~25–30s wall clock with `vmThreads` + `fileParallelism`).
  - `unit/audit/` — structural gates on production code (pure fs/AST reads, no subprocesses).
  - `unit/meta/` — gates about the suite itself: `noSubprocessInUnitTests` (no `child_process`, no `runAutoSim`), `testTimeoutBudget`, `testTimingsBudget` (per-file duration budget vs the committed baseline), `factoryDiscipline` (no new local entity factories), `weakAssertionAudit`.
  - Everything else under `unit/` mirrors `src/` structure (`unit/engine/x` tests `src/engine/x`, `unit/components/`, `unit/build/` for toolchain/build assertions, ...).
- `src/tests/slow/` — slow gates run adhoc via `bun run test:slow` and nightly in CI (parallel `slow-engine-sims` + `slow-audit-gates` jobs). Put a test here if it spawns a subprocess (eslint/knip/madge/tsx), requires a prior `bun run build`, or simulates months/years of game time (`runAutoSim`, multi-hundred-day `advanceDaysFast` on generated worlds).
- `src/tests/perf/` — perf benchmarks; run adhoc via `bun run test:perf`.
- `e2e/` — Playwright; `test:e2e:smoke` (routine) / `test:e2e:soak` (long lifecycle).

Keep `unit/` fast: the `meta/` gates fail if a unit test imports `child_process`, calls `runAutoSim`, or drifts over the timing budget.

## Shared Helpers

### `fsScan.ts`

Canonical filesystem-scan helpers for audit/gate tests — do **not** write another local `walk`/`findTsFiles`/`collectFiles`/`readFile(join(SRC, ...))`; use these:

- **`findFiles(dir, { exts?, skipDirs?, exclude? })`** — recursive absolute paths. Default exts `[".ts", ".tsx"]`; default skips `node_modules`/`.git`/`dist`/`coverage`.
- **`collectSource(dir, opts?)`** — concatenated contents of matching files.
- **`readSrcFile(rel)`** — read `src/<rel>`; `""` if missing.
- **`readRepoFile(rel)`** — read `<root>/<rel>`; `""` if missing.
- **`listSrcDir(dir, ext)`** — non-recursive filenames in `src/<dir>` ending with `ext`.
- **`SRC` / `REPO_ROOT`** — exported anchors so tests don't recompute `join(__dirname, "../../..")`.

### `boutTestHelpers.ts`

- **`makeBoutResult(overrides?)`** — Returns a default `BoutResult` with standard log entries. Pass partial overrides to customize.
- **`makeMinimalBoutResult(overrides?)`** — Returns a minimal `BoutResult` with only tachiai + finish log entries.
- **`makeBoutWorld(east, west, overrides?)`** — Returns a `WorldState` with two rikishi pre-registered. Pass `Partial<WorldState>` to override.

### `utils.ts` (engine test utilities)

- **`mockRikishi(id, overrides?)`** — Creates a `Rikishi` mock with sensible defaults. Use this instead of local `makeRikishi` functions.
- **`makeMockWorld(overrides?)`** — Creates a minimal `WorldState` for engine tests.
- **`makeMockBasho(overrides?)`** — Creates a `BashoState` mock.

## Convention

1. **Prefer shared helpers** over local `makeRikishi`/`makeBoutResult`/`makeWorld` definitions — `unit/meta/factoryDiscipline.test.ts` fails for NEW local entity factories outside its grandfathered allowlist.
2. **Local helpers are acceptable** when they have custom signatures (e.g., `makeRikishi(id, rank, achievements)`) that don't match `mockRikishi`.
3. **Import path**: Use `@/tests/helpers/...` for shared helpers (fsScan, boutTestHelpers), `../utils` for general engine test utilities.
4. **Naming**: `make*` for factory functions, `mock*` for simple mocks with defaults.
5. **Share expensive setup**: if several `it`s assert on the same simulation/scan result, compute it once in `beforeAll` — don't re-run the sim per test.
