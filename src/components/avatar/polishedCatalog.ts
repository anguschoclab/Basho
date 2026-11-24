/**
 * polishedCatalog.ts
 *
 * Resolves runtime {identity, stage} pairs to pre-rendered "polished" avatar
 * PNGs — the Gemini HD pixel-art pass over the procedural 24×24 render.
 *
 * Coverage is the feature-matrix catalog in polishedManifest.json (regenerate
 * via `bun scripts/lib/gen-polished-manifest.ts` after editing the spec in
 * scripts/lib/avatar-sheet.ts or re-running the polish pass). Entities whose
 * resolved signature isn't cataloged return undefined — callers fall back to
 * the procedural SVG from composeAvatar.
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
 * Resolve an entity's {identity, stage} to a polished asset URL when its full
 * signature matches a cataloged cell; undefined otherwise.
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

  let hit: string | null = null;
  for (const e of ENTRIES) {
    if (
      ID_FIELDS.every((f) => e.identity[f] === idRec[f]) &&
      STAGE_FIELDS.every((f) => e.stage[f] === stRec[f])
    ) {
      hit = URL_BY_KEY[e.key] ?? null;
      break;
    }
  }
  cache.set(ck, hit);
  return hit ?? undefined;
}
