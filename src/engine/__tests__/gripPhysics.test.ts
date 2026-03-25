import { describe, it, expect } from "vitest";
import { resolveGripClash, calculateActionPower, EngineState, checkKimariteRequirements } from "../bout/boutPhysics";
import { SeededRNG, rngFromSeed } from "../rng";
import { buildCombatProfile } from "../archetype";
import { Rikishi } from "../types/rikishi";
import { CombatAction } from "../types/combat";
import { KIMARITE_REGISTRY, Kimarite } from "../kimarite";
import { projectRikishi } from "../../presenters/uiModels";

describe("v1.6 Advanced Grip Physics (Kumi-te)", () => {
  const mockRikishi = (id: string, preferredGrip: 'migi' | 'hidari' | 'none'): Rikishi => ({
    id,
    shikona: id,
    combatProfile: {
      archetype: 'yotsu',
      familyPreferences: { push: 10, belt: 80, trick: 5, speed: 5 },
      preferredGrip,
      statModifiers: {}
    },
    stats: { strength: 100, weight: 150, technique: 100, speed: 100, balance: 100, initialBalance: 100 },
    weight: 150,
    height: 180,
  } as any);

  const mockState = (eastId: string, westId: string): EngineState => ({
    tick: 0,
    timeSeconds: 0,
    stance: "no-grip",
    position: "front",
    advantage: "none",
    tachiaiWinner: "east",
    fatigueEast: 0,
    fatigueWest: 0,
    day: 1,
    balanceEast: 100,
    balanceWest: 100,
    log: [],
    mizuiriDeclared: false,
    eastId,
    westId,
    grappleState: {
      east: { rightHand: 'outside', leftHand: 'outside' },
      west: { rightHand: 'outside', leftHand: 'outside' },
      gripAdvantage: 'neutral'
    }
  });

  it("Kenka-Yotsu Test: Should resolve asymmetric grip clash", () => {
    const east = mockRikishi("east", "migi");
    const west = mockRikishi("west", "hidari");
    const st = mockState("east", "west");
    const rng = rngFromSeed("test", "test", "grip-test");

    resolveGripClash(rng, east, west, st);

    expect(st.grappleState.gripAdvantage).toMatch(/east_strong|west_strong/);
    
    if (st.grappleState.gripAdvantage === 'east_strong') {
      expect(st.grappleState.east.rightHand).toBe('inside');
      expect(st.grappleState.west.leftHand).toBe('outside');
    }
  });

  it("Moro-zashi Modifier Test: Should apply +30% power for double-inside", () => {
    const east = mockRikishi("east", "migi");
    const west = mockRikishi("west", "hidari");
    const st = mockState("east", "west");
    st.grappleState.gripAdvantage = 'moro_zashi_east';

    const action: CombatAction = {
      family: 'belt',
      intent: 'attack',
      statWeighting: { strength: 1.0, weight: 0.0, technique: 0.0, speed: 0.0, balance: 0.0 }
    };

    const powerNormalized = calculateActionPower(east, action, west, st);
    
    // Base strength 100 * (1 + 150/500) = 130
    // With 30% bonus = 130 * 1.3 = 169
    expect(powerNormalized).toBeCloseTo(169, 0);
  });

  it("Constraint Test: Should filter out Uwatenage when in moro_zashi", () => {
    // Uwatenage requires rightHand: 'outside'
    // In moro_zashi_east, east has rightHand: 'inside'
    
    const uwatenage = KIMARITE_REGISTRY.find(k => k.id === 'uwatenage')!;
    const east = mockRikishi("east", "migi");
    const west = mockRikishi("west", "hidari");
    const st = mockState("east", "west");
    
    // Set moro_zashi for east
    st.grappleState.east = { rightHand: 'inside', leftHand: 'inside' };
    st.grappleState.gripAdvantage = 'moro_zashi_east';

    const canDoUwatenage = checkKimariteRequirements(uwatenage, east, west, st);
    expect(canDoUwatenage).toBe(false);
  });

  it("Constraint Test: Should allow Shitatenage when in moro_zashi", () => {
    // Shitatenage requires rightHand: 'inside'
    const shitatenage = KIMARITE_REGISTRY.find(k => k.id === 'shitatenage')!;
    const east = mockRikishi("east", "migi");
    const west = mockRikishi("west", "hidari");
    const st = mockState("east", "west");
    
    st.grappleState.east = { rightHand: 'inside', leftHand: 'inside' };
    st.grappleState.gripAdvantage = 'moro_zashi_east';

    const canDoShitatenage = checkKimariteRequirements(shitatenage, east, west, st);
    expect(canDoShitatenage).toBe(true);
  });

  it("Historical Kimarite Test: Should derive favored move from history", () => {
    const east = mockRikishi("east", "migi");
    // Mock history: 5 wins with Yorikiri, 2 with Oshidashi
    east.history = [
      { win: true, kimarite: 'yorikiri', day: 1, bashoId: 'b1' },
      { win: true, kimarite: 'yorikiri', day: 2, bashoId: 'b1' },
      { win: true, kimarite: 'yorikiri', day: 3, bashoId: 'b1' },
      { win: true, kimarite: 'yorikiri', day: 4, bashoId: 'b1' },
      { win: true, kimarite: 'yorikiri', day: 5, bashoId: 'b1' },
      { win: true, kimarite: 'oshidashi', day: 6, bashoId: 'b1' },
      { win: true, kimarite: 'oshidashi', day: 7, bashoId: 'b1' },
      { win: false, kimarite: 'hatakikomi', day: 8, bashoId: 'b1' }, // Loss
    ] as any;

    const ui = projectRikishi(east, { year: 2026, rikishi: new Map([[east.id, east]]), heyas: new Map() } as any);
    
    expect(ui.favoredKimarite[0]).toBe("yorikiri (5)");
  });

  it("Historical Kimarite Test (Rookie): Should handle 0 wins", () => {
    const east = mockRikishi("east", "migi");
    east.history = [];

    const ui = projectRikishi(east, { year: 2026, rikishi: new Map([[east.id, east]]), heyas: new Map() } as any);
    
    expect(ui.favoredKimarite[0]).toBe("Unknown (Rookie)");
  });
});
