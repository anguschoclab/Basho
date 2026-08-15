## 2025-02-12 - Scout: issueBailoutLoanIfNeeded coverage

**Gap:** issueBailoutLoanIfNeeded and determineLoanTerms were completely untested logic guarding heya solvency.
**Learning:** ImpactBuilder pattern in loans meant we needed to assert on the returned `StateImpact.entities?.heyaUpdates` rather than mutating state directly.
**Pattern:** Mock world, set heya funds manually below threshold, call logic, and inspect `impact.entities?.heyaUpdates?.get('id')` for updated loans and funds.
## 2025-02-12 - Scout: test maybeAssignNPCSparringPairs
**Gap:** Sparring pair assignments were untested in NPC AI weekly tick.
**Learning:** `sparringPairs` structure has a top level `Map` keyed by `heyaId` where each entry is a state object containing a `pairs` dictionary. We should assert on `Object.values(newPairs)` checking for matching `aId` and `bId` rather than guessing keys.
**Pattern:** Provide `world.sparringPairs` with an existing set of pairs, run `phase01_week_npc_ai`, and inspect `impact.worldFields?.sparringPairs?.get(heyaId)?.pairs` for correct assignments.
## 2025-02-12 - Scout: test EntityService ensureNestedState Map allowlist for historicalRikishi

**Gap:** `EntityService.ensureNestedState` maintains a hardcoded allowlist to initialize properties as Maps. The `historicalRikishi` field, which should be initialized as a Map, was missing from this list. If `ensureNestedState` was ever called on `historicalRikishi` before it was initialized, it would have been incorrectly initialized as a POJO (`{}`), causing runtime errors on `.get()`/`.set()` calls.
**Learning:** For Map fields on `WorldState` added to `ensureNestedState`, you must manually include them in the `isMapField` array to avoid silent initialization as POJOs. A test should verify this initialization explicitly.
**Pattern:** Ensure new `WorldState` Map properties are both added to the `isMapField` array in `EntityService` and explicitly tested with `EntityService.ensureNestedState(world, "propertyName", ...)` verifying it `toBeInstanceOf(Map)`.
