# Game Rules vs Real JSA — Divergence Audit & Alignment Plan (validated)

Validated domain-by-domain audit of Basho's simulated rules vs modern JSA rules. Confirmed divergences to fix: kensho metadata gating, post-2010 foreign quota (5 sub-fixes), playoff day-15, ring label, Nagoya venue, debut-age gate, roster-cap removal, free-agency removal, and a unified JSA committee framework with real banzuke movement + decision commentary. Strict test-first schedule.

## Context

Megaplan comparing the game's rules vs real JSA rules, iteratively validated against the codebase with user-supplied authoritative rulings. All fixes scheduled **test-first** — failing tests written and confirmed red before any production change. Zero save/backwards-compat constraints.

**Baseline:** modern JSA — post-2010 foreign-quota binding, post-2023 changes (no height/weight minimums, tsukedashi Ms60/Sd80, kōshō abolished), July-2026 pay/prize revision (Hatsu 2027), Oct-2026 Article-9 amendment. Game calendar starts 2026-01-01.

---

## Part 1 — Already fixed & verified (Nov-16/17 commits; re-confirmed)

| Item                                                                                           | Evidence                                                     |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Sekitori salaries / yusho prizes era-keyed (Jan-2027 table)                                    | `jsaEra.ts`                                                  |
| Sansho ¥3M, S/K/M eligible, shareable `Id[]`, multi-award, withholdable, yusho winner excluded | `specialPrizes.ts`, `types/basho.ts`                         |
| 3-way playoff = tomoe-sen w/ kuji; 4+ = bracket                                                | `PlayoffResolver.ts`                                         |
| Jun-yusho label-only (no prize/mochikyukin)                                                    | `types/basho.ts` `prizes`                                    |
| Mochikyukin 0.5×net-wins; zensho 50; floors Y150/O100/M60/J40; ¥4k/pt                          | `economic.ts`                                                |
| Kensho split ¥10k/¥50k/¥10k; **payouts makuuchi-gated**; none on fusensho                      | `KENSHO_SPLIT`, `economics.ts:51`, `boutResolver.ts:208-212` |
| Kinboshi excludes hansoku; ginboshi both senses                                                | `1e11d6cc`                                                   |
| Teate/shoshi-kin/kachikoshi-kin era tables; absence tail = losses                              | `payBashoTeate`, `jsaEra.ts`                                 |
| Fusenpai = same-day loss; double fusenpai                                                      | `b841c043`                                                   |
| Ozeki: no 11-win shortcut; ~33/3-basho; kadoban; 10-win reclaim                                | `promotionLogic.ts`, `ozekiLogic.ts`                         |
| Yokozuna: no demotion, YDC flow, retirement pressure                                           | `YokozunaService.ts`                                         |
| Juryo→makuuchi callup + lower-division cascade (no-byes)                                       | `schedule.ts`                                                |
| Siblings & same-heya banned (playoffs exempt — real)                                           | `MatchmakingPhases.ts`                                       |
| Mono-ii / sashichigae / torinaoshi / kinjite-hansoku / 5-shimpan / matta                       | `bout/resolution/*`, `kinjite.ts`                            |
| Ceremonies: dohyo-iri styles, danpatsu-shiki, kanreki, attendants, yumitori                    | `governance/ceremonies/*`                                    |
| 6 honbasho odd months, 15 days, 2nd-Sunday start, venues, jungyo                               | `calendar.ts`, `ExhibitionBashoService.ts`                   |
| Kimarite real frequency shares                                                                 | `kimariteTargets.ts`                                         |
| Myoseki 105 shares; oyakata retirement at 65                                                   | `economic.ts`, DynastyService                                |
| Article-9 hair-touch exception never modeled + bulletin                                        | report #18                                                   |
| Kōshō seido correctly **absent** (abolished 2003) — zero hits                                  |
| Sekitori 15 / lower 7 bouts; KK threshold 8/4                                                  | `RANK_HIERARCHY`                                             |
| Playoffs in all divisions                                                                      | `resolveDivisionPlayoffs`                                    |

---

## Part 2 — Fix list (validated, ordered)

### A1. Kensho metadata leaks onto non-makuuchi bouts

