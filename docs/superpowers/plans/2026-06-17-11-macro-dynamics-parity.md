# Macro Stasis & Low Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: `superpowers:test-driven-development`. Strict red→green→commit. Write the failing test FIRST with real engine code, `npx vitest run <file>` and SEE it fail, implement from the cited files, run again and SEE it pass, commit. Deterministic only — `rngFromSeed`/`rngForWorld`, never `Math.random`/`Date.now`. Mutation via `ImpactBuilder` + `resolveImpacts`. Mocks from `src/tests/unit/engine/utils.ts`. Double-quote shell paths.

**Build order:** Run LAST, AFTER diagnostic-metrics (`-06`), economy (`-10`), and progression (`-08`). DEPENDS on those two: stable closures need financial stress (economy), and yokozuna need elite wrestlers (progression). This plan fixes the macro *gating/slot logic* + adds founding/closure dynamics reachable under today's economics.

## Goal
Make the NPC world dynamic at the macro level and competitive at the top. Baseline: heya count frozen at 45 for 25 years (zero closures/mergers/foundings); only 5 unique basho winners across 150 basho (Futagoyama 24 / Fujishima 23 / Kataonami 16 / Kasugano 10 / Hakkaku 8); ozeki bloat 5–12; yokozuna →0 late-game.

Delivers, scoped narrowly:
1. Stable closure/merger dynamics that actually fire in NPC play.
2. A stable-founding mechanism (so heya count can recover and churn).
3. Realistic top-of-banzuke: ozeki clamped to 2–4 with enforced kadoban demotion; yokozuna promotion that survives the late game.

