📝 Daily Progress & Docs Update
🏗️ Codebase Status:
Recently pushed the "econ update" (1dc3c6c), which brought massive changes across the `src/engine` and `src/components` layers. A significant portion of the work focused on bringing the engine into compliance with the Master Design Bible (`Basho_Constitution_v1.2_HARMONIZED_NONLOSSY.md`). This includes integrating `enforceHardCapRosterOverflow` (C4.3), restructuring the daily and weekly subsystem tick loops (e.g. `economics.ts`, `welfare.ts`, `tickDaily.ts`, `tickWeekly.ts`), implementing `toBand` hysteresis (C5.3/C5.4) for observability-safe UI translation, and creating various UI pages using Tanstack Router v1.

Current Focus: Refining the simulation loops (Daily, Weekly, Monthly boundaries), connecting economic and welfare engines (e.g. Kōenkai base funding floors), and aligning the observability boundaries so that the UI does not leak engine numbers.

📖 Basho Constitution Alignment:
✅ Aligned:
- Hard-cap roster overflow logic correctly enforces the 30 rikishi limit and prioritizes release candidates (C4.3).
- Economy correctly applies the Kōenkai Tier-1 Survival Floor (¥28,000) to prevent instant insolvency for new stables (C2.4 / A6).
- UI Models (`uiModels.ts`, `descriptorBands.ts`) correctly implement the qualitative band system with hysteresis (HYSTERESIS_DELTA = 5) to prevent stat flickering (C5.3) and use modifier tags (`taped_up`, `hampered`) for injuries without exposing numbers (C5.4).
- Tick boundaries (Daily, Weekly, Monthly, Yearly) are distinctly separated and ordered properly in `src/engine/tick/`.

⚠️ Missing/Deviations:
- The Play-By-Play (PBP) corpus file `src/engine/pbp_voice_matrix.json` mandated by Constitutional Clarification C1.2 does not exist, which currently violates the build-invalid gate for deterministic phrase library selection.
- In `descriptorBands.ts`, while hysteresis logic is active, explicit constitution references to `C5.3` are missing.

📄 Proposed Documentation Updates:
src/engine/pbp_voice_matrix.json: Needs to be created with the required schema and ≥50 phrase minimums per cell to satisfy C1.2.
src/engine/descriptorBands.ts: Add explicit reference comments for hysteresis buffer mapping to constitution section C5.3.

Code Paths Covered: `src/engine/tick/tickDaily.ts`, `src/engine/tick/tickWeekly.ts`, `src/engine/economics.ts`, `src/engine/overflow.ts`, `src/engine/descriptorBands.ts`, `src/engine/uiModels.ts`.

Key Knowledge Gaps Addressed: Validates that the engine state properly transitions through chronological boundaries and that UI safely translates raw state to descriptors using hysteresis, while flagging the critical missing PBP corpus requirement.
