---
name: sumo-transcript
description: Mine a real sumo broadcast transcript (NHK Grand Sumo Highlights etc.) for bout commentary/PBP enrichment and game-feature seeds. Use whenever a basho-day transcript is pasted or provided — extract announcer calls/storylines/interviews/judging outcomes/mechanics theories, audit each claim against the codebase (APPROVED/PARTIAL/DISPROVED with file:line evidence), and emit a validated workstream plan in the docs/plans mega-plan format.
---

# Sumo transcript → commentary enrichment + feature seeds

How real broadcast transcripts become shipped work in this repo. Proven twice:
`8473ad78` (W N — Day-10 Kyushu) and `0f5f6bef` (O1–O8 — Day-11 Kyushu). The
emitted-plan format template is `docs/plans/archive/plan-day10-kyushu.md`.

## What this produces

One pass over the transcript, two output tiers:

- **Tier 1 — commentary/PBP enrichment:** new beats, bard templates,
  interview question types, replay variants, `PbpTag`s.
- **Tier 2 — feature seeds:** physics modifiers, `boutMetrics` fields,
  records/boards, projection heuristics, NPC-readable signals, UI surfaces.

The artifact is `docs/plans/plan-day<N>-<basho>.md` — an audit table with
evidence-backed verdicts plus a lettered workstream — followed by strict
test-first implementation.

## Step 0 — Name normalization

Transcripts mangle romanization. Never match names literally — normalize to
canonical shikona before auditing. Verified mangles:

| Transcript | Canonical |
|---|---|
| Wakamoto Haru / Quakamoto Hadu | Wakamotoharu |
| Kim Bzan / Tim Bzan | Kinbozan |
| Anishki | Onishiki |
| Abby | Abi |
| Poto/Cotto Zakura | Kotozakura |
| Dewanu | Dewanoumi |
| Kyoku Caillou | Kyokukaiyu |
| Chirano Umei / Chudanoi | Churanoumi |
| Hosyu / Paul Shu | Hoshoryu |
| Ono Santo / Honosto | Onosato |
| Taku Fuji | Takerufuji |
| Hadu umi | Hiradoumi |
| Coto / Cotojo | Kotoshoho |
| Fujinoa | Fujinokawa |
| Takosho | Takanosho |
| Da Saison / Da seaison / Disho / Dio / Dao | Daieisho |
| Toshino Fuji | Toshinofuji |
| Fuji Seun / Fuji Seyun | Fujiseyun |
| Fuji Yoga / Young Fuji | Fujiryoga |
| Roga | Roga |
| Asah Hakuru | Asahakuryu |
| Ichiamoto / Ichi Yamamoto / Ichyamoto | Ichiyamamoto |
| Nishiki Fui / Ishiki Fuji | Nishikifuji |
| Uda | Uda |
| Hakuno Fuji / Hakun Fuji | Hakuofuji |
| Yoshino Fuji / Yoshuji | Yoshinofuji |
| Atami Fuji | Atamifuji |
| Arashi Fuji | Arashifuji |
| Kyoku Caillou | Kyokukaiyu |
| Gonoyama / Koyama | Gonoyama |
| Asasu | Asagyokusei/henka-user — resolve by context |
| Oshova | Oshoma |

Also normalize kimarite and jargon: "Hataki Ki"→hatakikomi,
"Hiko Toshi"→hikotoshi, "Tsukio Toshi"→tsukiotoshi,
"Yodkitti/Yori Kitty"→yorikiri, "dashi nag(e)"→uwatedashinage,
"Kag (arm lock)"→kakenage, "Oshidashi"→oshidashi, "hanka move"→henka,
"Hatutsu Yuo"→hatsu yusho, "Sanaku"→sanyaku, "Makuruchi/Makunuchi"→makuuchi,
"Mayashida/Mashida"→maegashira, "Sandame"→sandanme, "Tati"→tachiai,
"goji/gumbai"→gyoji/gunbai, "monoi"→mono-ii, "dojo/doho"→dohyo,
"Kachi Koshi/Kachoshi"→kachi-koshi, "Mak Koshi"→make-koshi.

