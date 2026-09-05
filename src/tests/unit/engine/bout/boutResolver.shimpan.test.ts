/**
 * boutResolver.shimpan.test.ts — tests shimpan panel assembly on mono-ii bouts.
 * Plan Feature 6 Test-First Protocol items 4-5.
 */
import { describe, it, expect } from "vitest";
import { assembleShimpanPanel, recordGyojiBout } from "@/engine/systems/officials/GyojiService";
import { generateInitialWorld } from "@/engine/systems/generation/WorldFactory";
import type { Gyoji, Shimpan } from "@/engine/types/gyoji";

describe("boutResolver shimpan panel", () => {
  it("assembleShimpanPanel returns a panel from shimpan pool", () => {
    const world = generateInitialWorld("shimpan-panel-test");
    expect(world.shimpanPool).toBeDefined();
    expect(world.shimpanPool!.length).toBeGreaterThanOrEqual(5);

    const panel = assembleShimpanPanel(world.shimpanPool!, "bout-1");
    expect(panel).not.toBeNull();
    expect(panel!.panelists.length).toBeGreaterThan(0);
  });

  it("recordGyojiBout increments boutsOfficiated", () => {
    const world = generateInitialWorld("record-gyoji-test");
    const gyoji = world.gyojiPool![0];
    const before = gyoji.boutsOfficiated;

    const updated = recordGyojiBout(gyoji, "2026-01", 2026, false);
    expect(updated.boutsOfficiated).toBe(before + 1);
  });

  it("recordGyojiBout increments callsReversed when reversed", () => {
    const world = generateInitialWorld("record-gyoji-reversed-test");
    const gyoji = world.gyojiPool![0];
    const before = gyoji.callsReversed;

    const updated = recordGyojiBout(gyoji, "2026-01", 2026, true);
    expect(updated.callsReversed).toBe(before + 1);
  });
});
