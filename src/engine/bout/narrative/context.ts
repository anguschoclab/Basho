/**
 * bout/narrative/context.ts — extracted beats from generateBoutNarrative.
 * Code moved verbatim; dependencies arrive via the shared PbpPipeline.
 */
import type { PbpPipeline } from "./pipeline";
import { countMakuuchiTournaments, generateKyujoNarrative } from "./helpers";
import { BASHO_DAYS } from "../../../constants/engine/calendar";
import { H2H_STREAK_THRESHOLD, HEIGHT_DIFF_THRESHOLD, INJURY_MENTION_CHANCE, STYLE_DESC_CHANCE, WEIGHT_DIFF_THRESHOLD } from "../../../constants/engine/generation";
import { BardEngine } from "../../bard/BardEngine";

function beatCurrentRecords(p: PbpPipeline): void {
  const { day, east, eastLosses, eastWins, preBoutRng, push, west, westLosses, westWins } = p;
  // 3a-pre. Current basho records

  const eastHasRecord = eastWins > 0 || eastLosses > 0;
  const westHasRecord = westWins > 0 || westLosses > 0;
  if (day > 1 && eastHasRecord && westHasRecord) {
    const eastWinning = eastWins > eastLosses;
    const westWinning = westWins > westLosses;
    let recordPath: string;
    if (eastWins === westWins && eastLosses === westLosses) {
      if (eastWins >= 7 && day >= 10) {
        recordPath = "pre_bout.records.championship_elimination";
      } else {
        recordPath = "pre_bout.records.both_even";
      }
    } else if (eastWinning && westWinning) {
      recordPath = "pre_bout.records.both_contending";
    } else if (!eastWinning && !westWinning) {
      recordPath = "pre_bout.records.both_struggling";
    } else {
      recordPath = "pre_bout.records.one_struggling";
    }
    push(
      BardEngine.resolve(preBoutRng, recordPath, {
        EAST_NAME: east.shikona,
        WEST_NAME: west.shikona,
        EAST_WINS: eastWins.toString(),
        EAST_LOSSES: eastLosses.toString(),
        WEST_WINS: westWins.toString(),
        WEST_LOSSES: westLosses.toString(),
        DAY: day.toString(),
        eastRikishiId: east.id,
        westRikishiId: west.id,
      }).text,
      "pre_bout",
      []
    );
  }

}

function beatPrevBashoRecord(p: PbpPipeline): void {
  const { east, preBoutRng, push, west } = p;
  // 3a-pre2. Previous basho record
  const eastPrevBasho = east.careerHistory?.[east.careerHistory.length - 1];
  const westPrevBasho = west.careerHistory?.[west.careerHistory.length - 1];
  if (eastPrevBasho && westPrevBasho) {
    const eastRelevant =
      eastPrevBasho.isYusho || eastPrevBasho.absences >= 15 || eastPrevBasho.wins >= 10;
    const westRelevant =
      westPrevBasho.isYusho || westPrevBasho.absences >= 15 || westPrevBasho.wins >= 10;
    if (eastRelevant && westRelevant) {
      push(
        BardEngine.resolve(preBoutRng, "pre_bout.previous_basho.both_relevant", {
          EAST_NAME: east.shikona,
          WEST_NAME: west.shikona,
          EAST_PREV_WINS: eastPrevBasho.wins.toString(),
          EAST_PREV_LOSSES: eastPrevBasho.losses.toString(),
          WEST_PREV_WINS: westPrevBasho.wins.toString(),
          WEST_PREV_LOSSES: westPrevBasho.losses.toString(),
          eastRikishiId: east.id,
          westRikishiId: west.id,
        }).text,
        "pre_bout",
        []
      );
    } else if (eastRelevant || westRelevant) {
      const r = eastRelevant ? east : west;
      const prev = eastRelevant ? eastPrevBasho : westPrevBasho;
      let prevPath: string;
      if (prev.absences >= 15) {
        prevPath = "pre_bout.previous_basho.kyujo";
      } else if (prev.isYusho) {
        prevPath = "pre_bout.previous_basho.yusho";
      } else {
        prevPath = "pre_bout.previous_basho.standard";
      }
      push(
        BardEngine.resolve(preBoutRng, prevPath, {
          NAME: r.shikona,
          PREV_WINS: prev.wins.toString(),
          PREV_LOSSES: prev.losses.toString(),
          rikishiId: r.id,
        }).text,
        "pre_bout",
        []
      );
    }
  } else if (eastPrevBasho || westPrevBasho) {
    const r = eastPrevBasho ? east : west;
    const prev = eastPrevBasho ?? westPrevBasho;
    if (prev) {
      let prevPath: string;
      if (prev.absences >= 15) {
        prevPath = "pre_bout.previous_basho.kyujo";
      } else if (prev.isYusho) {
        prevPath = "pre_bout.previous_basho.yusho";
      } else {
        prevPath = "pre_bout.previous_basho.standard";
      }
      push(
        BardEngine.resolve(preBoutRng, prevPath, {
          NAME: r.shikona,
          PREV_WINS: prev.wins.toString(),
          PREV_LOSSES: prev.losses.toString(),
          rikishiId: r.id,
        }).text,
        "pre_bout",
        []
      );
    }
  }

}

