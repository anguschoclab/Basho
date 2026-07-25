/**
 * src/engine/systems/generation/HeyaFactory.ts
 * =============================================
 * Heya and oyakata creation logic.
 * Extracted from WorldFactory.ts for SRP separation.
 */

import { SeededRNG } from "../../rng";
import { Heya } from "../../types/heya";
import { Oyakata, OyakataArchetype } from "../../types/oyakata";
import { generateOyakataName } from "../../shikona";
import { seededPick } from "../../utils/random";
import { generateOyakata } from "../../oyakataPersonalities";
import { generateAvatarConfig } from "../../avatarGenerator";
import { HEYA_SIGNATURE_PREFIXES, extractPrefixFromShikona } from "../../shikona/heyaPrefixes";
import { WorldState } from "../../types/world";
import { FOUNDING_SEED_FUNDS } from "../../../constants/engine/economic";
import {
  OYAKATA_BASE_AGE,
  OYAKATA_AGE_RANGE,
  HEYA_REPUTATION_BASE,
  HEYA_REPUTATION_TIER_MULTIPLIER,
  HEYA_PRESTIGE_BASE,
  HEYA_PRESTIGE_TIER_MULTIPLIER,
  HEYA_FUNDS_ELITE,
  HEYA_FUNDS_STANDARD,
  HEYA_WELFARE_RISK_DEFAULT,
  HEYA_FACILITIES_DEFAULT,
  HEYA_POLITICAL_CAPITAL_DEFAULT,
} from "../../../constants/engine/generation";

export function createHeyaWithOyakata(args: {
  id: string;
  name: string;
  rng: SeededRNG;
  tier: number;
}): { heya: Heya; oyakata: Oyakata } {
  const { id, name, rng, tier } = args;
  const oyakataId = rng.uuid("OY");
  const oyakataName = generateOyakataName(`${rng.seed}::oyakata::${oyakataId}`, rng);
  const archetype = seededPick(rng, [
    "traditionalist",
    "scientist",
    "gambler",
    "nurturer",
    "tyrant",
    "strategist",
  ]) as OyakataArchetype;
  const age = OYAKATA_BASE_AGE + rng.int(0, OYAKATA_AGE_RANGE);

  const oyakata = generateOyakata(
    oyakataId,
    id,
    oyakataName,
    age,
    archetype,
    undefined,
    undefined,
    undefined,
    tier
  );

  oyakata.avatarConfig = generateAvatarConfig({
    seed: oyakataId,
    nationality: "Japan",
    age,
    isSekitori: false,
    isOyakata: true,
  });

  const shikonaPrefix =
    HEYA_SIGNATURE_PREFIXES[name] ??
    (oyakata.formerShikona ? extractPrefixFromShikona(oyakata.formerShikona) : undefined);

  const heya: Heya = {
    id,
    name,
    oyakataId,
    shikonaPrefix,
    statureBand:
      tier < 0.1
        ? "legendary"
        : tier < 0.25
          ? "powerful"
          : tier < 0.5
            ? "established"
            : tier < 0.7
              ? "rebuilding"
              : tier < 0.85
                ? "fragile"
                : "new",
    prestigeBand: tier < 0.2 ? "elite" : "respected",
    facilitiesBand: "adequate",
    koenkaiBand: "moderate",
    runwayBand: "secure",
    reputation: HEYA_REPUTATION_BASE - tier * HEYA_REPUTATION_TIER_MULTIPLIER,
    prestige: HEYA_PRESTIGE_BASE - tier * HEYA_PRESTIGE_TIER_MULTIPLIER,
    funds: tier < 0.2 ? HEYA_FUNDS_ELITE : HEYA_FUNDS_STANDARD,
    scandalScore: 0,
    governanceStatus: "good_standing",
    welfareState: {
      welfareRisk: HEYA_WELFARE_RISK_DEFAULT,
      activeDiet: "maintenance",
      complianceState: "compliant",
      weeksInState: 0,
      lastReviewedWeek: 0,
    },
    facilities: {
      training: HEYA_FACILITIES_DEFAULT,
      recovery: HEYA_FACILITIES_DEFAULT,
      nutrition: HEYA_FACILITIES_DEFAULT,
    },
    riskIndicators: { financial: false, governance: false, rivalry: false },
    ichimon: seededPick(rng, ["Dewanoumi", "Nishonoseki", "Takasago", "Tokitsukaze", "Isegahama"]),
    politicalCapital: HEYA_POLITICAL_CAPITAL_DEFAULT,
    location: "Tokyo",
    lineage: [],
    historicalYusho: 0,
  };

  return { heya, oyakata };
}

export function foundStable(
  world: WorldState,
  oyakataId: string,
  name: string,
  rng: SeededRNG
): { heya: Heya } {
  const id = rng.uuid("HY");
  const { heya } = createHeyaWithOyakata({ id, name, rng, tier: 0.9 });
  heya.oyakataId = oyakataId;
  heya.funds = FOUNDING_SEED_FUNDS;
  heya.statureBand = "new";
  heya.prestigeBand = "modest";
  heya.rikishiIds = [];
  return { heya };
}

export function createStables(worldRng: SeededRNG): {
  heyaMap: Map<string, Heya>;
  oyakataMap: Map<string, Oyakata>;
} {
  const heyaMap = new Map<string, Heya>();
  const oyakataMap = new Map<string, Oyakata>();

  const HEYA_NAMES = [
    "Dewanoumi",
    "Nishonoseki",
    "Takasago",
    "Tokitsukaze",
    "Isegahama",
    "Sakaigawa",
    "Kasugano",
    "Kokonoe",
    "Kise",
    "Musashigawa",
    "Kataonami",
    "Onoe",
    "Tatsunami",
    "Minezaki",
    "Tamanoi",
    "Isenoumi",
    "Ajigawa",
    "Sadogatake",
    "Hakkaku",
    "Shibatayama",
    "Michinoku",
    "Miyagino",
    "Oigami",
    "Tagonoura",
    "Naruto",
    "Arashio",
    "Asakayama",
    "Nakagawa",
    "Shikihide",
    "Yamahibiki",
    "Irumagawa",
    "Hanahago",
    "Shirane",
    "Futagoyama",
    "Fujishima",
    "Takadagawa",
    "Magaki",
    "Katsushika",
    "Oshogatsu",
    "Chiganoura",
    "Minato",
    "Shikoroyama",
    "Kagamiyama",
    "Hanakago",
    "Oguruma",
  ];

  HEYA_NAMES.forEach((name, i) => {
    const id = worldRng.uuid("HY");
    const tier = i / HEYA_NAMES.length;
    const { heya, oyakata } = createHeyaWithOyakata({ id, name, rng: worldRng, tier });
    heyaMap.set(id, heya);
    oyakataMap.set(oyakata.id, oyakata);
    heya.rikishiIds = [];
  });

  return { heyaMap, oyakataMap };
}
