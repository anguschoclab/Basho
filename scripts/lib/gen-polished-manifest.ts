/**
 * gen-polished-manifest.ts
 * ========================
 * Emits src/components/avatar/polishedManifest.json — the signature table
 * that lets src/components/avatar/polishedCatalog.ts resolve a runtime
 * {identity, stage} pair to a pre-rendered polished PNG. Regenerate after
 * changing MATRIX_GROUPS in avatar-sheet.ts or re-running the polish pass.
 *
 *   bun scripts/lib/gen-polished-manifest.ts
 */
import { writeFileSync } from "node:fs";
import {
  BASE_IDENTITY,
  BASE_STAGE,
  MATRIX_GROUPS,
  slug,
} from "./avatar-sheet";

interface ManifestEntry {
  /** polished/<key>.png stem — mirrors buildSections() key formula. */
  key: string;
  identity: Record<string, unknown>;
  stage: Record<string, unknown>;
}

const entries: ManifestEntry[] = [];

for (const g of MATRIX_GROUPS) {
  g.cells.forEach((cell, i) => {
    const key = `${slug(g.title).slice(0, 24)}-${i}-${slug(cell.label) || i}`;
    const { seed: _seed, ...idFields } = { ...BASE_IDENTITY, ...cell.id };
    entries.push({
      key,
      identity: idFields,
      stage: { ...BASE_STAGE, ...cell.stage },
    });
  });
}

const out = "src/components/avatar/polishedManifest.json";
writeFileSync(out, JSON.stringify(entries, null, 1) + "\n");
console.log(`wrote ${out} (${entries.length} entries)`);
