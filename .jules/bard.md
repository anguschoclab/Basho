## 2025-02-15 - Replay Highlight Variety
**Discovery:** Replay sub-paths like `edge_drama` and `quick_finish` had only 2 variants, making common highlight endings highly repetitive.
**Rule:** Replay templates can safely use `%WINNER%`, `%LOSER%`, and `%KIMARITE%` tokens as populated by `boutNarrative.ts`.
**Check:** Grepped `boutNarrative.ts` for `post_bout.replay` to verify the payload provided.
