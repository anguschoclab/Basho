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
