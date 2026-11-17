/**
 * bout/narrative/postbout.ts — extracted beats from generateBoutNarrative.
 * Code moved verbatim; dependencies arrive via the shared PbpPipeline.
 */
import type { PbpPipeline } from "@/engine/bout/narrative/pipeline";
import {
  BIRTHDAY_WINDOW_DAYS,
  CAREER_BOUT_MILESTONES,
  CAREER_WIN_MILESTONES,
  FIRST_WIN_MENTION_MIN_DAY,
  MOMENTUM_NARRATIVE_THRESHOLD,
  WEIGHT_DIFF_THRESHOLD,
} from "@/constants/engine/generation";
import { NARRATIVE_GYOJI_CONFUSED_CHANCE } from "@/constants/engine/narrative";
import { isKachiKoshi, isMakeKoshi } from "@/engine/banzuke/banzukeHelpers";
import { KINJITE_FOUL_LABELS } from "@/engine/bout/kinjite";
import { rngFromSeed } from "@/engine/core/rng";
import { BardEngine } from "@/engine/bard/BardEngine";
import { hometownTier, bashoRegionLabel } from "@/engine/basho/geography";
import type { BoutTactic } from "@/engine/types/combat";

const TACTIC_LABELS: Record<BoutTactic, string> = {
  STANDARD: "standard approach",
  YOTSU_BELT: "belt game",
  OSHI_THRUST: "thrusting attack",
  HENKA: "sidestep gambit",
  DEFENSIVE_PULL: "pull-and-counter plan",
  ALL_OUT: "all-out assault",
  NEKODAMASHI: "nekodamashi feint",
};

function beatPostBoutTacticVerdict(p: PbpPipeline): void {
  const { result, east, west, world, push, postBoutRng } = p;
  if (!result.tactics || !world.playerHeyaId) return;
  const side =
    east.heyaId === world.playerHeyaId
      ? "east"
      : west.heyaId === world.playerHeyaId
        ? "west"
        : undefined;
  if (!side) return;
  const tactic = result.tactics[side];
  if (!tactic || tactic === "STANDARD") return;
  const won = result.winner === side;
  const label = TACTIC_LABELS[tactic];
  push(
    BardEngine.resolve(
      postBoutRng,
      won ? "post_bout.tactic_verdict.success" : "post_bout.tactic_verdict.failure",
      { LABEL: label }
    ).text,
    "post_bout",
    []
  );
}

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
  const {
    loserLosses,
    loserRikishi,
    loserWins,
    postBoutRng,
    push,
    winnerLosses,
    winnerRikishi,
    winnerWins,
  } = p;
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
  const {
    day,
    loserLosses,
    loserRikishi,
    loserWins,
    postBoutRng,
    push,
    winnerLosses,
    winnerRikishi,
    winnerWins,
  } = p;
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
  const {
    bashoInfo,
    day,
    loserLosses,
    loserRikishi,
    postBoutRng,
    push,
    winnerRikishi,
    winnerWins,
  } = p;
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
  beatPostBoutTacticVerdict(p);
  beatPostBoutReaction(p);
  beatPostBoutRecords(p);
  beatBothEven(p);
  beatPostBoutCareerImpact(p);
  beatPostBoutBoutMilestone(p);
  beatPostBoutKachi(p);
}

function beatPostBoutYushoRace(p: PbpPipeline): void {
  const { postBoutRng, push, result, winnerRikishi, winnerWins } = p;
  // 15. Post-bout yusho race update
  if (result.isYushoRace) {
    push(
      BardEngine.resolve(postBoutRng, "post_bout.yusho_race", {
        WINNER: winnerRikishi.shikona,
        WINS: (winnerWins + 1).toString(),
        winnerId: winnerRikishi.id,
      }).text,
      "post_bout",
      ["yusho_race"]
    );
  }
}

