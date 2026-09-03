## 2025-05-19 - EntityService.ensureState Falsy Overwrite
**Gap:** JSDoc for `ensureState` didn't mention it breaks on legitimate falsy state initializations (0, false, "").
**Truth:** Uses a loose truthiness check `!parent[key]`.
**Watch:** Anywhere `ensureState` might be reused for scalar/boolean hydration rather than Object/Map structures.
