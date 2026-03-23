1. **Separation of Concerns & Architecture Organization**
   - The engine operates with a headless architecture separating logic (`src/engine`) from React UI (`src/components`, `src/pages`), utilizing Zustand/Context for state. This boundary is well-defined.
   - However, within `src/engine`, `uiDigest.ts` handles formatting logic specifically for UI views (like the Weekly Digest and candidate arrays). Its existence inside `src/engine/` is a slight layer violation, as the engine shouldn't format data strictly for React components.
   - `almanac.ts` and `historyIndex.ts` both deal with historical data, but have overlapping responsibilities.
   - Files like `saveload.ts` exist inside `src/engine/` but have dependencies on browser APIs (`window.localStorage`). This breaks the engine's isolation and makes it harder to run in pure CLI/Node environments.

2. **Overly Coupled Code**
   - In `world.ts`, the `endBasho` function coordinates a huge post-basho resolution pipeline. It's almost 300 lines long and handles everything from prestige decay and AI meta drift to retirements and sponsor churn.
   - The `matchmaking.ts` implementation is cohesive but mixes high-level strategy (scoring rules) directly inside deeply nested score adjustments.

3. **Performance and Best Practices**
   - In UI models, iterating over Maps directly using `.values()` and spreading them is costly in hot paths. Some files (e.g. `uiDigest.ts`) still use `Array.from(world.rikishi.values())`.
   - `saveload.ts` performs deep object manipulation without schema validation, relying heavily on manual typecasting and `any`.

4. **Recommendations**
   - **Critical:** Move `uiDigest.ts` and `uiModels.ts` to a new directory like `src/presenters/` or `src/lib/` since they act as ViewModels.
   - **Critical:** Abstract `localStorage` usage in `saveload.ts` behind an interface so the engine can receive a storage provider, decoupling it from the browser.
   - **High:** Refactor `world.ts`'s `endBasho` and `runPostBashoResolution`. Extract the massive `runPrestigeDecay`, `runGovernanceReview`, and `runRetirements` blocks into dedicated domain files (e.g., `src/engine/prestige.ts`).
   - **Medium:** Consolidate `historyIndex.ts` and `almanac.ts` into a unified `history/` domain module to reduce redundancy.
   - **Low:** Migrate raw `any` types in `saveload.ts` to use a validation library like Zod for robust runtime type checking of save files.
