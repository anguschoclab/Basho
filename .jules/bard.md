## 2024-05-18 - H2H Streak Direction Bug
**Discovery:** The `h2h.streak` narrative randomly selected winning or losing strings because it didn't branch based on the streak's sign, causing contradictory text (e.g., P1 winning but text saying P1 is desperate to snap a losing streak).
**Rule:** When generating narratives based on streaks, branch the logic in the engine based on the sign to select the appropriate domain path (`winning_streak` or `losing_streak`).
**Check:** Verify that both positive and negative streaks map to the correct narrative path by running tests on the `generateH2HCommentary` method and the `pre_bout` streak generation.
