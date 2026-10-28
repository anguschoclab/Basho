import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SOUND_MAP } from "@/constants/audio/soundMap";
import { isAudioEnabled, playForEvent } from "@/lib/audio";
import type { EngineEvent } from "@/engine/types/events";

/**
 * T2-G5: the audio layer — importance→tone map keeps minor events silent, and
 * the localStorage "basho:audio" flag gates playback. WebAudio is stubbed with
 * a fake AudioContext assigned on the existing window (never redefined).
 */
function makeStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
    key: (i: number) => [...map.keys()][i] ?? null,
    get length() {
      return map.size;
    },
  } as Storage;
}

const oscillators: Array<{ type: string; freq: number }> = [];
function fakeAudioContext() {
  return {
    state: "running",
    currentTime: 0,
    destination: {},
    resume: () => Promise.resolve(),
    createOscillator: () => {
      const osc = {
        type: "sine",
        frequency: { value: 0 },
        connect: () => ({ connect: () => ({}) }),
        start: () => undefined,
        stop: () => undefined,
      };
      oscillators.push({ type: osc.type, freq: osc.frequency.value });
      return osc;
    },
    createGain: () => ({
      gain: {
        setValueAtTime: () => undefined,
        exponentialRampToValueAtTime: () => undefined,
      },
      connect: () => ({ connect: () => ({}) }),
    }),
  };
}

describe("SOUND_MAP", () => {
  it("maps every importance level, minor stays silent", () => {
    expect(SOUND_MAP.minor).toBeNull();
    for (const key of ["notable", "major", "headline"] as const) {
      const spec = SOUND_MAP[key];
      expect(spec).not.toBeNull();
      expect(spec!.notes.length).toBeGreaterThan(0);
      expect(spec!.duration).toBeGreaterThan(0);
      expect(spec!.gain).toBeGreaterThan(0);
      expect(spec!.gain).toBeLessThanOrEqual(1);
    }
  });
});

describe("playForEvent / isAudioEnabled", () => {
  beforeEach(() => {
    oscillators.length = 0; // module-level AudioContext cache persists between tests
    vi.stubGlobal("localStorage", makeStorage());
    (window as unknown as Record<string, unknown>).AudioContext =
      fakeAudioContext as unknown as typeof AudioContext;
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const evt = (importance: EngineEvent["importance"]) =>
    ({ importance }) as unknown as EngineEvent;

  it("is enabled by default and disabled when the flag is 'off'", () => {
    expect(isAudioEnabled()).toBe(true);
    window.localStorage.setItem("basho:audio", "off");
    expect(isAudioEnabled()).toBe(false);
  });

  it("does not play when muted", () => {
    window.localStorage.setItem("basho:audio", "off");
    playForEvent(evt("headline"));
    expect(oscillators.length).toBe(0);
  });

  it("plays the mapped notes for a headline event when enabled", () => {
    playForEvent(evt("headline"));
    expect(oscillators.length).toBe(SOUND_MAP.headline!.notes.length);
  });

  it("minor events stay silent even when enabled", () => {
    playForEvent(evt("minor"));
    expect(oscillators.length).toBe(0);
  });
});
