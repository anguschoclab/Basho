## 2024-07-06 - [EntityService] ensureNestedState Map initialization gap
**Gap:** The JSDoc claimed it "Automatically determines if the root should be a Map or POJO based on the field name", which implies dynamic detection.
**Truth:** It actually uses a hardcoded array of field names (`["rikishi", "heyas", "oyakata", "staff", "trainingState", "closedHeyas"]`). Other fields intended as Maps (like `sparringPairs` or `historicalRikishi`) will be incorrectly initialized as POJOs.
**Watch:** Anywhere `ensureNestedState` is used for new `WorldState` IdMapRuntime fields that aren't in the allowlist.

## 2025-07-05 - StateImpact Immutability Contract
**Gap:** The StateImpact interface documentation did not explicitly state the deep immutability and absolute state (idempotency) requirements for the provided partials, which are essential for the Collector-Resolver pattern.
**Truth:** ImpactResolver shallow merges the partials. If nested objects or arrays are shared/mutated outside the patch, it breaks determinism and state history tracking.
**Watch:** Other interfaces participating in the Collector-Resolver pattern, like event payloads.

## 2024-07-08 - [tickDaily.ts] Stale Pipeline Order Docs
**Gap:** The JSDoc for `advanceOneDay` contained a legacy 9-step pipeline order (e.g., claiming it handles "Basho tournament day") and was completely duplicated in the file.
**Truth:** The logic was migrated to a Strict Pipeline Architecture that delegates to `bashoPipeline` and `offSeasonPipeline`. Basho combat logic is explicitly not handled within this daily tick.
**Watch:** Other files in `src/engine/tick` that may still have legacy Constitution A3.1 monolithic comments instead of pipeline runner logic.
## 2024-07-06 - [EntityService] ensureNestedState Map initialization gap
**Gap:** The JSDoc claimed it "Automatically determines if the root should be a Map or POJO based on the field name", which implies dynamic detection.
**Truth:** It actually uses a hardcoded array of field names (`["rikishi", "heyas", "oyakata", "staff", "trainingState", "closedHeyas", "sparringPairs"]`). Other fields intended as Maps (like `historicalRikishi` or `heyaBrandIdentities`) will be incorrectly initialized as POJOs.
**Watch:** Anywhere `ensureNestedState` is used for new `WorldState` IdMapRuntime fields that aren't in the allowlist.
