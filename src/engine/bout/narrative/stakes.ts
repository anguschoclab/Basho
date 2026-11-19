/**
 * bout/narrative/stakes.ts — extracted beats from generateBoutNarrative.
 * Code moved verbatim; dependencies arrive via the shared PbpPipeline.
 */
import type { PbpPipeline } from "@/engine/bout/narrative/pipeline";
import type { PbpTag } from "@/engine/bout/narrative/pbpTypes";
import { BASHO_DAYS } from "@/constants/engine/calendar";
import {
  BIRTHDAY_WINDOW_DAYS,
  FIRST_WIN_MENTION_MIN_DAY,
  IRON_MAN_BEAT_THRESHOLD,
  LEADERBOARD_MIN_LEADER_WINS,
  OLDEST_DIVISION_AGE,
  WINLESS_MENTION_MIN_DAY,
} from "@/constants/engine/generation";
import { NAKABI_DAY } from "@/engine/basho/NakabiService";
import { BardEngine } from "@/engine/bard/BardEngine";
import { hometownTier, bashoRegionLabel } from "@/engine/basho/geography";
import { isPlayoffScenario, isYushoContention } from "@/engine/bout/boutContention";
import { getKimarite } from "@/engine/bout/kimarite/kimariteRegistry";
import { isSanyakuRank, getRankDisplayEntry, DIVISION_NAMES } from "@/constants/engine/rankDisplay";
import { BASHO_NAMES } from "@/constants/ui/calendar";
import { isLowerBodyArea } from "@/engine/health/BodyDefinitions";
import type { Division } from "@/engine/types/banzuke";
import { kachiKoshiThreshold } from "@/engine/banzuke/banzukeHelpers";
import { countKachiKoshiDrought } from "@/engine/bout/narrative/helpers";
import {
  KACHI_DROUGHT_MIN_BASHO,
  LOSING_SKID_MIN,
  PROVEN_GIANT_KILLER_MAX_AGE,
} from "@/constants/engine/narrative";

