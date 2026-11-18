# Curator's Journal

## 2026-10-30 - rikishi.agency.loyaltyBand
**Data:** `rikishi.agency` (RikishiAgencyState — satisfaction/restlessness/loyaltyBand), written weekly to ALL active rikishi by `phase01_week_rikishi_agency` (both weekly pipelines). `runAutoSim` returns `finalWorld` — it does NOT mutate the passed world; empirical checks must read `result.finalWorld`.
**Learning:** Verified populated on 1289/1289 rikishi after 1 basho (loyal 935 / wavering 307 / restless 47). The band is the engine's own player-safe label — surface it verbatim, matching the banded-stat philosophy. Fresh worlds have `agency === undefined` until the first weekly tick — always render the "—" empty case.
**Pattern:** Components may NOT import from `@/engine/npc/**` (eslint no-restricted-imports — only `@/engine/types` allowed). Derive the band type as `NonNullable<Rikishi["agency"]>["loyaltyBand"]`. Presenter-layer files may import engine internals freely.

## 2026-10-30 - Concurrent-agent hazard on this repo
**Data:** git history / working tree
**Learning:** A second Devin agent commits directly to `main` in this workspace and swept my feature files into its commit `0e3f24ac` mid-session. `git status` looked clean for my files because they were already committed. Check `git show HEAD:<file>` before assuming edits are uncommitted, and commit promptly.
**Pattern:** Workflow hazard, not a data pattern.

## 2026-10-30 - rikishi.divisionRecords
**Data:** `rikishi.divisionRecords` — per-division W-L ledger updated per bout in `boutResultApplier` and seeded at generation (`CandidateCareer`). Reconciles EXACTLY with `careerWins`/`careerLosses`: 0 mismatches across 1290 rikishi after 2 basho. ~1/3 of rikishi (fresh recruits) have all-zero records — filter zero-bout divisions + empty state.
**Learning:** Was typed+populated but zero UI hits. Safe verbatim surface — no derivation needed beyond W-L/win%.
**Pattern:** Repo-wide `lint:commit` hook fails on ANY uncommitted file (sibling agent's WIP blocked it) — targeted eslint on your own files first, then commit promptly.

## 2026-11-18 - rikishi.archetypeEvidence is dead telemetry; almanacRecord populates only on the player path
**Data:** `rikishi.archetypeEvidence` ({push,grapple,evade}×{success,fail}) — seeded at generation (`CandidateBuilder`), read+reset monthly by `tick/phases/monthly/training/archetypeDrift.ts`, but **never incremented anywhere** — counters sit at zero forever, so the oshi/yotsu drift branch can never fire. Do not surface it.
**Data:** `rikishi.almanacRecord` (`notableBouts`/`narrativeHighlights`/`promotionHistory`) — verified live: 439/439 active rikishi populated after 1 basho. BUT `runAutoSim`/`simulateEntireBasho` never calls `endBasho` → `runPostBashoResolution` → `runAlmanacNarrativeUpdate`, so autosim-verified worlds show `notableBouts` EMPTY (promotionHistory still fills via `BanzukePublisher` in the tick loop). Empirical check must use `simulateEntireBasho` + `endBasho` (the END_BASHO player path), not `runAutoSim` alone.
**Learning:** `narrativeHighlights` merges milestone echoes + one-line bout summaries — both already rendered richer by `MilestoneTimeline`/`NotableBouts` on the career tab; wiring it would show each moment 2-3×. `notableBouts[].narrativeLines` carry `[[rikishi:ID:Name]]` markers — render via `PbpLineText`, never raw.
**Pattern:** Before wiring a "dead" UI slot, verify the data populates through the REAL player flow (interactive basho → endBasho), not just the fast sim — the two paths maintain different state.
