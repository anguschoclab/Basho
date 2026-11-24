/**
 * DynastyService.ts
 * =================
 * Orchestrates multi-generational stable succession.
 * (Phase 5: The Legacy Engine)
 *
 * Design decisions applied:
 * - Successor can be designated at any time (no age lock)
 * - Succession is forced when Oyakata age >= 70
 * - "Dynasty" legacyTier grants +5% training multiplier
 */

import type { WorldState } from "@/engine/types/world";
import type { Rikishi } from "@/engine/types/rikishi";
import type { Heya } from "@/engine/types/heya";
import type { DynastyRecord } from "@/engine/types/dynasty";
import type {
  Oyakata,
  OyakataArchetype,
  OyakataTraits,
  SuccessionReadiness,
} from "@/engine/types/oyakata";
import type { ImpactBuilder } from "@/engine/core/ImpactBuilder";
import { retireRikishiFully } from "@/engine/lifecycle/processRetirements";
import { isSekitoriDivision, isYokozunaOrOzekiRank } from "@/constants/engine/rankDisplay";
import { RANK_HIERARCHY } from "@/engine/types/banzuke";
import type { Rank } from "@/engine/types/banzuke";
import { createImpactBuilder, worldWithQueuedFields } from "@/engine/core/ImpactBuilder";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { StateImpact } from "@/engine/core/StateImpact";
import { TrainingPhilosophyService } from "@/engine/legacy/TrainingPhilosophyService";
import { getHeya, getRikishi, getHeyaRoster } from "@/engine/core/queries";
import { adjustBrandForOyakata } from "@/engine/keshoMawashi/HeyaBrandGenerator";
import type { Id } from "@/engine/types/common";
import { executeMerger, findMergerTarget } from "@/engine/economy/mergers";
import {
  HEYA_FLOOR,
  PRESTIGE_COLLAPSE_BAND,
  INHERIT_MAKUUCHI_BASHO,
  INHERIT_SEKITORI_BASHO,
  LOAN_ISSUANCE_THRESHOLD,
} from "@/constants/engine/economic";

import type { RetiredRikishiSummary } from "@/engine/types/history";
import { rngForWorld } from "@/engine/core/rng";
import { ICHIMON_MIGRATION_CHANCE } from "@/constants/engine/governance";
import {
  SUCCESSION_INSOLVENCY_EVENTS,
  SUCCESSION_MAJOR_SCANDALS,
  SUCCESSION_UNDERPERFORMANCE_BASHO,
  LEGACY_MODIFIER_DURATION_BASHO,
  SUCCESSION_CLOSURE_MAX_ROSTER,
  SUCCESSION_COLLAPSE_MAX_ROSTER,
  SUCCESSION_CLOSURE_SANCTION_WEEKS,
} from "@/constants/engine/succession";

function isSummary(entry: unknown): entry is RetiredRikishiSummary {
  return (
    !!entry && typeof entry === "object" && (entry as { isSummary?: unknown }).isSummary === true
  );
}

function computeHighestRank(rikishi: Rikishi | RetiredRikishiSummary): Rank {
  // Summaries already carry peakRank (computed from careerHistory at summarization).
  if (isSummary(rikishi)) return rikishi.peakRank;
  let best: Rank = rikishi.rank;
  let bestTier = RANK_HIERARCHY[best]?.tier ?? 99;
  for (const snap of rikishi.careerHistory ?? []) {
    const tier = RANK_HIERARCHY[snap.rank as Rank]?.tier ?? 99;
    if (tier < bestTier) {
      best = snap.rank;
      bestTier = tier;
    }
  }
  return best;
}

/**
 * Ironman end-of-career (T1.2): a forced succession on the player heya under
 * careerMode "ironman" writes `world.gameOver` instead of continuing the
 * dynasty — the run is over. Returns true when the path was handled.
 */
