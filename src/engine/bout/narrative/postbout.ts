/**
 * bout/narrative/postbout.ts — extracted beats from generateBoutNarrative.
 * Code moved verbatim; dependencies arrive via the shared PbpPipeline.
 */
import type { PbpPipeline } from "@/engine/bout/narrative/pipeline";
import type { PbpTag } from "@/engine/bout/narrative/pbpTypes";
import {
  BIRTHDAY_WINDOW_DAYS,
  CAREER_BOUT_MILESTONES,
  CAREER_WIN_MILESTONES,
  FIRST_WIN_MENTION_MIN_DAY,
  MOMENTUM_NARRATIVE_THRESHOLD,
  WEIGHT_DIFF_THRESHOLD,
} from "@/constants/engine/generation";
import {
  BEST_START_LOOKBACK_BASHO,
  BEST_START_MIN_DAY,
  BEST_START_MIN_HISTORY,
  EDGE_LETDOWN_MIN_FAILED,
  FOLLOWUP_MIN_LETDOWNS,
  GRIP_CONCEDED_MIN_BOUTS,
  H2H_HOODOO_MIN_LOSSES,
  KACHI_DROUGHT_MIN_BASHO,
  LOSING_SKID_MIN,
  NARRATIVE_GYOJI_CONFUSED_CHANCE,
  VERSATILE_KIMARITE_MIN,
  OLDEST_KACHI_KOSHI_MIN_AGE,
  PHASE_TWO_MIN,
  PULL_CHARM_MIN_ABSORB,
  RETURN_STREAK_MIN,
  SLAPATHON_MIN_EXCHANGES,
  VALIANT_LONG_BOUT_SECONDS,
  VALIANT_MIN_ESCAPES,
} from "@/constants/engine/narrative";
import { CONTENTION_WINDOW, LEAPING_HENKA_SPEED } from "@/constants/engine/physics";
import { HAIR_DOWN_LOSS_CHANCE, HAIR_DOWN_UPRIGHT_KIMARITE } from "@/constants/engine/bout";
import { getLeaderWins } from "@/engine/bout/boutContention";
import { getKimarite } from "@/engine/bout/kimarite/kimariteRegistry";
import { isPullStyleKimarite } from "@/engine/bout/ReplayMetadata";
import { isLowerBodyArea } from "@/engine/health/BodyDefinitions";
import { isKachiKoshi, isMakeKoshi, kachiKoshiThreshold } from "@/engine/banzuke/banzukeHelpers";
import { countKachiKoshiDrought } from "@/engine/bout/narrative/helpers";
import { KINJITE_FOUL_LABELS } from "@/engine/bout/kinjite";
import { rngFromSeed } from "@/engine/core/rng";
import { BardEngine } from "@/engine/bard/BardEngine";
import { hometownTier, bashoRegionLabel } from "@/engine/basho/geography";
import { PREFECTURE_REGION } from "@/constants/engine/geography";
import { BASHO_NAMES } from "@/constants/ui/calendar";
import { getRankDisplayEntry, isSanyakuRank } from "@/constants/engine/rankDisplay";
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

function beatOldestKachiRecord(p: PbpPipeline): void {
  const { eastAge, postBoutRng, push, result, westAge, winnerRikishi, world } = p;
  if (winnerRikishi.division !== "makuuchi") return;
  const winnerAge = result.winner === "east" ? eastAge : westAge;
  if (winnerAge < OLDEST_KACHI_KOSHI_MIN_AGE) return;
  const prevBest = world.records?.allTime?.oldestMakuuchiKachiKoshi?.[0];
  if (prevBest && winnerAge <= prevBest.value) return;

  if (prevBest && prevBest.rikishiId !== winnerRikishi.id) {
    push(
      BardEngine.resolve(postBoutRng, "post_bout.oldest_kachi_record", {
        SHIKONA: winnerRikishi.shikona,
        AGE: winnerAge.toString(),
        PREV_HOLDER: prevBest.shikona,
        rikishiId: winnerRikishi.id,
      }).text,
      "post_bout",
      ["milestone", "veteran", "oldest_kachi_record"]
    );
  } else {
    push(
      BardEngine.resolve(postBoutRng, "post_bout.oldest_kachi_milestone", {
        SHIKONA: winnerRikishi.shikona,
        AGE: winnerAge.toString(),
        rikishiId: winnerRikishi.id,
      }).text,
      "post_bout",
      ["milestone", "veteran", "oldest_kachi_record"]
    );
  }
}

function beatKachiDroughtBroken(p: PbpPipeline): void {
  const { postBoutRng, push, winnerRikishi } = p;
  const drought = countKachiKoshiDrought(winnerRikishi.careerHistory);
  if (drought < KACHI_DROUGHT_MIN_BASHO) return;
  push(
    BardEngine.resolve(postBoutRng, "post_bout.kachi_drought_broken", {
      SHIKONA: winnerRikishi.shikona,
      COUNT: (drought + 1).toString(),
      rikishiId: winnerRikishi.id,
    }).text,
    "post_bout",
    ["kachi_koshi", "kachi_drought"]
  );
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

    if (winnerWins + 1 === kachiKoshiThreshold(winnerRikishi.rank)) {
      beatOldestKachiRecord(p);
      beatKachiDroughtBroken(p);
    }

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
      if (world.rikishi.get(rid)?.division !== winnerRikishi.division) continue;
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
    // W P — "one step behind": the winner sits a single win back of a sole
    // leader — the chase-pack framing the leaderboard beats never covered.
    if (coLeaders === 1 && winnerWins + 1 === maxWins - 1) {
      push(
        BardEngine.resolve(postBoutRng, "post_bout.storylines.chase_pack", {
          WINNER: winnerRikishi.shikona,
          WINS: (winnerWins + 1).toString(),
          DAY: day.toString(),
          winnerId: winnerRikishi.id,
        }).text,
        "post_bout",
        ["chase_pack", "yusho_race"]
      );
    }
  }
}

