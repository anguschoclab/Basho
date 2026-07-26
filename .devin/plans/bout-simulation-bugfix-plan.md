# Bout Simulation Bugfix — Test-First Implementation Plan

**Project**: sumo-manager-pro (Basho Sumo Manager Game)
**Date**: 2026-07-26
**Scope**: Fix all verified bout simulation bugs. Build all tests BEFORE implementing any fixes. No backwards compatibility or save-file migration needed.

---

## Part 1: Exhaustive Bug Findings (Approved/Disproved)

### Bug 1: `match.result` never stored in world state during bout simulation

**Status**: ✅ APPROVED — CRITICAL

**Root cause**: `simulateBoutForToday` at `src/engine/world.ts:123-189` calls `resolveBout` (returns `result`) and `applyBoutResult` (returns `StateImpact`), then resolves both impacts. Neither function sets `match.result` on the `currentBasho.matches` array. The `result` is returned to the caller but never persisted in the world state's `matches` array.

**Evidence**:
- `boutResultApplier.ts:32-274` — `applyBoutResult` updates standings, career wins/losses, achievements, H2H, injuries, rivalries, economics, media, events. It never touches `basho.matches`.
- `world.ts:170-171` — `resolveImpacts` applies the impacts, but neither impact contains a `matches` update.
- `ImpactBuilder` has `appendToWorldArray("basho.matches", ...)` but no method to update an existing match entry.
- Test mocks at `bashoSlice.test.ts:86-88` and `basho.pipeline.test.ts:92-93` manually set `match.result`, confirming the engine should but doesn't.
- `TournamentSimulator.ts:112,131` — The auto-sim path DOES set `match.result = result` directly (mutable). This is the only path that works correctly.

**Downstream impact** (all consumer code that checks `match.result`):
- `BoutCard.tsx:39,66,77,98,103` — Bouts always show as unplayed; no winner highlight, no kimarite display
- `MatchDayViewer.tsx:51,89-90,108` — No bouts marked as completed; completedCount always 0
- `BashoWidget.tsx:81-84` — completedCount/kinboshi/upsets always 0
- `KenshoManagementWidget.tsx:68-69` — No kensho data shown
- `PlayoffBracket.tsx:24,47,66-68` — Playoff champion never shown
- `bashoProjections.ts:65` — `completedBouts` always 0
- `recapProjections.ts:101` — `selectFromMatches` filters `m.result != null` → always empty → no key bouts
- `BashoHistory.ts:107` — `match.result?.excitementScore` always undefined → no Bout of the Basho
- `specialPrizes.ts:30` — `if (!m.result) continue` → no special prizes ever awarded
- `phase01_basho_bouts.ts:35` — `!m.result` filter never shrinks → infinite loop (capped at 128)

**Fix**: In `simulateBoutForToday`, after applying impacts, update `currentBasho.matches` immutably to set `result` on the matched bout. Use `updateWorldField("currentBasho", { ...currentBasho, matches: currentBasho.matches.map(m => m.boutId === match.boutId ? { ...m, result } : m) })`.

---

### Bug 2: `currentBashoWins` / `currentBashoLosses` / `currentBashoRecord` never updated

**Status**: ✅ APPROVED — CRITICAL

**Root cause**: `boutResultApplier.ts:59-66` updates `careerWins`/`careerLosses` per-bout but does NOT update `currentBashoWins`, `currentBashoLosses`, or `currentBashoRecord`. These fields are only initialized to 0 by `BanzukePublisher` and `CandidateBuilder`, and only incremented by `TournamentSimulator` (the separate auto-sim path at lines 103-104, 136-137).

**Evidence**:
- `boutResultApplier.ts:61-66` — Only updates `careerWins` and `careerLosses`, not `currentBashoWins`/`currentBashoLosses`.
- `TournamentSimulator.ts:103-104,136-137` — The auto-sim path mutates `winner.currentBashoWins` and `loser.currentBashoLosses` directly.
- `BanzukePublisher.ts:313-314,323-324` — Resets `currentBashoWins` and `currentBashoLosses` to 0 on new banzuke entry.

**Downstream impact** (all consumers of `currentBashoWins`/`currentBashoLosses`):
- `boutNarrative.ts:1332-1335` — `winnerWins`/`loserLosses` always 0 → wrong records in narrative
- `boutNarrative.ts:1390` — `isKachiKoshi(0+1, 0, rank)` → never true (1 < 8) → kachi-koshi narrative never fires
- `boutNarrative.ts:1432` — `isMakeKoshi(0, 0+1, rank)` → never true (1 < 8) → make-koshi narrative never fires
- `boutNarrative.ts:1536` — `loserLosses + 1 >= 3` → never true (1 < 3) → loss streak narrative never fires
- `boutNarrative.ts:1548` — `winnerWins === 0` → always true → "first win" narrative fires on EVERY bout after min day
- `boutNarrative.ts:1682-1701` — Interview question type always defaults to "first_win" or "debut_win"
- `CompetitionService.ts:127-128` — `bashoWins`/`bashoLosses` always 0 → `netWins` always 0 → mochikyukin calculation wrong
- `RegistryService.ts:106-107` — Momentum updates always see 0 → no momentum changes
- `history.ts:47-48` — Career snapshots record 0-0 for every basho
- `prestigeSystem.ts:95-96` — Heya prestige always sees 0 wins/losses
- `governanceReview.ts:320` — Style dominance tracking always sees 0 wins
- `YokozunaService.ts:41-42` — Yokozuna promotion check always sees 0 wins
- `overflow.ts:50` — Foreign-slot retention always sees 0 win ratio
- `holiday.ts:199` — Promotion run gate never triggers (0 < 12)
- `almanac/snapshot.ts:19` — Almanac total wins always 0
- `bashoProjections.ts:74` — UI standings always show 0-0 (reads `r.currentBashoRecord`)

