import fs from 'fs';
let content = fs.readFileSync('src/engine/systems/legacy/LegacyService.ts', 'utf-8');

const search = `  applyLegacyTrait(candidateStats: RikishiStats, trait: BloodlineTrait): RikishiStats {
    const boosted: RikishiStats = { ...candidateStats };
    const numericKeys = new Set<keyof RikishiStats>([
      "power",
      "technique",
      "speed",
      "weight",
      "stamina",
      "mental",
      "adaptability",
      "balance",
      "aggression",
      "experience",
    ]);

    // Apply Floor Bonuses
    for (const [stat, bonus] of Object.entries(trait.statFloorBonus)) {
      const s = stat as keyof RikishiStats;
      if (numericKeys.has(s)) {
        (boosted as unknown as Record<string, unknown>)[s] = clampInt(
          ((boosted[s] as number) || 0) + (bonus || 0),
          0,
          99
        );
      }
    }

    // Apply Ceiling Bonus to the peak stat in the trait
    const peakStat = this.findPeakStat(trait.statFloorBonus);
    const p = peakStat as keyof RikishiStats;
    if (peakStat && numericKeys.has(p)) {
      (boosted as unknown as Record<string, unknown>)[p] = clampInt(
        ((boosted[p] as number) || 0) + trait.ceilingBonus,
        0,
        99
      );
    }

    return boosted;
  },`;

const replace = `  applyLegacyTrait(candidateStats: RikishiStats, trait: BloodlineTrait): RikishiStats {
    const boosted: RikishiStats = { ...candidateStats };
    type NumericStat = Extract<
      keyof RikishiStats,
      | "power"
      | "technique"
      | "speed"
      | "weight"
      | "stamina"
      | "mental"
      | "adaptability"
      | "balance"
      | "aggression"
      | "experience"
    >;

    const NUMERIC_KEYS = new Set<string>([
      "power",
      "technique",
      "speed",
      "weight",
      "stamina",
      "mental",
      "adaptability",
      "balance",
      "aggression",
      "experience",
    ]);

    function isNumericStat(key: string): key is NumericStat {
      return NUMERIC_KEYS.has(key);
    }

    // Apply Floor Bonuses
    for (const [stat, bonus] of Object.entries(trait.statFloorBonus)) {
      if (isNumericStat(stat)) {
        boosted[stat] = clampInt((boosted[stat] || 0) + (bonus || 0), 0, 99);
      }
    }

    // Apply Ceiling Bonus to the peak stat in the trait
    const peakStat = this.findPeakStat(trait.statFloorBonus);
    if (peakStat && isNumericStat(peakStat)) {
      boosted[peakStat] = clampInt((boosted[peakStat] || 0) + trait.ceilingBonus, 0, 99);
    }

    return boosted;
  },`;

content = content.replace(search, replace);
fs.writeFileSync('src/engine/systems/legacy/LegacyService.ts', content, 'utf-8');
console.log("Replaced!");
