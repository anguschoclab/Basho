# Mega-plan — Day 12 Kyushu transcript (workstream P)

Transcript source: Grand Sumo Highlights, Kyushu day 12.
**Status: VALIDATED against codebase.** Every claim below carries a verdict
(APPROVED / PARTIAL / DISPROVED / GAP) with the file evidence that produced
it. Produced via the `sumo-transcript` skill.

## Audit of the transcript

| Claim in transcript | Verdict | Evidence |
|---|---|---|
| Mono-ii: gunbai to Abi, judges confer, "both landed simultaneously", torinaoshi rematch — second bout narrated | ✅ APPROVED | `beatMonoii` (`postbout.ts:824`), `beatFoulReviewArc` (`postbout.ts:743`), `monoiiVerdict.ts`, `applyMonoiiVerdict` re-runs the bout under a salted basho id and narrates last (`boutResolver.ts:304-349`) |
| Sole leader defended / co-leader leaderboard frames (Wakamotoharu 11-1) | ✅ APPROVED | `beatPostBoutLeaderboard` (`postbout.ts:369-431`, division-scoped since v20 E1), `beatCoLeader` (`stakes.ts:491`) |
| "One step behind" chase-pack framing | ⚠️ PARTIAL → GAP | `post_bout.storylines` keys are `sole_leader`/`ties_leader`/`falls_out` only — nothing narrates a winner staying one back of a sole leader → **P1a** |
| First-ever meetings (Takanosho/Daieisho, Oshoma/Arashifuji, Kyokukaiyu/Gonoyama) | ✅ APPROVED | `h2h.first_meeting` (`prelude.ts:77`) |
| Kachi-koshi stakes at 6-5/7-4 ("key match… 7-5 a lot better than 6-6") | ✅ APPROVED | `beatBattleForKachi` (`context.ts:224`) + O4 set (`kachi_denied`, `make_koshi_staved_off`) |
| "Three-basho make-koshi skid" (Ichiyamamoto) | ✅ APPROVED | `beatKachiDrought` (`stakes.ts:894`, `countKachiKoshiDrought` ≥ `KACHI_DROUGHT_MIN_BASHO`) + `beatKachiDroughtBroken` (`postbout.ts:244`) |
| Within-basho losing skid snapped (Roga's 7 straight ended) | ✅ APPROVED | `beatSkidSnapped` (`postbout.ts:1346`), `streak_continued`/`streak_snapped` storylines keys |
| Oldest-ever makuuchi kachi-koshi (Tamawashi, 42) | ✅ APPROVED | `beatOldestKachiRecord` (`postbout.ts:212`) + `oldest_kachi` interview (`interview.ts:88`) + HistoryDashboard card (O3) |
| 15-year age gap (Tamawashi vs Koto) | ✅ APPROVED | `beatAgeNarrative` (`context.ts:603`), `age_diff` tag |
| "Hidari-uwate machine" signature grip (Wakamotoharu) | ✅ APPROVED | `beatSignatureGrip` (`stakes.ts:732`) + `beatSignatureGripAftermath` (`postbout.ts:1138`) + `preferredGrip*` metrics |
| Back injury "feeling better" (Wakamotoharu) | ✅ APPROVED | `beatInjuryRecovery` (`context.ts:368`) |
| Lower-body pain, can't compete (Onishiki, Hoshoryu's repaired knee) | ✅ APPROVED | `beatHurtLowerBody` (`stakes.ts:363`), `beatLimpAway`/`beatCompeteCredit` (`postbout.ts:1236/1254`), playing-hurt (W A) |
| "Three straight wins since returning to action" (Kotoshoho, herniated disc) | ⚠️ PARTIAL | `beatMidBashoReturnWin` (`postbout.ts:1361`) fires `mid_basho_return_win` on return day and `mid_basho_back_to_back` **only** on `day === reenteredDay + 1` — no ≥3-wins-since-return variant → **P11** |
| Henka sidestep win ("hanka move" — Asa*) | ✅ APPROVED | tachiai henka + W N dignity/stigma + `beatPostHenkaScrutiny` (`stakes.ts:877`) |
| H2H 10-2 but loser won last two (Onosato/Kirishima) | ✅ APPROVED | `beatH2HRecentSurge` (`prelude.ts:258`) — O1, the exact case |
| "What he does after the tachiai is anyone's guess… very good followup this time" (Gonoyama) | ⚠️ PARTIAL | `beatPhaseTwo` (`postbout.ts:1271`) + `tachiaiWonButLost` metric cover the letdown — no positive conversion variant → **P7** |
| Shin-komusubi "disaster" (Churanoumi, 2-x) | ✅ APPROVED | `pre_bout.shin_sanyaku` (`stakes.ts:847`) |
| Return-to-sanyaku watch (Asanoyama — last sanyaku May 2024) | ✅ APPROVED | `pre_bout.sanyaku_return` (`stakes.ts:860`) |
| Spoiler role (Kotozakura "played the role of spoiler yesterday") | ⚠️ PARTIAL → GAP | `beatSpoiler` (`context.ts:762`) gates on **former sanyaku, currently maegashira** vs contender — a current contender-tier rikishi spoiling a leader's day has no pre-bout gate and there is no post-bout "spoiler strikes" beat → **P1b** |
| 27 prior meetings, leads 15-12 (Takayasu/Daieisho) | ✅ APPROVED | `beatMeetingMilestone` (`stakes.ts:794`, round numbers) + h2h record lines; 27 is non-milestone — correct to stay silent |
| Debutant near kachi-koshi ("fine debut 8-3" — Dewanoumi) | ✅ APPROVED | `debut_kachikoshi` interview (W N) + debut beats |
| "You've won seven consecutive bouts — how do you evaluate?" (Asanoyama) | ❌ GAP | `interview.questions` has `sanyaku_streak` (scalps only) — no generic long-win-streak question type → **P15** |
| "Daieisho will be back in juryo in January" demotion foreshadowing | ❌ GAP | Only `ozeki_demotion_comeback` exists (`context.ts:415`) — no makuuchi→juryo projection beat → **P2** |
| "Playoff clashes in January and July" (Atamifuji/Onishiki) | ❌ GAP — data confirmed | `careerHighlights[].type === "playoff_win"` carries `opponent` (`types/rikishi.ts:386`, written by `CareerHighlights.ts`) — feasible without schema change; `pair` has no playoff flag → **P3** |
| "It's a slapathon" (Takayasu/Daieisho thrust exchange) | ❌ GAP | No beat counts per-side `family:"push"` log exchanges → **P4** |
| "Fujinokawa refuses to go down… great effort by both men, crowd gives both a hand" | ❌ GAP | No loser-credit beat; derivable from `edge_crisis` entries (`data.side`/`escaped`) or `result.duration` → **P5** |
| "Dewanoumi did everything right except at the end" (Kinbozan escape win) | ⚠️ PARTIAL | `beatComebackWin` (`postbout.ts:542`) covers winner-side edge-escape; loser-sympathy variant missing → **P6** |
| "Alternated between kachikoshi and makekoshi throughout 2026" (Nishikifuji) | ❌ GAP | `beatPrevBashoRecord` (`context.ts:71`) only fires yusho/kyujo/10+-win snapshots — no alternating-pattern scan → **P8** |
| "Takerufuji's skinny calves and ankles can't finish at the edge" | ❌ GAP — flagship feature | `bodyTypeBehavior` (`types/combat.ts:49-54`) has `pushVelocityBonus`/`lateralMovementBonus`/`beltTorqueBonus`/`tachiaiSpeedBonus` — **no edge field**; `evaluateEscape` (`edgeCrisis.ts:221`) reads only defender-side `archetypeBehavior.edgeEscapeBonus` → **P9** |
| "Once in sanyaku, dropped all the way down to sandanme, now back" (Asanoyama) | ❌ GAP | `CareerSnapshot.division`/`rank` enable detection — no road-back interview type → **P10** |
| Replay mechanics analysis ("feet got left behind as his upper body leaned forward"; "slip the right arm inside, then left uwa-te"; arm-lock squeeze) | ⚠️ PARTIAL | `beatReplayHighlight` (`postbout.ts:1093`) cascade + `post_bout.replay` 11 keys exist — no mechanic-keyed variants → **P12** |
| "Started 0-3, has won five straight in the second week" (Toshinofuji) | ❌ GAP — data confirmed | `MatchResultLog.day`+`bashoId` written **per-bout** (`appendBoutLog`, `boutResultApplier.ts:239-260`) → week-slice feasible → **P13** |
| "Only three days left — what kind of sumo will you show?" | ❌ GAP | No `closing_days` question type in `interview.questions` → **P14** |
| Packed house / venue flavor (Fukuoka Kokusai Center) | ✅ APPROVED | `beatOpeningVenue` (`prelude.ts:17`) + W J dohyo conditions |
| Day-recap / broadcast note | ✅ APPROVED | `generateDayRecapHeadline` (W K) |

