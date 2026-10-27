import type { PbpLine } from "@/engine/bout/boutNarrative";
import type { BardResult } from "@/engine/bard/BardEngine";

/**
 * Appends a resolved Bard line as a post-basho-press PbpLine when the
 * resolution produced text. Callers keep the `BardEngine.resolve(rng,
 * "literal.path", ctx)` inline so template-token integrity can trace paths.
 */
export function emitLine(lines: PbpLine[], res: BardResult, baseId: string, suffix: string): void {
  if (res.text) {
    lines.push({
      text: res.text,
      id: `${baseId}-${suffix}`,
      phase: "post_bout",
      tags: ["post_basho_press"],
    });
  }
}
