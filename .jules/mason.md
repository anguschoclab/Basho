## 2026-11-01 - Remove dead reasons array from tests
**Finding:** The `MatchSchedule` type does not have a `reasons` field, however `overrideConsumer.test.ts` attempted to check `!(m.reasons ?? []).includes("favor_avoid_rival")` against mapped `MatchSchedule` objects resulting in a compiler error.
**Learning:** `reasons` exists on `MatchPairing` within matchmaking but is stripped when converting to `MatchSchedule` before returning.
**Constraint:** Avoid querying fields in tests that have been stripped by type projections; test observable outputs or impacts instead.