**Fix**: In `boutResultApplier.ts`, add `currentBashoWins`/`currentBashoLosses`/`currentBashoRecord` increments alongside the existing `careerWins`/`careerLosses` updates:
```ts
builder.updateRikishi(winner.id, {
  careerWins: (winner.careerWins ?? 0) + 1,
  currentBashoWins: (winner.currentBashoWins ?? 0) + 1,
  currentBashoRecord: { wins: (winner.currentBashoWins ?? 0) + 1, losses: winner.currentBashoLosses ?? 0 },
});
builder.updateRikishi(loser.id, {
  careerLosses: (loser.careerLosses ?? 0) + 1,
  currentBashoLosses: (loser.currentBashoLosses ?? 0) + 1,
  currentBashoRecord: { wins: loser.currentBashoWins ?? 0, losses: (loser.currentBashoLosses ?? 0) + 1 },
});
```

---

### Bug 3: `kinboshiThisBasho` never initialized — kinboshi tracking broken

**Status**: ✅ APPROVED — HIGH

**Root cause**: `WorldFactory.initializeBasho` at `src/engine/systems/generation/WorldFactory.ts:168-181` does not set `kinboshiThisBasho: {}`. In `boutResolver.ts:243`, the guard `if (kinboshiDelta && basho.kinboshiThisBasho !== undefined)` is always false because `kinboshiThisBasho` is `undefined` for new basho.

**Evidence**:
- `WorldFactory.ts:170-180` — `initializeBasho` returns object without `kinboshiThisBasho`
- `boutResolver.ts:243` — `basho.kinboshiThisBasho !== undefined` → always false
- `BashoState` type at `basho.ts:186` — `kinboshiThisBasho?: Record<Id, number>` (optional)

**Downstream impact**:
- `PrizeDistribution.ts:172` — `payKinboshiStipends` uses `basho.kinboshiThisBasho ?? {}` → always `{}` → no stipends paid
- `CompetitionService.ts:132` — `basho.kinboshiThisBasho?.[id] ?? 0` → always 0 → mochikyukin kinboshi bonus always 0

**Fix**: In `WorldFactory.initializeBasho`, add `kinboshiThisBasho: {}` to the returned basho state. Also change the guard in `boutResolver.ts:243` from `!== undefined` to a null-safe initialization pattern.

---

### Bug 4: `SIMULATE_ALL_BOUTS` / `SIM_FULL_BASHO` indexing bug (latent)

**Status**: ✅ APPROVED — LATENT (becomes active after Bug 1 fix)

**Root cause**: `bashoSlice.ts:84-105,119-142` pre-computes `todays` (unplayed matches) and iterates by index `i`, calling `simulateBoutForToday(world, i, ...)`. But `simulateBoutForToday` at `world.ts:132` re-filters unplayed matches and uses `todays[unplayedIndex]`.

**Currently**: Since `match.result` is never set (Bug 1), the re-filtered list is identical, so indexing works by accident.

**After Bug 1 fix**: The re-filtered list shrinks after each bout (previous bout now has `result`). `todays[i]` in bashoSlice points to the original index, but `simulateBoutForToday` picks `todays[i]` from the shrunk list → wrong match or undefined.

**Fix**: Change `bashoSlice.ts` to always pass `0` as the index (first unplayed match is always at index 0 after previous matches are resolved). Or refactor `simulateBoutForToday` to accept a `boutId` instead of an index.

**Preferred fix**: Pass `0` always. This is simpler and matches the pattern already used in `phase01_basho_bouts.ts:39`.

---

### Bug 5: `phase01_basho_bouts` re-simulates same bout 128 times

**Status**: ✅ APPROVED — CRITICAL

**Root cause**: `phase01_basho_bouts.ts:30-42` loops up to 128 times, always calling `simulateBoutForToday(currentWorld, 0)`. Since `match.result` is never set (Bug 1), the filter `!m.result` never shrinks, so `todays[0]` is always the same match. The loop runs 128 times simulating the same bout, wasting CPU and producing garbage state.

**Currently masked by**: Bug 1 (result never stored). After Bug 1 fix, this bug is automatically resolved because `todays[0]` advances past resolved bouts.

**Fix**: No separate fix needed — Bug 1 fix resolves this. However, add a test to verify the loop terminates correctly after Bug 1 fix.

---

### Bug 6: `onBashoEnded` called twice in `endBasho` flow

**Status**: ✅ APPROVED — LOW

**Root cause**: `world.ts:200-204` calls `onBashoEnded(world)` at line 202, then calls `runPostBashoResolution` which calls `onBashoEnded` again at `SimulationRunner.ts:74`.

**Impact**: Wasteful but likely idempotent (`updateLeaderboard` finds existing entries and returns early on second call). Potential for subtle bugs if leaderboard logic changes.