function beatCareerHighRank(p: PbpPipeline): void {
  const { east, preBoutRng, push, west } = p;
  // 3a-pre3. Career-high rank detection
  for (const r of [east, west]) {
    if (!r.careerHistory || r.careerHistory.length === 0) continue;
    const currentRankNumber = r.rankNumber ?? 99;
    const isCareerHigh = r.careerHistory.every((s) => s.rankNumber >= currentRankNumber);
    if (isCareerHigh) {
      let careerHighPath: string;
      const isSanyaku = currentRankNumber <= 4;
      if (isSanyaku) {
        careerHighPath = "pre_bout.career_high.sanyaku";
      } else if (r.division === "juryo") {
        careerHighPath = "pre_bout.career_high.juryo";
      } else {
        careerHighPath = "pre_bout.career_high.makuuchi";
      }
      push(
        BardEngine.resolve(preBoutRng, careerHighPath, {
          NAME: r.shikona,
          RANK_NUMBER: currentRankNumber.toString(),
          rikishiId: r.id,
        }).text,
        "pre_bout",
        ["career_high"]
      );
    }
  }

}

function beatStoryline(p: PbpPipeline): void {
  const { day, east, preBoutRng, push, west } = p;
  // 3a-pre4. Storyline context: kachi-koshi chase, make-koshi avoidance, rookie, tournament count
  for (const r of [east, west]) {
    const rWins = r.currentBashoWins ?? 0;
    const rLosses = r.currentBashoLosses ?? 0;
    const threshold = 8;
    const needed = threshold - rWins;
    if (needed > 0 && needed <= 2 && rLosses < threshold && day < BASHO_DAYS) {
      push(
        BardEngine.resolve(preBoutRng, "pre_bout.storylines.kachi_chase", {
          NAME: r.shikona,
          NEEDED: needed.toString(),
          PLURAL: needed > 1 ? "s" : "",
          rikishiId: r.id,
        }).text,
        "pre_bout",
        ["kachi_koshi"]
      );
    }
    if (rLosses === threshold - 1 && rWins < threshold && day < BASHO_DAYS) {
      push(
        BardEngine.resolve(preBoutRng, "pre_bout.storylines.make_koshi_avoidance", {
          NAME: r.shikona,
          rikishiId: r.id,
        }).text,
        "pre_bout",
        ["make_koshi"]
      );
    }
  }

}

function beatSevenSeven(p: PbpPipeline): void {
  const { east, eastLosses, eastWins, preBoutRng, push, west, westLosses, westWins } = p;
  // 3a-pre5. 7-7 pressure — both rikishi at 7-7, everything on the line
  if (eastWins === 7 && eastLosses === 7 && westWins === 7 && westLosses === 7) {
    push(
      BardEngine.resolve(preBoutRng, "pre_bout.storylines.seven_seven", {
        EAST_NAME: east.shikona,
        WEST_NAME: west.shikona,
        eastRikishiId: east.id,
        westRikishiId: west.id,
      }).text,
      "pre_bout",
      ["title_stakes"]
    );
  }

}

