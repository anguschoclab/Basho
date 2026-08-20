## 2025-02-14 - [Stale test command in README & EntityService bug]
**Gap:** The README.md instructs developers to use `bun run test` to run tests, but running this command times out/hangs.
**Truth:** Tests must be run directly using Vitest (e.g., `npx vitest run <filepath>`) to execute properly without timing out.
**Watch:** Anywhere developers rely on npm scripts for standard testing workflows.

## 2025-02-14 - [EntityService IdMapRuntime initialization bug]
**Gap:** `heyaBrandIdentities` is missing from the `isMapField` array in `src/engine/core/EntityService.ts` despite being an `IdMapRuntime` in `world.ts`.
**Truth:** `EntityService.ensureNestedState` silently initializes missing fields as POJOs `{}` unless they are in the hardcoded allowlist.
**Watch:** Whenever new map structures are added to `WorldState`, they must be manually allowlisted.