**Fix**: Remove the direct `onBashoEnded` call in `world.ts:202` since `runPostBashoResolution` already calls it.

---

### Bug 7: `determineSpecialPrizes` never awards prizes (downstream of Bug 1)

**Status**: ✅ APPROVED — HIGH (downstream of Bug 1)

**Root cause**: `specialPrizes.ts:30` checks `if (!m.result) continue`. Since `match.result` is never set (Bug 1), all matches are skipped and no prizes are awarded.

**Fix**: Automatically resolved by Bug 1 fix. No separate fix needed. Add regression test.

---

### Bug 8: `Bout of the Basho` never selected (downstream of Bug 1)

**Status**: ✅ APPROVED — MEDIUM (downstream of Bug 1)

**Root cause**: `BashoHistory.ts:106-112` iterates `basho.matches` and reads `match.result?.excitementScore`. Since `match.result` is never set, `topExcitement` stays at -1 and `boutOfTheBasho` is never set.

**Fix**: Automatically resolved by Bug 1 fix. No separate fix needed. Add regression test.

---

### Bug 9: `selectKeyBouts` returns empty array (downstream of Bug 1)

**Status**: ✅ APPROVED — MEDIUM (downstream of Bug 1)

**Root cause**: `recapProjections.ts:101` filters `matches.filter((m) => m.result != null)`. Since `match.result` is never set, the filtered array is always empty.

**Fix**: Automatically resolved by Bug 1 fix. No separate fix needed. Add regression test.

---

### Bug 10: `filter().length` performance in `boutNarrative.ts`

**Status**: ✅ APPROVED — LOW

**Root cause**: `boutNarrative.ts:485,1677` uses `.filter(s => s.division === "makuuchi").length` which allocates an intermediate array.

**Fix**: Replace with a `for...of` counter. Minor, but improves performance since this runs per-bout per-rikishi.

---

### Bug 11: `PrizeDistribution` drops sansho popularity boost

**Status**: ✅ APPROVED — MEDIUM

**Root cause**: `PrizeDistribution.ts:62-65` calls `applyAchievementImpact(world, tempR, "sansho")` on a *temp* copy of the rikishi. The returned `StateImpact` is **discarded** — it's never merged into the builder. Then at line 75, `tempR.economics` is spread into `builder.updateRikishi`, but `applyAchievementImpact` returned its impact to nowhere. The popularity boost is lost.

**Evidence**:
- `PrizeDistribution.ts:64` — `applyAchievementImpact(world, tempR, "sansho")` return value is not captured
- `sponsorshipMutations.ts:98-121` — `applyAchievementImpact` returns a `StateImpact` with `economics.popularity` updated; it does NOT mutate `tempR` in place
- `boutResultApplier.ts:149` — Correct usage: `builder.merge(applyAchievementImpact(world, winner, result.awardFact))`

**Impact**: Sansho prize winners never get the +12 popularity boost. Only the cash/retirement split is applied (lines 103-110), using the *original* `r.economics`, not the popularity-boosted one.

**Fix**: Capture and merge the impact: `const popImpact = applyAchievementImpact(world, r, "sansho"); builder.merge(popImpact);` Then apply the cash/retirement on top via a second `builder.updateRikishi` call (which is already there but uses `r.economics` not the boosted one — the merge will handle it since `updateRikishi` does shallow merge).

---

### Bug 12: "Loser falls out of co-leadership" narrative condition is unreachable

**Status**: ✅ APPROVED — LOW

**Root cause**: `boutNarrative.ts:1495-1496` checks `loserPrevWins === maxWins && loserWins < maxWins`. But `loserPrevWins` is defined as `standings.get(loserRikishi.id)?.wins ?? loserWins`. Since `standings` hasn't been updated yet (narrative runs BEFORE `applyBoutResult`), `standings.get(loser)?.wins` is the pre-bout wins count. And `loserWins` is `loserRikishi.currentBashoWins ?? 0` which is also the pre-bout count. So `loserPrevWins === loserWins`, making the condition `loserWins === maxWins && loserWins < maxWins` — a logical contradiction that can never be true.

**Evidence**:
- `boutNarrative.ts:1495` — `loserPrevWins = standings.get(loserRikishi.id)?.wins ?? loserWins` → same as `loserWins`
- `boutNarrative.ts:1496` — `loserPrevWins === maxWins && loserWins < maxWins` → `loserWins === maxWins && loserWins < maxWins` → impossible
- `boutResolver.ts:224-232` — `generateBoutNarrative` is called BEFORE `applyBoutResult`, so standings and currentBashoWins are both pre-bout

