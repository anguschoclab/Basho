/**
 * FamilyBondService.ts — W H family/school/practice bonds.
 *
 * Runs at candidate materialization: a bounded-rate roll mints a sibling
 * rikishi (kyodai — same origin, bounded age gap, shared realName
 * surname, placed in a different heya when one exists; siblings never
 * meet on the dohyo), and same-school rikishi in other heyas become
 * cross-heya keiko partners.
 *
 * All rolls draw from the materialization rng — deterministic per world
 * seed, no Math.random.
 */
import {
  JAPANESE_FAMILY_NAMES,
  JAPANESE_GIVEN_NAMES,
  PRACTICE_PARTNER_CHANCE,
  PRACTICE_PARTNER_MAX,
  SIBLING_CHANCE,
  SIBLING_MAX_AGE_GAP,
} from "@/constants/engine/generation";
import type { ImpactBuilder } from "@/engine/core/ImpactBuilder";
import type { SeededRNG } from "@/engine/core/rng";
import { convertCandidateToRikishi } from "@/engine/generation/CandidateBuilder";
import { candidateConsumesForeignSlot } from "@/engine/generation/talentPoolReads";
import { assessMaezumo } from "@/engine/generation/MaezumoService";
import { generateShikona } from "@/engine/shikona/generateShikona";
import { ensureUniqueShikona } from "@/engine/shikona/uniqueness";
import type { Rikishi } from "@/engine/types/rikishi";
import type { TalentCandidate } from "@/engine/types/talent";
import type { WorldState } from "@/engine/types/world";
import { seededPick } from "@/engine/utils/random";

/**
 * Mint sibling + keiko bonds for a just-converted rikishi. Mutates
 * `rikishi` BEFORE the caller's addRikishi so bond fields land in the
 * collection add (updateRikishi on a not-yet-added id would be dropped).
 */
export function mintFamilyBonds(
  world: WorldState,
  builder: ImpactBuilder,
  rikishi: Rikishi,
  candidate: TalentCandidate,
  heyaId: string,
  rng: SeededRNG
): void {
  mintSibling(world, builder, rikishi, candidate, heyaId, rng);
  linkKeikoPartners(world, builder, rikishi, rng);
}

function mintSibling(
  world: WorldState,
  builder: ImpactBuilder,
  rikishi: Rikishi,
  candidate: TalentCandidate,
  heyaId: string,
  rng: SeededRNG
): void {
  if (rng.next() >= SIBLING_CHANCE) return;
  // A sibling minted out-of-band would bypass the foreign-slot invariant —
  // kyodai pairs are domestic recruits only.
  if (candidateConsumesForeignSlot(candidate)) return;

  const gap = (rng.bool(0.5) ? 1 : -1) * rng.int(1, SIBLING_MAX_AGE_GAP);
  const siblingCandidate: TalentCandidate = {
    ...candidate,
    candidateId: `${candidate.candidateId}-sibling`,
    personId: rng.uuid("person"),
    name: generateShikona(`${candidate.personId}::sibling`, {
      rng,
      heyaId: undefined,
      nationality: candidate.nationality,
      rank: "jonokuchi",
      legacyShikona: undefined,
    }),
    birthYear: candidate.birthYear + gap,
    competingSuitors: [],
    availabilityState: "signed",
    tags: candidate.tags.filter((t) => t !== "prodigy"),
    isEmergentProdigy: undefined,
  };

  // Prefer a different NPC heya; never silently stock the player's roster.
  // Same-heya kyodai are authentic too (they simply never meet on the dohyo).
  const siblingHeyaId =
    [...world.heyas.keys()].find((id) => id !== heyaId && id !== world.playerHeyaId) ?? heyaId;
  const sibling = convertCandidateToRikishi({
    candidate: siblingCandidate,
    rng,
    currentYear: world.year,
    heyaId: siblingHeyaId,
  });
  const uniqueName = ensureUniqueShikona({
    world,
    proposed: sibling.shikona,
    rng,
    config: { nationality: sibling.nationality },
  });
  if (uniqueName !== sibling.shikona) {
    sibling.shikona = uniqueName;
    sibling.name = uniqueName;
  }
  const maezumo = assessMaezumo(sibling, world.seed ?? "default");
  if (maezumo.rankNumber !== undefined) sibling.rankNumber = maezumo.rankNumber;
  // §3 maezumo — unranked until his preliminary next basho.
  sibling.isMaezumo = true;
  sibling.maezumoCompleted = false;

  const surname = rikishi.realName?.split(" ").pop() ?? seededPick(rng, JAPANESE_FAMILY_NAMES);
  sibling.realName = `${seededPick(rng, JAPANESE_GIVEN_NAMES)} ${surname}`;
  rikishi.realName = rikishi.realName ?? `${seededPick(rng, JAPANESE_GIVEN_NAMES)} ${surname}`;

  sibling.siblingIds = [rikishi.id];
  rikishi.siblingIds = [sibling.id];

  builder.addRikishi(sibling);
  const sibHeya = world.heyas.get(siblingHeyaId);
  if (sibHeya) {
    builder.updateHeya(siblingHeyaId, {
      rikishiIds: [...(sibHeya.rikishiIds || []), sibling.id],
    });
  }
}

function linkKeikoPartners(
  world: WorldState,
  builder: ImpactBuilder,
  rikishi: Rikishi,
  rng: SeededRNG
): void {
  if (!rikishi.schoolOrigin) return;
  const linked: string[] = [];
  for (const r of world.rikishi.values()) {
    if (linked.length >= PRACTICE_PARTNER_MAX) break;
    if (
      r.isRetired ||
      r.id === rikishi.id ||
      r.heyaId === rikishi.heyaId ||
      r.schoolOrigin !== rikishi.schoolOrigin ||
      rng.next() >= PRACTICE_PARTNER_CHANCE
    ) {
      continue;
    }
    linked.push(r.id);
    builder.updateRikishi(r.id, {
      practicePartners: [...(r.practicePartners ?? []), rikishi.id],
    });
  }
  if (linked.length > 0) {
    rikishi.practicePartners = [...(rikishi.practicePartners ?? []), ...linked];
  }
}