function beatShikonaConferred(p: PbpPipeline): void {
  const { east, preBoutRng, push, west } = p;
  // 3a-pre6. Fighting name conferred early — rikishi carries shikona before sekitori
  for (const r of [east, west]) {
    if (r.shikonaConferredEarly) {
      push(
        BardEngine.resolve(preBoutRng, "pre_bout.storylines.fighting_name_early", {
          SHIKONA: r.shikona,
          rikishiId: r.id,
        }).text,
        "pre_bout",
        ["debut"]
      );
    }
  }

}

function beatRookieTourneyCount(p: PbpPipeline): void {
  const { east, preBoutRng, push, west } = p;
  // Rookie / tournament count
  for (const r of [east, west]) {
    if (!r.careerHistory) continue;
    const makuuchiCount = countMakuuchiTournaments(r.careerHistory);
    if (makuuchiCount === 0 && r.backstory) {
      push(
        BardEngine.resolve(preBoutRng, "pre_bout.debut_backstory", {
          SHIKONA: r.shikona,
          BACKSTORY: r.backstory,
          rikishiId: r.id,
        }).text,
        "pre_bout",
        ["rookie", "debut"]
      );
    } else if (makuuchiCount === 1) {
      push(
        BardEngine.resolve(preBoutRng, "pre_bout.storylines.rookie", {
          NAME: r.shikona,
          COUNT: makuuchiCount.toString(),
          rikishiId: r.id,
        }).text,
        "pre_bout",
        ["rookie"]
      );
    } else if (makuuchiCount > 1 && makuuchiCount <= 3) {
      push(
        BardEngine.resolve(preBoutRng, "pre_bout.storylines.rookie", {
          NAME: r.shikona,
          COUNT: makuuchiCount.toString(),
          rikishiId: r.id,
        }).text,
        "pre_bout",
        ["rookie"]
      );
    } else if (makuuchiCount >= 15) {
      push(
        BardEngine.resolve(preBoutRng, "pre_bout.storylines.tournament_count", {
          NAME: r.shikona,
          COUNT: makuuchiCount.toString(),
          rikishiId: r.id,
        }).text,
        "pre_bout",
        ["veteran"]
      );
    }
  }

}

function beatH2HStreak(p: PbpPipeline): void {
  const { east, preBoutRng, push, west } = p;
  // 3c. True H2H consecutive streak (from rikishi.h2h records)
  const eastH2h = east.h2h[west.id];
  if (eastH2h && Math.abs(eastH2h.streak) >= H2H_STREAK_THRESHOLD) {
    const isEastStreak = eastH2h.streak > 0;
    const path = isEastStreak ? "pre_bout.h2h_winning_streak" : "pre_bout.h2h_losing_streak";
    push(
      BardEngine.resolve(preBoutRng, path, {
        P1: east.shikona,
        P2: west.shikona,
        STREAK: Math.abs(eastH2h.streak).toString(),
        eastRikishiId: east.id,
        westRikishiId: west.id,
      }).text,
      "pre_bout",
      ["rivalry"]
    );
  }

}

function beatInjuryMention(p: PbpPipeline): void {
  const { east, preBoutRng, push, west } = p;
  // 3d. Injury mention (probabilistic, with sub-path selection)
  if (east.injured || west.injured) {
    const injuredRikishi = east.injured ? east : west;
    if (preBoutRng.next() < INJURY_MENTION_CHANCE) {
      const injuryStatus = injuredRikishi.injuryStatus;
      const currentInjury = injuredRikishi.currentInjury;
      const severity = injuryStatus?.severity ?? currentInjury?.severity;
      const area = injuryStatus?.location ?? currentInjury?.area ?? "leg";
      let injuryPath = "pre_bout.injury.generic";
      if (severity === "minor") {
        injuryPath = "pre_bout.injury.nagging";
      } else if (severity === "moderate" || severity === "serious") {
        injuryPath = "pre_bout.injury.struggling";
      } else if (area && area !== "leg") {
        injuryPath = "pre_bout.injury.specific_area";
      }
      push(
        BardEngine.resolve(preBoutRng, injuryPath, {
          SHIKONA: injuredRikishi.shikona,
          AREA: area,
          rikishiId: injuredRikishi.id,
        }).text,
        "pre_bout",
        ["injury"]
      );
    }
  }

}

