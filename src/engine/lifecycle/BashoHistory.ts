import { buildAlmanacSnapshot } from "../almanac";
import { snapshotMediaHeatForBasho } from "../systems/media/MediaService";
import { autosave } from "../saveload";
import { safeCall } from "../utils/safe";
import { rngForWorld } from "../rng";
import { opfsArchiveService } from "../storage/opfsArchive";
import { electronArchiveService } from "../storage/electronArchive";
import type { WorldState } from "../types/world";
import type { BashoState, BashoResult, MatchSchedule, AwardLogEntry } from "../types/basho";
import type { Id } from "../types/common";
import { createImpactBuilder } from "../core/ImpactBuilder";
import type { StateImpact } from "../core/StateImpact";
import { SIMULATION_CONFIG } from "../core/SimulationConfig";
import type { SpecialPrizesResult } from "../banzuke/specialPrizes";
import { historyCache } from "../historyCache";
import { getRikishi } from "../queries";
import { selectKeyBouts } from "../../presenters/projections/recapProjections";

export function recordBashoHistory(
  world: WorldState,
  basho: BashoState,
  yusho: Id,
  topCandidates: Id[],
  playoffMatches: MatchSchedule[],
  prizes: SpecialPrizesResult,
  bestWins: number
): StateImpact {
  const builder = createImpactBuilder("recordBashoHistory");

  const rng = rngForWorld(world, "history", `basho_result_${world.year}_${basho.bashoName}`);

  // Credit yusho prize to rikishi economics (JSA model: paid directly to rikishi)
  // Per-division yusho prizes (2027 JSA revision)
  const yushoRikishi = getRikishi(world, yusho);
  let yushoPrize = SIMULATION_CONFIG.prizes.yusho;
  if (yushoRikishi) {
    const division = yushoRikishi.division || "makuuchi";
    yushoPrize =
      SIMULATION_CONFIG.prizes.yushoByDivision[division] ?? SIMULATION_CONFIG.prizes.yusho;

    const yushoEconomics = yushoRikishi.economics || {
      cash: 0,
      retirementFund: 0,
      careerKenshoWon: 0,
      kinboshiCount: 0,
      totalEarnings: 0,
      currentBashoEarnings: 0,
      popularity: 50,
    };
    // Split yusho: 50% cash, 50% retirement fund
    const yushoCash = yushoPrize * 0.5;
    const yushoRetirement = yushoPrize * 0.5;

    builder.updateRikishi(yusho, {
      economics: {
        ...yushoEconomics,
        cash: yushoEconomics.cash + yushoCash,
        retirementFund: yushoEconomics.retirementFund + yushoRetirement,
        totalEarnings: yushoEconomics.totalEarnings + yushoPrize,
      },
    });
  }

  // Credit jun-yusho prizes to rikishi economics
  const junYushoIds = topCandidates.filter((id) => id !== yusho);
  for (const junYushoId of junYushoIds) {
    const junRikishi = getRikishi(world, junYushoId);
    if (junRikishi) {
      const junEconomics = junRikishi.economics || {
        cash: 0,
        retirementFund: 0,
        careerKenshoWon: 0,
        kinboshiCount: 0,
        totalEarnings: 0,
        currentBashoEarnings: 0,
        popularity: 50,
      };
      // Split jun-yusho: 50% cash, 50% retirement fund
      const junCash = SIMULATION_CONFIG.prizes.junYusho * 0.5;
      const junRetirement = SIMULATION_CONFIG.prizes.junYusho * 0.5;

      builder.updateRikishi(junYushoId, {
        economics: {
          ...junEconomics,
          cash: junEconomics.cash + junCash,
          retirementFund: junEconomics.retirementFund + junRetirement,
          totalEarnings: junEconomics.totalEarnings + SIMULATION_CONFIG.prizes.junYusho,
        },
      });
    }
  }

  const result: BashoResult = {
    id: rng.uuid("HI"),
    year: world.year,
    bashoNumber: basho.bashoNumber,
    bashoName: basho.bashoName,
    yusho,
    junYusho: junYushoIds,
    ...prizes,
    playoffMatches,
    prizes: {
      yushoAmount: yushoPrize,
      junYushoAmount: SIMULATION_CONFIG.prizes.junYusho,
      specialPrizes: SIMULATION_CONFIG.prizes.specialPrize,
    },
  };

  // --- Bout of the Basho: highest excitementScore among all resolved bouts ---
  let boutOfTheBasho: string | undefined;
  let topExcitement = -1;
  for (const match of basho.matches) {
    const ex = match.result?.excitementScore ?? -1;
    if (ex > topExcitement) {
      topExcitement = ex;
      boutOfTheBasho = match.boutId;
    }
  }
  if (boutOfTheBasho) result.boutOfTheBasho = boutOfTheBasho;

  // Persist curated highlight bouts for the recap screen
  const keyMoments = selectKeyBouts(world);
  if (keyMoments.length > 0) {
    result.keyBouts = keyMoments.map((m) => ({
      label: m.label,
      bout: m.bout,
      day: m.day,
      eastRikishiId: m.eastRikishiId,
      westRikishiId: m.westRikishiId,
    }));
  }

  builder.appendToWorldArray("history", [result]);

  // --- Persist award log entries ---
  const newAwardEntries: AwardLogEntry[] = [
    { bashoName: basho.bashoName, year: world.year, type: "yusho", winnerId: yusho },
    ...junYushoIds.map((id) => ({
      bashoName: basho.bashoName,
      year: world.year,
      type: "junYusho" as const,
      winnerId: id,
    })),
    ...(prizes.shukunsho
      ? [
          {
            bashoName: basho.bashoName,
            year: world.year,
            type: "shukunsho" as const,
            winnerId: prizes.shukunsho,
          },
        ]
      : []),
    ...(prizes.kantosho
      ? [
          {
            bashoName: basho.bashoName,
            year: world.year,
            type: "kantosho" as const,
            winnerId: prizes.kantosho,
          },
        ]
      : []),
    ...(prizes.ginoSho
      ? [
          {
            bashoName: basho.bashoName,
            year: world.year,
            type: "ginoSho" as const,
            winnerId: prizes.ginoSho,
          },
        ]
      : []),
    ...(boutOfTheBasho
      ? [
          {
            bashoName: basho.bashoName,
            year: world.year,
            type: "boutOfTheBasho" as const,
            winnerId: yusho,
            boutId: boutOfTheBasho,
            excitementScore: topExcitement,
          },
        ]
      : []),
  ];
  builder.appendToWorldArray("awardLog", newAwardEntries);

  safeCall(() => {
    const snapshot = buildAlmanacSnapshot(world);
    if (snapshot) {
      builder.appendToWorldArray("almanacSnapshots", [snapshot]);

      // FM v2.0 Archival: Move to cold storage immediately
      // Use electronArchiveService in Electron builds, opfsArchiveService in web builds
      const archiveService =
        typeof window !== "undefined" && window.__ELECTRON__ === true
          ? electronArchiveService
          : opfsArchiveService;

      archiveService.archiveBanzuke(world.year, basho.bashoNumber, snapshot);
    }

    // Archive Awards
    safeCall(() => {
      // Collect specific prizes from the current result
      const yearAwards = (world.history || []).filter((h) => h.year === world.year);
      const archiveService =
        typeof window !== "undefined" && window.__ELECTRON__ === true
          ? electronArchiveService
          : opfsArchiveService;

      archiveService.archiveAwards(world.year, yearAwards);

      // Cache year data for historyCache (async operation)
      historyCache.getYear(world.year);
    });
  });

  // Post-basho resolution is now called by endBasho() after applying all impacts
  const yushoRikishiForLog = getRikishi(world, yusho);
  builder.logEvent(
    "BASHO_STATUS",
    "basho",
    {
      status: "ended",
      incident: basho.bashoName,
      winner: yushoRikishiForLog?.shikona || "Unknown",
      winnerId: yusho,
      rikishiId: yusho,
    },
    { rikishiId: yusho }
  );

  safeCall(() => {
    if (world.mediaState) {
      builder.updateWorldField(
        "mediaState",
        snapshotMediaHeatForBasho(world.mediaState, basho.bashoName)
      );
    }
  });

  if (world.ftue?.isActive) {
    const newFtue = { ...world.ftue };
    newFtue.bashoCompleted += 1;
    if (newFtue.bashoCompleted >= 1) newFtue.isActive = false;
    builder.updateWorldField("ftue", newFtue);
  }

  builder.logEvent(
    "BASHO_STATUS",
    "basho",
    {
      status: "concluded_summary",
      incident: basho.bashoName,
      shikona: yushoRikishiForLog?.shikona || "Unknown",
      rikishiId: yusho,
      score: bestWins,
      delta: 15 - bestWins,
    },
    { rikishiId: yusho }
  );

  builder.updateWorldField("cyclePhase", "post_basho");
  builder.updateWorldField("_postBashoDays", 7);

  // Phase L: Institutional Depth - Check for Yokozuna Deliberations
  checkYokozunaPromotions(world, builder);

  safeCall(() => {
    autosave(world);
  });

  return builder.build();
}

