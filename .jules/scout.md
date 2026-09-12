## 2025-02-12 - Scout: issueBailoutLoanIfNeeded coverage

**Gap:** issueBailoutLoanIfNeeded and determineLoanTerms were completely untested logic guarding heya solvency.
**Learning:** ImpactBuilder pattern in loans meant we needed to assert on the returned `StateImpact.entities?.heyaUpdates` rather than mutating state directly.
**Pattern:** Mock world, set heya funds manually below threshold, call logic, and inspect `impact.entities?.heyaUpdates?.get('id')` for updated loans and funds.
## 2025-02-12 - Scout: test maybeAssignNPCSparringPairs
**Gap:** Sparring pair assignments were untested in NPC AI weekly tick.
**Learning:** `sparringPairs` structure has a top level `Map` keyed by `heyaId` where each entry is a state object containing a `pairs` dictionary. We should assert on `Object.values(newPairs)` checking for matching `aId` and `bId` rather than guessing keys.
**Pattern:** Provide `world.sparringPairs` with an existing set of pairs, run `phase01_week_npc_ai`, and inspect `impact.worldFields?.sparringPairs?.get(heyaId)?.pairs` for correct assignments.
## 2025-02-12 - Scout: processNpcAutoInvestment coverage

**Gap:** NPC facility auto-investment logic (runway check, weakest axis selection, cost max level caps) was completely untested, putting NPC progression at risk.
**Learning:** `processNpcAutoInvestment` expects `heyaUpdates` to be passed in, and asserts against the modified `heyaUpdates.facilities` and `heyaUpdates.funds` properties.
**Pattern:** Create mock heya with specific `funds` and `facilities`, setup `heyaUpdates`, call `processNpcAutoInvestment(world, heya, monthlyBurn, 0, heyaUpdates, builder)`, then assert on `heyaUpdates.facilities` and `builder.build().events`.