function endIronmanCareer(
  world: WorldState,
  builder: ImpactBuilder,
  heya: Heya,
  oyakata: Oyakata,
  reason: string
): boolean {
  if (heya.id !== world.playerHeyaId) return false;
  if (world.settings?.careerMode !== "ironman") return false;
  builder.updateWorldField("gameOver", {
    reason: `${oyakata.name} is forced to step down: ${reason}.`,
    oyakataName: oyakata.name,
    year: world.year,
  });
  builder.logEvent(
    "LIFECYCLE_EVENT",
    "discipline",
    {
      incident: "ironman_career_end",
      status: "retired",
      reason: `${oyakata.name}'s career is over: ${reason}. Ironman mode — the run ends here.`,
      heyaId: heya.id,
    },
    { heyaId: heya.id, importance: "headline" }
  );
  return true;
}

/**
 * Yearly-boundary check (phase06_yearly_boundary): updates successionReadiness
 * on each Oyakata and resolves forced successions — heir promotion when a
 * successor exists, stable closure for dying heirless stables, trustee
 * appointment for viable heirless stables.
 */
function expireSanyoAdvisors(world: WorldState, builder: ImpactBuilder): void {
  for (const o of world.oyakata?.values() ?? []) {
    if (
      o.elderStatus === "sanyo" &&
      !o.retirementYear &&
      world.year >= (o.sanyoExpiryYear ?? Number.POSITIVE_INFINITY)
    ) {
      builder.updateOyakata(o.id, { retirementYear: world.year });
      builder.logEvent(
        "GOVERNANCE_RULING",
        "narrative",
        {
          incident: "sanyo_advisory_complete",
          shikona: o.name,
          reason: `${o.name} completed his sanyo advisory term at 70 (JSA).`,
        },
        { heyaId: o.heyaId }
      );
    }
  }
}