**Fix**: The intent is to detect when the loser WAS a co-leader (had maxWins before the bout) but is no longer (their wins didn't increase, someone else has more). The condition should use `loserWins` (pre-bout wins) for the first part (they had maxWins) and check that `winnerWins + 1 > loserWins` (winner now has more). Fixed condition: `loserWins === maxWins && winnerWins + 1 > maxWins`.

---

### Bug 13: `PlayoffResolver` has no injury/fatigue side-effects

**Status**: ✅ APPROVED — LOW (by design, but worth documenting)

**Root cause**: `PlayoffResolver.ts:42-49` calls `resolveBout` for playoff matches but does NOT call `applyBoutResult`. This means playoff bouts:
- Do NOT update standings (intentional — playoffs are separate)
- Do NOT update careerWins/careerLosses (potential issue)
- Do NOT trigger injury rolls
- Do NOT update rivalries or media

**Evidence**:
- `PlayoffResolver.ts:42-49` — Only calls `resolveBout`, not `applyBoutResult`
- `PlayoffResolver.ts:12` — Comment confirms: "skips the full applyBoutResult side-effects"

**Impact**: Playoff bouts don't cause injuries, don't update career records, don't generate media heat. This may be intentional for simplicity, but career records should arguably include playoff wins.

**Fix**: Debatable — if by design, document it. If not, at minimum call `applyBoutResult` for career record updates. Mark as LOW priority.

---

### Bug 14: `SIMULATE_BOUT` indexing bug (same as Bug 4, different path)

**Status**: ✅ APPROVED — LATENT (becomes active after Bug 1 fix)

**Root cause**: `bashoSlice.ts:56-66` — `SIMULATE_BOUT` handler pre-filters `todays` and finds `unplayedIndex` by `boutId`. It then passes this index to `simulateBoutForToday`, which re-filters unplayed bouts. After Bug 1 fix, if any prior bouts on the same day have been resolved, the index will be off.

**Currently**: Since `match.result` is never set (Bug 1), the re-filtered list is identical.

**After Bug 1 fix**: If the user simulates bouts one at a time (SIMULATE_BOUT), the index from the pre-filtered list in bashoSlice won't match the re-filtered list in `simulateBoutForToday` after previous bouts are resolved.

**Fix**: Same as Bug 4 — pass `0` as index, or refactor to use `boutId`.

---

### Bug 15: `BanzukePublisher` reads `stats.absences` from standings but standings never tracks absences

**Status**: ✅ APPROVED — MEDIUM

**Root cause**: `BanzukePublisher.ts:68` casts standings entries as `{ wins: number; losses: number; absences: number }`, but `boutResultApplier.ts:53-66` only ever sets `{ wins, losses }` in standings. `absences` is never written to the standings Map. `BanzukePublisher.ts:163,211` then reads `stats.absences` for kyujo tracking and kachi-koshi eligibility.

**Evidence**:
- `boutResultApplier.ts:53-66` — `standings.set(winner.id, { wins: wRec.wins + 1, losses: wRec.losses })` — no `absences` field
- `BanzukePublisher.ts:68` — `const stats = stats_any as { wins: number; losses: number; absences: number }` — expects `absences`
- `BanzukePublisher.ts:163` — `const isKyujo = stats.absences >= 15` — always false (undefined >= 15 is false)
- `BanzukePublisher.ts:211` — `const isFullAbsence = stats.absences >= 15` — always false
- `world.ts:261-268` — `getRikishiBashoStats` returns `{ wins: 0, losses: 0, absences: 0 }` as default, confirming absences should exist

**Impact**: 
- `isKyujo` is always false → `consecutiveKyujo` never increments → kyujo-based retirement pressure for yokozuna never triggers
- `isFullAbsence` is always false → kachi-koshi streak not broken by full absence (edge case)
- `stats.absences ?? 0` at line 233 → always 0 in career history

**Fix**: Either track absences in standings (when a rikishi is kyujo/absent for a day, increment absences in standings), or read absences from a different source (e.g., count matches where rikishi is scheduled but has fusensho result). This requires a design decision on where absences are tracked.

---

### Bug 16: `bashoSlice.test.ts` mock doesn't match real `simulateBoutForToday` behavior

**Status**: ✅ APPROVED — MEDIUM (test infrastructure)

**Root cause**: `bashoSlice.test.ts:81-96` mock resolves ALL unplayed matches at once (maps over all unplayed and sets result on each). The real `simulateBoutForToday` only simulates ONE bout per call. This masks the indexing bug (Bug 4) because the mock doesn't use the index parameter at all.

**Evidence**:
- `bashoSlice.test.ts:81-96` — Mock ignores `unplayedIndex` parameter, resolves all unplayed matches
- Real `world.ts:132` — Uses `unplayedIndex` to pick a specific match

**Fix**: Update the mock to simulate only ONE bout per call (the one at `unplayedIndex`), matching real behavior. Or better: use the real engine in integration tests.

---

### Disproved Findings

#### D1: `standings` not updated immutably

**Status**: ❌ DISPROVED

Initial concern that `basho.standings` might not be updated correctly. Verified that `boutResultApplier.ts:53` creates `new Map(basho.standings)`, updates it, stores in metadata at line 272, and `world.ts:174-186` applies it via `updateWorldField("currentBasho", { ..., standings: standingsMap })`. This is correct.

#### D2: `currentBashoWins`/`currentBashoLosses` reset at wrong time

**Status**: ❌ DISPROVED

Initial concern that these fields might not be reset between basho. Verified that `BanzukePublisher.ts:313-314,323-324` explicitly resets them to 0 on new banzuke entry. This is correct.

#### D3: `kinboshiThisBasho` reset between basho

**Status**: ❌ DISPROVED (not applicable)

Since `kinboshiThisBasho` is never initialized in the first place (Bug 3), there's no reset issue. After Bug 3 fix, it will be initialized fresh per basho by `initializeBasho`.

---

## Part 2: Test-First Implementation Plan

### Principle: ALL tests must be written and passing BEFORE any implementation fixes.

### Test Suite 1: `boutResultApplier.test.ts` (NEW — covers Bugs 1, 2)

**File**: `src/tests/unit/engine/bout/boutResultApplier.test.ts`

```
Test 1.1: applyBoutResult increments currentBashoWins on winner
Test 1.2: applyBoutResult increments currentBashoLosses on loser
Test 1.3: applyBoutResult sets currentBashoRecord on winner with correct wins/losses
Test 1.4: applyBoutResult sets currentBashoRecord on loser with correct wins/losses
Test 1.5: applyBoutResult increments careerWins on winner
Test 1.6: applyBoutResult increments careerLosses on loser
Test 1.7: applyBoutResult updates standings Map with winner wins+1
Test 1.8: applyBoutResult updates standings Map with loser losses+1
Test 1.9: applyBoutResult stores updatedStandings in metadata
Test 1.10: applyBoutResult handles missing currentBasho gracefully
Test 1.11: applyBoutResult handles missing rikishi gracefully
Test 1.12: applyBoutResult increments divisionRecords for winner
Test 1.13: applyBoutResult increments divisionRecords for loser
Test 1.14: applyBoutResult awards kinboshi achievement when awardFact is "kinboshi"
Test 1.15: applyBoutResult awards ginboshi achievement when awardFact is "ginboshi"
```

### Test Suite 2: `simulateBoutForToday.test.ts` (NEW — covers Bugs 1, 4, 5)

**File**: `src/tests/unit/engine/world/simulateBoutForToday.test.ts`

```
Test 2.1: simulateBoutForToday sets match.result on the correct match in currentBasho.matches
Test 2.2: simulateBoutForToday returns the bout result
Test 2.3: simulateBoutForToday with index 0 simulates the first unplayed match
Test 2.4: simulateBoutForToday with index 0 after one bout resolved simulates the second match
Test 2.5: simulateBoutForToday does not re-simulate already resolved bouts
Test 2.6: simulateBoutForToday updates standings in world state
Test 2.7: simulateBoutForToday updates currentBashoWins/currentBashoLosses in world state
Test 2.8: simulateBoutForToday returns { world } unchanged when no currentBasho
Test 2.9: simulateBoutForToday returns { world } unchanged when no unplayed matches
Test 2.10: simulateBoutForToday returns { world } unchanged when rikishi missing
Test 2.11: simulateBoutForToday handles fusensho (injured rikishi)
Test 2.12: simulateBoutForToday with playerTactic passes tactic to resolveBout
```

### Test Suite 3: `WorldFactory.initializeBasho.test.ts` (NEW — covers Bug 3)

**File**: `src/tests/unit/engine/systems/generation/initializeBasho.test.ts`

```
Test 3.1: initializeBasho returns basho with kinboshiThisBasho as empty object {}
Test 3.2: initializeBasho returns basho with day = 1
Test 3.3: initializeBasho returns basho with empty matches array
Test 3.4: initializeBasho returns basho with empty standings Map
Test 3.5: initializeBasho returns basho with isActive = true
Test 3.6: initializeBasho sets correct bashoNumber from bashoName
Test 3.7: initializeBasho generates deterministic id from seed
```

### Test Suite 4: `boutResolver.kinboshi.test.ts` (EXTEND — covers Bug 3)

**File**: `src/tests/unit/engine/bout/boutAchievements.test.ts` (already exists, extend)

```
Test 4.1: resolveBout updates kinboshiThisBasho when maegashira beats yokozuna
Test 4.2: resolveBout initializes kinboshiThisBasho if undefined (after fix, should not be needed)
Test 4.3: resolveBout does not update kinboshiThisBasho for non-kinboshi bouts
Test 4.4: resolveBout increments existing kinboshiThisBasho count
Test 4.5: resolveBout sets result.isKinboshi = true for kinboshi
Test 4.6: resolveBout sets result.awardFact = "kinboshi" for kinboshi
```

### Test Suite 5: `bashoSlice.simulate.test.ts` (EXTEND — covers Bugs 1, 4)

**File**: `src/tests/unit/contexts/bashoSlice.test.ts` (already exists, extend)

```
Test 5.1: SIMULATE_ALL_BOUTS simulates all unplayed bouts for current day
Test 5.2: SIMULATE_ALL_BOUTS does not re-simulate already played bouts
Test 5.3: SIMULATE_ALL_BOUTS stores unique results on each match
Test 5.4: SIMULATE_ALL_BOUTS with real engine (not mocked) resolves all bouts
Test 5.5: SIM_FULL_BASHO simulates all 15 days of bouts
Test 5.6: SIM_FULL_BASHO stores results on every match across all days
Test 5.7: SIMULATE_BOUT with boutId simulates the correct bout
Test 5.8: SIMULATE_BOUT stores result on the correct match
```

### Test Suite 6: `phase01_basho_bouts.test.ts` (NEW — covers Bug 5)

**File**: `src/tests/unit/engine/tick/phases/phase01_basho_bouts.test.ts`

```
Test 6.1: phase01_basho_bouts simulates all unplayed bouts for current day
Test 6.2: phase01_basho_bouts does not enter infinite loop (terminates < 128 iterations)
Test 6.3: phase01_basho_bouts advances basho day after all bouts resolved
Test 6.4: phase01_basho_bouts does nothing when cyclePhase is not active_basho
Test 6.5: phase01_basho_bouts does nothing when no currentBasho
Test 6.6: phase01_basho_bouts does nothing when all bouts already resolved
Test 6.7: phase01_basho_bouts sets match.result on every bout for the day
Test 6.8: phase01_basho_bouts increments currentBashoWins/currentBashoLosses
```

### Test Suite 7: `specialPrizes.test.ts` (NEW — covers Bug 7, regression for Bug 1)

**File**: `src/tests/unit/engine/banzuke/specialPrizes.test.ts`

```
Test 7.1: determineSpecialPrizes returns empty when no matches have results
Test 7.2: determineSpecialPrizes awards shukunsho to maegashira who beat yokozuna
Test 7.3: determineSpecialPrizes awards shukunsho to maegashira who beat yusho winner
Test 7.4: determineSpecialPrizes awards kantosho to maegashira with 10+ wins
Test 7.5: determineSpecialPrizes awards ginoSho to maegashira with 3+ unique kimarite
Test 7.6: determineSpecialPrizes does not award to non-maegashira
Test 7.7: determineSpecialPrizes does not award same rikishi multiple prizes
Test 7.8: determineSpecialPrizes excludes yusho winner from candidates
```

### Test Suite 8: `boutNarrative.stats.test.ts` (NEW — covers Bug 2, regression)

**File**: `src/tests/unit/engine/bout/boutNarrative.stats.test.ts`

```
Test 8.1: generateBoutNarrative uses correct currentBashoWins in winner_improves line
Test 8.2: generateBoutNarrative uses correct currentBashoLosses in loser_falls line
Test 8.3: generateBoutNarrative fires kachi_koshi when winner reaches threshold
Test 8.4: generateBoutNarrative fires make_koshi when loser reaches threshold
Test 8.5: generateBoutNarrative does NOT fire first_win when winner has existing wins
Test 8.6: generateBoutNarrative fires first_win only when winnerWins === 0
Test 8.7: generateBoutNarrative fires loss_streak when loser has 3+ losses and 0 wins
Test 8.8: generateBoutNarrative does NOT fire loss_streak when loser has wins
Test 8.9: generateBoutNarrative interview question type is kachi_koshi when winner achieves it
Test 8.10: generateBoutNarrative interview question type is make_koshi when loser achieves it
Test 8.11: generateBoutNarrative interview question type is milestone when career win milestone hit
Test 8.12: generateBoutNarrative interview question type is first_win only when winnerWins === 0
```

### Test Suite 9: `endBasho.dedup.test.ts` (NEW — covers Bug 6)

**File**: `src/tests/unit/engine/world/endBasho.test.ts`

```
Test 9.1: endBasho calls onBashoEnded exactly once (not twice)
Test 9.2: endBasho calls runPostBashoResolution
Test 9.3: endBasho does not duplicate records entries
Test 9.4: endBasho transitions cyclePhase to post_basho
```

### Test Suite 10: `recapProjections.test.ts` (NEW — covers Bug 9, regression for Bug 1)

**File**: `src/tests/unit/presenters/recapProjections.test.ts`

```
Test 10.1: selectKeyBouts returns empty array when no matches have results
Test 10.2: selectKeyBouts returns yusho_decider when day 15 has dramaticContext
Test 10.3: selectKeyBouts returns biggest upset when no yusho decider
Test 10.4: selectKeyBouts returns kinboshi moment
Test 10.5: selectKeyBouts deduplicates bouts (each bout appears once)
Test 10.6: selectKeyBouts falls back to persisted keyBouts when currentBasho is null
```

### Test Suite 11: `BashoHistory.boutOfBasho.test.ts` (NEW — covers Bug 8, regression for Bug 1)

**File**: `src/tests/unit/engine/lifecycle/BashoHistory.test.ts`

```
Test 11.1: recordBashoHistory sets boutOfTheBasho from highest excitementScore
Test 11.2: recordBashoHistory does not set boutOfTheBasho when no results
Test 11.3: recordBashoHistory persists keyBouts from selectKeyBouts
Test 11.4: recordBashoHistory records yusho and junYusho correctly
```

### Test Suite 12: `PrizeDistribution.kinboshi.test.ts` (NEW — covers Bug 3 downstream, Bug 11)

**File**: `src/tests/unit/engine/lifecycle/PrizeDistribution.test.ts`

```
Test 12.1: payKinboshiStipends pays stipends when kinboshiThisBasho has entries
Test 12.2: payKinboshiStipends pays nothing when kinboshiThisBasho is empty
Test 12.3: payKinboshiStipends pays nothing when kinboshiThisBasho is undefined
Test 12.4: payKinboshiStipends calculates correct amount (count * stipend)
Test 12.5: payKinboshiStipends skips retired rikishi
Test 12.6: payBashoTeate pays non-sekitori rikishi only
Test 12.7: payBashoTeate pays correct amount per division
Test 12.8: distributePrizes applies popularity boost for sansho winners (Bug 11)
Test 12.9: distributePrizes credits cash + retirement for sansho
Test 12.10: distributePrizes does not double-apply economics updates
```

### Test Suite 13: `boutNarrative.yusho.test.ts` (NEW — covers Bug 12)

**File**: `src/tests/unit/engine/bout/boutNarrative.yusho.test.ts`

```
Test 13.1: "falls_out" storyline fires when loser was co-leader and winner overtakes
Test 13.2: "falls_out" storyline does NOT fire when loser was not co-leader
Test 13.3: "falls_out" storyline does NOT fire when loser is still co-leader
Test 13.4: "sole_leader" storyline fires when winner becomes sole leader
Test 13.5: "ties_leader" storyline fires when winner ties co-leaders
```

### Test Suite 14: `PlayoffResolver.test.ts` (NEW — covers Bug 13)

**File**: `src/tests/unit/engine/lifecycle/PlayoffResolver.test.ts`

```
Test 14.1: resolvePlayoffs returns correct winner from single-elimination bracket
Test 14.2: resolvePlayoffs handles 2-candidate playoff (1 bout)
Test 14.3: resolvePlayoffs handles 3-candidate playoff (bye + 2 bouts)
Test 14.4: resolvePlayoffs handles 4-candidate playoff (2 bouts + final)
Test 14.5: resolvePlayoffs stores result on each playoff match
Test 14.6: resolvePlayoffs does not update standings (by design)
Test 14.7: resolvePlayoffs does not update careerWins/careerLosses (documents Bug 13)
Test 14.8: calculateStandings returns correct topCandidates from standings Map
Test 14.9: calculateStandings handles empty standings
Test 14.10: calculateStandings ties broken by stableTieBreak
```

### Test Suite 15: `BanzukePublisher.absences.test.ts` (NEW — covers Bug 15)

**File**: `src/tests/unit/engine/banzuke/BanzukePublisher.absences.test.ts`

```
Test 15.1: BanzukePublisher reads absences from standings (currently always 0 — Bug 15)
Test 15.2: isKyujo triggers when absences >= 15 (currently never triggers)
Test 15.3: consecutiveKyujo increments when full absence detected
Test 15.4: isFullAbsence blocks consecutiveKachiKoshi increment
Test 15.5: careerHistory records absences value from standings
```

### Test Suite 16: `bashoSlice.integration.test.ts` (NEW — covers Bugs 4, 14, 16)

**File**: `src/tests/unit/contexts/bashoSlice.integration.test.ts`

```
Test 16.1: SIMULATE_ALL_BOUTS with real engine simulates all bouts without skipping (Bug 4)
Test 16.2: SIM_FULL_BASHO with real engine simulates all 15 days without skipping (Bug 4)
Test 16.3: SIMULATE_BOUT with real engine simulates correct bout by boutId (Bug 14)
Test 16.4: SIMULATE_BOUT called sequentially resolves bouts one at a time (Bug 14)
Test 16.5: Mock in bashoSlice.test.ts matches real simulateBoutForToday behavior (Bug 16)
Test 16.6: SIMULATE_ALL_BOUTS sets match.result on every bout for the day
Test 16.7: SIM_FULL_BASHO sets match.result on every bout across all 15 days
```

---

## Part 3: Implementation Sequence

### Phase 0: Write ALL Tests (TEST-FIRST)

**Order** (dependencies first):

1. Write Test Suite 3 (`initializeBasho.test.ts`) — 7 tests
2. Write Test Suite 1 (`boutResultApplier.test.ts`) — 15 tests
3. Write Test Suite 2 (`simulateBoutForToday.test.ts`) — 12 tests
4. Write Test Suite 4 (`boutAchievements.test.ts` extend) — 6 tests
5. Write Test Suite 6 (`phase01_basho_bouts.test.ts`) — 8 tests
6. Write Test Suite 5 (`bashoSlice.test.ts` extend) — 8 tests
7. Write Test Suite 7 (`specialPrizes.test.ts`) — 8 tests
8. Write Test Suite 8 (`boutNarrative.stats.test.ts`) — 12 tests
9. Write Test Suite 9 (`endBasho.test.ts`) — 4 tests
10. Write Test Suite 10 (`recapProjections.test.ts`) — 6 tests
11. Write Test Suite 11 (`BashoHistory.test.ts`) — 4 tests
12. Write Test Suite 12 (`PrizeDistribution.test.ts`) — 10 tests
13. Write Test Suite 13 (`boutNarrative.yusho.test.ts`) — 5 tests
14. Write Test Suite 14 (`PlayoffResolver.test.ts`) — 10 tests
15. Write Test Suite 15 (`BanzukePublisher.absences.test.ts`) — 5 tests
16. Write Test Suite 16 (`bashoSlice.integration.test.ts`) — 7 tests

**Total**: 127 new tests across 16 files

**Expected state**: Tests for Bugs 1, 2, 3, 5, 7, 8, 9, 11, 12, 15 will FAIL (bugs not yet fixed). Tests for Bug 4, 14 will FAIL (latent). Tests for Bug 6 may pass (idempotent). Tests for Bug 10 will pass (performance, not correctness). Tests for Bug 13 will pass (documents existing behavior). Tests for Bug 16 will fail (mock mismatch).

### Phase 1: Fix Bug 3 (kinboshiThisBasho initialization)

**Files to edit**:
1. `src/engine/systems/generation/WorldFactory.ts` — Add `kinboshiThisBasho: {}` to `initializeBasho`
2. `src/engine/bout/boutResolver.ts:243` — Change guard from `!== undefined` to always initialize

**Tests that should now pass**: Suite 3, Suite 4 (partial), Suite 12 (partial)

### Phase 2: Fix Bug 2 (currentBashoWins/Losses/Record)

**Files to edit**:
1. `src/engine/bout/boutResultApplier.ts:61-66` — Add `currentBashoWins`, `currentBashoLosses`, `currentBashoRecord` increments

**Tests that should now pass**: Suite 1 (partial), Suite 8 (partial)

### Phase 3: Fix Bug 1 (match.result storage)

**Files to edit**:
1. `src/engine/world.ts:170-189` — After applying impacts, update `currentBasho.matches` immutably to set `result` on the matched bout

**Tests that should now pass**: Suite 2, Suite 6, Suite 7, Suite 10, Suite 11

### Phase 4: Fix Bug 4 (indexing in bashoSlice)

**Files to edit**:
1. `src/contexts/bashoSlice.ts:92-95,128-131` — Change `simulateBoutForToday(world, i, ...)` to `simulateBoutForToday(world, 0, ...)`

**Tests that should now pass**: Suite 5

### Phase 5: Fix Bug 6 (duplicate onBashoEnded)

**Files to edit**:
1. `src/engine/world.ts:200-204` — Remove direct `onBashoEnded` call

**Tests that should now pass**: Suite 9

### Phase 6: Fix Bug 10 (filter().length performance)

**Files to edit**:
1. `src/engine/bout/boutNarrative.ts:485` — Replace `.filter().length` with `for...of` counter
2. `src/engine/bout/boutNarrative.ts:1677` — Replace `.filter().length` with `for...of` counter

**Tests**: Already passing (performance, not correctness)

### Phase 7: Fix Bug 11 (sansho popularity boost dropped)

**Files to edit**:
1. `src/engine/lifecycle/PrizeDistribution.ts:62-65` — Capture and merge `applyAchievementImpact` return value

**Tests that should now pass**: Suite 12 (Tests 12.8-12.10)

### Phase 8: Fix Bug 12 (unreachable "falls_out" condition)

**Files to edit**:
1. `src/engine/bout/boutNarrative.ts:1495-1496` — Fix condition to `loserWins === maxWins && winnerWins + 1 > maxWins`

**Tests that should now pass**: Suite 13

### Phase 9: Fix Bug 15 (absences not tracked in standings)

**Files to edit**:
1. `src/engine/bout/boutResultApplier.ts` — Add `absences` field to standings entries (initialize to 0 if missing)
2. `src/engine/schedule.ts` or `world.ts` — When a rikishi is kyujo/absent, increment absences in standings
3. `src/engine/banzuke/BanzukePublisher.ts:68` — Ensure `stats.absences` is read correctly

**Tests that should now pass**: Suite 15

### Phase 10: Fix Bug 16 (test mock mismatch)

**Files to edit**:
1. `src/tests/unit/contexts/bashoSlice.test.ts:81-96` — Update mock to simulate one bout per call

**Tests that should now pass**: Suite 16 (Test 16.5)

### Phase 11: Full Verification

```bash
bun run test                                    # All tests pass
bun run typecheck                                # Zero errors
bun run lint                                     # No new errors
bun run build                                    # Production build succeeds
bun run test -- --grep "bout"                    # All bout-related tests
bun run test -- --grep "basho"                   # All basho-related tests
bun run test -- --grep "simulate"                # All simulation tests
```

---

## Part 4: Summary

| Bug | Severity | Root Cause File | Fix Phase | Tests |
|-----|----------|----------------|-----------|-------|
| 1 | CRITICAL | `world.ts` | Phase 3 | Suite 2, 6, 7, 10, 11 |
| 2 | CRITICAL | `boutResultApplier.ts` | Phase 2 | Suite 1, 8 |
| 3 | HIGH | `WorldFactory.ts` | Phase 1 | Suite 3, 4, 12 |
| 4 | LATENT | `bashoSlice.ts` | Phase 4 | Suite 5, 16 |
| 5 | CRITICAL | `phase01_basho_bouts.ts` | Auto (Bug 1) | Suite 6 |
| 6 | LOW | `world.ts` | Phase 5 | Suite 9 |
| 7 | HIGH | `specialPrizes.ts` | Auto (Bug 1) | Suite 7 |
| 8 | MEDIUM | `BashoHistory.ts` | Auto (Bug 1) | Suite 11 |
| 9 | MEDIUM | `recapProjections.ts` | Auto (Bug 1) | Suite 10 |
| 10 | LOW | `boutNarrative.ts` | Phase 6 | — |
| 11 | MEDIUM | `PrizeDistribution.ts` | Phase 7 | Suite 12 |
| 12 | LOW | `boutNarrative.ts` | Phase 8 | Suite 13 |
| 13 | LOW | `PlayoffResolver.ts` | Documented | Suite 14 |
| 14 | LATENT | `bashoSlice.ts` | Phase 4 | Suite 16 |
| 15 | MEDIUM | `boutResultApplier.ts` / `BanzukePublisher.ts` | Phase 9 | Suite 15 |
| 16 | MEDIUM | `bashoSlice.test.ts` | Phase 10 | Suite 16 |

**Total tests**: 127 new tests across 16 files
**Total fix phases**: 10 (Phases 1-10)
**Estimated effort**: 10-14 hours (test writing + implementation + verification)
