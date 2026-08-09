# NHK Narrative Integration Plan

## Overview

Implement 8 identified narrative gaps to enrich the existing bout/match/combat systems with NHK-style commentary elements.

All gaps verified against current codebase. Line numbers refer to `src/engine/bout/boutNarrative.ts` unless noted.

---

## Gap 1: Career Bout Count Milestones

**Problem:** Only career _win_ milestones exist (`CAREER_WIN_MILESTONES` imported at line ~30 from `generation.ts`). NHK frequently mentions total career appearances (e.g., "900th career bout"). `careerBouts` is already computed at line 839 but only used for phase classification, not milestone detection.

### Changes:

- **`src/constants/engine/generation.ts`**: Add `CAREER_BOUT_MILESTONES = [500, 700, 1000, 1200]` near the existing `CAREER_WIN_MILESTONES` definition
- **`src/engine/bard/archive.json`**: Add `pre_bout.career_bout_milestone` and `post_bout.career_bout_milestone` template arrays (3 templates each, using `%SHIKONA%` and `%MILESTONE%` tokens)
- **`src/engine/bout/boutNarrative.ts`**:
  - Pre-bout: After section 3h (line 768, career win milestone), add 3h2 — for each rikishi, compute `careerBouts = (r.careerWins ?? 0) + (r.careerLosses ?? 0)` and check against `CAREER_BOUT_MILESTONES`. Emit with tag `["milestone"]`
  - Post-bout: After section 13 (line 1705, career win milestone), add 13b — check if winner's `careerBouts + 1` hits a milestone. Emit with tag `["milestone"]`
- **Tests**: Add to `boutNarrative.postBout.test.ts` — verify career bout milestone line appears when `careerWins + careerLosses + 1 = 1000`

---

## Gap 2: Kyujo/Withdrawal Narrative

**Problem:** `withdrawRikishi` in `HealthActions.ts:10-24` sets `isKyujo` and logs a `LIFECYCLE_EVENT` but produces no narrative text. `LoopDecisionEngine.ts` handles kyujo decisions mechanically. The only existing kyujo narrative is `pre_bout.previous_basho.kyujo` (archive.json line 2656) which mentions a _past_ basho absence, not the current withdrawal event.

### Changes:

- **`src/engine/bard/archive.json`**: Add new top-level `kyujo` domain section (sibling to `pre_bout`/`post_bout` at ~line 2965) with templates:
  - `kyujo.injury_withdrawal` — rikishi withdraws mid-basho due to injury (tokens: `%SHIKONA%`, `%AREA%`, `%DAY%`)
  - `kyujo.pre_basho_withdrawal` — rikishi sits out entire basho (tokens: `%SHIKONA%`, `%REASON%`)
  - `kyujo.return_from_kyujo` — rikishi returns after missing basho(s) (tokens: `%SHIKONA%`, `%BASHOS_MISSED%`)
- **`src/engine/bout/boutNarrative.ts`**: Add exported `generateKyujoNarrative(rikishi, type, context, seed): PbpLine[]` function. Use `rngFromSeed` and `BardEngine.resolve` with the `kyujo.*` paths. Return `PbpLine[]` with phase `"kyujo"`
- **`src/engine/systems/health/HealthActions.ts`**: In `withdrawRikishi` (line 10), call `generateKyujoNarrative` and attach the lines to the impact event's `data.narrative` field
- **`src/engine/loop/LoopDecisionEngine.ts`**: When processing withdraw decisions, call `generateKyujoNarrative` with type `"injury_withdrawal"` or `"pre_basho_withdrawal"` based on context
- **Tests**: New test file `boutNarrative.kyujo.test.ts` — verify narrative lines generated for each type, no `[MISSING:]` tokens, deterministic with same seed

---

## Gap 3: Playoff Bout Narrative

**Problem:** `PlayoffResolver.ts:42` calls `resolveBout` which internally calls `generateBoutNarrative` (via `boutResolver.ts:240`), so playoff bouts DO get pbpLines. However, there are no playoff-specific narrative templates — the existing templates don't mention "playoff," "championship bout," or "yusho decider" context. `CompetitionService.ts:67-77` logs only a simple `BOUT_RESOLVED` event with `status: "playoff_result"`.

### Changes:

