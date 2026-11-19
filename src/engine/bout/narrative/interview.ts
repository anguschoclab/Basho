/**
 * bout/narrative/interview.ts — post-bout personality interview beat.
 * Code moved verbatim from generateBoutNarrative; split at natural seams:
 * topic selection, the per-question loop, and follow-up questions.
 */
import type { PbpPipeline } from "@/engine/bout/narrative/pipeline";
import { countMakuuchiTournaments } from "@/engine/bout/narrative/helpers";
import {
  CAREER_WIN_MILESTONES,
  FIRST_WIN_MENTION_MIN_DAY,
  INTERVIEW_CHANCE,
  MEDIA_SAVVY_POLISHED_THRESHOLD,
  STRESS_TERSE_THRESHOLD,
  TRAIT_MODIFIER_CHANCE,
} from "@/constants/engine/generation";
import {
  DEBUT_KACHI_MAX_DAY,
  EARLIEST_KACHI_LOWER_MAX_DAY,
  EARLIEST_KACHI_SEKITORI_MAX_DAY,
  NARRATIVE_MEDIA_SAVVY_CHANCE,
  NARRATIVE_STRESS_TERSE_CHANCE,
  OLDEST_KACHI_KOSHI_MIN_AGE,
} from "@/constants/engine/narrative";
import { isKachiKoshi, isMakeKoshi, kachiKoshiThreshold } from "@/engine/banzuke/banzukeHelpers";
import { isSanyakuRank } from "@/constants/engine/rankDisplay";
import { BardEngine } from "@/engine/bard/BardEngine";
import { rngFromSeed, type SeededRNG } from "@/engine/core/rng";

interface InterviewSetup {
  questionType: string;
  numQuestions: number;
}

const CAREER_PHASE_MAP: Record<string, string> = {
  "pre-peak": "career_pre_peak",
  peak: "career_peak",
  "early-decline": "career_early_decline",
  "late-decline": "career_late_decline",
  twilight: "career_twilight",
};

/** Ranks whose defeat by a rank-and-filer counts as a giant-killing. */
const GIANT_RANKS = new Set(["yokozuna", "ozeki", "sekiwake", "komusubi"]);

function selectInterviewType(p: PbpPipeline): InterviewSetup {
  const { ctx, day, loserRikishi, result, winnerLosses, winnerRikishi, winnerWins, world } = p;

  // Determine interview question type
  let questionType = "general_win";
  // Marquee results outrank the record-based questions. A kinboshi over a
  // yokozuna is the headline even when the bout ended in hansoku — the gold
  // star is what the press asks about first.
  if (result.isKinboshi) {
    questionType = "kinboshi";
  } else if (result.foulReview?.confirmed) {
    questionType = "hansoku";
  } else if (
    result.upset &&
    GIANT_RANKS.has(loserRikishi.rank) &&
    !GIANT_RANKS.has(winnerRikishi.rank)
  ) {
    questionType = "giant_killer";
  } else {
    const makuuchiTournaments = countMakuuchiTournaments(winnerRikishi.careerHistory);
  // Check for career milestone hit with this win
  const hitMilestone = CAREER_WIN_MILESTONES.includes((winnerRikishi.careerWins ?? 0) + 1);
  const loserLossesAfter = (loserRikishi.currentBashoLosses ?? 0) + 1;
  const loserWinsAfter = loserRikishi.currentBashoWins ?? 0;
  // W N — "you've now defeated two consecutive Yokozuna": back-to-back
  // sanyaku scalps is the press's first question (metrics are pre-bout, so
  // this win makes it prior+1).
  const sanyakuStreak =
    (world?.currentBasho?.boutMetrics?.[winnerRikishi.id]?.sanyakuWinStreak ?? 0) +
    (isSanyakuRank(loserRikishi.rank ?? "") ? 1 : 0);
  if (sanyakuStreak >= 2 && BardEngine.has("interview.questions.sanyaku_streak")) {
    questionType = "sanyaku_streak";
  } else if (isKachiKoshi(winnerWins + 1, winnerRikishi.currentBashoLosses ?? 0, winnerRikishi.rank)) {
    const winnerAge = result.winner === "east" ? p.eastAge : p.westAge;
    const prevOldest = world?.records?.allTime?.oldestMakuuchiKachiKoshi?.[0];
    const kkThreshold = kachiKoshiThreshold(winnerRikishi.rank);
    const earliestMaxDay =
      kkThreshold >= 8 ? EARLIEST_KACHI_SEKITORI_MAX_DAY : EARLIEST_KACHI_LOWER_MAX_DAY;
    if (
      winnerRikishi.division === "makuuchi" &&
      winnerWins + 1 === kkThreshold &&
      winnerAge >= OLDEST_KACHI_KOSHI_MIN_AGE &&
      (!prevOldest || winnerAge > prevOldest.value) &&
      BardEngine.has("interview.questions.oldest_kachi")
    ) {
      questionType = "oldest_kachi";
    } else if (
      makuuchiTournaments <= 1 &&
      day <= DEBUT_KACHI_MAX_DAY &&
      BardEngine.has("interview.questions.debut_kachikoshi")
    ) {
      questionType = "debut_kachikoshi";
    } else if (
      winnerWins + 1 === kkThreshold &&
      day <= earliestMaxDay &&
      makuuchiTournaments >= 2
    ) {
      questionType = "earliest_kachi";
    } else {
      questionType = "kachi_koshi";
    }
  } else if (hitMilestone) {
    questionType = "milestone";
  } else if (isMakeKoshi(loserWinsAfter, loserLossesAfter, loserRikishi.rank)) {
    questionType = "make_koshi";
  } else if (winnerWins === 0 && day >= FIRST_WIN_MENTION_MIN_DAY) {
    questionType = "first_win";
  } else if (
    makuuchiTournaments <= 1 &&
    winnerRikishi.rank !== "yokozuna" &&
    winnerRikishi.rank !== "ozeki"
  ) {
    questionType = "debut_win";
  } else if (result.upset) {
    questionType = "upset";
  } else if (loserLossesAfter >= 8) {
    // Loser confirmed make-koshi but didn't trigger the specific make_koshi type above
    questionType = "general_loss";
  }

  // 7-7 pressure question: winner was at 7-7 before this bout
  if (winnerWins === 7 && winnerLosses === 7 && BardEngine.has("interview.questions.seven_seven")) {
    questionType = "seven_seven";
  }
  // Weight journey question: winner has active weight journey with significant progress
  if (
    winnerRikishi.weightJourney &&
    winnerRikishi.weightJourney.progressKg >= 10 &&
    !winnerRikishi.weightJourney.stalled &&
    BardEngine.has("interview.questions.weight_journey")
  ) {
    questionType = "weight_journey";
  }
  // Career highlight question: winner has career highlights recorded
  if (
    winnerRikishi.careerHighlights &&
    winnerRikishi.careerHighlights.length > 0 &&
    BardEngine.has("interview.questions.career_highlight")
  ) {
    questionType = "career_highlight";
  }
  // Fighting name meaning question: winner has shikona conferred early
  if (
    winnerRikishi.shikonaConferredEarly &&
    BardEngine.has("interview.questions.fighting_name_meaning")
  ) {
    questionType = "fighting_name_meaning";
  }
  }

  // Career phase question (6.1): use declinePhase for phase-specific question
  const numQuestions = ctx.voiceStyle === "dramatic" ? 4 : 3;

  return { questionType, numQuestions };
}