function tickSuccessionCheck(world: WorldState): StateImpact {
  const builder = createImpactBuilder("tickSuccessionCheck");

  // Succession producers snapshot absolute world fields (myosekiMarket,
  // records, bloodlineRegistry) from the world they receive. Resolve the
  // batch accumulated so far so each succession sees the earlier ones —
  // under last-wins merge the next reseat would otherwise drop every elder
  // stock transfer but its own (S1-5). It also keeps findEligibleSuccessors
  // honest: a rikishi promoted earlier in this same check is already retired
  // in the resolved base and cannot be picked for a second stable.
  const successionBase = (): WorldState => resolveImpacts(world, [builder.build()]);

  for (const [_heyaId, heya] of world.heyas) {
    const oyakata = world.oyakata?.get(heya.oyakataId || "");
    if (!oyakata) continue;

    // Sandbox mode: the player heya is exempt from all succession paths
    // (age cliff, readiness transitions, and board-mandated triggers).
    if (heya.id === world.playerHeyaId && world.settings?.careerMode === "sandbox") continue;

    const age = oyakata.age;

    // 1. Soft Readiness (60-65)
    // Readiness reaches 100 at age 65 (JSA Rules)
    const readinessValue = Math.max(0, Math.min(100, (age - 55) * 10));
    const readiness: "stable" | "transitioning" | "mandatory" =
      age >= 65 ? "mandatory" : age >= 60 ? "transitioning" : "stable";

    if (oyakata.successionReadiness !== readiness) {
      builder.updateOyakata(oyakata.id, { successionReadiness: readiness });
      builder.logEvent(
        "GOVERNANCE_RULING",
        "discipline",
        {
          incident: "succession_readiness_update",
          status: age >= 62 ? "warning" : "info",
          reason: `${oyakata.name} is ${age} years old. Mandatory retirement at 65 (JSA).`,
          score: readinessValue,
        },
        { heyaId: heya.id }
      );
    }

    // Jun-toshiyori expiry: a temporary elder who never acquired stock must
    // step down when the appointment lapses (JSA grace period exhausted).
    const junExpired =
      oyakata.elderStatus === "jun_toshiyori" &&
      world.year >= (oyakata.elderExpiryYear ?? Number.POSITIVE_INFINITY);

    // Forced succession at 65, or at jun-toshiyori expiry
    if ((age >= 65 || junExpired) && !oyakata.retirementYear) {
      if (
        endIronmanCareer(
          world,
          builder,
          heya,
          oyakata,
          junExpired ? "jun-toshiyori appointment expired" : "mandatory retirement at 65 (JSA)"
        )
      ) {
        continue;
      }
      const base = successionBase();
      const eligible = findEligibleSuccessors(base, heya.id);
      // triggerSuccession no-ops on summarized successors — pick the first
      // FULL candidate, else fall through to the generic trustee path
      // (V16-B33: previously the oyakata survived past 65 forever).
      const viable = eligible.find((sid) => {
        const entry = getRikishi(base, sid) ?? base.historicalRikishi?.get(sid);
        return entry && !isSummary(entry);
      });
      if (viable) {
        builder.merge(triggerSuccession(base, heya.id, viable));
      } else if (closeIfHeirlessAndDying(base, heya, builder)) {
        // Stable folded — roster dispersed by the merger.
      } else {
        // Fallback: Generate a generic oyakata if no rikishi is eligible
        const dummyId = `oyakata_trustee_${heya.id}_${world.year}`;
        builder.merge(triggerSuccessionWithGeneric(base, heya.id, dummyId));
      }
      continue;
    }

    // WS5 — canon §16.1 non-age triggers apply to every heya, including the
    // player's: repeated insolvency, major scandals, or chronic
    // underperformance force a board-mandated succession. The player keeps
    // playing as the successor (dynasty frame); warnings surface via
    // projectManagerCareer's successionRisk fractions.
    if (!oyakata.retirementYear) {
      const tenure = oyakata.tenure;
      // Insolvency only forces the master out while the stable is still
      // drowning — a heya that took bailouts then recovered (sekitori income,
      // koenkai growth) has already answered the board's confidence question.
      const stillInsolvent = (heya.funds ?? 0) < LOAN_ISSUANCE_THRESHOLD;
      const reason =
        (tenure?.insolvencyEvents ?? 0) >= SUCCESSION_INSOLVENCY_EVENTS && stillInsolvent
          ? "repeated insolvency — the board lost confidence"
          : (tenure?.majorScandals ?? 0) >= SUCCESSION_MAJOR_SCANDALS
            ? "accumulated major scandals"
            : (heya.consecutiveUnderperformanceBasho ?? 0) >= SUCCESSION_UNDERPERFORMANCE_BASHO
              ? "chronic underperformance"
              : undefined;

      if (reason) {
        if (endIronmanCareer(world, builder, heya, oyakata, reason)) continue;
        const base = successionBase();
        const eligible = findEligibleSuccessors(base, heya.id);
        builder.logEvent(
          "GOVERNANCE_RULING",
          "discipline",
          {
            incident: "forced_succession",
            status: "warning",
            reason: `${oyakata.name} is forced to step down: ${reason}.`,
            heyaId: heya.id,
          },
          { heyaId: heya.id, importance: "major" }
        );
        // Same viability filter as the age path: a summary-only successor
        // makes triggerSuccession a silent no-op — pick the first FULL
        // candidate, else fall through to the generic trustee.
        const viable = eligible.find((sid) => {
          const entry = getRikishi(base, sid) ?? base.historicalRikishi?.get(sid);
          return entry && !isSummary(entry);
        });
        if (viable) {
          builder.merge(triggerSuccession(base, heya.id, viable));
        } else if (!closeIfHeirlessAndDying(base, heya, builder)) {
          const dummyId = `oyakata_trustee_${heya.id}_${world.year}`;
          builder.merge(triggerSuccessionWithGeneric(base, heya.id, dummyId));
        }
      }
    }
  }

  expireSanyoAdvisors(world, builder);

  return builder.build();
}

/**
 * Finds eligible successors for a stable.
 * Includes:
 * 1. Current roster members (Sekitori rank preferred).
 * 2. Alumni (formerly trained at this stable) who are currently retired or at other stables.
 */
