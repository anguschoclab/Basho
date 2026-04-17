/**
 * uiUtilities.ts
 *
 * Utility functions for UI presentation.
 * Extracted from uiDigest.ts to eliminate monolithic structure.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { Rikishi } from "../../engine/types/rikishi";
import { BardEngine } from "../../engine/narrative/BardEngine";
import { projectRikishi } from "../rikishiUI";
import type { UIRikishi } from "../rikishiUI";

/**
 * Resolve a localized label for a given registry domain and ID.
 */
export function resolveRegistryLabel(domain: string, id: string, useJa: boolean = false): string {
  const entry = BardEngine.getRegistryEntry(domain, id);
  if (!entry) return id;
  return useJa ? (entry.labelJa ?? entry.label) : entry.label;
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
  } as any);
}
