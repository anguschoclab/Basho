import { determineSpecialPrizes } from "../banzuke";
import type { SpecialPrizesResult } from "../banzuke/specialPrizes";
import type { WorldState } from "../types/world";
import type { BashoState } from "../types/basho";
import { createImpactBuilder } from "../core/ImpactBuilder";
import type { StateImpact } from "../core/StateImpact";
import { applyAchievementImpact } from "../systems/economy/SponsorshipService";
import { SIMULATION_CONFIG } from "../core/SimulationConfig";
import type { Id } from "../types/common";
import { getRikishi } from "../queries";
import { NON_SEKITORI_BASHO_ALLOWANCE } from "../../constants/engine/economic";
import { isSekitoriDivision } from "@/constants/engine/rankDisplay";
import { BardEngine } from "../bard/BardEngine";
import { rngFromSeed } from "../rng";
import type { PbpLine } from "../bout/boutNarrative";

/**
 * Distributes special prizes (Sansho) and tournament bonuses at the end of a basho.
 * Updates rikishi achievements and economic state, and logs financial events.
 *
 * @param {WorldState} world - The current world state.
 * @param {BashoState} basho - The state of the completed basho.
 * @param {Id} yusho - The ID of the rikishi who won the tournament championship.
 * @returns {Object} An object containing the prize results and the calculated state impact.
 */
export function distributePrizes(
  world: WorldState,
  basho: BashoState,
  yusho: Id
): { prizes: SpecialPrizesResult; impact: StateImpact } {
  const builder = createImpactBuilder("distributePrizes");
  const prizes = determineSpecialPrizes(basho.matches, world.rikishi, yusho);

  const SANSHO_PRIZE_AMOUNT = 2000000;
  const awardTypes = {
    shukunsho: "Shukun",
    kantosho: "Kanto",
    ginoSho: "Gino",
  } as const;

  const sanshoNarrativeLines: PbpLine[] = [];
  const sanshoRng = rngFromSeed(`sansho-${basho.bashoName}-${world.year}`, "sansho", "ceremony");

  // Ceremony intro line
  const introRes = BardEngine.resolve(sanshoRng, "sansho_ceremony.ceremony_intro", {});
  if (introRes.text && !introRes.text.includes("[MISSING:")) {
    sanshoNarrativeLines.push({
      text: introRes.text,
      id: `sansho-intro-${basho.bashoName}-${world.year}`,
      phase: "ceremony",
    });
  }

  // Track multiple prizes per rikishi
  const prizeCounts: Record<string, number> = {};

  for (const [key, type] of Object.entries(awardTypes)) {
    const rikishiId = (prizes as Record<string, string | undefined>)[key];
    if (rikishiId) {
      const r = getRikishi(world, rikishiId);
      if (r) {
        // Generate sansho ceremony narrative (Gap 4)
        const sanshoPath =
          type === "Shukun" ? "sansho_ceremony.shukunsho"
          : type === "Kanto" ? "sansho_ceremony.kantosho"
          : "sansho_ceremony.ginosho";
        const sanshoRes = BardEngine.resolve(sanshoRng, sanshoPath, {
          SHIKONA: r.shikona,
          PRIZE_NAME: type === "Shukun" ? "Shukun-sho" : type === "Kanto" ? "Kanto-sho" : "Gino-sho",
          rikishiId: r.id,
        });
        if (sanshoRes.text && !sanshoRes.text.includes("[MISSING:")) {
          sanshoNarrativeLines.push({
            text: sanshoRes.text,
            id: `sansho-${type}-${rikishiId}-${basho.bashoName}-${world.year}`,
            phase: "ceremony",
          });
        }
        prizeCounts[rikishiId] = (prizeCounts[rikishiId] ?? 0) + 1;

        const currentAchievements = r.stats?.achievements || {
          kinboshiEarned: 0,
          ginboshiEarned: 0,
          kinboshiConceded: 0,
          ginboshiConceded: 0,
          mochikyukinPoints: 0,
          specialPrizes: { shukunSho: 0, kantoSho: 0, ginoSho: 0 },
        };
        const currentSp = currentAchievements.specialPrizes || {
          shukunSho: 0,
          kantoSho: 0,
          ginoSho: 0,
        };
        const updatedSp = { ...currentSp };
        if (type === "Shukun") updatedSp.shukunSho++;
        else if (type === "Kanto") updatedSp.kantoSho++;
        else if (type === "Gino") updatedSp.ginoSho++;

        // Apply sansho popularity boost via applyAchievementImpact
        const tempR = { ...r, economics: r.economics ? { ...r.economics } : undefined };
        if (tempR.economics) {
          builder.merge(applyAchievementImpact(world, tempR, "sansho"));
          // Update tempR.economics to reflect the popularity boost for subsequent prize money
          tempR.economics = {
            ...tempR.economics,
            popularity: Math.min(100, (tempR.economics.popularity || 0) + 12),
          };
        }

        builder.updateRikishi(rikishiId, {
          stats: {
            ...r.stats,
            achievements: {
              ...currentAchievements,
              specialPrizes: updatedSp,
            },
          },
          ...(tempR.economics && { economics: tempR.economics }),
        });

        builder.logEvent(
          "AWARD_CONFERRED",
          "economy",
          {
            money: SANSHO_PRIZE_AMOUNT,
            status: "special_prize",
            regimen: type as string,
            narrative: sanshoNarrativeLines.filter((l) => l.id.includes(`sansho-${type}-${rikishiId}`)),
          },
          { rikishiId: r.id, heyaId: r.heyaId }
        );

        // Credit sansho prize to rikishi economics (not heya funds under JSA model)
        // Use tempR.economics (with popularity boost) if available, otherwise fall back to r.economics
        const economics = tempR.economics || r.economics || {
          cash: 0,
          retirementFund: 0,
          careerKenshoWon: 0,
          kinboshiCount: 0,
          totalEarnings: 0,
          currentBashoEarnings: 0,
          popularity: 50,
        };
        // Split sansho: 50% cash, 50% retirement fund
        const sanshoCash = SANSHO_PRIZE_AMOUNT * 0.5;
        const sanshoRetirement = SANSHO_PRIZE_AMOUNT * 0.5;

        builder.updateRikishi(r.id, {
          economics: {
            ...economics,
            cash: economics.cash + sanshoCash,
            retirementFund: economics.retirementFund + sanshoRetirement,
            totalEarnings: economics.totalEarnings + SANSHO_PRIZE_AMOUNT,
          },
        });
      }
    }
  }

  // Multiple prizes narrative
  for (const [rid, count] of Object.entries(prizeCounts)) {
    if (count >= 2) {
      const r = getRikishi(world, rid);
      if (r) {
        const multiRes = BardEngine.resolve(sanshoRng, "sansho_ceremony.multiple_prizes", {
          SHIKONA: r.shikona,
          COUNT: count.toString(),
          rikishiId: r.id,
        });
        if (multiRes.text && !multiRes.text.includes("[MISSING:")) {
          sanshoNarrativeLines.push({
            text: multiRes.text,
            id: `sansho-multi-${rid}-${basho.bashoName}-${world.year}`,
            phase: "ceremony",
          });
        }
      }
    }
  }

  // Log ceremony intro narrative as a separate event
  if (sanshoNarrativeLines.length > 0) {
    builder.logEvent(
      "LIFECYCLE_EVENT",
      "narrative",
      { status: "sansho_ceremony", narrative: sanshoNarrativeLines },
      {}
    );
  }

  return { prizes, impact: builder.build() };
}