## Final workstream — P (post-validation)

### P1 — Yusho-race aftermath framing
1. `post_bout.storylines.chase_pack` — inside `beatPostBoutLeaderboard`:
   winner post-bout sits at `maxWins - 1` while `coLeaders === 1`
   ("stays one step behind"). Template tokens `WINNER`, `WINS`, `DAY`.
2. `post_bout.spoiler_strike` — winner is NOT in yusho contention and beat
   a `isYushoContention`-flagged loser (`boutContention.ts:35` signature
   verified: `isYushoContention(east, west, basho, world)`) — "plays
   spoiler again". Complements former-sanyaku-only `pre_bout.spoiler`.
   New `PbpTag`s: `chase_pack`, `spoiler` (or reuse `title_stakes`).

### P2 — Demotion foreshadowing
- `pre_bout.demotion_watch` — fires when a rikishi is
  `division === "makuuchi" && rank === "maegashira"` AND `rankNumber`
  at/near the makuuchi floor (derive floor from division roster;
  `rankNumber ?? 99` convention per applier) AND make-koshi clinched or
  trending (`isMakeKoshi` helper exists — `interview.ts:108`).
  Narrative-only heuristic — no real banzuke projection. New tag
  `demotion_watch`. Thresholds into `constants/engine/narrative.ts`.

