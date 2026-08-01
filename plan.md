1. **Understand the Goal**: The objective is to make a single, small content enrichment using the "Bard" persona. The prompt asks to find a place where the world sounds thin, like template categories with only 1-2 variants, high-drama moments, or missing text. The mono-ii (judges' review) events have very few templates, leading to high repetition.
2. **Examine the `mono_ii` templates**: The file `src/engine/bard/domains/post_bout.json` contains a `mono_ii` section with keys like `gunbai_contested` (2 items), `gyoji_confused` (1 item), `review` (3 items), `replay_analysis` (2 items), `call_reversed` (2 items), `call_upheld` (2 items), and `rematch_ordered` (2 items). These are prime candidates for expansion, especially since mono-ii events are dramatic and currently very repetitive.
3. **Draft the new templates**:
    *   `gyoji_confused`: Currently 1 item. I will add 3-4 more items to describe the chaos at the edge of the ring without needing placeholders.
        *   "The gyoji was right on top of the action, but it was too close to call immediately."
        *   "There's hesitation from the gyoji — both rikishi tumbled out almost simultaneously."
        *   "A chaotic scramble at the tawara leaves the gyoji looking to the judges for help."
        *   "The gyoji's view might have been obstructed by the falling wrestlers."
    *   `replay_analysis`: Currently 2 items. I will add 2-3 more, using `%LOSER%` and `%WINNER%` correctly.
        *   "The slow-motion replay shows just how tight the margin was at the tawara."
        *   "Look at the heel of %LOSER% — it's a game of millimeters right now."
        *   "Incredible defense from %WINNER% at the edge, but did any part of the body touch first?"
        *   "The angle from the opposite side of the dohyo will be crucial to determining if %LOSER% stepped out."
    *   `call_reversed`: Currently 2 items. Use `%WINNER%` and `%LOSER%`.
        *   "The judges overrule the gyoji! %LOSER% was out first, handing the victory to %WINNER%."
        *   "A dramatic reversal from the mono-ii! %WINNER% is awarded the hard-fought win."
        *   "The initial call is overturned. %LOSER% touched down just a fraction of a second earlier. %WINNER% wins."
4. **Modify the file safely**: Use `replace_with_git_merge_diff` to inject the new strings into `src/engine/bard/domains/post_bout.json`.
5. **Verify**: Use `scratch.ts` to ensure the tokens resolve correctly and no `MISSING` tags appear.
6. **Pre-commit**: Follow instructions.
7. **Submit**: Create PR matching the Bard template format.
