import type { Rikishi } from "../../../types/rikishi";
import type { PbpLine } from "../../../bout/boutNarrative";
import { BardEngine } from "../../../bard/BardEngine";
import type { rngFromSeed } from "../../../rng";
import { emitLine } from "./emit";

/**
 * Champion press conference lines: persona opener, walking wounded,
 * perseverance, growth, diary, superstition, clinic visit, title parade,
 * weight journey, master intervention, early struggle, career highlight.
 */
export function generateChampionLines(
  champion: Rikishi,
  rng: ReturnType<typeof rngFromSeed>,
  bashoName: string,
  year: number
): PbpLine[] {
  const lines: PbpLine[] = [];
  const baseId = `press-champion-${champion.id}-${bashoName}-${year}`;
  const tokens = { SHIKONA: champion.shikona, rikishiId: champion.id };

  // Persona-driven opening statement
  const persona = champion.pressPersona ?? "neutral";
  const personaPath = `post_basho_press.champion.persona_${persona}`;
  if (BardEngine.has(personaPath)) {
    emitLine(lines, BardEngine.resolve(rng, personaPath, tokens), baseId, "persona");
  }

  // Walking wounded — if champion was injured during the basho
  if (champion.injured) {
    emitLine(
      lines,
      BardEngine.resolve(rng, "post_basho_press.champion.walking_wounded", tokens),
      baseId,
      "ww"
    );
  }

  // Persevered — always generate for champion
  emitLine(
    lines,
    BardEngine.resolve(rng, "post_basho_press.champion.persevered", tokens),
    baseId,
    "persevered"
  );

  // Growth — for younger champions (debut count <= 10)
  let makuuchiCount = 0;
  if (champion.careerHistory) {
    for (const h of champion.careerHistory) {
      if (h.division === "makuuchi") makuuchiCount++;
    }
  }
  if (makuuchiCount <= 10) {
    emitLine(
      lines,
      BardEngine.resolve(rng, "post_basho_press.champion.growth", tokens),
      baseId,
      "growth"
    );
  }

  // Diary — 30% chance
  if (rng.next() < 0.3) {
    emitLine(
      lines,
      BardEngine.resolve(rng, "post_basho_press.champion.diary", tokens),
      baseId,
      "diary"
    );
  }

  // Superstition — 20% chance
  if (rng.next() < 0.2) {
    emitLine(
      lines,
      BardEngine.resolve(rng, "post_basho_press.champion.superstition", tokens),
      baseId,
      "superstition"
    );
  }

  // Clinic visit — if injured
  if (champion.injured) {
    emitLine(
      lines,
      BardEngine.resolve(rng, "post_basho_press.champion.clinic_visit", tokens),
      baseId,
      "clinic"
    );
  }

  // Title parade — always generate
  emitLine(
    lines,
    BardEngine.resolve(rng, "post_basho_press.champion.title_parade", tokens),
    baseId,
    "parade"
  );

  // Weight journey — if champion has significant weight gain progress
  if (champion.weightJourney && champion.weightJourney.progressKg >= 15) {
    emitLine(
      lines,
      BardEngine.resolve(rng, "post_basho_press.champion.weight_journey", tokens),
      baseId,
      "weight-journey"
    );
  }

  // Master intervention — if oyakata intervened during this basho
  if (champion.interventionUsedThisBasho) {
    emitLine(
      lines,
      BardEngine.resolve(rng, "post_basho_press.champion.master_intervention", tokens),
      baseId,
      "intervention"
    );
  }

  // Early struggle — for champions with 5+ basho before first yusho
  const totalBashoCount = champion.careerHistory?.length ?? 0;
  let yushoCount = 0;
  if (champion.careerHistory) {
    for (const h of champion.careerHistory) {
      if (h.isYusho) yushoCount++;
    }
  }
  if (totalBashoCount >= 5 && yushoCount <= 1) {
    emitLine(
      lines,
      BardEngine.resolve(rng, "post_basho_press.champion.early_struggle", tokens),
      baseId,
      "struggle"
    );
  }

  // Career highlight reflection — if champion has recorded career highlights
  if (champion.careerHighlights && champion.careerHighlights.length > 0) {
    const highlight = champion.careerHighlights[champion.careerHighlights.length - 1];
    emitLine(
      lines,
      BardEngine.resolve(rng, "post_basho_press.champion.career_highlight_reflection", {
        SHIKONA: champion.shikona,
        OPPONENT: highlight.opponent ?? "his rival",
        rikishiId: champion.id,
      }),
      baseId,
      "highlight"
    );
  }

  return lines;
}