### P3 — Playoff rematch H2H
- `pre_bout.playoff_rematch` — either rikishi's `careerHighlights` holds
  `type === "playoff_win"` with `opponent` === the other's id ("these two
  met in a playoff before"). prelude.ts H2H block; `playoff` tag exists.
- **Caveat:** verify `playoff_win` entries actually record `opponent` at
  write time (`CareerHighlights.ts`) — if unpopulated, item expands to
  write it at `PlayoffResolver`/highlight creation.

### P4 — Slapathon
- `post_bout.slapathon` — each side logged ≥N `data.family === "push"`
  entries (attribute via `data.attackerSide` — same derivation pattern as
  `beatPullCharm` `postbout.ts:1218-1221`). Boost when both are
  tsuppari-archetype. New tag `slapathon`; `SLAPATHON_MIN_EXCHANGES` into
  `narrative.ts`.

### P5 — Valiant loser
- `post_bout.valiant_loser` — loser survived ≥N edge crises
  (`e.phase === "edge_crisis" && e.data.side === loserSide &&
  e.data.escaped === true`) or pushed a yokozuna/higher-ranked winner deep
  (`result.duration`, seconds — `> 20` precedent at `postbout.ts:1113`).
  Loser-credit framing, not a winner beat. New tag `valiant_loser`.

### P6 — Loser sympathy
- `post_bout.loser_near_miss` — loser created ≥1 edge crisis
  (`data.side === loserSide` entries present) but lost to a late
  reversal/throw-type kimarite ("did everything right except at the end").
  Winner-side escape already covered by `beatComebackWin`. **Small —
  candidate to fold into P5.**

