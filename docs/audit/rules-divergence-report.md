# Rules Divergence Report — Code vs Documentation vs Real JSA

**Generated:** 2026-11 — JSA-alignment pass
**Scope:** three-way reconciliation of (a) coded rules, (b) game documentation (Constitution, user-manual, design-bible), (c) real modern JSA rules, including the **July 30, 2026 JSA board revision** effective Hatsu 2027 and the **October 1, 2026 Article-9 amendment**.

**Alignment policy (user-approved):** modern JSA rules win every resolvable mismatch; game-original mechanics may remain only when intentionally retained and clearly labeled as deviations; the in-game calendar (start: 2026-01-01) is authoritative for rule activation — announced 2027 changes engage on the real timeline.

**Status legend:** `ALIGNED` matches real JSA · `FIXED` was diverged, now corrected (commit referenced) · `GAME-DEVIATION` intentionally kept, documented · `UNMODELED` real rule not represented · `DOC-ONLY` documentation was the stale side

---

## Domain ledger

### 1. Kinboshi (金星)

- **JSA rule:** maegashira defeats yokozuna in a **contested** bout — never by fusensho or hansoku. Each star adds +10 mochikyukin points; no direct monthly stipend.
- **Was:** hansoku wins earned kinboshi; a dead `kinboshiStipend` constant implied a ¥40k/month stipend (never paid — the money path already routed through mochikyukin); docs claimed the stipend.
- **Now:** `FIXED` — hansoku excluded (`1e11d6cc`); dead constant removed; mochikyukin +10/star confirmed. Docs corrected.

### 2. Ginboshi (銀星)

- **JSA status:** **not official** — an informal fan/media term for (a) maegashira beating an ozeki, or (b) sekiwake/komusubi beating a yokozuna (who cannot earn official kinboshi). No record, no payment.
- **Was:** only sense (a) modeled; presented as quasi-official.
- **Now:** `FIXED + GAME-DEVIATION` — both senses modeled (`1e11d6cc`); documented as informal; grants popularity/prestige but no mochikyukin.

### 3. Mochikyukin (持ち給金)

- **JSA rule:** points = (wins − losses) × 0.5 on kachi-koshi (floored at 0); +10 kinboshi; +30 makuuchi yusho; **+50 zensho yusho replaces the 30**; floors Y150/O100/makuuchi 60/juryo 40; debut seed ¥3; pays points × ¥4,000 every 2 months to sekitori.
- **Was:** a false-fidelity comment claimed "real JSA uses kachi-nokori (wins − 8)" while the formula ignored the already-computed `netWins`; zensho awarded 30+50=80 (double-counted); jun-yusho credited +5 to one tied non-winner.
- **Now:** `FIXED` — net-wins formula, zensho replacement, jun-yusho excluded (`0f0bfdff`). Floors and ¥4,000/bimonthly payout verified **exactly** JSA-real (sanspo/TBS/Daily sources).

### 4. Sansho (三賞)

- **JSA rule:** shukun-sho/kanto-sho/gino-sho eligible at sekiwake, komusubi, **and** maegashira; shareable; multi-award; withholdable. Prize ¥2M→¥3M from 2027. Paid to the **wrestler**.
- **Was:** maegashira-only, singular non-shareable awards, paid per a fictional "¥2M treasury injection to the stable" doc line.
- **Now:** `FIXED` — `SpecialPrizesResult` is `Id[]` arrays across the ripple surface (`6a0a4be4`); era-keyed prize value.

### 5. Yusho prizes (優勝賞金)

- **JSA rule:** ¥10M/¥2M/¥500k/¥300k/¥200k/¥100k by division → ¥20M/¥3M/¥700k/¥500k/¥300k/¥200k from January 2027.
- **Now:** `FIXED` — era-keyed `jsaYushoPrize` (`a9612c2d`); consumed by BashoHistory, PrizeDistribution, AutoSimService, and projection paths.

### 6. Playoffs (優勝決定戦)

