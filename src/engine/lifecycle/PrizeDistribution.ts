import { determineSpecialPrizes } from "@/engine/banzuke/specialPrizes";
import type { SpecialPrizesResult } from "@/engine/banzuke/specialPrizes";
import type { WorldState } from "@/engine/types/world";
import type { Rikishi } from "@/engine/types/rikishi";
import type { BashoState } from "@/engine/types/basho";
import { createImpactBuilder, type ImpactBuilder } from "@/engine/core/ImpactBuilder";
import type { StateImpact } from "@/engine/core/StateImpact";
import { applyAchievementImpact } from "@/engine/economy/SponsorshipService";
import type { Id } from "@/engine/types/common";
import { getRikishi } from "@/engine/core/queries";
import {
  jsaSanshoPrize,
  jsaBashoTeate,
  jsaWinBonus,
  jsaKachikoshiBonus,
  jsaSanyakuBashoAllowance,
} from "@/constants/engine/jsaEra";
import { DEFAULT_START_YEAR } from "@/constants/engine/calendar";
import { getTotalBashodays } from "@/engine/calendar/scheduleHelpers";
import { RANK_HIERARCHY } from "@/engine/types/banzuke";
import { isSekitoriDivision } from "@/constants/engine/rankDisplay";
import { BardEngine } from "@/engine/bard/BardEngine";
import { rngFromSeed, rngForWorld } from "@/engine/core/rng";
import type { PbpLine } from "@/engine/bout/boutNarrative";

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
  const prizes = determineSpecialPrizes(
    basho.matches,
    world.rikishi,
    yusho,
    rngForWorld(world, "governance", "sansho_committee")
  );

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
  const econCache = new Map<string, NonNullable<Rikishi["economics"]>>();
  const achCache = new Map<string, NonNullable<Rikishi["stats"]>["achievements"]>();

  for (const [key, type] of Object.entries(awardTypes)) {
    for (const rikishiId of prizes[key as keyof SpecialPrizesResult] ?? []) {
      awardSansho(
        builder,
        world,
        basho,
        rikishiId,
        type,
        sanshoRng,
        sanshoNarrativeLines,
        prizeCounts,
        econCache,
        achCache
      );
    }
  }

  appendMultiPrizeLines(world, basho, prizeCounts, sanshoRng, sanshoNarrativeLines);

  // Sansho committee feed item: one line per awarded prize with the
  // committee's vote — the real panel's 5-member selection made visible.
  if (prizes.deliberations) {
    for (const d of prizes.deliberations) {
      const [prize, rikishiId] = d.subjectId.split(":");
      const winner =
        prizes.shukunsho.includes(rikishiId) && prize === "shukun" ? "Shukun-sho"
        : prizes.kantosho.includes(rikishiId) && prize === "kanto" ? "Kanto-sho"
        : prizes.ginoSho.includes(rikishiId) && prize === "gino" ? "Gino-sho"
        : null;
      if (!winner) continue;
      const r = getRikishi(world, rikishiId);
      builder.logEvent(
        "AWARD_CONFERRED",
        "governance",
        {
          status: "sansho_committee",
          regime: winner,
          description: `Sansho committee (${d.votesFor}–${d.votesAgainst}) selects ${r?.shikona ?? rikishiId} for ${winner}: ${d.rationale.join("; ")}.`,
          rikishiId,
        },
        { rikishiId, heyaId: r?.heyaId, importance: "notable" }
      );
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

// Era-keyed — the JSA's July-2026 revision raises it ¥2M → ¥3M from Hatsu 2027.
const sanshoPrizeAmount = (world: WorldState) =>
  jsaSanshoPrize(world.year ?? DEFAULT_START_YEAR);

/**
 * Awards one sansho: ceremony narrative line, achievement counters, popularity
 * boost, AWARD_CONFERRED event, and the 50/50 cash/retirement prize credit.
 */
function awardSansho(
  builder: ImpactBuilder,
  world: WorldState,
  basho: BashoState,
  rikishiId: string,
  type: "Shukun" | "Kanto" | "Gino",
  sanshoRng: ReturnType<typeof rngFromSeed>,
  sanshoNarrativeLines: PbpLine[],
  prizeCounts: Record<string, number>,
  econCache: Map<string, NonNullable<Rikishi["economics"]>>,
  achCache: Map<string, NonNullable<Rikishi["stats"]>["achievements"]>
): void {
  const r = getRikishi(world, rikishiId);
  if (!r) return;

  // Generate sansho ceremony narrative (Gap 4)
  const sanshoPath =
    type === "Shukun"
      ? "sansho_ceremony.shukunsho"
      : type === "Kanto"
        ? "sansho_ceremony.kantosho"
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

  // Read accumulated achievements from the cache when present — like
  // econCache, a second sansho for the same rikishi must compose on the first
  // award's write, not the stale base state.
  const currentAchievements = achCache.get(rikishiId) ??
    r.stats?.achievements ?? {
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
  const nextAchievements = { ...currentAchievements, specialPrizes: updatedSp };
  achCache.set(rikishiId, nextAchievements);

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
      achievements: nextAchievements,
    },
    ...(tempR.economics && { economics: tempR.economics }),
  });

  const prizeAmount = sanshoPrizeAmount(world);
  builder.logEvent(
    "AWARD_CONFERRED",
    "economy",
    {
      money: prizeAmount,
      status: "special_prize",
      regimen: type as string,
      narrative: sanshoNarrativeLines.filter((l) => l.id.includes(`sansho-${type}-${rikishiId}`)),
    },
    { rikishiId: r.id, heyaId: r.heyaId }
  );

  // Credit sansho prize to rikishi economics (not heya funds under JSA model)
  // Use tempR.economics (with popularity boost) if available, otherwise fall back to r.economics
  // Read the accumulated economics for this rikishi — each updateRikishi call
  // writes an absolute economics object, so a second sansho for the same
  // rikishi must compose on the first award's write, not the stale base.
  const economics =
    econCache.get(r.id) ??
    tempR.economics ??
    (r.economics || {
      cash: 0,
      retirementFund: 0,
      careerKenshoWon: 0,
      kinboshiCount: 0,
      totalEarnings: 0,
      currentBashoEarnings: 0,
      popularity: 50,
    });
  // Split sansho: 50% cash, 50% retirement fund
  const sanshoCash = prizeAmount * 0.5;
  const sanshoRetirement = prizeAmount * 0.5;

  const nextEconomics = {
    ...economics,
    cash: economics.cash + sanshoCash,
    retirementFund: economics.retirementFund + sanshoRetirement,
    totalEarnings: economics.totalEarnings + prizeAmount,
  };
  econCache.set(r.id, nextEconomics);
  builder.updateRikishi(r.id, { economics: nextEconomics });
}

