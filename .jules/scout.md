## 2025-02-12 - Scout: issueBailoutLoanIfNeeded coverage

**Gap:** issueBailoutLoanIfNeeded and determineLoanTerms were completely untested logic guarding heya solvency.
**Learning:** ImpactBuilder pattern in loans meant we needed to assert on the returned `StateImpact.entities?.heyaUpdates` rather than mutating state directly.
**Pattern:** Mock world, set heya funds manually below threshold, call logic, and inspect `impact.entities?.heyaUpdates?.get('id')` for updated loans and funds.
## 2025-02-12 - Scout: test maybeAssignNPCSparringPairs
**Gap:** Sparring pair assignments were untested in NPC AI weekly tick.
**Learning:** `sparringPairs` structure has a top level `Map` keyed by `heyaId` where each entry is a state object containing a `pairs` dictionary. We should assert on `Object.values(newPairs)` checking for matching `aId` and `bId` rather than guessing keys.
**Pattern:** Provide `world.sparringPairs` with an existing set of pairs, run `phase01_week_npc_ai`, and inspect `impact.worldFields?.sparringPairs?.get(heyaId)?.pairs` for correct assignments.
## 2025-02-12 - Scout: issueBailoutLoanIfNeeded coverage
**Gap:** issueBailoutLoanIfNeeded was previously untested for the new economic model bailout paths.
**Learning:** We can utilize `MockFactory` to test `issueBailoutLoanIfNeeded` and examine its returns via `impact.entities?.heyaUpdates`.
**Pattern:** Directly invoke `issueBailoutLoanIfNeeded` passing in a mutated `world` state, and assert on returned StateImpact values.