## Step 1 — Extraction checklist (single pass)

- **Judging/outcomes:** mono-ii, torinaoshi, sashichigae, hansoku, fusensho.
- **Kimarite + analyst replays:** finish description plus the mechanics
  commentary (grip sequences, overlean, arm-lock squeeze, slap-down).
- **Storyline frames:** yusho race (sole leader / chase pack / falls out),
  kachi-koshi & make-koshi stakes at 7-x, droughts ("three-basho skid"),
  streaks (won/snapped), debuts, first meetings, H2H records + meeting
  counts, playoff rematches, rank arcs (sanyaku return, shin-sanyaku
  struggles, deep-division road back), demotion foreshadowing
  ("back in juryo in January").
- **Announcer mechanics theories** — "skinny calves can't finish at the
  edge", "what he does after the tachiai is anyone's guess", "feet got left
  behind" — these are feature seeds, not just commentary.
- **Body/age/injury:** age-gap pairings, oldest/youngest records,
  pre-existing injuries, mid-basho returns, playing hurt.
- **Interview Q&A verbatim** → `interview.questions.*` types + answer
  templates.
- **Venue/crowd/ceremony/broadcast flavor.**

## Step 2 — Audit protocol (the defining discipline)

Every extracted claim gets a verdict:

- **APPROVED** — already shipped; cite `file:line`.
- **PARTIAL** — exists but narrower/different gate; name the residual.
- **DISPROVED** — claimed gap is actually covered; drop it.

**Never assert a gap without grep evidence.** Before the pass, check
`docs/plans/megaplan.md` §1 (shipped-workstream index — the living source of
truth) and `git log --oneline | grep -i transcript` for prior transcript
workstreams.

Pre-audit greppable anchors (illustrative, not exhaustive — megaplan §1
wins): mono-ii/torinaoshi (`beatMonoii`, `beatFoulReviewArc`,
`monoiiVerdict.ts`, `applyMonoiiVerdict` rerun); leaderboard
(`beatPostBoutLeaderboard`, `beatCoLeader` — division-scoped); first
meetings (`h2h.first_meeting`, `beatFirstTopDivisionMeeting`);
`beatMeetingMilestone`; H2H streaks + `beatH2HRecentSurge` + giant-killer
H2H; signature grip (`beatSignatureGrip`, `beatSignatureGripAftermath`,
`preferredGrip*` metrics); kachi/make-koshi set (`beatBattleForKachi`,
`beatKachiDrought`+`beatKachiDroughtBroken`, `kachi_denied`,
`make_koshi_staved_off`, `beatLosingSkid`, `beatSkidSnapped`);
oldest-makuuchi-kachi-koshi (`beatOldestKachiRecord` + `oldest_kachi`
interview + HistoryDashboard card); `debut_kachikoshi`/`sanyaku_streak`
interviews; henka dignity + desperation + post-henka scrutiny +
spontaneous-henka stigma; `beatPullCharm`+`pullWins`;
`beatPhaseTwo`+`tachiaiWonButLost`; lower-body injury set
(`hurt_lower_body`/`limp_away`/`compete_credit`); mid-basho return
(`reenteredOnDay`, `mid_basho_back_to_back`); `beatSiblingLead`;
`prefecture_showdown`/`battle_of_giants`;
`thrust_to_belt`/`plan_b_grip`/`morozashi_escape`/`rank_pride`;
`shin_sanyaku`/`sanyaku_return`/`ozeki_demotion_comeback`; `beatSpoiler`
(former-sanyaku gate only); `beatAgeNarrative`/`beatBodyType`;
iron-man/oldest-division/origin-first; hometown/birthday/bonds;
`generateDayRecapHeadline`; venue/dohyo conditions.

