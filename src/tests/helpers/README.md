# Test Helpers & Mock Factory Convention

## Test Suite Layout

- `src/tests/unit/` — fast unit tests; run by default via `bun run test` on every change and every PR.
- `src/tests/slow/` — slow gates run adhoc via `bun run test:slow` and nightly in CI. Put a test here if it spawns a subprocess (eslint/knip/madge/tsx), requires a prior `bun run build`, or simulates months/years of game time.
- `src/tests/perf/` — perf benchmarks; run adhoc via `bun run test:perf`.

Keep `unit/` fast: a fast meta-test (`noSubprocessInUnitTests`) fails if a unit test imports `child_process`.

## Shared Helpers

### `boutTestHelpers.ts`

- **`makeBoutResult(overrides?)`** — Returns a default `BoutResult` with standard log entries. Pass partial overrides to customize.
- **`makeMinimalBoutResult(overrides?)`** — Returns a minimal `BoutResult` with only tachiai + finish log entries.
- **`makeBoutWorld(east, west, overrides?)`** — Returns a `WorldState` with two rikishi pre-registered. Pass `Partial<WorldState>` to override.

### `utils.ts` (engine test utilities)

- **`mockRikishi(id, overrides?)`** — Creates a `Rikishi` mock with sensible defaults. Use this instead of local `makeRikishi` functions.
- **`makeMockWorld(overrides?)`** — Creates a minimal `WorldState` for engine tests.
- **`makeMockBasho(overrides?)`** — Creates a `BashoState` mock.

## Convention

1. **Prefer shared helpers** over local `makeRikishi`/`makeBoutResult`/`makeWorld` definitions.
2. **Local helpers are acceptable** when they have custom signatures (e.g., `makeRikishi(id, rank, achievements)`) that don't match `mockRikishi`.
3. **Import path**: Use `@/tests/helpers/boutTestHelpers` for bout-specific helpers, `../utils` for general engine test utilities.
4. **Naming**: `make*` for factory functions, `mock*` for simple mocks with defaults.
