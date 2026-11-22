# Mega-plan — Days 13–14 Kyushu transcripts (workstream Z)

Transcript source: Grand Sumo Highlights, Kyushu days 13 & 14.
**Status: EXECUTED — all Z1–Z13 shipped and verified.** Every claim below
carries a verdict (APPROVED / PARTIAL / DISPROVED / GAP) with the file
evidence that produced it. Produced via the `sumo-transcript` skill; the
day-12 transcript in the same paste is already shipped as W P (`223622ed`)
and is excluded.

## Execution log

- RED tests `88d2f8fd` — 39 tests, 23 clean feature-only failures.
- Implementation `b590b051` — all Z1–Z13 beats, tags, constants, bard
  templates, JSDoc, golden snapshot regenerated + reviewed (no MISSING).
- Verification: type-check ✓ · lint:commit ✓ · build ✓ · full suite
  1118 files / 10 624 tests ✓ · bard/token-integrity 1180 ✓ · timings
  baseline regenerated ✓ · determinism double-run byte-identical at both
  horizons (basho 23.6 MB, year 43.0 MB) ✓.
- Meta-gate fix on the way out: `selectInterviewType` exceeded the
  function-length ratchet — kachi-koshi sub-cascade extracted to
  `selectKachiKoshiType` (pure move, no behavior change).

## Residuals / deviations

- Z12 repeat-spoiler: gated on the winner NOT being a contender (existing
  spoiler rule) — a contender's repeat scalp stays silent by design.
- Z9: `prefecture_showdown_win` post-bout copy still says "prefecture" for
  foreign pairs — same residual class as the pre-bout fix; flagged in the
  audit as accepted debt (post-bout twin is a separate template family).
- Z1 template variant that fired in golden ("No title on the resume yet")
  was reworded so every variant carries the explicit "first title/yusho"
  wording the transcript calls for.

## Audit of the transcripts — Day 13

