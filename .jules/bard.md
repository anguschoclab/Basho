## 2025-10-11 - Enrich Yokozuna Bid Press Commentary
**Discovery:** The Yokozuna Deliberation Council (YDC) bid commentary templates (`post_basho_press.ydc_bid`) only had 3 variants each, making high-stakes Yokozuna runs feel repetitive during press coverage.
**Rule:** Ensure new press quotes maintain a stern, official, and demanding tone appropriate for the YDC.
**Check:** Verify `%SHIKONA%` token resolves correctly in the new templates by running `bun x vitest run src/tests/unit/engine/bard/templateTokenIntegrity.test.ts`.
