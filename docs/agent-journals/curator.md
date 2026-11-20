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

---

## Archived `.Jules/` entries (folded in v20 consolidation)

## 2024-07-08 - Kinboshi Earned (Gold Stars)

**Data:** rikishi.stats.achievements.kinboshiEarned (passed as rikishi.achievements.kinboshiEarned in UIRikishi)
**Learning:** The simulation correctly tracks upsets against Yokozuna by Maegashira, but they were invisible in the UI except during retirement. Tracking them in the profile header adds prestige for long-serving rank-and-filers.
**Pattern:** Add conditional items to the RikishiProfileHeader stat array (e.g. condition: (rikishi.achievements?.kinboshiEarned ?? 0) > 0) to avoid cluttering the UI for wrestlers without these rare achievements.

## 2024-07-12 - Mochikyukin Points

**Data:** `rikishi.stats.achievements.mochikyukinPoints`
**Learning:** This value represents the cumulative JSA bonus points earned by sekitori for career accomplishments (like Kachi-Koshi, Yusho, Kinboshi). It directly dictates their bi-monthly bonus payout (¥4,000 per point). This helps players decide whether to keep an aging sekitori active for their passive income.
**Pattern:** Surface it in the `RikishiProfileHeader` alongside other career highlights (Elite Titles, Kinboshi) by adding it to the `achievements` object in the UI projection (`src/presenters/rikishiUI.ts`).

## 2024-07-25 - Ginboshi (Silver Stars)

**Data:** rikishi.stats.achievements.ginboshiEarned and ginboshiConceded
**Learning:** Ozeki concedes and Maegashira ginboshi wins were tracked but barely surfaced in the UI. Exposing them in the profile, retirement narrative, and Ozeki cards gives context to giant-killing achievements for Maegashira and upset vulnerabilities for Ozeki.
**Pattern:** Similar to Kinboshi, conditional display items in RikishiProfileHeader and RikishiCard were added, avoiding clutter when values are 0.

## 2024-07-26 - Career Absences & Yokozuna Warnings

**Data:** `rikishi.careerAbsences` and `rikishi.councilWarnings`
**Learning:** Absences drastically affect rikishi value (injury proneness) but were hidden from the primary career stat. Similarly, YDC Warnings silently debuffed Yokozunas without UI context.
**Pattern:** Surface `careerAbsences` dynamically in `careerRecord` strings (W-L-A) only if > 0 to not clutter the standard W-L display. Surface warnings as a conditional badge on `RikishiProfileHeader`.

## 2024-08-01 - Ozeki Promotion Watch

**Data:** `rikishi.consecutiveStrongSekiwake`
**Learning:** The simulation tracks consecutive strong performances (11+ wins) for Sekiwake and Komusubi to qualify for Ozeki promotion (4.2 rule), but this was completely hidden from the UI. Players had to track sekiwake records manually to know if a promotion was imminent.
**Pattern:** Similar to `consecutiveStrongOzeki`, added it to `RikishiCareerDataDTO` and surfaced it as a progress bar in `RikishiProfileHeader` when the wrestler is at a Sanyaku rank and actively on a run.

## 2024-07-29 - Kachi-Koshi Streak

**Data:** `rikishi.consecutiveKachiKoshi`
**Learning:** The simulation tracks a wrestler's consecutive winning tournament streak, which is a major point of pride and prestige in sumo. Players want to know if their wrestler is "on a roll", but this was hidden in state.
**Pattern:** Surface it in the `RikishiProfileHeader` alongside other streaks/warnings, showing conditionally only when the streak >= 2 to avoid cluttering normal records.
