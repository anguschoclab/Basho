import { describe, it, expect } from "vitest";
import { generateInitialWorld } from "@/engine/systems/generation/WorldFactory";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";
import { isSekitoriDivision } from "@/constants/engine/rankDisplay";
import { getRikishi } from "@/engine/queries";
import type { WorldState } from "@/engine/types/world";
import type { StateImpact } from "@/engine/core/StateImpact";

function setJungyoOptOut(world: WorldState, heyaId: string, optOut: boolean): StateImpact {
  const builder = createImpactBuilder("setJungyoOptOut");
  const heya = world.heyas.get(heyaId);
  if (!heya) return builder.build();
  builder.updateHeya(heyaId, { jungyoOptOut: optOut } as any);
  return builder.build();
}

describe("Phase 05 — Exhibition gating (jungyoOptOut)", () => {
  it("jungyoOptOut field can be set on a heya", () => {
    const world = generateInitialWorld("jungyo-optout-1");
    const heyaId = world.playerHeyaId ?? "";
    const impact = setJungyoOptOut(world, heyaId, true);
    const updated = resolveImpacts(world, [impact]);
    expect(updated.heyas.get(heyaId)?.jungyoOptOut).toBe(true);
  });

  it("jungyoOptOut defaults to undefined (falsy) on new worlds", () => {
    const world = generateInitialWorld("jungyo-optout-2");
    const heyaId = world.playerHeyaId ?? "";
    expect(world.heyas.get(heyaId)?.jungyoOptOut).toBeUndefined();
  });

  it("jungyoOptOut can be toggled back to false", () => {
    const world = generateInitialWorld("jungyo-optout-3");
    const heyaId = world.playerHeyaId ?? "";
    let current = resolveImpacts(world, [setJungyoOptOut(world, heyaId, true)]);
    expect(current.heyas.get(heyaId)?.jungyoOptOut).toBe(true);
    current = resolveImpacts(current, [setJungyoOptOut(current, heyaId, false)]);
    expect(current.heyas.get(heyaId)?.jungyoOptOut).toBe(false);
  });
});
