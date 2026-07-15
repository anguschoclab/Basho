# Bard Engine Architecture Audit (Deep-Dive)

## Introduction

The **Bard Engine v2.2** is a centralized, data-driven narrative synthesis system for _Sumo Manager Pro_. Its primary mission is to decouple game-state simulation from linguistic presentation, allowing for complex, context-aware storytelling that remains perfectly deterministic.

## System Architecture

The system is organized into four distinct layers:

### 1. Data Layer (`archive.json`)

The "Script" of the game. A massive hierarchical registry (~90KB) containing narrative templates, metadata, and kimarite descriptions.

- **Organization**: Divided into `registry` (enums/labels), `matrix` (complex phrase mappings), and `domains` (context-specific templates like `combat` or `management`).
- **Templating**: Supports `%TOKEN%` and `{{token}}` syntax.

### 2. Resolution Layer (`BardEngine.ts`)

The pure utility core that navigates the archive and performs string interpolation.

- **Resolving**: Uses dot-notation (e.g., `combat.phases.tachiai`) to locate phrase arrays.
- **Intensity Mapping**: Translates raw intensity values (1-3) into varying levels of descriptive prose.
- **Interpolation**: Automatically formats Japanese currency (JPY) and percentages based on token names (`money`, `kensho`, etc.).
- **LRU Cache**: A static 50-entry cache that prevents immediate repetition of narrative templates.

### 3. Service Layer (`NarrativeService.ts` / `NarrativeBands.ts` / `NarrativeProse.ts`)

The bridge between the mathematical engine and the narrative engine.

- **Banding**: Categorizes floats (0.0 - 1.0) or ints (0 - 100) into qualitative "Bands" (e.g., "Superior", "Exhausted").
- **Hysteresis**: Implements a 5% buffer zone to prevent labels from flickering between states when a value oscillates around a threshold.
- **Prose Fetching**: Maps specific bands to paths in the `archive.json` for high-level UI display.

### 4. Presentation & Integration Layer (`EventBus.ts` / `uiDigest.ts`)

The consumer layer that triggers narrative generation.

- **Stable Seeding**: Generates deterministic seeds for every event (e.g., `medical-rikishiId-year-week`) to ensure the narrative is stable across save/load cycles.
- **UI Projections**: Localizes headers, labels, and complex narrative blocks for promotion drama (Ozeki/Yokozuna runs).

---

## Architectural Audit: Approve / Disprove

### [APPROVE] High-Quality Patterns

- **Deterministic Narrative Stability**: By using stable seeds for every event resolution, the system ensures that a "Devastating Charge" doesn't turn into a "Cautious Tachiai" simply by reloading the game.
- **Hysteresis Implementation**: The use of a history-aware transition buffer in `toBandWithHysteresis` is a professional-grade detail that prevents label "jitter" in UI components.
- **Content/Logic Decoupling**: Successful isolation of 2000+ lines of text into a single JSON file allows the simulation engine to remain purely mathematical while the narrative can be expanded independently.
- **Seeded Variety**: The use of a Seeded RNG combined with an LRU cache provides a "best of both worlds" approach: variety in descriptions without the risk of non-deterministic behavior.

### [DISPROVE] Implementation Critiques

- **Static Global State**: The `BardEngine` is implemented as a static class with internal static cache state. This prevents supporting multiple concurrent "World" instances (e.g., in a server context or for AI simulations) because they would share a narrative history.
- **Monolithic Archive Bottleneck**: Keeping the entire game's script in one `archive.json` file is a maintenance risk. It creates a bottleneck for version control and increases the risk of JSON syntax errors breaking the entire engine.
- **Brittle "String Splitting" Presenters**: Some presenters (e.g., `uiDigest.ts`) perform manual `split()` operations on resolved strings to extract labels from full prose sentences.
  - _Example_: `text.split(" — ")[0].split(".")[0];`
  - _Critique_: This is a major architectural leak. Presentation logic should not assume the structure of narrative prose.
- **Hardcoded Localization**: The `ja-JP` JPY formatting is hardwired into the `BardEngine` core. This prevents clean support for alternate locales or currencies.
- **Implicit Formatting Rules**: Triggering currency formatting via substring matching (e.g., key contains "money") is "magical" and brittle. It should be replaced with explicit type metadata in the archive.
- **Inconsistent Logic Ownership**: Promotion logic (`runKey`) is calculated in the UI Presenter but Stat logic (`band`) is calculated in the Narrative Service. This fragmentation makes it hard to find where the "story" is actually being decided.

---

## Key Maintenance Rules

1.  **Never Use Hardcoded Strings**: All text displayed to the user MUST go through `BardEngine.resolve`.
2.  **Maintain Determinism**: Always pass a `SeededRNG` (or a stable seed string) to any resolution function.
3.  **Path Integrity**: Do not change the structure of `archive.json` without verifying all resolution paths in `EventBus.ts` and `uiDigest.ts`.
4.  **Avoid Logic in Presenters**: If a narrative choice requires calculating state (e.g., "Is this an upset?"), that calculation should happen in the **Narrative Service**, not the UI layer.