function findEligibleSuccessors(world: WorldState, heyaId: string): string[] {
  const eligible: string[] = [];

  // 1. Current roster & alumni
  for (const rikishiId of world.activeRikishiIds) {
    const rikishi = getRikishi(world, rikishiId);
    if (!rikishi) continue;
    const isSekitori = isSekitoriDivision(rikishi.division);
    // WS-6 — inherit is the LOWEST ladder tier: 12 makuuchi or 20 sekitori
    // basho (career juryo-lifers like Kanechika qualify; fresh J13s don't).
    const history = rikishi.careerHistory ?? [];
    const sekitoriBasho = history.filter(
      (h) => h.division === "makuuchi" || h.division === "juryo"
    ).length;
    const makuuchiBasho = history.filter((h) => h.division === "makuuchi").length;
    const meetsInheritBar =
      makuuchiBasho >= INHERIT_MAKUUCHI_BASHO || sekitoriBasho >= INHERIT_SEKITORI_BASHO;
    // Elite candidates: seasoned current sekitori or qualifying alumni.
    if (rikishi.heyaId === heyaId && isSekitori && meetsInheritBar) {
      eligible.push(rikishi.id);
      continue;
    }

    const wasAlumnus = rikishi.heyaHistory?.some((h) => h.heyaId === heyaId);
    if (wasAlumnus && meetsInheritBar) {
      eligible.push(rikishi.id);
    }
  }

  // 1.5. Drought Fallback: Senior Makushita from current roster
  if (eligible.length === 0) {
    for (const rikishiId of world.activeRikishiIds) {
      const rikishi = getRikishi(world, rikishiId);
      if (!rikishi) continue;
      if (
        rikishi.heyaId === heyaId &&
        rikishi.division === "makushita" &&
        (rikishi.rankNumber || 99) <= 10
      ) {
        eligible.push(rikishi.id);
      }
    }
  }

  // 2. Fallback: Check historical rikishi (retired legends)
  if (eligible.length === 0 && world.historicalRikishi) {
    for (const [id, r] of world.historicalRikishi) {
      const highestRank = computeHighestRank(r);
      if (isYokozunaOrOzekiRank(highestRank)) {
        eligible.push(id);
      }
    }
  }

  return eligible;
}

/**
 * Retires the current Oyakata and promotes the designated successor.
 * Writes a DynastyRecord and mutates the stable's TrainingPhilosophy.
 */