### P7 — Followup delivered
- `post_bout.followup_delivered` — `boutMetrics[id].tachiaiWonButLost` ≥
  threshold AND `result.tachiaiWinner === result.winner` ("very good
  followup this time"). Reads existing metric — cheap beat, no schema
  change. New tag `followup`.

### P8 — Alternating KK/MK
- `pre_bout.alternating_records` — `careerHistory` scan for ≥3 strictly
  alternating kachi-koshi (wins ≥ 8 / losses < 8) ↔ make-koshi bashos.
  New tag `alternating_records`. Helper next to
  `countKachiKoshiDrought`'s import site in stakes.ts.

### P9 — Edge-finishing body type (flagship feature)
Transcript: "My theory is that Takerufuji has such skinny calves and
ankles that he can't finish off opponents at the edge even if he has a
strong tachiai."
1. **Types:** add `edgeFinishBonus: number` to `bodyTypeBehavior`
   (`types/combat.ts:49-54`).
2. **Derivation:** at CombatProfile/body-type derivation, lanky/light
   builds get a negative finish bonus (thin lower body → weak edge
   authority), compact/heavy builds positive. Bounded, constants-driven.
3. **Physics:** `evaluateEscape` (`edgeCrisis.ts:221`) — scale
   `totalPressure` by the NON-crisis (attacker) side's
   `bodyTypeBehavior.edgeFinishBonus`. Seeded-rng path unchanged.
4. **Metric:** `boutMetrics[id].edgeFailedConversions` — count
   `edge_crisis` entries where `data.side` is the OPPONENT's side AND
   `escaped === true` (the opponent escaped MY edge push). **Must
   attribute via `data.side`** — unlike the side-blind
   `edgeCrisisSurvived` (applier:100-107 — documented quirk, do NOT
   silently change it).
5. **Beat:** `post_bout.edge_letdown` — `edgeFailedConversions` ≥ N this
   basho ("the big hit is there — he can't finish at the edge").
   New tag `edge_letdown`.

### P10 — Road-back interview
- `interview.questions.road_back` — `careerHistory` shows a sub-juryo
  `division` trough after a sanyaku stint AND winner clinches makuuchi
  kachi-koshi this bout. Slot before `kachi_koshi` in
  `selectInterviewType` (`interview.ts:77-105`), `BardEngine.has` guard.

### P11 — Return streak ≥3
- Extend `beatMidBashoReturnWin` (`postbout.ts:1361`): when
  `day > reenteredDay + 1` and `currentWinStreak` (or wins-since-
  `reenteredOnDay` count via `r.history` filtered to current `bashoId`)
  ≥ 3 → `post_bout.mid_basho_return_streak` variant ("N straight wins
  since returning"). Reuses `reenteredOnDay` (`basho.ts:393`).

### P12 — Replay-mechanics variants
- Add keyed `post_bout.replay.*` sub-paths into the
  `beatReplayHighlight` cascade (before the random pick): `overlean`
  (tsukiotoshi/hatakikomi finishes — "feet got left behind"),
  `grip_sequence` (grip_transition chains — "slip the right inside, then
  the left uwa-te"), `arm_lock` (kakenage — "squeezing the upper arms").
  Expect golden-snapshot churn — review, don't rubber-stamp.

### P13 — Week-2 turnaround
- `pre_bout.week_two_surge` — filter `r.history` to the current
  `bashoId` (`world.currentBasho.id` convention per `boutResolver.ts:286`),
  ≥4 wins among entries with `day > 7` after ≥3 losses in `day <= 7`
  entries ("started 0-3, has turned it on in the second week").
  New tag `week_two_surge`.

### P14 — Closing-days interview
- `interview.questions.closing_days` — `day >= 12` AND
  (sole/co-leader or `isYushoContention` winner) — "only N days left,
  what kind of sumo do you intend to show?".

### P15 — Win-streak interview
- `interview.questions.win_streak` — `currentWinStreak ≥
  WIN_STREAK_INTERVIEW_MIN` post-bout ("you've won N consecutive bouts —
  how do you evaluate?"). Slot after marquee types
  (kinboshi/hansoku/giant_killer), before `kachi_koshi`/generic.

**New `PbpTag`s:** `chase_pack`, `spoiler`, `demotion_watch`,
`playoff_rematch`, `slapathon`, `valiant_loser`, `loser_near_miss`,
`followup`, `alternating_records`, `edge_letdown`, `week_two_surge`
(interview types reuse the `interview` phase). Trim to the minimal set at
implementation.

## STRICT TEST-FIRST ORDER (mandatory)

Phase A — write ALL failing tests before touching engine code, verify each
fails for the missing-feature reason, commit RED. Phase B — implement to
green. Phase C — verification battery.

### Phase A — test files (RED)

| Test file | Covers | Status |
|---|---|---|
| `tests/unit/engine/bout/boutNarrative.dayTwelve.test.ts` (NEW) | P1a chase_pack only at sole-leader+1-back; P1b spoiler only non-contender-beats-contender; P2 demotion_watch makuuchi-floor only; P3 playoff_rematch via careerHighlights (+ absent when no opponent recorded); P4 slapathon ≥N both sides, silent below; P5 valiant_loser ≥N escapes / long yokozuna bout; P6 loser_near_miss; P7 followup only at metric≥threshold AND tachiai won; P8 alternating ≥3 pattern, silent on 2; P11 ≥3 return streak (day+2/+3, not just +1); P13 week_two_surge derivation; P10/P14/P15 interview question-type selection via `phase === "interview"` lines | RED |
| `tests/unit/engine/bout/boutResultApplier.streaks.test.ts` (EXTEND) or new `boutResultApplier.edge.test.ts` | P9 `edgeFailedConversions` — increments the attacker only when an opponent-side crisis `escaped === true`; zero on own escapes / non-edge bouts | RED |
| `tests/unit/engine/bout/edgeCrisis.edgeFinishBonus.test.ts` (NEW — mirror `edgeCrisis.edgeEscapeBonus.test.ts`) | P9 — `edgeFinishBonus` scales escape difficulty: positive attacker bonus lowers defender escape rate at fixed seeds; deterministic | RED |
| `tests/unit/engine/bout/boutNarrative.replay.test.ts` (EXTEND) | P12 — kimarite/log-keyed variants route to new sub-paths; cascade order preserved | RED |
| `boutNarrative.golden.test.ts.snap` | All items — regen + manual diff review | REGEN |
| `templateTokenIntegrity.test.ts` | Auto-covers new bard paths — verify new tokens pass | AFFECTED |

Harness: `generateBoutNarrative` + `makeBoutResult`/`makeBoutWorld`
(`@tests/helpers/boutTestHelpers`) + `MockFactory`;
`BardEngine.resetCache()` in `beforeEach`; `trainingState` must be a
`Map`. No subprocess / `runAutoSim` — unit tier. Non-tautological
assertions required (`weakAssertionAudit` gate).

### Phase B — implementation (to green)
Order: `constants/engine/{narrative,bout,physics}.ts` → `pbpTypes.ts` /
`types/basho.ts` / `types/combat.ts` → `boutResultApplier` metrics →
`edgeCrisis.ts` + body-type derivation (P9) → beats + stage-runner
registration → `bard/domains/{pre_bout,post_bout,interview}.json` →
`selectInterviewType` cascade.

### Phase C — verification battery
- `bun run test` fast suite; focused `tests/unit/engine/bout/` +
  `templateTokenIntegrity.test.ts`.
- `bun run test:timings -- unit` to baseline the new test files.
- `bun run type-check`, `bun run lint:commit`, `bun run build`.
- **Determinism double-run mandatory** (P9 alters physics rng
  consumption): basho + year horizons byte-identical, or document the
  intentional divergence.
- `tests/slow/...simulationInvariants` + determinism gates.
- Commit `feat(narrative): enrich commentary and features from Day 12
  Kyushu transcript`; `megaplan.md` §1 row; this file →
  `docs/plans/archive/`.

## Player/NPC parity note
P9 changes real physics — it affects every bout for any rikishi with the
derived body-type profile, player and NPC identically (deterministic
seeded path). All other items are observational beats/interviews —
symmetric by construction. No player-only paths.

## Explicitly out of scope (verified already-done)
Mono-ii/torinaoshi rematch · sole/co-leader leaderboard · first-ever
meetings · kachi-koshi battle set incl. multi-basho drought · oldest
makuuchi kachi-koshi + interview + record card · age-gap · streak
snapped/continued · signature grip · injury recovery · lower-body injury
set · playing hurt · return-day + back-to-back return wins (P11 covers
≥3 only) · henka dignity/stigma/scrutiny · H2H recent surge · phase-two
letdown (P7 adds the positive variant) · shin-sanyaku · sanyaku return ·
former-sanyaku spoiler (P1b covers the rest) · meeting milestones ·
debut kachi-koshi interview · venue/dohyo · day-recap headlines · JSA
rules · records boards · UI (no transcript-derived UI gaps found).
