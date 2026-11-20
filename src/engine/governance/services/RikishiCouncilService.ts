/**
 * RikishiCouncilService.ts
 * ========================
 * §3 Rikishi-kai / Rikishi-ken (力士会, Sekitori Wrestlers' Association).
 *
 * The Rikishi-kai is the autonomous assembly of all active sekitori
 * (Makuuchi and Juryo), chaired by the Kaichō (top Yokozuna or senior
 * Makuuchi sekitori) alongside Makuuchi and Juryo delegates.
 *
 * It deliberates motions through the shared JSA committee engine
 * (`conveneCommittee(RIKISHI_COUNCIL_COMMITTEE, ...)`), activating
 * association policies that feed health recovery, stable welfare morale,
 * and governance standing.
 */

import type { Id } from "@/engine/types/common";
import type { WorldState } from "@/engine/types/world";
import type { Rikishi } from "@/engine/types/rikishi";
import { RANK_HIERARCHY } from "@/engine/types/banzuke";
import type {
  RikishiCouncilDelegate,
  RikishiCouncilMotion,
  RikishiCouncilMotionType,
  RikishiCouncilState,
} from "@/engine/types/rikishiCouncil";
import { RIKISHI_COUNCIL_COMMITTEE } from "@/constants/engine/committee";
import { MAX_POLITICAL_CAPITAL } from "@/constants/engine/governance";
import { conveneCommittee, type CommitteeCase } from "@/engine/committee/committee";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";
import type { StateImpact } from "@/engine/core/StateImpact";
import { rngForWorld } from "@/engine/core/rng";
import { getRikishi } from "@/engine/core/queries";

export interface CouncilMotionCatalogEntry {
  type: RikishiCouncilMotionType;
  title: string;
  description: string;
  effectLabel: string;
}

export const RIKISHI_COUNCIL_MOTION_CATALOG: readonly CouncilMotionCatalogEntry[] = [
  {
    type: "dohyo_safety",
    title: "Dohyō Clay & Ring-Edge Safety Protocol",
    description:
      "Mandates additional tawara cushioning inspection and ringside medical readiness across honbasho and jungyō.",
    effectLabel: "+5% injury recovery speed for active rikishi",
  },
  {
    type: "welfare_standards",
    title: "Jungyō & Stable Quarters Welfare Charter",
    description:
      "Standardizes travel allowances, rest intervals, and chankonabe nutrition provisions across all stables.",
    effectLabel: "+3 stable morale across all heyas",
  },
  {
    type: "benefit_relief",
    title: "Sekitori Mutual Aid & Mochikyūkin Relief",
    description:
      "Expands Rikishi-kai mutual-aid distributions for injured lower-division attendants and retiring veterans.",
    effectLabel: "+2 political capital for represented stables on passage",
  },
  {
    type: "ceremonial_protocol",
    title: "Dohyō-iri & Kesho-Mawashi Heritage Accord",
    description:
      "Codifies traditional ceremonial protocols between the Rikishi-kai and JSA shimpan leadership.",
    effectLabel: "+2 political capital for represented stables on passage",
  },
] as const;

export function getMotionCatalogEntry(type: RikishiCouncilMotionType): CouncilMotionCatalogEntry {
  return (
    RIKISHI_COUNCIL_MOTION_CATALOG.find((m) => m.type === type) ?? RIKISHI_COUNCIL_MOTION_CATALOG[0]
  );
}

/** Check whether a Rikishi-kai policy is currently active in the world. */
export function hasActiveCouncilPolicy(
  world: WorldState,
  policy: RikishiCouncilMotionType
): boolean {
  return world.rikishiCouncil?.activePolicies.includes(policy) ?? false;
}