- **JSA rule:** 2-way = one bout; **3-way = tomoe-sen** (round-robin rotation, champion needs two consecutive wins); 4+ = single-elimination. All playoff rounds are contested on **senshuraku (day 15)**; in a 2-way playoff the higher-ranked rikishi stands on east.
- **Was:** all candidate counts used single-elimination; 3-way gave an unfair bye. Playoffs were also scheduled on a fictional "day 16+".
- **Now:** `FIXED` — tomoe-sen implemented with full pbp/narrative (`3b27337f`); all rounds on day 15 with unique bout ids and higher-rank-on-east (`c72df39e`).

### 7. Jun-yusho (準優勝)

- **JSA rule:** no official award — runner-up is a label.
- **Was:** every tied non-winner was paid ¥2M, and exactly one received +5 mochikyukin — internally inconsistent across two codepaths.
- **Now:** `FIXED` — label only; `junYushoAmount` removed from config, BashoHistory, historySort (`0f0bfdff`).

### 8. Sekitori salaries (月給)

- **JSA rule:** Y ¥3.0M / O ¥2.5M / S-K ¥1.8M / M ¥1.4M / J ¥1.1M → Y ¥3.3M / O ¥2.75M / S-K ¥2.0M / M ¥1.55M / J ¥1.2M from Jan 2027.
- **Was:** a prior commit shifted the table down a tier (komusubi ¥1.4M, maegashira ¥1.1M).
- **Now:** `FIXED` — `jsaSekitoriSalary` era-keyed; komusubi correctly treated as sanyaku (`a9612c2d`).

### 9. Kensho (懸賞金)

- **JSA rule:** makuuchi bouts only; sponsor pays ¥70,000 → ¥10,000 JSA fee + **¥10,000 cash** on the dohyo + **¥50,000** JSA-held account (split since Natsu 2025); withdrawn on fusensho.
- **Now:** `FIXED` — banners/envelopes now only attach to makuuchi bouts end-to-end (`stakes.ts` gates on `east.division === "makuuchi"`, matching the payout gate at `economics.ts:51`; `c72df39e`). `ALIGNED` on the money (`KENSHO_SPLIT = {cash:10k, retirement:50k, jsaFee:10k}`, fusensho→0 envelopes). `GAME-DEVIATION` retained by decision: media-heat bonus envelopes and kinboshi/ginboshi minimum-banner guarantees — documented as the "fame matters" mechanic.

### 10. Non-sekitori basho compensation (場所手当・勝星金・勝ち越し金)

- **JSA rule:** teate ¥165k/¥110k/¥88k/¥77k → ¥180k/¥120k/¥95k/¥82k; win money ¥3,500/¥3,000/¥2,500/¥2,500 → ¥4,000/¥3,500/¥3,000/¥3,000; kachikoshi money ¥8,000/¥6,500/¥5,500/¥5,500 → ¥10,000/¥8,500/¥7,500/¥7,500; **absence days count in the loss column** for kachikoshi-kin.
- **Was:** teate existed (fictional doc values); win/kachikoshi money absent entirely.
- **Now:** `FIXED` — era tables + both payments + the absence-inclusive formula (`a9612c2d`, plus formula correction this pass). Verified against the published worked example: 6-1 makushita = ¥226,000 (2026) / ¥254,000 (2027).

### 11. Sanyaku basho allowance (本場所特別手当)

- **JSA rule:** Y ¥200k / O ¥150k / S-K ¥50k per basho, pro-rated by days contested (11+ full, 6–10 two-thirds, 1–5 one-third, 0 none).
- **Was:** not modeled.
- **Now:** `FIXED` — `paySanyakuBashoAllowance` with pro-rating (`a9612c2d`).

### 12. Jungyo allowances (巡業手当)

- **JSA rule:** 2027 package raises per-rank tour allowances 20–50%.
- **Now:** `GAME-DEVIATION` — flat +30% midpoint bump from 2027; documented approximation.

### 13. Fusenpai / kyujo scoring (不戦敗・休場)

