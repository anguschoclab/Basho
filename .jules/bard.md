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