export function triggerSuccession(
  world: WorldState,
  heyaId: string,
  successorRikishiId: string
): StateImpact {
  const builder = createImpactBuilder("triggerSuccession");
  const heya = getHeya(world, heyaId);
  const currentOyakata = world.oyakata?.get(heya?.oyakataId ?? "");
  const successorIsActive = world.rikishi.has(successorRikishiId);
  const successorEntry =
    getRikishi(world, successorRikishiId) ?? world.historicalRikishi?.get(successorRikishiId);

  if (!heya || !currentOyakata || !successorEntry) return builder.build();

  // Succession needs a full Rikishi for rank/avatarConfig. If the entry is
  // a summary (post-year-end-summarization), load from cold storage or skip.
  if (isSummary(successorEntry)) {
    return builder.build();
  }
  const successorRikishi = successorEntry;

  // 1. Write the dynasty record for the retiring Oyakata
  const record = buildRetirementDynastyRecord(world, heya, currentOyakata);

  // 2. Evolve the Training Philosophy under the successor's archetype
  const evolvedPhilosophy = TrainingPhilosophyService.evolveForSuccessor(
    heya.trainingPhilosophy ?? TrainingPhilosophyService.getDefault(),
    currentOyakata
  );

  // 3. Update legacy tier
  const newEra = record.era;
  const newTier = deriveLegacyTier(heya, newEra);

  // 4. Create the new Oyakata entity — traits inherit from the successor's
  // career and the predecessor's reign (canon §16.3), and the predecessor's
  // plan family leaves a decaying legacyModifier on the heya.
  const newOyakataId = `oyakata_promoted_${successorRikishiId}`;
  const newOyakata = buildSuccessorOyakata(
    world,
    heyaId,
    successorRikishiId,
    successorRikishi,
    currentOyakata,
    newOyakataId
  );
  builder.addOyakata(newOyakata);

  // The predecessor's active plan biases the successor's early planning.
  const predecessorPlanId = currentOyakata.memory?.activePlan?.planId;
  const legacyModifier = predecessorPlanId
    ? { planFamilyBias: predecessorPlanId, bashoRemaining: LEGACY_MODIFIER_DURATION_BASHO }
    : undefined;

  // 5. Full retirement cascade for the successor (only if still active):
  // retireRikishiFully handles archival + career events + roster sync.
  if (successorIsActive) {
    retireRikishiFully(world, successorRikishi, "Promoted to Oyakata", builder);
  }

  // 6. Remove the outgoing oyakata — previously they vanished from the chair
  // but remained a live oyakata entity. Exception: a stockholding elder
  // retiring at the mandatory 65 may serve the JSA as a sanyo (consultant)
  // until 70 — he stays in the registry as an emeritus advisor.
  const sanyoEligible =
    currentOyakata.age >= 65 && (currentOyakata.elderStatus ?? "toshiyori") !== "jun_toshiyori";
  if (sanyoEligible) {
    builder.updateOyakata(currentOyakata.id, {
      isEmeritus: true,
      elderStatus: "sanyo",
      sanyoExpiryYear: world.year + (70 - currentOyakata.age),
    });
  } else {
    builder.removeOyakata(currentOyakata.id);
  }

  // 7. Elder-stock succession: the retiring oyakata's held myoseki passes to
  // the new oyakata — a succession without the chair's stock is not a real
  // handover.
  transferElderStock(builder, world, currentOyakata.id, newOyakataId);
  builder.updateHeya(heyaId, {
    dynasty: [...(heya.dynasty ?? []), record],
    trainingPhilosophy: evolvedPhilosophy,
    legacyTier: newTier,
    oyakataId: newOyakataId,
    legacyModifier,
    // The underperformance streak belonged to the predecessor's reign — the
    // successor gets his own window before the board can act on it again.
    consecutiveUnderperformanceBasho: 0,
  });

  // 7b. WS-7 — ichimon migration: a heya's clan follows the lineage of the
  // elder stock its master holds. If the inherited share belongs to another
  // clan, the new master MAY realign (seeded — migration is a choice, and
  // real realignments are rare). The stock transfer above already ran, so
  // read the queued market snapshot for the lineage.
  {
    const stock = Object.values(
      worldWithQueuedFields(world, builder).myosekiMarket?.stocks ?? {}
    ).find((s) => s.holderId === newOyakataId);
    if (stock?.ichimon && stock.ichimon !== heya.ichimon) {
      const roll = rngForWorld(world, "governance", `ichimon_migration_${heyaId}`).bool(
        ICHIMON_MIGRATION_CHANCE
      );
      if (roll) {
        builder.updateHeya(heyaId, { ichimon: stock.ichimon });
        builder.logEvent(
          "GOVERNANCE_RULING",
          "discipline",
          {
            incident: "ichimon_migration",
            description: `${heya.name} realigns from ${heya.ichimon ?? "unaffiliated"} to the ${stock.ichimon} ichimon under its new master — the clan lineage of his elder stock.`,
          },
          { heyaId, importance: "notable" }
        );
      }
    }
  }

  // 8. The stable's brand identity drifts toward the new master's temperament
  // — a succession under a traditionalist pulls traditionLevel up, a
  // scientist/indulgent oyakata pulls it down.
  const brandId = heya.brandIdentityId;
  const brand = brandId ? world.heyaBrandIdentities?.get(brandId) : undefined;
  if (brand && world.heyaBrandIdentities) {
    const adjusted = adjustBrandForOyakata(brand, newOyakata.archetype);
    if (adjusted !== brand) {
      const nextBrands = new Map(world.heyaBrandIdentities as Map<Id, typeof brand>);
      nextBrands.set(brand.id, adjusted);
      builder.updateWorldField("heyaBrandIdentities", nextBrands as never);
    }
  }

  builder.logEvent(
    "LIFECYCLE_EVENT",
    "narrative",
    {
      rikishiId: successorRikishiId,
      shikona: successorRikishi.shikona,
      status: "oyakata_promotion",
      reason: `${currentOyakata.name} has reached the JSA retirement age of 65. ${successorRikishi.shikona} takes command.`,
      incident: `A new era begins at ${heya.name}.`,
    },
    { heyaId, importance: "headline" }
  );

  return builder.build();
}

