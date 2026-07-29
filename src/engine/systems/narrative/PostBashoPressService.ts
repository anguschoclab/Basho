/**
 * PostBashoPressService.ts
 * ========================
 * Generates post-basho press conference PBP lines for NPC rikishi.
 *
 * Generates narrative lines for:
 * - Yusho champion (walking wounded, perseverance, growth, diary, superstition, clinic visit, title parade)
 * - Special prize winners (veteran emotional, fought match not situation, rival frustration)
 * - Yokozuna promotion bid candidates (continuation, score threshold)
 * - Ozeki promotion contenders (stake claim)
 * - Lower division champions (first honor, career goal, coach gratitude)
 */

import type { WorldState } from "../../types/world";
import type { Rikishi } from "../../types/rikishi";
import type { Id } from "../../types/common";
import type { PbpLine } from "../../bout/boutNarrative";
import { BardEngine } from "../../bard/BardEngine";
import { rngFromSeed } from "../../rng";
import { getRikishi } from "../../queries";

export interface PressConferenceContext {
  yushoId: Id;
  junYushoIds: Id[];
  ginoSho?: Id;
  kantosho?: Id;
  shukunsho?: Id;
  bashoName: string;
  year: number;
}

export const PostBashoPressService = {
  /**
   * Generate post-basho press conference PBP lines for all relevant NPC rikishi.
   */
  generatePressConference(
    world: WorldState,
    context: PressConferenceContext
  ): PbpLine[] {
    const lines: PbpLine[] = [];
    const { yushoId, bashoName, year } = context;
    const pressRng = rngFromSeed(`press-${bashoName}-${year}`, "narrative", "post_basho_press");

    // Champion press conference
    const champion = getRikishi(world, yushoId);
    if (champion) {
      lines.push(...this.generateChampionLines(champion, pressRng, bashoName, year));
    }

    // Special prize winners
    for (const prizeId of [context.shukunsho, context.kantosho, context.ginoSho]) {
      if (!prizeId) continue;
      const winner = getRikishi(world, prizeId);
      if (!winner || prizeId === yushoId) continue;
      lines.push(...this.generatePrizeWinnerLines(winner, pressRng, bashoName, year));
    }

    // Yokozuna bid commentary for strong Ozeki
    for (const rid of world.activeRikishiIds) {
      const r = getRikishi(world, rid);
      if (!r || r.rank !== "ozeki") continue;
      const wins = r.currentBashoWins ?? 0;
      if (wins >= 12) {
        lines.push(...this.generateYokozunaBidLines(r, pressRng, bashoName, year, wins));
      }
    }

    // Ozeki stake claim for strong sekiwake/komusubi
    for (const rid of world.activeRikishiIds) {
      const r = getRikishi(world, rid);
      if (!r) continue;
      if (r.rank !== "sekiwake" && r.rank !== "komusubi") continue;
      const wins = r.currentBashoWins ?? 0;
      if (wins >= 11) {
        lines.push(...this.generateOzekiStakeLines(r, pressRng, bashoName, year));
      }
    }

    // Lower division champion press lines
    const championRikishi = getRikishi(world, yushoId);
    if (championRikishi && championRikishi.division !== "makuuchi") {
      lines.push(...this.generateLowerDivisionChampionLines(championRikishi, pressRng, bashoName, year));
    }

    return lines;
  },

  generateChampionLines(
    champion: Rikishi,
    rng: ReturnType<typeof rngFromSeed>,
    bashoName: string,
    year: number
  ): PbpLine[] {
    const lines: PbpLine[] = [];
    const baseId = `press-champion-${champion.id}-${bashoName}-${year}`;

    // Walking wounded — if champion was injured during the basho
    if (champion.injured) {
      const line = BardEngine.resolve(rng, "post_basho_press.champion.walking_wounded", {
        SHIKONA: champion.shikona,
        rikishiId: champion.id,
      });
      if (line.text) {
        lines.push({ text: line.text, id: `${baseId}-ww`, phase: "post_bout", tags: ["post_basho_press"] });
      }
    }

    // Persevered — always generate for champion
    const perseveredLine = BardEngine.resolve(rng, "post_basho_press.champion.persevered", {
      SHIKONA: champion.shikona,
      rikishiId: champion.id,
    });
    if (perseveredLine.text) {
      lines.push({ text: perseveredLine.text, id: `${baseId}-persevered`, phase: "post_bout", tags: ["post_basho_press"] });
    }

    // Growth — for younger champions (debut count <= 10)
    const makuuchiCount = champion.careerHistory?.filter((h) => h.division === "makuuchi").length ?? 0;
    if (makuuchiCount <= 10) {
      const growthLine = BardEngine.resolve(rng, "post_basho_press.champion.growth", {
        SHIKONA: champion.shikona,
        rikishiId: champion.id,
      });
      if (growthLine.text) {
        lines.push({ text: growthLine.text, id: `${baseId}-growth`, phase: "post_bout", tags: ["post_basho_press"] });
      }
    }

    // Diary — 30% chance
    if (rng.next() < 0.3) {
      const diaryLine = BardEngine.resolve(rng, "post_basho_press.champion.diary", {
        SHIKONA: champion.shikona,
        rikishiId: champion.id,
      });
      if (diaryLine.text) {
        lines.push({ text: diaryLine.text, id: `${baseId}-diary`, phase: "post_bout", tags: ["post_basho_press"] });
      }
    }

    // Superstition — 20% chance
    if (rng.next() < 0.2) {
      const superstitionLine = BardEngine.resolve(rng, "post_basho_press.champion.superstition", {
        SHIKONA: champion.shikona,
        rikishiId: champion.id,
      });
      if (superstitionLine.text) {
        lines.push({ text: superstitionLine.text, id: `${baseId}-superstition`, phase: "post_bout", tags: ["post_basho_press"] });
      }
    }

    // Clinic visit — if injured
    if (champion.injured) {
      const clinicLine = BardEngine.resolve(rng, "post_basho_press.champion.clinic_visit", {
        SHIKONA: champion.shikona,
        rikishiId: champion.id,
      });
      if (clinicLine.text) {
        lines.push({ text: clinicLine.text, id: `${baseId}-clinic`, phase: "post_bout", tags: ["post_basho_press"] });
      }
    }

    // Title parade — always generate
    const paradeLine = BardEngine.resolve(rng, "post_basho_press.champion.title_parade", {
      SHIKONA: champion.shikona,
      rikishiId: champion.id,
    });
    if (paradeLine.text) {
      lines.push({ text: paradeLine.text, id: `${baseId}-parade`, phase: "post_bout", tags: ["post_basho_press"] });
    }

    return lines;
  },

  generatePrizeWinnerLines(
    winner: Rikishi,
    rng: ReturnType<typeof rngFromSeed>,
    bashoName: string,
    year: number
  ): PbpLine[] {
    const lines: PbpLine[] = [];
    const baseId = `press-prize-${winner.id}-${bashoName}-${year}`;

    // Veteran emotional — for older rikishi (30+ years old)
    const age = (winner.birthYear ?? 1995) <= new Date().getFullYear() - 30;
    if (age) {
      const line = BardEngine.resolve(rng, "post_basho_press.prize_winner.veteran_emotional", {
        SHIKONA: winner.shikona,
        rikishiId: winner.id,
      });
      if (line.text) {
        lines.push({ text: line.text, id: `${baseId}-veteran`, phase: "post_bout", tags: ["post_basho_press"] });
      }
    }

    // Fought match not situation — always generate
    const foughtLine = BardEngine.resolve(rng, "post_basho_press.prize_winner.fought_match_not_situation", {
      SHIKONA: winner.shikona,
      rikishiId: winner.id,
    });
    if (foughtLine.text) {
      lines.push({ text: foughtLine.text, id: `${baseId}-fought`, phase: "post_bout", tags: ["post_basho_press"] });
    }

    // Rival frustration — 25% chance
    if (rng.next() < 0.25) {
      const rivalLine = BardEngine.resolve(rng, "post_basho_press.prize_winner.rival_frustration", {
        SHIKONA: winner.shikona,
        rikishiId: winner.id,
      });
      if (rivalLine.text) {
        lines.push({ text: rivalLine.text, id: `${baseId}-rival`, phase: "post_bout", tags: ["post_basho_press"] });
      }
    }

    return lines;
  },

  generateYokozunaBidLines(
    rikishi: Rikishi,
    rng: ReturnType<typeof rngFromSeed>,
    bashoName: string,
    year: number,
    wins: number
  ): PbpLine[] {
    const lines: PbpLine[] = [];
    const baseId = `press-ydc-bid-${rikishi.id}-${bashoName}-${year}`;

    // Continuation statement
    const continuationLine = BardEngine.resolve(rng, "post_basho_press.ydc_bid.continuation", {
      SHIKONA: rikishi.shikona,
      rikishiId: rikishi.id,
    });
    if (continuationLine.text) {
      lines.push({ text: continuationLine.text, id: `${baseId}-continuation`, phase: "post_bout", tags: ["post_basho_press"] });
    }

    // Score threshold — if 13+ wins
    if (wins >= 13) {
      const scoreLine = BardEngine.resolve(rng, "post_basho_press.ydc_bid.score_threshold", {
        SHIKONA: rikishi.shikona,
        rikishiId: rikishi.id,
      });
      if (scoreLine.text) {
        lines.push({ text: scoreLine.text, id: `${baseId}-score`, phase: "post_bout", tags: ["post_basho_press"] });
      }
    }

    return lines;
  },

  generateOzekiStakeLines(
    rikishi: Rikishi,
    rng: ReturnType<typeof rngFromSeed>,
    bashoName: string,
    year: number
  ): PbpLine[] {
    const lines: PbpLine[] = [];
    const baseId = `press-ozeki-stake-${rikishi.id}-${bashoName}-${year}`;

    const line = BardEngine.resolve(rng, "post_basho_press.ozeki_stake", {
      SHIKONA: rikishi.shikona,
      rikishiId: rikishi.id,
    });
    if (line.text) {
      lines.push({ text: line.text, id: `${baseId}-stake`, phase: "post_bout", tags: ["post_basho_press"] });
    }

    return lines;
  },

  generateLowerDivisionChampionLines(
    champion: Rikishi,
    rng: ReturnType<typeof rngFromSeed>,
    bashoName: string,
    year: number
  ): PbpLine[] {
    const lines: PbpLine[] = [];
    const baseId = `press-ld-champion-${champion.id}-${bashoName}-${year}`;

    // First honor — always generate for lower division champions
    const firstHonorLine = BardEngine.resolve(rng, "post_basho_press.lower_division.first_honor", {
      SHIKONA: champion.shikona,
      DIVISION: champion.division ?? "lower division",
      rikishiId: champion.id,
    });
    if (firstHonorLine.text) {
      lines.push({ text: firstHonorLine.text, id: `${baseId}-first-honor`, phase: "post_bout", tags: ["post_basho_press"] });
    }

    // Career goal — 50% chance
    if (rng.next() < 0.5) {
      const goalLine = BardEngine.resolve(rng, "post_basho_press.lower_division.career_goal", {
        SHIKONA: champion.shikona,
        rikishiId: champion.id,
      });
      if (goalLine.text) {
        lines.push({ text: goalLine.text, id: `${baseId}-career-goal`, phase: "post_bout", tags: ["post_basho_press"] });
      }
    }

    // Coach gratitude — 40% chance
    if (rng.next() < 0.4) {
      const coachLine = BardEngine.resolve(rng, "post_basho_press.lower_division.coach_gratitude", {
        SHIKONA: champion.shikona,
        rikishiId: champion.id,
      });
      if (coachLine.text) {
        lines.push({ text: coachLine.text, id: `${baseId}-coach`, phase: "post_bout", tags: ["post_basho_press"] });
      }
    }

    return lines;
  },
};
