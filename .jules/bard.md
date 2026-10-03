## 2026-10-03 - Post-bout records enrichment
**Discovery:** Found that post-bout records templates for `winner_improves` and `loser_falls` only had 3 variants each, making repetitive reading during high frequency events.
**Rule:** Reused existing tokens (`%WINNER%`, `%WINNER_WINS%`, `%WINNER_LOSSES%`, `%LOSER%`, `%LOSER_WINS%`, `%LOSER_LOSSES%`) to ensure safety and determinism. Do not introduce new tokens if the engine logic does not explicitly pass them.
**Check:** Verify JSON format using `prettier` and confirm no tokens are left unmatched by running the narrative tests inside `src/tests/unit/engine/bout/`.