function beatInjuryRecovery(p: PbpPipeline): void {
  const { east, preBoutRng, push, west, world } = p;
  // 3d-2. Injury recovery narrative (6.3): rikishi returning from injury
  for (const r of [east, west]) {
    if (r.recentlyReturnedFromInjury && !r.injured) {
      push(
        BardEngine.resolve(preBoutRng, "pre_bout.injury_return", {
          SHIKONA: r.shikona,
          rikishiId: r.id,
        }).text,
        "pre_bout",
        ["comeback", "injury"]
      );

      // Also generate the kyujo return narrative line
      const kyujoReturnLines = generateKyujoNarrative(
        r,
        "return_from_kyujo",
        { bashosMissed: 1 },
        `return-kyujo-${r.id}-${world.year}-${world.currentBashoName ?? ""}`
      );
      for (const line of kyujoReturnLines) {
        push(line.text, "pre_bout", ["comeback", "injury"]);
      }
    }
  }

}

function beatOzekiDemotionComeback(p: PbpPipeline): void {
  const { east, preBoutRng, push, west } = p;
  // 3d-3. Ozeki demotion comeback narrative
  for (const r of [east, west]) {
    if (r.wasDemotedFromOzeki) {
      push(
        BardEngine.resolve(preBoutRng, "pre_bout.ozeki_demotion_comeback", {
          SHIKONA: r.shikona,
          rikishiId: r.id,
        }).text,
        "pre_bout",
        ["comeback", "ozeki_demotion"]
      );
    }
  }

}

function beatSonOfStablemaster(p: PbpPipeline): void {
  const { east, preBoutRng, push, west } = p;
  // 3d-4. Son of stablemaster narrative
  for (const r of [east, west]) {
    if (r.isSonOfStablemaster) {
      push(
        BardEngine.resolve(preBoutRng, "pre_bout.son_of_stablemaster", {
          SHIKONA: r.shikona,
          rikishiId: r.id,
        }).text,
        "pre_bout",
        ["son_of_stablemaster"]
      );
    }
  }

}

function beatPhysicalComparison(p: PbpPipeline): void {
  const { east, preBoutRng, push, west } = p;
  // 3e. Physical comparison (weight/height diff)
  const weightDiff = Math.abs(east.weight - west.weight);
  const heightDiff = Math.abs(east.height - west.height);
  if (weightDiff >= WEIGHT_DIFF_THRESHOLD || heightDiff >= HEIGHT_DIFF_THRESHOLD) {
    const heavier = east.weight >= west.weight ? east : west;
    const lighter = east.weight >= west.weight ? west : east;
    push(
      BardEngine.resolve(preBoutRng, "pre_bout.physical_comparison", {
        HEAVIER: heavier.shikona,
        LIGHTER: lighter.shikona,
        WEIGHT_DIFF: weightDiff.toString(),
        HEIGHT_DIFF: heightDiff.toString(),
        heavierRikishiId: heavier.id,
        lighterRikishiId: lighter.id,
      }).text,
      "pre_bout",
      ["weight_diff"]
    );
  }

}

function beatStyleDescription(p: PbpPipeline): void {
  const { east, preBoutRng, push, west } = p;
  // 3f. Fighting style description (probabilistic)
  if (preBoutRng.next() < STYLE_DESC_CHANCE) {
    const eastArchetype = east.combatProfile?.archetype ?? "hybrid";
    const westArchetype = west.combatProfile?.archetype ?? "hybrid";
    push(
      BardEngine.resolve(preBoutRng, "pre_bout.style_matchup", {
        EAST: east.shikona,
        WEST: west.shikona,
        EAST_STYLE: eastArchetype,
        WEST_STYLE: westArchetype,
        eastRikishiId: east.id,
        westRikishiId: west.id,
      }).text,
      "pre_bout",
      []
    );
  }

}

export function narrateRecords(p: PbpPipeline): void {
  beatCurrentRecords(p);
  beatPrevBashoRecord(p);
  beatCareerHighRank(p);
  beatStoryline(p);
  beatSevenSeven(p);
  beatShikonaConferred(p);
  beatRookieTourneyCount(p);
  beatH2HStreak(p);
  beatInjuryMention(p);
  beatInjuryRecovery(p);
  beatOzekiDemotionComeback(p);
  beatSonOfStablemaster(p);
  beatPhysicalComparison(p);
  beatStyleDescription(p);
}