/** Writes the DynastyRecord for the retiring Oyakata's completed reign. */
function buildRetirementDynastyRecord(
  world: WorldState,
  heya: Heya,
  currentOyakata: Oyakata
): DynastyRecord {
  const reignFrom = world.year - (currentOyakata.yearsInCharge ?? 0);
  return {
    era: (heya.dynasty?.length ?? 0) + 1,
    oyakataId: currentOyakata.id,
    oyakataName: currentOyakata.name,
    reignFrom,
    reignTo: world.year,
    achievementsInReign: {
      yushoCount: heya.historicalYusho ?? 0,
      globalCupWins: (world.chronicle?.globalCups ?? []).filter(
        (c) => c.championHeya === heya.id && c.year >= reignFrom && c.year <= world.year
      ).length,
      hofInductees: (world.hallOfFame?.inductees ?? [])
        .filter(
          (i) =>
            i.inductionYear >= reignFrom &&
            i.inductionYear <= world.year &&
            (world.rikishi.get(i.rikishiId)?.heyaId ??
              world.historicalRikishi.get(i.rikishiId)?.heyaId) === heya.id
        )
        .map((i) => i.shikona),
      boardSeatsWon: currentOyakata.tenure?.boardSeatsWon ?? 0,
    },
    trainingPhilosophyAtReign: heya.trainingPhilosophy ?? TrainingPhilosophyService.getDefault(),
  };
}

/** Builds the promoted Oyakata entity; traits inherit career + predecessor reign. */
function buildSuccessorOyakata(
  world: WorldState,
  heyaId: string,
  successorRikishiId: string,
  successorRikishi: Rikishi,
  currentOyakata: Oyakata,
  newOyakataId: string
): Oyakata {
  const tenure = currentOyakata.tenure;
  const peak = computeHighestRank(successorRikishi);
  const wasStar = isYokozunaOrOzekiRank(peak);
  // A successor who never reached sekitori carries the journeyman profile.
  const wasJourneyman = RANK_HIERARCHY[peak]?.isSekitori !== true;
  const injuryProne =
    (successorRikishi.consecutiveKyujo ?? 0) >= 1 ||
    (successorRikishi.injuryWeeksRemaining ?? 0) > 0;
  const traits: OyakataTraits = {
    ambition: 50,
    patience: 50,
    risk: 50,
    tradition: 50,
    compassion: 50,
  };
  if (wasStar) {
    traits.ambition += 15;
    traits.risk += 5;
  }
  if (wasJourneyman) {
    traits.patience += 10;
    traits.tradition += 10;
  }
  if (injuryProne) traits.compassion += 10;
  if ((tenure?.championships ?? 0) >= 3) traits.ambition += 5;
  if ((tenure?.majorScandals ?? 0) >= 1) traits.tradition += 10;
  if ((tenure?.insolvencyEvents ?? 0) >= 2) traits.patience += 10;

  return {
    id: newOyakataId,
    heyaId: heyaId,
    name: `${successorRikishi.shikona} Oyakata`,
    shikona: successorRikishi.shikona,
    formerShikona: successorRikishi.shikona,
    highestRank: successorRikishi.rank,
    age: world.year - successorRikishi.birthYear,
    yearsInCharge: 0,
    archetype: "traditionalist" as OyakataArchetype,
    traits,
    tenure: {
      startedYear: world.year,
      bashoServed: 0,
      championships: 0,
      sekitoriProduced: 0,
      sanyakuProduced: 0,
      ozekiProduced: 0,
      yokozunaProduced: 0,
      insolvencyEvents: 0,
      majorScandals: 0,
      forcedMergers: 0,
    },
    successionReadiness: "stable" as SuccessionReadiness,
    avatarConfig: successorRikishi.avatarConfig,
    formerRikishiId: successorRikishiId,
  };
}

/** Passes the outgoing oyakata's held myoseki to the new oyakata. */
function transferElderStock(
  builder: ImpactBuilder,
  world: WorldState,
  fromOyakataId: string,
  toOyakataId: string
): void {
  // A retiree→oyakata conversion earlier in this same batch may already have
  // queued a myosekiMarket write on this builder (merit-stock mint + sale
  // transaction). Read the queued snapshot so the reseat composes onto it —
  // reverting to the pre-batch market erases the minted stock and leaves the
  // conversion oyakata a ghost with no elder name (S1-4).
  const market = worldWithQueuedFields(world, builder).myosekiMarket;
  if (!market?.stocks) return;
  const nextStocks = { ...market.stocks };
  let changed = false;
  for (const [stockId, stock] of Object.entries(market.stocks)) {
    if (stock.holderId === fromOyakataId || stock.ownerId === fromOyakataId) {
      // Shakukabu (borrowed stock): a share the outgoing master owned but
      // leased out cannot follow him — the lessee's claim dies with the
      // owner's retirement and the share reverts to the heir outright.
      const leaseVacates = stock.ownerId === fromOyakataId && stock.status === "leased";
      nextStocks[stockId] = {
        ...stock,
        holderId:
          stock.holderId === fromOyakataId || leaseVacates ? toOyakataId : stock.holderId,
        ownerId: stock.ownerId === fromOyakataId ? toOyakataId : stock.ownerId,
        ...(leaseVacates
          ? { status: "held" as const, leaseFee: undefined, askingPrice: undefined }
          : {}),
      };
      changed = true;
    }
  }
  if (changed) {
    builder.updateWorldField("myosekiMarket", {
      ...market,
      history: market.history ?? [],
      stocks: nextStocks,
    });
  }
}

