## 2025-02-27 - Document runPipeline Contract
**Gap:** The core `runPipeline` function lacked explicit `@param` and `@returns` documentation.
**Truth:** `runPipeline` automatically resolves returned `StateImpact`s into `WorldState` before returning the final state, which was undocumented.
**Watch:** Check other core runner/orchestrator functions for missing `@returns` and argument documentation.
