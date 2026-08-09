import { describe, it, expect } from "vitest";
import { generateBanzukeMovementNarrative } from "@/engine/banzuke/banzukeMovementNarrative";
import { mockRikishi, makeMockWorld } from "../utils";
import type { MovementEvent } from "@/engine/types/banzuke";

function makeMovement(overrides: Partial<MovementEvent> = {}): MovementEvent {
  return {
    rikishiId: "r1",
    from: "makuuchi:Maegashira 10",
    to: "makuuchi:Maegashira 7",
    description: "Promoted: makuuchi:Maegashira 10 → makuuchi:Maegashira 7",
    kind: "promotion",
    ...overrides,
  } as MovementEvent;
}

describe("banzuke movement narrative (4.1)", () => {
  it("jump promotion generates narrative", () => {
    const r = mockRikishi("r1", { shikona: "JumpRiki" });
    const world = makeMockWorld({ rikishi: new Map([["r1", r]]) });
    const movements = [
      makeMovement({
        from: "makuuchi:Maegashira 10",
        to: "makuuchi:Maegashira 3",
        kind: "promotion",
        moveDistance: 3,
        isJumpPromotion: true,
      }),
    ];

    const lines = generateBanzukeMovementNarrative(movements, world, "jump-seed");
    expect(lines.length).toBe(1);
    expect(lines[0].text).toContain("JumpRiki");
  });

  it("sekitori promotion generates narrative", () => {
    const r = mockRikishi("r1", { shikona: "SekitoriRiki" });
    const world = makeMockWorld({ rikishi: new Map([["r1", r]]) });
    const movements = [
      makeMovement({
        from: "makushita:Makushita 1",
        to: "juryo:Juryo 10",
        kind: "promotion",
        isSekitoriPromotion: true,
      }),
    ];

    const lines = generateBanzukeMovementNarrative(movements, world, "sekitori-seed");
    expect(lines.length).toBe(1);
    expect(lines[0].text.toLowerCase()).toContain("sekitori");
  });

  it("sanyaku promotion generates narrative", () => {
    const r = mockRikishi("r1", { shikona: "SanyakuRiki" });
    const world = makeMockWorld({ rikishi: new Map([["r1", r]]) });
    const movements = [
      makeMovement({
        from: "makuuchi:Maegashira 1",
        to: "makuuchi:Komusubi",
        kind: "promotion",
        isSanyakuPromotion: true,
      }),
    ];

    const lines = generateBanzukeMovementNarrative(movements, world, "sanyaku-seed");
    expect(lines.length).toBe(1);
    expect(lines[0].text.toLowerCase()).toContain("sanyaku");
  });

  it("standard promotion generates narrative", () => {
    const r = mockRikishi("r1", { shikona: "StdPromoRiki" });
    const world = makeMockWorld({ rikishi: new Map([["r1", r]]) });
    const movements = [
      makeMovement({
        from: "makuuchi:Maegashira 10",
        to: "makuuchi:Maegashira 7",
        kind: "promotion",
      }),
    ];

    const lines = generateBanzukeMovementNarrative(movements, world, "std-promo-seed");
    expect(lines.length).toBe(1);
    expect(lines[0].text).toContain("StdPromoRiki");
  });

  it("demotion generates narrative", () => {
    const r = mockRikishi("r1", { shikona: "DemoRiki" });
    const world = makeMockWorld({ rikishi: new Map([["r1", r]]) });
    const movements = [
      makeMovement({
        from: "makuuchi:Maegashira 5",
        to: "makuuchi:Maegashira 12",
        kind: "demotion",
      }),
    ];

    const lines = generateBanzukeMovementNarrative(movements, world, "demo-seed");
    expect(lines.length).toBe(1);
    expect(lines[0].text).toContain("DemoRiki");
  });

  it("lateral movements are skipped", () => {
    const r = mockRikishi("r1", { shikona: "LateralRiki" });
    const world = makeMockWorld({ rikishi: new Map([["r1", r]]) });
    const movements = [
      makeMovement({
        from: "makuuchi:Maegashira 5 East",
        to: "makuuchi:Maegashira 5 West",
        kind: "lateral",
      }),
    ];

    const lines = generateBanzukeMovementNarrative(movements, world, "lateral-seed");
    expect(lines.length).toBe(0);
  });

  it("status movements are skipped", () => {
    const r = mockRikishi("r1", { shikona: "StatusRiki" });
    const world = makeMockWorld({ rikishi: new Map([["r1", r]]) });
    const movements = [
      makeMovement({
        from: "kadoban:true",
        to: "kadoban:false",
        kind: "status",
      }),
    ];

    const lines = generateBanzukeMovementNarrative(movements, world, "status-seed");
    expect(lines.length).toBe(0);
  });

  it("multiple movements generate multiple lines", () => {
    const r1 = mockRikishi("r1", { shikona: "Riki1" });
    const r2 = mockRikishi("r2", { shikona: "Riki2" });
    const r3 = mockRikishi("r3", { shikona: "Riki3" });
    const world = makeMockWorld({
      rikishi: new Map([
        ["r1", r1],
        ["r2", r2],
        ["r3", r3],
      ]),
    });
    const movements = [
      makeMovement({ rikishiId: "r1", kind: "promotion" }),
      makeMovement({ rikishiId: "r2", kind: "promotion" }),
      makeMovement({ rikishiId: "r3", kind: "demotion" }),
    ];

    const lines = generateBanzukeMovementNarrative(movements, world, "multi-seed");
    expect(lines.length).toBe(3);
  });

  it("rikishi not found in world is handled gracefully", () => {
    const world = makeMockWorld({ rikishi: new Map() });
    const movements = [makeMovement({ rikishiId: "unknown", kind: "promotion" })];

    const lines = generateBanzukeMovementNarrative(movements, world, "unknown-seed");
    expect(lines.length).toBe(0);
  });
});
