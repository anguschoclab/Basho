/**
 * polishedCatalog.ts
 *
 * Resolves runtime {identity, stage} pairs to pre-rendered "polished" avatar
 * PNGs — the Gemini HD pixel-art pass over the procedural 24×24 render.
 *
 * Resolution order:
 *   1. entityManifest.json — per-entity portraits keyed by seed
 *   2. exact feature signature → a cataloged feature-matrix cell
 *   3. nearest signature within a weighted distance threshold — reuses the
 *      closest polished cell, so new entities get polished art built from
 *      the existing asset palette without any regeneration
 *   4. undefined → caller falls back to the procedural SVG from composeAvatar
 */

import type { AvatarIdentity, AvatarStage } from "@/engine/types/avatar";
import manifest from "./polishedManifest.json";
import entityManifest from "./entityManifest.json";

const files = import.meta.glob("./polished/*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;
const entityFiles = import.meta.glob("./polished/entities/*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;

const stemOf = (path: string) => path.slice(path.lastIndexOf("/") + 1, -".png".length);

const URL_BY_KEY: Record<string, string> = Object.fromEntries(
  Object.entries(files).map(([path, url]) => [stemOf(path), url])
);
const ENTITY_URLS: Record<string, string> = Object.fromEntries(
  Object.entries(entityFiles).map(([path, url]) => [stemOf(path), url])
);

/** entityManifest.json: identity seed → "entities/<file>.png". */
const ENTITY_FILE_BY_SEED = entityManifest as Record<string, string>;

/** Every polished asset key on disk (e.g. "head-shapes-1-round", "parts-4-tsuna-rope"). */
export const POLISHED_AVATAR_KEYS: readonly string[] = Object.keys(URL_BY_KEY).sort();

/** Direct lookup by catalog key — for curated callers (galleries, previews). */
export function polishedAvatarUrl(key: string): string | undefined {
  return URL_BY_KEY[key];
}

interface ManifestEntry {
  key: string;
  identity: Record<string, unknown>;
  stage: Record<string, unknown>;
}

const ENTRIES = manifest as ManifestEntry[];

const ID_FIELDS = [
  "version",
  "role",
  "headShape",
  "eyes",
  "brows",
  "browThickness",
  "nose",
  "mouth",
  "ears",
  "skinTone",
  "hairColor",
  "mark",
  "facialHair",
] as const;
const STAGE_FIELDS = [
  "role",
  "ageStage",
  "graying",
  "wrinkleTier",
  "hairstyle",
  "fullness",
  "glasses",
  "bandage",
  "attire",
  "tsuna",
  "expression",
  "attireOverride",
  "backdropTone",
] as const;

const cache = new Map<string, string | null>();

/**
 * Stage fields that carry gameplay signal — a borrowed polished cell must
 * agree on these (division hairstyle, attire, accessories) so the portrait
 * never lies about what the entity is or is wearing.
 */
const REQUIRED_STAGE_FIELDS = [
  "role",
  "attire",
  "hairstyle",
  "glasses",
  "bandage",
  "tsuna",
] as const;

/**
 * Count of mismatched non-required fields — tiebreak when several cataloged
 * cells satisfy the required stage fields; picks the most face-similar cell.
 */
function minorDistance(
  entry: ManifestEntry,
  idRec: Record<string, unknown>,
  stRec: Record<string, unknown>
): number {
  let d = 0;
  for (const f of ID_FIELDS) if (entry.identity[f] !== idRec[f]) d++;
  for (const f of STAGE_FIELDS) if (entry.stage[f] !== stRec[f]) d++;
  return d;
}

/**
 * Resolve an entity's {identity, stage} to a polished asset URL: exact seed →
 * exact signature → closest cell sharing the gameplay-signaled stage fields
 * (the polished palette becomes the avatar's look; minor facial features may
 * be borrowed) → undefined for procedural fallback.
 */
export function resolvePolishedAvatar(
  identity: AvatarIdentity,
  stage: AvatarStage
): string | undefined {
  // Per-entity portraits win — keyed by the identity's seed (= entity id).
  const entityFile = ENTITY_FILE_BY_SEED[identity.seed];
  if (entityFile) {
    const url = ENTITY_URLS[stemOf(entityFile)];
    if (url) return url;
  }

  const idRec = identity as unknown as Record<string, unknown>;
  const stRec = stage as unknown as Record<string, unknown>;
  const ck = JSON.stringify([
    ID_FIELDS.map((f) => idRec[f]),
    STAGE_FIELDS.map((f) => stRec[f]),
  ]);
  const cached = cache.get(ck);
  if (cached !== undefined) return cached ?? undefined;

  let best: { key: string; d: number } | null = null;
  for (const e of ENTRIES) {
    if (!REQUIRED_STAGE_FIELDS.every((f) => e.stage[f] === stRec[f])) continue;
    const d = minorDistance(e, idRec, stRec);
    if (d === 0) {
      best = { key: e.key, d: 0 };
      break;
    }
    if (!best || d < best.d) best = { key: e.key, d };
  }
  const hit = best ? (URL_BY_KEY[best.key] ?? null) : null;
  cache.set(ck, hit);
  return hit ?? undefined;
}
