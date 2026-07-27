# NHK Narrative Integration Plan

## Overview
Implement 8 identified narrative gaps to enrich the existing bout/match/combat systems with NHK-style commentary elements.

---

## Gap 1: Career Bout Count Milestones
**Problem:** Only career *win* milestones exist (`CAREER_WIN_MILESTONES = [100, 200, 300, 500]`). NHK frequently mentions total career appearances (e.g., "900th career bout").

### Changes:
- **`src/constants/engine/generation.ts`**: Add `CAREER_BOUT_MILESTONES = [500, 700, 1000, 1200]`
- **`src/engine/bard/archive.json`**: Add `pre_bout.career_bout_milestone` and `post_bout.career_bout_milestone` templates
- **`src/engine/bout/boutNarrative.ts`**:
  - Pre-bout: After section 3h (career win milestone), add 3h2 — check if either rikishi's total career bouts (careerWins + careerLosses) hits a milestone
  - Post-bout: After section 13 (career win milestone), add 13b — check if winner's total career bouts hits a milestone
- **Tests**: Add to `boutNarrative.postBout.test.ts` — verify career bout milestone line appears at 999 career bouts (pre-bout) → 1000 after bout

---

## Gap 2: Kyujo/Withdrawal Narrative
**Problem:** Mechanics exist in `LoopDecisionEngine.ts` and `HealthActions.ts` but no narrative lines are generated when a rikishi withdraws.

### Changes:
- **`src/engine/bard/archive.json`**: Add new top-level `kyujo` section with templates:
  - `kyujo.injury_withdrawal` — rikishi withdraws due to injury mid-basho
  - `kyujo.pre_basho_withdrawal` — rikishi sits out entire basho
  - `kyujo.return_from_kyujo` — rikishi returns after missing a basho (already partially exists in `pre_bout.previous_basho.kyujo` but needs a dedicated return template)
- **`src/engine/bout/boutNarrative.ts`**: Add a `generateKyujoNarrative` export function that produces `PbpLine[]` for withdrawal events
- **`src/engine/loop/LoopDecisionEngine.ts`**: Call `generateKyujoNarrative` when processing kyujo_decision → withdraw option
- **`src/engine/systems/health/HealthActions.ts`**: Call `generateKyujoNarrative` in `withdrawRikishi`
- **Tests**: New test file `boutNarrative.kyujo.test.ts` — verify narrative lines generated, no missing tokens, deterministic

---

## Gap 3: Playoff Bout Narrative
**Problem:** `PlayoffResolver.ts` resolves playoffs but doesn't call `generateBoutNarrative` for each playoff bout. Only a simple event log line.

### Changes:
- **`src/engine/bard/archive.json`**: Add `pre_bout.playoff_bout` and `post_bout.playoff_result` templates
- **`src/engine/lifecycle/PlayoffResolver.ts`**: After resolving each playoff bout, call `generateBoutNarrative` with a playoff-specific seed and attach `pbpLines` to the bout result. Add playoff narrative to the match schedule entries.
- **`src/engine/lifecycle/CompetitionService.ts`**: When logging playoff results, include narrative lines in the event data
- **Tests**: New test file `playoffNarrative.test.ts` — verify playoff bouts have pbpLines, no missing tokens

---

## Gap 4: Sansho Prize Ceremony Narrative
**Problem:** `PrizeDistribution.ts` logs events but doesn't generate rich narrative text. Only basic economy templates exist.

### Changes:
- **`src/engine/bard/archive.json`**: Add `sansho_ceremony` section with templates:
  - `sansho_ceremony.shukunsho` — Outstanding Performance Prize
  - `sansho_ceremony.kantosho` — Fighting Spirit Prize
  - `sansho_ceremony.ginosho` — Technique Prize
  - `sansho_ceremony.ceremony_intro` — opening line for the prize ceremony
  - `sansho_ceremony.multiple_prizes` — rikishi wins multiple sansho
