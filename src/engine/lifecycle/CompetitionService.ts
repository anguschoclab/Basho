import { stableTieBreak } from "../utils/sort";
import { determineSpecialPrizes } from "../banzuke";
import type { SpecialPrizesResult } from "../banzuke/specialPrizes";
import { runPostBashoResolution } from "../core/SimulationRunner";
import { buildAlmanacSnapshot } from "../almanac";
import { snapshotMediaHeatForBasho } from "../systems/media/MediaService";
import { autosave } from "../saveload";
import { safeCall } from "../utils/safe";
import { rngForWorld } from "../rng";
import { opfsArchiveService } from "../storage/opfsArchive";
import { electronArchiveService } from "../storage/electronArchive";
import { resolveBout } from "../bout/boutResolver";
import type { WorldState } from "../types/world";
import type { BashoState, BashoResult, MatchSchedule, AwardLogEntry } from "../types/basho";
import type { Id } from "../types/common";
import { createImpactBuilder } from "../core/ImpactBuilder";
import type { StateImpact } from "../core/StateImpact";
import { applyAchievementImpact } from "../systems/economics/SponsorshipService";
import { historyCache } from "../historyCache";
import { SIMULATION_CONFIG } from "../core/SimulationConfig";
import { mergeImpacts } from "../core/ImpactResolver";
import { accumulateMochikyukinPoints } from "../systems/economics/MochikyukinService";

/**
 * Run a single-elimination playoff among tied yūshō candidates.
 * Uses resolveBout (physics + narrative + rivalry update) but skips the
 * full applyBoutResult side-effects (no standings mutation, no kenshō).
 * The bracket is deterministically shuffled via the world seed.
 */
function resolvePlayoffs(
  world: WorldState,
  basho: BashoState,
  candidates: Id[]
): { winner: Id; matches: MatchSchedule[] } {
  const allMatches: MatchSchedule[] = [];
  const rng = rngForWorld(world, "combat", `playoff::${basho.bashoName}::${world.year}`);
  let round = rng.shuffle(candidates.slice());
  let day = 16;

  while (round.length > 1) {
    const next: Id[] = [];
    const bouts: Array<[Id, Id]> = [];

    for (let i = 0; i + 1 < round.length; i += 2) {
      bouts.push([round[i], round[i + 1]]);
    }
    const bye = round.length % 2 === 1 ? round[round.length - 1] : null;

    for (const [eastId, westId] of bouts) {
      const east = world.rikishi.get(eastId);
      const west = world.rikishi.get(westId);
      if (!east || !west) {
        next.push(eastId);
        continue;
      }
      const boutId = `playoff-${world.year}-${basho.bashoName}-d${day}-${eastId}-${westId}`;
      const { result } = resolveBout(
        { id: boutId, day, rikishiEastId: eastId, rikishiWestId: westId },
        east,
        west,
        basho,
        undefined,
        world
      );
      allMatches.push({ boutId, day, eastRikishiId: eastId, westRikishiId: westId, result });
      next.push(result.winnerRikishiId);
    }

    if (bye) next.push(bye);
    round = next;
    day++;
  }

  return { winner: round[0], matches: allMatches };
}

function calculateStandings(basho: BashoState): {
  topCandidates: Id[];
  bestWins: number;
  table: Array<{ id: Id; wins: number; losses: number }>;
} {
  const table: Array<{ id: Id; wins: number; losses: number }> = [];
  const standingsEntries =
    basho.standings instanceof Map
      ? Array.from(basho.standings.entries())
      : Object.entries(basho.standings);

  for (const [id, rec] of standingsEntries) {
    const s = rec as { wins: number; losses: number };
    table.push({ id, wins: s.wins, losses: s.losses });
  }

  table.sort((a, b) => b.wins - a.wins || a.losses - b.losses || stableTieBreak(a.id, b.id));

  if (table.length === 0) return { topCandidates: [], bestWins: 0, table };

  const bestWins = table[0].wins;
  const topCandidates = table.reduce<Id[]>((acc, t) => {
    if (t.wins === bestWins) acc.push(t.id);
    return acc;
  }, []);

  return { topCandidates, bestWins, table };
}

