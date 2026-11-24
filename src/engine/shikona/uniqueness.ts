/**
 * uniqueness.ts — live-name collision guard for shikona.
 *
 * `generateShikona` is intentionally dumb about the world: it rolls names from
 * morpheme pools and never checks what already exists. Over a long career sim
 * that produces silent duplicates — two unrelated rikishi sharing a shikona
 * breaks lineage tracking and confuses every name-keyed surface (chronicle,
 * retirement feeds, the 25-yr audit's yokozuna lineage).
 *
 * Intended-name inheritance (legacy shikona, myoseki elder names) lives in its
 * own pipeline — accidental same-name collisions are not a legacy feature.
 */

import type { WorldState } from "@/engine/types/world";
import type { SeededRNG } from "@/engine/core/rng";
import { generateShikona } from "@/engine/shikona/generateShikona";
import type { ShikonaGenerationConfig } from "@/engine/shikona/types";

/** Every shikona currently in play: active roster + retired history. */
export function collectTakenShikonas(world: WorldState): Set<string> {
  const taken = new Set<string>();
  for (const r of world.rikishi.values()) {
    if (r.shikona) taken.add(r.shikona.toLowerCase());
  }
  for (const e of world.historicalRikishi?.values() ?? []) {
    if (e.shikona) taken.add(e.shikona.toLowerCase());
  }
  return taken;
}

/**
 * Returns `proposed` when it doesn't collide with a live or historical name;
 * otherwise re-rolls via the normal generation pipeline until it lands on a
 * free name (bounded — the morpheme space is large, a few draws always
 * clears). `taken` may be supplied by callers minting a batch (genesis) so
 * earlier names in the same batch are honoured too.
 */
export function ensureUniqueShikona(args: {
  world: WorldState;
  proposed: string;
  rng: SeededRNG;
  config?: ShikonaGenerationConfig;
  taken?: Set<string>;
  /** rikishi id — excluded-self guard for rename flows. */
  selfId?: string;
}): string {
  const { world, proposed, rng, config, selfId } = args;
  const taken = args.taken ?? collectTakenShikonas(world);
  if (selfId) {
    const self = world.rikishi.get(selfId)?.shikona;
    if (self) taken.delete(self.toLowerCase());
  }
  if (proposed && !taken.has(proposed.toLowerCase())) return proposed;

  for (let attempt = 0; attempt < 12; attempt++) {
    const candidate = generateShikona(`${rng.seed}::dedup::${attempt}`, {
      ...config,
      rng,
    });
    if (!taken.has(candidate.toLowerCase())) {
      taken.add(candidate.toLowerCase());
      return candidate;
    }
  }
  // Pathological fallback — morpheme space exhausted: discriminate with a
  // numeral so the name still resolves uniquely.
  let n = 2;
  while (taken.has(`${proposed} ${n}`.toLowerCase())) n++;
  const fallback = `${proposed} ${n}`;
  taken.add(fallback.toLowerCase());
  return fallback;
}
