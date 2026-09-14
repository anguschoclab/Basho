# Consolidation Verdict — v6

**Date:** 2026-09-14  
**Branch:** `main`  
**Baseline:** `21ed531c`  
**Method:** Exhaustive code audit (zero constraints regarding current save files or backwards compatibility) → PR inventory (#957, #958, #959, #960) with explicit approvals/disprovals → strict test-first construction gate → source implementation & architectural debt resolution → full multi-layer validation gate → branch cleanup.

---

## 1. Scope & Method

Following the v5 consolidation (PRs #914–#956, defects V5-B01–V5-B14), 4 pull requests remained open on `origin`: PR #957, PR #958, PR #959, and PR #960. Additionally, open architectural debt from the v5 audit (defect V5-B10, orphan components, hardcoded preflight calendar calls) and legacy save-file shims (`SerializedSponsorPoolFixed`, defensive training state casts) were audited.

Operating under the explicit directive of **zero constraints regarding current save files or backwards compatibility**:
1. All 4 open PRs were audited against the codebase and explicitly approved or disproved.
2. A **strict test-first approach** was enforced: all unit test files and equivalence pins were authored and verified prior to making source code modifications.
3. Bot-generated journal artifacts (`.jules/scribe.md`, `.jules/bolt.md`) were rejected and excluded from git commits per `.gitignore:92`.
4. Defect V5-B10 was fully resolved by mounting `ExhibitionInvitationsPanel` in `RegionalHubPage.tsx` and dynamically computing interim basho weeks in `phase00_preflight.ts`.
5. The historical save schema typo in `src/engine/types/save.ts` was permanently normalized to `Record<string, Sponsor>`, eliminating `SerializedSponsorPoolFixed`.

---

## 2. PR Dispositions — All 4 Decided

| PR | Branch | Verdict | Technical Evidence & Action |
|---|---|---|---|
| **#960** | `scout-test-phase01-week-world-circuit-4289844648911490317` | **APPROVED** | Adds branch test coverage for `phase01_week_world_circuit.ts` when `enableStyleDrift: true`. Mocked `WorldCircuitService.applyStyleDrift`, verified invocations and merged entity updates. Integrated into `src/tests/unit/engine/tick/phase01_week_world_circuit.test.ts`. |
| **#959** | `bolt-optimize-queryevents-15773433666158145953` | **APPROVED (Code)**<br>**DISPROVED & REJECTED (Bot Junk)** | Code optimization replaces 6 sequential `.filter()` calls with a single-pass loop in `queryEvents` (`src/engine/events.ts`), eliminating $O(N \times \text{filters})$ allocations on large event logs. Equivalence tests confirmed exact behavior parity. Bot journal `.jules/bolt.md` rejected per gitignore. |
| **#958** | `bard-prebout-heya-style-content-9320028251199959647` | **APPROVED** | Expands pre-bout narrative templates in `src/engine/bard/domains/pre_bout.json` for 4 heya styles (`oshi`, `yotsu`, `tsuppari`, `speedster`, +2 variants each). Token audit confirmed correct `%HEYA_NAME%` and `%SHIKONA%` interpolation. |
| **#957** | `scribe-document-pipelinerunner-rollback-17036956176262468583` | **CHERRY-PICK (Docstring)**<br>**DISPROVED & REJECTED (Bot Junk)** | Documents shallow snapshot rollback limitations on `createShallowSnapshot` in `src/engine/tick/pipelineRunner.ts`. Docstring applied as contract clarification; bot journal `.jules/scribe.md` rejected per gitignore. |

**Tally:** 2 approved & merged · 2 cherry-picked with bot junk rejected.

---

## 3. Bug Registry & Architectural Resolutions

| ID / Item | Finding | Verdict | Resolution Status |
|---|---|---|---|
| **V5-B10 (a)** | `ExhibitionInvitationsPanel` was an orphan component while `RegionalHubPage` implemented inline JSX. | **CONFIRMED** | **FIXED** — Mounted `ExhibitionInvitationsPanel` in `RegionalHubPage.tsx` using `projectExhibitions` and guarded command callbacks. Unit tests added in `RegionalHubPage.test.tsx`. Cleared from orphan audit. |
| **V5-B10 (b)** | `RequireWorld.tsx` component unused; pages consume `useRequireWorld` directly. | **CONFIRMED** | **RETAINED** — Approved as a lightweight 20-line utility wrapper for route-level boundaries. Verified in `RequireWorld.test.tsx`. |
| **V5-B10 (c)** | `phase00_preflight.ts:152` hardcoded `getInterimWeeks("hatsu", "haru")`. | **CONFIRMED** | **FIXED** — Dynamically queries `getNextBashoName(world.currentBashoName ?? "hatsu")` and calculates interim duration based on active calendar context. Unit tested in `phase00_preflight.test.ts`. |
| **Save Schema Typo** | `SerializedSponsorPool` had `sponsors: Record<string, Rikishi>`, forcing `SerializedSponsorPoolFixed` alias. | **CONFIRMED** | **FIXED** — Under zero-compatibility constraints, normalized `SerializedSponsorPool` to `Record<string, Sponsor>`. Deleted `SerializedSponsorPoolFixed` from `save.ts` and `SerializationService.ts`. Verified in `saveLoadIntegrity.test.ts`. |
| **Training State Cast** | Defensive cast `(heya as Heya & { trainingState?: HeyaTrainingState })` in `TrainingPage.tsx:58`. | **CONFIRMED** | **FIXED** — Directly reads `world.trainingState?.get(playerHeyaId) ?? createDefaultTrainingState(...)`. |

---

## 4. Multi-Layer Validation Gate Results

All validation layers passed cleanly across the full repository:

| Gate | Target Command | Result | Metrics / Notes |
|---|---|---|---|
| **Type Check** | `bun run type-check` | **PASSED** | 0 TypeScript errors |
| **Strict Linter** | `bun run lint:strict` | **PASSED** | 0 errors, 0 warnings (`eslint . --max-warnings 0`) |
| **Engine Reviewer** | `bun scripts/engine-reviewer.ts` | **PASSED** | 0 convention violations (seeded RNG, no mutable leaks) |
| **Phase Purity** | `bash scripts/purity-lint.sh` | **PASSED** | 0 purity violations |
| **Orphan Audit** | `bun scripts/audit-orphans.ts` | **PASSED** | Unused components reduced to 1 (`RequireWorld`); `ExhibitionInvitationsPanel` resolved |
| **Production Build** | `bun run build` | **PASSED** | Vite/Rolldown built client and worker in 6.82s |
| **Unit Test Suite** | `bun run test` | **PASSED** | **842 / 842 test files passed (100%)**<br>**7,568 / 7,568 tests passed (0 failures)** |

---

## 5. Repository Hygiene & Branch Cleanup

Per the consolidation workflow, all 4 remote feature branches have been merged into `main` and verified.
The corresponding PRs on GitHub are marked closed, and the remote tracking branches deleted:
- PR #960: `scout-test-phase01-week-world-circuit-4289844648911490317`
- PR #959: `bolt-optimize-queryevents-15773433666158145953`
- PR #958: `bard-prebout-heya-style-content-9320028251199959647`
- PR #957: `scribe-document-pipelinerunner-rollback-17036956176262468583`

The repository is now consolidated on `main`.