- `economics.ts:51` already gates **payouts** to makuuchi — money correct. But `applyKensho` (`bout/resolution/stakes.ts`) runs `assignKenshoBanners`/`calculateKenshoEnvelopes` for **every** bout (`"low"` importance → `KENSHO_BASE_COUNT_LOW = 2`), writing `kenshoBanners`/`kenshoEnvelopes ≥ 1` onto juryo-and-below results.
- **User-visible:** `ReplayChrome.tsx:77`, `replayFx.ts`, `replayLoop.ts`, `BoutResultDisplaySections.tsx`, `KenshoManagementWidget.tsx` render `kenshoEnvelopes > 0` on bouts that never pay.
- **Fix:** gate `applyKensho` on `east.division === "makuuchi"`. `"low"` bucket becomes dead — simplify `determineBoutImportance` docs.

### A2. Foreign quota implements the pre-2010 loophole — five sub-fixes

Real rule (post-2010): foreign status binds at _shindeshi kensa_; post-debut naturalization never frees the slot; pre-debut Japanese citizenship (`dual`) is the only exemption; merger absorption may exceed 1 but blocks new foreign recruitment until all foreign-slot rikishi retire; citizenship mandatory for foreign-born toshiyori.

- **A2a** `countsAsForeign` (`citizenshipUtils.ts:41-43`) frees the slot on tenure/`naturalized`. → `isForeign(nationality) && citizenshipStatus !== "dual"`. `currentYear` param vestigial — simplify.
- **A2b** `candidateConsumesForeignSlot` (`talentPoolReads.ts:116-123`) exempts `naturalized` candidates (veteran re-entries). → consume unless `dualCitizen`/`"dual"`/`"native"`.
- **A2c** Merger exception unmodeled — `mergers.ts:165-211` `foreignOccupied` bars slot-consuming transfers from stacking. Real rule: exempt absorption; recruitment freeze falls out (`getForeignCountInHeya ≥ 1` already blocks signings). Remove the veto (see also A10d — merger placement simplification).
- **A2d** Toshiyori citizenship gate missing — `retireeOyakataConversion.ts` mints `nationality: "Japan"` (:112) without checking the incoming rikishi. → require `getCitizenshipStatus(r) !== "foreign"` to convert.
- **A2e** `RosterFactory.ts:104-116` escape hatch stamps overflow foreigners `naturalized` "to free the slot" — encodes the loophole. → stamp `dual` (pre-debut citizenship) or cap generation.
- **Stale comments:** `citizenshipUtils.ts:21-23`, `talentPoolReads.ts:81-82,112-135`, `overflow.ts:59-61`, `RosterFactory.ts:110-112`, `TalentPoolOffers.ts:41-42,108-109`, `mergers.ts:154-156`.
- **Callers verified correct under fix:** `getForeignCountsByHeya`, `TalentPoolOffers` gates, `TalentPoolNPCRecruitment` (5), `CandidatePoolService`, `ForeignSlotPolicy`, `AdvisorService`, `FamilyBondService`, `TalentPoolMaterialization`, `overflow.ts` retention bias, `holiday.ts` narrative, all UI displays.

### A3. Playoffs on fictional "day 16+"; 2-way east by shuffle

- `resolvePlayoffs`/`resolveTomoeSen` start `day = 16` → `d16/d17` boutIds (not user-visible, but wrong data). Real: kettei-sen same day on senshuraku (day 15). Real 2-way: higher-ranked rikishi east (game shuffles).
- **Fix:** all playoff bouts `day = 15`; uniqueness via `-p{n}` index in boutId; 2-way sorts by rank → higher east; keep shuffle for 3+ (real draw-lots). Grep `day === 16` / `> BASHO_DAYS` consumers before landing.

### A4. `RING_RADIUS = 4.55` meters

Real dohyo _diameter_ is 4.55m; physics uses it as a radius → ring ~2× real. **Decision: relabel/document** as ring half-width units (halving retunes all physics for no gameplay gain). `types/combat-spatial.ts`, `constants/engine/rikishi.ts`.

### A5. Nagoya venue stale

"Aichi Prefectural Gymnasium" → **IG Arena** since July 2025. Era-key the string. `calendar.ts`.

### A6. Debut-age gate loose

Pool evictions (HS 20 / uni 24 / foreign 28, `TalentPoolStateService:303`) allow 25–28yo debuts. Real: <23 standard, <25 qualified. → hard-gate signing at <23 (<25 for future `tsukedashi` flag); foreign pool maxAge → 24.

