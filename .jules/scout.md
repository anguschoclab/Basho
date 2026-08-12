## 2025-02-12 - Scout: issueBailoutLoanIfNeeded coverage

**Gap:** issueBailoutLoanIfNeeded and determineLoanTerms were completely untested logic guarding heya solvency.
**Learning:** ImpactBuilder pattern in loans meant we needed to assert on the returned `StateImpact.entities?.heyaUpdates` rather than mutating state directly.
**Pattern:** Mock world, set heya funds manually below threshold, call logic, and inspect `impact.entities?.heyaUpdates?.get('id')` for updated loans and funds.
## 2025-02-12 - Scout: test maybeAssignNPCSparringPairs
**Gap:** Sparring pair assignments were untested in NPC AI weekly tick.
**Learning:** `sparringPairs` structure has a top level `Map` keyed by `heyaId` where each entry is a state object containing a `pairs` dictionary. We should assert on `Object.values(newPairs)` checking for matching `aId` and `bId` rather than guessing keys.
**Pattern:** Provide `world.sparringPairs` with an existing set of pairs, run `phase01_week_npc_ai`, and inspect `impact.worldFields?.sparringPairs?.get(heyaId)?.pairs` for correct assignments.
## 2025-02-13 - Scout: test phase01_monthly_market coverage
**Gap:** `phase01_monthly_market` was completely untested, meaning monthly market price drift logic was missing verification.
**Learning:** `phase01_monthly_market` returns an `ImpactBuilder` payload on `worldFields.myosekiMarket` instead of mutating state. It relies on `RNGRegistry.getSystemRNG()` which we need to spy on to make the drift predictable.
**Pattern:** Mock world with `boundaries.monthBoundary = true`, mock `RNGRegistry.getSystemRNG().next` to force a specific drift direction, run phase, and inspect `impact.worldFields?.myosekiMarket?.stocks` for updated `askingPrice`.