function beatHometown(p: PbpPipeline): void {
  const { bashoInfo, east, preBoutRng, push, west } = p;
  // 3k. Hometown angle — tiered (W E): host-prefecture natives get the
  // home-crowd line; same-region natives get the regional-support line so
  // a Kumamoto man hears the Kyushu crowd in Fukuoka.
  if (east.origin && west.origin && east.origin !== west.origin) {
    const bashoLocation = bashoInfo?.location;
    const eastTier = hometownTier(east.origin, bashoLocation);
    const westTier = hometownTier(west.origin, bashoLocation);
    // Prefer the stronger tier when both sides qualify (can't both be home).
    const hometownRikishi =
      eastTier === "home" ? east : westTier === "home" ? west : eastTier ? east : west;
    const tier = hometownRikishi === east ? eastTier : westTier;
    if (tier) {
      const templatePath =
        tier === "home" ? "pre_bout.hometown" : "pre_bout.hometown_region";
      push(
        BardEngine.resolve(preBoutRng, templatePath, {
          SHIKONA: hometownRikishi.shikona,
          LOCATION: bashoLocation,
          REGION: bashoRegionLabel(bashoLocation) ?? bashoLocation,
          ORIGIN: hometownRikishi.origin ?? "",
          rikishiId: hometownRikishi.id,
        }).text,
        "pre_bout",
        ["hometown"]
      );
    }
  } else if (east.origin && west.origin && east.origin === west.origin) {
    const tier = hometownTier(east.origin, bashoInfo?.location);
    if (tier) {
      push(
        BardEngine.resolve(preBoutRng, "pre_bout.prefecture_showdown_local", {
          EAST: east.shikona,
          WEST: west.shikona,
          ORIGIN: east.origin,
          REGION: bashoRegionLabel(bashoInfo?.location) ?? bashoInfo?.location ?? "",
          eastRikishiId: east.id,
          westRikishiId: west.id,
        }).text,
        "pre_bout",
        ["hometown", "prefecture_showdown"]
      );
    } else {
      push(
        BardEngine.resolve(preBoutRng, "pre_bout.prefecture_showdown", {
          EAST: east.shikona,
          WEST: west.shikona,
          ORIGIN: east.origin,
          eastRikishiId: east.id,
          westRikishiId: west.id,
        }).text,
        "pre_bout",
        ["hometown", "prefecture_showdown"]
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
        const dayDiff = r.birthDay - day;
        const age = r.age ?? 0;
        if (dayDiff === 1) {
          // Tomorrow's birthday — "last bout as a N-year-old"
          push(
            BardEngine.resolve(preBoutRng, "pre_bout.birthday_eve", {
              SHIKONA: r.shikona,
              AGE: age.toString(),
              NEXT_AGE: (age + 1).toString(),
              rikishiId: r.id,
            }).text,
            "pre_bout",
            ["birthday"]
          );
        } else if (dayDiff === 0) {
          push(
            BardEngine.resolve(preBoutRng, "pre_bout.birthday_exact", {
              SHIKONA: r.shikona,
              AGE: age.toString(),
              rikishiId: r.id,
            }).text,
            "pre_bout",
            ["birthday"]
          );
        } else if (Math.abs(dayDiff) <= BIRTHDAY_WINDOW_DAYS) {
          push(
            BardEngine.resolve(preBoutRng, "pre_bout.birthday", {
              SHIKONA: r.shikona,
              AGE: age.toString(),
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
  } else if (day === NAKABI_DAY) {
    push(
      BardEngine.resolve(preBoutRng, "pre_bout.nakabi", {
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
  const { day, east, preBoutRng, push, world } = p;
  // 3p. Leaderboard summary (days 5+, when leader has enough wins) — scoped
  // to the bout's division; the standings map mixes every division.
  if (day >= 5 && world.currentBasho) {
    const standings = world.currentBasho.standings;
    let maxWins = 0;
    const leaders: string[] = [];
    let chasers = 0;
    for (const [rid, rec] of standings) {
      const r = world.rikishi.get(rid);
      if (!r || r.division !== east.division) continue;
      const w = rec.wins;
      if (w > maxWins) {
        maxWins = w;
        leaders.length = 0;
        leaders.push(r.shikona);
      } else if (w === maxWins) {
        leaders.push(r.shikona);
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
    if (isYushoContention(east, west, world.currentBasho, world)) {
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
    if (isPlayoffScenario(east, west, world.currentBasho, world)) {
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

function beatHurtLowerBody(p: PbpPipeline): void {
  const { east, preBoutRng, push, west } = p;
  // W N — "the feet aren't moving well… that injury to the knee is
  // hampering his sumo": pre-bout note when an entered man carries a
  // lower-body knock. One line even when both sides are hurt.
  for (const r of [east, west]) {
    if (!r.injured) continue;
    const area = r.injuryStatus?.location;
    if (!isLowerBodyArea(area)) continue;
    push(
      BardEngine.resolve(preBoutRng, "pre_bout.hurt_lower_body", {
        SHIKONA: r.shikona,
        AREA: area ?? "",
        rikishiId: r.id,
      }).text,
      "pre_bout",
      ["hurt_lower_body", "injury"]
    );
    break;
  }
}

function findKyujoSibling(
  world: PbpPipeline["world"],
  focal: PbpPipeline["east"]
): PbpPipeline["east"] | undefined {
  for (const sibId of focal.siblingIds ?? []) {
    const sib = world.rikishi.get(sibId);
    if (sib?.isKyujo) return sib;
  }
  return undefined;
}

function beatSiblingLead(p: PbpPipeline): void {
  const { east, preBoutRng, push, west, world } = p;
  // W N — "his brother is sharing the lead down in Juryo": a combatant's
  // sibling sits atop a DIFFERENT division's table. The standings map is
  // flat across divisions, so the lead is computed per-division.
  const standings = world.currentBasho?.standings;
  if (!standings) return;
  // Per-division win maxima in one pass — the standings map is flat across
  // divisions, so "the lead" only means anything per division.
  const divisionMax = new Map<Division, number>();
  for (const [rid, rec] of standings) {
    const rr = world.rikishi.get(rid);
    if (!rr?.division) continue;
    if (rec.wins > (divisionMax.get(rr.division) ?? 0)) {
      divisionMax.set(rr.division, rec.wins);
    }
  }
  let emitted = false;
  for (const focal of [east, west]) {
    const sibId = focal.siblingIds?.[0];
    if (!sibId) continue;
    const sib = world.rikishi.get(sibId);
    if (!sib || sib.division === focal.division) continue;
    const sibWins = standings.get(sibId)?.wins ?? sib.currentBashoWins ?? 0;
    if (sibWins === 0) continue;
    if (sibWins < (divisionMax.get(sib.division) ?? 0)) continue;
    push(
      BardEngine.resolve(preBoutRng, "pre_bout.sibling_lead", {
        SHIKONA: focal.shikona,
        SIBLING: sib.shikona,
        DIVISION: DIVISION_NAMES[sib.division] ?? sib.division ?? "",
        WINS: sibWins.toString(),
        rikishiId: focal.id,
        siblingId: sib.id,
      }).text,
      "pre_bout",
      ["sibling_lead"]
    );
    emitted = true;
    break;
  }
  if (!emitted) {
    for (const focal of [east, west]) {
      const sib = findKyujoSibling(world, focal);
      if (!sib) continue;
      push(
        BardEngine.resolve(preBoutRng, "pre_bout.sibling_kyujo", {
          SHIKONA: focal.shikona,
          SIBLING: sib.shikona,
          rikishiId: focal.id,
          siblingId: sib.id,
        }).text,
        "pre_bout",
        ["sibling_kyujo"]
      );
      break;
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

function beatOzekiShowdown(p: PbpPipeline): void {
  const { east, preBoutRng, push, west } = p;
  // 3p5. Ozeki showdown — two ozeki meeting is a rare marquee matchup
  if (east.rank === "ozeki" && west.rank === "ozeki") {
    push(
      BardEngine.resolve(preBoutRng, "pre_bout.ozeki_showdown", {
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

function beatCoLeader(p: PbpPipeline): void {
  const { day, east, preBoutRng, push, west, world } = p;
  // 3p6. Co-leader callout — a participant tied for the lead gets the
  // "co-leader X at W-L" framing broadcasts use.
  if (day >= 5 && world.currentBasho) {
    const standings = world.currentBasho.standings;
    let maxWins = 0;
    let leaders = 0;
    for (const [rid, rec] of standings) {
      if (world.rikishi.get(rid)?.division !== east.division) continue;
      if (rec.wins > maxWins) {
        maxWins = rec.wins;
        leaders = 1;
      } else if (rec.wins === maxWins) {
        leaders++;
      }
    }
    if (leaders >= 2) {
      for (const r of [east, west]) {
        const rec = standings.get(r.id);
        const wins = rec?.wins ?? r.currentBashoWins ?? 0;
        const losses = rec?.losses ?? r.currentBashoLosses ?? 0;
        if (wins === maxWins) {
          push(
            BardEngine.resolve(preBoutRng, "pre_bout.co_leader", {
              SHIKONA: r.shikona,
              WINS: wins.toString(),
              LOSSES: losses.toString(),
              rikishiId: r.id,
            }).text,
            "pre_bout",
            ["yusho_race"]
          );
        }
      }
    }
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

function beatIronMan(p: PbpPipeline): void {
  const { east, preBoutRng, push, west } = p;
  // W F: the Iron Man streak — consecutive basho with zero absences.
  for (const r of [east, west]) {
    const streak = r.consecutiveBashoFought ?? 0;
    if (streak >= IRON_MAN_BEAT_THRESHOLD) {
      push(
        BardEngine.resolve(preBoutRng, "pre_bout.iron_man", {
          SHIKONA: r.shikona,
          STREAK: streak.toString(),
          rikishiId: r.id,
        }).text,
        "pre_bout",
        ["iron_man"]
      );
      break; // one line per bout even if both qualify
    }
  }
}

function beatOldestDivision(p: PbpPipeline): void {
  const { east, eastAge, preBoutRng, push, west, westAge } = p;
  // W F: veteran-longevity framing for the division's elder statesman.
  const elder = eastAge >= westAge ? { r: east, age: eastAge } : { r: west, age: westAge };
  if (elder.age >= OLDEST_DIVISION_AGE) {
    push(
      BardEngine.resolve(preBoutRng, "pre_bout.oldest_division", {
        SHIKONA: elder.r.shikona,
        AGE: elder.age.toString(),
        rikishiId: elder.r.id,
      }).text,
      "pre_bout",
      ["oldest_division", "veteran"]
    );
  }
}

function beatMakuuchiBoutMilestone(p: PbpPipeline): void {
  const { east, preBoutRng, push, west } = p;
  // W F: top-division bout count hitting a round hundred.
  for (const r of [east, west]) {
    const bouts =
      (r.divisionRecords?.makuuchi?.wins ?? 0) + (r.divisionRecords?.makuuchi?.losses ?? 0);
    const next = bouts + 1;
    if (next >= 100 && next % 100 === 0) {
      push(
        BardEngine.resolve(preBoutRng, "pre_bout.makuuchi_bout_milestone", {
          SHIKONA: r.shikona,
          MILESTONE: next.toString(),
          rikishiId: r.id,
        }).text,
        "pre_bout",
        ["makuuchi_milestone", "milestone"]
      );
    }
  }
}

function beatOriginFirst(p: PbpPipeline): void {
  const { east, preBoutRng, push, west } = p;
  // W F: origin-first flag set at banzuke publish for this basho.
  for (const r of [east, west]) {
    if (r.firstFromOriginThisBasho && r.origin) {
      push(
        BardEngine.resolve(preBoutRng, "pre_bout.origin_first", {
          SHIKONA: r.shikona,
          ORIGIN: r.origin,
          rikishiId: r.id,
        }).text,
        "pre_bout",
        ["origin_first"]
      );
      break;
    }
  }
}

function beatGripPreview(p: PbpPipeline): void {
  const { east, preBoutRng, push, west } = p;
  // W G: broadcast note on a rikishi's preferred grip heading into the bout.
  const GRIP_LABELS: Record<string, string> = {
    migi: "right-inside",
    hidari: "left-inside",
  };
  for (const r of [east, west]) {
    const pref = r.combatProfile?.preferredGrip;
    if (pref && pref !== "none") {
      push(
        BardEngine.resolve(preBoutRng, "pre_bout.grip_preview", {
          SHIKONA: r.shikona,
          GRIP_LABEL: GRIP_LABELS[pref],
          rikishiId: r.id,
        }).text,
        "pre_bout",
        ["grip_preview"]
      );
      break; // one preview per bout
    }
  }
}

function beatOneKimariteStreak(p: PbpPipeline): void {
  const { east, preBoutRng, push, west, world } = p;
  // W G: every win this basho by the same kimarite (≥3 wins).
  const metrics = world?.currentBasho?.boutMetrics;
  if (!metrics) return;
  for (const r of [east, west]) {
    const used = metrics[r.id]?.kimariteUsed;
    if (!used) continue;
    const entries = Object.entries(used).filter(([, count]) => (count ?? 0) > 0);
    const wins = entries.reduce((acc, [, count]) => acc + (count ?? 0), 0);
    if (entries.length === 1 && wins >= 3) {
      const kimariteId = entries[0][0];
      const kimariteName = getKimarite(kimariteId)?.name ?? kimariteId;
      push(
        BardEngine.resolve(preBoutRng, "pre_bout.one_kimarite_streak", {
          SHIKONA: r.shikona,
          KIMARITE: kimariteName,
          rikishiId: r.id,
        }).text,
        "pre_bout",
        ["one_kimarite", "streak"]
      );
    }
  }
}

function beatBonds(p: PbpPipeline): void {
  const { east, preBoutRng, push, west } = p;
  // W H: school + keiko bonds. Siblings never pair (matchmaking rejects).
  if (
    east.schoolOrigin &&
    east.schoolOrigin === west.schoolOrigin &&
    east.heyaId !== west.heyaId
  ) {
    push(
      BardEngine.resolve(preBoutRng, "pre_bout.schoolmates", {
        SCHOOL: east.schoolOrigin,
        EAST: east.shikona,
        WEST: west.shikona,
        eastRikishiId: east.id,
        westRikishiId: west.id,
      }).text,
      "pre_bout",
      ["schoolmates"]
    );
  }
  if (
    east.practicePartners?.includes(west.id) ||
    west.practicePartners?.includes(east.id)
  ) {
    push(
      BardEngine.resolve(preBoutRng, "pre_bout.practice_partners", {
        EAST: east.shikona,
        WEST: west.shikona,
        eastRikishiId: east.id,
        westRikishiId: west.id,
      }).text,
      "pre_bout",
      ["practice_partners"]
    );
  }
}

const W9_GRIP_LABELS: Record<string, string> = {
  migi: "right-inside",
  hidari: "left-inside",
};

const W9_DIVISION_LABELS: Partial<Record<Division, string>> = {
  makuuchi: "the top division",
  juryo: "Juryo",
  makushita: "Makushita",
  sandanme: "Sandanme",
  jonidan: "Jonidan",
  jonokuchi: "Jonokuchi",
};

const MEETING_MILESTONES = new Set([10, 20, 30, 40, 50, 75, 100]);

function beatSignatureGrip(p: PbpPipeline): void {
  const { east, preBoutRng, push, west, world } = p;
  // W M: a preferrer who wins day after day once he lands his grip.
  const metrics = world?.currentBasho?.boutMetrics;
  if (!metrics) return;
  for (const r of [east, west]) {
    const pref = r.combatProfile?.preferredGrip;
    if (pref !== "migi" && pref !== "hidari") continue;
    const m = metrics[r.id];
    const secured = m?.preferredGripSecured ?? 0;
    const gripWins = m?.preferredGripWins ?? 0;
    if (secured < 3 || gripWins / secured < 0.7) continue;
    push(
      BardEngine.resolve(preBoutRng, "pre_bout.signature_grip", {
        SHIKONA: r.shikona,
        GRIP_LABEL: W9_GRIP_LABELS[pref],
        GRIP_WINS: gripWins,
        GRIP_BOUTS: secured,
        rikishiId: r.id,
      }).text,
      "pre_bout",
      ["signature_grip", "favorite_grip"]
    );
    break; // one reputation line per bout
  }
}

function beatDivisionSplit(p: PbpPipeline): void {
  const { east, preBoutRng, push, west } = p;
  // W M: dominant in the division below, winless up here.
  for (const r of [east, west]) {
    const records = r.divisionRecords;
    const current = r.division ? records?.[r.division] : undefined;
    if (!records || !current) continue;
    const currentBouts = current.wins + current.losses;
    if (currentBouts < 8 || current.wins / currentBouts > 0.4) continue;
    let bestDivision: Division | undefined;
    let bestRate = 0;
    for (const [div, rec] of Object.entries(records) as [Division, { wins: number; losses: number }][]) {
      if (div === r.division) continue;
      const bouts = rec.wins + rec.losses;
      const rate = bouts >= 10 ? rec.wins / bouts : 0;
      if (rate > bestRate) {
        bestRate = rate;
        bestDivision = div;
      }
    }
    if (!bestDivision || bestRate < 0.6) continue;
    push(
      BardEngine.resolve(preBoutRng, "pre_bout.division_split", {
        SHIKONA: r.shikona,
        LOWER_DIVISION: W9_DIVISION_LABELS[bestDivision] ?? bestDivision,
        CURRENT_DIVISION: W9_DIVISION_LABELS[r.division as Division] ?? r.division,
        rikishiId: r.id,
      }).text,
      "pre_bout",
      ["division_split"]
    );
    break;
  }
}

function beatMeetingMilestone(p: PbpPipeline): void {
  const { east, pair, preBoutRng, push, west } = p;
  // W M: "meeting for the 30th time" — round-number career meetings.
  if (!pair) return;
  const meetings = pair.meetings + 1;
  if (!MEETING_MILESTONES.has(meetings)) return;
  push(
    BardEngine.resolve(preBoutRng, "pre_bout.meeting_milestone", {
      EAST: east.shikona,
      WEST: west.shikona,
      MEETINGS: meetings,
      eastRikishiId: east.id,
      westRikishiId: west.id,
    }).text,
    "pre_bout",
    ["meeting_milestone", "rivalry"]
  );
}

function beatFirstTopDivisionMeeting(p: PbpPipeline): void {
  const { east, pair, preBoutRng, push, west } = p;
  // W M: first top-division meeting despite prior meetings below. Every
  // recorded meeting must carry a division tag (post-W M logs only) and be
  // non-makuuchi — otherwise the claim could be wrong about legacy data.
  if (!pair || pair.meetings < 1) return;
  if (east.division !== "makuuchi" && west.division !== "makuuchi") return;
  const mutual = (east.history ?? []).filter((h) => h.opponentId === west.id);
  const tagged = mutual.filter((h) => h.division !== undefined);
  if (tagged.length !== pair.meetings || tagged.length === 0) return;
  if (tagged.some((h) => h.division === "makuuchi")) return;
  const counts = new Map<Division, number>();
  for (const h of tagged) counts.set(h.division as Division, (counts.get(h.division as Division) ?? 0) + 1);
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  push(
    BardEngine.resolve(preBoutRng, "pre_bout.first_top_division", {
      EAST: east.shikona,
      WEST: west.shikona,
      LOWER_DIVISION: top ? (W9_DIVISION_LABELS[top] ?? top) : "the lower divisions",
      MEETINGS: pair.meetings,
      eastRikishiId: east.id,
      westRikishiId: west.id,
    }).text,
    "pre_bout",
    ["first_top_division", "rivalry"]
  );
}

function beatSanyakuArcs(p: PbpPipeline): void {
  const { east, preBoutRng, push, west } = p;
  for (const r of [east, west]) {
    const wins = r.currentBashoWins ?? 0;
    const losses = r.currentBashoLosses ?? 0;
    // Shin-sanyaku growing pains: promoted this basho, record under water.
    if (r.sanyakuPromotionThisBasho && losses > wins) {
      push(
        BardEngine.resolve(preBoutRng, "pre_bout.shin_sanyaku", {
          SHIKONA: r.shikona,
          RANK: getRankDisplayEntry(r.rank ?? "")?.en ?? r.rank ?? "sanyaku",
          rikishiId: r.id,
        }).text,
        "pre_bout",
        ["shin_sanyaku"]
      );
      continue;
    }
    // Return-to-sanyaku watch: previously held a named rank, now winning.
    if (r.rank && isSanyakuRank(r.rank)) continue;
    if (wins <= losses) continue;
    const sanyakuSnapshots = (r.careerHistory ?? []).filter((s) => isSanyakuRank(s.rank));
    const last = sanyakuSnapshots[sanyakuSnapshots.length - 1];
    if (!last) continue;
    push(
      BardEngine.resolve(preBoutRng, "pre_bout.sanyaku_return", {
        SHIKONA: r.shikona,
        RETURN_DATE: `${BASHO_NAMES[last.bashoName] ?? last.bashoName} ${last.year}`,
        rikishiId: r.id,
      }).text,
      "pre_bout",
      ["sanyaku_return"]
    );
  }
}

function beatPostHenkaScrutiny(p: PbpPipeline): void {
  const { day, east, preBoutRng, push, west, world } = p;
  if (day <= 1 || !world.currentBasho?.boutMetrics) return;
  for (const r of [east, west]) {
    if (world.currentBasho.boutMetrics[r.id]?.lastHenkaDay !== day - 1) continue;
    push(
      BardEngine.resolve(preBoutRng, "pre_bout.post_henka_scrutiny", {
        SHIKONA: r.shikona,
        rikishiId: r.id,
      }).text,
      "pre_bout",
      ["henka", "post_henka_scrutiny"]
    );
    break;
  }
}

function beatKachiDrought(p: PbpPipeline): void {
  const { day, east, preBoutRng, push, west } = p;
  if (day < 8) return;
  for (const r of [east, west]) {
    const thresh = kachiKoshiThreshold(r.rank);
    const w = r.currentBashoWins ?? 0;
    const l = r.currentBashoLosses ?? 0;
    if (w < thresh - 3 || w >= thresh || l >= thresh) continue;
    const drought = countKachiKoshiDrought(r.careerHistory);
    if (drought < KACHI_DROUGHT_MIN_BASHO) continue;
    push(
      BardEngine.resolve(preBoutRng, "pre_bout.kachi_drought", {
        SHIKONA: r.shikona,
        COUNT: (drought + 1).toString(),
        rikishiId: r.id,
      }).text,
      "pre_bout",
      ["kachi_koshi", "kachi_drought"]
    );
    break;
  }
}

function beatLosingSkid(p: PbpPipeline): void {
  const { east, preBoutRng, push, west } = p;
  for (const r of [east, west]) {
    const streak = r.currentLossStreak ?? 0;
    if (streak < LOSING_SKID_MIN || (r.currentBashoWins ?? 0) <= 0) continue;
    push(
      BardEngine.resolve(preBoutRng, "pre_bout.losing_skid", {
        SHIKONA: r.shikona,
        STREAK: streak.toString(),
        DAYS: (streak + 1).toString(),
        rikishiId: r.id,
      }).text,
      "pre_bout",
      ["streak", "losing_skid"]
    );
    break;
  }
}

function beatProvenGiantKiller(p: PbpPipeline): void {
  const { east, eastAge, preBoutRng, push, west, westAge } = p;
  for (const [r, age] of [
    [east, eastAge],
    [west, westAge],
  ] as const) {
    if (isSanyakuRank(r.rank ?? "")) continue;
    if (age > PROVEN_GIANT_KILLER_MAX_AGE) continue;
    if ((r.stats?.achievements?.kinboshiEarned ?? 0) < 1) continue;
    push(
      BardEngine.resolve(preBoutRng, "pre_bout.proven_giant_killer", {
        SHIKONA: r.shikona,
        AGE: age.toString(),
        rikishiId: r.id,
      }).text,
      "pre_bout",
      ["kinboshi", "rookie"]
    );
    break;
  }
}

export function narrateStakes(p: PbpPipeline): void {
  beatHometown(p);
  beatSignatureGrip(p);
  beatDivisionSplit(p);
  beatMeetingMilestone(p);
  beatFirstTopDivisionMeeting(p);
  beatSanyakuArcs(p);
  beatIronMan(p);
  beatOldestDivision(p);
  beatMakuuchiBoutMilestone(p);
  beatOriginFirst(p);
  beatGripPreview(p);
  beatOneKimariteStreak(p);
  beatBonds(p);
  beatBirthday(p);
  beatWinlessFirstWin(p);
  beatTournamentDay(p);
  beatTitleStakes(p);
  beatLeaderboard(p);
  beatCoLeader(p);
  beatOzekiShowdown(p);
  beatPlayoffImplications(p);
  beatHurtLowerBody(p);
  beatSiblingLead(p);
  beatKenshoMention(p);
  beatBoutOfTheDay(p);
  beatPostHenkaScrutiny(p);
  beatKachiDrought(p);
  beatLosingSkid(p);
  beatProvenGiantKiller(p);
}
