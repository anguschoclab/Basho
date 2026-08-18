## 2024-05-18 - Expanding Ozeki Promotion Strings
**Discovery:** Found that `ui.digest.promotion.ozeki_run` templates were single strings, causing repetition in the UI when players check standings during an Ozeki run.
**Rule:** UI digest templates that are evaluated every tick or basho day need array variants to prevent staleness.
**Check:** Verify JSON structure and run `npx vitest run src/tests/unit/engine/bard` to confirm `BardEngine` handles arrays properly.
