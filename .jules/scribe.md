## 2025-07-05 - StateImpact Immutability Contract
**Gap:** The StateImpact interface documentation did not explicitly state the deep immutability and absolute state (idempotency) requirements for the provided partials, which are essential for the Collector-Resolver pattern.
**Truth:** ImpactResolver shallow merges the partials. If nested objects or arrays are shared/mutated outside the patch, it breaks determinism and state history tracking.
**Watch:** Other interfaces participating in the Collector-Resolver pattern, like event payloads.
