## 2025-02-12 - Scout: issueBailoutLoanIfNeeded coverage

**Gap:** issueBailoutLoanIfNeeded and determineLoanTerms were completely untested logic guarding heya solvency.
**Learning:** ImpactBuilder pattern in loans meant we needed to assert on the returned `StateImpact.entities?.heyaUpdates` rather than mutating state directly.
**Pattern:** Mock world, set heya funds manually below threshold, call logic, and inspect `impact.entities?.heyaUpdates?.get('id')` for updated loans and funds.
## 2025-02-12 - Scout: test maybeAssignNPCSparringPairs
**Gap:** Sparring pair assignments were untested in NPC AI weekly tick.
**Learning:** `sparringPairs` structure has a top level `Map` keyed by `heyaId` where each entry is a state object containing a `pairs` dictionary. We should assert on `Object.values(newPairs)` checking for matching `aId` and `bId` rather than guessing keys.
**Pattern:** Provide `world.sparringPairs` with an existing set of pairs, run `phase01_week_npc_ai`, and inspect `impact.worldFields?.sparringPairs?.get(heyaId)?.pairs` for correct assignments.
## 2024-05-28 - Myoseki Market Missing Transaction Tests
**Gap:** The core `buyMyoseki` and `leaseMyoseki` functions in `src/engine/myosekiMarket.ts` were completely untested.
**Learning:** Functions that mutate engine state use the `ImpactBuilder` pattern. Rather than mutating state directly, they return a `StateImpact` object which can be interrogated via `impact.entities`.
**Pattern:** Provide a mock `WorldState` with just enough properties, call the engine function, and inspect the `StateImpact` returned (e.g. `impact.entities?.myosekiUpdates?.get(stockId)?.status`).
