import { describe, it, expect } from "vitest";
import {
  isHonbashoName,
  isHonbashoState,
  isHonbashoInfo,
  makeExhibitionBasho,
  HONBASHO_NAMES,
} from "@/engine/bout/honbasho";
import { getBashoInfo, BASHO_ORDER } from "@/engine/calendar";
import type { BashoState } from "@/engine/types/basho";

function makeBashoState(
  overrides: Partial<BashoState> & { bashoName: BashoState["bashoName"] }
): BashoState {
  return {
    year: 2025,
    bashoNumber: 1,
    day: 1,
    matches: [],
    standings: new Map(),
    isActive: true,
    ...overrides,
  };
}

describe("Honbasho vs Exhibition — isHonbashoName", () => {
  it("returns true for all six official basho names", () => {
    for (const name of BASHO_ORDER) {
      expect(isHonbashoName(name)).toBe(true);
    }
  });

  it("HONBASHO_NAMES contains exactly 6 entries", () => {
    expect(HONBASHO_NAMES.size).toBe(6);
  });
});

describe("Honbasho vs Exhibition — isHonbashoInfo", () => {
  it("returns true for all six official basho info objects", () => {
    for (const name of BASHO_ORDER) {
      const info = getBashoInfo(name);
      expect(isHonbashoInfo(info)).toBe(true);
    }
  });
});

describe("Honbasho vs Exhibition — isHonbashoState", () => {
  it("returns true for a normal honbasho state", () => {
    const basho = makeBashoState({ bashoName: "hatsu" });
    expect(isHonbashoState(basho)).toBe(true);
  });

  it("returns false for exhibition basho (isExhibition flag)", () => {
    const basho = makeBashoState({
      bashoName: "hatsu",
      isExhibition: true,
      exhibitionName: "Regional Tour",
    });
    expect(isHonbashoState(basho)).toBe(false);
  });

  it("returns false for null/undefined", () => {
    expect(isHonbashoState(null)).toBe(false);
    expect(isHonbashoState(undefined)).toBe(false);
  });
});

describe("Honbasho vs Exhibition — makeExhibitionBasho", () => {
  it("creates a basho with isExhibition=true", () => {
    const basho = makeExhibitionBasho(2025, "Summer Jungyo Tour");
    expect(basho.isExhibition).toBe(true);
    expect(basho.exhibitionName).toBe("Summer Jungyo Tour");
    expect(basho.year).toBe(2025);
    expect(basho.isActive).toBe(true);
  });

  it("exhibition basho is not a honbasho", () => {
    const basho = makeExhibitionBasho(2025, "Osaka Exhibition");
    expect(isHonbashoState(basho)).toBe(false);
  });

  it("has empty matches and standings", () => {
    const basho = makeExhibitionBasho(2025, "Test Tour");
    expect(basho.matches).toEqual([]);
    expect(basho.standings.size).toBe(0);
  });
});
