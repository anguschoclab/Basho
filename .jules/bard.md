## 2025-07-05 - [High-Drama Narrative Event Templates]
**Discovery:** The high-drama narrative events (championship celebration, yokozuna promotion, etc.) were under-represented with only 2 templates per event in `src/engine/bard/archive.json`.
**Rule:** Ensure narrative template tokens match what's provided by the engine context, which can be verified by reusing the existing tokens like `%SHIKONA%` and `%HEYA%` found in the target template entries.
**Check:** Verify that you only reuse tokens (`%SHIKONA%`, `%HEYA%`) that were already present and functioning in the existing templates within `archive.json` before shipping content.
