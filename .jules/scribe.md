
## 2024-05-24 - [EntityService Mutation Contract]
**Gap:** `EntityService.ensureState` claimed to be a "Type-safe generic state hydrator" but silently mutates the parent object using type-casts.
**Truth:** The function mutates the input object in-place and bypasses TypeScript validation using `as unknown` casts, meaning it is not strictly type-safe.
**Watch:** Any other "ensure" or "hydrate" utility functions in `core` that might mutate state implicitly while claiming type safety.
