/**
 * playerFounding.ts
 * =================
 * Player-initiated dokuritsu founding — the master leaves his chair to open
 * a branch stable, taking unsalaried deshi and the parent's bankrolled seed
 * with him. The old stable doesn't die: the JSA seats a caretaker trustee
 * (same shape as `triggerSuccessionWithGeneric`) until a real heir retires
 * into the stock.
 *
 * Mirrors the retiree pipeline in retireeOyakataConversion — same seed
 * funds, same follower convention (no sekitori follow), same JSA maezumo
 * class when the roster has nothing to release.
 */

import type { WorldState } from "@/engine/types/world";
import type { ImpactBuilder } from "@/engine/core/ImpactBuilder";
import type { Oyakata, OyakataArchetype, SuccessionReadiness } from "@/engine/types/oyakata";
import { getHeya } from "@/engine/core/queries";
import { foundStable } from "@/engine/generation/HeyaFactory";
import { generateFullRikishi } from "@/engine/generation/CandidateBuilder";
import { enrollInMaezumo } from "@/engine/basho/maezumoPrelims";
import { rngForWorld } from "@/engine/core/rng";
import { SeededRNG } from "@/engine/core/rng";
import { stableSort } from "@/engine/utils/sort";
import { isSekitoriDivision } from "@/constants/engine/rankDisplay";
import type { Rikishi } from "@/engine/types/rikishi";
import {
  FOUNDING_SEED_FUNDS,
  FOUNDING_FOLLOWER_MAX,
  HEYA_COUNT_CAP,
} from "@/constants/engine/economic";

export interface PlayerFoundingEligibility {
  canFound: boolean;
  reason?: string;
}

/** Player-facing gates: the parent bankrolls its own branch, so it must be
 *  solvent enough to pay the seed and clean enough to keep the charter. */
export function evaluatePlayerFounding(world: WorldState): PlayerFoundingEligibility {
  const heya = world.playerHeyaId ? getHeya(world, world.playerHeyaId) : undefined;
  if (!heya) return { canFound: false, reason: "no_player_heya" };
  if (!heya.oyakataId || !world.oyakata?.get(heya.oyakataId))
    return { canFound: false, reason: "no_master" };
  if (world.heyas.size >= HEYA_COUNT_CAP) return { canFound: false, reason: "league_full" };
  if (heya.welfareState?.complianceState === "sanctioned")
    return { canFound: false, reason: "sanctioned" };
  if ((heya.funds ?? 0) < FOUNDING_SEED_FUNDS)
    return { canFound: false, reason: "insufficient_funds" };
  return { canFound: true };
}

/**
 * Found a branch stable for the player's master and transfer control to it.
 * The old stable keeps its roster minus followers and gets a JSA caretaker.
 * @returns true when the founding impact was merged into `builder`.
 */
export function foundPlayerStable(world: WorldState, builder: ImpactBuilder): boolean {
  const eligibility = evaluatePlayerFounding(world);
  const parentId = world.playerHeyaId;
  const parent = parentId ? getHeya(world, parentId) : undefined;
  const master = parent?.oyakataId ? world.oyakata?.get(parent.oyakataId) : undefined;
  if (!eligibility.canFound || !parent || !parentId || !master) return false;

  const rng = rngForWorld(world, "founding", `player_founding_${parentId}_${world.year}_${world.week}`);
  const result = foundStable(
    world,
    master.id,
    `${master.shikona ?? master.name}-beya`,
    rng as SeededRNG,
    { parentHeyaId: parentId }
  );
  if (!result) return false;
  result.heya.foundedYear = world.year;
  const newHeyaId = result.heya.id;

  // Roster-follow: unsalaried deshi only, same convention as retiree
  // founding — sekitori stay on the parent's sheet.
  const followerPool = stableSort(
    (parent.rikishiIds ?? [])
      .map((id) => world.rikishi.get(id))
      .filter((r): r is Rikishi => !!r && !isSekitoriDivision(r.division)),
    (r) => r.id
  );
  const followerIds: string[] = [];
  while (followerIds.length < FOUNDING_FOLLOWER_MAX && followerPool.length > 0) {
    followerIds.push(followerPool.splice(Math.floor(rng.next() * followerPool.length), 1)[0].id);
  }
  if (followerIds.length > 0) {
    result.heya.rikishiIds = followerIds;
    for (const id of followerIds) builder.updateRikishi(id, { heyaId: newHeyaId });
  }

  // No followers released → the JSA assigns the branch a maezumo class so it
  // doesn't open empty.
  if (followerIds.length === 0) {
    const seeded: string[] = [];
    const deshiCount = 2 + Math.floor(rng.next() * 2);
    for (let i = 0; i < deshiCount; i++) {
      const r = generateFullRikishi({
        id: `${newHeyaId}-deshi-${i}`,
        rng: new SeededRNG(`${world.seed}::player_deshi::${master.id}::${i}`),
        currentYear: world.year,
        rank: "jonokuchi",
        division: "jonokuchi",
        side: i % 2 === 0 ? "east" : "west",
        rankNumber: i + 1,
      });
      seeded.push(r.id);
      builder.addRikishi(enrollInMaezumo({ ...r, heyaId: newHeyaId }));
    }
    result.heya.rikishiIds = seeded;
  }

  // The master moves and keeps his elder stock (stock is held by the person,
  // not the stable). The parent bankrolled the seed — funds transfer, not
  // conjured money.
  builder.updateOyakata(master.id, { heyaId: newHeyaId });

  const trusteeId = `oyakata_trustee_${parentId}_${world.year}`;
  const trustee: Oyakata = {
    id: trusteeId,
    heyaId: parentId,
    name: `JSA Trustee (${master.shikona ?? master.name} lineage)`,
    shikona: "Trustee",
    age: 45,
    yearsInCharge: 0,
    archetype: "traditionalist" as OyakataArchetype,
    traits: { ambition: 30, patience: 50, risk: 20, tradition: 80, compassion: 50 },
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
  builder.addOyakata(trustee);

  const followerSet = new Set(followerIds);
  builder.updateHeya(parentId, {
    funds: (parent.funds ?? 0) - FOUNDING_SEED_FUNDS,
    oyakataId: trusteeId,
    rikishiIds: (parent.rikishiIds ?? []).filter((id) => !followerSet.has(id)),
    // The caretaker is a new master for results purposes — reset the
    // underperformance clock the player's reign accumulated.
    consecutiveUnderperformanceBasho: 0,
  });

  builder.addHeya(result.heya);
  builder.updateWorldField("playerHeyaId", newHeyaId);
  builder.logEvent(
    "LIFECYCLE_EVENT",
    "career",
    {
      heyaId: newHeyaId,
      status: "stable_founded",
      heyaName: result.heya.name,
      ichimon: result.heya.ichimon,
      branchedFromHeyaId: parentId,
      followerCount: followerIds.length,
      seededDeshiCount: followerIds.length === 0 ? result.heya.rikishiIds?.length ?? 0 : 0,
      playerInitiated: true,
    },
    { heyaId: newHeyaId, importance: "headline" }
  );
  return true;
}