/**
 * Evaluates Ozeki for potential Yokozuna promotion.
 * Fires PROMOTION_DELIBERATION event if a candidate meets the criteria (Stats + Pressure).
 */
export function checkYokozunaPromotions(
  world: WorldState,
  builder: ReturnType<typeof createImpactBuilder>
) {
  if (!world.historyIndex) return;

  const ozekiIds: string[] = [];
  for (const id of world.activeRikishiIds) {
    const r = getRikishi(world, id);
    if (r !== undefined && r.rank === "ozeki") {
      ozekiIds.push(r.id);
    }
  }

  for (const rid of ozekiIds) {
    const history = world.historyIndex.rikishi[rid] || [];
    const len = history.length;
    if (len < 2) continue;

    const last = history[len - 1];
    const prev = history[len - 2];
    let yushos = 0;
    let junYushos = 0;
    if (last.yusho) yushos++;
    if (last.junYusho) junYushos++;
    if (prev.yusho) yushos++;
    if (prev.junYusho) junYushos++;

    // Combo Logic: Stats + Political Pressure
    const heat = world.mediaState?.mediaHeat?.[rid] || 0;
    const isStatEligible = yushos >= 2 || (yushos >= 1 && junYushos >= 1);

    if (isStatEligible) {
      const isStrongSupport = heat >= 75;
      const rikishi = getRikishi(world, rid);

      builder.logEvent(
        "PROMOTION_DELIBERATION",
        "promotion",
        {
          rikishiId: rid,
          shikona: rikishi?.shikona || "Unknown",
          status: isStrongSupport ? "favorable" : "controversial",
          incident: "Yokozuna Deliberation Council Convened",
          threshold: 75,
          score: heat,
          intensity: isStrongSupport ? "high" : "extreme",
        },
        { rikishiId: rid }
      );
    }
  }
}