/**
 * Pay basho teate (tournament allowance) to non-sekitori rikishi.
 * Paid by JSA directly to rikishi economics.
 *
 * @param {WorldState} world - The current world state.
 * @returns {StateImpact} The state impact containing the allowance payments.
 */
export function payBashoTeate(world: WorldState): StateImpact {
  const builder = createImpactBuilder("payBashoTeate");

  for (const id of world.activeRikishiIds) {
    const r = getRikishi(world, id);
    if (!r) continue;

    // Only non-sekitori receive basho teate
    if (isSekitoriDivision(r.division)) continue;

    const teateAmount = NON_SEKITORI_BASHO_ALLOWANCE[r.division] || 0;

    if (teateAmount > 0) {
      const economics = r.economics || {
        cash: 0,
        retirementFund: 0,
        careerKenshoWon: 0,
        kinboshiCount: 0,
        totalEarnings: 0,
        currentBashoEarnings: 0,
        popularity: 50,
      };
      builder.updateRikishi(id, {
        economics: {
          ...economics,
          cash: economics.cash + teateAmount,
          totalEarnings: economics.totalEarnings + teateAmount,
        },
      });
    }
  }

  return builder.build();
}

/**
 * Pay kinboshi stipends to rikishi who earned kinboshi this basho.
 * Uses per-basho kinboshi count tracked in basho.kinboshiThisBasho.
 *
 * @param {WorldState} world - The current world state.
 * @returns {StateImpact} The state impact containing the stipend payments.
 */
export function payKinboshiStipends(world: WorldState): StateImpact {
  const builder = createImpactBuilder("payKinboshiStipends");
  const basho = world.currentBasho;
  if (!basho) return builder.build();

  const kinboshiMap = basho.kinboshiThisBasho ?? {};

  for (const [rikishiId, count] of Object.entries(kinboshiMap)) {
    if (count <= 0) continue;
    const r = getRikishi(world, rikishiId);
    if (!r || r.isRetired) continue;

    const stipend = count * SIMULATION_CONFIG.prizes.kinboshiStipend;
    const economics = r.economics || {
      cash: 0,
      retirementFund: 0,
      careerKenshoWon: 0,
      kinboshiCount: 0,
      totalEarnings: 0,
      currentBashoEarnings: 0,
      popularity: 50,
    };
    builder.updateRikishi(rikishiId, {
      economics: {
        ...economics,
        cash: economics.cash + stipend,
        totalEarnings: economics.totalEarnings + stipend,
      },
    });
  }

  return builder.build();
}
