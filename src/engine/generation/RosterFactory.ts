/**
 * src/engine/generation/RosterFactory.ts
 * ===============================================
 * Rikishi roster generation logic.
 * Extracted from WorldFactory.ts for SRP separation.
 */

import { SeededRNG } from "@/engine/core/rng";
import { pushUniqueId } from "@/engine/core/idIntegrity";
import { Heya } from "@/engine/types/heya";
import { Oyakata } from "@/engine/types/oyakata";
import { Rikishi } from "@/engine/types/rikishi";
import { generateFullRikishi } from "@/engine/generation/CandidateBuilder";
import { countsAsForeign } from "@/engine/utils/citizenshipUtils";
import { rollForeignOrigin } from "@/engine/utils/identity";
import { Division, Rank, Side } from "@/engine/types/banzuke";
import {
  YOKOZUNA_COUNT_MIN,
  YOKOZUNA_COUNT_MAX,
  ROSTER_TIER_FALLBACK_CHANCE,
} from "@/constants/engine/generation";
import {
  GENESIS_FOREIGN_HEYA_OCCUPANCY,
  GENESIS_FOREIGN_DIVISION_TABLE,
} from "@/constants/engine/recruitment";
import { DEFAULT_START_YEAR } from "@/constants/engine/calendar";
import { getHeyaRosterTarget } from "@/engine/generation/RecruitmentController";

/**
 * Draws the genesis foreign-host set (~`GENESIS_FOREIGN_HEYA_OCCUPANCY`
 * share of heyas, weighted toward established/powerful stables) and the
 * division each host's foreigner occupies (`GENESIS_FOREIGN_DIVISION_TABLE`,
 * sekitori-skewed).
 */
function markGenesisForeignHosts(
  heyaList: Heya[],
  heyaByTier: Heya[],
  worldRng: SeededRNG
): { markedForForeign: Set<string>; foreignDivisionByHeya: Map<string, Division> } {
  const markedForForeign = new Set<string>();
  {
    const tierWeight: Record<string, number> = {
      legendary: 6,
      powerful: 5,
      established: 3,
      rebuilding: 2,
      fragile: 1,
      new: 1,
    };
    const pool = heyaByTier.map((h) => ({ h, w: tierWeight[h.statureBand] ?? 1 }));
    const target = Math.round(heyaList.length * GENESIS_FOREIGN_HEYA_OCCUPANCY);
    while (markedForForeign.size < target && pool.length > 0) {
      const total = pool.reduce((a, p) => a + p.w, 0);
      let roll = worldRng.next() * total;
      let idx = 0;
      for (; idx < pool.length - 1; idx++) {
        roll -= pool[idx].w;
        if (roll <= 0) break;
      }
      const host = pool.splice(idx, 1)[0].h;
      markedForForeign.add(host.id);
      // §5.x established channel: a genesis host has already recruited
      // through the foreign pipeline once — the relationships persist.
      host.hadForeigner = true;
    }
  }
  const foreignDivisionByHeya = new Map<string, Division>();
  for (const heyaId of markedForForeign) {
    const roll = worldRng.next();
    let acc = 0;
    let division: Division = "makushita";
    for (const [d, w] of GENESIS_FOREIGN_DIVISION_TABLE) {
      acc += w;
      if (roll < acc) {
        division = d;
        break;
      }
    }
    foreignDivisionByHeya.set(heyaId, division);
  }
  return { markedForForeign, foreignDivisionByHeya };
}

const STABLE_TIER_VALUE: Record<string, number> = {
  legendary: 5,
  powerful: 4,
  established: 3,
  rebuilding: 2,
  fragile: 1,
  new: 0,
};

/**
 * Prestige pull: real rosters are heavy-tailed (Isegahama 33, Takasago 26 —
 * JSA 2026) because stature attracts recruits at every level. Weight the
 * draw by band² + 4 so powerhouse rooms emerge while every stable still
 * houses a few members — but cap each stable at its rosterTarget: the
 * unbounded pull overshoots the real ceiling (~33) and starves the tail
 * stables empty. On a full draw, retry (bounded — a late tail draw can
 * still land somewhere when everyone is full).
 */
