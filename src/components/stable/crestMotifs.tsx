/**
 * Shared crest motif rendering functions for Heya branding components.
 * Motif geometry lives in ./crestMotifPaths.tsx.
 */

import React from "react";
import { CREST_MOTIF_RENDERERS } from "./crestMotifPaths";

/**
 * Render the crest motif as SVG
 */
export function renderCrestMotif(motif: string, color: string): React.ReactNode {
  const renderer = CREST_MOTIF_RENDERERS[motif];
  return renderer ? (
    renderer(color)
  ) : (
    <circle cx="50" cy="50" r="30" fill="none" stroke={color} strokeWidth="8" />
  );
}