function beatPostBoutLeaderboard(p: PbpPipeline): void {
  const { day, loserRikishi, loserWins, postBoutRng, push, winnerRikishi, winnerWins, world } = p;
  // 15a. Post-bout leaderboard update — sole leader, falls out, ties leader
  if (world.currentBasho && day >= 5) {
    const standings = world.currentBasho.standings;
    let maxWins = 0;
    let coLeaders = 0;
    let preBoutMaxWins = 0;
    for (const [rid, rec] of standings) {
      const preW =
        rid === winnerRikishi.id ? winnerWins : rid === loserRikishi.id ? loserWins : rec.wins;
      if (preW > preBoutMaxWins) preBoutMaxWins = preW;
      const w =
        rid === winnerRikishi.id ? winnerWins + 1 : rid === loserRikishi.id ? loserWins : rec.wins;
      if (w > maxWins) {
        maxWins = w;
        coLeaders = 1;
      } else if (w === maxWins) {
        coLeaders++;
      }
    }
    // Winner is now sole leader
    if (winnerWins + 1 === maxWins && coLeaders === 1) {
      push(
        BardEngine.resolve(postBoutRng, "post_bout.storylines.sole_leader", {
          WINNER: winnerRikishi.shikona,
          DAY: day.toString(),
          winnerId: winnerRikishi.id,
        }).text,
        "post_bout",
        ["yusho_race"]
      );
    }
    // Winner ties the leader
    if (
      winnerWins + 1 === maxWins &&
      coLeaders > 1 &&
      winnerWins + 1 > (standings.get(winnerRikishi.id)?.wins ?? 0)
    ) {
      push(
        BardEngine.resolve(postBoutRng, "post_bout.storylines.ties_leader", {
          WINNER: winnerRikishi.shikona,
          winnerId: winnerRikishi.id,
        }).text,
        "post_bout",
        ["yusho_race"]
      );
    }
    // Loser falls out of co-leadership
    const loserPrevWins = standings.get(loserRikishi.id)?.wins ?? loserWins;
    if (loserPrevWins === preBoutMaxWins && winnerWins + 1 > preBoutMaxWins) {
      push(
        BardEngine.resolve(postBoutRng, "post_bout.storylines.falls_out", {
          LOSER: loserRikishi.shikona,
          loserId: loserRikishi.id,
        }).text,
        "post_bout",
        ["yusho_race"]
      );
    }
  }
}

function beatPostBoutStoryline(p: PbpPipeline): void {
  const {
    day,
    loserLosses,
    loserRikishi,
    loserWins,
    postBoutRng,
    push,
    winnerLosses,
    winnerRikishi,
    winnerWins,
  } = p;
  // 15b. Post-bout storyline: streaks, first win, sole leader
  const winnerWinStreak = winnerRikishi.currentWinStreak ?? 0;
  const loserWinStreak = loserRikishi.currentWinStreak ?? 0;
  const loserLossStreak = loserRikishi.currentLossStreak ?? 0;
  // Winning streak continued
  if (winnerWinStreak >= 3) {
    push(
      BardEngine.resolve(postBoutRng, "post_bout.storylines.streak_continued", {
        WINNER: winnerRikishi.shikona,
        STREAK: (winnerWinStreak + 1).toString(),
        winnerId: winnerRikishi.id,
      }).text,
      "post_bout",
      ["streak"]
    );
  }
  // Losing streak snapped (loser had a winning streak before this)
  if (loserWinStreak >= 3) {
    push(
      BardEngine.resolve(postBoutRng, "post_bout.storylines.streak_snapped", {
        WINNER: winnerRikishi.shikona,
        LOSER: loserRikishi.shikona,
        STREAK: loserWinStreak.toString(),
        winnerId: winnerRikishi.id,
        loserId: loserRikishi.id,
      }).text,
      "post_bout",
      ["streak"]
    );
  }
  // Losing streak continued
  if (loserLossStreak + 1 >= 3 && loserWins === 0) {
    push(
      BardEngine.resolve(postBoutRng, "post_bout.storylines.loss_streak", {
        LOSER: loserRikishi.shikona,
        STREAK: (loserLossStreak + 1).toString(),
        loserId: loserRikishi.id,
      }).text,
      "post_bout",
      ["winless"]
    );
  }
  // First win
  if (winnerWins === 0 && day >= FIRST_WIN_MENTION_MIN_DAY) {
    push(
      BardEngine.resolve(postBoutRng, "post_bout.storylines.first_win", {
        WINNER: winnerRikishi.shikona,
        winnerId: winnerRikishi.id,
      }).text,
      "post_bout",
      ["first_win"]
    );
  }

  // 15b2. 7-7 pressure result — winner was at 7-7 and got kachi-koshi
  if (winnerWins === 7 && winnerLosses === 7) {
    push(
      BardEngine.resolve(postBoutRng, "post_bout.storylines.seven_seven_win", {
        WINNER: winnerRikishi.shikona,
        winnerId: winnerRikishi.id,
      }).text,
      "post_bout",
      ["title_stakes"]
    );
  }
  // 7-7 pressure result — loser was at 7-7 and fell to make-koshi
  if (loserWins === 7 && loserLosses === 7) {
    push(
      BardEngine.resolve(postBoutRng, "post_bout.storylines.seven_seven_loss", {
        LOSER: loserRikishi.shikona,
        loserId: loserRikishi.id,
      }).text,
      "post_bout",
      ["title_stakes"]
    );
  }
}

