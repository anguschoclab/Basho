import { describe, it, expect, beforeEach } from "vitest";
import { BardEngine, interpolate } from "./BardEngine";
import { SeededRNG } from "../rng";

describe("BardEngine Interpolation Tagging", () => {
  beforeEach(() => {
    BardEngine.resetCache();
  });

  const rng = new SeededRNG("test-seed");

  it("should wrap rikishi shikona in tags if rikishiId is present", () => {
    const context = {
      shikona: "Asanoyama",
      rikishiId: "rikishi-1",
    };
    const template = "Rikishi {{shikona}} is ready.";
    const result = interpolate(template, context);
    expect(result).toBe("Rikishi [[rikishi:rikishi-1:Asanoyama]] is ready.");
  });

  it("should handle multiple entities", () => {
    const context = {
      winner: "Asanoyama",
      winnerId: "w-1",
      loser: "Terunofuji",
      loserId: "l-1",
    };
    const template = "{{winner}} def. {{loser}}";
    const result = interpolate(template, context);
    expect(result).toBe("[[rikishi:w-1:Asanoyama]] def. [[rikishi:l-1:Terunofuji]]");
  });

  it("should handle stables", () => {
    const context = {
      heya: "Kokonoe",
      heyaId: "h-1",
    };
    const template = "Welcome to {{heya}}.";
    const result = interpolate(template, context);
    expect(result).toBe("Welcome to [[stable:h-1:Kokonoe]].");
  });
});
