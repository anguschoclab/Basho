# v17 Review Notes — Deep-Dive Findings Register

Raw findings from the Phase-2 delta+gap sweep. Dispositions live in `bug-registry-v17.md`; verdicts in `consolidation-verdict-v17.md`. Convention: severity · `file:line` · evidence.

## Engine correctness

| Sev | Finding | Evidence |
|-----|---------|----------|
| P1 | `isPlayerOwned` never populated — projections always false | `Heya.isPlayerOwned` declared, no production writer; `heyaUI.ts`, rikishi `identity.ts`/`roster.ts` consumers |
| P1 | Forced-merger fallback could absorb the player's stable | `mergers.ts:~255` candidate pool lacked `world.playerHeyaId` exclusion |
| P1 | Worker heya-scoped stable commands unguarded | `worker/commands/*` accepted any `heyaId`; only `retireRikishiCmd` guarded |
| P2 | `useTrainingState` never resynced after world reload | hook initialized once; no effect on world-provided state reference |
| P2 | NPC sparring pairs overwritten league-wide | `phase01_week_npc_ai.ts` rebuilt full `sparringPairs` from base world per heya — last write won |
| P2 | Calendar rendered phantom `basho_recap` label | `constants/ui/calendar.ts` map; `CalendarWidget` reads `world.cyclePhase` (canonical set includes `banzuke_reveal`) |
| P1 | Myoseki lease fees vanished | `myosekiMarket.ts` `startsWith("oyakata_")` id-sniff; no owner-side credit |
| P1 | `purchaseMyoseki` moved no money | `MyosekiTradingService` treated oyakata-keyed `ownerId`/`buyerId` as heya ids — debit/credit resolved to nothing |
| P1 | `buyMyoseki` seller never credited; self-buy drained funds | wrong tx `fromId`; no self-purchase guard |
| P1 | Retiree conversion confiscated listed stock | `retireeOyakataConversion.ts` reused any `status:"available"` stock — including player/NPC-listed |
| P1 | Non-age succession silent no-op on summary successor | `DynastyService` viability filter missing for summary-only `historicalRikishi` entries |
| P2 | Career milestones skipped | `history.ts` `runHistoryUpdates` exact-match `===` on threshold values a basho can jump over |
| P2 | Shikona promotion detection wrong | `history.ts` `rank.includes("makuuchi")` — `makuuchi` is a division, not a rank string |
| P2 | Succession left removed oyakata's stock dangling | `transferElderStock` covered `holderId` only; trustee path never called it — `idIntegrity` dangling `ownerId` |

## UI honesty

| Sev | Finding | Evidence |
|-----|---------|----------|
| P2 | `StaffPage` dispatched unaffordable hires | affordability unchecked before `sendCommand` |
| P2 | `RikishiPage` editable for retired/NPC-owned rikishi | missing read-only gating |
| P2 | `YouthAcademyPage` rendered duplicate mutation controls | page-level cluster duplicated the panel's actions |

## Structural gates

| Sev | Finding | Evidence |
|-----|---------|----------|
| Gate | `triggerSuccession` 177 LOC > 150 ratchet | `functionLengthBudget.test.ts` measured |
| Gate | `processRetireeOyakataConversion` 158 LOC > 150 | same |
| Gate | 2 DynastyService golden masters stale | post-B31/B33 snapshot never regenerated; diff verified additive-only before `-u` |

## Slow-suite findings (verified against `main` worktree baseline)

| Sev | Finding | Evidence |
|-----|---------|----------|
| P2 | Duplicate `mediaState.headlines` `MH-*` ids after 3-yr sim | `simulationInvariants` — identical violations on `main` baseline and branch → pre-existing, mechanism unresolved |
| P2 | Residual myoseki owner/holder dangle | same test — merge-ordering race in `phase06_yearly_boundary` (later absolute `myosekiMarket` writes clobber the swept map) |
| P3 | Advisor foreign-slot check diverges from canonical | roster-only count vs `getForeignCountsByHeya`/`foreignSlotOccupied` (includes signed-pending) — registered debt, not introduced by #1176 |
| P3 | Memoized `getHeyaRoster` staleness window | weekly-gate + `LOAD_WORLD` clears only; mid-week signings read stale roster — pre-existing, shared by all consumers |

## Disproved during verification

- `Dashboard.tsx` `animate-pulse` — wraps `SkeletonCard`s; correct skeleton pattern.
- `commands/lifecycle.ts:102` — `LOAD_WORLD` world-swap cache clear, not a roster command.
- #1178 PR — head `02f741c4` is an **empty commit**; the 12 claimed variants were never pushed. Re-implemented per spec.
- #1177 `loc:179` budget entry — stale; actual 177. Ratchet contract: entries removed via splits, never added.
