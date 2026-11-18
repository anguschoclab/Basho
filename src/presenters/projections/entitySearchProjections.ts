/**
 * entitySearchProjections.ts
 *
 * Pure projection for the global entity search in TopNavBar — matches active
 * rikishi (world.rikishi), retired rikishi (world.historicalRikishi), and
 * heyas (world.heyas) by name substring. Kept dependency-light so it can be
 * unit-tested without React and reused by a future command palette.
 */

import type { WorldState } from "@/engine/types/world";
import type { Rikishi } from "@/engine/types/rikishi";
import type { RetiredRikishiSummary } from "@/engine/types/history";
import type { AvatarRenderData } from "@/engine/types/avatar";
import type { Oyakata } from "@/engine/types/oyakata";
import type { StaffRole } from "@/engine/types/staff";
import type { TalentPoolType } from "@/engine/types/talent";
import { isRetiredRikishiSummaryEntry } from "@/engine/core/queries";
import { getRankDisplayEntry, DIVISION_NAMES } from "@/constants/engine/rankDisplay";
import {
  listVisibleCandidates,
  getCandidateScoutingLevel,
} from "@/engine/generation/talentPoolReads";
import { hasScoutingCoverage } from "@/presenters/projections/rivalStablesProjections";
import {
  resolveAvatar,
  rikishiStageInput,
  oyakataStageInput,
  staffStageInput,
  candidateStageInput,
} from "@/presenters/projections/avatarProjections";

export const RIKISHI_RESULT_CAP = 10;
export const HEYA_RESULT_CAP = 4;
export const OYAKATA_RESULT_CAP = 6;
export const STAFF_RESULT_CAP = 5;
export const CANDIDATE_RESULT_CAP = 5;

/** Scout level at which a non-public candidate's name is knowable (TalentPoolPage rule). */
const CANDIDATE_NAME_INTEL = 65;

export interface RikishiSearchHit {
  kind: "rikishi";
  id: string;
  shikona: string;
  realName?: string;
  /** e.g. "M3 · Makuuchi" for actives, "Peak Yokozuna" for retired. */
  rankLabel: string;
  heyaName: string;
  heyaId: string;
  isRetired: boolean;
  isPlayerOwned: boolean;
  avatar?: AvatarRenderData;
}

export interface HeyaSearchHit {
  kind: "heya";
  id: string;
  name: string;
  rikishiCount: number;
  isPlayerOwned: boolean;
}

export interface OyakataSearchHit {
  kind: "oyakata";
  id: string;
  name: string;
  shikona?: string;
  formerShikona?: string;
  heyaId: string;
  heyaName: string;
  isPlayerOwned: boolean;
  isEmeritus: boolean;
  isCaretaker: boolean;
  elderStatus?: Oyakata["elderStatus"];
  elderExpiryYear?: number;
  highestRank?: string;
  /** Managerial identity — only when the stable is the player's or scouted (WS7). */
  archetypeLabel?: string;
  avatar?: AvatarRenderData;
}

export interface StaffSearchHit {
  kind: "staff";
  id: string;
  name: string;
  role: StaffRole;
  roleLabel: string;
  heyaId: string;
  heyaName: string;
  isPlayerOwned: boolean;
  avatar?: AvatarRenderData;
}

export interface CandidateSearchHit {
  kind: "candidate";
  candidateId: string;
  name: string;
  pool: TalentPoolType;
  poolLabel: string;
  age: number;
  nationality: string;
  isForeign: boolean;
  isAmateurStar: boolean;
  avatar?: AvatarRenderData;
}

export interface EntitySearchResults {
  rikishi: RikishiSearchHit[];
  retired: RikishiSearchHit[];
  heyas: HeyaSearchHit[];
  oyakata: OyakataSearchHit[];
  staff: StaffSearchHit[];
  candidates: CandidateSearchHit[];
}

function valuesOf<T>(map: Map<string, T> | undefined): T[] {
  return map ? Array.from(map.values()) : [];
}

function rankLabelFor(r: Rikishi): string {
  const entry = getRankDisplayEntry(r.rank);
  const num = r.rankNumber ? String(r.rankNumber) : "";
  const rankPart = entry ? `${entry.abbr}${num}` : (r.rank ?? "");
  const divPart = r.division ? (DIVISION_NAMES[r.division] ?? r.division) : "";
  return [rankPart, divPart].filter(Boolean).join(" · ");
}

function peakRankLabelFor(s: RetiredRikishiSummary): string {
  const entry = getRankDisplayEntry(s.peakRank);
  return `Peak ${entry?.en ?? s.peakRank}`;
}

function toHit(
  r: { id: string; shikona: string; heyaId: string; realName?: string },
  world: WorldState,
  playerHeyaId: string | null | undefined,
  extras: { isRetired: boolean; rankLabel: string; avatar?: AvatarRenderData }
): RikishiSearchHit {
  return {
    kind: "rikishi",
    id: r.id,
    shikona: r.shikona,
    realName: r.realName,
    rankLabel: extras.rankLabel,
    heyaName: world.heyas?.get(r.heyaId)?.name ?? "—",
    heyaId: r.heyaId,
    isRetired: extras.isRetired,
    isPlayerOwned: !!playerHeyaId && r.heyaId === playerHeyaId,
    avatar: extras.avatar,
  };
}