function beatSpoilerStrike(p: PbpPipeline): void {
  const { day, loserRikishi, loserWins, postBoutRng, push, winnerRikishi, winnerWins, world } = p;
  // W P — "played the role of spoiler": a non-contender dents a contender's
  // title hopes late in the basho. Each side is measured against its own
  // division's lead (cross-division callups stay honest).
  const basho = world.currentBasho;
  if (!basho || day < 8) return;
  const loserLeader = getLeaderWins(basho, world, loserRikishi.division);
  if (loserLeader - loserWins > CONTENTION_WINDOW) return;
  const winnerLeader = getLeaderWins(basho, world, winnerRikishi.division);
  if (winnerLeader - (winnerWins + 1) <= CONTENTION_WINDOW) return;
  // W Z — "could be the spoiler in back-to-back days": the winner's
  // immediately previous-day victim was also a contender in his division.
  const bashoId = basho.id ?? `${basho.bashoName}-${world.year}`;
  const history = winnerRikishi.history ?? [];
  const lastEntry = history[history.length - 1];
  const prevOpp = lastEntry ? world.rikishi.get(lastEntry.opponentId) : undefined;
  const prevOppWins = prevOpp
    ? (basho.standings.get(prevOpp.id)?.wins ?? prevOpp.currentBashoWins ?? 0)
    : 0;
  const repeatSpoiler =
    lastEntry != null &&
    lastEntry.bashoId === bashoId &&
    lastEntry.day === day - 1 &&
    lastEntry.win &&
    !lastEntry.draw &&
    prevOpp != null &&
    getLeaderWins(basho, world, prevOpp.division) - prevOppWins <= CONTENTION_WINDOW;
  push(
    BardEngine.resolve(
      postBoutRng,
      repeatSpoiler
        ? "post_bout.storylines.spoiler_strike_again"
        : "post_bout.storylines.spoiler_strike",
      {
        WINNER: winnerRikishi.shikona,
        LOSER: loserRikishi.shikona,
        winnerId: winnerRikishi.id,
        loserId: loserRikishi.id,
      }
    ).text,
    "post_bout",
    ["spoiler", "yusho_race"]
  );
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
      const winnerWinsBefore = winnerIsEast ? eastWinsBefore : westWinsBefore;
      const loserWinsBefore = winnerIsEast ? westWinsBefore : eastWinsBefore;
      const diff = Math.abs(newEastWins - newWestWins);

      let rivalryPath: string;
      let rivalryTags: PbpTag[] = ["rivalry"];
      if (winnerWinsBefore === 0 && loserWinsBefore >= H2H_HOODOO_MIN_LOSSES) {
        rivalryPath = "post_bout.rivalry.first_breakthrough";
        rivalryTags = ["rivalry", "milestone"];
      } else if (diff >= 3 && winnerNewWins > loserNewWins) {
        rivalryPath = "post_bout.rivalry.domination";
      } else if (diff >= 3 && winnerNewWins < loserNewWins) {
        rivalryPath = "post_bout.rivalry.chipped_away";
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
        rivalryTags
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

function emitMonoiiOutcomeLine(p: PbpPipeline, monoiiRng: ReturnType<typeof rngFromSeed>): void {
  const { east, loserRikishi, push, result, west, winnerRikishi } = p;
  const outcome = result.monoiiOutcome ?? "upheld";
  if (outcome === "azukari" || outcome === "itamiwake") {
    push(
      BardEngine.resolve(monoiiRng, `post_bout.mono_ii.${outcome}`, {
        EAST: east.shikona,
        WEST: west.shikona,
        eastRikishiId: east.id,
        westRikishiId: west.id,
      }).text,
      "mono_ii",
      ["drama", "draw"]
    );
  } else if (outcome === "reversed") {
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

function beatMonoii(p: PbpPipeline): void {
  const { east, loserRikishi, push, result, seed, west, winnerRikishi } = p;
  if (!result.monoii) return;
  if (result.foulReview) {
    beatFoulReviewArc(p);
    return;
  }
  const monoiiRng = rngFromSeed(seed, "pbp", "mono-ii");
  const gunbaiWinner =
    result.apparentWinner != null
      ? result.apparentWinner === "east"
        ? east
        : west
      : winnerRikishi;
  const gunbaiLoser =
    result.apparentWinner != null ? (result.apparentWinner === "east" ? west : east) : loserRikishi;
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
  emitMonoiiOutcomeLine(p, monoiiRng);
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
  const { bashoInfo, east, loserRikishi, postBoutRng, push, west, winnerRikishi } = p;
  if (east.origin && west.origin && east.origin === west.origin) {
    // W Z — same split as the pre-bout beat: a shared FOREIGN origin is not
    // a prefecture showdown, so countrymen get dedicated shared-origin copy.
    const foreign = !PREFECTURE_REGION[east.origin];
    push(
      BardEngine.resolve(
        postBoutRng,
        foreign ? "post_bout.shared_origin_win" : "post_bout.prefecture_showdown_win",
        {
          WINNER: winnerRikishi.shikona,
          LOSER: loserRikishi.shikona,
          ORIGIN: east.origin,
          winnerId: winnerRikishi.id,
          loserId: loserRikishi.id,
        }
      ).text,
      "post_bout",
      foreign ? ["hometown", "shared_origin"] : ["hometown", "prefecture_showdown"]
    );
    return;
  }
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

/** W P — kimarite whose replay is narrated as an overcommit/overlean finish. */
const REPLAY_OVERLEAN_KIMARITE = new Set(["tsukiotoshi", "hatakikomi", "hikotoshi"]);

function beatReplayHighlight(p: PbpPipeline): void {
  const { east, loserRikishi, push, result, seed, west, winnerRikishi } = p;
  // 17. Replay highlight — expanded sub-paths
  if (result.excitementScore !== undefined && result.excitementScore > 30) {
    const replayRng = rngFromSeed(seed, "pbp", "replay");
    // Select replay sub-path based on bout characteristics
    let replayPath: string;
    const hasEdgeCrisis = result.log.some((e) => e.phase === "edge_crisis");
    const hasHenka = result.log.some((e) => e.data?.event === "henka_success");
    const gripTransitions = result.log.filter((e) => e.phase === "grip_transition").length;
    const isQuickFinish = result.log.length <= 3;
    const isDominant = (result.excitementScore ?? 50) < 60;

    if (hasHenka) {
      replayPath = "post_bout.replay.henka";
    } else if (hasEdgeCrisis) {
      replayPath = "post_bout.replay.edge_drama";
    } else if (result.kimarite === "kakenage") {
      // W P — mechanic-keyed replays: the arm-lock squeeze
      replayPath = "post_bout.replay.arm_lock";
    } else if (REPLAY_OVERLEAN_KIMARITE.has(result.kimarite ?? "")) {
      // W P — "feet got left behind as his upper body leaned forward"
      replayPath = "post_bout.replay.overlean";
    } else if (gripTransitions >= 2) {
      // W P — "slip the right arm inside, then the left uwa-te"
      replayPath = "post_bout.replay.grip_sequence";
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

function beatSignatureGripAftermath(p: PbpPipeline): void {
  const { loserRikishi, postBoutRng, push, result, winnerRikishi, world } = p;
  // W M: the grip pattern held again — winner secured his preferred grip
  // and already has a winning record when he lands it this basho.
  const winnerSide = result.winner;
  if (result.gripSecured?.[winnerSide] !== true) return;
  const pref = winnerRikishi.combatProfile?.preferredGrip;
  if (pref !== "migi" && pref !== "hidari") return;
  const m = world?.currentBasho?.boutMetrics?.[winnerRikishi.id];
  const secured = m?.preferredGripSecured ?? 0;
  const gripWins = m?.preferredGripWins ?? 0;
  if (secured < 2 || gripWins / secured < 0.7) return;
  push(
    BardEngine.resolve(postBoutRng, "post_bout.signature_grip", {
      WINNER: winnerRikishi.shikona,
      LOSER: loserRikishi.shikona,
      GRIP_LABEL: pref === "migi" ? "right-inside" : "left-inside",
      winnerId: winnerRikishi.id,
      loserId: loserRikishi.id,
    }).text,
    "post_bout",
    ["signature_grip", "favorite_grip"]
  );
}

function beatSanyakuWinStreak(p: PbpPipeline): void {
  const { loserRikishi, postBoutRng, push, winnerRikishi, world } = p;
  // W M: "beat an Ozeki for the second straight day" — consecutive wins
  // over sanyaku-ranked opponents. Metrics are pre-bout, so this win makes
  // it streak+1 in a row.
  if (!isSanyakuRank(loserRikishi.rank ?? "")) return;
  const prior = world?.currentBasho?.boutMetrics?.[winnerRikishi.id]?.sanyakuWinStreak ?? 0;
  const streak = prior + 1;
  if (streak < 2) return;
  push(
    BardEngine.resolve(postBoutRng, "post_bout.sanyaku_streak", {
      WINNER: winnerRikishi.shikona,
      LOSER: loserRikishi.shikona,
      STREAK: streak,
      winnerId: winnerRikishi.id,
      loserId: loserRikishi.id,
    }).text,
    "post_bout",
    ["sanyaku_streak", "upset"]
  );
}

function beatHenkaDignity(p: PbpPipeline): void {
  const { loserRikishi, postBoutRng, push, result, winnerRikishi } = p;
  // W N — "desperate times, desperate measures": a sanyaku+ sidestep draws
  // credibility commentary. High-agility winners get the leaping-henka
  // ("leaping dragon") variant.
  const henka = result.log?.find(
    (e) => e.data?.event === "henka_success" && e.data?.attackerSide === result.winner
  );
  if (!henka || !isSanyakuRank(winnerRikishi.rank ?? "")) return;
  const leap = (winnerRikishi.stats?.speed ?? 0) >= LEAPING_HENKA_SPEED;
  push(
    BardEngine.resolve(
      postBoutRng,
      leap ? "post_bout.henka_dignity_leap" : "post_bout.henka_dignity",
      {
        WINNER: winnerRikishi.shikona,
        LOSER: loserRikishi.shikona,
        RANK: winnerRikishi.rank ?? "",
        winnerId: winnerRikishi.id,
        loserId: loserRikishi.id,
      }
    ).text,
    "post_bout",
    ["henka_dignity", "henka"]
  );
}

function beatPullCharm(p: PbpPipeline): void {
  const { loserRikishi, postBoutRng, push, result, winnerRikishi } = p;
  // W N — "he was determined to pull going backwards… the third time's a
  // charm": the winner absorbed repeated forward pressure, then finished on
  // a pull-family kimarite.
  if (!isPullStyleKimarite(result.kimarite ?? "")) return;
  const loserSide = result.winner === "east" ? "west" : "east";
  const absorbed = (result.log ?? []).filter(
    (e) => e.data?.family === "push" && e.data?.attackerSide === loserSide
  ).length;
  if (absorbed < PULL_CHARM_MIN_ABSORB) return;
  push(
    BardEngine.resolve(postBoutRng, "post_bout.pull_charm", {
      WINNER: winnerRikishi.shikona,
      LOSER: loserRikishi.shikona,
      COUNT: absorbed.toString(),
      winnerId: winnerRikishi.id,
      loserId: loserRikishi.id,
    }).text,
    "post_bout",
    ["pull_charm"]
  );
}

function beatLimpAway(p: PbpPipeline): void {
  const { east, postBoutRng, push, result, west } = p;
  // W N — "limping away from that encounter… let's hope it's just
  // temporary": a lower-body injury sustained inside this bout.
  const inj = result.inBoutInjury;
  if (!inj || !isLowerBodyArea(inj.area)) return;
  const hurt = inj.rikishiId === east.id ? east : west;
  push(
    BardEngine.resolve(postBoutRng, "post_bout.limp_away", {
      SHIKONA: hurt.shikona,
      AREA: inj.area,
      rikishiId: hurt.id,
    }).text,
    "post_bout",
    ["limp_away", "injury"]
  );
}

function beatCompeteCredit(p: PbpPipeline): void {
  const { loserRikishi, postBoutRng, push, winnerRikishi } = p;
  // W N — "the fact that he's competing is a plus": a man who entered the
  // bout carrying an injury and won anyway.
  if (!winnerRikishi.injured) return;
  push(
    BardEngine.resolve(postBoutRng, "post_bout.compete_credit", {
      WINNER: winnerRikishi.shikona,
      LOSER: loserRikishi.shikona,
      winnerId: winnerRikishi.id,
      loserId: loserRikishi.id,
    }).text,
    "post_bout",
    ["compete_credit", "injury"]
  );
}

function beatPhaseTwo(p: PbpPipeline): void {
  const { loserRikishi, postBoutRng, push, result, winnerRikishi, world } = p;
  // W N — "he's got that big hit, but it's phase two that lets him down":
  // won the tachiai, lost the bout — and it's a pattern (pre-bout metrics,
  // so this loss makes it prior+1).
  if (!result.tachiaiWinner || result.tachiaiWinner === result.winner) return;
  const prior = world?.currentBasho?.boutMetrics?.[loserRikishi.id]?.tachiaiWonButLost ?? 0;
  const count = prior + 1;
  if (count < PHASE_TWO_MIN) return;
  push(
    BardEngine.resolve(postBoutRng, "post_bout.phase_two", {
      LOSER: loserRikishi.shikona,
      WINNER: winnerRikishi.shikona,
      COUNT: count.toString(),
      loserId: loserRikishi.id,
      winnerId: winnerRikishi.id,
    }).text,
    "post_bout",
    ["phase_two"]
  );
}

function beatSlapathon(p: PbpPipeline): void {
  const { loserRikishi, postBoutRng, push, result, winnerRikishi } = p;
  // W P — "it's a slapathon": both sides trading push-family offense, counted
  // per attacker side like the pull-charm absorb count.
  let eastPush = 0;
  let westPush = 0;
  for (const e of result.log ?? []) {
    if (e.data?.family !== "push") continue;
    if (e.data?.attackerSide === "east") eastPush++;
    else if (e.data?.attackerSide === "west") westPush++;
  }
  if (eastPush < SLAPATHON_MIN_EXCHANGES || westPush < SLAPATHON_MIN_EXCHANGES) return;
  push(
    BardEngine.resolve(postBoutRng, "post_bout.slapathon", {
      WINNER: winnerRikishi.shikona,
      LOSER: loserRikishi.shikona,
      winnerId: winnerRikishi.id,
      loserId: loserRikishi.id,
    }).text,
    "post_bout",
    ["slapathon"]
  );
}

function beatLoserCredit(p: PbpPipeline): void {
  const { loserRikishi, postBoutRng, push, result, winnerRikishi } = p;
  // W P — loser-credit beats: "refuses to go down… great effort by both men"
  // and "did everything right except at the end".
  const loserSide = result.winner === "east" ? "west" : "east";
  const loserEscapes = (result.log ?? []).filter(
    (e) => e.phase === "edge_crisis" && e.data?.side === loserSide && e.data?.escaped === true
  ).length;
  const winnerEscapes = (result.log ?? []).filter(
    (e) => e.phase === "edge_crisis" && e.data?.side === result.winner && e.data?.escaped === true
  ).length;
  if (
    loserEscapes >= VALIANT_MIN_ESCAPES ||
    (winnerRikishi.rank === "yokozuna" && (result.duration ?? 0) >= VALIANT_LONG_BOUT_SECONDS)
  ) {
    push(
      BardEngine.resolve(postBoutRng, "post_bout.valiant_loser", {
        LOSER: loserRikishi.shikona,
        WINNER: winnerRikishi.shikona,
        loserId: loserRikishi.id,
        winnerId: winnerRikishi.id,
      }).text,
      "post_bout",
      ["valiant_loser", "comeback"]
    );
    return;
  }
  if (winnerEscapes >= 1) {
    push(
      BardEngine.resolve(postBoutRng, "post_bout.loser_near_miss", {
        LOSER: loserRikishi.shikona,
        WINNER: winnerRikishi.shikona,
        loserId: loserRikishi.id,
        winnerId: winnerRikishi.id,
      }).text,
      "post_bout",
      ["loser_near_miss", "comeback"]
    );
  }
}

function beatFollowupDelivered(p: PbpPipeline): void {
  const { loserRikishi, postBoutRng, push, result, winnerRikishi, world } = p;
  // W P — "very good followup this time": a serial phase-two offender
  // actually converts the tachiai win today.
  if (!result.tachiaiWinner || result.tachiaiWinner !== result.winner) return;
  const prior = world?.currentBasho?.boutMetrics?.[winnerRikishi.id]?.tachiaiWonButLost ?? 0;
  if (prior < FOLLOWUP_MIN_LETDOWNS) return;
  push(
    BardEngine.resolve(postBoutRng, "post_bout.followup_delivered", {
      WINNER: winnerRikishi.shikona,
      COUNT: prior.toString(),
      winnerId: winnerRikishi.id,
      loserId: loserRikishi.id,
    }).text,
    "post_bout",
    ["followup"]
  );
}

function beatEdgeLetdown(p: PbpPipeline): void {
  const { loserRikishi, postBoutRng, push, result, world } = p;
  // W P — the Takerufuji reputation: the big hit is there but he can't finish
  // at the edge. This bout's winner-side escapes + the loser's accumulated
  // failed conversions make the pattern.
  const thisBout = (result.log ?? []).filter(
    (e) => e.phase === "edge_crisis" && e.data?.side === result.winner && e.data?.escaped === true
  ).length;
  if (thisBout === 0) return;
  const prior = world?.currentBasho?.boutMetrics?.[loserRikishi.id]?.edgeFailedConversions ?? 0;
  const total = prior + thisBout;
  if (total < EDGE_LETDOWN_MIN_FAILED) return;
  push(
    BardEngine.resolve(postBoutRng, "post_bout.edge_letdown", {
      LOSER: loserRikishi.shikona,
      COUNT: total.toString(),
      loserId: loserRikishi.id,
    }).text,
    "post_bout",
    ["edge_letdown"]
  );
}

function beatBestStart(p: PbpPipeline): void {
  const { day, postBoutRng, push, winnerRikishi, winnerWins } = p;
  // W Q — "off to his best start in over three years": today's win total tops
  // every final record of the last N basho.
  if (day < BEST_START_MIN_DAY) return;
  const history = winnerRikishi.careerHistory ?? [];
  if (history.length < BEST_START_MIN_HISTORY) return;
  const recent = history.slice(-BEST_START_LOOKBACK_BASHO);
  const postWins = winnerWins + 1;
  if (recent.some((s) => s.wins >= postWins)) return;
  push(
    BardEngine.resolve(postBoutRng, "post_bout.storylines.best_start", {
      WINNER: winnerRikishi.shikona,
      WINS: postWins.toString(),
      DAY: day.toString(),
      BASHO_SPAN: recent.length.toString(),
      winnerId: winnerRikishi.id,
    }).text,
    "post_bout",
    ["best_start", "yusho_race"]
  );
}

const ELITE_SCALP_RANKS = new Set(["yokozuna", "ozeki"]);

function beatEliteScalpStreak(p: PbpPipeline): void {
  const { loserRikishi, postBoutRng, push, winnerRikishi, world } = p;
  // W Q — "consecutive wins over yokozuna": today's elite victim follows an
  // earlier elite scalp this same basho.
  if (!ELITE_SCALP_RANKS.has(loserRikishi.rank ?? "")) return;
  const basho = world?.currentBasho;
  if (!basho || !world?.rikishi) return;
  const bashoId = basho.id ?? `${basho.bashoName}-${world.year}`;
  const priorEliteWins = (winnerRikishi.history ?? []).filter(
    (h) =>
      h.bashoId === bashoId &&
      h.win &&
      ELITE_SCALP_RANKS.has(world.rikishi.get(h.opponentId)?.rank ?? "")
  ).length;
  if (priorEliteWins < 1) return;
  push(
    BardEngine.resolve(postBoutRng, "post_bout.elite_scalp_streak", {
      WINNER: winnerRikishi.shikona,
      LOSER: loserRikishi.shikona,
      winnerId: winnerRikishi.id,
      loserId: loserRikishi.id,
    }).text,
    "post_bout",
    ["elite_scalp_streak", "upset"]
  );
}

function beatHairDown(p: PbpPipeline): void {
  const { result, loserRikishi, postBoutRng, push } = p;
  // Deferred registry — hair-down automatic loss: when a rikishi's topknot
  // comes undone, hair touching the clay counts as a body part down. Only
  // materializes on finishes where the loser is already downed.
  if (!result || HAIR_DOWN_UPRIGHT_KIMARITE.has(result.kimarite ?? "")) return;
  if (postBoutRng.next() >= HAIR_DOWN_LOSS_CHANCE) return;
  result.hairDown = true;
  push(
    BardEngine.resolve(postBoutRng, "post_bout.hair_down", {
      LOSER: loserRikishi.shikona,
      loserId: loserRikishi.id,
    }).text,
    "post_bout",
    ["hair_down", "upset"]
  );
}

function beatRecordStakesAftermath(p: PbpPipeline): void {
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
  const wThresh = kachiKoshiThreshold(winnerRikishi.rank);
  const lThresh = kachiKoshiThreshold(loserRikishi.rank);

  if (winnerLosses === wThresh - 1 && winnerWins + 1 < wThresh) {
    push(
      BardEngine.resolve(postBoutRng, "post_bout.make_koshi_staved_off", {
        WINNER: winnerRikishi.shikona,
        WINS: (winnerWins + 1).toString(),
        LOSSES: winnerLosses.toString(),
        winnerId: winnerRikishi.id,
      }).text,
      "post_bout",
      ["comeback", "make_koshi_staved_off"]
    );
  }
  if (loserWins === lThresh - 1 && loserLosses + 1 < lThresh) {
    push(
      BardEngine.resolve(postBoutRng, "post_bout.kachi_denied", {
        WINNER: winnerRikishi.shikona,
        LOSER: loserRikishi.shikona,
        DAY: day.toString(),
        winnerId: winnerRikishi.id,
        loserId: loserRikishi.id,
      }).text,
      "post_bout",
      ["kachi_koshi", "kachi_denied"]
    );
  }
  if (winnerLosses >= wThresh && winnerWins >= 1) {
    push(
      BardEngine.resolve(postBoutRng, "post_bout.pride_win_after_mk", {
        WINNER: winnerRikishi.shikona,
        WINS: (winnerWins + 1).toString(),
        winnerId: winnerRikishi.id,
      }).text,
      "post_bout",
      ["pride_win"]
    );
  }
}

function beatSkidSnapped(p: PbpPipeline): void {
  const { postBoutRng, push, winnerRikishi } = p;
  const streak = winnerRikishi.currentLossStreak ?? 0;
  if (streak < LOSING_SKID_MIN) return;
  push(
    BardEngine.resolve(postBoutRng, "post_bout.skid_snapped", {
      WINNER: winnerRikishi.shikona,
      STREAK: streak.toString(),
      winnerId: winnerRikishi.id,
    }).text,
    "post_bout",
    ["streak", "comeback", "skid_snapped"]
  );
}

function beatMidBashoReturnWin(p: PbpPipeline): void {
  const { day, postBoutRng, push, winnerRikishi, world } = p;
  const reenteredDay = world.currentBasho?.reenteredOnDay?.[winnerRikishi.id];
  if (reenteredDay === undefined) return;
  if (day === reenteredDay) {
    push(
      BardEngine.resolve(postBoutRng, "post_bout.mid_basho_return_win", {
        WINNER: winnerRikishi.shikona,
        winnerId: winnerRikishi.id,
      }).text,
      "post_bout",
      ["comeback", "mid_basho_return"]
    );
  } else if (day === reenteredDay + 1 && (winnerRikishi.currentWinStreak ?? 0) >= 1) {
    push(
      BardEngine.resolve(postBoutRng, "post_bout.mid_basho_back_to_back", {
        WINNER: winnerRikishi.shikona,
        winnerId: winnerRikishi.id,
      }).text,
      "post_bout",
      ["comeback", "streak", "mid_basho_return"]
    );
  } else if (
    day >= reenteredDay + 2 &&
    (winnerRikishi.currentWinStreak ?? 0) + 1 >= RETURN_STREAK_MIN
  ) {
    // W P — "three straight wins since returning to action".
    push(
      BardEngine.resolve(postBoutRng, "post_bout.mid_basho_return_streak", {
        WINNER: winnerRikishi.shikona,
        COUNT: ((winnerRikishi.currentWinStreak ?? 0) + 1).toString(),
        winnerId: winnerRikishi.id,
      }).text,
      "post_bout",
      ["comeback", "streak", "mid_basho_return"]
    );
  }
}

function beatMorozashiEscape(p: PbpPipeline): void {
  const { loserRikishi, postBoutRng, push, result, winnerRikishi } = p;
  const loserSide = result.winner === "east" ? "west" : "east";
  const gripToKey = loserSide === "east" ? "eastGripTo" : "westGripTo";
  const loserGotMorozashi = (result.log ?? []).some(
    (e) =>
      e.phase === "grip_transition" &&
      e.data?.type === "grip_class_shift" &&
      e.data?.[gripToKey] === "morozashi"
  );
  if (!loserGotMorozashi) return;
  push(
    BardEngine.resolve(postBoutRng, "post_bout.morozashi_escape", {
      WINNER: winnerRikishi.shikona,
      LOSER: loserRikishi.shikona,
      winnerId: winnerRikishi.id,
      loserId: loserRikishi.id,
    }).text,
    "post_bout",
    ["comeback", "morozashi_escape"]
  );
}

function beatRankPride(p: PbpPipeline): void {
  const {
    day,
    loserRikishi,
    loserWins,
    postBoutRng,
    push,
    winnerLosses,
    winnerRikishi,
    winnerWins,
  } = p;
  const isYokozunaVsLower = winnerRikishi.rank === "yokozuna" && loserRikishi.rank !== "yokozuna";
  const isOzekiVsLower =
    winnerRikishi.rank === "ozeki" &&
    loserRikishi.rank !== "yokozuna" &&
    loserRikishi.rank !== "ozeki";
  if (!isYokozunaVsLower && !isOzekiVsLower) return;
  if (!(
    loserWins > winnerWins ||
    winnerRikishi.injured ||
    (day >= 8 && winnerWins <= winnerLosses)
  )) {
    return;
  }
  push(
    BardEngine.resolve(postBoutRng, "post_bout.rank_pride", {
      WINNER: winnerRikishi.shikona,
      LOSER: loserRikishi.shikona,
      RANK: getRankDisplayEntry(winnerRikishi.rank)?.en ?? winnerRikishi.rank,
      winnerId: winnerRikishi.id,
      loserId: loserRikishi.id,
    }).text,
    "post_bout",
    ["rank_pride", "dominant"]
  );
}

/** W Z — callout for rare/legendary kimarite finishes; silent for common/uncommon. */
function beatRareTechnique(p: PbpPipeline): void {
  const { loserRikishi, postBoutRng, push, result, winnerRikishi } = p;
  // W Z — "a relatively rare technique": call out uncommon finishes via
  // the registry's real-world share label (rare / legendary tiers).
  const rarity = getKimarite(result.kimarite ?? "")?.rarity;
  if (rarity !== "rare" && rarity !== "legendary") return;
  push(
    BardEngine.resolve(postBoutRng, "post_bout.rare_technique", {
      WINNER: winnerRikishi.shikona,
      LOSER: loserRikishi.shikona,
      KIMARITE: result.kimariteName ?? result.kimarite,
      winnerId: winnerRikishi.id,
      loserId: loserRikishi.id,
    }).text,
    "post_bout",
    ["rare_technique"]
  );
}

/** W Z — recalls prior H2H finishes: deja-vu repeat technique or 'done the research' adaptation. */
function beatH2HFinishRecall(p: PbpPipeline): void {
  const { loserRikishi, postBoutRng, push, result, winnerRikishi } = p;
  // W Z — finish recall vs this opponent: deja-vu when today's kimarite
  // already beat this man before (playoff-recall variant when a career
  // highlight names him), or "a bit of research done" when prior wins
  // over him span distinct techniques. Draws don't count as wins.
  const priorWins = (winnerRikishi.history ?? []).filter(
    (h) => h.opponentId === loserRikishi.id && h.win && !h.draw
  );
  if (priorWins.length === 0) return;
  if (priorWins.some((h) => h.kimarite === result.kimarite)) {
    const playoffRecall = (winnerRikishi.careerHighlights ?? []).some(
      (c) => c.type === "playoff_win" && c.opponent === loserRikishi.id
    );
    push(
      BardEngine.resolve(
        postBoutRng,
        playoffRecall ? "post_bout.deja_vu_playoff" : "post_bout.deja_vu",
        {
          WINNER: winnerRikishi.shikona,
          LOSER: loserRikishi.shikona,
          KIMARITE: result.kimariteName ?? result.kimarite,
          winnerId: winnerRikishi.id,
          loserId: loserRikishi.id,
        }
      ).text,
      "post_bout",
      ["deja_vu", "rivalry"]
    );
    return;
  }
  const distinct = new Set(priorWins.map((h) => h.kimarite));
  if (distinct.size >= 2) {
    push(
      BardEngine.resolve(postBoutRng, "post_bout.h2h_adaptation", {
        WINNER: winnerRikishi.shikona,
        LOSER: loserRikishi.shikona,
        winnerId: winnerRikishi.id,
        loserId: loserRikishi.id,
      }).text,
      "post_bout",
      ["h2h_adaptation", "rivalry"]
    );
  }
}

/** W Z — post-bout note when the winner reaches double-digit wins ('first since' variant after a drought). */
function beatDoubleDigit(p: PbpPipeline): void {
  const { postBoutRng, push, winnerRikishi, winnerWins } = p;
  // W Z — "secure a double-digit report card": the 10th win of the basho.
  // "First since %BASHO%" only when the immediately previous tournament
  // fell short of ten — consecutive double-figure bashos stay on the
  // plain line.
  if (winnerWins + 1 !== 10) return;
  const history = winnerRikishi.careerHistory ?? [];
  const prev = history[history.length - 1];
  const lastDoubleDigit = [...history].reverse().find((s) => s.wins >= 10);
  const sinceVariant = prev != null && prev.wins < 10 && lastDoubleDigit != null;
  push(
    BardEngine.resolve(
      postBoutRng,
      sinceVariant ? "post_bout.double_digit_since" : "post_bout.double_digit",
      {
        WINNER: winnerRikishi.shikona,
        WINS: (winnerWins + 1).toString(),
        BASHO: sinceVariant
          ? `${BASHO_NAMES[lastDoubleDigit.bashoName] ?? lastDoubleDigit.bashoName} ${lastDoubleDigit.year}`
          : "",
        winnerId: winnerRikishi.id,
      }
    ).text,
    "post_bout",
    ["double_digit", "milestone"]
  );
}

/** W Z — post-bout note when an ozeki stays kadoban despite the win (demotion decided next basho). */
function beatKadobanPending(p: PbpPipeline): void {
  const { loserLosses, loserRikishi, loserWins, postBoutRng, push } = p;
  // W Z — "suffers make-koshi — will be kadoban next tournament": an ozeki
  // whose eighth loss today guarantees kadoban status going forward.
  if (loserRikishi.rank !== "ozeki") return;
  if (!isMakeKoshi(loserWins, loserLosses + 1, "ozeki")) return;
  push(
    BardEngine.resolve(postBoutRng, "post_bout.kadoban_pending", {
      LOSER: loserRikishi.shikona,
      LOSSES: (loserLosses + 1).toString(),
      loserId: loserRikishi.id,
    }).text,
    "post_bout",
    ["kadoban", "kadoban_pending", "make_koshi"]
  );
}

/** W Z — loser's declared grip never materialized; 'did his homework' variant when winner previously lost this H2H. */
function beatGripConceded(p: PbpPipeline): void {
  const { loserRikishi, postBoutRng, push, result, winnerRikishi, world } = p;
  // W Z — "got his favorite grip — no opposition in denying those grips":
  // the loser declared a preferred grip but never secured it. "Did his
  // homework" variant when the winner lost the previous meeting; habitual
  // variant when the metrics show a tournament-long denial.
  const loserSide = result.winner === "east" ? "west" : "east";
  const pref = loserRikishi.combatProfile?.preferredGrip;
  if (pref !== "migi" && pref !== "hidari") return;
  if (result.gripSecured?.[loserSide] !== false) return;
  const mutual = (winnerRikishi.history ?? []).filter(
    (h) => h.opponentId === loserRikishi.id
  );
  const lastMeeting = mutual[mutual.length - 1];
  let path = "post_bout.grip_conceded";
  if (lastMeeting && !lastMeeting.win && !lastMeeting.draw) {
    path = "post_bout.grip_conceded_homework";
  } else {
    const m = world?.currentBasho?.boutMetrics?.[loserRikishi.id];
    if (
      (m?.preferredGripBouts ?? 0) >= GRIP_CONCEDED_MIN_BOUTS &&
      (m?.preferredGripSecured ?? 0) === 0
    ) {
      path = "post_bout.grip_conceded_habitual";
    }
  }
  push(
    BardEngine.resolve(postBoutRng, path, {
      WINNER: winnerRikishi.shikona,
      LOSER: loserRikishi.shikona,
      winnerId: winnerRikishi.id,
      loserId: loserRikishi.id,
    }).text,
    "post_bout",
    ["grip_conceded", "grip_denied"]
  );
}

/** W Z — winner has won with >= VERSATILE_KIMARITE_MIN distinct techniques this basho. */
function beatVersatileKimarite(p: PbpPipeline): void {
  const { postBoutRng, push, result, winnerRikishi, world } = p;
  // W Z — "the versatile Hoshoryu": a different technique every night.
  // boutMetrics is pre-bout, so today's finish joins the tally here.
  const used = world?.currentBasho?.boutMetrics?.[winnerRikishi.id]?.kimariteUsed;
  const distinct = new Set(Object.keys(used ?? {}));
  if (result.kimarite) distinct.add(result.kimarite);
  if (distinct.size < VERSATILE_KIMARITE_MIN) return;
  push(
    BardEngine.resolve(postBoutRng, "post_bout.versatile_kimarite", {
      WINNER: winnerRikishi.shikona,
      winnerId: winnerRikishi.id,
    }).text,
    "post_bout",
    ["versatile_kimarite"]
  );
}

/** W Z — gyoji's call stood with hair down and no mono-ii; emits the dormant `close_call` tag. */
function beatCleanCall(p: PbpPipeline): void {
  const { loserRikishi, postBoutRng, push, result, winnerRikishi } = p;
  // W Z — "the judges saw no need to confer": a down-type finish (hair
  // counted as down) decided cleanly with no mono-ii. Finally emits the
  // dormant `close_call` tag. Must run after beatHairDown — that beat is
  // what sets `result.hairDown` on this bout.
  if (result.monoii || result.hairDown !== true) return;
  push(
    BardEngine.resolve(postBoutRng, "post_bout.clean_call", {
      WINNER: winnerRikishi.shikona,
      LOSER: loserRikishi.shikona,
      winnerId: winnerRikishi.id,
      loserId: loserRikishi.id,
    }).text,
    "post_bout",
    ["close_call"]
  );
}

/** W Z — winner fought on bloodied: fires only when a winner-side minor bout_injury log entry exists. */
function beatBloodiedUnfazed(p: PbpPipeline): void {
  const { postBoutRng, push, result, winnerRikishi } = p;
  // W Z — "bleeding just above the right eye, seems unfazed": a minor
  // in-bout injury on the WINNER's side that never slowed him down.
  const bled = (result.log ?? []).some(
    (e) =>
      e.phase === "bout_injury" &&
      e.data?.rikishiId === winnerRikishi.id &&
      (e.data?.severity ?? "minor") === "minor"
  );
  if (!bled) return;
  push(
    BardEngine.resolve(postBoutRng, "post_bout.bloodied_unfazed", {
      WINNER: winnerRikishi.shikona,
      winnerId: winnerRikishi.id,
    }).text,
    "post_bout",
    ["injury"]
  );
}

export function narrateAftermath(p: PbpPipeline): void {
  if (p.result.isDraw) {
    beatPostBoutInjury(p);
    beatMonoii(p);
    return;
  }
  beatPostBoutYushoRace(p);
  beatRareTechnique(p);
  beatH2HFinishRecall(p);
  beatDoubleDigit(p);
  beatKadobanPending(p);
  beatGripConceded(p);
  beatVersatileKimarite(p);
  beatSignatureGripAftermath(p);
  beatSanyakuWinStreak(p);
  beatHenkaDignity(p);
  beatPullCharm(p);
  beatLimpAway(p);
  beatCompeteCredit(p);
  beatPhaseTwo(p);
  beatSlapathon(p);
  beatLoserCredit(p);
  beatBestStart(p);
  beatEliteScalpStreak(p);
  beatHairDown(p);
  beatCleanCall(p);
  beatFollowupDelivered(p);
  beatEdgeLetdown(p);
  beatPostBoutLeaderboard(p);
  beatSpoilerStrike(p);
  beatPostBoutStoryline(p);
  beatRecordStakesAftermath(p);
  beatSkidSnapped(p);
  beatMidBashoReturnWin(p);
  beatMorozashiEscape(p);
  beatRankPride(p);
  beatPostBoutUpset(p);
  beatComebackWin(p);
  beatBloodiedUnfazed(p);
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