Also grep the `PbpTag` union in `narrative/pbpTypes.ts` and the `beatX`
inventory across `narrative/{prelude,context,stakes,frames,resolution,
postbout,interview,ceremony}.ts` before proposing any new beat.

**Data-availability check** before promising a beat — confirmed stores:

- `Rikishi.history` = `MatchResultLog[]` (`opponentId`, `win`, `kimarite`,
  `bashoId`, `day`, `year`, `division`) — written **per-bout** by
  `appendBoutLog` in `boutResultApplier.ts`, so in-basho day slices work.
- `Rikishi.careerHighlights[]` — `playoff_win` entries carry `opponent`
  (verify population before relying).
- `pair` (rivalry) — `meetings`, `streak`; **no playoff flag**.
- `world.currentBasho.boutMetrics` (types/basho.ts) — `kimariteUsed`,
  `upsetCount`, `boutDurations`, `edgeCrisisSurvived`, `comebackWins`,
  `opponentTiers`, `preferredGrip{Bouts,Secured,Wins}`, `sanyakuWinStreak`,
  `tachiaiWins`, `tachiaiWonButLost`, `pullWins`, `lastHenkaDay`.
- `world.currentBasho.reenteredOnDay` — mid-basho kyujo re-entry day.
- `result.log` entries — `phase`, `data.event`, `data.side` (crisis/defender
  side), `data.attackerSide`, `data.family`, `data.escaped`.
- `result.duration` (seconds), `result.tachiaiWinner`, `result.gripSecured`.
- `CareerSnapshot` — `rank`, `division`, `rankNumber`, `wins`, `losses`;
  `rikishi.rankNumber` numeric tier (`?? 99` convention for missing).

## Step 3 — Plan authoring

Emit `docs/plans/plan-day<N>-<basho>.md`:

- Header: `Transcript source: Grand Sumo Highlights, <Basho> day <N>.` +
  `Status: VALIDATED against codebase.` line.
- Audit table: `| Claim | Verdict | Evidence |`.
- Workstream items numbered with the next unused letter (N=day-10,
  O=day-11, P=day-12 — check megaplan §1 for the sequence).
- Each item specifies: transcript quote, verdict, mechanics files, new
  `PbpTag`(s), beat function + stage file + runner-ordering slot, bard
  template path (`domain.subdomain.type` in
  `src/engine/bard/domains/*.json`) + tokens, `boutMetrics`/`types/basho.ts`
  fields, constants destination, NPC parity reads (`BoutAI.ts` /
  `phase01_basho_npc_tactics` / `resolution/tactics.ts`), and its test file.
- Player/NPC parity note + explicit out-of-scope section listing every
  APPROVED item so nobody re-plans them.

## Mechanics cheat-sheet

- **Beat anatomy:** `function beatX(p: PbpPipeline)` → guard/derive →
  `BardEngine.resolve(rng, "domain.path", { TOKENS })` →
  `p.push(text, phase, tags)`. Register in the stage runner
  (`narrateAftermath` in postbout.ts and siblings) — ordering matters:
  specific beats before generic ones they should outrank.
- **Stage files:** `prelude.ts` (opening/venue/dynasty/H2H), `context.ts`
  (career/form/records/styles/body), `stakes.ts` (pre-bout stakes/
  leaderboard), `frames.ts` (in-bout), `resolution.ts` (finish),
  `postbout.ts` (reaction/leaderboard/replay/aftermath), `interview.ts`
  (`selectInterviewType` cascade — specific before generic;
  kinboshi/hansoku/giant_killer outrank), `ceremony.ts`.
- **RNG:** `preBoutRng`/`postBoutRng`, or `rngFromSeed(seed, "pbp", "<label>")`.
  Never `Math.random`, never shared `p.rng` for a new stream (shifts all
  downstream lines).
- `push` drops text containing `[MISSING:` — supply every token;
  `BardEngine.has("path")` guards conditional paths.
