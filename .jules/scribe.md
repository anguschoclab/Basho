## 2024-05-18 - Missing JSDoc @param for args properties in scorePairing
**Gap:** The `scorePairing` function JSDoc was missing `@param` tags for the destructured `args` properties, making it confusing to see what options were available in autocomplete and hover.
**Truth:** The code clearly defines `args: { basho: BashoState; a: Rikishi; b: Rikishi; rules?: Partial<MatchmakingRules>; allowRepeatOverride?: boolean; facedPairs?: Set<string>; }`.
**Watch:** Anywhere else `args` objects are used in complex engine functions without fully documented properties.
