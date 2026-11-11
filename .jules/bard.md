## 2024-11-11 - Enriching Oversleeping Narratives
**Discovery:** The oversleeping incident (which is triggered when `world.cyclePhase === "active_basho"` and random chance) lacked variety, leading to repeated fusensho loss descriptions for rikishi.
**Rule:** When adding new narratives for events like kyujo or incident reports, ensure the tone matches the gravity of sumo (e.g. "fusensho scandal", "deeply embarrassing", "unforced error") and only use context tokens that are populated by the engine (`%SHIKONA%` for kyujo, `%SHIKONA%` and `%DAY%` for events).
**Check:** Verify token bindings by running `bun x vitest run tests/unit/engine/bard/templateTokenIntegrity.test.ts`.
