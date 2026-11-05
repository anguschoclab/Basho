# Bug Registry — v17

Findings from the consolidation v17 deep-dive. Status legend: **FIXED** (landed on `main` via `8836a380`), **DEBT** (verified, intentionally deferred), **NON-ISSUE** (disproved on inspection).

## Fixed — engine correctness

| ID | Finding | Root cause | Fix |
|----|---------|-----------|-----|
| V17-F01 | `isPlayerOwned` always false in projections | `Heya.isPlayerOwned` is write-only in production | Derive from `world.playerHeyaId` in `heyaUI.ts`, rikishi `identity.ts`/`roster.ts` |
| V17-F02 | Forced merger could target player stable | fallback pool lacked player exclusion | `mergers.ts` excludes `world.playerHeyaId` |
| V17-F03 | NPC-guard: worker stable commands unguarded | no `heyaId === playerHeyaId` check on heya-scoped commands | Guard added (mirrors `retireRikishiCmd`); NPCs unaffected (tick-phase mutations) |
| V17-F04 | `useTrainingState` stale after world resync | no effect on world-provided state reference | `useEffect` resync on state identity change |
| V17-F05 | NPC sparring pairs lost | each heya rebuilt whole map from base world; last write won | `phase01_week_npc_ai.ts` writes one accumulated map post-loop |
| V17-F06 | Calendar showed phantom phase label | `basho_recap` in `CalendarWidget` map | Canonical `banzuke_reveal` label |
| V17-F07 | Myoseki lease fees vanished | brittle `startsWith("oyakata_")` id-sniff; no owner credit | `myosekiMarket.ts` resolves oyakata→heya; owner heya credited |
| V17-F08 | `purchaseMyoseki` moved no money | ownerId/buyerId are oyakata ids; funds are heya-keyed | `MyosekiTradingService` bridges both parties via `world.oyakata` |
| V17-F09 | `buyMyoseki` seller never credited; self-buy drained funds | wrong tx `fromId`; no self-guard | Seller heya credited; self-purchase no-ops; correct tx ids |
| V17-F10 | Retiree conversion confiscated listed stock | any `available` stock reused | Only JSA-owned stock reused; else fresh merit stock minted (`retireeOyakataConversion.ts`) |
| V17-F11 | Non-age succession no-op on summary successor | summary-only historical entries passed viability filter | Filtered; falls back to trustee generation (`DynastyService.ts`) |
| V17-F12 | Career milestones missed when basho skips exact value | exact-match check | Threshold-crossing detection (`history.ts`) |
| V17-F13 | Shikona promotion detection wrong | `rank.includes("makuuchi")` — division vs rank conflation | Rank-semantic juryo→maegashira check (`history.ts`) |

## Fixed — UI honesty

| ID | Finding | Fix |
|----|---------|-----|
| V17-F14 | `StaffPage` dispatched hires the player can't afford | Affordability gate before `sendCommand` |
| V17-F15 | `RikishiPage` editable for retired/NPC rikishi | Read-only gating |
| V17-F16 | `YouthAcademyPage` duplicated mutation controls | Panel owns all mutation paths |

## Fixed — structural gates

| ID | Finding | Fix |
|----|---------|-----|
| V17-F17 | `triggerSuccession` 177 LOC > 150 budget | Split into helpers (behavior preserved) |
| V17-F18 | `processRetireeOyakataConversion` 158 LOC > 150 budget | Split into helpers |
| V17-F19 | DynastyService characterization snapshots stale post-B31/B33 | Verified-additive diff → regenerated (`-u`) |
| V17-F20 | Succession left removed oyakata's stock dangling | `transferElderStock` covers `ownerId`+`holderId`; trustee path now calls it (`3199a2a7`) |

## Registered debt (verified, deferred)

| ID | Finding | Evidence | Notes |
|----|---------|----------|-------|
| V17-D01 | Duplicate `mediaState.headlines` ids after multi-year sim | `simulationInvariants` fails identically on `main` worktree baseline and v17 | Same seeded `MH-*` id appended repeatedly; mechanism unresolved |
| V17-D02 | Residual myoseki `ownerId`/`holderId` dangle | same test; 26 violations post-fix (was 28) | Merge-ordering race: `phase06_yearly_boundary` merges succession's swept `myosekiMarket` with later producers' absolute writes derived from pre-succession world → `Object.assign` last-wins restores dangling refs. Proper fix needs ordering-aware worldFields merge or a resolve-time ref sweep |
| V17-D03 | Advisor foreign-slot check diverges from canonical | roster-only count vs `getForeignCountsByHeya` (includes signed-pending) | Richer canonical semantic exists; unify in future pass |
| V17-D04 | Memoized `getHeyaRoster` staleness window | clears only at weekly gate + `LOAD_WORLD` (`tickDaily.ts`, `commands/lifecycle.ts`) | Mid-week signings read stale roster; shared by all consumers. Follow-up: `clearQueryCaches()` on roster-mutating commands |

## Non-issues (disproved)

- `Dashboard.tsx` `animate-pulse` — wraps `SkeletonCard`s; correct pattern.
- `commands/lifecycle.ts:102` — `LOAD_WORLD` cache clear, not a roster command.
- `basho_recap` in GameState/basho-slice types — valid there; only the calendar label was phantom.
- #1178 PR payload — empty commit; feature re-implemented for real (7×5 variants).
