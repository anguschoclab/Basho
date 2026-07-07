## 2024-07-06 - [EntityService] ensureNestedState Map initialization gap
**Gap:** The JSDoc claimed it "Automatically determines if the root should be a Map or POJO based on the field name", which implies dynamic detection.
**Truth:** It actually uses a hardcoded array of field names (`["rikishi", "heyas", "oyakata", "staff", "trainingState", "closedHeyas"]`). Other fields intended as Maps (like `sparringPairs` or `historicalRikishi`) will be incorrectly initialized as POJOs.
**Watch:** Anywhere `ensureNestedState` is used for new `WorldState` IdMapRuntime fields that aren't in the allowlist.