function beatPostBoutUpset(p: PbpPipeline): void {
  const { day, loserRikishi, postBoutRng, push, result, winnerRikishi } = p;
  // 15c. Post-bout upset over elite — maegashira beats yokozuna/ozeki
  if (result.upset && result.isKinboshi) {
    push(
      BardEngine.resolve(postBoutRng, "post_bout.storylines.upset_elite", {
        WINNER: winnerRikishi.shikona,
        LOSER: loserRikishi.shikona,
        LOSER_RANK: loserRikishi.rank ?? "",
        DAY: day.toString(),
        winnerId: winnerRikishi.id,
        loserId: loserRikishi.id,
      }).text,
      "post_bout",
      ["upset"]
    );
  }
}

function beatComebackWin(p: PbpPipeline): void {
  const { loserRikishi, postBoutRng, push, result, winnerRikishi } = p;
  // 15c2. Comeback win narrative (Gap 5): winner escaped edge crisis during bout
  const winnerHadEdgeCrisisEscape = result.log.some(
    (entry) =>
      entry.phase === "edge_crisis" &&
      entry.data?.escaped === true &&
      entry.data?.side === result.winner
  );
  if (winnerHadEdgeCrisisEscape) {
    push(
      BardEngine.resolve(postBoutRng, "post_bout.comeback_win", {
        WINNER: winnerRikishi.shikona,
        LOSER: loserRikishi.shikona,
        winnerId: winnerRikishi.id,
        loserId: loserRikishi.id,
      }).text,
      "post_bout",
      ["comeback"]
    );
  }
}

function beatPostBoutRivalry(p: PbpPipeline): void {
  const { east, loserRikishi, pair, postBoutRng, push, result, west, winnerRikishi } = p;
  // 15d. Post-bout rivalry result (7.2): narrative about series implications
  if (pair && pair.meetings >= 1) {
    const aIsEast = pair.aId === east.id;
    const eastWinsBefore = aIsEast ? pair.aWins : pair.bWins;
    const westWinsBefore = aIsEast ? pair.bWins : pair.aWins;
    const winnerIsEast = result.winner === "east";
    const newEastWins = eastWinsBefore + (winnerIsEast ? 1 : 0);
    const newWestWins = westWinsBefore + (winnerIsEast ? 0 : 1);
    const totalAfter = newEastWins + newWestWins;

    if (totalAfter >= 2) {
      const winnerShikona = winnerIsEast ? east.shikona : west.shikona;
      const loserShikona = winnerIsEast ? west.shikona : east.shikona;
      const winnerNewWins = winnerIsEast ? newEastWins : newWestWins;
      const loserNewWins = winnerIsEast ? newWestWins : newEastWins;
      const diff = Math.abs(newEastWins - newWestWins);

      let rivalryPath: string;
      if (diff >= 3) {
        rivalryPath = "post_bout.rivalry.domination";
      } else if (winnerNewWins === loserNewWins) {
        rivalryPath = "post_bout.rivalry.evened";
      } else if (loserNewWins > 0 && winnerNewWins === loserNewWins + 1 && loserNewWins >= 1) {
        rivalryPath = "post_bout.rivalry.revenge";
      } else {
        rivalryPath = "post_bout.rivalry.continued";
      }

      push(
        BardEngine.resolve(postBoutRng, rivalryPath, {
          WINNER: winnerShikona,
          LOSER: loserShikona,
          WINNER_WINS: winnerNewWins.toString(),
          LOSER_WINS: loserNewWins.toString(),
          TOTAL: totalAfter.toString(),
          winnerId: winnerRikishi.id,
          loserId: loserRikishi.id,
        }).text,
        "post_bout",
        ["rivalry"]
      );
    }
  }
}

