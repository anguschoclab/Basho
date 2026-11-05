# Bard Engine Architecture Audit (Deep-Dive)

> **Status note (updated):** This audit originally described a monolithic `archive.json`. The data layer has since been split into per-domain files under `src/engine/bard/domains/` (24 files, ~313KB) plus `registry.json` and `vocabulary.json`. Sections below reflect the current structure; critique items that have been addressed are marked **[RESOLVED]**.

## Introduction

The **Bard Engine** is a centralized, data-driven narrative synthesis system for _Basho_. Its primary mission is to decouple game-state simulation from linguistic presentation, allowing for complex, context-aware storytelling that remains perfectly deterministic.

## System Architecture

The system is organized into four distinct layers:

### 1. Data Layer (`src/engine/bard/`)

The "Script" of the game. Narrative content lives in:

- **`domains/*.json`** — 24 domain files (combat, events, medical, scouting, ui, world, etc.) containing narrative templates organized by `domain.subdomain.type` path hierarchy.
- **`registry.json`** — enum/label registries resolvable via the `registry.*` path root.
- **`vocabulary.json`** — shared vocabulary including `intensity_1/2/3` label sets.

- **Templating**: `%TOKEN%` placeholders interpolated at resolve time; a token is valid only where its context key is actually supplied (missing keys render `[MISSING: KEY]`).
- **Loading**: domain JSONs are lazy-loaded per domain with a bulk-load fallback; resolution paths use dot-notation (e.g., `combat.phases.tachiai`).

### 2. Resolution Layer (`BardEngine.ts`)

The pure utility core that navigates the domain data and performs string interpolation.

- **Resolving**: dot-notation paths locate phrase arrays; legacy paths auto-prefix with `domains`.
- **Intensity Mapping**: `intensity` values (1–3) select label variants from `vocabulary.json`.
- **Interpolation**: formats values based on token names (e.g., money/percent tokens get locale formatting).
- **LRU Cache**: a 50-entry anti-repetition cache, keyed per RNG-seed "lane" so concurrent world instances do not share narrative history.

### 3. Service Layer (`src/engine/narrative/`)

The bridge between the mathematical engine and the narrative engine.

- **`NarrativeService.ts` / `NarrativeBands.ts` / `NarrativeProse.ts`** — categorize floats (0.0–1.0) or ints (0–100) into qualitative "Bands" (e.g., "Superior", "Exhausted") and map them to narrative paths.
- **Hysteresis**: a buffer zone prevents labels from flickering between states when a value oscillates around a threshold.
- **Prose Fetching**: maps bands to template paths for high-level UI display.

### 4. Presentation & Integration Layer (`src/engine/events/EventBus.ts` / `src/presenters/uiDigest.ts`)

The consumer layer that triggers narrative generation.

- **Stable Seeding**: deterministic seeds per event (e.g., `medical-rikishiId-year-week`) keep narratives stable across save/load cycles.
- **UI Projections**: localizes headers, labels, and narrative blocks for promotion drama (Ozeki/Yokozuna runs).

---

## Architectural Audit: Approve / Disprove

### [APPROVE] High-Quality Patterns

- **Deterministic Narrative Stability**: stable per-event seeds ensure a "Devastating Charge" doesn't turn into a "Cautious Tachiai" simply by reloading the game.
- **Hysteresis Implementation**: the history-aware transition buffer prevents label "jitter" in UI components.
- **Content/Logic Decoupling**: narrative text is isolated in JSON domains so the simulation engine stays purely mathematical and content can expand independently.
- **Seeded Variety**: Seeded RNG plus the LRU cache gives variety without non-deterministic behavior.
- **Per-seed cache lanes**: anti-repetition state is keyed by seed rather than a single module-global, so concurrent simulations don't contaminate each other.

### [DISPROVE] Implementation Critiques

- ~~**Static Global State**~~ **[RESOLVED]** — the cache is now partitioned into per-seed lanes; concurrent world instances no longer share narrative history.
- ~~**Monolithic Archive Bottleneck**~~ **[RESOLVED]** — the single `archive.json` was split into 24 domain files plus `registry.json`/`vocabulary.json`, removing the version-control and syntax-error bottleneck.
- **Brittle "String Splitting" Presenters**: some presenters (e.g., `uiDigest.ts`) perform manual `split()` operations on resolved strings to extract labels from full prose sentences.
  - _Example_: `text.split(" — ")[0].split(".")[0];`
  - _Critique_: presentation logic should not assume the structure of narrative prose.
- **Inconsistent Logic Ownership**: promotion logic (`runKey`) is calculated in the UI presenter while band logic lives in the Narrative Service. This fragmentation makes it hard to find where the "story" is actually being decided.

---

## Key Maintenance Rules

1.  **Never Use Hardcoded Strings**: All text displayed to the user MUST go through `BardEngine.resolve`.
2.  **Maintain Determinism**: Always pass a `SeededRNG` (or a stable seed string) to any resolution function.
3.  **Path Integrity**: Do not change the structure of `domains/*.json`, `registry.json`, or `vocabulary.json` without verifying all resolution paths in `EventBus.ts` and `uiDigest.ts`. `tests/unit/engine/bard/templateTokenIntegrity.test.ts` resolves every production path with real context keys — run it when adding templates.
4.  **Avoid Logic in Presenters**: If a narrative choice requires calculating state (e.g., "Is this an upset?"), that calculation should happen in the **Narrative Service**, not the UI layer.
