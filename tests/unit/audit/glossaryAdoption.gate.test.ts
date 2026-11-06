import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { SRC as SRC_DIR } from "@tests/helpers/fsScan";

/**
 * T1.4 gate — glossary tooltip adoption on jargon surfaces.
 *
 * `GlossaryTip` must stay wired into the banzuke (rank labels + division
 * tabs), basho (kimarite badges, nakabi), and economy (kōenkai / sekitori /
 * kenshō) surfaces so Japanese sumo terms remain discoverable in context.
 * If a refactor drops the tooltip from one of these files, this test names it.
 */
const ADOPTED_SURFACES: { file: string; surface: string }[] = [
  { file: "pages/BanzukePage.tsx", surface: "division tabs" },
  { file: "components/banzuke/DivisionTable.tsx", surface: "rank labels" },
  { file: "components/basho/BoutCard.tsx", surface: "kimarite badge" },
  { file: "components/basho/BashoPageSections.tsx", surface: "nakabi badge" },
  { file: "components/economy/KoenkaiSekitoriCards.tsx", surface: "kōenkai/sekitori cards" },
  { file: "components/economy/SponsorDrawCard.tsx", surface: "kenshō draw" },
  { file: "components/almanac/AlmanacTabs.tsx", surface: "kimarite stats table" },
];

describe("T1.4 gate — GlossaryTip adoption on jargon surfaces", () => {
  it.each(ADOPTED_SURFACES)("$file uses GlossaryTip ($surface)", ({ file }) => {
    const content = readFileSync(join(SRC_DIR, file), "utf-8");
    expect(content).toMatch(/import .*GlossaryTip.* from/);
    expect(content).toMatch(/<GlossaryTip\s/);
  });
});