function beatKenshoEconomic(p: PbpPipeline): void {
  const { postBoutRng, push, result, winnerRikishi } = p;
  // 15e. Kensho & economic context (7.3): mention sponsor envelopes when awarded
  if (result.kenshoEnvelopes > 0) {
    const kenshoPath = result.upset ? "post_bout.kensho_upset" : "post_bout.kensho";
    push(
      BardEngine.resolve(postBoutRng, kenshoPath, {
        WINNER: winnerRikishi.shikona,
        ENVELOPES: result.kenshoEnvelopes.toString(),
        winnerId: winnerRikishi.id,
      }).text,
      "post_bout",
      ["kensho"]
    );
  }
}

function beatAgeDecline(p: PbpPipeline): void {
  const { loserRikishi, postBoutRng, push, winnerRikishi } = p;
  // 15f. Age-based decline narrative (6.4): father time / defying age
  {
    const loserDecline = loserRikishi.declinePhase;
    const winnerDecline = winnerRikishi.declinePhase;

    // Father time: loser is in decline phase — use specific template if available
    if (
      loserDecline === "early-decline" ||
      loserDecline === "late-decline" ||
      loserDecline === "twilight"
    ) {
      const declinePath = `post_bout.${loserDecline.replace("-", "_")}`;
      if (BardEngine.has(declinePath)) {
        push(
          BardEngine.resolve(postBoutRng, declinePath, {
            LOSER: loserRikishi.shikona,
            loserId: loserRikishi.id,
          }).text,
          "post_bout",
          ["veteran"]
        );
      } else {
        push(
          BardEngine.resolve(postBoutRng, "post_bout.father_time", {
            LOSER: loserRikishi.shikona,
            loserId: loserRikishi.id,
          }).text,
          "post_bout",
          ["veteran"]
        );
      }
    }

    // Defying age: winner is in late-decline or twilight
    if (winnerDecline === "late-decline" || winnerDecline === "twilight") {
      push(
        BardEngine.resolve(postBoutRng, "post_bout.defying_age", {
          WINNER: winnerRikishi.shikona,
          winnerId: winnerRikishi.id,
        }).text,
        "post_bout",
        ["veteran"]
      );
    }
  }
}

function beatPostBoutInjury(p: PbpPipeline): void {
  const { east, postBoutRng, push, result, west } = p;
  // 15g. Post-bout injury assessment (6.3)
  if (result.inBoutInjury) {
    const injuredRikishi = result.inBoutInjury.rikishiId === east.id ? east : west;
    const severity = result.inBoutInjury.severity;
    const area = String(result.inBoutInjury.area);
    if (BardEngine.has(`post_bout.injury_assessment.${severity}`)) {
      push(
        BardEngine.resolve(postBoutRng, `post_bout.injury_assessment.${severity}`, {
          SHIKONA: injuredRikishi.shikona,
          AREA: area,
          SEVERITY: severity,
          rikishiId: injuredRikishi.id,
        }).text,
        "post_bout",
        ["injury"]
      );
    }

    // 15g-2. Injury-to-kyujo warning narrative thread (Gap 8)
    // When in-bout injury is moderate or worse, warn about potential kyujo
    if (severity === "moderate" || severity === "serious") {
      push(
        BardEngine.resolve(postBoutRng, "post_bout.injury_kyujo_warning", {
          SHIKONA: injuredRikishi.shikona,
          AREA: area,
          rikishiId: injuredRikishi.id,
        }).text,
        "post_bout",
        ["injury"]
      );
    }
  }
}

