/**
 * bout/narrative/postbout.ts — extracted beats from generateBoutNarrative.
 * Code moved verbatim; dependencies arrive via the shared PbpPipeline.
 */
import type { PbpPipeline } from "./pipeline";
import { CAREER_BOUT_MILESTONES, CAREER_WIN_MILESTONES } from "../../../constants/engine/generation";
import { isKachiKoshi, isMakeKoshi } from "../../banzuke/banzukeHelpers";
import { BardEngine } from "../../bard/BardEngine";

function beatPostBoutReaction(p: PbpPipeline): void {
  const { loserRikishi, postBoutRng, push, result, winnerRikishi } = p;
  // 12. Post-bout reaction
  push(
    BardEngine.resolve(postBoutRng, "post_bout.reaction", {
      WINNER: winnerRikishi.shikona,
      LOSER: loserRikishi.shikona,
      KIMARITE: result.kimariteName ?? result.kimarite,
      winnerId: winnerRikishi.id,
      loserId: loserRikishi.id,
    }).text,
    "post_bout",
    result.upset ? ["upset"] : []
  );

}

function beatPostBoutRecords(p: PbpPipeline): void {
  const { loserLosses, loserRikishi, loserWins, postBoutRng, push, winnerLosses, winnerRikishi, winnerWins } = p;
  // 12b. Post-bout records update

  push(
    BardEngine.resolve(postBoutRng, "post_bout.records.winner_improves", {
      WINNER: winnerRikishi.shikona,
      WINNER_WINS: (winnerWins + 1).toString(),
      WINNER_LOSSES: winnerLosses.toString(),
      winnerId: winnerRikishi.id,
    }).text,
    "post_bout",
    []
  );
  push(
    BardEngine.resolve(postBoutRng, "post_bout.records.loser_falls", {
      LOSER: loserRikishi.shikona,
      LOSER_WINS: loserWins.toString(),
      LOSER_LOSSES: (loserLosses + 1).toString(),
      loserId: loserRikishi.id,
    }).text,
    "post_bout",
    []
  );

}

function beatBothEven(p: PbpPipeline): void {
  const { day, loserLosses, loserRikishi, loserWins, postBoutRng, push, winnerLosses, winnerRikishi, winnerWins } = p;
  // 12c. Both even after this bout
  if (winnerWins + 1 === loserWins && winnerLosses === loserLosses + 1) {
    push(
      BardEngine.resolve(postBoutRng, "post_bout.records.both_even", {
        WINNER: winnerRikishi.shikona,
        LOSER: loserRikishi.shikona,
        WINNER_WINS: (winnerWins + 1).toString(),
        WINNER_LOSSES: winnerLosses.toString(),
        DAY: day.toString(),
        winnerId: winnerRikishi.id,
        loserId: loserRikishi.id,
      }).text,
      "post_bout",
      []
    );
  }

}

function beatPostBoutCareerImpact(p: PbpPipeline): void {
  const { bashoInfo, day, postBoutRng, push, winnerRikishi } = p;
  // 13. Post-bout career impact (milestone reached with this win)
  for (const milestone of CAREER_WIN_MILESTONES) {
    if ((winnerRikishi.careerWins ?? 0) + 1 === milestone) {
      // Check if it's also the winner's birthday for a combo line
      const isBirthday =
        bashoInfo &&
        winnerRikishi.birthMonth &&
        winnerRikishi.birthDay &&
        winnerRikishi.birthMonth === bashoInfo.month &&
        winnerRikishi.birthDay === day;
      if (isBirthday) {
        push(
          BardEngine.resolve(postBoutRng, "post_bout.birthday_milestone", {
            SHIKONA: winnerRikishi.shikona,
            MILESTONE: milestone.toString(),
            rikishiId: winnerRikishi.id,
          }).text,
          "post_bout",
          ["milestone", "birthday"]
        );
      } else {
        push(
          BardEngine.resolve(postBoutRng, "post_bout.career_milestone", {
            SHIKONA: winnerRikishi.shikona,
            MILESTONE: milestone.toString(),
            rikishiId: winnerRikishi.id,
          }).text,
          "post_bout",
          ["milestone"]
        );
      }
      break;
    }
  }

}

