/**
 * src/engine/bout/honbasho.ts
 * ===========================
 * Honbasho (本場所) vs Exhibition ( jungyo / 藤場所) distinction.
 *
 * Only the six official annual tournaments (hatsu, haru, natsu, nagoya,
 * aki, kyushu) are "honbasho" — results count toward official records,
 * banzuke promotions, and mochikyukin payouts. Exhibition events do not
 * count toward the banzuke or career records.
 */

import type { BashoName, BashoInfo, BashoState } from "../types/basho";
import { BASHO_ORDER } from "../calendar";

/** Set of official honbasho names. */
export const HONBASHO_NAMES: ReadonlySet<BashoName> = new Set(BASHO_ORDER);

/**
 * Returns true if the given basho name is one of the six official honbasho.
 */
export function isHonbashoName(name: BashoName): boolean {
  return HONBASHO_NAMES.has(name);
}

/**
 * Returns true if the given basho state represents an official honbasho.
 * Exhibition basho have `isExhibition: true` or a non-honbasho name.
 */
export function isHonbashoState(basho: BashoState | undefined | null): boolean {
  if (!basho) return false;
  if (basho.isExhibition) return false;
  return isHonbashoName(basho.bashoName);
}

/**
 * Returns true if the basho info represents an official honbasho.
 */
export function isHonbashoInfo(info: BashoInfo): boolean {
  return isHonbashoName(info.name);
}

/**
 * Creates an exhibition basho state placeholder.
 * Exhibition basho do not count toward records or banzuke.
 */
export function makeExhibitionBasho(
  year: number,
  exhibitionName: string,
  day: number = 1
): BashoState {
  return {
    year,
    bashoNumber: 1,
    bashoName: "hatsu",
    day,
    matches: [],
    standings: new Map(),
    isActive: true,
    isExhibition: true,
    exhibitionName,
  };
}