- **Metrics:** `ensureMetrics` in `boutResultApplier.ts` writes
  `world.currentBasho.boutMetrics[id]` (add optional fields to
  types/basho.ts). Attribute per-rikishi via `data.side`/`data.attackerSide`
  — caution: existing `edgeCrisisSurvived` credits ALL escaped entries to
  the winner without a side check; new metrics must attribute correctly.
- **Log-derived beats** (no `BoutResult` change): filter `result.log` by
  `phase`/`data.*` — see `beatPullCharm` (family + attackerSide),
  `beatComebackWin` (edge_crisis + side + escaped), `beatMorozashiEscape`
  (grip_transition type).
- **Physics bonuses** plug into explicit sites — e.g. `evaluateEscape` in
  `physics/edgeCrisis.ts` (`totalPressure` is attacker pressure; a new
  attacker-side bonus scales it).
- **Replay variants:** `beatReplayHighlight` cascade selects
  `post_bout.replay.*` (henka > edge_drama > quick_finish > control >
  stamina_issue > size_overcame > random pick). New keyed variants slot in
  before the random pick — adding branches shifts the random pick and
  churns the golden snapshot.

## Test-first protocol (hard gate)

- **Phase A — RED:** write ALL new tests first, run the focused suite, and
  verify each fails **for the missing-feature reason** (not a harness or
  import error). Commit before any `src/` edit.
  - Main file: `tests/unit/engine/bout/boutNarrative.day<N>.test.ts` —
    harness `generateBoutNarrative` + `makeBoutResult`/`makeBoutWorld`
    (`@tests/helpers/boutTestHelpers`) + `MockFactory`,
    `BardEngine.resetCache()` in `beforeEach`; `trainingState` must be a
    `Map`. Assertions via `r.pbpLines` filtered by tag/`phase ===
    "interview"` (see `boutNarrative.dayEleven.test.ts` helpers).
  - Targeted files per area: `boutAI.*.test.ts`, `boutResultApplier.*.test.ts`,
    `edgeCrisis.*.test.ts` (precedent: `edgeCrisis.edgeEscapeBonus.test.ts`).
  - No subprocess/`runAutoSim`/`generateInitialWorld` pairing — unit tier;
    `weakAssertionAudit` requires non-tautological assertions.
- **Phase B — implement to green:** constants → types (`pbpTypes.ts`,
  `types/basho.ts`, `types/combat.ts`) → metrics/applier → physics →
  beats + runner registration → bard templates → interview cascade →
  NPC reads.
- **Phase C — battery:** `bun run type-check`, `bun run lint:commit`,
  `bun run build`, `bun run test` + focused `tests/unit/engine/bout/` +
  `templateTokenIntegrity`; `bun run test:timings -- unit` regen for new
  files; determinism double-run (basho + year) **mandatory when physics or
  metrics are touched**; slow sim gates + e2e smoke when applicable;
  `boutNarrative.golden.test.ts.snap` regen + reviewed.

## Close-out conventions

- Commit: `feat(narrative): enrich commentary and features from Day <N>
  <Basho> transcript` — one bullet per workstream item.
- On ship: add a `megaplan.md` §1 row (letter + commits + source plan),
  move the plan file to `docs/plans/archive/`, log residuals in §2.

## Anti-patterns

- Asserting a gap from memory — audit table or it didn't happen.
- Rebuilding shipped beats — run the §4 checklist first.
- Flat `standings` iteration for leader math — must be division-scoped
  (v20 E1 pin).
- Promising beats on un-stored data — run the data-availability check.
- Reading `OpponentModel` for things only `boutMetrics` carries (N7 lesson).
- Magic numbers in beats — thresholds live in
  `src/constants/engine/{narrative,bout,physics}.ts`.
- Comments claiming behavior the code doesn't implement (day-10's
  "desperate gate" comment was a lie).
- Metric attribution that ignores `data.side`.
