## 2024-08-22 - [EntityService ensureNestedState Map initialization gap]
**Gap:** The JSDoc for ensureNestedState claims to list new Map fields that cause POJO crashes if missed.
**Truth:** The hardcoded isMapField array fails to include heyaBrandIdentities. Calling ensureNestedState on these fields will return a POJO causing runtime crashes.
**Watch:** Any new IdMapRuntime fields added to WorldState must be manually hardcoded in this allowlist.