function beatMomentumScore(p: PbpPipeline): void {
  const { east, postBoutRng, push, result, west } = p;
  // 15h. Momentum score narrative (Gap 7)
  // Highlight dominant momentum when the score exceeds the threshold
  if (Math.abs(result.momentumScore) >= MOMENTUM_NARRATIVE_THRESHOLD) {
    const dominantSide = result.momentumScore > 0 ? "east" : "west";
    const dominantRikishi = dominantSide === "east" ? east : west;
    const losingRikishi = dominantSide === "east" ? west : east;
    push(
      BardEngine.resolve(postBoutRng, "post_bout.momentum_shift", {
        DOMINANT: dominantRikishi.shikona,
        LOSER: losingRikishi.shikona,
        dominantId: dominantRikishi.id,
        loserId: losingRikishi.id,
      }).text,
      "post_bout",
      ["momentum_shift"]
    );
  }
}

function beatFoulReviewArc(p: PbpPipeline): void {
  const { east, loserRikishi, push, result, seed, west, winnerRikishi } = p;
  const review = result.foulReview;
  if (!review) return;
  const monoiiRng = rngFromSeed(seed, "pbp", "mono-ii");
  // Suspect/victim come from the review record — NOT the winner/loser.
  // A cleared suspect is still the winner; a confirmed suspect is the loser.
  const suspect = review.suspectRikishiId === east.id ? east : west;
  const victim = review.victimRikishiId === east.id ? east : west;
  // The gunbai went to the apparent winner before the judges stepped in —
  // the narrative replays the original call, then the review arc.
  push(
    BardEngine.resolve(monoiiRng, "post_bout.mono_ii.foul_suspected", {
      WINNER: winnerRikishi.shikona,
      LOSER: loserRikishi.shikona,
      SUSPECT: suspect.shikona,
      VICTIM: victim.shikona,
      FOUL: KINJITE_FOUL_LABELS[review.foul],
      APPARENT_KIMARITE: review.apparentKimarite,
      winnerId: winnerRikishi.id,
      loserId: loserRikishi.id,
      suspectId: suspect.id,
      victimId: victim.id,
    }).text,
    "mono_ii",
    ["drama", "mono_ii", "foul"]
  );
  push(
    BardEngine.resolve(monoiiRng, "post_bout.mono_ii.foul_review", {
      WINNER: winnerRikishi.shikona,
      LOSER: loserRikishi.shikona,
      SUSPECT: suspect.shikona,
      VICTIM: victim.shikona,
      FOUL: KINJITE_FOUL_LABELS[review.foul],
      APPARENT_KIMARITE: review.apparentKimarite,
      winnerId: winnerRikishi.id,
      loserId: loserRikishi.id,
      suspectId: suspect.id,
      victimId: victim.id,
    }).text,
    "mono_ii",
    ["drama", "mono_ii", "foul"]
  );
  push(
    BardEngine.resolve(monoiiRng, "post_bout.mono_ii.foul_replay", {
      WINNER: winnerRikishi.shikona,
      LOSER: loserRikishi.shikona,
      SUSPECT: suspect.shikona,
      VICTIM: victim.shikona,
      FOUL: KINJITE_FOUL_LABELS[review.foul],
      APPARENT_KIMARITE: review.apparentKimarite,
      winnerId: winnerRikishi.id,
      loserId: loserRikishi.id,
      suspectId: suspect.id,
      victimId: victim.id,
    }).text,
    "mono_ii",
    ["drama", "mono_ii", "foul"]
  );
  push(
    BardEngine.resolve(
      monoiiRng,
      review.confirmed ? "post_bout.mono_ii.foul_confirmed" : "post_bout.mono_ii.foul_cleared",
      {
        WINNER: winnerRikishi.shikona,
        LOSER: loserRikishi.shikona,
        SUSPECT: suspect.shikona,
        VICTIM: victim.shikona,
        FOUL: KINJITE_FOUL_LABELS[review.foul],
        APPARENT_KIMARITE: review.apparentKimarite,
        winnerId: winnerRikishi.id,
        loserId: loserRikishi.id,
        suspectId: suspect.id,
        victimId: victim.id,
      }
    ).text,
    "mono_ii",
    ["drama", "mono_ii", "foul"]
  );
}

