import { BardEngine } from "../bard/BardEngine";
import { rngFromSeed } from "../rng";
import type { Rikishi } from "../types/rikishi";
import type { WorldState } from "../types/world";
import type { PressPersona } from "../types/media";
import { determinePostRetirementPath, getRetirementNarrative } from "./PostRetirementPath";

export interface RetirementNarrativeLine {
  text: string;
  section: "ceremony" | "career_summary" | "legacy" | "press_reaction" | "oyakata_conversion" | "post_retirement_path" | "favorite_memory";
}

export function generateRetirementNarrative(
  rikishi: Rikishi,
  world: WorldState,
  seed: string
): RetirementNarrativeLine[] {
  const rng = rngFromSeed(seed, "retirement", rikishi.id);
  const lines: RetirementNarrativeLine[] = [];
  const shikona = rikishi.shikona;
  const heya = world.heyas?.get(rikishi.heyaId);
  const heyaName = heya?.name ?? "his heya";

  const careerWins = rikishi.careerWins ?? 0;
  const careerLosses = rikishi.careerLosses ?? 0;
  const bashoCount = rikishi.careerHistory?.length ?? 0;
  const yearsActive = world.year - rikishi.birthYear - 15;
  const yushoCount = (rikishi.careerHistory ?? []).filter((h) => h.isYusho).length;
  const kinboshiCount = rikishi.economics?.kinboshiCount ?? 0;
  const highestRank = rikishi.careerHistory
    ?.map((h) => h.rank)
    .sort((a, b) => {
      const order = ["yokozuna", "ozeki", "sekiwake", "komusubi", "maegashira"];
      return order.indexOf(a) - order.indexOf(b);
    })[0] ?? rikishi.rank;

  // 1. Ceremony line
  const ceremonyRes = BardEngine.resolve(rng, "events.narrative.retirement_ceremony_summary", {
    SHIKONA: shikona,
    HEYA: heyaName,
    rikishiId: rikishi.id,
  });
  if (ceremonyRes.text) {
    lines.push({ text: ceremonyRes.text, section: "ceremony" });
  }

  // 2. Career summary
  const careerRes = BardEngine.resolve(rng, "events.narrative.retirement_career_summary", {
    SHIKONA: shikona,
    CAREER_WINS: careerWins.toString(),
    CAREER_LOSSES: careerLosses.toString(),
    BASHO_COUNT: bashoCount.toString(),
    YEARS_ACTIVE: yearsActive.toString(),
    YUSHO_COUNT: yushoCount.toString(),
    KINBOSHI_COUNT: kinboshiCount.toString(),
    rikishiId: rikishi.id,
  });
  if (careerRes.text) {
    lines.push({ text: careerRes.text, section: "career_summary" });
  }

  // 3. Legacy assessment
  const legacyRes = BardEngine.resolve(rng, "events.narrative.retirement_legacy", {
    SHIKONA: shikona,
    HIGHEST_RANK: highestRank,
    rikishiId: rikishi.id,
  });
  if (legacyRes.text) {
    lines.push({ text: legacyRes.text, section: "legacy" });
  }

  // 4. Press reaction (persona-driven)
  const persona: PressPersona = rikishi.pressPersona ?? "neutral";
  const personaPath = persona !== "neutral" ? `events.narrative.retirement_press_${persona}` : null;
  if (personaPath && BardEngine.has(personaPath)) {
    const pressRes = BardEngine.resolve(rng, personaPath, {
      SHIKONA: shikona,
      rikishiId: rikishi.id,
    });
    if (pressRes.text) {
      lines.push({ text: pressRes.text, section: "press_reaction" });
    }
  }

  // 5. Oyakata conversion (if eligible: rank yokozuna/ozeki/sekiwake or 200+ career wins, age 28+)
  const age = world.year - rikishi.birthYear;
  const isAccomplished =
    rikishi.rank === "yokozuna" ||
    rikishi.rank === "ozeki" ||
    rikishi.rank === "sekiwake" ||
    (rikishi.careerWins ?? 0) >= 200;
  if (age >= 28 && isAccomplished) {
    const oyakataRes = BardEngine.resolve(rng, "events.narrative.retirement_oyakata_conversion", {
      SHIKONA: shikona,
      HEYA: heyaName,
      rikishiId: rikishi.id,
    });
    if (oyakataRes.text) {
      lines.push({ text: oyakataRes.text, section: "oyakata_conversion" });
    }
  }

  // 6. Post-retirement career path (B8)
  const postRetirementPath = determinePostRetirementPath(rikishi, rng);
  const pathNarrative = getRetirementNarrative(rikishi, postRetirementPath);
  if (pathNarrative) {
    lines.push({ text: pathNarrative, section: "post_retirement_path" });
  }

  // 7. Favorite career memory (B7 integration)
  if (rikishi.careerHighlights && rikishi.careerHighlights.length > 0) {
    const favoriteMemoryRes = BardEngine.resolve(rng, "events.narrative.retirement_favorite_memory_summary", {
      SHIKONA: shikona,
      rikishiId: rikishi.id,
    });
    if (favoriteMemoryRes.text) {
      lines.push({ text: favoriteMemoryRes.text, section: "favorite_memory" });
    }
  }

  return lines;
}