function pickGenesisStable(
  heyaByTier: Heya[],
  heyaList: Heya[],
  config: { tierWeight: number },
  worldRng: SeededRNG
): { heya: Heya; eligibleStables: Heya[] } {
  const eligibleStables = heyaByTier.filter((h) => {
    const stableTier = STABLE_TIER_VALUE[h.statureBand] ?? 0;
    return (
      stableTier >= config.tierWeight - 1 ||
      (stableTier >= config.tierWeight - 2 && worldRng.next() > ROSTER_TIER_FALLBACK_CHANCE)
    );
  });

  // Weighted draw — identical to the old duplicated-entry pool pick
  // (int(0, Σw-1) indexes the same cumulative ranges), without
  // materializing a ~460-element array per rikishi.
  const drawPool = eligibleStables.length > 0 ? eligibleStables : heyaList;
  const weights = drawPool.map((h) => {
    const t = STABLE_TIER_VALUE[h.statureBand] ?? 0;
    return t * t + 4;
  });
  const totalWeight = weights.reduce((a, w) => a + w, 0);
  const draw = (): Heya => {
    let roll = worldRng.int(0, totalWeight - 1);
    for (let i = 0; i < drawPool.length - 1; i++) {
      if (roll < weights[i]) return drawPool[i];
      roll -= weights[i];
    }
    return drawPool[drawPool.length - 1];
  };
  let heya = draw();
  for (
    let tries = 0;
    tries < 8 && heya && (heya.rikishiIds?.length ?? 0) >= getHeyaRosterTarget(heya);
    tries++
  ) {
    heya = draw();
  }
  return { heya, eligibleStables };
}

/**
 * Seeds every stable's opening roster at genesis.
 *
 * Sizes follow the real 2026 distribution: rank counts total ~590 and each
 * rikishi draws a stable via `pickGenesisStable`'s prestige-weighted roulette,
 * capped at that stable's `rosterTarget` so powerhouse rooms emerge
 * (Isegahama ~33) without starving the tail stables empty. Foreign-slot
 * occupancy is tracked across the whole pass (§5.1: one foreigner per beya),
 * with a post-pass backfill honoring the occupancy target.
 */
export function createRosters(
  worldRng: SeededRNG,
  heyaMap: Map<string, Heya>,
  oyakataMap: Map<string, Oyakata>
): Map<string, Rikishi> {
  const rikishiMap = new Map<string, Rikishi>();
  const heyaList = Array.from(heyaMap.values());
  // §5.1 — at most one foreign-slot rikishi per beya at ANY time, including
  // world generation. Track occupancy as rosters are filled.
  const foreignOccupied = new Set<string>();

  const heyaByTier = heyaList.sort((a, b) => {
    const tierOrder: Record<string, number> = {
      legendary: 5,
      powerful: 4,
      established: 3,
      rebuilding: 2,
      fragile: 1,
      new: 0,
    };
    return (tierOrder[b.statureBand] ?? 0) - (tierOrder[a.statureBand] ?? 0);
  });

  // JSA realism — ~69% of active heyas host exactly one foreign-born
  // rikishi; the rest run domestic-only pipelines. Mark the host set up
  // front (tier-weighted — established/powerful stables host more often),
  // then draw which division each host's foreigner occupies (sekitori skew).
  const { markedForForeign, foreignDivisionByHeya } = markGenesisForeignHosts(
    heyaList,
    heyaByTier,
    worldRng
  );

  /** Stamp a generated rikishi as a foreign slot-consumer. */
  const applyGenesisForeign = (r: Rikishi): void => {
    r.nationality = rollForeignOrigin(worldRng);
    r.origin = r.nationality;
    r.citizenshipStatus = "foreign";
  };

  const yokozunaCount = worldRng.int(YOKOZUNA_COUNT_MIN, YOKOZUNA_COUNT_MAX);
  const rankConfigs: { rank: Rank; division: Division; count: number; tierWeight: number }[] = [
    { rank: "yokozuna", division: "makuuchi", count: yokozunaCount, tierWeight: 5 },
    { rank: "ozeki", division: "makuuchi", count: 2, tierWeight: 5 },
    { rank: "sekiwake", division: "makuuchi", count: 2, tierWeight: 4 },
    { rank: "komusubi", division: "makuuchi", count: 2, tierWeight: 4 },
    { rank: "maegashira", division: "makuuchi", count: 34, tierWeight: 3 },
    { rank: "juryo", division: "juryo", count: 28, tierWeight: 2 },
    { rank: "makushita", division: "makushita", count: 120, tierWeight: 1 },
    // Real-2026 sheet: sandanme fields a full 160; jonidan flexes under its
    // 250 cap at ~195; jonokuchi is a thin 45-man class. Genesis total ~590,
    // matching the Σ of per-heya roster targets.
    { rank: "sandanme", division: "sandanme", count: 160, tierWeight: 0 },
    { rank: "jonidan", division: "jonidan", count: 195, tierWeight: 0 },
    { rank: "jonokuchi", division: "jonokuchi", count: 45, tierWeight: 0 },
  ];

  rankConfigs.forEach((config) => {
    for (let i = 0; i < config.count; i++) {
      const side: Side = i % 2 === 0 ? "east" : "west";
      const rankNumber =
        config.rank === "maegashira" ||
        config.rank === "juryo" ||
        config.rank === "makushita" ||
        config.rank === "sandanme" ||
        config.rank === "jonidan" ||
        config.rank === "jonokuchi"
          ? Math.floor(i / 2) + 1
          : 1;

      const rikishiId = worldRng.uuid("RK");
      const { heya, eligibleStables } = pickGenesisStable(heyaByTier, heyaList, config, worldRng);
      const oyakata = oyakataMap.get(heya?.oyakataId || "");

      const r = generateFullRikishi({
        id: rikishiId,
        rng: worldRng,
        currentYear: DEFAULT_START_YEAR,
        rank: config.rank,
        division: config.division,
        side,
        rankNumber,
        legacyShikona: oyakata?.formerShikona,
        heyaPrefix: heya.shikonaPrefix,
      });

      let assigned = heya;
      const foreignResolution = resolveGenesisForeignSlot({
        r,
        heya: assigned,
        eligibleStables,
        config,
        markedForForeign,
        foreignOccupied,
        foreignDivisionByHeya,
        worldRng,
        applyGenesisForeign,
      });
      assigned = foreignResolution.assigned;

      r.heyaId = assigned.id;
      assigned.rikishiIds = pushUniqueId(assigned.rikishiIds || [], r.id);
      rikishiMap.set(r.id, r);
    }
  });

  // Backfill: a marked heya whose drawn division never produced a member
  // still hosts one foreigner — convert the roster member whose division
  // is closest to the drawn slot (sekitori-side fallback order).
  backfillGenesisForeign(
    markedForForeign,
    foreignOccupied,
    foreignDivisionByHeya,
    heyaMap,
    rikishiMap,
    applyGenesisForeign
  );

  return rikishiMap;
}

