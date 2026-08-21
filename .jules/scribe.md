## 2025-02-12 - EntityService ensureNestedState Map initialization trap
**Gap:** The JSDoc for `EntityService.ensureNestedState` correctly identifies that there is a hardcoded allowlist to detect Map vs POJO initialization, but developers must look at the implementation to know *which* keys are in that allowlist. If a map field isn't on the hardcoded allowlist, the property falls back to POJO `{}` without throwing an error at initialization time.
**Truth:** `isMapField` checks if `rootKey` is one of `["rikishi", "heyas", "oyakata", "staff", "trainingState", "closedHeyas", "sparringPairs"]`. Anything else becomes an object literal.
**Watch:** Anywhere new top-level Map-based states are introduced in `WorldState` and dynamically fetched.

## 2025-02-12 - Pipeline runner exception safety caveat
**Gap:** The JSDoc for `runPipeline` in `src/engine/tick/pipelineRunner.ts` states: "On phase failure the pre-phase snapshot (shallow clone of entity maps) is restored, so the remaining phases still execute against a valid world."
However, this relies on `createShallowSnapshot`, which *only* captures entity maps explicitly declared in `touches` (or falls back to a hardcoded `ENTITY_MAP_FIELDS` array: `["heyas", "rikishi", "oyakata", "staff"]`). It does not magically snapshot or recover nested non-map state, scalars, or new maps not in the allowlist. If a phase mutates those in-place before throwing, the recovery is partial/corrupted.
**Truth:** Only fields in `ENTITY_MAP_FIELDS` (`heyas`, `rikishi`, `oyakata`, `staff`) that are Maps are restored on phase failure. Any other mutations made by the phase to the world object prior to throwing will persist to the next phase.
**Watch:** Pipeline phases that mutate the `world` object directly (violating the pure function contract) and also can throw exceptions, specifically touching state outside the core 4 entity maps.
