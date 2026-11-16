/**
 * W I — degeiko (inter-heya training visits).
 *
 * requestDegeiko validates and schedules a visit on the requesting
 * heya's HeyaTrainingState.pendingDegeiko (NPC acceptance is seeded).
 * applyWeeklyDegeiko consumes pending sessions in the weekly training
 * phase: participants gain technique/experience + fatigue, and cross-heya
 * practicePartners links are written both ways.
 */
import { describe, it, expect } from "vitest";
import {
  requestDegeiko,
  applyWeeklyDegeiko,
} from "@/engine/training/DegeikoService";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import type { WorldState } from "@/engine/types/world";

function buildWorld(seed: string): WorldState {
  const guestA = MockFactory.createRikishi("guest-a", { heyaId: "heya-g" });
  const guestB = MockFactory.createRikishi("guest-b", { heyaId: "heya-g" });
  const hostA = MockFactory.createRikishi("host-a", { heyaId: "heya-h" });
  const hostB = MockFactory.createRikishi("host-b", { heyaId: "heya-h" });
  return MockFactory.createWorld({
    seed,
    year: 2026,
    week: 10,
    playerHeyaId: "heya-g",
    heyas: new Map([
      ["heya-g", MockFactory.createHeya("heya-g", { rikishiIds: ["guest-a", "guest-b"] })],
      ["heya-h", MockFactory.createHeya("heya-h", { rikishiIds: ["host-a", "host-b"] })],
    ]),
    rikishi: new Map([
      ["guest-a", guestA],
      ["guest-b", guestB],
      ["host-a", hostA],
      ["host-b", hostB],
    ]),
    trainingState: new Map([
      ["heya-g", { heyaId: "heya-g", activeProfile: {} as never, focusSlots: [] }],
      ["heya-h", { heyaId: "heya-h", activeProfile: {} as never, focusSlots: [] }],
    ]),
  });
}

describe("requestDegeiko", () => {
  it("rejects a request to the heya's own stable", () => {
    const world = buildWorld("seed-a");
    const impact = requestDegeiko(world, "heya-g", "heya-g", ["guest-a"]);
    expect(impact.entities?.trainingStateUpdates?.size ?? 0).toBe(0);
  });

  it("rejects an unknown target heya", () => {
    const world = buildWorld("seed-a");
    const impact = requestDegeiko(world, "heya-g", "heya-x", ["guest-a"]);
    expect(impact.entities?.trainingStateUpdates?.size ?? 0).toBe(0);
  });

  it("rejects rikishi not owned by the requesting heya", () => {
    const world = buildWorld("seed-a");
    const impact = requestDegeiko(world, "heya-g", "heya-h", ["host-a"]);
    expect(impact.entities?.trainingStateUpdates?.size ?? 0).toBe(0);
  });

  it("schedules a pending session on accept for some seed", () => {
    let accepted = false;
    for (let i = 0; i < 30 && !accepted; i++) {
      const world = buildWorld(`acc-seed-${i}`);
      const impact = requestDegeiko(world, "heya-g", "heya-h", ["guest-a", "guest-b"]);
      const upd = impact.entities?.trainingStateUpdates?.get("heya-g");
      if (upd?.pendingDegeiko) {
        accepted = true;
        expect(upd.pendingDegeiko.targetHeyaId).toBe("heya-h");
        expect(upd.pendingDegeiko.rikishiIds).toEqual(["guest-a", "guest-b"]);
      }
    }
    expect(accepted).toBe(true);
  });

  it("emits a declined event when the roll fails for some seed", () => {
    let declined = false;
    for (let i = 0; i < 30 && !declined; i++) {
      const world = buildWorld(`dec-seed-${i}`);
      const impact = requestDegeiko(world, "heya-g", "heya-h", ["guest-a"]);
      const upd = impact.entities?.trainingStateUpdates?.get("heya-g");
      declined = !upd?.pendingDegeiko;
    }
    expect(declined).toBe(true);
  });
});

describe("applyWeeklyDegeiko", () => {
  it("consumes the session: stats up, fatigue up, partners linked, pending cleared", () => {
    let world = buildWorld("week-seed-1");
    for (let i = 0; i < 30; i++) {
      world = buildWorld(`week-seed-${i}`);
      const req = requestDegeiko(world, "heya-g", "heya-h", ["guest-a", "guest-b"]);
      if (req.entities?.trainingStateUpdates?.get("heya-g")?.pendingDegeiko) {
        world = resolveImpacts(world, [req]);
        break;
      }
      if (i === 29) throw new Error("no seed accepted the degeiko request");
    }
    const before = world.rikishi.get("guest-a")!;
    const impact = applyWeeklyDegeiko(world);
    const resolved = resolveImpacts(world, [impact]);

    const after = resolved.rikishi.get("guest-a")!;
    const host = resolved.rikishi.get("host-a")!;
    const gainedStat =
      after.stats.technique > before.stats.technique ||
      after.stats.experience > before.stats.experience;
    expect(gainedStat).toBe(true);
    expect(after.fatigue).toBeGreaterThan(before.fatigue);
    // practice-partner link is mutual with at least one host rikishi
    const linkedToHost = (after.practicePartners ?? []).some((id) =>
      id.startsWith("host-")
    );
    expect(linkedToHost).toBe(true);
    expect(
      (host.practicePartners ?? []).includes("guest-a") ||
        (resolved.rikishi.get("host-b")!.practicePartners ?? []).includes("guest-a")
    ).toBe(true);
    // pending cleared
    expect(resolved.trainingState!.get("heya-g")?.pendingDegeiko).toBeFalsy();
  });
});
