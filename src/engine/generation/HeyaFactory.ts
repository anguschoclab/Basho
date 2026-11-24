/**
 * src/engine/generation/HeyaFactory.ts
 * =============================================
 * Heya and oyakata creation logic.
 * Extracted from WorldFactory.ts for SRP separation.
 */

import { SeededRNG } from "@/engine/core/rng";
import { Heya } from "@/engine/types/heya";
import { Oyakata, OyakataArchetype } from "@/engine/types/oyakata";
import { generateOyakataName } from "@/engine/shikona/oyakataNames";
import { seededPick } from "@/engine/utils/random";
import { generateOyakata } from "@/engine/npc/personas/oyakataPersonalities";
import { generateAvatarIdentity } from "@/engine/generation/avatarGenerator";
import { HEYA_SIGNATURE_PREFIXES, extractPrefixFromShikona } from "@/engine/shikona/heyaPrefixes";
import { WorldState } from "@/engine/types/world";
import { FOUNDING_SEED_FUNDS, HEYA_COUNT_CAP } from "@/constants/engine/economic";
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
  HEYA_STATURE_TIER_LEGENDARY,
  HEYA_STATURE_TIER_POWERFUL,
  HEYA_STATURE_TIER_ESTABLISHED,
  HEYA_STATURE_TIER_REBUILDING,
  HEYA_STATURE_TIER_FRAGILE,
  HEYA_ELITE_TIER_THRESHOLD,
  HEYA_ICHIMON,
} from "@/constants/engine/generation";

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

  oyakata.avatarConfig = generateAvatarIdentity({
    seed: oyakataId,
    nationality: "Japan",
    role: "oyakata",
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
      tier < HEYA_STATURE_TIER_LEGENDARY
        ? "legendary"
        : tier < HEYA_STATURE_TIER_POWERFUL
          ? "powerful"
          : tier < HEYA_STATURE_TIER_ESTABLISHED
            ? "established"
            : tier < HEYA_STATURE_TIER_REBUILDING
              ? "rebuilding"
              : tier < HEYA_STATURE_TIER_FRAGILE
                ? "fragile"
                : "new",
    prestigeBand: tier < HEYA_ELITE_TIER_THRESHOLD ? "elite" : "respected",
    facilitiesBand: "adequate",
    koenkaiBand: "moderate",
    runwayBand: "secure",
    reputation: HEYA_REPUTATION_BASE - tier * HEYA_REPUTATION_TIER_MULTIPLIER,
    prestige: HEYA_PRESTIGE_BASE - tier * HEYA_PRESTIGE_TIER_MULTIPLIER,
    funds: tier < HEYA_ELITE_TIER_THRESHOLD ? HEYA_FUNDS_ELITE : HEYA_FUNDS_STANDARD,
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
    // Real 2026 clan membership is fixed per stable (17/14/5/5/4), not a
    // coin flip — unknown names (founded stables) draw a random clan.
    ichimon:
      HEYA_ICHIMON[name] ??
      seededPick(rng, ["Dewanoumi", "Nishonoseki", "Takasago", "Tokitsukaze", "Isegahama"]),
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
  rng: SeededRNG,
  opts?: { parentHeyaId?: string }
): { heya: Heya } | null {
  if (world.heyas.size >= HEYA_COUNT_CAP) return null;
  const id = rng.uuid("HY");
  const { heya } = createHeyaWithOyakata({ id, name, rng, tier: 0.9 });
  heya.oyakataId = oyakataId;
  heya.funds = FOUNDING_SEED_FUNDS;
  heya.statureBand = "new";
  heya.prestigeBand = "modest";
  heya.rikishiIds = [];
  // JSA branch model: a new stable is a dokuritsu branch of the founder's
  // parent stable — it inherits the parent's ichimon (mutual-aid + voting
  // bloc membership follows lineage) and records the branch link.
  const parent = opts?.parentHeyaId ? world.heyas.get(opts.parentHeyaId) : undefined;
  if (parent?.ichimon) heya.ichimon = parent.ichimon;
  if (opts?.parentHeyaId) heya.branchedFromHeyaId = opts.parentHeyaId;
  return { heya };
}

export function createStables(worldRng: SeededRNG): {
  heyaMap: Map<string, Heya>;
  oyakataMap: Map<string, Oyakata>;
} {
  const heyaMap = new Map<string, Heya>();
  const oyakataMap = new Map<string, Oyakata>();

  // The real 45 active stables (JSA, 2026 season), ordered by stature so
  // the index-derived tier bands land on the right rooms — list position
  // drives statureBand, which in turn weights the prestige roster pull
  // (band^2+4) and prestige/reputation/funds in createHeyaWithOyakata.
  const HEYA_NAMES = [
    // legendary (tier < 0.1) — the powerhouse rooms
    "Isegahama",
    "Takasago",
    "Sakaigawa",
    "Tamanoi",
    "Nishonoseki",
    // powerful (tier < 0.25)
    "Oitekaze",
    "Kokonoe",
    "Takadagawa",
    "Kise",
    "Futagoyama",
    "Dewanoumi",
    // established (tier < 0.5) — incl. Hakkaku: small roster but the
    // chairman's stable carries real institutional weight
    "Kasugano",
    "Musashigawa",
    "Sadogatake",
    "Tatsunami",
    "Shibatayama",
    "Asakayama",
    "Tagonoura",
    "Naruto",
    "Hakkaku",
    "Ajigawa",
    "Fujishima",
    // rebuilding (tier < 0.7)
    "Tokitsukaze",
    "Onoe",
    "Kataonami",
    "Shikihide",
    "Yamahibiki",
    "Otowayama",
    "Ikazuchi",
    "Hanaregoma",
    "Hidenoyama",
    // fragile (tier < 0.85)
    "Minato",
    "Minatogawa",
    "Nishiiwa",
    "Onomatsu",
    "Oshiogawa",
    "Arashio",
    "Isenoumi",
    // new (rest) — recent foundings and the smallest rooms
    "Nakamura",
    "Takekuma",
    "Tokiwayama",
    "Oshima",
    "Asahiyama",
    "Nishikido",
    "Shikoroyama",
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