## Architecture — root causes (cited)
- **A. Closure/merger triggers unreachable.** `runGovernanceReview` (`governanceReview.ts:39`) is called from the post-basho pipeline (`SimulationRunner.ts:40` ← `BashoHistory.ts:203`), but its merger/closure branches are gated on insolvency (`governanceReview.ts:58` `funds < 0 && runwayBand === "desperate"`; `:116` `funds < MERGER_THRESHOLD = -15M`). The diagnostic proves `minFunds` is always positive and rising (¥31M→¥402M; `negativeHeyas = 0`), so these never execute. The only non-financial path (`:210`, roster `<= 1`) never triggers (rosters stay full). **Fix:** add non-financial triggers (prestige collapse + chronic underperformance) reachable under current economics, leaving the financial branches intact for when the economy plan lands.
- **B. No founding mechanism.** Heya are only created at world-gen (`WorldFactory.createStables:182`). `ImpactBuilder` has `deleteHeya` (`:314`) and `addOyakata` (`:242`) but **no `addHeya`**. Once mergers work, heya count would only fall. **Fix:** add an `addHeya` impact op + a founding path on accomplished-rikishi retirement + available myoseki.
- **C. Ozeki count uncapped; demotion rarely fires.** `computeVariableSanyakuCounts` (`banzuke.ts:364`) clamps yokozuna `Math.min(6,…)` (`:370`) but `oCount` (`:376`) has no upper bound. Ozeki demotion needs `consecutiveMakeKoshi >= 2` (`banzuke.ts:195`), but `getOzekiStatus` (`ozekiLogic.ts:13`) resets to 0 on alternating make/kachi-koshi, so an alternating ozeki is never demoted. **Fix:** hard ozeki cap 2–4 + correct kadoban accumulation.
- **D. Yokozuna vanish late.** Prestige-promotion fallback (`BanzukePublisher.ts:101`) only fires for an already-ozeki yusho winner with no drought memory. **Fix:** vacancy-streak-driven prestige promotion. (Producing elite wrestlers is the progression plan's job; this fixes the gating only.)
- **E. Parity is downstream of A–D.** No matchmaking/bout changes.

## Dependencies (explicit)
- DEPENDS ON the economy plan (`-10`): the financial closure/merger branches activate only once stables can run negative; keep them intact.
- DEPENDS ON the progression plan (`-08`) for generating elite wrestlers; this plan fixes ozeki/yokozuna gating + slot counts only.

## Tech Stack
Vite + React 19 + TS. Vitest (`npx vitest run`). `rngForWorld`. `ImpactBuilder`→`StateImpact`→`resolveImpacts`. Diagnostic writes `simulation-results.json` (`uniqueWinnerCount`, `yokozunaVacantBashoCount`, `beyaDominance`, `yearSnapshots[].heyaCount`/`ozekiCount`/`yokozunaCount`).

---

## Task 1 — `addHeya` impact op
**Files:** `src/engine/core/ImpactBuilder.ts` (mirror `addOyakata:242`), `src/engine/core/StateImpact.ts` (`collections` ~`:156`), `src/engine/core/ImpactResolver.ts` (consume `heyaToAdd`, mirror `oyakataToAdd:298` AND the merge path ~`:455`), Create `src/tests/unit/engine/ImpactBuilder.addHeya.test.ts`
1. Failing test: build `makeMockWorld()` with 2 heyas; `createImpactBuilder("t").addHeya(makeMockHeya("heya-new")).build()` → `resolveImpacts` → `resolved.heyas.size === 3`. Add a second test: two impacts each founding one heya, merged, both appear.
2. Run (FAIL — `addHeya` missing).
3. Implement: `addHeya(heya)` pushes onto a `heyaToAdd` collection; add `heyaToAdd?: Heya[]` to `StateImpact.collections`; in `ImpactResolver` apply AND merge both handle `heyaToAdd` via `ensureHeyas()` (`:184`).
4. Run (PASS). 5. Commit: `feat(engine): add addHeya impact op for stable founding`

## Task 2 — Founding constants + `foundStable` factory
**Files:** `src/constants/engine/economic.ts` (`FOUNDING_SEED_FUNDS = 30_000_000`), `src/engine/systems/generation/WorldFactory.ts` (export `foundStable`), Create `src/tests/unit/engine/foundStable.test.ts`
1. Failing test: `foundStable(world, oyakataId, "Newyama", rngForWorld(world,"found","t"))` → `{ heya }` with deterministic `HY`-prefixed id (stable across two calls), `funds === FOUNDING_SEED_FUNDS`, `statureBand === "new"`, `rikishiIds === []`.
2. Run (FAIL).
3. Implement `foundStable` reusing `createHeyaWithOyakata:78` but overriding `funds: FOUNDING_SEED_FUNDS`, `statureBand: "new"`, `prestigeBand: "modest"`, `rikishiIds: []`; attach the supplied (newly-converted) oyakata; id via `rng.uuid("HY")`.
4. Run (PASS). 5. Commit: `feat(engine): foundStable factory for new NPC stables`

## Task 3 — Found a stable on accomplished retirement + available myoseki
**Files:** `src/engine/systems/governance/governanceReview.ts` (`runRetirements` oyakata-conversion `:350-433`), `src/constants/engine/governance.ts` (`FOUNDING_CHANCE = 0.35`, `HEYA_COUNT_CAP = 50`), Create `src/tests/unit/engine/runRetirements.founding.test.ts`
1. Failing test: a retiring high-rank rikishi (age ≥ 28, `careerWins >= 200`) + available myoseki + favorable RNG → after `runRetirements` + resolve, one more heya, with `oyakataId` = the newly converted oyakata.
2. Run (FAIL — today only an oyakata is created).
3. Implement: after `builder.addOyakata(newOyakata)` (`:412`), gate on `rngForWorld(world, "founding", retiree.id).bool(FOUNDING_CHANCE)` AND `world.heyas.size < HEYA_COUNT_CAP`; call `foundStable(...)` + `builder.addHeya(newHeya)` + log `GOVERNANCE_RULING` `incident: "stable_founded"`; derive the name via the existing `extractPrefixFromShikona` helper.
4. Run (PASS). 5. Commit: `feat(governance): found new stable on accomplished retiree + myoseki`

## Task 4 — Fix ozeki kadoban accumulation
**Files:** `src/engine/banzuke/ozekiLogic.ts` (`getOzekiStatus:13`), Create/extend `src/tests/unit/engine/banzuke/ozekiKadoban.test.ts`
1. Failing tests (real-sumo rule): non-kadoban + make-koshi → `{isKadoban:true, consecutiveMakeKoshi:1}`; kadoban + make-koshi → `{isKadoban:true, consecutiveMakeKoshi:2}` (demotion-eligible); kadoban + kachi-koshi → `{isKadoban:false, consecutiveMakeKoshi:0}`; two non-consecutive make-koshi separated by kachi-koshi do NOT demote.
2. Run (FAIL — case 2 currently flips `isKadoban` back to false).
3. Implement: rewrite `getOzekiStatus` so make-koshi-while-kadoban → `{isKadoban:true, consecutiveMakeKoshi:2}`; make-koshi-not-kadoban → `{isKadoban:true, consecutiveMakeKoshi:1}`; any kachi-koshi → `{isKadoban:false, consecutiveMakeKoshi:0}`. Keep the demotion trigger at `banzuke.ts:195` unchanged.
4. Run (PASS). 5. Commit: `fix(banzuke): correct ozeki kadoban accumulation so demotion fires`

## Task 5 — Hard-cap ozeki slots to 2–4
**Files:** `src/engine/banzuke.ts` (`computeVariableSanyakuCounts:364`), `src/constants/engine/banzuke.ts` (`OZEKI_SLOT_MIN = 2`, `OZEKI_SLOT_MAX = 4`), Create `src/tests/unit/engine/banzuke/sanyakuCounts.test.ts`
1. Failing test: 8 non-demoted ozeki + 3 sekiwake (11+ wins) → `ozeki <= 4 && >= 2`; 0 ozeki + 1 sekiwake (11 wins) → `ozeki === 2`.
2. Run (FAIL — returns 8+).
3. Implement: replace `oCount` (`:376`) with `Math.max(OZEKI_SLOT_MIN, Math.min(OZEKI_SLOT_MAX, retained + promotedFromSekiwake))`. Keep yokozuna/sekiwake/komusubi logic and the `>20` trim.
4. Run (PASS). 5. Commit: `fix(banzuke): clamp ozeki slot count to 2-4 band`

## Task 6 — Demoted ozeki must leave the ozeki slot
**Files:** `src/engine/banzuke.ts` (slot-assignment fallback `:259-278`; `promotionLogic.ts:77`), Create `src/tests/unit/engine/banzuke/ozekiDemotionFlow.test.ts`
1. Failing test: a banzuke of 4 ozeki, one with `consecutiveMakeKoshi >= 2` + 7-win record → that ozeki gets a sekiwake (tier 3) slot in `newBanzuke`, not ozeki; `sanyakuCounts.ozeki` drops.
2. Run (FAIL/flaky — the `:269` fallback can re-seat a demoted ozeki).
3. Implement: in the fallback branch (`:269`), for ozeki slots additionally require `!demotedOzeki.has(cand.entry.rikishiId)`. Lower-division fallback unchanged.
4. Run (PASS). 5. Commit: `fix(banzuke): demoted ozeki cannot be re-seated into ozeki slot`

## Task 7 — Vacancy-streak yokozuna prestige promotion
**Files:** `src/engine/banzuke/BanzukePublisher.ts` (Case 4 `:101-114`), `src/engine/types/world.ts` (`yokozunaVacantStreak?`), Create/extend `src/tests/unit/engine/banzuke/yokozunaPromotion.test.ts`
1. Failing test: ozeki with 13-1 yusho, zero active yokozuna, `world.yokozunaVacantStreak >= 2` → `promoteToYokozuna === true`; same with a yokozuna present → `false`.
2. Run (FAIL).
3. Implement: track `yokozunaVacantStreak` via `builder.updateWorldField` (increment each post-basho with zero active yokozuna, reset when one exists). Case 4 promotes when `isYusho && stats.wins >= 13 && !hasActiveYokozuna && world.yokozunaVacantStreak >= 2`. Cases 1–3 unchanged.
4. Run (PASS). 5. Commit: `fix(banzuke): end yokozuna droughts via vacancy-streak prestige promotion`

## Task 8 — Non-financial merger: chronic underperformance + prestige collapse
**Files:** `src/engine/systems/governance/governanceReview.ts` (new branch after `:241`), `src/constants/engine/governance.ts` (`PRESTIGE_COLLAPSE_BAND`, `CHRONIC_UNDERPERF_BASHO = 6`), `src/engine/mergers.ts` (`findMergerTarget:160`), Create `src/tests/unit/engine/governanceReview.merger.test.ts`
1. Failing test: a non-player NPC heya at the lowest `prestigeBand` with no makuuchi presence for 6+ basho → `runGovernanceReview` + resolve removes it (`closedHeyas` +1, `heyas.size` −1) with a `stable_merger` `reason: "chronic_underperformance"` event; a healthy heya is untouched.
2. Run (FAIL — no such branch).
3. Implement: branch when `heya.id !== world.playerHeyaId`, `prestigeBand === PRESTIGE_COLLAPSE_BAND`, and `lowPerformanceStreak >= CHRONIC_UNDERPERF_BASHO` (track via `builder.updateHeya(id, { lowPerformanceStreak })`); call `findMergerTarget` + `executeMerger(world, heya.id, targetId, "chronic_underperformance")` and merge the impact (reuse `mergers.ts:26` + `ClosedHeyaRecord` `:130`).
   > If the diagnostic shows heyaCount still flat after this, prestige isn't eroding for weak NPC stables (today prestige only erodes under `sanctioned` welfare, `governanceReview.ts:139`) — add a performance-driven prestige decay as a sub-task first.
4. Run (PASS). 5. Commit: `feat(governance): merge chronically failing, prestige-collapsed NPC stables`

## Task 9 — Surface non-financial merger warnings
**Files:** `src/presenters/projections/economyProjections.ts` (`projectMergerWarnings:55`), Create/extend `src/tests/unit/presenters/projectMergerWarnings.test.ts`
1. Failing test: a positive-funds heya with `prestigeBand === PRESTIGE_COLLAPSE_BAND` + high `lowPerformanceStreak` appears in `projectMergerWarnings(world)` with a `reason`; a healthy heya does not.
2. Run (FAIL — only flags `funds < 0 && rosterSize <= 3` at `:65-67`).
3. Implement: extend the warning record with `reason: "financial" | "prestige_collapse"`; push prestige-collapse candidates too; keep the financial branch.
4. Run (PASS). 5. Commit: `feat(presenters): surface non-financial merger warnings`

## Task 10 — Heya floor to prevent runaway collapse
**Files:** `src/engine/systems/governance/governanceReview.ts` (guard merger/closure sites `:130`, `:225`, Task 8 branch), `src/constants/engine/governance.ts` (`HEYA_MIN_FLOOR = 8`), Create `src/tests/unit/engine/governanceReview.floor.test.ts`
1. Failing test: a world at 8 heyas, all merger-eligible → `runGovernanceReview` never drops below `HEYA_MIN_FLOOR`.
2. Run (FAIL — no floor).
3. Implement: before each merger/closure, check `world.heyas.size - pendingClosures > HEYA_MIN_FLOOR` (local closures-queued counter); skip + log `low_roster_warning` when at floor.
4. Run (PASS). 5. Commit: `feat(governance): enforce minimum heya floor`

---

## Verification
1. `npx vitest run` — all new tests green; the 4 known pre-existing failures are the only failures; if a `promotionLogic` assertion shifts due to the kadoban/ozeki-cap fix, update it to the corrected math and note it in the commit.
2. `bun scripts/diagnostic-25yr-sim.ts`; assert vs baseline (heya=45 flat, uniqueWinner=5, ozeki 5–12, yokozuna→0):
   - `yearSnapshots[].heyaCount` NOT constant — at least one merger AND one founding occur, staying within `[8, 50]`.
   - `tuningMetrics.uniqueWinnerCount` ≥ 9 (roughly +80%); no `beyaDominance` stable exceeds ~18 yusho.
   - Every `yearSnapshots[].ozekiCount` in `[2, 4]`.
   - `yokozunaVacantBashoCount` doesn't blow up late; late-year `yokozunaCount` not stuck at 0 for the final 5+ years.
3. Determinism: run twice with fixed seed; `uniqueWinnerCount`, final `heyaCount`, `beyaDominance` order identical. `grep -rn "Math.random\|Date.now" src/engine/systems/governance src/engine/banzuke.ts src/engine/banzuke src/engine/mergers.ts` → nothing.

## Self-review
- Scope: only founding/merger/closure dynamics + ozeki/yokozuna gating. NOT NPC economics (economy plan) or stat growth (progression plan). Financial merger branches left intact.
- Reachability: new triggers gated on retirement/prestige/performance, not funds, which the diagnostic proves never stress. If heyaCount stays flat after Task 8, add performance-driven prestige decay (noted).
- No runaway collapse: Task 10 floor + Task 3 cap bound heya population both ends.
- Backward compat: `addHeya`/`heyaToAdd` handled in `ImpactResolver.merge` (Task 1) so batched post-basho foundings aren't dropped.
- Player UX: every merger/closure keeps the `heya.id !== world.playerHeyaId` guard.

### Critical Files
- src/engine/banzuke.ts
- src/engine/systems/governance/governanceReview.ts
- src/engine/core/ImpactBuilder.ts
- src/engine/banzuke/ozekiLogic.ts
- src/engine/systems/generation/WorldFactory.ts
