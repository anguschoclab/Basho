import { describe, it, expect } from "vitest";
import { toKihakuDTO } from "@/presenters/rikishi/transformers/kihaku";
import { mockRikishi } from "../../../engine/utils";
import type { Rikishi } from "@/engine/types/rikishi";

describe("toKihakuDTO", () => {
  it("exposes kihakuIsenScore from rikishi", () => {
    const r = mockRikishi("k1", { power: 50 }) as Rikishi;
    r.kihakuIsenScore = 78;
    const dto = toKihakuDTO(r);
    expect(dto.kihakuIsenScore).toBe(78);
  });

  it("defaults to 50 when kihakuIsenScore is absent", () => {
    const r = mockRikishi("k2", { power: 50 }) as Rikishi;
    const dto = toKihakuDTO(r);
    expect(dto.kihakuIsenScore).toBe(50);
  });

  it("provides a human-readable label for the score tier", () => {
    const r = mockRikishi("k5", { power: 50 }) as Rikishi;
    r.kihakuIsenScore = 90;
    const dto = toKihakuDTO(r);
    expect(dto.label).toBeDefined();
    expect(dto.label.length).toBeGreaterThan(0);
  });

  it("returns 'Blazing Spirit' for scores >= 80", () => {
    const r = mockRikishi("k6", { power: 50 }) as Rikishi;
    r.kihakuIsenScore = 85;
    expect(toKihakuDTO(r).label).toBe("Blazing Spirit");
  });

  it("returns 'Steady Resolve' for scores in 50-64 range", () => {
    const r = mockRikishi("k7", { power: 50 }) as Rikishi;
    r.kihakuIsenScore = 55;
    expect(toKihakuDTO(r).label).toBe("Steady Resolve");
  });

  it("returns 'Broken Spirit' for scores < 35", () => {
    const r = mockRikishi("k8", { power: 50 }) as Rikishi;
    r.kihakuIsenScore = 20;
    expect(toKihakuDTO(r).label).toBe("Broken Spirit");
  });
});
