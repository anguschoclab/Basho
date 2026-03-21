# Changelog - Basho: Sumo Stable Manager
<!-- GitHub sync verified: 2026-03-21 -->

This changelog outlines the systems, concepts, and features brought over and modernized from the legacy `Sumo` repository into the new `sumo-manager-pro` simulation engine.

## [v1.1.0] - 2025 Tick Orchestrator Refactor & Initial Port

### Added (New Features & Ports)
- **Lineage & Mentorship System:** Ported the `lineage.ts` concept from the legacy repo. Mentors can now be assigned to mentees, triggering dynamic `mentor_student` rivalries. Integrated properly into the deterministic runtime data mappings (`Map`).
- **Unified Engine Architecture:** The scattered domain logic of the legacy repo has been centralized into `src/engine/` using a strict deterministic tick architecture (`dailyTick.ts`).
- **Fog of War & Scouting:** Merged the legacy candidate generation with an advanced fog of war system in `scouting.ts`. Replaced `seedrandom` dependencies with a local seeded RNG to maintain strict CLI determinism.
- **Story-Forward Rivalries:** The basic `rivalries.ts` from the old repo was expanded to handle multiple rivalry tones (`grudge`, `respect`, `mentor_student`, etc.), deterministic heat decays, and upset bonuses.
- **Heya Welfare System:** Re-implemented stable compliance, penalizing risky training regimens on injured Rikishi.
- **Dynamic Banzuke Generation:** Upgraded the procedural ranking system to mirror authentic macro-promotions and demotions over a 15-day basho.
- **Narrative Descriptions:** Migrated legacy naming arrays (e.g. `data/names.json`) into high-fidelity "House Styles" and "Rank Tiers" inside `src/engine/shikona.ts` and `src/engine/narrativeDescriptions.ts`.

### Changed
- **Design Consolidation:** All previous markdown bibles (e.g. `Basho_Design_Bible_v2.md`) were fully harmonized into a single massive non-lossy constitution file: `Basho_Constitution_v1.2_HARMONIZED_NONLOSSY.md`.
- **Testing Constraints:** Adjusted the CLI test suites (e.g. `lineage.test.ts`, `dailyTick.test.ts`) to rely on `bun:test` mocking frameworks and avoid browser APIs like `localStorage`, strictly ensuring CI compliance.
- **State Serialization:** Updated `saveload.ts` to properly traverse and reconstruct runtime Maps back to JSON for persistent browser saves.

### Removed
- Removed old bash utility patch scripts (`ApplyDelta.sh`, `fix-*.sh`) as their fixes are now structurally native to the `sumo-manager-pro` build.