- **`src/engine/bard/archive.json`**: Add to `pre_bout` section:
  - `pre_bout.playoff_bout` — "A playoff bout to decide the yusho!" style templates (tokens: `%EAST%`, `%WEST%`)
  - Add to `post_bout` section: `post_bout.playoff_result` — "The yusho is decided!" style templates (tokens: `%WINNER%`, `%LOSER%`)
- **`src/engine/lifecycle/PlayoffResolver.ts`**: After `resolveBout` at line 42, the result already has `pbpLines`. Prepend a playoff-specific opening line by calling `BardEngine.resolve` with `pre_bout.playoff_bout` and push it to `result.pbpLines` at index 0. Append `post_bout.playoff_result` line at the end. Use a playoff-specific seed: `playoff-${boutId}-narrative`
- **`src/engine/lifecycle/CompetitionService.ts`**: At line 67, include `result.pbpLines` in the event data when logging `BOUT_RESOLVED` with `status: "playoff_result"`
- **Tests**: New test file `playoffNarrative.test.ts` — verify playoff bouts have pbpLines containing playoff-specific text, no `[MISSING:]` tokens

---

## Gap 4: Sansho Prize Ceremony Narrative

**Problem:** `PrizeDistribution.ts:38-119` distributes sansho prizes and logs `AWARD_CONFERRED` events with `money` and `status` but no narrative text. No `sansho_ceremony` templates exist in archive.json.

### Changes:

- **`src/engine/bard/archive.json`**: Add new `sansho_ceremony` domain section (sibling to `pre_bout`/`post_bout`) with templates:
  - `sansho_ceremony.shukunsho` — Outstanding Performance Prize (tokens: `%SHIKONA%`, `%PRIZE_NAME%`)
  - `sansho_ceremony.kantosho` — Fighting Spirit Prize
  - `sansho_ceremony.ginosho` — Technique Prize
  - `sansho_ceremony.ceremony_intro` — opening line for the prize ceremony
  - `sansho_ceremony.multiple_prizes` — rikishi wins multiple sansho (tokens: `%SHIKONA%`, `%COUNT%`)
- **`src/engine/lifecycle/PrizeDistribution.ts`**: After the prize loop (line ~119), generate narrative lines using `BardEngine.resolve` for each awarded prize. Attach narrative lines to the `AWARD_CONFERRED` event's `data.narrative` field. If a rikishi wins multiple sansho, also emit `sansho_ceremony.multiple_prizes`
- **Tests**: New test file `prizeDistribution.narrative.test.ts` — verify sansho narrative lines generated for each prize type, no `[MISSING:]` tokens

---

## Gap 5: Comeback Win Post-Bout Narrative

**Problem:** Edge crisis recovery is narrated during the bout (lines 1486-1534), and `boutResultApplier.ts:99` increments `wMetrics.comebackWins` when `edgeEscapes > 0`. But there's no post-bout "comeback victory" line summarizing the recovery.

### Changes:

- **`src/engine/bard/archive.json`**: Add `post_bout.comeback_win` template array (3-4 templates, tokens: `%WINNER%`, `%LOSER%`)
- **`src/engine/bout/boutNarrative.ts`**: After section 15c (line 1897, upset over elite), add 15c2 — scan `result.log` for entries where `phase === "edge_crisis"` and `data.escaped === true` and `data.side === result.winner`. If found, emit comeback win narrative with tag `["comeback"]`
- **Tests**: Add to `boutNarrative.postBout.test.ts` — verify comeback win line when winner has edge_crisis escape in log. Add edge_crisis log entry to `makeBoutResult` fixture

---

## Gap 6: Bout of the Day Designation

**Problem:** `DramaMatchmaker.ts` assigns `DramaContext` with `score` and `label` to matchups. `BoutResult` has `dramaticContext` field (basho.ts line ~140). The drama context is read at line 206 for opening drama line, but there's no "featured bout of the day" pre-bout narrative for high-drama matchups.

### Changes:

- **`src/engine/bard/archive.json`**: Add `pre_bout.bout_of_the_day` template array (3 templates, tokens: `%EAST%`, `%WEST%`)
- **`src/engine/bout/boutNarrative.ts`**: After section 3p3 (line 1105, kensho mention), add 3p4 — check if `result.dramaticContext?.score >= 85` (or `result.dramaticContext?.label === "make_or_break"` or `"grudge_match"`). Emit "bout of the day" narrative with tag `["tournament_context"]`
- **No type changes needed** — `BoutResult.dramaticContext` already exists in `basho.ts`
- **Tests**: Add to existing pre-bout test file — verify bout of the day line when `dramaticContext.score >= 85`

