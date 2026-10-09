/**
 * bout/narrative/context2.ts — extracted beats from generateBoutNarrative.
 * Code moved verbatim; dependencies arrive via the shared PbpPipeline.
 */
import type { PbpPipeline } from "./pipeline";
import type { PbpTag } from "./pbpTypes";
import { focusBiasToStyleKey, isSanyakuPromotionByRank, SANYAKU_RANKS } from "./helpers";
import { AGE_DIFF_THRESHOLD, CAREER_BOUT_MILESTONES, CAREER_WIN_MILESTONES } from "../../../constants/engine/generation";
import { BardEngine } from "../../bard/BardEngine";
import { isYushoContention } from "../boutContention";

export function beatBodyType(p: PbpPipeline): void {
  const { east, preBoutRng, push, west } = p;
  // 3f-2. Body type narrative (5.1)
  for (const r of [east, west]) {
    if (r.bodyType && BardEngine.has(`pre_bout.body_type.${r.bodyType}`)) {
      push(
        BardEngine.resolve(preBoutRng, `pre_bout.body_type.${r.bodyType}`, {
          SHIKONA: r.shikona,
          rikishiId: r.id,
        }).text,
        "pre_bout",
        ["body_type"]
      );
    }
  }

}

export function beatHeyaStyle(p: PbpPipeline): void {
  const { east, preBoutRng, push, west, world } = p;
  // 3f-3. Heya style narrative (5.3)
  const seenHeya = new Set<string>();
  for (const r of [east, west]) {
    if (!r.heyaId || seenHeya.has(r.heyaId)) continue;
    const heya = world.heyas?.get(r.heyaId);
    if (!heya?.trainingPhilosophy) continue;
    const tp = heya.trainingPhilosophy;
    const styleKey = tp.signatureStyle ?? focusBiasToStyleKey(tp.focusBias);
    if (styleKey && BardEngine.has(`pre_bout.heya_style.${styleKey}`)) {
      seenHeya.add(r.heyaId);
      push(
        BardEngine.resolve(preBoutRng, `pre_bout.heya_style.${styleKey}`, {
          SHIKONA: r.shikona,
          HEYA_NAME: heya.name,
          rikishiId: r.id,
          heyaId: heya.id,
        }).text,
        "pre_bout",
        ["heya_style"]
      );
    }
  }

}

export function beatArchetypeEvolution(p: PbpPipeline): void {
  const { east, preBoutRng, push, west, world } = p;
  // 3f-4. Archetype evolution narrative (2.3)
  for (const r of [east, west]) {
    if (!r.archetypeHistory || r.archetypeHistory.length < 1) continue;
    const originalArchetype = r.archetypeHistory[0].archetype;
    const currentArchetype = r.combatProfile?.archetype;
    if (!currentArchetype || originalArchetype === currentArchetype) continue;
    const years = (world.year - r.archetypeHistory[0].year).toString();
    push(
      BardEngine.resolve(preBoutRng, "pre_bout.archetype_evolution", {
        SHIKONA: r.shikona,
        OLD_STYLE: originalArchetype,
        NEW_STYLE: currentArchetype,
        YEARS: years,
        rikishiId: r.id,
      }).text,
      "pre_bout",
      ["archetype_evolution"]
    );
  }

}

export function beatArchetypeCounter(p: PbpPipeline): void {
  const { east, preBoutRng, push, result, west } = p;
  // 3f-5. Archetype counter narrative — when archetypeMatchup.counterActivated is true
  if (result.archetypeMatchup?.counterActivated) {
    push(
      BardEngine.resolve(preBoutRng, "pre_bout.archetype_counter", {
        EAST: east.shikona,
        WEST: west.shikona,
        EAST_STYLE: east.combatProfile?.archetype ?? "hybrid",
        WEST_STYLE: west.combatProfile?.archetype ?? "hybrid",
        eastRikishiId: east.id,
        westRikishiId: west.id,
      }).text,
      "pre_bout",
      ["archetype_counter"]
    );
  }

}

export function beatAgeNarrative(p: PbpPipeline): void {
  const { east, eastAge, preBoutRng, push, west, westAge } = p;
  // 3g. Age narrative (veteran vs youngster)
  const ageDiff = Math.abs(eastAge - westAge);
  if (ageDiff >= AGE_DIFF_THRESHOLD) {
    const older = eastAge >= westAge ? east : west;
    const younger = eastAge >= westAge ? west : east;
    const olderTags: PbpTag[] = (eastAge >= westAge ? eastAge : westAge) >= 35 ? ["veteran"] : [];
    const youngerTags: PbpTag[] = (eastAge >= westAge ? westAge : eastAge) <= 22 ? ["rookie"] : [];
    push(
      BardEngine.resolve(preBoutRng, "pre_bout.age_narrative", {
        OLDER: older.shikona,
        YOUNGER: younger.shikona,
        AGE_DIFF: ageDiff.toString(),
        olderRikishiId: older.id,
        youngerRikishiId: younger.id,
      }).text,
      "pre_bout",
      ["age_diff", ...olderTags, ...youngerTags]
    );
  }

}

