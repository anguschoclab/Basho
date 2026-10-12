## 2025-10-12 - Fix stale mutation warning on updateH2H
**Gap:** The JSDoc for `updateH2H` contained a WARNING that it violated the immutable pipeline contract by mutating `h2h` maps in-place.
**Truth:** The code correctly spreads the nested maps (e.g. `{ ...winnerH2h[loser.id] }`), avoiding in-place mutations entirely.
**Watch:** Look out for other stale mutation warnings on functions that have been refactored to use `ImpactBuilder` with proper object spreading.
