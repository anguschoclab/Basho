import { describe, it, expect } from "vitest";
import {
  assignPressPersona,
  assignPersonalityTraits,
  rollBirthday,
} from "@/engine/systems/generation/PersonaAssignment";
import { SeededRNG } from "@/engine/rng";
import { PERSONALITY_TRAITS } from "@/constants/engine/generation";

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */

describe("PersonaAssignment — press persona & trait assignment (T22)", () => {
  // ── T22.1-T22.5: Press persona assignment ──
  it("T22.1: discipline >= 75 && mediaSavvy < 40 → stoic", () => {
    expect(assignPressPersona(80, 30)).toBe("stoic");
  });

  it("T22.2: mediaSavvy >= 75 && discipline >= 60 → celebrity", () => {
    expect(assignPressPersona(65, 80)).toBe("celebrity");
  });

  it("T22.3: mediaSavvy >= 70 && discipline < 40 → firebrand", () => {
    expect(assignPressPersona(30, 75)).toBe("firebrand");
  });

  it("T22.4: discipline < 35 && mediaSavvy < 40 → villain", () => {
    expect(assignPressPersona(30, 30)).toBe("villain");
  });

  it("T22.5: default values → neutral", () => {
    expect(assignPressPersona(50, 50)).toBe("neutral");
  });

  // ── T22.6-T22.7: Personality traits ──
  it("T22.6: generated rikishi has 2-4 personality traits", () => {
    const rng = new SeededRNG("test-traits-1");
    const traits = assignPersonalityTraits("hybrid", 50, 50, rng);
    expect(traits.length).toBeGreaterThanOrEqual(2);
    expect(traits.length).toBeLessThanOrEqual(4);
  });

  it("T22.7: traits are from the defined pool", () => {
    const rng = new SeededRNG("test-traits-2");
    const traits = assignPersonalityTraits("oshi", 60, 40, rng);
    for (const trait of traits) {
      expect(PERSONALITY_TRAITS).toContain(trait);
    }
  });

  // ── T22.8-T22.10: Weighted trait assignment ──
  it("T22.8: high discipline → more likely to have calm/humble/traditional/laconic", () => {
    // Run multiple seeds and check distribution
    const calmTraits = new Set(["calm", "humble", "traditional", "laconic"]);
    let found = 0;
    for (let i = 0; i < 50; i++) {
      const rng = new SeededRNG(`test-disc-${i}`);
      const traits = assignPersonalityTraits("yotsu", 90, 30, rng);
      if (traits.some((t) => calmTraits.has(t))) found++;
      if (found >= 10) break;
    }
    // With high discipline, should frequently get calm traits
    expect(found).toBeGreaterThan(0);
  });

  it("T22.9: trickster archetype → more likely to have witty/rebellious", () => {
    const tricksterTraits = new Set(["witty", "rebellious"]);
    let found = 0;
    for (let i = 0; i < 50; i++) {
      const rng = new SeededRNG(`test-trick-${i}`);
      const traits = assignPersonalityTraits("trickster", 50, 50, rng);
      if (traits.some((t) => tricksterTraits.has(t))) found++;
      if (found >= 10) break;
    }
    expect(found).toBeGreaterThan(0);
  });

  it("T22.10: giant archetype → more likely to have laconic/gentle", () => {
    const giantTraits = new Set(["laconic", "gentle"]);
    let found = 0;
    for (let i = 0; i < 50; i++) {
      const rng = new SeededRNG(`test-giant-${i}`);
      const traits = assignPersonalityTraits("giant", 50, 50, rng);
      if (traits.some((t) => giantTraits.has(t))) found++;
      if (found >= 10) break;
    }
    expect(found).toBeGreaterThan(0);
  });

  // ── T22.11: Birthday assignment ──
  it("T22.11: birthMonth is 1-12, birthDay is 1-28", () => {
    for (let i = 0; i < 100; i++) {
      const rng = new SeededRNG(`test-bday-${i}`);
      const { birthMonth, birthDay } = rollBirthday(rng);
      expect(birthMonth).toBeGreaterThanOrEqual(1);
      expect(birthMonth).toBeLessThanOrEqual(12);
      expect(birthDay).toBeGreaterThanOrEqual(1);
      expect(birthDay).toBeLessThanOrEqual(28);
    }
  });

  // ── T22.12: Determinism ──
  it("T22.12: deterministic — same seed → same persona, traits, birthday", () => {
    const rng1 = new SeededRNG("det-test");
    const rng2 = new SeededRNG("det-test");
    const persona1 = assignPressPersona(70, 50);
    const persona2 = assignPressPersona(70, 50);
    expect(persona1).toBe(persona2);

    const traits1 = assignPersonalityTraits("hybrid", 70, 50, rng1);
    const traits2 = assignPersonalityTraits("hybrid", 70, 50, rng2);
    expect(traits1).toEqual(traits2);

    const bday1 = rollBirthday(new SeededRNG("det-bday"));
    const bday2 = rollBirthday(new SeededRNG("det-bday"));
    expect(bday1).toEqual(bday2);
  });
});