| Claim in transcript | Verdict | Evidence |
| --- | --- | --- |
| Wakamotoharu leads; Onosato/Atamifuji/Kinbozan one back | ✅ APPROVED | `beatLeaderboard` + `beatCoLeader` (`stakes.ts`), division-scoped since v20 E1 |
| Arashifuji stops a five-bout losing streak | ✅ APPROVED | `beatSkidSnapped` (`postbout.ts`), `storylines.streak_snapped` |
| Ichiyamamoto clinches kachi-koshi on day 13 | ✅ APPROVED | `beatPostBoutKachi`, `post_bout.kachi_koshi` |
| Daiseizan "already destined to go back to juryo" | ✅ APPROVED | `beatDemotionWatch` (`stakes.ts`, W P — floor maegashira + clinched make-koshi) |
| Pusher-thruster forced to the belt, "not normally his strength" | ✅ APPROVED | `thrust_to_belt` / `plan_b_grip` beats (W M/G), `grip_transition` frames |
| Both men slip, one first — slap-down finish | ✅ APPROVED | `post_bout.replay.overlean` + hatakikomi finish lines |
| Gyoji points at Kitanowaka — "no conversation" on a tight finish | ⚠️ PARTIAL → GAP | mono-ii machinery narrates conferred reviews only; `close_call` tag exists (`pbpTypes.ts:44`) but has **zero emitters** → **Z11c** |
| Kotoshoho: sat out six days, three straight wins since returning | ✅ APPROVED | `reenteredOnDay` + `beatMidBashoReturnWin`/`mid_basho_return_streak` (W P P11) |
| "A henka victory yesterday" scrutiny on today's tachiai | ✅ APPROVED | `beatPostHenkaScrutiny` (`stakes.ts`) |
| "He has a yusho to his name, experience" (former champion maegashira) | ❌ GAP | `prev.isYusho` recall covers only the immediately previous basho (`context.ts:103/126`); nothing narrates a career yusho pedigree → **Z1** (folded into title-pedigree item) |
| Hiradoumi: hand-written banners, Nagasaki fans out in number | ✅ APPROVED | `beatHometown` region tier (`stakes.ts:42-66`, geography `hometownTier`) + `beatHometownWin` |
| "Hasn't lived up to expectations — only win number three" pride win | ✅ APPROVED | `post_bout.pride_win_after_mk` |
| Grip switch mid-bout — outside to inside (Fujiseiun) | ✅ APPROVED | `makikae` tag + `grip_transition` frames (W G) |
| "Both men have beaten Yokozuna and Ozeki… but capable of losing to rank-and-filers" | ❌ GAP | `beatProvenGiantKiller` is age-capped (≤25) rookie framing (`stakes.ts`); `ELITE_SCALP_RANKS` is module-local (`postbout.ts:1475`) → **Z6c** |
| "Philippine connection for both men" (shared foreign origin) | ⚠️ PARTIAL | `beatHometown` same-origin else-branch fires `pre_bout.prefecture_showdown` for shared foreign origins — but copy says "%ORIGIN% prefecture derby" (`pre_bout.json:639`) → **Z9** |
| "Met twice, a win each" | ✅ APPROVED | `h2h.deadlock` (`prelude.ts`) |
| Asanoyama bound for sanyaku next tournament | ✅ APPROVED | `pre_bout.sanyaku_return` (`beatSanyakuArcs`) |
| "Got his favorite grip — no opposition in denying those grips" | ❌ GAP | `preferredGripSecured`/`gripSecured` stores exist; nothing narrates a loser conceding the grip → **Z7** |
| "Learned from the first time they met — denied the left-hand side" (Yoshinofuji vs Tamawashi) | ⚠️ PARTIAL → GAP | `signature_grip`/`grip_denied` cover the denial itself, not the rematch-adjustment framing ("did his homework") → **Z7 variant** |
| Churanoumi "drops out of sanyaku as quick as he came in" | ✅ APPROVED | `pre_bout.shin_sanyaku` (`beatSanyakuArcs`) |
| "Met three times before and he's won them all" | ✅ APPROVED | `beatH2HStreak` (`context.ts`) |
| Roga: "worked out how to beat him — outside grip before, inside grip in Makushita — a bit of research done" | ❌ GAP | `MatchResultLog.kimarite` supports distinct-finish detection; no such beat → **Z3** |
| Roga at "the highest rank he's ever held" (M8) | ✅ APPROVED | `beatCareerHighRank` (`context.ts`) |
| Atamifuji drops to three losses — "back in the pack" | ✅ APPROVED | `post_bout.storylines.falls_out` + `spoiler_strike` (W P) |
| "Met three times in Makushita" — first top-division meeting (Fujinokawa/Dewanoryu) | ✅ APPROVED | `MatchResultLog.division` + `beatFirstTopDivisionMeeting` (W M) |
| "Both lost yesterday, but the sumo was fantastic" | ⚠️ PARTIAL | `valiant_loser` is same-bout; prior-day valiant-loss recall not built — minor, folded into out-of-scope notes (low value) |
| Kirishima/Kinbozan "even rivalry, two and two" | ✅ APPROVED | `h2h.deadlock` |
| Kotozakura: "looked a little sloppy, not convincing, but effective" | ⚠️ PARTIAL | `comeback_win` + `phase_two` cover the mechanics; tone variant judged low-value — **skipped** |
| "Three kachi-koshi in a row for Kotozakura" | ✅ APPROVED | `beatConsecutiveKachi` ≥3 (`context.ts`) |
| Onishiki/Hoshoryu both fighting hurt; "determined to go the full 15" | ✅ APPROVED | `hurt_lower_body`/`limp_away`/`compete_credit` + W A playing-hurt |
| "A relatively rare technique, ouchi nage — the rear throw down" | ❌ GAP | `Kimarite.rarity` resolved at `kimariteRegistry.ts:94` (`rare`/`legendary` tiers) but no beat reads it → **Z2** |
| "Onishiki used this against Hoshoryu in a playoff bout last year" | ❌ GAP | `playoff_win` career highlights carry `opponent` (P3 shipped); same-kimarite-vs-opponent recall unbuilt → **Z3** |
| Yokozuna vs co-leader: tied at top 11-2 | ✅ APPROVED | `beatCoLeader`, `storylines.ties_leader` |
| "Denied Wakamotoharu any chance to get the left hand in" | ✅ APPROVED | `grip_denied` + `signature_grip` set (W M) |
| "One man has six yusho looking to go back-to-back, the other still looking for his first" | ❌ GAP | `rikishi.consecutiveYusho` (`rikishi.ts:185`) + `careerRecord.yusho` exist; no title-pedigree beats → **Z1** |
| End-of-day leaderboard recap | ✅ APPROVED | `generateDayRecapHeadline` (W K) |

## Audit of the transcripts — Day 14

