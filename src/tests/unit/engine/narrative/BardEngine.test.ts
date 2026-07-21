import { describe, it, expect, beforeEach } from "vitest";
import { BardEngine, interpolate } from "@/engine/bard/BardEngine";
import { SeededRNG } from "@/engine/rng";

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

describe("BardEngine output injection prevention", () => {
  it("strips ] from shikona to prevent entity tag injection", () => {
    const context = {
      shikona: "Asano]yama",
      rikishiId: "r-1",
    };
    const template = "{{shikona}} is ready.";
    const result = interpolate(template, context);
    expect(result).toBe("[[rikishi:r-1:Asanoyama]] is ready.");
  });

  it("strips : from shikona to prevent entity tag splitting", () => {
    const context = {
      shikona: "Asano:yama",
      rikishiId: "r-1",
    };
    const template = "{{shikona}} is ready.";
    const result = interpolate(template, context);
    expect(result).not.toContain("Asano:yama");
    expect(result).toBe("[[rikishi:r-1:Asanoyama]] is ready.");
  });

  it("strips [[ from oyakata name to prevent nested entity tags", () => {
    const context = {
      oyakata: "Taka[[ohan",
      oyakataId: "o-1",
    };
    const template = "{{oyakata}} speaks.";
    const result = interpolate(template, context);
    expect(result).toBe("[[oyakata:o-1:Takaohan]] speaks.");
  });

  it("strips ] from entityId in entity tags", () => {
    const context = {
      shikona: "Asanoyama",
      rikishiId: "r-]1",
    };
    const template = "{{shikona}} is ready.";
    const result = interpolate(template, context);
    expect(result).not.toContain("r-]1");
    expect(result).toBe("[[rikishi:r-1:Asanoyama]] is ready.");
  });

  it("strips : from entityId in entity tags", () => {
    const context = {
      shikona: "Asanoyama",
      rikishiId: "r:1",
    };
    const template = "{{shikona}} is ready.";
    const result = interpolate(template, context);
    expect(result).not.toContain("r:1");
    expect(result).toBe("[[rikishi:r1:Asanoyama]] is ready.");
  });
});

describe("BardEngine length bounds", () => {
  it("truncates context values exceeding MAX_CONTEXT_VALUE_LENGTH", () => {
    const longValue = "A".repeat(2500);
    const context = { rank: longValue };
    const template = "Rank: {{rank}}";
    const result = interpolate(template, context);
    expect(result.length).toBeLessThan(longValue.length);
    expect(result).toContain("…truncated");
  });

  it("truncates total result exceeding MAX_INTERPOLATED_LENGTH", () => {
    const longValue = "B".repeat(500);
    const parts: string[] = [];
    for (let i = 0; i < 30; i++) {
      parts.push(`{{rank}}`);
    }
    const template = parts.join(" ");
    const context = { rank: longValue };
    const result = interpolate(template, context);
    expect(result.length).toBeLessThanOrEqual(10000 + "…[truncated]".length);
    expect(result).toContain("…[truncated]");
  });

  it("does not truncate normal-length values", () => {
    const context = { rank: "Yokozuna" };
    const template = "Rank: {{rank}}";
    const result = interpolate(template, context);
    expect(result).toBe("Rank: Yokozuna");
    expect(result).not.toContain("…truncated");
  });
});
