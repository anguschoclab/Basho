/**
 * src/engine/training/DegeikoService.ts
 * ===================================================
 * Degeiko — inter-heya training visits (W I).
 *
 * A heya requests a week of keiko at another stable. NPC acceptance is a
 * seeded roll. On acceptance the session is parked on the requesting
 * heya's `HeyaTrainingState.pendingDegeiko` and consumed by the weekly
 * training phase: participants gain technique/experience and fatigue,
 * and cross-heya practicePartners links are written both ways (feeds
 * the W H bond narrative).
 */
import {
  DEGEIKO_ACCEPT_CHANCE,
  DEGEIKO_EXPERIENCE_GAIN,
  DEGEIKO_FATIGUE_COST,
  DEGEIKO_MAX_PARTICIPANTS,
  DEGEIKO_MAX_PARTNERS,
  DEGEIKO_TECHNIQUE_GAIN,
} from "@/constants/engine/degeiko";
import { createImpactBuilder, type ImpactBuilder } from "@/engine/core/ImpactBuilder";
import type { StateImpact } from "@/engine/core/StateImpact";
import { rngForWorld } from "@/engine/core/rng";
import { getHeya, getRikishi } from "@/engine/core/queries";
import type { WorldState } from "@/engine/types/world";
import type { Id } from "@/engine/types/common";
import type { Rikishi } from "@/engine/types/rikishi";

/**
 * Request a degeiko visit for `rikishiIds` at `targetHeyaId`.
 * Validates the party, rolls NPC acceptance, and schedules the session
 * (or logs a refusal). Returns an empty impact on invalid requests.
 */
export function requestDegeiko(
  world: WorldState,
  heyaId: Id,
  targetHeyaId: Id,
  rikishiIds: Id[]
): StateImpact {
  const builder = createImpactBuilder("requestDegeiko");
  const heya = getHeya(world, heyaId);
  const target = getHeya(world, targetHeyaId);
  if (!heya || !target || heyaId === targetHeyaId) return builder.build();
  if (rikishiIds.length === 0 || rikishiIds.length > DEGEIKO_MAX_PARTICIPANTS) {
    return builder.build();
  }
  const party: Rikishi[] = [];
  for (const id of rikishiIds) {
    const r = getRikishi(world, id);
    if (!r || r.heyaId !== heyaId || r.isRetired || r.injured) return builder.build();
    party.push(r);
  }
  const state = world.trainingState?.get(heyaId);
  if (state?.pendingDegeiko) return builder.build();

  const rng = rngForWorld(world, "degeiko", `request_${heyaId}_${targetHeyaId}_${world.week}`);
  if (rng.next() >= DEGEIKO_ACCEPT_CHANCE) {
    builder.logEvent(
      "DEGEIKO_DECLINED",
      "training",
      { heya: heya.name, heyaId, targetHeyaId, targetHeya: target.name },
      { heyaId, importance: "minor" }
    );
    return builder.build();
  }

  const ts = state ?? { heyaId, activeProfile: {} as never, focusSlots: [] };
  builder.updateTrainingState(heyaId, {
    ...ts,
    pendingDegeiko: {
      targetHeyaId,
      week: world.week,
      rikishiIds: [...rikishiIds],
    },
  });
  builder.logEvent(
    "DEGEIKO_SCHEDULED",
    "training",
    { heya: heya.name, heyaId, targetHeyaId, targetHeya: target.name, rikishiIds },
    { heyaId, importance: "major" }
  );
  return builder.build();
}

/**
 * Consume pending degeiko sessions during the weekly training phase.
 * Participants gain technique + experience and fatigue; a bounded set of
 * host rikishi become mutual practicePartners.
 */
export function applyWeeklyDegeiko(world: WorldState): StateImpact {
  const builder = createImpactBuilder("applyWeeklyDegeiko");
  const training = world.trainingState;
  if (!training) return builder.build();

  for (const [heyaId, state] of training) {
    const session = state.pendingDegeiko;
    if (!session) continue;

    const hosts = [...world.rikishi.values()].filter(
      (r) => r.heyaId === session.targetHeyaId && !r.isRetired
    );
    applySession(builder, world, heyaId, session.targetHeyaId, session.rikishiIds, hosts);
    builder.updateTrainingState(heyaId, {
      ...state,
      pendingDegeiko: null,
    });
  }
  return builder.build();
}

function applySession(
  builder: ImpactBuilder,
  world: WorldState,
  heyaId: Id,
  targetHeyaId: Id,
  rikishiIds: Id[],
  hosts: Rikishi[]
): void {
  const partners = [...hosts].sort((a, b) => a.id.localeCompare(b.id)).slice(0, DEGEIKO_MAX_PARTNERS);
  const heya = getHeya(world, heyaId);
  const target = getHeya(world, targetHeyaId);
  // Accumulate host-side links per host id — sequential updateRikishi
  // calls on the same entity clobber earlier practicePartners writes.
  const hostAdds = new Map<string, string[]>();
  for (const id of rikishiIds) {
    const r = getRikishi(world, id);
    if (!r || r.heyaId !== heyaId) continue;
    const stats = { ...r.stats };
    stats.technique = Math.min(99, (stats.technique ?? 0) + DEGEIKO_TECHNIQUE_GAIN);
    stats.experience = Math.min(99, (stats.experience ?? 0) + DEGEIKO_EXPERIENCE_GAIN);
    const partnersToAdd = partners
      .filter((p) => !(r.practicePartners ?? []).includes(p.id))
      .map((p) => p.id);
    builder.updateRikishi(id, {
      stats,
      fatigue: Math.min(100, r.fatigue + DEGEIKO_FATIGUE_COST),
      practicePartners: [...(r.practicePartners ?? []), ...partnersToAdd],
    });
    for (const p of partners) {
      if ((p.practicePartners ?? []).includes(id)) continue;
      hostAdds.set(p.id, [...(hostAdds.get(p.id) ?? []), id]);
    }
  }
  for (const [hostId, guestIds] of hostAdds) {
    const host = getRikishi(world, hostId);
    if (!host) continue;
    builder.updateRikishi(hostId, {
      practicePartners: [...(host.practicePartners ?? []), ...guestIds],
    });
  }
  builder.logEvent(
    "DEGEIKO_COMPLETED",
    "training",
    {
      heya: heya?.name,
      heyaId,
      targetHeyaId,
      targetHeya: target?.name,
      rikishiIds,
    },
    { heyaId, importance: "minor" }
  );
}