---

## Gap 7: Spoiler Narrative

**Problem:** No "spoiler" role detection for former sanyaku/ozeki blocking a promotion candidate's path. `boutNarrative.ts:803-820` detects ozeki return but not the spoiler angle. `careerHistory` contains rank history per basho.

### Changes:

- **`src/engine/bard/archive.json`**: Add `pre_bout.spoiler` template array (3-4 templates, tokens: `%SPOILER%`, `%CONTENDER%`, `%SPOILER_FORMER_RANK%`)
- **`src/engine/bout/boutNarrative.ts`**: After section 3j3 (line 834, yokozuna promotion), add 3j3b — for each rikishi, check if `careerHistory` shows a previous sanyaku rank (ozeki/sekiwake/komusubi) while current rank is lower (maegashira). Check if opponent is in yusho contention (`isYushoContention` from `boutContention.ts`) or on a promotion track (8+ wins, sanyaku-eligible). Emit spoiler narrative with tag `["title_stakes"]`
- **Tests**: Add to existing pre-bout test file — verify spoiler line when former ozeki (now maegashira, via `careerHistory`) faces yusho contender

---

## Gap 8: New Rank Debut (Shin-Sekiwake/Shin-Komusubi)

**Problem:** Career phase debut exists (line 836-857) but no specific rank-promotion debut narrative. NHK prominently mentions "shin-komusubi" or "shin-sekiwake" debuts. `careerHistory` tracks rank per basho, so we can detect if current rank is higher than previous basho's rank.

### Changes:

- **`src/engine/bard/archive.json`**: Add `pre_bout.rank_debut` section with sub-paths:
  - `pre_bout.rank_debut.shin_sekiwake` (tokens: `%SHIKONA%`)
  - `pre_bout.rank_debut.shin_komusubi` (tokens: `%SHIKONA%`)
  - `pre_bout.rank_debut.shin_maegashira` (tokens: `%SHIKONA%`, `%RANK_NUMBER%`)
- **`src/engine/bout/boutNarrative.ts`**: After section 3j4 (line 857, career phase), add 3j4b — for each rikishi, compare current rank against previous basho's rank from `careerHistory`. If current rank is sekiwake/komusubi and previous was lower (maegashira or below), emit shin-sekiwake/shin-komusubi debut line. If current is maegashira at career-high rankNumber, emit shin-maegashira. Tag: `["debut"]`
- **Tests**: Add to existing pre-bout test file — verify shin-komusubi debut line when `careerHistory` shows previous rank as maegashira and current rank is komusubi

---

## Implementation Order

1. Add all new archive.json templates (single edit to `src/engine/bard/archive.json`)
2. Add `CAREER_BOUT_MILESTONES` constant to `src/constants/engine/generation.ts`
3. Modify `boutNarrative.ts` for gaps 1, 5, 6, 7, 8 (pre-bout and post-bout hooks)
4. Add `generateKyujoNarrative` function to `boutNarrative.ts` (gap 2)
5. Modify `HealthActions.ts` and `LoopDecisionEngine.ts` to call `generateKyujoNarrative` (gap 2)
6. Modify `PlayoffResolver.ts` to add playoff-specific narrative lines (gap 3)
7. Modify `PrizeDistribution.ts` to generate sansho ceremony narrative (gap 4)
8. Write all tests
9. Run `bun test` to verify

## Test Strategy

- Test-first: Write tests before implementation for each gap
- Deterministic: All tests use seeded RNG and verify no `[MISSING:]` tokens
- Coverage: At least 2 tests per gap (positive case + negative/deterministic case)
- Test fixtures: Use existing `mockRikishi` and `makeMockWorld` from `src/tests/unit/engine/utils.ts`
- Post-bout tests: Extend existing `boutNarrative.postBout.test.ts` (uses `makeBoutResult` and `makeWorld` helpers)
- New test files: `boutNarrative.kyujo.test.ts`, `playoffNarrative.test.ts`, `prizeDistribution.narrative.test.ts`