- **`src/engine/lifecycle/PrizeDistribution.ts`**: After distributing prizes, generate narrative lines using BardEngine and attach to the event log
- **Tests**: New test file `prizeDistribution.narrative.test.ts` — verify sansho narrative lines generated

---

## Gap 5: Comeback Win Post-Bout Narrative
**Problem:** Edge crisis recovery is narrated during the bout, and `boutResultApplier.ts` tracks `comebackWins`, but there's no specific post-bout "comeback victory" line.

### Changes:
- **`src/engine/bard/archive.json`**: Add `post_bout.comeback_win` templates
- **`src/engine/bout/boutNarrative.ts`**: After section 15c (upset over elite), add 15c2 — check if result.log contains edge_crisis entries where winner escaped, and if so emit a comeback win narrative line with `["comeback"]` tag
- **Tests**: Add to `boutNarrative.postBout.test.ts` — verify comeback win line when winner has edge_crisis escape in log

---

## Gap 6: Bout of the Day Designation
**Problem:** `DramaMatchmaker.ts` assigns drama labels and scores, but there's no pre-bout narrative saying "this is the featured bout of the day."

### Changes:
- **`src/engine/bard/archive.json`**: Add `pre_bout.bout_of_the_day` templates
- **`src/engine/bout/boutNarrative.ts`**: After section 3p3 (kensho mention), add 3p4 — check if result has a `dramaScore` field ≥ 85 (or check match.dramaticContext), and if so emit a "bout of the day" narrative line with `["tournament_context"]` tag
- **`src/engine/types/basho.ts`**: Ensure `BoutResult` includes optional `dramaScore` field (or read from match schedule)
- **Tests**: Add to existing pre-bout test file — verify bout of the day line when dramaScore ≥ 85

---

## Gap 7: Spoiler Narrative
**Problem:** No "spoiler" role detection for former sanyaku/ozeki blocking a promotion candidate's path.

### Changes:
- **`src/engine/bard/archive.json`**: Add `pre_bout.spoiler` templates
- **`src/engine/bout/boutNarrative.ts`**: After section 3j3 (yokozuna promotion), add 3j3b — detect if one rikishi is a former sanyaku/ozeki (via careerHistory) now ranked lower, facing an opponent who is in yusho contention or on a promotion track. Emit spoiler narrative line with `["title_stakes"]` tag.
- **Tests**: Add to existing pre-bout test file — verify spoiler line when former ozeki (now maegashira) faces yusho contender

---

## Gap 8: New Rank Debut (Shin-Sekiwake/Shin-Komusubi)
**Problem:** Career phase debut exists but no specific rank-promotion debut narrative. NHK prominently mentions "shin-komusubi" or "shin-sekiwake" debuts.

### Changes:
- **`src/engine/bard/archive.json`**: Add `pre_bout.rank_debut` templates with sub-paths for `shin_sekiwake`, `shin_komusubi`, `shin_maegashira`
- **`src/engine/bout/boutNarrative.ts`**: After section 3j4 (career phase), add 3j4b — detect if either rikishi is at a new career-high sanyaku rank (check careerHistory for previous basho rank being lower). Emit rank debut narrative line with `["debut"]` tag.
- **Tests**: Add to existing pre-bout test file — verify shin-komusubi debut line

---

## Implementation Order
1. Add all new archive.json templates (single edit)
2. Add `CAREER_BOUT_MILESTONES` constant
3. Modify `boutNarrative.ts` for gaps 1, 5, 6, 7, 8 (pre-bout and post-bout hooks)
4. Add `generateKyujoNarrative` function (gap 2)
5. Modify `PlayoffResolver.ts` (gap 3)
6. Modify `PrizeDistribution.ts` (gap 4)
7. Write all tests
8. Run tests to verify

## Test Strategy
- Test-first: Write tests before implementation for each gap
- Deterministic: All tests use seeded RNG and verify no `[MISSING:]` tokens
- Coverage: At least 2 tests per gap (positive case + negative/deterministic case)