- **JSA rule:** the bout scheduled on the withdrawal day is a **fusenpai loss** (opponent: fusensho win); subsequent missed days are absences. Double-absence on a scheduled bout = fusenpai loss each (両者不戦敗).
- **Was:** fusensho losers took `absences+1` in standings while career counters already counted a loss — standings/record divergence.
- **Now:** `FIXED` — fusenpai = loss in both standings paths; publish-time `absences = days − W − L` produces the real W-L-A shape (`b841c043`).

### 14. Ozeki promotion & kadoban (大関昇進・角番)

- **JSA rule:** ~33 wins over three basho at S/K; kadoban after make-koshi; **10 wins re-earns ozeki immediately** after demotion; no single-basho shortcut.
- **Was:** an 11-win single-basho promotion existed.
- **Now:** `FIXED` — shortcut removed; the two real standards retained (`c39d3e83`).

### 15. Yokozuna promotion (横綱昇進)

- **JSA rule:** two consecutive championships (or equivalent) at ozeki + YDC approval; never demotes; retirement pressure on decline.
- **Now:** `ALIGNED` — council flow, no demotion, pressure warnings all modeled.

### 16. Banzuke movement & torikumi

- **JSA rule:** banzuke committee ≈ (wins − losses)/2 rank slots; kyujo ≈ losses (no multiplier); achievements informal; makushita top-20 fast-track to juryo; joi maegashira meet sanyaku in week 1.
- **Was:** a units formula (`wins − KK − 1.4–2.5× absences + achievement units`) plus a fictional ichimon political weight (Dewanoumi +300 / Nishonoseki +250 / other +100) drove `desiredKey`.
- **Now:** `FIXED` — `banzukeCommittee.ts` runs every entry through the shared committee framework: base delta (W−L)/2 where every unfought scheduled day counts as a loss, merit evidence (yusho/sansho/kinboshi/comeback/edge) bounded by a ±2-slot discretion cap, faction only as seeded member preference. The old units formula and political weight are deleted (`322711c3`). Rule-bound logic (kadoban, 33-win/reclaim, tier ceilings via `bestTierAllowed`) stays outside deliberation. Committee votes/rationale surface as feed items. Yokozuna joi back-loading (D1–3 M4→M1, D4–7 M1→M4/K/S, D11+ Y×O, D15 Y×Y `kore_yori_sanyaku` hold, `693911e3`), rolling torikumi announcement (`postedThroughDay`: D1–2 pre-basho, rolling `D+1` Days 2–13, Senshuraku D15 held until D14 concludes, `f17f526f`), and banzuke-gai off-banzuke drops for full-absence (`0-0-7`) Jonokuchi / slot overflow with maezumo re-entry (`5175f2cc`) are all modeled.

### 17. Kimarite catalogue & distribution

- **JSA rule:** ~82 official techniques + non-technique outcomes (plus rare non-playoff draw outcomes: `mizu_iri` water break / `hikiwake` stalemate draw, `itamiwake` injury draw, `azukari` shimpan hold draw).
- **Now:** `ALIGNED` — 88 entries in `KIMARITE_REGISTRY` pinned to real sumodb shares (yorikiri 29.6%, oshidashi 16.8%), plus `DRAW_OUTCOME_METADATA` for `hikiwake` / `itamiwake` / `azukari` and `mizu_iri` water-break physics (`9e873b56`).

### 18. Bout adjudication — Article 9 (dead-body / hair-touch)

- **JSA rule (from Oct 1, 2026):** the 71-year exception saving an attacker whose topknot touched the sand first while felling the opponent was deleted — any hair on the sand first = loss.
- **Now:** `ALIGNED` — `result.hairDown` flagged on down-type finishes at real incidence (~1/2–3 basho) with `post_bout.hair_down` commentary (`8ec9336c`), and the media feed announces the amendment on its real date.

### 19. Hansoku (反則)

- **JSA rule:** disqualification — win for the opponent, no kinboshi for a maegashira beneficiary.
- **Now:** `ALIGNED` — present as an outcome; kinboshi exclusion fixed at #1.

### 20. Myoseki (名跡) & elders