function runInterviewLoop(p: PbpPipeline, setup: InterviewSetup): void {
  const { day, loserRikishi, push, result, seed, winnerRikishi, winnerWins } = p;
  const { questionType, numQuestions } = setup;
  const persona = winnerRikishi.pressPersona ?? "neutral";
  const personaPath = `interview.${persona}`;
  const interviewPath = BardEngine.has(personaPath) ? personaPath : "interview.neutral";
  const questionPath = `interview.questions.${questionType}`;
  const hasQuestionTemplate = BardEngine.has(questionPath);

  for (let q = 0; q < numQuestions; q++) {
    const qRng = rngFromSeed(seed, "pbp", `interview-q${q}`);
    // Question
    if (hasQuestionTemplate) {
      push(
        BardEngine.resolve(qRng, questionPath, {
          SHIKONA: winnerRikishi.shikona,
          KIMARITE: result.kimariteName ?? result.kimarite,
          OPPONENT: loserRikishi.shikona,
          OPPONENT_RANK: loserRikishi.rank ?? "",
          MILESTONE: ((winnerRikishi.careerWins ?? 0) + 1).toString(),
          WINS: (winnerWins + 1).toString(),
          DAY: day.toString(),
          AGE: (result.winner === "east" ? p.eastAge : p.westAge).toString(),
          rikishiId: winnerRikishi.id,
        }).text,
        "interview",
        ["interview"]
      );
    }
    // Answer (persona-driven)
    push(
      BardEngine.resolve(qRng, interviewPath, {
        SHIKONA: winnerRikishi.shikona,
        KIMARITE: result.kimariteName ?? result.kimarite,
        OPPONENT: loserRikishi.shikona,
        WINS: (winnerWins + 1).toString(),
        rikishiId: winnerRikishi.id,
      }).text,
      "interview",
      ["interview"]
    );

    // Trait modifier (probabilistic)
    if (winnerRikishi.personalityTraits && winnerRikishi.personalityTraits.length > 0) {
      if (qRng.next() < TRAIT_MODIFIER_CHANCE) {
        const trait =
          winnerRikishi.personalityTraits[qRng.int(0, winnerRikishi.personalityTraits.length - 1)];
        const modifierPath = `interview.modifiers.${trait}`;
        if (BardEngine.has(modifierPath)) {
          push(
            BardEngine.resolve(qRng, modifierPath, {
              SHIKONA: winnerRikishi.shikona,
              OPPONENT: loserRikishi.shikona,
              rikishiId: winnerRikishi.id,
            }).text,
            "interview",
            ["interview"]
          );
        }
      }
    }

    // Behavior stat modifiers — stress makes answers terse, mediaSavvy makes them polished
    // These are handled by selecting shorter/longer variants via RNG biasing
    const stressLevel = winnerRikishi.behavior?.stress ?? 0;
    const mediaSavvyLevel = winnerRikishi.behavior?.mediaSavvy ?? 0;
    if (stressLevel >= STRESS_TERSE_THRESHOLD && qRng.next() < NARRATIVE_STRESS_TERSE_CHANCE) {
      const tersePath = "interview.modifiers.laconic";
      if (BardEngine.has(tersePath)) {
        push(
          BardEngine.resolve(qRng, tersePath, {
            SHIKONA: winnerRikishi.shikona,
            OPPONENT: loserRikishi.shikona,
            rikishiId: winnerRikishi.id,
          }).text,
          "interview",
          ["interview"]
        );
      }
    } else if (
      mediaSavvyLevel >= MEDIA_SAVVY_POLISHED_THRESHOLD &&
      qRng.next() < NARRATIVE_MEDIA_SAVVY_CHANCE
    ) {
      // Media-savvy rikishi add a polished follow-up
      const polishedPath = "interview.modifiers.philosophical";
      if (BardEngine.has(polishedPath)) {
        push(
          BardEngine.resolve(qRng, polishedPath, {
            SHIKONA: winnerRikishi.shikona,
            OPPONENT: loserRikishi.shikona,
            rikishiId: winnerRikishi.id,
          }).text,
          "interview",
          ["interview"]
        );
      }
    }
  }
}