| Claim in transcript | Verdict | Evidence |
| --- | --- | --- |
| Co-leaders 11-2; two chasers at three losses | ✅ APPROVED | co-leader/chase-pack beats (W P P1a) |
| "Produced his 100th career victory yesterday" (Toshonofuji) | ✅ APPROVED | `CAREER_WIN_MILESTONES` incl. 100 (`generation.ts:274`); `beatCareerWinMilestone` fires on the milestone bout (`context.ts:647`) |
| "Daiseizan's 300th career appearance" | ⚠️ PARTIAL → GAP | `CAREER_BOUT_MILESTONES = [500,700,1000,1200]` (`generation.ts:277`) — 300 absent; sole consumer `beatCareerBoutMilestone` (`context.ts:666`) → **Z4b** |
| "First kachi-koshi since March" | ✅ APPROVED | `kachi_drought` / `kachi_drought_broken` |
| Battle for kachi-koshi, both 7-6 | ✅ APPROVED | `beatBattleForKachi` + `records.championship_elimination` |
| "Taken care of him all matches this year and last, leads 6-2" | ✅ APPROVED | `h2h.domination` + `beatH2HRecentSurge` |
| "Win back-to-back and secure a double-digit report card as a 42-year-old" | ⚠️ PARTIAL → GAP | iron-man/age beats cover the age; nothing narrates the 10th win → **Z4c** |
| "Prefer opposite stances on the mawashi belt" | ❌ GAP | `preferredGrip: "migi"\|"hidari"\|"none"` (`combat.ts:17`); no mirror-pairing beat → **Z6a** |
| Kitanowaka: "very first winning record in his 50th challenge" | ✅ APPROVED | `kachi_drought`/`kachi_drought_broken` `%COUNT%` = "first winning record in N tournaments" (`post_bout.json:710`) |
| Kotoshoho extends winning streak to five since return | ✅ APPROVED | `mid_basho_return_streak` (W P) |
| Abi "at the brink of demotion" | ✅ APPROVED | `demotion_watch` |
| Hiradoumi towel series + Nagasaki crowd; "cannot afford to lose to stay in makuuchi" | ✅ APPROVED | hometown tiers + `demotion_watch` |
| Takerufuji: "went down but the opponent was out of the dohyo first" | ⚠️ PARTIAL | down-type finish escapes covered by `comeback_win`/finish lines; a judges-unmoved close call folds into **Z11c** |
| "They go on mutual consent — they don't need to wait for the gyoji's fan" | ❌ GAP | `matta` exists silently (`tachiai.ts:181-189`, `data.event:"matta"`, 5%); no mutual-consent flavor, and matta itself is **never narrated** → **Z11a/b** |
| Takayasu snaps a six-bout losing spree | ✅ APPROVED | `skid_snapped` |
| "These 28-year-olds turned pro together in March 2021" | ❌ GAP | `debutYear` field (`rikishi.ts:99`, incl. serialization backfill); no debut-cohort beat → **Z6b** |
| Kumamoto native chasing kachi-koshi before home crowd | ✅ APPROVED | hometown `region` tier + kachi stakes |
| "Gonoyama to equilibrium at 7-7, hopes pinned on senshuraku" | ✅ APPROVED | `beatSevenSeven`, `storylines.seven_seven_*` |
| Asanoyama "eight consecutive wins from day 6" | ✅ APPROVED | `week_two_surge` + streak callouts (W P) |
| "Slated for sanyaku re-promotion in January" | ✅ APPROVED | `sanyaku_return` |
| "Roga proved tenacity yesterday — handed the sekiwake his third loss" | ✅ APPROVED | `spoiler_strike` (post-bout); pre-bout recall folded into Z12's adjacent space |
| Fujiryoga "bleeding just above the right eye, seems unfazed" and wins | ⚠️ PARTIAL → GAP | `bout_injury.minor` narrates wince only (`combat.json`); no blood/fights-on variant → **Z13** (optional micro) |
| "Grabs the kachi-koshi for the fourth tournament in a row" | ✅ APPROVED | `consecutive_kachi` |
| "Collision of 33-year-olds" | ✅ APPROVED | `pre_bout.battle_of_veterans` (both ≥30) |
| "Daieisho's milestone 500th win in makuuchi" | ❌ GAP | `divisionRecords.makuuchi.wins` exists; `beatMakuuchiBoutMilestone` counts *bouts* (`stakes.ts:597`) → **Z4a** |
| "Churanoumi ready to leave sanyaku" | ✅ APPROVED | `shin_sanyaku` |
| "First time confrontation" (Yoshinofuji/Asahiryu) | ✅ APPROVED | `h2h.first_meeting` |
| "Desperate to cling to his sekiwake status — no room for setbacks" | ❌ GAP | `beatSanyakuArcs` skips current sanyaku (`stakes.ts` `isSanyakuRank → continue`); kadoban is ozeki-only (`context.ts:708`) → **Z5** |
| "Superb ring sense… looking up at the ceiling but stays in contention" | ⚠️ PARTIAL | `post_bout.replay.edge_drama` covers edge escapes — adequate; skipped |
| Wakamotoharu "ozeki scalp by the maegashira seven" | ✅ APPROVED | upset/giant_killer/elite_scalp beats |
| Onishiki: "aims to prevent kadoban" → "suffers make-koshi — will be kadoban in January" | ⚠️ PARTIAL → GAP | `beatKadobanMention` narrates *existing* kadoban only; no post-bout "entering kadoban" → **Z5** |
| Interview: "your little brother is at the top of the leaderboard in Juryo too" | ❌ GAP | `beatSiblingLead` exists as pre-bout beat (`stakes.ts`); no sibling interview type → **Z10** |
| "Kirishima could be the spoiler in back-to-back days" | ⚠️ PARTIAL → GAP | `spoiler_strike` covers single bouts; prior-day contender-scalp checkable via `r.history` → **Z12** |
| Atamifuji nearly out, wins with beltless arm throw | ✅ APPROVED | `edge_drama`/`counter` replays + `comeback_win` |
| "There's a possibility of a playoff… it's about mentality" | ✅ APPROVED | `beatPlayoffImplications` + `closing_days` interview |
| Onosato "immediately demolishes… secures inside position" | ✅ APPROVED | `quick_finish`/`control` replays + `dominant` tag |
| "Holds a 16-10 advantage ever since the two made makuuchi in 2020" | ⚠️ PARTIAL → GAP | `h2h.domination` covers the record; the joint top-division-debut bond isn't narrated → **Z6b variant** |
| "Versatile Hoshoryu" — superb sotogake, different technique | ❌ GAP | `boutMetrics.winner.kimariteUsed` distinct-count unused → **Z8** |
| Hoshoryu extends winning streak to five | ✅ APPROVED | streak callouts + `storylines.streak_continued` |
| "Fujiseiun suffers make-koshi" | ✅ APPROVED | `make_koshi` set |

