/**
 * uiUtilities.ts
 *
 * Utility functions for UI presentation.
 * Extracted from uiDigest.ts to eliminate monolithic structure.
 */

import type { Rikishi } from "@/engine/types/rikishi";
import { BardEngine } from "@/engine/bard/BardEngine";
import { projectRikishi } from "@/presenters/rikishi";
import type { UIRikishi } from "@/presenters/rikishi";
import type { SeededRNG } from "@/engine/rng";

/** Minimal world state for rikishi projection */
interface MinimalWorldForProjection {
  year: number;
  heyas: Map<string, { name?: string; isPlayerOwned?: boolean }>;
  rikishi: Map<string, unknown>;
  rng?: SeededRNG;
  seed?: string;
}

/**
 * Resolve a localized label for a given registry domain and ID.
 */
export function resolveRegistryLabel(domain: string, id: string, useJa: boolean = false): string {
  const entry = BardEngine.getRegistryEntry(domain, id);
  if (!entry) return id;
  return useJa ? (entry.labelJa ?? entry.label) : entry.label;
}

/**
 * Resolve a Japanese localized label for a given registry domain and ID.
 */
export function resolveRegistryLabelJa(domain: string, id: string): string {
  return resolveRegistryLabel(domain, id, true);
}

/**
 * Transforms a raw engine Rikishi into a UI-ready projection.
 * Guaranteed to strip hidden numerical stats.
 */
export function enrichRikishiForUI(rikishi: Rikishi): UIRikishi {
  return projectRikishi(rikishi, {
    year: new Date().getFullYear(),
    heyas: new Map(),
    rikishi: new Map(),
  } satisfies MinimalWorldForProjection as Parameters<typeof projectRikishi>[1]);
}