function beatMonoii(p: PbpPipeline): void {
  const { east, loserRikishi, push, result, seed, west, winnerRikishi } = p;
  // 16. Mono-ii (judge consultation) — expanded sub-paths
  if (result.monoii) {
    // A foul review has its own dedicated arc — the judges convened over a
    // suspected kinjite, not a photo-finish.
    if (result.foulReview) {
      beatFoulReviewArc(p);
      return;
    }
    const monoiiRng = rngFromSeed(seed, "pbp", "mono-ii");
    // The gunbai went to the APPARENT winner — after a sashichigae that is
    // the eventual loser. Narrate the call as it was made.
    const gunbaiWinner =
      result.apparentWinner != null
        ? result.apparentWinner === "east"
          ? east
          : west
        : winnerRikishi;
    const gunbaiLoser =
      result.apparentWinner != null
        ? result.apparentWinner === "east"
          ? west
          : east
        : loserRikishi;
    // Initial gunbai call — contested
    push(
      BardEngine.resolve(monoiiRng, "post_bout.mono_ii.gunbai_contested", {
        WINNER: gunbaiWinner.shikona,
        LOSER: gunbaiLoser.shikona,
        winnerId: gunbaiWinner.id,
        loserId: gunbaiLoser.id,
      }).text,
      "mono_ii",
      ["drama", "mono_ii"]
    );
    // A proactive panel catch — the judges stopped it before the result
    // was even announced.
    if (result.monoiiKind === "missed_call") {
      push(
        BardEngine.resolve(monoiiRng, "post_bout.mono_ii.missed_call", {
          WINNER: gunbaiWinner.shikona,
          LOSER: gunbaiLoser.shikona,
          winnerId: gunbaiWinner.id,
          loserId: gunbaiLoser.id,
        }).text,
        "mono_ii",
        ["drama", "mono_ii"]
      );
    }
    // Gyoji confusion — only when the call didn't stand: an upheld decision
    // means the gyoji was right (V16-B47: previously rolled independently of
    // the actual outcome).
    if (result.monoiiOutcome !== "upheld" && monoiiRng.next() < NARRATIVE_GYOJI_CONFUSED_CHANCE) {
      push(
        BardEngine.resolve(monoiiRng, "post_bout.mono_ii.gyoji_confused", {
          WINNER: winnerRikishi.shikona,
          LOSER: loserRikishi.shikona,
          winnerId: winnerRikishi.id,
          loserId: loserRikishi.id,
        }).text,
        "mono_ii",
        ["drama", "mono_ii"]
      );
    }
    // Judges convene
    push(
      BardEngine.resolve(monoiiRng, "post_bout.mono_ii.review", {
        WINNER: winnerRikishi.shikona,
        LOSER: loserRikishi.shikona,
        winnerId: winnerRikishi.id,
        loserId: loserRikishi.id,
      }).text,
      "mono_ii",
      ["drama", "mono_ii"]
    );
    // Replay analysis
    push(
      BardEngine.resolve(monoiiRng, "post_bout.mono_ii.replay_analysis", {
        WINNER: winnerRikishi.shikona,
        LOSER: loserRikishi.shikona,
        winnerId: winnerRikishi.id,
        loserId: loserRikishi.id,
      }).text,
      "mono_ii",
      ["drama", "mono_ii"]
    );
    // Outcome: announce the RECORDED outcome (monoiiOutcome is resolved by
    // applyGyojiOfficiation before narrative generation — V18-O1). No
    // panelable pool → outcome stays undefined → the call stands.
    const outcome = result.monoiiOutcome ?? "upheld";
    if (outcome === "reversed") {
      // Call reversed — judges determine the loser actually touched first
      push(
        BardEngine.resolve(monoiiRng, "post_bout.mono_ii.call_reversed", {
          WINNER: winnerRikishi.shikona,
          LOSER: loserRikishi.shikona,
          winnerId: winnerRikishi.id,
          loserId: loserRikishi.id,
        }).text,
        "mono_ii",
        ["drama"]
      );
    } else if (outcome === "rematch") {
      // Too close to call — rematch ordered
      push(
        BardEngine.resolve(monoiiRng, "post_bout.mono_ii.rematch_ordered", {
          WINNER: winnerRikishi.shikona,
          LOSER: loserRikishi.shikona,
          winnerId: winnerRikishi.id,
          loserId: loserRikishi.id,
        }).text,
        "mono_ii",
        ["drama"]
      );
      // The torinaoshi actually happened — recap how the rematch ended.
      if (result.isTorinaoshi) {
        push(
          BardEngine.resolve(monoiiRng, "post_bout.mono_ii.torinaoshi_recap", {
            WINNER: winnerRikishi.shikona,
            LOSER: loserRikishi.shikona,
            KIMARITE: result.kimariteName,
            winnerId: winnerRikishi.id,
            loserId: loserRikishi.id,
          }).text,
          "mono_ii",
          ["drama"]
        );
      }
    } else {
      // Call upheld — original decision stands
      push(
        BardEngine.resolve(monoiiRng, "post_bout.mono_ii.call_upheld", {
          WINNER: winnerRikishi.shikona,
          LOSER: loserRikishi.shikona,
          winnerId: winnerRikishi.id,
          loserId: loserRikishi.id,
        }).text,
        "mono_ii",
        ["drama"]
      );
    }
  }
}

