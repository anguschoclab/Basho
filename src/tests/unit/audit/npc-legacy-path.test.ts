/**
 * WS0 audit test — single canonical NPC weekly decision path.
 *
 * `phase01_week_npc_ai` is the production weekly NPC loop (perception →
 * plan → workers/agents → execution → memory). The legacy `tickWeekNPC`
 * in npcAI/ticks.ts is a divergent duplicate (no plans, no memory, no
 * crisis/media handling) retained only for a couple of test call sites.
 *
 * To prevent the two paths drifting apart, `tickWeekNPC` must not exist
 * as a separate decision path: tests that need weekly NPC behavior should
 * call `phase01_week_npc_ai` instead.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { readSrcFile, findFiles, SRC } from "@/tests/helpers/fsScan";

describe("NPC weekly decision — single canonical path", () => {
  it("npcAI/ticks.ts does not define tickWeekNPC", () => {
    const ticks = readSrcFile("engine/npcAI/ticks.ts");
    expect(ticks).not.toMatch(/export function tickWeekNPC/);
  });

  it("npcAI barrel does not re-export tickWeekNPC", () => {
    const barrel = readSrcFile("engine/npcAI.ts");
    expect(barrel).not.toContain("tickWeekNPC");
  });

  it("no engine source file references tickWeekNPC", () => {
    const files = findFiles(join(SRC, "engine"), {
      exclude: /\.(test|spec)\./,
    });
    const offenders = files.filter((f) =>
      /\btickWeekNPC\b/.test(readFileSync(f, "utf8"))
    );
    expect(offenders).toEqual([]);
  });
});