function distributePrizes(
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

  for (const [key, type] of Object.entries(awardTypes)) {
    const rikishiId = (prizes as Record<string, string | undefined>)[key];
    if (rikishiId) {
      const r = world.rikishi.get(rikishiId);
      if (r) {
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
          applyAchievementImpact(world, tempR, "sansho");
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
          },
          { rikishiId: r.id, heyaId: r.heyaId }
        );

        // Credit sansho prize to rikishi economics (not heya funds under JSA model)
        const economics = r.economics || {
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

  return { prizes, impact: builder.build() };
}

function recordBashoHistory(
  world: WorldState,
  basho: BashoState,
  yusho: Id,
  topCandidates: Id[],
  playoffMatches: MatchSchedule[],
  prizes: ReturnType<typeof determineSpecialPrizes>,
  bestWins: number
): StateImpact {
  const builder = createImpactBuilder("recordBashoHistory");

  const rng = rngForWorld(world, "history", `basho_result_${world.year}_${basho.bashoName}`);

  // Credit yusho prize to rikishi economics (JSA model: paid directly to rikishi)
  const yushoRikishi = world.rikishi.get(yusho);
  if (yushoRikishi) {
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
    const yushoCash = SIMULATION_CONFIG.prizes.yusho * 0.5;
    const yushoRetirement = SIMULATION_CONFIG.prizes.yusho * 0.5;

    builder.updateRikishi(yusho, {
      economics: {
        ...yushoEconomics,
        cash: yushoEconomics.cash + yushoCash,
        retirementFund: yushoEconomics.retirementFund + yushoRetirement,
        totalEarnings: yushoEconomics.totalEarnings + SIMULATION_CONFIG.prizes.yusho,
      },
    });
  }

  // Credit jun-yusho prizes to rikishi economics
  const junYushoIds = topCandidates.filter((id) => id !== yusho);
  for (const junYushoId of junYushoIds) {
    const junRikishi = world.rikishi.get(junYushoId);
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
      yushoAmount: SIMULATION_CONFIG.prizes.yusho,
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

  runPostBashoResolution(world);
  const yushoRikishiForLog = world.rikishi.get(yusho);
  builder.logEvent(
    "BASHO_STATUS",
    "basho",
    {
      status: "ended",
      incident: basho.bashoName,
      winner: yushoRikishiForLog?.shikona || "Unknown",
      winnerRikishiId: yusho,
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
function checkYokozunaPromotions(
  world: WorldState,
  builder: ReturnType<typeof createImpactBuilder>
) {
  if (!world.historyIndex) return;

  const ozekiIds = Array.from(world.rikishi.values())
    .filter((r) => r.rank === "ozeki" && !r.isRetired)
    .map((r) => r.id);

  for (const rid of ozekiIds) {
    const history = world.historyIndex.rikishi[rid] || [];
    const len = history.length;
    if (len < 2) continue;

    const last2 = history.slice(-2);
    const yushos = last2.filter((h) => h.yusho).length;
    const junYushos = last2.filter((h) => h.junYusho).length;

    // Combo Logic: Stats + Political Pressure
    const heat = world.mediaState?.mediaHeat?.[rid] || 0;
    const isStatEligible = yushos >= 2 || (yushos >= 1 && junYushos >= 1);

    if (isStatEligible) {
      const isStrongSupport = heat >= 75;
      const rikishi = world.rikishi.get(rid);

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

/**
 * Pay basho teate (tournament allowance) to non-sekitori rikishi.
 * Paid by JSA directly to rikishi economics.
 */
function payBashoTeate(world: WorldState): StateImpact {
  const builder = createImpactBuilder("payBashoTeate");

  for (const [id, r] of world.rikishi) {
    if (r.isRetired) continue;

    // Only non-sekitori receive basho teate
    if (r.division === "makuuchi" || r.division === "juryo") continue;

    let teateAmount = 0;
    switch (r.division) {
      case "makushita":
        teateAmount = 175_000;
        break;
      case "sandanme":
        teateAmount = 85_000;
        break;
      case "jonidan":
        teateAmount = 75_000;
        break;
      case "jonokuchi":
        teateAmount = 70_000;
        break;
    }

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
 */
function payKinboshiStipends(world: WorldState): StateImpact {
  const builder = createImpactBuilder("payKinboshiStipends");
  const basho = world.currentBasho;
  if (!basho) return builder.build();

  const kinboshiMap = basho.kinboshiThisBasho ?? {};

  for (const [rikishiId, count] of Object.entries(kinboshiMap)) {
    if (count <= 0) continue;
    const r = world.rikishi.get(rikishiId);
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

/**
 * Conclude Tournament Competition — handles yusho, prizes, and playoffs.
 * Returns StateImpact describing competition conclusion instead of mutating directly.
 *
 * @param world Current WorldState
 * @returns StateImpact with BashoResult recorded
 */
export function concludeBashoCompetition(world: WorldState): StateImpact {
  const builder = createImpactBuilder("concludeBashoCompetition");
  const basho = world.currentBasho;
  if (!basho) return builder.build();

  const { topCandidates, bestWins } = calculateStandings(basho);

  if (topCandidates.length === 0) return builder.build();

  let yusho = topCandidates[0];
  const playoffMatches: MatchSchedule[] = [];

  if (topCandidates.length > 1) {
    const playoffResult = resolvePlayoffs(world, basho, topCandidates);
    yusho = playoffResult.winner;
    playoffMatches.push(...playoffResult.matches);

    const champ = world.rikishi.get(yusho);
    builder.logEvent(
      "BOUT_RESOLVED",
      "narrative",
      {
        status: "playoff_result",
        shikona: champ?.shikona ?? yusho,
        score: topCandidates.length,
        delta: bestWins,
      },
      { rikishiId: yusho }
    );
  }

  const { prizes, impact: prizeImpact } = distributePrizes(world, basho, yusho);

  // Merge prize impact
  if (prizeImpact.entities?.rikishiUpdates) {
    for (const [id, update] of prizeImpact.entities.rikishiUpdates) {
      builder.updateRikishi(id, update);
    }
  }
  if (prizeImpact.entities?.heyaUpdates) {
    for (const [id, update] of prizeImpact.entities.heyaUpdates) {
      builder.updateHeya(id, update);
    }
  }
  if (prizeImpact.events) {
    for (const event of prizeImpact.events) {
      builder.logEvent(event.type, event.category, event.data, {
        heyaId: event.heyaId,
        rikishiId: event.rikishiId,
        importance: event.importance,
      });
    }
  }

  // Record basho history and phase transitions
  const historyImpact = recordBashoHistory(
    world,
    basho,
    yusho,
    topCandidates,
    playoffMatches,
    prizes,
    bestWins
  );

  // Pay basho teate to non-sekitori rikishi
  const teateImpact = payBashoTeate(world);

  // Pay kinboshi stipends (per-basho, not per-month)
  const kinboshiImpact = payKinboshiStipends(world);

  // Accumulate mochikyukin points for sekitori
  const mochikyukinImpact = createImpactBuilder("mochikyukinAccumulation");
  for (const [id, r] of world.rikishi) {
    if (r.isRetired) continue;
    if (r.division !== "makuuchi" && r.division !== "juryo") continue;

    const bashoWins = r.currentBashoWins ?? 0;
    const bashoLosses = r.currentBashoLosses ?? 0;
    const isKachiKoshi = bashoWins > bashoLosses;
    const isYusho = id === yusho;
    const isJunYusho = topCandidates.length > 1 && id === topCandidates[1];
    const kinboshiThisBasho = basho.kinboshiThisBasho?.[id] ?? 0;

    const impact = accumulateMochikyukinPoints(world, id, {
      isKachiKoshi,
      isYusho,
      isJunYusho,
      kinboshiEarned: kinboshiThisBasho,
    });

    if (impact.entities?.rikishiUpdates) {
      for (const [rid, update] of impact.entities.rikishiUpdates) {
        mochikyukinImpact.updateRikishi(rid, update);
      }
    }
  }

  // Merge impacts together
  return mergeImpacts([
    builder.build(),
    historyImpact,
    teateImpact,
    kinboshiImpact,
    mochikyukinImpact.build(),
  ]);
}