function beatHansokuPenalty(p: PbpPipeline): void {
  const { loserLosses, loserRikishi, postBoutRng, push, result, winnerRikishi, winnerWins } = p;
  // 16b. Hansoku penalty storyline — only after a confirmed foul flip
  if (result.kimarite === "hansoku" && result.foulReview?.confirmed) {
    push(
      BardEngine.resolve(postBoutRng, "post_bout.storylines.hansoku_penalty", {
        WINNER: winnerRikishi.shikona,
        LOSER: loserRikishi.shikona,
        WINS: (winnerWins + 1).toString(),
        LOSSES: (loserLosses + 1).toString(),
        winnerId: winnerRikishi.id,
        loserId: loserRikishi.id,
      }).text,
      "post_bout",
      ["drama", "foul"]
    );
  }
}

function beatJuryoCallup(p: PbpPipeline): void {
  const { east, postBoutRng, push, result, west } = p;
  // 16d. Cross-division call-up — a rikishi answered a higher division's
  // card: juryo→makuuchi, the lower-division cascade, maezumo fills, and
  // the rare hachiban-zumo (8th bout) all land here.
  const callupId = result.crossDivisionCallupId;
  if (!callupId) return;
  const callup = callupId === east.id ? east : callupId === west.id ? west : undefined;
  if (!callup) return;
  const opponent = callup === east ? west : east;
  const path = callup.isMaezumo
    ? "post_bout.maezumo_callup"
    : result.eighthBoutForRikishiId
      ? "post_bout.eighth_bout"
      : callup.division === "juryo"
        ? "post_bout.cross_division_callup"
        : "post_bout.cross_division_callup_lower";
  push(
    BardEngine.resolve(postBoutRng, path, {
      CALLUP: callup.shikona,
      OPPONENT: opponent.shikona,
      CALLUP_DIVISION: callup.division,
      RECEIVING_DIVISION: opponent.division,
      callupId: callup.id,
      opponentId: opponent.id,
    }).text,
    "post_bout",
    ["drama"]
  );
}

function beatHometownWin(p: PbpPipeline): void {
  const { bashoInfo, postBoutRng, push, winnerRikishi } = p;
  // 16c. Hometown win — tiered (W E): host-prefecture winners get the
  // hometown hero line; same-region winners get the regional-support line.
  const bashoLocation = bashoInfo?.location;
  const tier = hometownTier(winnerRikishi.origin, bashoLocation);
  if (tier) {
    const templatePath =
      tier === "home" ? "post_bout.hometown_win" : "post_bout.hometown_region_win";
    push(
      BardEngine.resolve(postBoutRng, templatePath, {
        WINNER: winnerRikishi.shikona,
        LOCATION: bashoLocation,
        REGION: bashoRegionLabel(bashoLocation) ?? bashoLocation,
        ORIGIN: winnerRikishi.origin ?? "",
        winnerId: winnerRikishi.id,
      }).text,
      "post_bout",
      ["hometown"]
    );
  }
}