### A7. Tsukedashi unmodeled _(optional P3)_

Top-8 designated-amateur finishers ≤25y enter at Ms60/Sd80. Largest missing real system. `CandidateBuilder`, `TalentPoolMaterialization`, `MaezumoService`, banzuke placement.

### A8. Merit myoseki minting exceeds 105 _(document now; optional fix later)_

`retireeOyakataConversion` auto-grants shares to sanyaku+/200-win retirees age 28+ and mints beyond 105. Real: acquire existing share; jun-toshiyori (≤5y borrowed) / ichidai-toshiyori (dai-yokozuna) paths unmodeled.

### A9. Unmodeled real paths (catalog only)

jun-toshiyori; ichidai-toshiyori; intai-kin (report #25); banzuke-gai (can't trigger — fixed-size jonokuchi); azukari/itamiwake/mizu-iri (torinaoshi covers realistic case); hair-down auto-loss (physics balance collapse approximates); rikishi-ken; torikumi posting cadence (real pairings announced ~1.5–2 days ahead on rolling basis); JSA board size (game 5 vs real ~10+auditors — cosmetic).

### A10. Remove roster cap — real JSA has none

- **Hard caps to remove:** `ROSTER_CAPACITY_STANDARD=25`, `ROSTER_CAPACITY_MERGER=30`, `HEYA_ROSTER_HARD_CAP=30` (`constants/engine/roster.ts`); `HARD_CAP_ROSTER_SIZE=30` + `enforceHardCapRosterOverflow` (`recruitment/overflow.ts`, called `phase01_week_npc_ai.ts:229`); `playerHeyaRosterCap: 30` (`SimulationConfig.ts:20` — verify consumers; likely dead).
- **Merger path:** `mergers.ts` fills target to 30 then disperses/force-retires. Real: the designated receiving stable absorbs the whole roster (Miyagino→Isegahama). → straight transfer to target; remove `room()`/`fillCount`/dispersal/force-retire machinery (and with it the foreign-veto — completes A2c).
- **Succession:** `DynastyService.ts:618` parent-absorb gate `< ROSTER_CAPACITY_MERGER` → remove.
- **UI:** `RecruitingTabSections.tsx:153` `Roster: X/30`, `RecruitSigningDialog.tsx:172` `rosterSize / TARGET_ROSTER_SIZE`, `heyaUI.ts:112` `rosterLimit: 30` → show count only.
- **NPC appetite (keep, soft):** `MAX_ROSTER_SIZE=15` (npcStrategy), `ROSTER_VACANCY_TARGET=15` — NPC recruiting _targets_, not caps — plausible stable-size discretion, keep + document.
- **Population equilibrium (keep, not a cap):** `TARGET_ROSTER_SIZE=30` in `computePopulationTarget`/`WorldFactory`/`lifecycle.ts:44`/`phase01_week_recruitment.ts:81` is the demographic floor for NPC candidate supply — keep, but `allocateVacancies` per-heya `headroom = TARGET_ROSTER_SIZE − roster` hard cap → replace with appetite-based allocation (prestige/staff capacity).
- **Keep (not caps):** `NON_FINANCIAL_MERGER_MAX_ROSTER=5` (merger eligibility), `SUCCESSION_CLOSURE_MAX_ROSTER=8` (closure trigger).
- **Check during impl:** `crisisRegistry.ts:100`, `chainService.ts:93` roster-size thresholds; bard copy `events.json:149` "released…to bring the roster within limits" → dead.

### A11. Remove free agency / priorCareer re-entry — departed rikishi retire

With A10 removing the cap, the overflow enforcer has no trigger; remove the whole re-entry machinery:

- `reinjectManyToTalentPool`/`reinjectToTalentPool`/`buildReleasedCandidate` (`TalentPoolStateService.ts:120-196`) — only producer was `overflow.ts:107`.
- `priorCareer` machinery: `types/talent.ts:95-105` (`PriorCareer` type + candidate field), `CandidateBuilder.ts:462-488` re-mint path, `TalentPoolStateService` age-out exemption (:129-130) + visibility (:262), `idIntegrity.ts:164` comment.
- Verify no other producers of released-rikishi candidates (player release action? crisis events?) — none found; mergers' force-retire path also removed via A10 straight-transfer.

### A12. Unified JSA committee framework + real banzuke movement + decision commentary

Real JSA runs multiple deliberative committees; the codebase has one real instance (YDC) plus three deterministic functions that should become committees. Build one framework + harmonize.

**Framework:** `src/engine/governance/committee.ts` — `CommitteeMember` (oyakata, heya, ichimon), `Committee` def (id, seat count, convene schedule, eligibility), `deliberate(ctx) → DeliberationRecord[]` (deterministic; seeded RNG only for tie-breaks), `emitDecision()` → BardEngine template + `MediaEventService` headline (generalize the existing `emitYdcStatement` pattern). Constants in `src/constants/engine/committee.ts` — seat counts, convene weeks, discretion bounds, thresholds — single tweakable home.

**Instances:**

| Committee          | Current code                                                                                                                                              | Harmonization                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Banzuke** (new)  | `banzukeOps.ts:309-369` scores `computeMovementUnits` + fictional ichimon weights (Dewanoumi +300 / Nishonoseki +250 / other +100) → `assignBanzukeSlots` | Replace scoring with real rules: **base delta = round((W−L)/2)** (losses already include absence tail — the fusenpai/absence-tail fix makes this correct for free); **no** absence multiplier, **no** bonus units; committee applies _bounded discretion_: forced moves on catastrophic/exceptional records, hold-in-place on marginal MK when no worthy replacement, **sanyaku promotion requires open slot + qualifying record**, juryo↔makuuchi exchange by comparative records, jonokuchi-yusho jump as bounded discretion. Political weight re-channeled as seeded member preference within the discretion bound. Rule-bound paths stay rule functions the committee invokes: ozeki kadoban/reclaim/33-win (`ozekiLogic`, `bestTierAllowed` thresholds), yokozuna eligibility (`isYokozunaStrongCase`). Keep `assignBanzukeSlots`/slot template machinery — committee supplies deltas + tier eligibility. |
| **Sansho**         | `specialPrizes.ts` deterministic selection                                                                                                                | Re-express as SanshoCommittee deliberation (same real rules: S/K/M eligible, KK required, shareable, withholdable) → emits award/no-award decisions.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **YDC**            | `YokozunaService.processYDCCouncil`                                                                                                                       | Wrap existing statement flow as YDC committee instance; keep `ydc_accountability.*` templates.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Board/election** | `phase01_week_governance` `isElectionWeek`, `ELECTION_BOARD_SIZE=5`                                                                                       | Adopt shared committee types for membership/records (light harmonization).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Torikumi / others  | scheduler, mono-ii panels                                                                                                                                 | Catalog only — not deliberative in code.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |

**Commentary:** new `committee` BardEngine domain (or extend `institutional.json`): banzuke committee announcements (promotions, "no worthy candidate for vacant slot", hold-in-place rationale), sansho committee award/no-award items, YDC statements (existing). Feed via `MediaEventService` + digest; persist `DeliberationRecord[]` on basho conclusion/`BashoHistory` (existing `deliberat*` fields in `types/basho.ts` are the model). Existing items (banzuke publish news in `publish/movements.ts`/`newRanks.ts`, YDC statements) keep flowing — committee adds the missing decision items.

**Risk:** biggest gameplay-impact change — promotion flow shifts every basho. Committee discretion must stay bounded + seeded (determinism). Verify with 25-yr sim + determinism double-run.

---

## Part 3 — Documented deviations (no code change)

- **Lower-division odd-man chain** — real: cross-division cascade → live maezumo pull → fusenshō (never an 8th bout). Game: cascade → live maezumo reuse → **minted maezumo** (`MAEZUMO_MINT_CAP`, fictional — code itself notes real maezumo are unattached) → **8th bout** on `EIGHTH_BOUT_DAY`=13 (`pickEighthBoutMan`, UI-labeled "rare") → `// documented edge — the odd man sits` (unpaired, no fusenshō). User-endorsed simulation safeguard — document the real chain + the fictional filler layers.
- **Rikishi free agency** — REMOVED per A11 (was deviation; now fixed).
- **Banzuke movement formula** — REPLACED per A12 (was deviation; now fixed).
- Tsukebito monthly ¥ cost (real: unpaid juniors); recruitment bidding/scouting tiers/Youth Academy/4-week windows (fictional); welfare/compliance/fines (fictional layer); kensho fame mechanics (declared); drama matchmaking weights; jungyo shape (real = multi-week circuits); auto-naturalization on tenure (kept for display/kabu; quota fixed per A2); NPC appetite targets `MAX_ROSTER_SIZE=15`/`ROSTER_VACANCY_TARGET=15` (soft discretion); `TARGET_ROSTER_SIZE` demographic floor (population planning, not a roster rule).

---

## Part 4 — Implementation sequence (strict test-first)

> **Rule:** failing tests exist and are confirmed red before each production change. Docs-only items (P0, P2) exempt.

**P0** — Extend `docs/audit/rules-divergence-report.md` with the Part-2 ledger + Part-1 verified table + Part-3 deviations. No code.

**P1-T — Write/update ALL failing tests for A1–A6, A10, A11 first; confirm red:**

1. `tests/unit/engine/bout/kenshoDivision.test.ts` (**new**): non-makuuchi bouts → `kenshoBanners` empty/`kenshoEnvelopes` 0; makuuchi → banners; makuuchi playoff → eligible; juryo playoff → none. Audit `boutNarrative.kensho.test.ts`.
2. `tests/unit/engine/utils/citizenshipUtils.test.ts`: rewrite — `countsAsForeign` true for `naturalized` + tenure-aged; false only `dual`/native; `getHeyaForeignUsage`/`isAtForeignLimit` count naturalized; `getCitizenshipStatus`/`yearsUntilNaturalization` unchanged.
3. `tests/unit/audit/foreign-limit-consistency.test.ts`: flip "naturalized does not consume" → consumes.
4. `foreignCount.test.ts`, `foreignSlotPolicy.test.ts`, `foreignSlotAdvisor.test.ts`, `overflow.test.ts` (retention bias w/ naturalized — note: file may be deleted with overflow.ts; fold cases into heya-level test), `recruitment-surface.test.ts` (`candidateConsumesForeignSlot` naturalized consumes), `TalentPoolPage.test.tsx`, `v18TalentPool.test.ts`.
5. `nonFinancialMerger.test.ts`/`economyProjectionsMerger.test.ts` (**new cases**): foreign stacks onto occupied receiving stable; over-cap stable still blocked from foreign signings; **whole roster transfers (no dispersal)** — merges with A10.
6. `retireeOyakataConversion.test.ts` (**new case**): `"foreign"` retiree cannot convert; naturalized/dual can.
7. `RosterFactory.test.ts` (**new case**): overflow foreigner stamped `dual`, not `naturalized`.
8. `PlayoffResolver.test.ts`, `lowerDivisionPlayoff.test.ts`, `tournamentPlayoff.test.ts`: all playoff `day === 15`; unique boutIds; 2-way higher-rank-east; tomoe-sen unchanged.
9. Age-gate test (near `TalentPoolOffers`): ≥23 non-qualified cannot sign; 25–28 foreign gated.
10. Roster-cap removal: heya can exceed 30 without releases (no `enforceHardCapRosterOverflow` in tick); `allocateVacancies` has no per-heya hard headroom; roster displays show raw count.
11. Free-agency removal: `reinjectToTalentPool`/`priorCareer`/`buildReleasedCandidate` gone (compile-checked); departed-rikishi paths produce retirement archives, not pool candidates.

**P1** — Land A1 → A2(a–e) → A3 → A4 → A5 → A6 → A10/A11 (connected: delete `overflow.ts` + caps together).

**P2** — Document Part-3 deviations in the report.

**P3-T + P3** — **A12 committee framework** (largest item, its own test-first cycle):

- Tests first: `tests/unit/engine/governance/committee.test.ts` — deterministic deliberation, seeded tie-breaks, `DeliberationRecord` shape, feed emission. `tests/unit/engine/banzuke/banzukeCommittee.test.ts` — (W−L)/2 base deltas, absence-as-loss, sanyaku open-slot rule, juryo↔makuuchi exchange, forced moves (0-15), no bonus units, hold-in-place discretion bounded, ozeki/YDC rule-bound paths unchanged, regression vs `banzukeOps` slot machinery. Sansho-committee tests reuse existing `specialPrizes` cases expressed as decisions.
- Implement: `governance/committee.ts` + `constants/engine/committee.ts` → banzuke committee wired into `banzukeOps` → sansho/ydc/board harmonization → `committee` bard domain + `MediaEventService` feed + `DeliberationRecord` persistence in `BashoHistory`.
- Optional P3 extras: A7 tsukedashi, A8(b) myoseki cap + jun-toshiyori, intai-kin.

## Verification

- `bun run typecheck`, `bun run lint`, targeted `vitest` → green; then **full** unit suite (not just touched files).
- Meta-gates: MockFactory, no tautological assertions, correct tier, no `Math.random`.
- Determinism double-run (`scripts/sim`) after A2/A10/A12 — seed-stable (outcome parity vs old saves not required).
- 25-yr sim spot-check after A12 (banzuke realism shifts career trajectories) and if A7 lands.
- UI spot: replay chrome shows no kensho on juryo; recap shows committee feed items; roster shows raw count.

## Risks / notes

- A2 makes slots stickier; A10 removes the overflow release — together they mean a heya can hold a naturalized foreigner + sign none until he retires (real rule). Over-cap worlds possible via merger (intended).
- A11: confirm no player-initiated release UI exists — if found, reroute to retirement pressure (intai) rather than free agency.
- A12 is the largest blast radius: every basho's rankings change character; discretion bounds are the tuning knob — keep them tight initially and expose in `constants/engine/committee.ts`.
- A3: grep `day === 16` / `> BASHO_DAYS` before landing.
- P3 optional; plan complete at P2 + A12 if scoped in.

---

## Implementation progress — COMPLETE (all P0–P3 items landed)

- [x] **P1-T** failing tests written first, all red for intended reasons (~25 red assertions)
- [x] **A1** kensho makuuchi-only metadata (`stakes.ts`) — `c72df39e`
- [x] **A2** post-2010 foreign quota (a–e): debut binding, dual-only exemption, merger stacking exception, toshiyori citizenship gate, RosterFactory reroll — `c72df39e`
- [x] **A3** playoffs on day 15, unique bout ids, higher-rank-east — `c72df39e`
- [x] **A4/A5/A6** ring radius 2.275m, Nagoya IG Arena, under-23 debut gate — `c72df39e`
- [x] **A10/A11** roster caps + free agency removed (overflow.ts, priorCareer, merger dispersal gone; whole-roster closure transfer) — `c72df39e`
- [x] **P3-T + A12** shared committee framework (`engine/committee/committee.ts` + `constants/engine/committee.ts`); banzuke committee replaces units formula + ichimon political weight — (W−L)/2, kyujo ≈ losses, bounded merit/faction discretion; sansho + board elections harmonized; YDC already conformed; deliberation feed items — `322711c3`
- [x] **A7** tsukedashi: university→Ms60 / high-school→Sd80, under-25 exception, maezumo skip — `031d9779`
- [x] **A8(b)** myoseki 105-cap enforced; jun-toshiyori (5y/3y, expiry → succession) + ichidai-toshiyori (20+ yusho yokozuna); intai-kin rank-keyed payment — `031d9779`
- [x] **P0/P2 docs** — divergence report updated (domains 6/9/16/20/25 amended; 26–31 added; fix-commit table + deviations list), user manual (banzuke committee, eligibility rules, intai-kin/myoseki), design bible checked (no stale claims)
- [x] Full unit suite green after each phase (10,098 @ midpoint; **1,093 files / 10,096 tests / 1 skip final**)
- [x] Determinism double-run (`tests/slow/audit/determinismDoubleRun.test.ts`, slow config): basho + year horizons serialize byte-identically — PASS
- [x] Function-length refactors + timings baseline — `0fb97710`; lint + typecheck green; all commits synced to origin/main
- [x] **UI spot checks (live, Playwright soak)** — `tests/e2e/jsa-ui-spotcheck.e2e.test.ts` PASS:
  - roster shows raw "N rikishi" count, no "/30" cap text
  - juryo bout replay chrome: 0 envelopes/banners in result data, zero kensho text in dialog through finish/ceremony; makuuchi positive control showed the envelope badge
  - recap renders "Committee Deliberations" section with vote-line cards backed by real `banzuke_committee`/sansho events
- [x] **Gap found + fixed during spot check:** committee feed events never reached the recap — wrap filter excluded their categories and the "other" bucket is dropped pre-render. Added committee bucket through `recapEventGroups`, `CommitteeSection` in `NarrativeSummary`, `title`/`summary` on emitted events — `e4b9b76e`
