## 2025-02-12 - Scout: issueBailoutLoanIfNeeded coverage

**Gap:** issueBailoutLoanIfNeeded and determineLoanTerms were completely untested logic guarding heya solvency.
**Learning:** ImpactBuilder pattern in loans meant we needed to assert on the returned `StateImpact.entities?.heyaUpdates` rather than mutating state directly.
**Pattern:** Mock world, set heya funds manually below threshold, call logic, and inspect `impact.entities?.heyaUpdates?.get('id')` for updated loans and funds.
## 2025-02-12 - Scout: test maybeAssignNPCSparringPairs
**Gap:** Sparring pair assignments were untested in NPC AI weekly tick.
**Learning:** `sparringPairs` structure has a top level `Map` keyed by `heyaId` where each entry is a state object containing a `pairs` dictionary. We should assert on `Object.values(newPairs)` checking for matching `aId` and `bId` rather than guessing keys.
**Pattern:** Provide `world.sparringPairs` with an existing set of pairs, run `phase01_week_npc_ai`, and inspect `impact.worldFields?.sparringPairs?.get(heyaId)?.pairs` for correct assignments.
## 2025-02-12 - Scout: test pipelineRunner performance tracking
**Gap:** The logic measuring performance and emitting trace messages (via `postMessage`) when `__PERF__` is enabled was entirely untested.
**Learning:** When modifying global environment states (like `globalThis.__PERF__` or `globalThis.postMessage`) in test files to trigger branches, one must be very careful with error-throwing assertions.
**Pattern:** Mock the global object properties and wrap the test execution and assertions within a `try...finally` block to guarantee the mocks are reset and do not pollute the runner environment, even on failure. Also use `expect.any(String)` for mock function names since they might resolve differently internally.