function compareSekitoriSeniority(a: Rikishi, b: Rikishi): number {
  const tierA = RANK_HIERARCHY[a.rank]?.tier ?? 99;
  const tierB = RANK_HIERARCHY[b.rank]?.tier ?? 99;
  if (tierA !== tierB) return tierA - tierB;
  const numA = a.rankNumber ?? 1;
  const numB = b.rankNumber ?? 1;
  if (numA !== numB) return numA - numB;
  if (a.side !== b.side) return a.side === "east" ? -1 : 1;
  const winsDiff = (b.careerWins ?? 0) - (a.careerWins ?? 0);
  if (winsDiff !== 0) return winsDiff;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * Elect the 7-seat Rikishi-kai executive panel from active sekitori:
 * - Kaichō (president): senior Yokozuna, or highest-ranked Makuuchi rikishi.
 * - Up to 4 additional Makuuchi representatives.
 * - Up to 2 Juryo representatives.
 */
export function electRikishiCouncilDelegates(world: WorldState): {
  kaichoId?: Id;
  delegates: RikishiCouncilDelegate[];
} {
  const makuuchi: Rikishi[] = [];
  const juryo: Rikishi[] = [];
  for (const id of world.activeRikishiIds) {
    const r = getRikishi(world, id);
    if (!r || r.isRetired || r.isMaezumo || r.isBanzukeGai) continue;
    if (r.division === "makuuchi") makuuchi.push(r);
    else if (r.division === "juryo") juryo.push(r);
  }
  makuuchi.sort(compareSekitoriSeniority);
  juryo.sort(compareSekitoriSeniority);

  const delegates: RikishiCouncilDelegate[] = [];
  const kaicho = makuuchi[0] ?? juryo[0];
  if (!kaicho) return { delegates };

  delegates.push({
    rikishiId: kaicho.id,
    shikona: kaicho.shikona,
    heyaId: kaicho.heyaId,
    division: kaicho.division === "juryo" ? "juryo" : "makuuchi",
    rank: kaicho.rank,
    role: "kaicho",
  });

  for (const r of makuuchi.slice(1, 5)) {
    delegates.push({
      rikishiId: r.id,
      shikona: r.shikona,
      heyaId: r.heyaId,
      division: "makuuchi",
      rank: r.rank,
      role: "makuuchi_rep",
    });
  }
  for (const r of juryo.slice(0, 2)) {
    if (r.id === kaicho.id) continue;
    delegates.push({
      rikishiId: r.id,
      shikona: r.shikona,
      heyaId: r.heyaId,
      division: "juryo",
      rank: r.rank,
      role: "juryo_rep",
    });
  }

  return { kaichoId: kaicho.id, delegates };
}

function buildDefaultMotion(
  world: WorldState,
  kaichoHeyaId: Id | undefined
): RikishiCouncilMotion {
  let injuredCount = 0;
  for (const id of world.activeRikishiIds) {
    if (getRikishi(world, id)?.injured) injuredCount++;
  }
  let highWelfareRisk = false;
  for (const h of world.heyas.values()) {
    if ((h.welfareState?.welfareRisk ?? 0) >= 45) {
      highWelfareRisk = true;
      break;
    }
  }
  const type: RikishiCouncilMotionType =
    injuredCount >= 4
      ? "dohyo_safety"
      : highWelfareRisk
        ? "welfare_standards"
        : (world.year + (world.week ?? 0)) % 2 === 0
          ? "benefit_relief"
          : "ceremonial_protocol";
  const entry = getMotionCatalogEntry(type);
  return {
    id: `rc-motion-${world.year}-w${world.week ?? 0}-${type}`,
    type,
    title: entry.title,
    description: entry.description,
    proposedByHeyaId: kaichoHeyaId,
    status: "pending",
    year: world.year,
    week: world.week ?? 0,
    votesFor: 0,
    votesAgainst: 0,
    rationale: [],
  };
}

/**
 * Convene the Rikishi-kai session (post-basho governance review).
 * Elects current delegates, deliberates pending motions via
 * `RIKISHI_COUNCIL_COMMITTEE`, updates active policies, and rewards
 * represented stables when institutional motions pass.
 */
export function conveneRikishiCouncil(world: WorldState): StateImpact {
  const builder = createImpactBuilder("conveneRikishiCouncil");
  const { kaichoId, delegates } = electRikishiCouncilDelegates(world);
  const existing: RikishiCouncilState = world.rikishiCouncil ?? {
    delegates: [],
    activePolicies: [],
    pendingMotions: [],
    history: [],
  };

  if (delegates.length === 0) {
    builder.updateWorldField("rikishiCouncil", {
      ...existing,
      kaichoId: undefined,
      delegates: [],
      lastConvenedYear: world.year,
      lastConvenedWeek: world.week ?? 0,
    });
    return builder.build();
  }

  const kaichoHeyaId = delegates[0]?.heyaId;
  const motionsToDeliberate =
    existing.pendingMotions.length > 0
      ? existing.pendingMotions
      : [buildDefaultMotion(world, kaichoHeyaId)];

  const cases: CommitteeCase[] = motionsToDeliberate.map((m) => {
    const proposerHeya = m.proposedByHeyaId ? world.heyas.get(m.proposedByHeyaId) : undefined;
    const playerEndorsed = m.playerVote === "for" ? 2 : 0;
    const playerOpposed = m.playerVote === "against" ? 2 : 0;
    const kaichoEndorsed = m.proposedByHeyaId && m.proposedByHeyaId === kaichoHeyaId ? 1 : 0;
    return {
      subjectId: m.id,
      baseScore: 1,
      merits: playerEndorsed + kaichoEndorsed,
      demerits: playerOpposed,
      faction: proposerHeya?.ichimon ?? "none",
    };
  });

  const rng = rngForWorld(world, "rikishi_council", `y${world.year}-w${world.week ?? 0}`);
  const decisions = conveneCommittee(RIKISHI_COUNCIL_COMMITTEE, cases, rng);

  const resolvedMotions: RikishiCouncilMotion[] = [];
  let nextPolicies = [...existing.activePolicies];
  const representedHeyaIds = new Set(delegates.map((d) => d.heyaId));

  for (const m of motionsToDeliberate) {
    const d = decisions.get(m.id);
    const finalScore = d?.score ?? 1;
    const passed = finalScore >= 1;
    const votesFor = Math.max(
      0,
      Math.min(RIKISHI_COUNCIL_COMMITTEE.size, 4 + Math.round(finalScore))
    );
    const votesAgainst = RIKISHI_COUNCIL_COMMITTEE.size - votesFor;
    const resolved: RikishiCouncilMotion = {
      ...m,
      status: passed ? "passed" : "rejected",
      votesFor,
      votesAgainst,
      rationale: d?.rationale ?? ["adopted mechanical baseline"],
    };
    resolvedMotions.push(resolved);

    if (passed) {
      nextPolicies = [m.type, ...nextPolicies.filter((p) => p !== m.type)].slice(0, 2);
      if (m.type === "benefit_relief" || m.type === "ceremonial_protocol") {
        for (const hId of representedHeyaIds) {
          const heya = world.heyas.get(hId);
          if (!heya) continue;
          builder.updateHeya(hId, {
            politicalCapital: Math.min(
              MAX_POLITICAL_CAPITAL,
              (heya.politicalCapital ?? 50) + 2
            ),
          });
        }
      }
    }

    builder.logEvent(
      "GOVERNANCE_RULING",
      "discipline",
      {
        incident: `rikishi_council_${resolved.status}`,
        motionId: resolved.id,
        motionType: resolved.type,
        title: resolved.title,
        votesFor: resolved.votesFor,
        votesAgainst: resolved.votesAgainst,
        kaichoId,
        reason: `Rikishi-kai (${resolved.votesFor}–${resolved.votesAgainst}) ${resolved.status} "${resolved.title}".`,
      },
      { heyaId: resolved.proposedByHeyaId ?? kaichoHeyaId, importance: "notable" }
    );
  }

  builder.updateWorldField("rikishiCouncil", {
    kaichoId,
    delegates,
    activePolicies: nextPolicies,
    pendingMotions: [],
    history: [...resolvedMotions, ...existing.history].slice(0, 50),
    lastConvenedYear: world.year,
    lastConvenedWeek: world.week ?? 0,
  });

  return builder.build();
}

/** Propose a motion to the Rikishi-kai for the next session. */
export function proposeCouncilMotion(
  world: WorldState,
  heyaId: Id,
  motionType: RikishiCouncilMotionType
): StateImpact {
  const builder = createImpactBuilder("proposeCouncilMotion");
  if (!world.heyas.has(heyaId)) return builder.build();

  // Only stables with at least one active sekitori may table a Rikishi-kai motion.
  let hasSekitori = false;
  for (const id of world.activeRikishiIds) {
    const r = getRikishi(world, id);
    if (r && r.heyaId === heyaId && (r.division === "makuuchi" || r.division === "juryo")) {
      hasSekitori = true;
      break;
    }
  }
  if (!hasSekitori) return builder.build();

  const { kaichoId, delegates } = electRikishiCouncilDelegates(world);
  const existing: RikishiCouncilState = world.rikishiCouncil ?? {
    kaichoId,
    delegates,
    activePolicies: [],
    pendingMotions: [],
    history: [],
  };

  if (existing.pendingMotions.some((m) => m.type === motionType)) {
    return builder.build();
  }

  const entry = getMotionCatalogEntry(motionType);
  const motion: RikishiCouncilMotion = {
    id: `rc-motion-${world.year}-w${world.week ?? 0}-${motionType}-${heyaId}`,
    type: motionType,
    title: entry.title,
    description: entry.description,
    proposedByHeyaId: heyaId,
    status: "pending",
    year: world.year,
    week: world.week ?? 0,
    votesFor: 0,
    votesAgainst: 0,
    rationale: [],
    ...(heyaId === world.playerHeyaId ? { playerVote: "for" as const } : {}),
  };

  builder.updateWorldField("rikishiCouncil", {
    ...existing,
    kaichoId: existing.kaichoId ?? kaichoId,
    delegates: existing.delegates.length > 0 ? existing.delegates : delegates,
    pendingMotions: [...existing.pendingMotions, motion],
  });

  return builder.build();
}

/** Record the player's delegate bloc vote ("for" | "against") on a pending motion. */
export function voteCouncilMotion(
  world: WorldState,
  motionId: string,
  vote: "for" | "against"
): StateImpact {
  const builder = createImpactBuilder("voteCouncilMotion");
  const council = world.rikishiCouncil;
  if (!council || !council.pendingMotions.some((m) => m.id === motionId)) {
    return builder.build();
  }

  builder.updateWorldField("rikishiCouncil", {
    ...council,
    pendingMotions: council.pendingMotions.map((m) =>
      m.id === motionId ? { ...m, playerVote: vote } : m
    ),
  });

  return builder.build();
}

export const RikishiCouncilService = {
  RIKISHI_COUNCIL_MOTION_CATALOG,
  getMotionCatalogEntry,
  hasActiveCouncilPolicy,
  electRikishiCouncilDelegates,
  conveneRikishiCouncil,
  proposeCouncilMotion,
  voteCouncilMotion,
};
