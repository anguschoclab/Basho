## 2025-07-05 - [High-Drama Narrative Event Templates]

**Discovery:** The high-drama narrative events (championship celebration, yokozuna promotion, etc.) were under-represented with only 2 templates per event in `src/engine/bard/archive.json`.
**Rule:** Ensure narrative template tokens match what's provided by the engine context, which can be verified by reusing the existing tokens like `%SHIKONA%` and `%HEYA%` found in the target template entries.
**Check:** Verify that you only reuse tokens (`%SHIKONA%`, `%HEYA%`) that were already present and functioning in the existing templates within `archive.json` before shipping content.

## 2025-01-20 - Narrative Agent Context Tokens

**Discovery:** The `spawnNarrativeAgent` in `phase06_narrative.ts` only provides `shikona`, `rikishiId`, `heya` (which resolves to the name), and `heyaId` in the `NarrativeContext` when triggering events from the `narrativeEventMap` like `media_spotlight`.
**Rule:** When adding new templates for `narrativeEventMap` events, limit placeholders strictly to `%SHIKONA%` and `%HEYA%`.
**Check:** Verify the exact context object passed to `BardEngine.resolve` in `phase06_narrative.ts` before adding new tokens to the corresponding templates.
## 2025-07-17 - [Rivalry Heat Spike Templates]

**Discovery:** The `RIVALRY_HEAT_SPIKE` event was logged in `src/engine/EventBus.ts` using `events.rivalry.title` and `events.rivalry.press_rumors`, which were completely missing from `archive.json`.
**Rule:** When adding new templates for dynamically loaded paths, ensure you verify they are actually missing using `jq` and check the correct context placeholders by looking at the calling code (e.g. `shikona`, `rival`, `winner`, `loser` in `EventBus.ts`).
**Check:** Run a scratchpad script invoking `BardEngine.resolve(rng, "path", context)` to ensure no fallback empty strings or missing tokens are generated before shipping.
## 2024-05-18 - Expanding Post-Bout Reactions
**Discovery:** The `post_bout.reaction` array in `archive.json` had only 4 variants, which fire frequently since they occur right after every bout decision in the play-by-play. This creates noticeable repetition.
**Rule:** When adding new narrative strings to an existing array, it's vital to preserve exact formatting and spacing to avoid large, noisy diffs that break formatting rules on surrounding sections. Direct JSON manipulation via standard tools like node or python `json` can rewrite the whole file's formatting. Direct text replacement via `replace_with_git_merge_diff` is safer.
**Check:** Run a test script resolving the template hundreds of times (via `BardEngine.resolve(rng, "path", ctx)`) to ensure no token leakage occurs (e.g. `%WINNER%` is populated, not literal text) and `[MISSING:` isn't appearing.
## 2025-02-28 - Playoff Narratives
**Discovery:** The `pre_bout.playoff_bout` and `post_bout.playoff_result` arrays in `archive.json` had very limited variety, which could feel repetitive during high-drama moments like playoff tiebreakers.
**Rule:** When adding new narrative templates, strictly use only existing, verified tokens (like `%EAST%`, `%WEST%`, `%WINNER%`, `%LOSER%`) found in sibling templates to avoid shipping visible bugs with unfilled tokens.
**Check:** Verify that `BardEngine` correctly resolves the new text by writing a temporary typescript file and manually parsing through `BardEngine.resolve` for missing token brackets before committing.
## 2025-07-28 - Streak Headline Substring Tests
**Discovery:** Expanding `media.streaks` required updating a test helper `isStreakLine` in `src/tests/unit/engine/bout/boutNarrative.streak.test.ts` which had hardcoded exact substrings of the old 2 templates to detect streak lines in the PbP.
**Rule:** When adding new narrative text variants to domains heavily relied on in unit tests, be prepared to adjust test utility matching functions.
**Check:** Run `npx vitest run <related_test>` and manually update any hardcoded text expectations to include your new variants.

## 2025-08-02 - Expanding Banzuke Movement Narrative Variety
**Discovery:** The `banzuke_movement_standard_promotion` and `banzuke_movement_demotion` arrays in `src/engine/bard/domains/events.json` had very limited variety (3 each), leading to repetition during post-tournament banzuke updates.
**Rule:** When expanding high-frequency narrative arrays like banzuke updates, reuse existing tokens (`%SHIKONA%`, `%FROM%`, `%TO%`) strictly as they are supplied by `generateBanzukeMovementNarrative`.
**Check:** Verify that `BardEngine` correctly resolves the new text and doesn't leak literal tokens using a test script before committing.
