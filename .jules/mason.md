## 2025-02-14 - Replace type casts with Object.assign in generic mutation
**Finding:** Generic state hydrator (`EntityService`) bypassed strict assignment checks via `as unknown as Record<string, unknown>`.
**Learning:** `Object.assign(parent, { [key]: value })` provides safer, type-compliant mutation for generic parameters compared to broad downcasting.
**Constraint:** When dynamically injecting properties onto generic interfaces, use `Object.assign` to satisfy compiler safety without `unknown` type assertion noise.
