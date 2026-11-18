# Extend Global Search — Oyakata, Staff, Recruits + Dedicated Oyakata Profile Page (validated)

Validated plan: extend TopNavBar entity search to oyakata/staff/talent-pool recruits and add a dedicated /oyakata/$oyakataId profile page with management-game career stats — including a per-heya tenure-delta aggregation fix for a discovered counter-overwrite bug — sequenced strictly test-first.

## Summary

Global search today covers **rikishi (active + retired) and stables**. This change adds **oyakata/elders**, **staff**, and **talent-pool recruits**, plus a new dedicated **`/oyakata/$oyakataId`** profile page (years in charge, yusho, sekitori/san'yaku/ōzeki/yokozuna produced, myoseki share, succession). `/stable/oyakata` redirects to the player's oyakata page; the All-Oyakata directory consolidates under `/oyakata`. WS7 intel banding enforced. Save/backwards-compat constraints waived per user direction (new tenure counters are required fields; old saves still read safely via the existing `{...baseTenure, ...tenure}` merge).

## Validation results (each claim audited against source)

| # | Draft claim | Verdict | Evidence |
|---|---|---|---|
| 1 | Global search = rikishi+retired+heyas only | **Approved** | `entitySearchProjections.ts`, `GlobalEntitySearch.tsx`, tests |
| 2 | `world.oyakata` searchable; `/oyakata/$id` was removed | **Approved** | `world.ts:205`, `ClickableName.tsx` comment, commit `d7a6f71e` |
| 3 | `world.staff` populated for NPC + player | **Approved** | starts empty (`WorldFactory:105`); `execution.ts:307` NPC `hireStaff` → `staffToAdd`; player via `HIRE_STAFF` |
| 4 | Recruit source = `world.talentPool` | **Corrected** | `listVisibleCandidates`/`getCandidateScoutingLevel`/`TalentPoolPage` all read `world.talentPool`. `world.candidatePool` is the **parallel NPC-watch pool** (`CandidatePoolService`, `/jsa/candidates`) — explicitly **out of scope** |
| 5 | Tenure tracks yusho/sekitori/etc., not yokozuna | **Approved** | `tenure.ts`, `oyakata.ts:86-96` |
| 6 | Bump counters in `applyNewRanks` | **Corrected + bug found** | See **Finding A** below |
| 7 | `ManagerCareerCard` reusable for any heya | **Approved** | `projectManagerCareer(world, heyaId)` — pure, heya-scoped |
| 8 | WS7 gating via `hasScoutingCoverage` | **Approved** | `rivalStablesProjections.ts:50` — module-private; must be exported |
| 9 | `useOyakataSelection`/`MentorshipCard`/`OyakataDirectory` sole consumer = OyakataPage | **Approved** | grep: only `OyakataPage.tsx` imports them |
| 10 | `OyakataName` links need reworking | **Corrected** | Props already include oyakata `id` (test uses `id="o3"`) → link `/oyakata/$id` directly; existing tests assert `/stable/h-ise` + "no dead route" — must be **rewritten** |
| 11 | `/stable/staff` is player-only | **Approved** | `StaffPage` iterates `heya.staffIds` of `getPlayerHeya` — NPC staff hits → `/stable/$heyaId` |
| 12 | Breadcrumb `/oyakata` segment needs a route | **Corrected** | `resolveEntityLabel` falls back to prettify, but `ROUTE_LABELS["/oyakata"]` crumb would link to a 404 → **add `/oyakata` index route** (directory page) |
| 13 | `validateSearch` precedent | **Approved** | `/new-game` (`routes.tsx:126`, `useSearch({from:"/new-game"})`) |
| 14 | New counters optional for save-compat | **Superseded** | user waived compat → required fields matching the other 7 counters; merges still defend old saves |

### Finding A — pre-existing counter-overwrite bug (must fix in this change)

`bumpTenure` computes the next tenure object from **pre-resolution** `oya.tenure` then writes `{tenure}` via `builder.updateOyakata`. Two calls for the **same heya** in one pass overwrite each other — `applyBashoTenure` documents this and aggregates deltas per heya first (`tenure.ts:91-94` comment). But `recordSekitoriPromotion` is invoked **per-rikishi** inside the `applyNewRanks` loop (`newRanks.ts:39-42`): two same-heya sekitori promotions in one publish → second write clobbers the first → `sekitoriProduced` undercounts today.

**Fix (in scope):** aggregate a `Map<heyaId, TenureDelta>` across the `applyNewRanks` loop — sekitori/sanyaku/ozeki/yokozuna bumps combined — and emit one `bumpTenure` per heya, mirroring `applyBashoTenure`'s pattern. Fixes the existing undercount and the new counters in one pass.

### Finding B — `isSanyaku` covers Y/O/S/K

`RANK_HIERARCHY` marks **all of yokozuna, ozeki, sekiwake, komusubi** `isSanyaku: true` (`banzuke.ts:117-158`). `isSanyakuPromotion` (computed `banzukeOps.ts:514` as `!fromIsSanyaku && toIsSanyaku`) therefore fires only on the **first cross into sanyaku** — ōzeki/yokozuna promotions from sekiwake/komusubi do **not** re-fire. New counters need explicit first-time checks:
- `sanyakuProduced` ← existing `isSanyakuPromotion` flag
- `ozekiProduced` ← `newEntry.position.rank === "ozeki"` && `rikishi.rank !== "ozeki"` && `!(rikishi.careerHistory ?? []).some(s => s.rank === "ozeki")` (precedent: `everReachedSanyaku`, `newRanks.ts:204-207`)
- `yokozunaProduced` ← `newEntry.position.rank === "yokozuna"` && `rikishi.rank !== "yokozuna"` (yokozuna can't be demoted — first-time by construction; history check optional)

### Finding C — test-mock surface changes (real breakage if missed)

- `GlobalEntitySearch.test.tsx` mocks `searchEntities` returning `{rikishi, retired, heyas}` — new `oyakata`/`staff`/`candidates` buckets would be `undefined` → `.map` crashes → **every mockReturn in the file must gain the three arrays**.
- `TalentPoolPage.test.tsx` mocks `@tanstack/react-router` **without `useSearch`** → adding `useSearch` to the page breaks all its tests → mock must gain `useSearch`.
- `ClickableName.test.tsx` oyakata tests assert the **old** behavior (`/stable/h-ise`, plain text) — rewrite for `/oyakata/$id`; oyakata branch reads `GameContext`, so tests need a `GameContext.Provider` wrapper (context exported from `@/state/game/gameContextInstance`).
- `factoryDiscipline` meta-test bans local `makeOyakata|createOyakata|makeStaff|createStaff|makeCandidate|createCandidate` names → all new fixtures must use `MockFactory.createOyakata / createStaff / createCandidate / createTalentPool` (all exist, `MockFactory.ts:207-326`).

### Finding D — confirmed accessors/types for implementation

- `getOyakata`, `getAllOyakata` (all incl. emeritus), `getStaffMember`, `getHeyaStaffList`, `getOyakataForHeya`, `getRikishiAnywhere`, `getTalentPool` — all in `presenters/worldAccess.ts`.
- `heya.staffIds` — per-heya staff index (`StaffPage:37`).
- `oyakataStageInput(o)`, `staffStageInput(s)`, `candidateStageInput(c, year)` — `avatarGenerator.ts:456-480`.
- `projectNPCAgentActivity(world)` → `{decisions, decisionsByHeya}` (`npcAgentProjections.ts:268`) — filter `decisions` by `heyaId` for the page's recent-decisions card (post-cap filter may under-collect for quiet heyas — label "Recent decisions", acceptable).
- `MentionText` renders `[[oyakata:id:label]]` via `ClickableName type="oyakata"` — the branch is **live**, must keep its context-verified fallback.
- `heya.rikishiIds`/`staffIds`, `getHeyaRoster` + `isSekitoriDivision`/`isSanyakuRank` for the stable-snapshot card.
- `withWorldGuard(LazyComp)` route wrapper (`routes-helpers.ts:15`); pages registered via `lazy(() => import("@/pages/X"))`; named exports use `.then(m => ({default: m.X}))` (precedent `routes.tsx:47-49`).

## Execution order — strict test-first

**Phase 0 — write all failing tests (no production code yet).** Then implement per phase; tests turn green incrementally.

### Phase 0a — engine tests (failing: counters don't exist)

`tests/unit/engine/institutional/tenure.test.ts` (extend) — via `applyNewRanks` + `createImpactBuilder`/`resolveImpacts` (existing test harness pattern):
- first sanyaku cross (makuuchi→komusubi) bumps `sanyakuProduced` on sitting oyakata
- first-time ōzeki bumps `ozekiProduced`; ōzeki reclaim (demote→restore) does **not** double-count
- yokozuna promotion bumps `yokozunaProduced`
- **same-heya double promotion aggregation**: two rikishi of one heya promoted in a single publish → both counters land (regression for Finding A — currently fails even for `sekitoriProduced`)
- cross-heya attribution: promotion credits `heya.oyakataId`'s sitting oyakata only

### Phase 0b — projection tests (failing: new buckets don't exist)

`tests/unit/presenters/entitySearchProjections.test.ts` (extend; `MockFactory.createWorld/createOyakata/createStaff/createCandidate/createTalentPool`):
- oyakata: match `name`, `shikona`, `formerShikona`; `isEmeritus`/`isCaretaker`/`elderStatus` flags; `archetypeLabel` present only when `heyaId === playerHeyaId` or `playerKnowledge.scouting` has `timesObserved > 0` for that heya (fixture: `{playerKnowledge: {scouting: {rX: {publicInfo: {heyaId: "h9"}, timesObserved: 2}}}}`)
- staff: name match, `heyaName` resolution, `isPlayerOwned`
- candidates: `public` band always returned; non-public returned only at `scoutingLevel >= 65`; hidden-reserve ids never returned (not in `candidatesVisible`); foreign pool respects `regionalPresence` gating
- caps (6/5/5), score ordering within buckets, partial-world tolerance (missing `oyakata`/`staff`/`talentPool` → empty buckets)

### Phase 0c — component/route tests (failing)

- `GlobalEntitySearch.test.tsx`: **update all mockReturns** with the 3 new buckets first, then add — "Oyakata"/"Staff"/"Prospects" group headers render; Enter on oyakata → `/oyakata/$oyakataId`; staff player→`/stable/staff` vs NPC→`/stable/$id`; candidate → `/jsa/talent` + `search: {pool, focus}`; option count across 6 groups.
- `ClickableName.test.tsx`: rewrite oyakata cases — `type="oyakata"` links `/oyakata/$id` when context world contains the id, plain text otherwise; `OyakataName` links `/oyakata/$id` via its `id` prop (wrap in `GameContext.Provider`).
- `routes.test.tsx`: assert `"/oyakata/$oyakataId"` + `"/oyakata"` in `routesById`.
- `TalentPoolPage.test.tsx`: add `useSearch` to router mock; `?pool=foreign` selects the foreign tab; `?focus=<id>` highlights/scrolls the card.
- New `tests/unit/pages/OyakataProfilePage.test.tsx` (replaces `OyakataPage.test.tsx` — port the directory sort/localStorage cases to `OyakataDirectory`): profile renders name/tenure stats; gated intel hidden for unscouted NPC; emeritus/caretaker badges; not-found state; `/stable/oyakata` redirect resolves player's `heya.oyakataId`.
- `Breadcrumbs` (new or extend existing suite in `tests/unit/components/layout/`): `/oyakata/o1` resolves crumb to oyakata name via `world` prop; `/oyakata` labeled "Elders" and is a real route.

### Phase 1 — engine

1. `src/engine/types/oyakata.ts` — `tenure` gains required `sanyakuProduced`, `ozekiProduced`, `yokozunaProduced` (user waived compat; `baseTenure`/merge still cover old saves).
2. `src/engine/legacy/tenure.ts` — `baseTenure` zeros; widen `recordSekitoriPromotion` (or add sibling `recordPromotionTenure`) to accept aggregated deltas; document Finding A fix.
3. `src/engine/banzuke/publish/newRanks.ts` — per-heya `Map` of tenure deltas across the `newBanzuke` loop (sekitoriProduced + sanyakuProduced + ozekiProduced + yokozunaProduced), single `bumpTenure` per heya at the end; first-time-rank check helper (`everReachedRank`).
4. `src/presenters/projections/careerProjections.ts` — `ZERO_TENURE` + `ManagerCareerProjection.tenure` include new counters.

### Phase 2 — search projection + search UI

5. `entitySearchProjections.ts` — `OyakataSearchHit`/`StaffSearchHit`/`CandidateSearchHit`; `EntitySearchResults` gains `oyakata`/`staff`/`candidates`; caps `OYAKATA_RESULT_CAP=6`, `STAFF_RESULT_CAP=5`, `CANDIDATE_RESULT_CAP=5`; oyakata match name/shikona/formerShikona incl. emeritus+caretakers; staff match name; candidates = `listVisibleCandidates` per pool filtered by `visibilityBand==="public" || getCandidateScoutingLevel>=65`; import reads from `@/engine/generation/talentPoolReads`; archetype gated via exported `hasScoutingCoverage` (export it from `rivalStablesProjections.ts`, or hoist to a shared projections module).
6. `rivalStablesProjections.ts` — export `hasScoutingCoverage`.
7. `GlobalEntitySearch.tsx` — `EMPTY` gains new buckets; `options` order **Stables → Wrestlers → Retired → Oyakata → Staff → Prospects**; `select()` routes oyakata→`/oyakata/$oyakataId`, staff→`/stable/staff`|`/stable/$id`, candidate→`/jsa/talent`+`search:{pool,focus}`; placeholder → "Search wrestlers, elders & more…".
8. `GlobalEntitySearchSections.tsx` — `FlatOption` union + `optionGroup` labels ("Oyakata"/"Staff"/"Prospects"); row renderers (oyakata: avatar+name+heya+archetype-if-known+elder badges; staff: `Briefcase` icon+name+role+heya; candidate: avatar-or-"?"+name+pool label+age+Star/Foreign badges; icons per sidebar conventions).

### Phase 3 — routes, page, redirect, links, deep-links

9. `src/pages/OyakataProfilePage.tsx` (new) + `src/components/oyakata/OyakataProfileSections.tsx` (new):
    - `useParams $oyakataId` → `world.oyakata.get`; missing → EmptyState + back
    - `AppLayout` + `STABLE_TABS` + `activeSubTab="oyakata"`; `<title>{name} — Oyakata | Basho</title>`
    - **Header**: avatar (public), name, stable `StableName`, age, `yearsInCharge` yrs, `tenure.startedYear` ("In charge since Y"); badges: elderStatus (Jun w/ expiry year, Ichidai), `isEmeritus`, `isCaretaker`, `highestRank`
    - **Manager record grid** (public): bashoServed, Yūshō (championships), sekitori/san'yaku/ōzeki/yokozuna produced, boardSeatsWon, insolvency/scandal/forced-merger counts
    - **`ManagerCareerCard`** reuse (`heyaId=o.heyaId`): election standing, bands, milestones
    - **`CareerAsRikishiCard`** reuse + `View wrestling career` → `/rikishi/$formerRikishiId` when `getRikishiAnywhere` resolves
    - **Elder & myoseki**: elderStatus/`elderExpiryYear`/`isEmeritus`; `world.myosekiMarket.stocks` scan for `holderId|ownerId === o.id` → share name/tier/status(+leaseFee); jun-toshiyori → "temporary status, no stock"
    - **Stable snapshot**: roster size, sekitori count, san'yaku count (`getHeyaRoster`+`isSekitoriDivision`+`isSanyakuRank`), staff count (`heya.staffIds?.length ?? 0`), ichimon
    - **Intel card (gated)** — `o.heyaId === playerHeyaId || hasScoutingCoverage`: archetype, mood, personality, quirks, temperament, `TraitsCard`, `stats`, grudges (resolve ids→`StableName`/`OyakataName`); else "Limited intel — scout this stable's rikishi to learn more" (mirrors `OyakataProfileDrawer`)
    - **`MentorshipCard`** (gated same as intel): refactor `{sel}` → `{world, heyaId}`; pairs via new `mentorshipPairsFor(world, heya)` helper
    - **Recent decisions** (public): `projectNPCAgentActivity(world).decisions.filter(d => d.heyaId === o.heyaId)`
    - **Succession card (player-heya only)**: `successionReadiness`, `successorCandidateId`→`RikishiName`, `retirementYear`
    - **`OyakataDirectory`** at bottom: refactor — own sort `useState` (keep `basho_sort_oyakata` key), `world` prop, click → `navigate /oyakata/$id`, current oyakata highlighted; all oyakata incl. emeritus
10. `src/pages/OyakataIndexPage.tsx` (new, thin): PageHeader "Elders" + `OyakataDirectory` — gives `/oyakata` a real landing and the directory a canonical home.
11. `src/app/routes.tsx` — `lazy` imports: `OyakataProfilePage` (default), `OyakataIndexPage` (default), `PlayerOyakataRedirect` (named export from `OyakataProfilePage`, `.then(m=>({default:m.PlayerOyakataRedirect}))`); routes `/oyakata` (index), `/oyakata/$oyakataId`, `stableOyakataRoute` component→redirect; `jsaTalentNestedRoute` gains `validateSearch` `{pool?: TalentPoolType, focus?: string}` (`/new-game` precedent).
12. `src/pages/OyakataPage.tsx` → `PlayerOyakataRedirect`: `world.playerHeyaId → heya.oyakataId` → `<Navigate to="/oyakata/$oyakataId" replace>`; EmptyState when absent.
13. `src/hooks/useOyakataSelection.ts` — **delete** (sole consumer replaced); `mentorshipPairsFor` moves to `src/presenters/projections/oyakataProjections.ts` (new, also hosts stable-snapshot + scouting-gate helpers).
14. `src/components/shared/ClickableName.tsx` — `type="oyakata"`: `world.oyakata.has(id)` → `<Link to="/oyakata/$oyakataId" params={{oyakataId:safeId}}>`, else plain text (preserves verified-fallback semantics); `OyakataName` delegates `<ClickableName type="oyakata" id={id}>` (`heyaId` prop becomes vestigial — keep signature, note deprecation; no call sites).
15. `src/components/layout/Breadcrumbs.tsx` — `ROUTE_LABELS["/oyakata"]="Elders"`; `resolveEntityLabel` adds `parent==="oyakata"` → `world.oyakata.get(id)?.name`.
16. `src/pages/TalentPoolPage.tsx` — `useSearch({from:"/jsa/talent"})`: `pool` drives `activePool` tab state; `focus` → card `id={candidate-${candidateId}}` + `useEffect` `scrollIntoView` + ring highlight.

## Files

**Create** — `src/pages/OyakataProfilePage.tsx`, `src/pages/OyakataIndexPage.tsx`, `src/components/oyakata/OyakataProfileSections.tsx`, `src/presenters/projections/oyakataProjections.ts`, `tests/unit/pages/OyakataProfilePage.test.tsx`
**Delete** — `src/hooks/useOyakataSelection.ts`; `tests/unit/pages/OyakataPage.test.tsx` (superseded)
**Modify** — engine: `oyakata.ts`, `tenure.ts`, `newRanks.ts`, `careerProjections.ts`; search: `entitySearchProjections.ts`, `rivalStablesProjections.ts`, `GlobalEntitySearch.tsx`, `GlobalEntitySearchSections.tsx`; chrome: `Breadcrumbs.tsx`, `ClickableName.tsx`; pages/routes: `routes.tsx`, `OyakataPage.tsx`, `OyakataPageSections.tsx`, `TalentPoolPage.tsx`; tests: `entitySearchProjections.test.ts`, `GlobalEntitySearch.test.tsx`, `ClickableName.test.tsx`, `routes.test.tsx`, `TalentPoolPage.test.tsx`, `tenure.test.ts`; `docs/audit/test-timings.json` via `bun run test:timings`

## Verification

- `bun run type-check` — clean (watch: `EntitySearchResults` consumers, `Oyakata.tenure` required fields).
- `bun run lint` — incl. import-boundary rules; projection imports engine reads directly (precedent exists).
- `bun run test` — targeted files first, then full unit suite; `test:slow`/`test:perf` untouched; regenerate `test-timings.json`.
- Manual (`bun run dev`): `/` + `Ctrl+K` focus; all 6 groups; keyboard nav; oyakata page (player vs scouted-NPC vs unscouted-NPC intel); emeritus/caretaker hits; `/stable/oyakata` redirect; `/oyakata` directory; candidate deep-link tab+highlight; MentionText oyakata links.

## Risks / notes

- **Finding A fix changes behavior**: `sekitoriProduced` now counts multi-promotion bashos correctly — an intentional bug fix, not a regression.
- **No retroactive counters**: sanyaku/ozeki/yokozuna-produced accrue from the next publish; UI labels them "produced this reign".
- **Fog-of-war**: candidates/staff rows can't leak hidden intel (name-visibility + scouting gates).
- **`/stable/oyakata` deep links/bookmarks** survive via redirect.
- **Emeritus oyakata** may hold stale `heyaId` — page tolerates missing heya; directory still lists them.
- **`OyakataName.heyaId` prop** becomes unused — kept for API stability, documented.
- Optional polish (not core): link oyakata names in `OyakataProfileDrawer`/`RivalOyakataCard` → `/oyakata/$id`.
