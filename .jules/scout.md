## 2024-05-18 - [SimulationRunner missing coverage for vacanciesByHeyaId fallback]
**Gap:** `runRetirements` return value `metadata?.vacanciesByHeyaId` was tested for the happy path but lacked test coverage for when it is `undefined`. This left a branch coverage gap at `SimulationRunner.ts` line 90.
**Learning:** When retrieving optional fields from state impacts, the `?? {}` fallback behavior must be explicitly verified to prevent runtime errors when downstream consumers expect an object.
**Pattern:** Mock the upstream institutional system (`runRetirements`) using `mockImplementationOnce` within a specific test case, ensuring it returns `undefined` for the targeted field, then assert that downstream consumers receive the correct fallback value (e.g., `{}`).
