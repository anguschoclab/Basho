# Codebase Audit Report: Sumo Wrestling Manager Simulation

This audit evaluates the codebase architecture, modularity, and adherence to clean code practices based on the `src/` directory and core engine files.

## 1. Separation of Concerns & Misplaced Logic

The project generally enforces a clear boundary between the headless simulation engine (`src/engine`) and the React presentation layer (`src/components`, `src/pages`), utilizing Zustand/Context (`src/contexts/GameContext.tsx` and `src/contexts/gameReducer.ts`) as a bridge. However, there are significant layer violations within the engine itself:

*   **UI Formatting in the Engine (`src/engine/uiDigest.ts`):** This file transforms engine state into React-specific ViewModels (e.g., `DigestSection`, `DigestItem` for `WeeklyDigest.tsx`). It also contains logic for determining UI "drama" narratives (e.g., `getKadobanDrama`). This logic is strictly presentational and breaks the engine's headless contract.
*   **Browser APIs in the Engine (`src/engine/saveload.ts`):** The persistence layer has hardcoded dependencies on `window.localStorage`. This prevents the engine from running in pure CLI, Node, or Bun testing environments without mocking browser globals.
*   **Overlapping Historical Modules:** Both `src/engine/almanac.ts` and `src/engine/historyIndex.ts` handle historical data tracking and querying. While `almanac.ts` seems responsible for canonical records (Constitution §A5), `historyIndex.ts` builds optimized indices for UI lookups. Their responsibilities overlap heavily when indexing basho results.

## 2. Overly Coupled Code

*   **The Post-Basho Monolith (`src/engine/world.ts`):** The `runPostBashoResolution` function and its sub-routines (`runPrestigeDecay`, `runGovernanceReview`, `runRetirements`, `runRecruitmentWindow`) span over 250 lines in `world.ts`. `world.ts` should act as a high-level orchestrator, but instead, it implements deep domain logic for economics, governance, discipline, and AI meta drift.
*   **Matchmaking Strategy (`src/engine/matchmaking.ts`):** The `scorePairing` function directly mixes low-level pairing mechanics with high-level game design strategies (e.g., specific Joi-jin scheduling logic, Senshuraku championship contender logic). This makes the matchmaking rules rigid and difficult to tune.

## 3. Complexity & Performance Issues

*   **Suboptimal Iteration in Hot Paths:** Throughout the engine (e.g., `world.ts`, `uiDigest.ts`, `banzuke.ts`), `WorldState` collections are defined as `IdMapRuntime<T>` (ES6 Maps). However, many functions still use `Array.from(world.rikishi.values())` or the spread operator `[...world.rikishi.values()]` right before mapping or filtering. This creates unnecessary intermediate array allocations, which is explicitly noted as a performance anti-pattern in the project's memory directives.
*   **Fragile State Updates (`src/contexts/gameReducer.ts`):** The reducer mutates the `world` object via external engine calls (e.g., `worldEngine.advanceBashoDay(state.world)`) and then returns `{ ...state, world: { ...state.world } }` to force a React re-render. This pseudo-immutability pattern is prone to bugs and makes time-travel debugging impossible.
*   **Lack of Save File Schema Validation:** `src/engine/saveload.ts` relies on manual typecasting and `any` types (e.g., `(serialized as any).heyas`) to deserialize complex, nested JSON states. This is fragile and highly susceptible to runtime crashes if a save file is corrupted or belongs to an older version.

## 4. Recommended Action Plan

Here is the ordered list of recommendations, from most critical to optional enhancements, designed to improve structure and maintainability without altering game math.

### Critical
1.  **Relocate Presentational Logic:** Move `src/engine/uiDigest.ts` and `src/engine/uiModels.ts` out of the engine directory into `src/contexts/` or a new `src/presenters/` directory. The engine should only output raw data; the UI layer should handle narrative formatting.
2.  **Abstract Storage Provider:** Refactor `src/engine/saveload.ts` to accept an `IStorageProvider` interface. Move the `window.localStorage` implementation to the React boundary. This ensures the engine remains environment-agnostic.

### High
3.  **Refactor `world.ts` Post-Basho Pipeline:** Extract the domain-specific sub-functions from `runPostBashoResolution` into their respective modules. For example, move `runPrestigeDecay` to a new `src/engine/prestige.ts` file, and `runGovernanceReview` to `src/engine/governance.ts`.
4.  **Optimize Map Iteration:** Audit all loops over `world.rikishi` and `world.heyas`. Replace `Array.from(map.values()).filter(...)` with direct `for...of` loops over iterables to eliminate O(N) array allocation overhead in critical paths.

### Medium
5.  **Decouple Matchmaking Strategy:** Refactor `src/engine/matchmaking.ts` to accept an array of generic scoring rule functions rather than hardcoding specific narrative rules (like "Final Day Championship") inside `scorePairing`.
6.  **Consolidate Historical Data:** Merge the responsibilities of `almanac.ts` and `historyIndex.ts` to clarify the boundary between canonical record generation and UI-optimized indexing.

### Optional
7.  **Introduce Schema Validation:** Replace the manual `any` casting in `saveload.ts` with a schema validation library like Zod to ensure runtime type safety when loading state from the client.