/**
 * Applies the one-foreigner-per-heya rule at genesis for a single new
 * rikishi: natural foreigners redirect to a free marked stable (or are
 * rewritten as domestic when no slot exists), and a marked host stamps
 * the member drawn for its designated division as the foreigner.
 */
function resolveGenesisForeignSlot(args: {
  r: Rikishi;
  heya: Heya;
  eligibleStables: Heya[];
  config: { division: Division };
  markedForForeign: Set<string>;
  foreignOccupied: Set<string>;
  foreignDivisionByHeya: Map<string, Division>;
  worldRng: SeededRNG;
  applyGenesisForeign: (r: Rikishi) => void;
}): { assigned: Heya } {
  const {
    r,
    eligibleStables,
    config,
    markedForForeign,
    foreignOccupied,
    foreignDivisionByHeya,
    worldRng,
    applyGenesisForeign,
  } = args;
  let assigned = args.heya;
  if (countsAsForeign(r, DEFAULT_START_YEAR)) {
    const marked = markedForForeign.has(assigned.id);
    if (marked && !foreignOccupied.has(assigned.id)) {
      // Natural foreigner lands in a marked host — he IS the slot.
      foreignOccupied.add(assigned.id);
    } else {
      // Unmarked heya or already-occupied host — redirect to a free
      // marked stable; if none exists the foreigner simply doesn't
      // exist at genesis (honest post-2010 read: a domestic recruit
      // was signed instead — never a silent naturalization).
      const freeMarked = eligibleStables.filter(
        (h) => markedForForeign.has(h.id) && !foreignOccupied.has(h.id)
      );
      if (freeMarked.length > 0) {
        assigned = worldRng.pick(freeMarked);
        foreignOccupied.add(assigned.id);
      } else {
        r.nationality = "Japan";
        r.origin = "Japan";
        r.citizenshipStatus = "native";
      }
    }
  } else if (
    markedForForeign.has(assigned.id) &&
    !foreignOccupied.has(assigned.id) &&
    config.division === foreignDivisionByHeya.get(assigned.id)
  ) {
    // Marked host reaches its drawn division — this member becomes the
    // stable's foreigner (sekitori-skewed composition).
    applyGenesisForeign(r);
    foreignOccupied.add(assigned.id);
  }
  return { assigned };
}

/** Post-pass honoring the occupancy target — see `createRosters` comment. */
function backfillGenesisForeign(
  markedForForeign: Set<string>,
  foreignOccupied: Set<string>,
  foreignDivisionByHeya: Map<string, Division>,
  heyaMap: Map<string, Heya>,
  rikishiMap: Map<string, Rikishi>,
  applyGenesisForeign: (r: Rikishi) => void
): void {
  const FALLBACK_ORDER: Division[] = [
    "makushita",
    "juryo",
    "sandanme",
    "makuuchi",
    "jonidan",
    "jonokuchi",
  ];
  for (const heyaId of markedForForeign) {
    if (foreignOccupied.has(heyaId)) continue;
    const heya = heyaMap.get(heyaId);
    const members = (heya?.rikishiIds ?? [])
      .map((id) => rikishiMap.get(id))
      .filter((r): r is Rikishi => !!r && !r.isRetired && !countsAsForeign(r, DEFAULT_START_YEAR));
    if (members.length === 0) continue;
    const drawn = foreignDivisionByHeya.get(heyaId);
    const ordered = [drawn, ...FALLBACK_ORDER.filter((d) => d !== drawn)] as Division[];
    const pick =
      ordered.map((d) => members.find((m) => m.division === d)).find((m): m is Rikishi => !!m) ??
      members[0];
    applyGenesisForeign(pick);
    foreignOccupied.add(heyaId);
  }
}