/**
 * Fallback for when no eligible rikishi exists. JSA appoints a trustee.
 */
function triggerSuccessionWithGeneric(
  world: WorldState,
  heyaId: string,
  dummyId: string
): StateImpact {
  const builder = createImpactBuilder("triggerSuccessionWithGeneric");
  const heya = getHeya(world, heyaId);
  const currentOyakata = world.oyakata?.get(heya?.oyakataId ?? "");

  if (!heya || !currentOyakata) return builder.build();

  const name = `JSA Trustee (${currentOyakata.shikona} lineage)`;

  const newOyakata = {
    id: dummyId,
    heyaId,
    name,
    shikona: "Trustee",
    age: 45,
    yearsInCharge: 0,
    archetype: "traditionalist" as OyakataArchetype,
    traits: { ambition: 30, patience: 50, risk: 20, tradition: 80, compassion: 50 },
    // A trustee is a caretaker: damped persona, fresh tenure clock.
    isCaretaker: true,
    tenure: {
      startedYear: world.year,
      bashoServed: 0,
      championships: 0,
      sekitoriProduced: 0,
      sanyakuProduced: 0,
      ozekiProduced: 0,
      yokozunaProduced: 0,
      insolvencyEvents: 0,
      majorScandals: 0,
      forcedMergers: 0,
    },
    successionReadiness: "stable" as SuccessionReadiness,
  };

  builder.addOyakata(newOyakata);
  builder.updateHeya(heyaId, {
    oyakataId: dummyId,
    // A caretaker inherits the stable, not the predecessor's firing offense —
    // the board must give him the same window any new master would get.
    consecutiveUnderperformanceBasho: 0,
  });
  // Same sanyo rule as the heir path: a stockholding elder retiring at the
  // mandatory 65 may stay in the JSA as a consultant until 70.
  if (currentOyakata.age >= 65 && (currentOyakata.elderStatus ?? "toshiyori") !== "jun_toshiyori") {
    builder.updateOyakata(currentOyakata.id, {
      isEmeritus: true,
      elderStatus: "sanyo",
      sanyoExpiryYear: world.year + (70 - currentOyakata.age),
    });
  } else {
    builder.removeOyakata(currentOyakata.id);
  }
  // The chair's elder stock passes to the trustee — removing the oyakata
  // without reseating their stock leaves a dangling ownerId/holderId.
  transferElderStock(builder, world, currentOyakata.id, dummyId);

  builder.logEvent(
    "LIFECYCLE_EVENT",
    "narrative",
    {
      status: "oyakata_promotion",
      reason: `${currentOyakata.name} has retired. JSA has appointed a trustee for ${heya.name}.`,
    },
    { heyaId, importance: "headline" }
  );

  return builder.build();
}

/**
 * Closure-on-failed-succession (Miyagino precedent): when the master departs
 * with no heir, the JSA lets an ALREADY-DYING stable fold rather than
 * appointing a trustee to a corpse. The roster disperses via the standard
 * merger machinery — wrestlers are redistributed, the stable archives into
 * closedHeyas, and the master's elder stock returns to the JSA pool.
 *
 * Dying means any of:
 * - persistently sanctioned (>= SUCCESSION_CLOSURE_SANCTION_WEEKS in state),
 * - prestigeBand collapsed ("struggling") AND roster too thin to sustain
 *   keiko (<= SUCCESSION_COLLAPSE_MAX_ROSTER) — a functioning roster always
 *   attracts a caretaker elder in real JSA practice, so prestige collapse
 *   alone never folds a viable stable,
 * - roster too thin to sustain keiko at all (<= SUCCESSION_CLOSURE_MAX_ROSTER).
 *
 * Guards: the player heya always gets a trustee (dynasty frame — the player
 * keeps playing as the successor), and the league never drops below
 * HEYA_FLOOR via this path.
 *
 * @returns true when the stable was closed (merger merged into `builder`).
 */