function askCareerPhaseQuestion(p: PbpPipeline): void {
  const { ctx, loserRikishi, push, result, seed, winnerRikishi, winnerWins } = p;
  const careerPhaseQuestion = CAREER_PHASE_MAP[ctx.careerPhase];
  const careerPhaseQuestionPath = `interview.questions.${careerPhaseQuestion}`;
  const hasCareerPhaseQuestion = careerPhaseQuestion
    ? BardEngine.has(careerPhaseQuestionPath)
    : false;
  if (!hasCareerPhaseQuestion) return;
  const persona = winnerRikishi.pressPersona ?? "neutral";
  const personaPath = `interview.${persona}`;
  const interviewPath = BardEngine.has(personaPath) ? personaPath : "interview.neutral";

  const cpRng = rngFromSeed(seed, "pbp", "interview-career-phase");
  push(
    BardEngine.resolve(cpRng, careerPhaseQuestionPath, {
      SHIKONA: winnerRikishi.shikona,
      KIMARITE: result.kimariteName ?? result.kimarite,
      OPPONENT: loserRikishi.shikona,
      WINS: (winnerWins + 1).toString(),
      rikishiId: winnerRikishi.id,
    }).text,
    "interview",
    ["interview", "career_phase"]
  );
  push(
    BardEngine.resolve(cpRng, interviewPath, {
      SHIKONA: winnerRikishi.shikona,
      KIMARITE: result.kimariteName ?? result.kimarite,
      OPPONENT: loserRikishi.shikona,
      WINS: (winnerWins + 1).toString(),
      rikishiId: winnerRikishi.id,
    }).text,
    "interview",
    ["interview", "career_phase"]
  );
}

function askRivalryQuestion(p: PbpPipeline): void {
  const { loserRikishi, pair, push, result, seed, winnerRikishi, winnerWins } = p;
  // Rivalry question (7.2): add a rivalry-specific question when meetings >= 3
  if (!pair || pair.meetings < 3) return;
  const persona = winnerRikishi.pressPersona ?? "neutral";
  const personaPath = `interview.${persona}`;
  const interviewPath = BardEngine.has(personaPath) ? personaPath : "interview.neutral";

  const rvRng = rngFromSeed(seed, "pbp", "interview-rivalry");
  push(
    BardEngine.resolve(rvRng, "interview.questions.rivalry_renewed", {
      SHIKONA: winnerRikishi.shikona,
      OPPONENT: loserRikishi.shikona,
      rikishiId: winnerRikishi.id,
    }).text,
    "interview",
    ["interview", "rivalry"]
  );
  push(
    BardEngine.resolve(rvRng, interviewPath, {
      SHIKONA: winnerRikishi.shikona,
      KIMARITE: result.kimariteName ?? result.kimarite,
      OPPONENT: loserRikishi.shikona,
      WINS: (winnerWins + 1).toString(),
      rikishiId: winnerRikishi.id,
    }).text,
    "interview",
    ["interview", "rivalry"]
  );
}

function beatInterview(p: PbpPipeline): void {
  const { seed } = p;
  // 18. Post-bout interview (personality-driven, multi-question, RNG-gated)
  const interviewRng: SeededRNG = rngFromSeed(seed, "pbp", "interview-gate");
  if (interviewRng.next() >= INTERVIEW_CHANCE) return;

  const setup = selectInterviewType(p);
  runInterviewLoop(p, setup);
  askCareerPhaseQuestion(p);
  askRivalryQuestion(p);
}

export function narrateInterview(p: PbpPipeline): void {
  beatInterview(p);
}
