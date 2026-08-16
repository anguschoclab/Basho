## 2026-08-16 - Safe generic mutation
**Finding:** Bypassing compiler assignment checks on generics using `(parent as unknown as Record<string, unknown>)[key as string] = value` hides true intent.
**Learning:** TypeScript permits `Object.assign(parent, { [key]: value })` natively. This retains explicit syntax and avoids the use of `as unknown` or `as any` casts.
**Constraint:** Avoid casting generically typed inputs to raw Records just to assign a missing value.