function closeIfHeirlessAndDying(world: WorldState, heya: Heya, builder: ImpactBuilder): boolean {
  if (heya.id === world.playerHeyaId) return false;
  if (world.heyas.size <= HEYA_FLOOR) return false;

  const rosterSize = getHeyaRoster(world, heya.id).length;
  const persistentlySanctioned =
    heya.welfareState?.complianceState === "sanctioned" &&
    (heya.welfareState?.weeksInState ?? 0) >= SUCCESSION_CLOSURE_SANCTION_WEEKS;
  const dying =
    persistentlySanctioned ||
    (heya.prestigeBand === PRESTIGE_COLLAPSE_BAND &&
      rosterSize <= SUCCESSION_COLLAPSE_MAX_ROSTER) ||
    rosterSize <= SUCCESSION_CLOSURE_MAX_ROSTER;
  if (!dying) return false;

  // Branches fold back into the mother line when the parent can absorb;
  // otherwise the standard merger-target search prefers a same-ichimon stable.
  const parent = heya.branchedFromHeyaId ? getHeya(world, heya.branchedFromHeyaId) : undefined;
  // No roster cap — the mother stable can always fold a branch back in.
  const parentCanAbsorb = parent !== undefined;
  const targetId = parentCanAbsorb ? parent.id : findMergerTarget(world, heya.id);
  if (!targetId) return false;

  // The departing master exits for real inside executeMerger — the oyakata
  // entity is removed and held elder stock returns to the JSA pool.

  builder.logEvent(
    "GOVERNANCE_RULING",
    "narrative",
    {
      incident: "stable_closure",
      heyaname: heya.name,
      heya: targetId,
      reason: "no_successor_dying_stable",
      score: rosterSize,
    },
    { heyaId: heya.id, importance: "headline" }
  );

  builder.merge(executeMerger(world, heya.id, targetId, "succession_no_heir"));
  return true;
}

function deriveLegacyTier(
  heya: ReturnType<WorldState["heyas"]["get"]> & object,
  successionCount: number
): "emerging" | "established" | "dynasty" | "legend" {
  const yusho = heya.historicalYusho ?? 0;
  if (successionCount >= 5 && yusho >= 20) return "legend";
  if (successionCount >= 3 && yusho >= 10) return "dynasty";
  if (successionCount >= 1 && yusho >= 3) return "established";
  return "emerging";
}

/**
 * Returns the training multiplier bonus granted by a stable's legacy tier.
 * Dynasty tier gives +5% as per the design decision.
 */
function getLegacyTierTrainingBonus(tier: string | undefined): number {
  switch (tier) {
    case "legend":
      return 1.1; // +10%
    case "dynasty":
      return 1.05; // +5%
    case "established":
      return 1.02;
    default:
      return 1.0;
  }
}

function generateDynastyReport(world: WorldState, heyaId: string) {
  const heya = getHeya(world, heyaId);
  if (!heya?.dynasty) return null;

  // Bankrupt stables get a "Scholarship Quota" of at least 1 (A6.2)
  if (heya.funds < 0) return null;

  return {
    eras: heya.dynasty,
    currentEra: heya.dynasty.length + 1,
    totalYusho: heya.historicalYusho ?? 0,
    legacyTier: heya.legacyTier ?? "emerging",
    trainingPhilosophy: heya.trainingPhilosophy ?? TrainingPhilosophyService.getDefault(),
    trainingBonus: getLegacyTierTrainingBonus(heya.legacyTier),
  };
}

/**
 * Namespace preserving the public DynastyService.* surface.
 */
export const DynastyService = {
  tickSuccessionCheck,
  findEligibleSuccessors,
  triggerSuccession,
  triggerSuccessionWithGeneric,
  deriveLegacyTier,
  getLegacyTierTrainingBonus,
  generateDynastyReport,
};
