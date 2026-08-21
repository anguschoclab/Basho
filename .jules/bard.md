## 2024-08-21 - Verifying Dynamic Keys in JSON
**Discovery:** Keys in JSON domains like `ui.digest.promotion.ozeki_run.${runKey}` are built dynamically in code (e.g., `src/presenters/projections/promotionProjections.ts`), making simple grepping for the full key string fail.
**Rule:** When enriching domains that use dynamic keys, do not assume a token exists just because the JSON resembles other entries.
**Check:** Grep the engine code for `BardEngine.resolve.*` and the parent path (e.g., `ozeki_run.`) to confirm the dynamic construction and check if any context variables (like `%SHIKONA%`) are actually passed in the `resolve` call before using them in the JSON templates.