export function beatVeterans(p: PbpPipeline): void {
  const { east, eastAge, preBoutRng, push, west, westAge } = p;
  // 3g2. Battle of veterans (6.4): when both rikishi are 30+, add special framing
  if (eastAge >= 30 && westAge >= 30) {
    push(
      BardEngine.resolve(preBoutRng, "pre_bout.battle_of_veterans", {
        EAST: east.shikona,
        WEST: west.shikona,
        eastRikishiId: east.id,
        westRikishiId: west.id,
      }).text,
      "pre_bout",
      ["veteran", "age_diff"]
    );
  }

}

export function beatCareerWinMilestone(p: PbpPipeline): void {
  const { preBoutRng, push, winnerRikishi } = p;
  // 3h. Career win milestone check
  for (const milestone of CAREER_WIN_MILESTONES) {
    if ((winnerRikishi.careerWins ?? 0) + 1 === milestone) {
      push(
        BardEngine.resolve(preBoutRng, "pre_bout.career_milestone", {
          SHIKONA: winnerRikishi.shikona,
          MILESTONE: milestone.toString(),
          rikishiId: winnerRikishi.id,
        }).text,
        "pre_bout",
        ["milestone"]
      );
      break;
    }
  }

}

export function beatCareerBoutMilestone(p: PbpPipeline): void {
  const { east, preBoutRng, push, west } = p;
  // 3h2. Career bout count milestone (Gap 1)
  for (const r of [east, west]) {
    const careerBouts = (r.careerWins ?? 0) + (r.careerLosses ?? 0);
    for (const milestone of CAREER_BOUT_MILESTONES) {
      if (careerBouts + 1 === milestone) {
        push(
          BardEngine.resolve(preBoutRng, "pre_bout.career_bout_milestone", {
            SHIKONA: r.shikona,
            MILESTONE: milestone.toString(),
            rikishiId: r.id,
          }).text,
          "pre_bout",
          ["milestone"]
        );
        break;
      }
    }
  }

}

export function beatConsecutiveKachi(p: PbpPipeline): void {
  const { east, preBoutRng, push, west } = p;
  // 3i. Consecutive kachi-koshi streak
  const eastKachiStreak = east.consecutiveKachiKoshi ?? 0;
  const westKachiStreak = west.consecutiveKachiKoshi ?? 0;
  const maxKachiStreak = Math.max(eastKachiStreak, westKachiStreak);
  if (maxKachiStreak >= 3) {
    const streakRikishi = eastKachiStreak >= westKachiStreak ? east : west;
    push(
      BardEngine.resolve(preBoutRng, "pre_bout.consecutive_kachi", {
        SHIKONA: streakRikishi.shikona,
        STREAK: maxKachiStreak.toString(),
        rikishiId: streakRikishi.id,
      }).text,
      "pre_bout",
      ["consecutive_kachi"]
    );
  }

}

export function beatKadobanMention(p: PbpPipeline): void {
  const { east, preBoutRng, push, west, world } = p;
  // 3j. Kadoban mention
  const kadobanMap = world.ozekiKadoban ?? {};
  const eastKadoban = kadobanMap[east.id];
  const westKadoban = kadobanMap[west.id];
  if (eastKadoban || westKadoban) {
    const kadobanRikishi = eastKadoban ? east : west;
    push(
      BardEngine.resolve(preBoutRng, "pre_bout.kadoban", {
        SHIKONA: kadobanRikishi.shikona,
        rikishiId: kadobanRikishi.id,
      }).text,
      "pre_bout",
      ["kadoban"]
    );
  }

}

export function beatOzekiReturn(p: PbpPipeline): void {
  const { east, preBoutRng, push, west } = p;
  // 3j2. Ozeki return detection (sekiwake/komusubi formerly ozeki, with 9+ wins)
  for (const r of [east, west]) {
    if ((r.rank === "sekiwake" || r.rank === "komusubi") && r.careerHistory) {
      const wasOzeki = r.careerHistory.some((s) => s.rank === "ozeki");
      if (wasOzeki && (r.currentBashoWins ?? 0) >= 9) {
        const needed = Math.max(0, 10 - (r.currentBashoWins ?? 0));
        push(
          BardEngine.resolve(preBoutRng, "pre_bout.ozeki_return", {
            SHIKONA: r.shikona,
            NEEDED: needed.toString(),
            rikishiId: r.id,
          }).text,
          "pre_bout",
          ["kadoban"]
        );
      }
    }
  }

}

export function beatYokozunaPromotion(p: PbpPipeline): void {
  const { east, preBoutRng, push, west } = p;
  // 3j3. Yokozuna promotion detection (ozeki with consecutiveStrongOzeki >= 1)
  for (const r of [east, west]) {
    if (r.rank === "ozeki" && (r.consecutiveStrongOzeki ?? 0) >= 1) {
      push(
        BardEngine.resolve(preBoutRng, "pre_bout.yokozuna_promotion", {
          SHIKONA: r.shikona,
          rikishiId: r.id,
        }).text,
        "pre_bout",
        ["title_stakes"]
      );
    }
  }

}

