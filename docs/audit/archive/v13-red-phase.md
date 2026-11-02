# v13 RED Phase — observed results

Phase 3.5 of plan-313e87d710c2b906. All tests committed and observed **before** their implementation commits.

| # | Test | Location | Expected | Observed |
|---|------|----------|----------|----------|
| T1 | `consecutiveYusho` contract: winner +1; all non-winners → 0; non-participants swept | `src/tests/unit/engine/simulation/consecutiveYusho.test.ts` | **RED** | ✅ RED — 2 failures: `resets every non-winner's streak` (expected 4→0, got 4) and `resets a streaking rikishi who did not participate` (expected 5→0, got 5). Winner-increment and start-at-1 pass (current code does increment). |
| T2 | `deriveRecentAchievements` characterization: last-20 window, most-recent-wins, `data?.rikishiId ?? rikishiId` fallback, roster-scoped yusho/kinboshi, no-playerHeyaId skip | `src/tests/unit/engine/tick/phase06_narrative.achievements.test.ts` | GREEN before & after | ✅ GREEN — 10/10 pass on unmodified code |
| T3 | Relocated runAutoSim describe-block → slow suite | `src/tests/slow/engine/simulation/autoSimCoreLoop.test.ts` | GREEN on arrival | ▶️ lands Phase 4.6 |
| T4 | `selectBloodlineRegistry` shape: Object.values parity, traitId present | appended describe in `src/tests/unit/presenters/selectors.test.ts` | GREEN both sides | ✅ GREEN — 2/2 pass |
| T5 | (conditional) perf pin | — | n/a | **Not needed** — V13-B02 classified as stale-baseline/env drift, no code regression to pin |
| T6 | Meta verification post-relocation | `noSubprocessInUnitTests`, `functionLengthBudget` | GREEN | ▶️ Phase 4.6 |

## Notes

- **Visibility export:** `deriveRecentAchievements` gained an `export` keyword in this commit — a non-behavioral change required to write T2's characterization pin (the function is module-private; the indirect path via `phase06_narrative` + mocked `spawnNarrativeAgent` cannot observe `subjects`, which is half the contract).
- **#1125 transformer assertion:** skipped — no career-transformer test file exists under `src/tests/unit/presenters/rikishi/transformers/` (only economics/kihaku/rivals). Per plan: typecheck suffices.
- **T1 winner-increment tests are deterministic:** seeded `simulateEntireBasho`; assertions derive expected streak from the input map for whoever actually won, so playoff upsets can't flake.

Command used for all three: `bunx vitest run <files>` — 44 tests, 2 failed (both T1 reset cases), 42 passed.