function beatBelatedBirthday(p: PbpPipeline): void {
  const { bashoInfo, day, postBoutRng, push, winnerRikishi } = p;
  // 16d. Belated birthday — winner grabs their belated birthday gift
  if (bashoInfo && winnerRikishi.birthMonth === bashoInfo.month && winnerRikishi.birthDay) {
    const dayDiff = day - winnerRikishi.birthDay;
    if (dayDiff >= 1 && dayDiff <= BIRTHDAY_WINDOW_DAYS) {
      push(
        BardEngine.resolve(postBoutRng, "post_bout.belated_birthday", {
          WINNER: winnerRikishi.shikona,
          winnerId: winnerRikishi.id,
        }).text,
        "post_bout",
        ["birthday"]
      );
    }
  }
}

function beatKinboshiCount(p: PbpPipeline): void {
  const { postBoutRng, push, result, winnerRikishi } = p;
  // 16e. Career kinboshi count — "his sixth gold star"
  if (result.isKinboshi) {
    // boutResultApplier increments kinboshiEarned AFTER narrative runs, so
    // this bout's star is the (existing count + 1)th.
    const count = (winnerRikishi.stats?.achievements?.kinboshiEarned ?? 0) + 1;
    push(
      BardEngine.resolve(postBoutRng, "post_bout.kinboshi_count", {
        WINNER: winnerRikishi.shikona,
        COUNT: count.toString(),
        winnerId: winnerRikishi.id,
      }).text,
      "post_bout",
      ["kinboshi"]
    );
  }
}

function beatReplayHighlight(p: PbpPipeline): void {
  const { east, loserRikishi, push, result, seed, west, winnerRikishi } = p;
  // 17. Replay highlight — expanded sub-paths
  if (result.excitementScore !== undefined && result.excitementScore > 30) {
    const replayRng = rngFromSeed(seed, "pbp", "replay");
    // Select replay sub-path based on bout characteristics
    let replayPath: string;
    const hasEdgeCrisis = result.log.some((e) => e.phase === "edge_crisis");
    const hasHenka = result.log.some((e) => e.data?.event === "henka_success");
    const isQuickFinish = result.log.length <= 3;
    const isDominant = (result.excitementScore ?? 50) < 60;

    if (hasHenka) {
      replayPath = "post_bout.replay.henka";
    } else if (hasEdgeCrisis) {
      replayPath = "post_bout.replay.edge_drama";
    } else if (isQuickFinish) {
      replayPath = "post_bout.replay.quick_finish";
    } else if (isDominant) {
      replayPath = "post_bout.replay.control";
    } else if (result.duration && result.duration > 20) {
      // Long bouts often involve stamina issues for the loser
      replayPath = "post_bout.replay.stamina_issue";
    } else if (Math.abs(east.weight - west.weight) >= WEIGHT_DIFF_THRESHOLD) {
      replayPath = "post_bout.replay.size_overcame";
    } else {
      // Pick from a few common replay types
      const replayTypes = ["tachiai_decisive", "grip_battle", "counter", "generic"];
      const idx = Math.floor(replayRng.next() * replayTypes.length);
      replayPath = `post_bout.replay.${replayTypes[idx]}`;
    }
    push(
      BardEngine.resolve(replayRng, replayPath, {
        WINNER: winnerRikishi.shikona,
        LOSER: loserRikishi.shikona,
        KIMARITE: result.kimariteName ?? result.kimarite,
        winnerId: winnerRikishi.id,
        loserId: loserRikishi.id,
      }).text,
      "replay",
      ["drama"]
    );
  }
}

export function narrateAftermath(p: PbpPipeline): void {
  beatPostBoutYushoRace(p);
  beatPostBoutLeaderboard(p);
  beatPostBoutStoryline(p);
  beatPostBoutUpset(p);
  beatComebackWin(p);
  beatPostBoutRivalry(p);
  beatKenshoEconomic(p);
  beatAgeDecline(p);
  beatPostBoutInjury(p);
  beatMomentumScore(p);
  beatMonoii(p);
  beatHansokuPenalty(p);
  beatJuryoCallup(p);
  beatHometownWin(p);
  beatBelatedBirthday(p);
  beatKinboshiCount(p);
  beatReplayHighlight(p);
}