export function beatSpoiler(p: PbpPipeline): void {
  const { east, preBoutRng, push, west, world } = p;
  // 3j3b. Spoiler narrative (Gap 7): former sanyaku facing a contender
  for (const [spoiler, contender] of [
    [east, west],
    [west, east],
  ] as const) {
    if (!spoiler.careerHistory || spoiler.careerHistory.length === 0) continue;
    const formerSanyaku = spoiler.careerHistory.some(
      (s) => s.rank === "ozeki" || s.rank === "sekiwake" || s.rank === "komusubi"
    );
    const isCurrentlyLower = spoiler.rank === "maegashira";
    if (!formerSanyaku || !isCurrentlyLower) continue;
    const contenderInContention =
      (world.currentBasho && isYushoContention(contender, spoiler, world.currentBasho)) ||
      (contender.currentBashoWins ?? 0) >= 8;
    if (!contenderInContention) continue;
    const formerRank =
      spoiler.careerHistory.find(
        (s) => s.rank === "ozeki" || s.rank === "sekiwake" || s.rank === "komusubi"
      )?.rank ?? "sanyaku";
    push(
      BardEngine.resolve(preBoutRng, "pre_bout.spoiler", {
        SPOILER: spoiler.shikona,
        CONTENDER: contender.shikona,
        SPOILER_FORMER_RANK: formerRank,
        spoilerId: spoiler.id,
        contenderId: contender.id,
      }).text,
      "pre_bout",
      ["title_stakes"]
    );
    break;
  }

}

export function beatCareerPhase(p: PbpPipeline): void {
  const { east, preBoutRng, push, west, world } = p;
  // 3j4. Career phase narrative (6.1): debut, prime, decline, veteran
  for (const r of [east, west]) {
    const age = r.age ?? world.year - r.birthYear;
    const careerBouts = (r.careerWins ?? 0) + (r.careerLosses ?? 0);
    let phase: "debut" | "prime" | "decline" | "veteran" | null = null;
    if (careerBouts < 15) phase = "debut";
    else if (age >= 34) phase = "veteran";
    else if (age >= 30) phase = "decline";
    else if (age >= 24 && age <= 29 && careerBouts > 50) phase = "prime";
    if (phase) {
      push(
        BardEngine.resolve(preBoutRng, `pre_bout.career_phase_${phase}`, {
          SHIKONA: r.shikona,
          AGE: age.toString(),
          BOUTS: careerBouts.toString(),
          rikishiId: r.id,
        }).text,
        "pre_bout",
        [phase === "debut" ? "rookie" : phase === "veteran" ? "veteran" : "career_phase"]
      );
    }
  }

}

export function beatRankDebut(p: PbpPipeline): void {
  const { east, preBoutRng, push, west } = p;
  // 3j4b. Rank debut narrative (Gap 8): shin-sekiwake, shin-komusubi, shin-maegashira
  for (const r of [east, west]) {
    if (!r.careerHistory || r.careerHistory.length === 0) continue;
    const prevBasho = r.careerHistory[r.careerHistory.length - 1];
    const prevRank = prevBasho.rank;
    const currentRank = r.rank;
    const isSanyakuDebut =
      isSanyakuPromotionByRank(currentRank, prevRank) || r.sanyakuPromotionThisBasho;
    if (isSanyakuDebut && SANYAKU_RANKS.includes(currentRank)) {
      const debutPath =
        currentRank === "sekiwake"
          ? "pre_bout.rank_debut.shin_sekiwake"
          : "pre_bout.rank_debut.shin_komusubi";
      push(
        BardEngine.resolve(preBoutRng, debutPath, {
          SHIKONA: r.shikona,
          rikishiId: r.id,
        }).text,
        "pre_bout",
        ["debut"]
      );
    } else if (currentRank === "maegashira" && prevRank !== "maegashira") {
      const currentRankNumber = r.rankNumber ?? 99;
      const isCareerHigh = r.careerHistory.every((s) => (s.rankNumber ?? 99) >= currentRankNumber);
      if (isCareerHigh) {
        push(
          BardEngine.resolve(preBoutRng, "pre_bout.rank_debut.shin_maegashira", {
            SHIKONA: r.shikona,
            RANK_NUMBER: currentRankNumber.toString(),
            rikishiId: r.id,
          }).text,
          "pre_bout",
          ["debut"]
        );
      }
    }
  }

}

export function narrateStyle(p: PbpPipeline): void {
  beatBodyType(p);
  beatHeyaStyle(p);
  beatArchetypeEvolution(p);
  beatArchetypeCounter(p);
  beatAgeNarrative(p);
  beatVeterans(p);
  beatCareerWinMilestone(p);
  beatCareerBoutMilestone(p);
  beatConsecutiveKachi(p);
  beatKadobanMention(p);
  beatOzekiReturn(p);
  beatYokozunaPromotion(p);
  beatSpoiler(p);
  beatCareerPhase(p);
  beatRankDebut(p);
}
