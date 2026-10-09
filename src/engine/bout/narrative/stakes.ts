/**
 * bout/narrative/stakes.ts — extracted beats from generateBoutNarrative.
 * Code moved verbatim; dependencies arrive via the shared PbpPipeline.
 */
import type { PbpPipeline } from "./pipeline";
import type { PbpTag } from "./pbpTypes";
import { BASHO_DAYS, BIRTHDAY_WINDOW_DAYS, FIRST_WIN_MENTION_MIN_DAY, LEADERBOARD_MIN_LEADER_WINS, WINLESS_MENTION_MIN_DAY } from "../../../constants/engine/generation";
import { BardEngine } from "../../bard/BardEngine";
import { isPlayoffScenario, isYushoContention } from "../boutContention";

function beatHometown(p: PbpPipeline): void {
  const { bashoInfo, east, preBoutRng, push, west } = p;
  // 3k. Hometown angle
  if (east.origin && west.origin && east.origin !== west.origin) {
    const bashoLocation = bashoInfo?.location;
    if (bashoLocation && (east.origin === bashoLocation || west.origin === bashoLocation)) {
      const hometownRikishi = east.origin === bashoLocation ? east : west;
      push(
        BardEngine.resolve(preBoutRng, "pre_bout.hometown", {
          SHIKONA: hometownRikishi.shikona,
          LOCATION: bashoLocation,
          rikishiId: hometownRikishi.id,
        }).text,
        "pre_bout",
        ["hometown"]
      );
    }
  }

}

function beatBirthday(p: PbpPipeline): void {
  const { bashoInfo, day, east, preBoutRng, push, west } = p;
  // 3l. Birthday mention (within BIRTHDAY_WINDOW_DAYS of current basho day)
  if (bashoInfo) {
    for (const r of [east, west]) {
      if (r.birthMonth && r.birthDay && r.birthMonth === bashoInfo.month) {
        const dayDiff = Math.abs(r.birthDay - day);
        if (dayDiff <= BIRTHDAY_WINDOW_DAYS) {
          push(
            BardEngine.resolve(preBoutRng, "pre_bout.birthday", {
              SHIKONA: r.shikona,
              AGE: (r.age ?? 0).toString(),
              rikishiId: r.id,
            }).text,
            "pre_bout",
            ["birthday"]
          );
        }
      }
    }
  }

}

function beatWinlessFirstWin(p: PbpPipeline): void {
  const { day, east, eastLosses, eastWins, preBoutRng, push, west, westLosses, westWins } = p;
  // 3m. Winless / first win callout
  if (day >= WINLESS_MENTION_MIN_DAY) {
    if (eastWins === 0 && eastLosses >= day - 1) {
      push(
        BardEngine.resolve(preBoutRng, "pre_bout.winless", {
          SHIKONA: east.shikona,
          LOSSES: eastLosses.toString(),
          rikishiId: east.id,
        }).text,
        "pre_bout",
        ["winless"]
      );
    }
    if (westWins === 0 && westLosses >= day - 1) {
      push(
        BardEngine.resolve(preBoutRng, "pre_bout.winless", {
          SHIKONA: west.shikona,
          LOSSES: westLosses.toString(),
          rikishiId: west.id,
        }).text,
        "pre_bout",
        ["winless"]
      );
    }
  }
  if (day >= FIRST_WIN_MENTION_MIN_DAY) {
    if (eastWins === 1 && eastLosses >= day - 2) {
      push(
        BardEngine.resolve(preBoutRng, "pre_bout.first_win", {
          SHIKONA: east.shikona,
          rikishiId: east.id,
        }).text,
        "pre_bout",
        ["comeback"]
      );
    }
    if (westWins === 1 && westLosses >= day - 2) {
      push(
        BardEngine.resolve(preBoutRng, "pre_bout.first_win", {
          SHIKONA: west.shikona,
          rikishiId: west.id,
        }).text,
        "pre_bout",
        ["comeback"]
      );
    }
  }

}

function beatTournamentDay(p: PbpPipeline): void {
  const { day, east, preBoutRng, push, west } = p;
  // 3n. Tournament day context
  if (day === BASHO_DAYS) {
    // Final day — emit both senshuraku and final_day templates
    push(
      BardEngine.resolve(preBoutRng, "pre_bout.senshuraku", {
        eastRikishiId: east.id,
        westRikishiId: west.id,
      }).text,
      "pre_bout",
      ["senshuraku", "tournament_context"]
    );
    push(
      BardEngine.resolve(preBoutRng, "pre_bout.final_day", {
        eastRikishiId: east.id,
        westRikishiId: west.id,
      }).text,
      "pre_bout",
      ["tournament_context"]
    );
  } else if (day === BASHO_DAYS - 1) {
    push(
      BardEngine.resolve(preBoutRng, "pre_bout.penultimate", {
        eastRikishiId: east.id,
        westRikishiId: west.id,
      }).text,
      "pre_bout",
      ["tournament_context"]
    );
  } else if (day === 1) {
    push(
      BardEngine.resolve(preBoutRng, "pre_bout.opening_day", {
        eastRikishiId: east.id,
        westRikishiId: west.id,
      }).text,
      "pre_bout",
      ["tournament_context"]
    );
  } else if (day >= 2 && day <= 4) {
    push(
      BardEngine.resolve(preBoutRng, "pre_bout.early_days", {
        DAY: day.toString(),
        eastRikishiId: east.id,
        westRikishiId: west.id,
      }).text,
      "pre_bout",
      ["tournament_context"]
    );
  } else if (day >= 5 && day <= 9) {
    push(
      BardEngine.resolve(preBoutRng, "pre_bout.mid_tournament", {
        DAY: day.toString(),
        eastRikishiId: east.id,
        westRikishiId: west.id,
      }).text,
      "pre_bout",
      ["tournament_context"]
    );
  } else if (day >= 10 && day <= 13) {
    push(
      BardEngine.resolve(preBoutRng, "pre_bout.late_tournament", {
        DAY: day.toString(),
        eastRikishiId: east.id,
        westRikishiId: west.id,
      }).text,
      "pre_bout",
      ["tournament_context"]
    );
  }

}