## Final workstream — Z (post-validation)

**Data-availability summary:** every item derives from confirmed stores —
`Rikishi.history` (`MatchResultLog{opponentId,kimarite,win,day,bashoId,
division}`), `boutMetrics{kimariteUsed,preferredGrip{*,…}}` written for
**both** combatants (`boutResultApplier.ts:128-148`), `careerHistory`
(`isYusho`, `wins`, `rank`, `division`, `bashoName`, `year`),
`consecutiveYusho` (`rikishi.ts:185`), `careerRecord.yusho`,
`divisionRecords.makuuchi`, `ozekiKadoban`, `debutYear`, `siblingIds`,
`combatProfile.preferredGrip`, `result{gripSecured,hairDown,monoii,log}`,
`reenteredOnDay`. **No schema or physics changes required.**

### Z1 — Title-race pedigree

- `pre_bout.title_defense` — rikishi `consecutiveYusho >= 1` AND within
  `CONTENTION_WINDOW` of `getLeaderWins(basho, world, r.division)`
  ("going back-to-back"); `%YUSHO_COUNT%` from `careerRecord.yusho ?? 0`.
- `pre_bout.first_title_bid` — in-window AND `(careerRecord?.yusho ?? 0) === 0`
  ("chasing his first yusho").
- Single-rikishi contention: `isYushoContention` is a both-sides predicate —
  use `getLeaderWins` + `CONTENTION_WINDOW` directly (pattern at
  `postbout.ts:465-467`). Also covers Day-13's "he has a yusho to his
  name" former-champion flavor when `yusho >= 1` but not in contention —
  optional `former_champion` line.
- Tags: `title_stakes`, `yusho_race`. File: `stakes.ts` near `beatTitleStakes`.

### Z2 — Rare finish callout

- `post_bout.rare_technique` — `getKimarite(result.kimarite)?.rarity` ∈
  `{"rare","legendary"}` ("a relatively rare technique"). Registry resolves
  rarity at `kimariteRegistry.ts:94` via `rarityFromShare`.