function beatPostBoutBoutMilestone(p: PbpPipeline): void {
  const { postBoutRng, push, winnerRikishi } = p;
  // 13b. Post-bout career bout count milestone (Gap 1)
  {
    const winnerCareerBouts = (winnerRikishi.careerWins ?? 0) + (winnerRikishi.careerLosses ?? 0);
    for (const milestone of CAREER_BOUT_MILESTONES) {
      if (winnerCareerBouts + 1 === milestone) {
        push(
          BardEngine.resolve(postBoutRng, "post_bout.career_bout_milestone", {
            SHIKONA: winnerRikishi.shikona,
            MILESTONE: milestone.toString(),
            rikishiId: winnerRikishi.id,
          }).text,
          "post_bout",
          ["milestone"]
        );
        break;
      }
    }
  }

}

function beatPostBoutKachi(p: PbpPipeline): void {
  const { bashoInfo, day, loserLosses, loserRikishi, postBoutRng, push, winnerRikishi, winnerWins } = p;
  // 14. Post-bout kachi-koshi / make-koshi confirmation
  if (isKachiKoshi(winnerWins + 1, winnerRikishi.currentBashoLosses ?? 0, winnerRikishi.rank)) {
    push(
      BardEngine.resolve(postBoutRng, "post_bout.kachi_koshi", {
        SHIKONA: winnerRikishi.shikona,
        WINS: (winnerWins + 1).toString(),
        rikishiId: winnerRikishi.id,
      }).text,
      "post_bout",
      ["kachi_koshi"]
    );

    // 14b. Consecutive kachi-koshi storyline
    const kachiStreak = winnerRikishi.consecutiveKachiKoshi ?? 0;
    if (kachiStreak >= 3) {
      const ordinals = [
        "",
        "first",
        "second",
        "third",
        "fourth",
        "fifth",
        "sixth",
        "seventh",
        "eighth",
        "ninth",
        "tenth",
      ];
      const ordinal = kachiStreak < ordinals.length ? ordinals[kachiStreak] : `${kachiStreak}th`;
      push(
        BardEngine.resolve(postBoutRng, "post_bout.storylines.consecutive_kachi", {
          SHIKONA: winnerRikishi.shikona,
          STREAK: kachiStreak.toString(),
          ORDINAL: ordinal,
          rikishiId: winnerRikishi.id,
        }).text,
        "post_bout",
        ["consecutive_kachi"]
      );
    }

    // 14c. Birthday kachi-koshi — winner gets kachi-koshi on their birthday
    if (bashoInfo && winnerRikishi.birthMonth && winnerRikishi.birthDay) {
      if (winnerRikishi.birthMonth === bashoInfo.month && winnerRikishi.birthDay === day) {
        push(
          BardEngine.resolve(postBoutRng, "post_bout.birthday_kachi", {
            SHIKONA: winnerRikishi.shikona,
            rikishiId: winnerRikishi.id,
          }).text,
          "post_bout",
          ["birthday", "kachi_koshi"]
        );
      }
    }
  }
  if (isMakeKoshi(loserRikishi.currentBashoWins ?? 0, loserLosses + 1, loserRikishi.rank)) {
    push(
      BardEngine.resolve(postBoutRng, "post_bout.make_koshi", {
        SHIKONA: loserRikishi.shikona,
        LOSSES: (loserLosses + 1).toString(),
        rikishiId: loserRikishi.id,
      }).text,
      "post_bout",
      ["make_koshi"]
    );
  }

}

export function narratePostBout(p: PbpPipeline): void {
  beatPostBoutReaction(p);
  beatPostBoutRecords(p);
  beatBothEven(p);
  beatPostBoutCareerImpact(p);
  beatPostBoutBoutMilestone(p);
  beatPostBoutKachi(p);
}
