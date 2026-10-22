## 2026-10-22 - [events.recruiting context]
**Discovery:** The `recruitDiscovered` event relies on `enrichEventContext` to transform `rikishiId` and `heyaId` into `%SHIKONA%` and `%HEYANAME%`.
**Rule:** When adding recruiting events, only use `%SHIKONA%` and `%HEYANAME%` tokens.
**Check:** Grep `events.recruiting` in `src/engine/eventBus/development.ts` to confirm contextual variables passed to the BardEngine.
