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
- **JSA rule:** 2-way = one bout; **3-way = tomoe-sen** (round-robin rotation, champion needs two consecutive wins); 4+ = single-elimination.
- **Was:** all candidate counts used single-elimination; 3-way gave an unfair bye.
- **Now:** `FIXED` — tomoe-sen implemented with full pbp/narrative (`3b27337f`).

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
- **Now:** `ALIGNED` on the money (`KENSHO_SPLIT = {cash:10k, retirement:50k, jsaFee:10k}`, fusensho→0 envelopes). `GAME-DEVIATION` retained by decision: media-heat bonus envelopes and kinboshi/ginboshi minimum-banner guarantees — documented as the "fame matters" mechanic.

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
- **JSA rule:** makushita top-20 fast-track to juryo; joi maegashira meet sanyaku in week 1.
- **Now:** `ALIGNED` — amplified top-20 promotion/dampened demotion; "San'yaku Gauntlet" phase in SwissAlgorithm.

### 17. Kimarite catalogue & distribution
- **JSA rule:** ~82 official techniques + non-technique outcomes.
- **Now:** `ALIGNED` — 88 entries, head of distribution pinned to real sumodb shares (yorikiri 29.6%, oshidashi 16.8%); long tail approximated.

### 18. Bout adjudication — Article 9 (dead-body / hair-touch)
- **JSA rule (from Oct 1, 2026):** the 71-year exception saving an attacker whose topknot touched the sand first while felling the opponent was deleted — any hair on the sand first = loss.
- **Now:** `ALIGNED by construction` — the physics resolves downed finishes by balance collapse; the deleted exception was never modeled, so no code change was needed. The media feed announces the amendment on its real date.

### 19. Hansoku (反則)
- **JSA rule:** disqualification — win for the opponent, no kinboshi for a maegashira beneficiary.
- **Now:** `ALIGNED` — present as an outcome; kinboshi exclusion fixed at #1.

### 20. Myoseki (名跡) & elders
- **JSA reality:** 105 elder shares; de facto loan market (owner/holder/lease).
- **Now:** `ALIGNED` — `MYOSEKI_TOTAL_COUNT = 105`, owner/holder/lease + asking-price + lease-fee modeling. (Manual previously misdescribed it as "tradable wrestling names" — corrected.)

### 21. Oyakata retirement age
- **JSA rule:** mandatory retirement at 65 (rare re-employment to 70).
- **Now:** `ALIGNED` — 65 enforced in DynastyService, tagged to JSA rules.

### 22. Division/rank structure
- **JSA rule:** six divisions; sanyaku = yokozuna/ozeki/sekiwake/komusubi; hiramaku = maegashira; juryo+ = sekitori.
- **Now:** `ALIGNED` — including the corrected komusubi=sanyaku salary mapping (#8).

### 23. Streaks, iron-man & absence records
- **JSA convention:** W-L-A records; consecutive-appearance streaks break on any missed contest.
- **Now:** `ALIGNED` — streak/absence logic keys off derived absences post-#13.

### 24. Rule-change announcements (game infrastructure)
- **Requirement:** rule changes land on the real timeline *and* are announced in-world.
- **Now:** `ALIGNED` — `announceJsaBulletins` emits dated one-time headlines: August 2026 (pay revision announced), October 2026 (Article-9 amendment), January 2027 (effective date).

### 25. Intai-kin / ichidai toshiyori
- **JSA reality:** retirement bonus (引退金) and one-generation elder name for great yokozuna.
- **Now:** `UNMODELED` — documented as absent; no immediate implementation planned.

---

## Era table (the July-2026 revision, effective Hatsu 2027)

| Item | Until Nov 2026 basho | From Jan 2027 |
| ---- | -------------------- | ------------- |
| Makuuchi yusho | ¥10,000,000 | ¥20,000,000 |
| Juryo yusho | ¥2,000,000 | ¥3,000,000 |
| Makushita yusho | ¥500,000 | ¥700,000 |
| Sandanme yusho | ¥300,000 | ¥500,000 |
| Jonidan yusho | ¥200,000 | ¥300,000 |
| Jonokuchi yusho | ¥100,000 | ¥200,000 |
| Sansho (each) | ¥2,000,000 | ¥3,000,000 |
| Salary Y / O / S-K / M / J | 3.0 / 2.5 / 1.8 / 1.4 / 1.1 M | 3.3 / 2.75 / 2.0 / 1.55 / 1.2 M |
| Teate Mk / Sd / Jd / Jk | 165k / 110k / 88k / 77k | 180k / 120k / 95k / 82k |
| Win money Mk / Sd / Jd / Jk | 3,500 / 3,000 / 2,500 / 2,500 | 4,000 / 3,500 / 3,000 / 3,000 |
| Kachikoshi money Mk / Sd / Jd / Jk | 8,000 / 6,500 / 5,500 / 5,500 | 10,000 / 8,500 / 7,500 / 7,500 |

Implementation: `src/constants/engine/jsaEra.ts` (single source of truth; `JSA_REVISION_YEAR = 2027`).

## Fix commits

| Commit | Contents |
| ------ | -------- |
| `1e11d6cc` | kinboshi hansoku exclusion; ginboshi S/K→Y extension |
| `0f0bfdff` | mochikyukin net-wins formula; real prize table; jun-yusho label-only |
| `6a0a4be4` | full-real sansho (eligibility, sharing, multi-award, withholding) |
| `3b27337f` | tomoe-sen 3-way playoff |
| `c39d3e83` | salary/kensho normalization; ozeki shortcut removal |
| `a9612c2d` | era-keyed economics; win/kachikoshi/sanyaku payments; jungyo bump; JSA bulletins |
| `b841c043` | fusenpai same-day loss; double-fusenpai; derived absence tail |

## Deliberate deviations retained (user-approved)

- **Ginboshi** — informal fan term modeled as a celebrated upset marker (no official award, matching its real status).
- **Kensho fame mechanics** — media-heat bonus envelopes + upset minimum banners ("fame matters").
- **Jungyo stipend** — +30% midpoint approximation of the 20–50% per-rank raise.
- **Heya economics** — per-wrestler JSA subsidy, fixed grants, oyakata salary (game construction).
- **Prestige / heat / myth scalars, Global Cup, drama matchmaking** — game-original systems.
