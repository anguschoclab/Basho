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
import { isRetiredRikishiSummaryEntry } from "@/engine/queries";
import {
  getRankDisplayEntry,
  DIVISION_NAMES,
} from "@/constants/engine/rankDisplay";
import { resolveAvatar, rikishiStageInput } from "@/presenters/avatarProjections";

export const RIKISHI_RESULT_CAP = 10;
export const HEYA_RESULT_CAP = 4;

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

export interface EntitySearchResults {
  rikishi: RikishiSearchHit[];
  retired: RikishiSearchHit[];
  heyas: HeyaSearchHit[];
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

/**
 * Search active + retired rikishi and heyas by name.
 * Safe against partial world shapes (missing maps → empty buckets).
 */
export function searchEntities(
  world: WorldState,
  query: string,
  playerHeyaId?: string | null
): EntitySearchResults {
  const q = query.toLowerCase().trim();
  const empty: EntitySearchResults = { rikishi: [], retired: [], heyas: [] };
  if (!q || !world) return empty;

  const matches = (r: { shikona?: string; realName?: string }) =>
    matchScore(r.shikona ?? "", q) >= 0 ||
    (r.realName ? matchScore(r.realName, q) >= 0 : false);

  // Best (lowest) score across shikona and realName so a realName-only
  // match never outranks a shikona prefix match.
  const score = (r: { shikona?: string; realName?: string }) =>
    Math.min(
      ...[
        matchScore(r.shikona ?? "", q),
        r.realName ? matchScore(r.realName, q) : -1,
      ].filter((s) => s >= 0),
      Number.MAX_SAFE_INTEGER
    );

  const byScoreThenName = (
    a: { shikona: string; _score: number },
    b: { shikona: string; _score: number }
  ) => a._score - b._score || a.shikona.localeCompare(b.shikona);

  // Active rikishi
  const active = valuesOf(world.rikishi)
    .filter((r) => !r.isRetired && matches(r))
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
      _score: score(r),
      shikona: r.shikona,
    }))
    .sort(byScoreThenName);

  // Retired: full Rikishi records and compact summaries both live here
  const retired = valuesOf(world.historicalRikishi)
    .filter(matches)
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
      return { hit, _score: score(entry), shikona: entry.shikona };
    })
    .sort(byScoreThenName);

  const heyas = valuesOf(world.heyas)
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

  return {
    rikishi: active.slice(0, RIKISHI_RESULT_CAP).map((x) => x.hit),
    retired: retired.slice(0, RIKISHI_RESULT_CAP).map((x) => x.hit),
    heyas,
  };
}
