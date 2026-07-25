/**
 * Achievements Transformer
 * ========================
 * Transforms special prizes and achievements.
 */

import type { Rikishi } from "../../../engine/types/rikishi";
import type { RikishiAchievementsDTO, RikishiPersonalityDTO } from "../types";

/**
 * Transform special prizes.
 */
export function calculateSpecialPrizes(r: Rikishi): RikishiAchievementsDTO["specialPrizes"] {
  return {
    shukunSho: r.stats?.specialPrizes?.shukunSho ?? 0,
    kantoSho: r.stats?.specialPrizes?.kantoSho ?? 0,
    ginoSho: r.stats?.specialPrizes?.ginoSho ?? 0,
  };
}

/**
 * Transform achievements.
 */
export function calculateAchievements(r: Rikishi): RikishiAchievementsDTO["achievements"] {
  return {
    kinboshiEarned: r.stats?.achievements?.kinboshiEarned ?? 0,
    ginboshiEarned: r.stats?.achievements?.ginboshiEarned ?? 0,
    kinboshiConceded: r.stats?.achievements?.kinboshiConceded ?? 0,
    ginboshiConceded: r.stats?.achievements?.ginboshiConceded ?? 0,
    mochikyukinPoints: r.stats?.achievements?.mochikyukinPoints ?? 0,
  };
}

/**
 * Transform achievements DTO.
 */
export function toAchievementsDTO(r: Rikishi): RikishiAchievementsDTO {
  return {
    specialPrizes: calculateSpecialPrizes(r),
    achievements: calculateAchievements(r),
  };
}

/**
 * Transform personality fields.
 */
export function toPersonalityDTO(r: Rikishi): RikishiPersonalityDTO {
  return {
    personalityTraits: r.personalityTraits ?? [],
  };
}
