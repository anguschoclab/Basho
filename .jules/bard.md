## 2024-09-15 - Yusho Race Tokens
**Discovery:** The `post_bout.yusho_race` template is invoked in `src/engine/bout/boutNarrative.ts` with only the tokens `%WINNER%` (winner's shikona) and `%WINS%` (winner's current wins).
**Rule:** Only use `%WINNER%` and `%WINS%` when adding templates to `yusho_race`.
**Check:** Grep `src/engine/bout/boutNarrative.ts` for `post_bout.yusho_race` to verify the provided context object.