- New tag `rare_technique`. File: `postbout.ts` near `beatFinishTechnique`
  aftermath (or resolution-stage line after the finish).

### Z3 — H2H finish recall

- `post_bout.deja_vu` — exists `h` in `winnerRikishi.history` with
  `h.win && !h.draw && h.opponentId === loser.id && h.kimarite ===
  result.kimarite` ("the very move that beat him before"); if a
  `careerHighlights[].type === "playoff_win"` entry names the same opponent
  → playoff-recall variant ("used this in their playoff").
- `post_bout.h2h_adaptation` — ≥2 prior wins vs this opponent spanning
  **distinct** kimarite values ("a bit of research done").
- Tags: `deja_vu`, `h2h_adaptation` (+ `rivalry`).

### Z4 — Milestones

- `pre_bout.makuuchi_win_milestone` — `divisionRecords.makuuchi.wins + 1`
  ≡ 0 mod 100 (Daieisho's 500th makuuchi win). Sibling of
  `beatMakuuchiBoutMilestone` (bouts, not wins).
- `CAREER_BOUT_MILESTONES`: add `300` (Daiseizan's 300th appearance).
  Single consumer verified (`context.ts:666-681`).
- `post_bout.double_digit` — `winnerWins + 1 === 10`; variant "first
  double-figure basho since %BASHO%" via last `careerHistory` entry with
  `wins >= 10` (skip line when previous entry already qualifies).
- Tags: `milestone`, `makuuchi_milestone` (wins variant gets own key).

### Z5 — Sanyaku jeopardy

- `pre_bout.sanyaku_retention` — `isLowerSanyakuRank(r.rank)` AND
  (`isMakeKoshi` clinched OR `losses >= 6 && day >= 10`) → "clinging to
  sanyaku status" (Fujinokawa). Verified non-overlapping with
  `beatDemotionWatch` (maegashira-only gate) and `beatSanyakuArcs`
  (skips current sanyaku).
- `post_bout.kadoban_pending` — loser `rank === "ozeki"` AND
  `isMakeKoshi(loserWins, loserLosses + 1, "ozeki")` → "will be kadoban
  in January" (Onishiki). Helpers from `@/engine/banzuke/banzukeHelpers`.
- Register `sanyaku_retention` before generic record beats;
  `kadoban_pending` before `beatPostBoutStoryline`. Tags: `sanyaku_retention`,
  `kadoban`.

### Z6 — Pairing framings (pre-bout)

- `pre_bout.mirror_grips` — `combatProfile.preferredGrip` values are
  `"migi"`/`"hidari"` and **opposite** on the two sides; require both
  non-`"none"` ("opposite stances on the belt").
- `pre_bout.same_class` — `debutYear` defined on both, equal, and
  `heyaId` differs ("turned pro together"); `top_division_class` variant
  when first `division === "makuuchi"` `careerHistory` entries share
  `bashoName`+`year` ("made the top division together"). Never fire on
  dual-undefined `debutYear`.
- `pre_bout.feast_famine` — both sides have
  `stats.achievements.kinboshiEarned + ginboshiEarned >= 1` AND neither
  holds a winning record this basho ("capable of beating the best — and
  losing to rank-and-filers"). Export `ELITE_SCALP_RANKS` from
  `postbout.ts:1475` into `helpers.ts` (or narrative constants) for reuse.
- New tags: `mirror_grips`, `same_class`, `feast_famine`.

### Z7 — Grip no-contest

- `post_bout.grip_conceded` — loser `combatProfile.preferredGrip !== "none"`
  AND `result.gripSecured[loserSide] === false` ("offered no resistance to
  the grip"); habitual variant when
  `boutMetrics[loser.id].preferredGripBouts >= 3` AND
  `preferredGripSecured === 0`.
- "Did his homework" variant when the last `winnerRikishi.history` entry vs
  this opponent is a loss (`h.opponentId === loser.id && !h.win`).
- Reuse tags `grip_denied`, `signature_grip`.

### Z8 — Versatile finisher

- `post_bout.versatile_kimarite` —
  `Object.keys(boutMetrics[winner.id].kimariteUsed).length >=
  NARRATIVE_VERSATILE_MIN` (start 4; `kimariteUsed` is winner-side only —
  `boutResultApplier.ts:99`). "A different technique every night."
- New tag `versatile_kimarite`; threshold → `constants/engine/narrative.ts`.

### Z9 — Shared foreign origin (PARTIAL fix)

- In `beatHometown`'s equal-origin else-branch (`stakes.ts:69-96`): when
  `origin ∉ PREFECTURE_REGION` (`constants/engine/geography.ts:15`), resolve
  new `pre_bout.shared_origin` instead of `prefecture_showdown` ("A %ORIGIN%
  prefecture derby" mislabels countries — "Philippine connection").
- Reuse `hometown` tag; add `shared_origin` tag if kept distinct.

### Z10 — Sibling-lead interview

- `interview.questions.sibling_lead` in `selectInterviewType`
  (`interview.ts:52+`), slotted **before** `closing_days` (more specific —
  Wakamotoharu's actual interview would currently route to `closing_days`).
- Gate: winner within `CONTENTION_WINDOW` of division lead AND a
  `siblingIds` member tops a different division's standings. Extract
  `beatSiblingLead`'s per-division-maxima loop (`stakes.ts:397-440`) into
  `helpers.ts` for reuse.

### Z11 — Tachiai ritual + clean call

- (a) `combat.phases.tachiai.matta` — narrate the existing silent
  `data.event === "matta"` log entry (`tachiai.ts:181-189`, `MATTA_CHANCE`
  5%) in `frames.ts`.
- (b) `combat.phases.tachiai` rare `mutual_consent` variant — seeded
  (~3-5%), "they don't wait for the gunbai — mutual consent." Keep behind
  `BardEngine.has` or a constants-gated chance.
- (c) `post_bout.clean_call` — `!result.monoii && result.hairDown` ("the
  judges saw no need to confer") — finally emits the dormant `close_call`
  tag (`pbpTypes.ts:44`).

### Z12 — Repeat spoiler

- `post_bout.spoiler_strike` "again" template variant — winner's most recent
  `history` entry is a win over an opponent whose `standings` wins sit
  within `CONTENTION_WINDOW` of `getLeaderWins` for that division
  ("Kirishima could be the spoiler in back-to-back days").

### Z13 — Bloodied-unfazed (optional micro)

- `combat.phases.bout_injury.minor` gains a cut/blood variant; post-bout
  line when a `bout_injury` minor log entry exists on the winner's side
  ("bloodied above the right eye, seems unfazed" — Fujiryoga).

**New `PbpTag`s (trim at implementation):** `rare_technique`,
`mirror_grips`, `same_class`, `feast_famine`, `grip_conceded`,
`versatile_kimarite`, `sanyaku_retention`, `h2h_adaptation`, `deja_vu`,
`shared_origin`. Reuse: `close_call`, `kadoban`, `title_stakes`,
`yusho_race`, `hometown`, `grip_denied`, `signature_grip`, `spoiler`,
`bout_injury`, `milestone`, `makuuchi_milestone`.

## STRICT TEST-FIRST ORDER (mandatory)

Phase A — write ALL failing tests before touching engine code, verify each
fails for the missing-feature reason, commit RED. Phase B — implement to
green. Phase C — verification battery.

### Phase A — test files (RED)

Main files: `tests/unit/engine/bout/boutNarrative.dayThirteen.test.ts` and
`boutNarrative.dayFourteen.test.ts` — harness `generateBoutNarrative` +
`makeBoutResult`/`makeBoutWorld` (`@tests/helpers/boutTestHelpers`) +
`MockFactory`, `BardEngine.resetCache()` in `beforeEach`; `trainingState`
must be a `Map`. Assertions via `r.pbpLines` filtered by tag /
`phase === "interview"` (see `boutNarrative.dayTwelve.test.ts` helpers).

Per-item matrix — **one positive-fire test plus the listed negative guards:**

| Item | Positive fire | Negative guards |
| --- | --- | --- |
| Z1 | fires on `consecutiveYusho ≥1` + in-window; on `yusho === 0` contender | no fire out-of-window; no `first_title_bid` when `careerRecord.yusho > 0`; `careerRecord` undefined tolerated |
| Z2 | fires on `rare`/`legendary` kimarite | silent on `common`/`uncommon` |
| Z3 | `deja_vu` on same-kimarite prior win; `h2h_adaptation` on ≥2 distinct | silent when no prior meetings; silent when prior wins share today's kimarite only (adaptation); draws excluded |
| Z4 | makuuchi-win round-hundred; 300 career bouts; 10th win + "first since" variant | silent off-round; `double_digit` silent at 9/11; "first since" suppressed when immediately previous basho also ≥10 |
| Z5 | `sanyaku_retention` on K/S + MK-trending; `kadoban_pending` on ozeki MK | silent for maegashira (demotion_watch's lane); silent for ozeki winner/non-MK loser |
| Z6a | fires on migi↔hidari | silent when either pref is `"none"` or both same |
| Z6b | fires on equal `debutYear`, different heya | **must not** fire on dual-undefined `debutYear` or same-heya |
| Z6c | fires when both hold elite scalps + middling records | silent when either lacks scalps or holds winning record |
| Z7 | fires when loser pref declared && unsecured | silent when `preferredGrip === "none"` or `gripSecured[loser] === true` |
| Z8 | fires at distinct-kimarite threshold | silent below threshold |
| Z9 | `shared_origin` for shared non-prefecture origin | same-prefecture pairs keep `prefecture_showdown`/`_local` unchanged |
| Z10 | `interview` line of type `sibling_lead` | absent without contender-status or without leading sibling; slot-order check vs `closing_days` |
| Z11 | `matta` line on `data.event:"matta"`; `clean_call` on `hairDown` + no monoii | `clean_call` silent when `monoii` true or `hairDown` false |
| Z12 | "again" variant when day-1 victim was in-window | base `spoiler_strike` unchanged otherwise |
| Z13 | bloodied line on winner-side minor `bout_injury` entry | silent without the log entry |

### Phase B — implementation order

constants (`narrative.ts` + `generation.ts:277`) → `PbpTag` union →
helpers (`ELITE_SCALP_RANKS` export/relocate; sibling division-max helper)
→ beats + runner registration (ordering: `sanyaku_retention` /
`kadoban_pending` and Z1 before generic record/title beats; `sibling_lead`
before `closing_days` in the interview cascade) → bard templates
(`pre_bout.json`, `post_bout.json`, `combat.json`, `interview.json` —
every token supplied; `push` drops `[MISSING:`) → `beatHometown` foreign
branch.

### Phase C — battery

`bun run type-check` · `bun run lint:commit` · `bun run build` · `bun run
test` (full fast suite) + focused `tests/unit/engine/bout/` +
`templateTokenIntegrity` · `bun run test:timings -- unit` regen ·
`boutNarrative.golden.test.ts.snap` regen **with reviewed diff** (expect
heavy churn) · determinism double-run (basho + year — mandatory:
`CAREER_BOUT_MILESTONES` changes PBP emission) · close-out commit
`feat(narrative): enrich commentary and features from Days 13–14 Kyushu
transcripts` + `megaplan.md` §1 W Z row + this file → `archive/` + §2
residuals.

## Out of scope (APPROVED — do not re-plan)

- **Entire Day-12 transcript** — shipped as W P (`223622ed`): chase_pack,
  spoiler_strike, demotion_watch, playoff_rematch, slapathon,
  valiant_loser, loser_near_miss, followup_delivered, alternating_records,
  edgeFinishBonus/edge_letdown, week_two_surge, mid_basho_return_streak,
  replay-mechanics variants, road_back/closing_days/win_streak interviews.
- W N/O sets: henka dignity/scrutiny, pull charms, hurt-lower-body,
  sibling_lead (pre-bout), mid-basho return, phase-two, H2H
  surge/giant-killer/breakthrough.
- W E/G/H/J/K/M/F: hometown tiers + prefecture_showdown, grip-transition
  PBP + one-kimarite streak, bonds (schoolmates/practice_partners), venue
  + dohyo conditions, day-recap headlines, signature-grip metrics +
  first-top-division meetings, superlatives/oldest-kachi.
- Older sets: mono-ii/foul review arc + torinaoshi, leaderboard
  (division-scoped), kachi/make-koshi stakes set, age/veteran beats,
  ozeki arcs (kadoban mention, return, yokozuna promotion),
  dream_showdown/stars_align/ozeki_bid/collapse_shadow/best_start/
  elite_scalp_streak (W Q).
- Deliberately skipped after validation: "sloppy but effective" tone
  variant (covered by comeback_win + phase_two); "new breed of rikishi"
  generational framing (no objective signal); "ring sense" replay variant
  (edge_drama adequate); prior-day valiant-loss recall (low value);
  `marketability`-driven fan-favorite line (listed as optional stretch).
