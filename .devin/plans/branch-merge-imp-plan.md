# Branch Merge & Implementation Plan

**Project**: sumo-manager-pro (Basho Sumo Manager Game)
**Date**: 2026-07-26
**Scope**: Merge 5 open PR branches into `main`, resolve conflicts, evaluate PR comments, fix additional bugs found during exhaustive code review. No backwards compatibility or save file constraints.

---

## Part 1: Branch Inventory & Merge Plan

### 1.1 Open PRs

All 5 branches were created from `abfe973d` or `5d75b548` (both already merged into `main` at `c5763663`). Each branch has a single commit with a small unique delta. No PR has review comments (only bot greetings from Jules/Gemini, both sunset).

| #   | PR   | Branch                                                           | Unique Change                                                                                     | Files Touched                                                                                                                                                                                                     |
| --- | ---- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | #727 | `bolt-optimize-makuuchi-count-10662305893688698680`              | Replace `.filter().length` with `for...of` loop for `makuuchiCount`                               | `src/engine/bout/boutNarrative.ts`, `.jules/bolt.md`                                                                                                                                                              |
| 2   | #728 | `curator-surface-ginboshi-1943275196600659717`                   | Surface ginboshi in profile header, rikishi card, intai ceremony                                  | `src/components/game/IntaiCeremony.tsx`, `src/components/game/RikishiCard.tsx`, `src/components/rikishi/RikishiProfileHeader.tsx`, `src/tests/unit/components/RikishiProfileHeader.test.tsx`, `.jules/curator.md` |
| 3   | #729 | `polish-rivalries-empty-state-14669782824540868683`              | Replace bespoke empty state with standard `EmptyState` component                                  | `src/components/rivalries/RivalriesEmptyState.tsx`, `.jules/polish.md`                                                                                                                                            |
| 4   | #730 | `palette-ux-listcard-keyboard-accessibility-8581097588130117546` | Add keyboard accessibility (role, tabIndex, Enter/Space handlers, focus-visible) to ListCard rows | `src/components/layout/control-center/ListCard.tsx`                                                                                                                                                               |
| 5   | #731 | `bard-expand-post-bout-reactions-13050769027657083684`           | Add 5 new post-bout reaction variants                                                             | `src/engine/bard/archive.json`, `.jules/bard.md`                                                                                                                                                                  |

### 1.2 Conflict Analysis

**Source code conflicts**: NONE expected. Each branch touches distinct files.

- PR #727 touches `boutNarrative.ts` at line 485 (makuuchiCount optimization).
- The uncommitted working-tree changes also touch `boutNarrative.ts` but at different lines (628, 1340, 1351, 1360, 1679, 1717). No conflict with PR #727's change at line 485.

**Task-tracking markdown conflicts**: EXPECTED in `.jules/*.md` files. Each branch appends its own learning entry. These are additive and can be resolved by concatenating entries.

**Merge order** (safest first — content/optimization before UI before narrative):

1. PR #727 — `bolt-optimize-makuuchi-count` (engine optimization)
2. PR #731 — `bard-expand-post-bout-reactions` (narrative content, mergeable=CLEAN)
3. PR #729 — `polish-rivalries-empty-state` (UI: RivalriesEmptyState)
4. PR #730 — `palette-ux-listcard-keyboard-accessibility` (UI: ListCard a11y)
5. PR #728 — `curator-surface-ginboshi` (UI: ginboshi display + tests)

### 1.3 Merge Procedure

For each branch:

```bash
git checkout main
git merge --no-ff origin/<branch-name>
# Resolve .jules/*.md conflicts by concatenating entries
git add .jules/*.md && git commit
bun run typecheck && bun run test
```

After all merges, delete remote branches:

```bash
git push origin --delete <branch-name>
```

### 1.4 Pre-Merge: Commit Working-Tree Changes

The working tree has uncommitted fixes to `boutNarrative.ts` and `boutNarrative.postBout.test.ts` that fix off-by-one bugs in career milestone and record display logic. These must be committed to `main` BEFORE merging branches to avoid conflicts.

```bash
git add src/engine/bout/boutNarrative.ts src/tests/unit/engine/bout/boutNarrative.postBout.test.ts
git commit -m "Fix off-by-one in bout narrative: careerWins/currentBasho records must account for the win/loss being narrated"
```

---

## Part 2: PR Comment Evaluation

### 2.1 PR #727 (Bolt: optimize makuuchiCount)

**Comments**: Only bot greetings (Jules, Gemini). No review feedback.

**Code evaluation**:

- Replaces `r.careerHistory.filter(s => s.division === "makuuchi").length` with a `for...of` counting loop at `boutNarrative.ts:485`.
- Functionally equivalent. Micro-optimization to avoid intermediate array allocation.
- **Verdict**: ✅ APPROVED. Merge as-is.

### 2.2 PR #728 (Curator: surface ginboshi)

**Comments**: Only bot greetings. No review feedback.

**Code evaluation**:

- `RikishiProfileHeader.tsx`: Adds "Ginboshi" stat with `condition: ginboshiEarned > 0`. Correct.
- `RikishiCard.tsx`: Wraps "Silver Stars Won" in `{ginboshiEarned > 0 && (...)}` conditional. Adds "Silver Stars Conceded" block for ozeki rank. Correct.
- `IntaiCeremony.tsx`: Adds ginboshi line to retirement narrative when `ginboshiEarned > 0`. Correct.
- `RikishiProfileHeader.test.tsx`: Adds 2 tests (renders when >0, hides when ===0). Good coverage.
- **Inconsistency**: `kinboshiEarned` in `RikishiCard.tsx` is always shown (no conditional), but `ginboshiEarned` is conditionally hidden. This is intentional — gold stars are more prestigious and always displayed. ✅
- **Verdict**: ✅ APPROVED. Merge as-is.

### 2.3 PR #729 (Polish: rivalries empty state)

**Comments**: Only bot greetings. No review feedback.

**Code evaluation**:

- Replaces bespoke `CardContent` with `p-12 text-center` and manual icon/heading/text with `<EmptyState icon={Swords} title="..." description="..." />`.
- Delegates to design system component. `EmptyState` at `src/components/ui/EmptyState.tsx` provides consistent styling with icon container, title, and description.
- `CardContent` className changes from `p-12 text-center` to `p-0` to let `EmptyState` handle padding.
- **Verdict**: ✅ APPROVED. Merge as-is.

### 2.4 PR #730 (Palette: ListCard keyboard accessibility)

**Comments**: Only bot greetings. No review feedback.

**Code evaluation**:

- Adds `role="button"`, `tabIndex={0}`, `onKeyDown` handler (Enter/Space → `row.onClick()`), and `focus-visible` styling to clickable ListCard rows.
- Guards: `role` and `tabIndex` are only set when `row.onClick` exists. `onKeyDown` checks `row.onClick` before calling.
- `e.preventDefault()` on Space key prevents page scroll. Correct.
- **Verdict**: ✅ APPROVED. Merge as-is.

### 2.5 PR #731 (Bard: expand post-bout reactions)

**Comments**: Only bot greetings. No review feedback.

**Code evaluation**:

- Adds 5 new variants to `post_bout.reaction` array in `archive.json`:
  - "No doubt about that one — %WINNER% executes a flawless %KIMARITE%."
  - "A masterful display from %WINNER%, dispatching %LOSER% with %KIMARITE%."
  - "%WINNER% leaves no room for error, finishing %LOSER% off swiftly."
  - "The technique is undeniable. %WINNER% secures the win via %KIMARITE%."
  - "Total dominance on the dohyo today as %WINNER% handles %LOSER%."
- All tokens (`%WINNER%`, `%LOSER%`, `%KIMARITE%`) are provided by the resolver call at `boutNarrative.ts:1320-1326`. ✅
- **Verdict**: ✅ APPROVED. Merge as-is. Mergeable status: CLEAN.

---

## Part 3: Additional Bugs Found

### 3.1 BUG: `SIMULATE_ALL_BOUTS` skips every other bout (HIGH PRIORITY)

**Location**: `src/contexts/bashoSlice.ts:92-98`

**Root cause**: The loop pre-computes `todays` (unplayed matches) and iterates with index `i`. It passes `i` to `worldEngine.simulateBoutForToday(world, i, playerTactic)`. However, `simulateBoutForToday` at `src/engine/world.ts:132` **re-filters** `basho.matches` to find unplayed matches and uses `unplayedIndex` to index into that fresh filtered list.

After the first bout is simulated (i=0), the match is marked as resolved in the world. When i=1, `simulateBoutForToday` re-filters and gets a shorter list (the previously simulated match is excluded). Passing `i=1` now refers to the **third** unplayed match, not the second. The second match is skipped.

**Impact**: When there are N unplayed bouts in a day, `SIMULATE_ALL_BOUTS` only simulates bouts at positions 0, 2, 4, ... (every other bout). Bouts at positions 1, 3, 5, ... are never simulated.

**Fix**: Always pass `0` as the index, since `simulateBoutForToday` re-filters internally and we always want the next unplayed match:

```ts
// Line 95: Change
const result = worldEngine.simulateBoutForToday(world, i, playerTactic);
// To:
const result = worldEngine.simulateBoutForToday(world, 0, playerTactic);
```

**Test**: The existing test at `bashoSlice.test.ts:73` masks this bug because the mock marks ALL unplayed matches as resolved in a single call. Need a test where the mock only resolves one match at a time.

### 3.2 BUG: `SIM_FULL_BASHO` has the same indexing bug (HIGH PRIORITY)

**Location**: `src/contexts/bashoSlice.ts:128-133`

**Root cause**: Same as 3.1. The inner loop passes `i` to `simulateBoutForToday`, but after each simulation, the internal re-filtering shifts the indices.

**Fix**: Same fix — always pass `0`:

```ts
// Line 131: Change
const result = worldEngine.simulateBoutForToday(world, i, playerTactic);
// To:
const result = worldEngine.simulateBoutForToday(world, 0, playerTactic);
```

### 3.3 BUG: "Loser falls out of co-leadership" condition is unreachable (MEDIUM PRIORITY)

**Location**: `src/engine/bout/boutNarrative.ts:1494-1505`

**Root cause**: The condition is:

```ts
const loserPrevWins = (standings.get(loserRikishi.id)?.wins ?? loserWins);
if (loserPrevWins === maxWins && loserWins < maxWins) {
```

`loserWins` is `loserRikishi.currentBashoWins ?? 0` (wins BEFORE this bout). Since the loser lost, their wins don't change. `loserPrevWins` is `standings.get(loserRikishi.id)?.wins ?? loserWins`, which is also the wins before this bout. So `loserPrevWins === loserWins`.

The condition `loserPrevWins === maxWins && loserWins < maxWins` simplifies to `loserWins === maxWins && loserWins < maxWins`, which is a **contradiction** and can never be true.

**Intent**: Detect when the loser was a co-leader but the winner just took the sole lead, pushing the loser out.

**Fix**: The condition should check if the loser was at the previous max (which is now `maxWins - 1` if the winner took sole lead):

```ts
if (loserPrevWins === maxWins - 1 && winnerWins + 1 === maxWins && coLeaders === 1) {
```

This triggers when: the winner just became sole leader at `maxWins`, and the loser was at `maxWins - 1` (the previous co-leader level).

### 3.4 BUG: Second `makuuchiCount` `.filter().length` not optimized (LOW PRIORITY)

**Location**: `src/engine/bout/boutNarrative.ts:1677`

**Root cause**: PR #727 optimizes the `makuuchiCount` calculation at line 485 but misses the identical pattern at line 1677:

```ts
const makuuchiTournaments =
  winnerRikishi.careerHistory?.filter((s) => s.division === "makuuchi").length ?? 0;
```

**Fix**: Apply the same `for...of` optimization:

```ts
let makuuchiTournaments = 0;
if (winnerRikishi.careerHistory) {
  for (const s of winnerRikishi.careerHistory) {
    if (s.division === "makuuchi") makuuchiTournaments++;
  }
}
```

### 3.5 BUG: Post-bout "winning streak" uses total basho wins, not consecutive wins (LOW PRIORITY / DESIGN QUESTION)

**Location**: `src/engine/bout/boutNarrative.ts:1510-1520`

**Root cause**: `if (winnerWins >= 3)` triggers `streak_continued` template, but `winnerWins` is `winnerRikishi.currentBashoWins` (total wins in the basho), not a consecutive win streak. A rikishi at 3-5 could trigger "streak continued" which is misleading.

**Note**: This may be intentional — the template says "winning streak" but in context of a basho, total wins is a proxy for form. Flagging as a design question, not a definitive bug. No fix recommended without product clarification.

### 3.6 OBSERVATION: `bashoSlice.test.ts` mock doesn't match real `simulateBoutForToday` behavior

**Location**: `src/tests/unit/contexts/bashoSlice.test.ts:81-96`

**Issue**: The mock for `SIMULATE_ALL_BOUTS` marks ALL unplayed matches as resolved in a single call, which masks the indexing bug (3.1). The real `simulateBoutForToday` only resolves one match per call.

**Fix**: Update the mock to only resolve the first unplayed match per call, matching real behavior. Add a regression test that verifies all bouts are simulated (not every other one).

---

## Part 4: Execution Order

1. **Commit working-tree changes** to `main` (off-by-one fixes in `boutNarrative.ts`)
2. **Merge PR #727** (bolt-optimize-makuuchi-count) + apply fix 3.4 (second `.filter().length`)
3. **Merge PR #731** (bard-expand-post-bout-reactions)
4. **Merge PR #729** (polish-rivalries-empty-state)
5. **Merge PR #730** (palette-ux-listcard-keyboard-accessibility)
6. **Merge PR #728** (curator-surface-ginboshi)
7. **Fix bug 3.1** (SIMULATE_ALL_BOUTS indexing)
8. **Fix bug 3.2** (SIM_FULL_BASHO indexing)
9. **Fix bug 3.3** (loser falls out condition)
10. **Fix bug 3.6** (test mock + regression test)
11. **Run full test suite**: `bun run typecheck && bun run test`
12. **Delete remote branches** for all 5 PRs
13. **Commit and push** all fixes

---

## Part 5: Verification Checklist

- [ ] `bun run typecheck` passes
- [ ] `bun run test` passes (all existing tests)
- [ ] New regression test for `SIMULATE_ALL_BOUTS` verifies all bouts simulated
- [ ] New regression test for `SIM_FULL_BASHO` verifies all bouts simulated
- [ ] `boutNarrative.ts` off-by-one fix verified by updated `postBout.test.ts`
- [ ] "Loser falls out" narrative line triggers correctly in test
- [ ] All 5 remote branches deleted
- [ ] No uncommitted changes remaining