- **JSA reality:** 105 elder shares; de facto loan market (owner/holder/lease). When no share is obtainable, sanyaku+ retirees may hold **jun-toshiyori** (temporary status: 5y yokozuna / 3y others); great yokozuna may receive **ichidai-toshiyori** (one-generation, non-transferable name).
- **Was:** merit issuance minted new shares beyond 105 unconditionally.
- **Now:** `FIXED` — merit minting is bounded by `MYOSEKI_TOTAL_COUNT`; exhausted pool → jun-toshiyori (expiry enforced via DynastyService → forced succession) or ichidai-toshiyori (20+ yusho yokozuna); no stock and no credential → no elder conversion (`031d9779`). (Manual previously misdescribed it as "tradable wrestling names" — corrected.)

### 21. Oyakata retirement age

- **JSA rule:** mandatory retirement at 65 (rare re-employment as _sanyo_ consultant to 70 for stockholding elders).
- **Now:** `ALIGNED` — 65 enforced in DynastyService with `elderStatus: "sanyo"` + `sanyoExpiryYear` extension to 70 across both succession paths (`b54358f7`).

### 22. Division/rank structure

- **JSA rule:** six divisions; sanyaku = yokozuna/ozeki/sekiwake/komusubi; hiramaku = maegashira; juryo+ = sekitori.
- **Now:** `ALIGNED` — including the corrected komusubi=sanyaku salary mapping (#8).

### 23. Streaks, iron-man & absence records

- **JSA convention:** W-L-A records; consecutive-appearance streaks break on any missed contest.
- **Now:** `ALIGNED` — streak/absence logic keys off derived absences post-#13.

### 24. Rule-change announcements (game infrastructure)

- **Requirement:** rule changes land on the real timeline _and_ are announced in-world.
- **Now:** `ALIGNED` — `announceJsaBulletins` emits dated one-time headlines: August 2026 (pay revision announced), October 2026 (Article-9 amendment), January 2027 (effective date).

### 25. Intai-kin / ichidai toshiyori / jun-toshiyori

- **JSA reality:** retirement lump-sum (引退金) keyed by final rank; jun-toshiyori temporary elder status; ichidai-toshiyori one-generation name for great yokozuna.
- **Now:** `FIXED` — `INTAI_KIN_*` constants credit the rank-keyed payment in `retireRikishiFully` (¥20M Y / ¥15M O / ¥7.5M S-K / ¥5M M / ¥3.5M J / ¥2.5M lower); jun-toshiyori + ichidai-toshiyori modeled per #20 (`031d9779`).

### 26. Foreign rikishi quota (post-2010)

- **JSA rule:** one foreign-slot rikishi per heya, bound at **debut** — post-debut naturalization never frees the slot; only pre-debut Japanese citizenship (dual/native) exempts. Closure/merger may stack slot-holders in the receiving stable, which then cannot recruit foreigners until they retire. Japanese citizenship is mandatory for any foreign-born retiree to stay as toshiyori.
- **Was:** tenure (`naturalized`/`citizenshipAcquiredYear`) freed the slot — the pre-2010 loophole; `RosterFactory` re-stamped overflow as "naturalized" to dodge its own cap; mergers dispersed slot-holders; no toshiyori citizenship gate.
- **Now:** `FIXED` — `countsAsForeign`/`candidateConsumesForeignSlot` bind at debut; dual/native only exempt path; whole-roster merger transfer permits the legal stacking exception; worldgen re-rolls overflow foreigners to Japanese instead of loophole-stamping; foreign-born retiree requires Japanese citizenship to convert (`c72df39e`).

### 27. Roster size & releases/transfers

- **JSA reality:** no roster cap; no releases or transfers between stables — a departed rikishi retires. Mass moves occur only on stable closure/merger.
- **Was:** `STANDARD_ROSTER_CAP 25 / MERGED_ROSTER_CAP 30 / HARD_CAP_ROSTER_SIZE 30` enforced weekly releases; released rikishi re-entered the talent pool as `priorCareer` veterans (free agency).
- **Now:** `FIXED` — caps and the overflow/release machinery deleted; `priorCareer` and the re-entry path removed; whole-roster closure/merger transfers retained as the only legal mass move (`c72df39e`). `TARGET_ROSTER_SIZE` remains as a population-planning floor, not a cap.

### 28. New-recruit eligibility & tsukedashi (新弟子検査・付け出し)

- **JSA rule:** standard recruit under 23 at the shindeshi kensa; qualified amateurs use the under-25 exception and may debut on the banzuke — makushita tsukedashi Ms60 / sandanme tsukedashi Sd80 (game keeps the classic placement numbers). Non-tsukedashi shin-deshi fight a 3-bout maezumo preliminary on Days 3/5/7 (graduating after 2 wins) and debut at the foot of the next Jonokuchi banzuke.
- **Was:** no age gate; all recruits ran maezumo into jonokuchi immediately without preliminary bouts.
- **Now:** `FIXED` — under-23 gate in `offerCandidate` (`c72df39e`); `tsukedashi` credential flag on amateur-star candidates (university → Ms60, high-school → Sd80) with the under-25 exception and maezumo skip (`031d9779`); non-tsukedashi shin-deshi fight real 3-bout maezumo preliminaries (`maezumoPrelims.ts`, `1372b7a3`) and graduate onto the foot of the next Jonokuchi banzuke.

### 29. Committee framework (番付編成会議・三賞選考・横審・理事選・力士会)

- **JSA reality:** the JSA governs through committees — banzuke composition (~23 oyakata), sansho selection (5), the YDC (~10), board elections (10-riji board), and the autonomous sekitori Rikishi-kai (力士会, chaired by the Yokozuna Kaichō).
- **Now:** `FIXED` — shared framework `engine/committee/committee.ts` + `constants/engine/committee.ts`: seeded members deliberate cases (rule-bound baseline + bounded merit/demerit/faction discretion → votes + rationale). Banzuke (#16), sansho selection, 10-riji board elections (`8ec9336c`), the YDC, and the 7-delegate Rikishi-kai sekitori council (`RikishiCouncilService.ts`) all run on it; decisions emit feed items (`322711c3`).

### 30. Ring & venue nomenclature

- **JSA reality:** dohyo radius 2.275m (4.55m is the diameter); Nagoya honbasho moved to IG Arena (post-2023 era).
- **Was:** `RING_RADIUS_METERS = 4.55` (diameter used as radius); Nagoya venue used the pre-2023 name.
- **Now:** `FIXED` — radius corrected to 2.275; venue string updated (`c72df39e`).

### 31. Lower-division odd-man scheduling safeguard

- **JSA reality:** 7 bouts; odd numbers are absorbed by cross-division cascade → maezumo pull → fusensho. The eighth bout is not used in modern honbasho.
- **Now:** `GAME-DEVIATION` retained by decision — the engine runs the real cascade first, then minted-maezumo fill, and only as a last resort a UI-labeled rare eighth make-up bout (guarantees no null pairing in a deterministic scheduler). Documented; not a candidate for removal.

---

## Era table (the July-2026 revision, effective Hatsu 2027)

| Item                               | Until Nov 2026 basho          | From Jan 2027                   |
| ---------------------------------- | ----------------------------- | ------------------------------- |
| Makuuchi yusho                     | ¥10,000,000                   | ¥20,000,000                     |
| Juryo yusho                        | ¥2,000,000                    | ¥3,000,000                      |
| Makushita yusho                    | ¥500,000                      | ¥700,000                        |
| Sandanme yusho                     | ¥300,000                      | ¥500,000                        |
| Jonidan yusho                      | ¥200,000                      | ¥300,000                        |
| Jonokuchi yusho                    | ¥100,000                      | ¥200,000                        |
| Sansho (each)                      | ¥2,000,000                    | ¥3,000,000                      |
| Salary Y / O / S-K / M / J         | 3.0 / 2.5 / 1.8 / 1.4 / 1.1 M | 3.3 / 2.75 / 2.0 / 1.55 / 1.2 M |
| Teate Mk / Sd / Jd / Jk            | 165k / 110k / 88k / 77k       | 180k / 120k / 95k / 82k         |
| Win money Mk / Sd / Jd / Jk        | 3,500 / 3,000 / 2,500 / 2,500 | 4,000 / 3,500 / 3,000 / 3,000   |
| Kachikoshi money Mk / Sd / Jd / Jk | 8,000 / 6,500 / 5,500 / 5,500 | 10,000 / 8,500 / 7,500 / 7,500  |

Implementation: `src/constants/engine/jsaEra.ts` (single source of truth; `JSA_REVISION_YEAR = 2027`).

## Fix commits

| Commit     | Contents                                                                                                                                     |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `1e11d6cc` | kinboshi hansoku exclusion; ginboshi S/K→Y extension                                                                                         |
| `0f0bfdff` | mochikyukin net-wins formula; real prize table; jun-yusho label-only                                                                         |
| `6a0a4be4` | full-real sansho (eligibility, sharing, multi-award, withholding)                                                                            |
| `3b27337f` | tomoe-sen 3-way playoff                                                                                                                      |
| `c39d3e83` | salary/kensho normalization; ozeki shortcut removal                                                                                          |
| `a9612c2d` | era-keyed economics; win/kachikoshi/sanyaku payments; jungyo bump; JSA bulletins                                                             |
| `b841c043` | fusenpai same-day loss; double-fusenpai; derived absence tail                                                                                |
| `c72df39e` | post-2010 foreign quota; no roster cap; no free agency; makuuchi-only kensho; senshuraku playoffs; debut-age gate; ring/venue strings        |
| `322711c3` | shared committee framework; banzuke committee replaces units formula + political weight; sansho/board harmonization; deliberation feed items |
| `031d9779` | tsukedashi Ms60/Sd80 + under-25 exception; myoseki 105-cap; jun-/ichidai-toshiyori; intai-kin                                                |
| `693911e3` | yokozuna joi back-loading (D1–3 M4→M1, D4–7 M1→M4/K/S, D11+ Y×O, D15 Y×Y `kore_yori_sanyaku` hold)                                           |
| `9e873b56` | `mizu_iri` water breaks + `hikiwake`, `itamiwake`, and `azukari` draw outcomes                                                               |
| `1372b7a3` | real 3-bout maezumo preliminary on Days 3/5/7 for non-tsukedashi shin-deshi + graduation onto Jonokuchi                                      |
| `5175f2cc` | banzuke-gai off-banzuke drops (full `0-0-7` Jonokuchi absence / slot overflow) + maezumo re-entry                                            |
| `f17f526f` | rolling torikumi posting cadence (`postedThroughDay`, D1–2 pre-basho, `D+1` lookahead, D15 hold on D14, withdrawal reconciliation)           |
| `4f3e24c4` | Rikishi-kai / Rikishi-ken (力士会) 7-delegate sekitori council (`RikishiCouncilService`, `RIKISHI_COUNCIL_COMMITTEE`)                        |

## Deliberate deviations retained (user-approved)

- **Ginboshi** — informal fan term modeled as a celebrated upset marker (no official award, matching its real status).
- **Kensho fame mechanics** — media-heat bonus envelopes + upset minimum banners ("fame matters").
- **Jungyo stipend** — +30% midpoint approximation of the 20–50% per-rank raise.
- **Heya economics** — per-wrestler JSA subsidy, fixed grants, oyakata salary (game construction).
- **Prestige / heat / myth scalars, Global Cup, drama matchmaking** — game-original systems.
- **Rare eighth lower-division bout** — last-resort scheduler safeguard after the real cross-division cascade and maezumo fill; UI-labeled (see #31).
- **Minted maezumo filler** — a synthetic unattached entrant minted under `MAEZUMO_MINT_CAP` when the cascade has no live maezumo pool; scheduling filler, not a recruit.
- **Banzuke committee abstraction** — seeded member preference inside a ±2-slot discretion cap stands in for real politics; deterministic, tunable via `constants/engine/committee.ts` (see #16/#29).
- **Tsukedashi placement** — classic Ms60/Sd80 slots used (real post-2019 is Ms15/Sd90); constants make it a one-line change if the era rule is preferred.