function beatTitleStakes(p: PbpPipeline): void {
  const { east, preBoutRng, push, result, west } = p;
  // 3o. Title stakes / yusho race context
  if (result.isYushoRace || result.isTitleStakes) {
    const tags: PbpTag[] = result.isYushoRace ? ["yusho_race"] : ["title_stakes"];
    push(
      BardEngine.resolve(preBoutRng, "pre_bout.title_stakes", {
        EAST: east.shikona,
        WEST: west.shikona,
        eastRikishiId: east.id,
        westRikishiId: west.id,
      }).text,
      "pre_bout",
      tags
    );
  }

}

function beatLeaderboard(p: PbpPipeline): void {
  const { day, preBoutRng, push, world } = p;
  // 3p. Leaderboard summary (days 5+, when leader has enough wins)
  if (day >= 5 && world.currentBasho) {
    const standings = world.currentBasho.standings;
    let maxWins = 0;
    const leaders: string[] = [];
    let chasers = 0;
    for (const [rid, rec] of standings) {
      const w = rec.wins;
      if (w > maxWins) {
        maxWins = w;
        leaders.length = 0;
        const r = world.rikishi.get(rid);
        if (r) leaders.push(r.shikona);
      } else if (w === maxWins) {
        const r = world.rikishi.get(rid);
        if (r) leaders.push(r.shikona);
      } else if (w === maxWins - 1) {
        chasers++;
      }
    }
    if (maxWins >= LEADERBOARD_MIN_LEADER_WINS && leaders.length > 0) {
      const leaderNames = leaders.length === 1 ? leaders[0] : leaders.slice(0, 2).join(" and ");
      const isCoLeaders = leaders.length >= 2;
      push(
        BardEngine.resolve(
          preBoutRng,
          isCoLeaders ? "pre_bout.leaderboard_co_leaders" : "pre_bout.leaderboard",
          {
            SHIKONA: leaderNames,
            WINS: maxWins.toString(),
            CHASERS: chasers.toString(),
          }
        ).text,
        "pre_bout",
        ["tournament_context"]
      );
    }
  }

}

function beatPlayoffImplications(p: PbpPipeline): void {
  const { east, preBoutRng, push, west, world } = p;
  // 3p2. Yusho contention / playoff implications
  if (world.currentBasho) {
    if (isYushoContention(east, west, world.currentBasho)) {
      push(
        BardEngine.resolve(preBoutRng, "pre_bout.yusho_race", {
          EAST: east.shikona,
          WEST: west.shikona,
          eastRikishiId: east.id,
          westRikishiId: west.id,
        }).text,
        "pre_bout",
        ["yusho_race"]
      );
    }
    if (isPlayoffScenario(east, west, world.currentBasho)) {
      push(
        BardEngine.resolve(preBoutRng, "pre_bout.playoff_implications", {
          EAST: east.shikona,
          WEST: west.shikona,
          eastRikishiId: east.id,
          westRikishiId: west.id,
        }).text,
        "pre_bout",
        ["yusho_race"]
      );
    }
  }

}

function beatKenshoMention(p: PbpPipeline): void {
  const { east, preBoutRng, push, result, west } = p;
  // 3p3. Pre-bout kensho mention (7.3): sponsor interest when high kensho expected
  if (result.kenshoEnvelopes > 3) {
    push(
      BardEngine.resolve(preBoutRng, "pre_bout.kensho", {
        BANNERS: result.kenshoEnvelopes.toString(),
        EAST: east.shikona,
        WEST: west.shikona,
        eastRikishiId: east.id,
        westRikishiId: west.id,
      }).text,
      "pre_bout",
      ["kensho"]
    );
  }

}

function beatBoutOfTheDay(p: PbpPipeline): void {
  const { east, preBoutRng, push, result, west } = p;
  // 3p4. Bout of the day designation (Gap 6): high-drama matchup
  if (
    result.dramaticContext &&
    (result.dramaticContext.score >= 85 ||
      result.dramaticContext.label === "make_or_break" ||
      result.dramaticContext.label === "grudge_match")
  ) {
    push(
      BardEngine.resolve(preBoutRng, "pre_bout.bout_of_the_day", {
        EAST: east.shikona,
        WEST: west.shikona,
        eastRikishiId: east.id,
        westRikishiId: west.id,
      }).text,
      "pre_bout",
      ["tournament_context"]
    );
  }

}

export function narrateStakes(p: PbpPipeline): void {
  beatHometown(p);
  beatBirthday(p);
  beatWinlessFirstWin(p);
  beatTournamentDay(p);
  beatTitleStakes(p);
  beatLeaderboard(p);
  beatPlayoffImplications(p);
  beatKenshoMention(p);
  beatBoutOfTheDay(p);
}