function matchScore(name: string, q: string): number {
  const n = name.toLowerCase();
  if (n.startsWith(q)) return 0; // prefix beats substring
  if (n.includes(q)) return 1;
  return -1;
}

const TALENT_POOL_TYPES: TalentPoolType[] = ["high_school", "university", "foreign"];

const POOL_LABELS: Record<TalentPoolType, string> = {
  high_school: "High School",
  university: "University",
  foreign: "Foreign",
};

function staffRoleLabel(role: StaffRole): string {
  return role
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Best match score across all name fields of an oyakata. */
function oyakataScore(o: Oyakata, q: string): number {
  const scores = [o.name, o.shikona, o.formerShikona]
    .filter((n): n is string => !!n)
    .map((n) => matchScore(n, q))
    .filter((s) => s >= 0);
  return scores.length ? Math.min(...scores) : -1;
}

/** Shikona + realName matching/scoring helpers for rikishi buckets. */
function rikishiMatches(r: { shikona?: string; realName?: string }, q: string): boolean {
  return (
    matchScore(r.shikona ?? "", q) >= 0 || (r.realName ? matchScore(r.realName, q) >= 0 : false)
  );
}

// Best (lowest) score across shikona and realName so a realName-only
// match never outranks a shikona prefix match.
function rikishiScore(r: { shikona?: string; realName?: string }, q: string): number {
  return Math.min(
    ...[matchScore(r.shikona ?? "", q), r.realName ? matchScore(r.realName, q) : -1].filter(
      (s) => s >= 0
    ),
    Number.MAX_SAFE_INTEGER
  );
}

function byScoreThenName(
  a: { shikona: string; _score: number },
  b: { shikona: string; _score: number }
): number {
  return a._score - b._score || a.shikona.localeCompare(b.shikona);
}

/** Active + retired rikishi hits (full records and compact summaries). */
function rikishiBuckets(
  world: WorldState,
  q: string,
  playerHeyaId: string | null | undefined
): { active: RikishiSearchHit[]; retired: RikishiSearchHit[] } {
  const active = valuesOf(world.rikishi)
    .filter((r) => !r.isRetired && rikishiMatches(r, q))
    .map((r) => ({
      hit: toHit(r, world, playerHeyaId, {
        isRetired: false,
        rankLabel: rankLabelFor(r),
        avatar: r.avatarConfig
          ? resolveAvatar({
              id: r.id,
              nationality: r.nationality,
              stored: r.avatarConfig,
              ...rikishiStageInput(r, world.year ?? 0),
            })
          : undefined,
      }),
      _score: rikishiScore(r, q),
      shikona: r.shikona,
    }))
    .sort(byScoreThenName);

  // Retired: full Rikishi records and compact summaries both live here
  const retired = valuesOf(world.historicalRikishi)
    .filter((r) => rikishiMatches(r, q))
    .map((entry) => {
      const isSummary = isRetiredRikishiSummaryEntry(entry);
      const hit = isSummary
        ? toHit(entry, world, playerHeyaId, {
            isRetired: true,
            rankLabel: peakRankLabelFor(entry),
          })
        : toHit(entry as Rikishi, world, playerHeyaId, {
            isRetired: true,
            rankLabel: `Retired · ${rankLabelFor(entry as Rikishi)}`,
          });
      return { hit, _score: rikishiScore(entry, q), shikona: entry.shikona };
    })
    .sort(byScoreThenName);

  return {
    active: active.slice(0, RIKISHI_RESULT_CAP).map((x) => x.hit),
    retired: retired.slice(0, RIKISHI_RESULT_CAP).map((x) => x.hit),
  };
}

function heyasBucket(
  world: WorldState,
  q: string,
  playerHeyaId: string | null | undefined
): HeyaSearchHit[] {
  return valuesOf(world.heyas)
    .filter((h) => matchScore(h.name ?? "", q) >= 0)
    .map((h) => ({
      hit: {
        kind: "heya" as const,
        id: h.id,
        name: h.name,
        rikishiCount: h.rikishiIds?.length ?? 0,
        isPlayerOwned: !!playerHeyaId && h.id === playerHeyaId,
      },
      _score: matchScore(h.name ?? "", q),
      name: h.name ?? "",
    }))
    .sort((a, b) => a._score - b._score || a.name.localeCompare(b.name))
    .slice(0, HEYA_RESULT_CAP)
    .map((x) => x.hit);
}

/** Elders — archetype only when the stable is the player's or scouted (WS7). */
function oyakataBucket(
  world: WorldState,
  q: string,
  playerHeyaId: string | null | undefined
): OyakataSearchHit[] {
  return valuesOf(world.oyakata)
    .map((o) => ({ o, _score: oyakataScore(o, q) }))
    .filter((x) => x._score >= 0)
    .map(({ o, _score }) => {
      const scouted =
        (!!playerHeyaId && o.heyaId === playerHeyaId) || hasScoutingCoverage(world, o.heyaId);
      return {
        hit: {
          kind: "oyakata" as const,
          id: o.id,
          name: o.name,
          shikona: o.shikona,
          formerShikona: o.formerShikona,
          heyaId: o.heyaId,
          heyaName: world.heyas?.get(o.heyaId)?.name ?? "—",
          isPlayerOwned: !!playerHeyaId && o.heyaId === playerHeyaId,
          isEmeritus: o.isEmeritus === true,
          isCaretaker: o.isCaretaker === true,
          elderStatus: o.elderStatus,
          elderExpiryYear: o.elderExpiryYear,
          highestRank: o.highestRank,
          archetypeLabel: scouted ? o.archetype : undefined,
          avatar: o.avatarConfig
            ? resolveAvatar({
                id: o.id,
                stored: o.avatarConfig,
                seedAliases: o.formerRikishiId ? [o.formerRikishiId] : [],
                ...oyakataStageInput(o),
              })
            : undefined,
        },
        _score,
        name: o.name ?? "",
      };
    })
    .sort((a, b) => a._score - b._score || a.name.localeCompare(b.name))
    .slice(0, OYAKATA_RESULT_CAP)
    .map((x) => x.hit);
}

function staffBucket(
  world: WorldState,
  q: string,
  playerHeyaId: string | null | undefined
): StaffSearchHit[] {
  return valuesOf(world.staff)
    .map((s) => ({ s, _score: matchScore(s.name ?? "", q) }))
    .filter((x) => x._score >= 0)
    .map(({ s, _score }) => ({
      hit: {
        kind: "staff" as const,
        id: s.id,
        name: s.name,
        role: s.role,
        roleLabel: staffRoleLabel(s.role),
        heyaId: s.heyaId,
        heyaName: world.heyas?.get(s.heyaId)?.name ?? "—",
        isPlayerOwned: !!playerHeyaId && s.heyaId === playerHeyaId,
        avatar: s.avatarConfig
          ? resolveAvatar({ id: s.id, stored: s.avatarConfig, ...staffStageInput(s) })
          : undefined,
      },
      _score,
      name: s.name ?? "",
    }))
    .sort((a, b) => a._score - b._score || a.name.localeCompare(b.name))
    .slice(0, STAFF_RESULT_CAP)
    .map((x) => x.hit);
}

/** Recruits — only names the player can legitimately know (public or scouted). */
function candidatesBucket(world: WorldState, q: string): CandidateSearchHit[] {
  const candidates: { hit: CandidateSearchHit; _score: number; name: string }[] = [];
  if (!world.talentPool) return [];
  for (const pool of TALENT_POOL_TYPES) {
    for (const c of listVisibleCandidates(world, pool)) {
      const knowable =
        c.visibilityBand === "public" ||
        getCandidateScoutingLevel(world, c.candidateId) >= CANDIDATE_NAME_INTEL;
      if (!knowable) continue;
      const _score = matchScore(c.name ?? "", q);
      if (_score < 0) continue;
      candidates.push({
        hit: {
          kind: "candidate",
          candidateId: c.candidateId,
          name: c.name,
          pool,
          poolLabel: POOL_LABELS[pool],
          age: (world.year ?? 0) - c.birthYear,
          nationality: c.nationality,
          isForeign: (c.nationality ?? "Japan") !== "Japan",
          isAmateurStar: c.isAmateurStar === true || (c.tags ?? []).includes("amateur_star"),
          avatar: c.avatarConfig
            ? resolveAvatar({
                id: c.personId,
                stored: c.avatarConfig,
                nationality: c.nationality,
                ...candidateStageInput(c, world.year ?? 0),
              })
            : undefined,
        },
        _score,
        name: c.name ?? "",
      });
    }
  }
  return candidates
    .sort((a, b) => a._score - b._score || a.name.localeCompare(b.name))
    .slice(0, CANDIDATE_RESULT_CAP)
    .map((x) => x.hit);
}

/**
 * Search active + retired rikishi, heyas, oyakata/elders, staff, and
 * talent-pool recruits by name. WS7 intel rules apply: an oyakata's
 * archetype only surfaces when the stable is the player's or has scouting
 * coverage, and candidates only surface once their name is knowable
 * (public record or scout level ≥ CANDIDATE_NAME_INTEL — the same gate
 * TalentPoolPage applies). Safe against partial world shapes.
 */
export function searchEntities(
  world: WorldState,
  query: string,
  playerHeyaId?: string | null
): EntitySearchResults {
  const q = query.toLowerCase().trim();
  const empty: EntitySearchResults = {
    rikishi: [],
    retired: [],
    heyas: [],
    oyakata: [],
    staff: [],
    candidates: [],
  };
  if (!q || !world) return empty;

  const { active, retired } = rikishiBuckets(world, q, playerHeyaId);
  return {
    rikishi: active,
    retired,
    heyas: heyasBucket(world, q, playerHeyaId),
    oyakata: oyakataBucket(world, q, playerHeyaId),
    staff: staffBucket(world, q, playerHeyaId),
    candidates: candidatesBucket(world, q),
  };
}
