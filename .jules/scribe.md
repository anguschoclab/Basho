## 2024-08-15 - Scribe Journal Init
## 2024-08-15 - EntityService Mutation Contract
**Gap:** ensureState JSDoc omitted the crucial fact that it mutates the parent object directly, which is dangerous in an architecture enforcing immutable pipelines (StateImpact).
**Truth:** ensureState casts parent to `Record<string, unknown>` and mutates it in place (`record[key] = factory()`), rather than cloning.
**Watch:** Any subsystem attempting to "safely hydrate" state during a pure pipeline phase will violate immutability contracts.
