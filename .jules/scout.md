## 2025-02-27 - selectors test coverage

**Gap:** `src/engine/selectors.ts` had no unit tests, leaving 100% of its lines and branches uncovered. It contained several pure functions (selectors) with branching logic.
**Learning:** Selectors in this engine often rely on caching behavior tied to `dayIndexGlobal` to prevent redundant computations in a single tick. Testing them requires verifying this caching mechanism.
**Pattern:** To test cache invalidation, manually update the `dayIndexGlobal` of the mocked `world` state, and ensure the selectors return newly added entities that would otherwise be ignored by the cache. When mocking `welfareState` or `funds` on `Heya` entities, assign them directly to the mock instances since `createHeya` may not support deeply nested state arguments out-of-the-box.