/** Appends "multiple prizes" narrative lines for rikishi with 2+ sansho. */
function appendMultiPrizeLines(
  world: WorldState,
  basho: BashoState,
  prizeCounts: Record<string, number>,
  sanshoRng: ReturnType<typeof rngFromSeed>,
  sanshoNarrativeLines: PbpLine[]
): void {
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
  const year = world.year ?? DEFAULT_START_YEAR;

  for (const id of world.activeRikishiIds) {
    const r = getRikishi(world, id);
    if (!r) continue;

    // Only non-sekitori receive basho teate
    if (isSekitoriDivision(r.division)) continue;

    // Real JSA non-sekitori compensation: basho teate (場所手当) +
    // shoshi-kin (勝星金, per win) + kachikoshi-kin (勝ち越し金, per net win).
    // For kachikoshi-kin the loss column includes absence days
    // (負け数には休場も含む) — a rikishi who missed days has their net-win
    // total reduced by the unscheduled tail.
    const wins = r.currentBashoWins ?? 0;
    const losses = r.currentBashoLosses ?? 0;
    const absences = Math.max(0, getTotalBashodays(r.division) - wins - losses);
    const teateAmount =
      jsaBashoTeate(r.division, year) +
      wins * jsaWinBonus(r.division, year) +
      Math.max(0, wins - losses - absences) * jsaKachikoshiBonus(r.division, year);

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
 * 本場所特別手当 — per-basho special allowance for sanyaku-and-above
 * (yokozuna ¥200,000 / ozeki ¥150,000 / sekiwake+komusubi ¥50,000), pro-rated
 * by days contested: 11+ full, 6–10 → 2/3, ≤5 → 1/3, full kyujo → none.
 * Paid by the JSA directly to rikishi economics.
 */
export function paySanyakuBashoAllowance(world: WorldState): StateImpact {
  const builder = createImpactBuilder("paySanyakuBashoAllowance");

  for (const id of world.activeRikishiIds) {
    const r = getRikishi(world, id);
    if (!r || !RANK_HIERARCHY[r.rank]?.isSanyaku) continue;

    const contested = (r.currentBashoWins ?? 0) + (r.currentBashoLosses ?? 0);
    const amount = jsaSanyakuBashoAllowance(r.rank, contested);
    if (amount <= 0) continue;

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
        cash: economics.cash + amount,
        totalEarnings: economics.totalEarnings + amount,
      },
    });
  }

  return builder.build();
}

// NOTE: there is intentionally no `payKinboshiStipends` here. A kinboshi's
// monetary value is realized exclusively through mochikyukin: +10 points per
// star (accumulated at basho end via accumulateMochikyukinPoints reading
// basho.kinboshiThisBasho) paid at ¥4,000/point every second month while the
// rikishi remains sekitori. A separate one-time cash stipend would double-pay
// the award and mis-model the real JSA annuity structure.
