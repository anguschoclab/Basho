/**
 * soundMap.ts — event → tone mapping for the audio layer.
 * Category tones differentiate the feed (bout clash, scandal sting,
 * sponsor chime); importance fallback keeps minor events silent so the
 * feed doesn't chirp constantly.
 */

import type { EventImportance } from "@/engine/types/events";

export interface ToneSpec {
  /** Oscillator frequency in Hz per note. */
  notes: number[];
  /** Seconds per note. */
  duration: number;
  /** Waveform shape. */
  type: OscillatorType;
  /** 0..1 gain. */
  gain: number;
}

export const SOUND_MAP: Record<EventImportance, ToneSpec | null> = {
  minor: null,
  notable: { notes: [440], duration: 0.09, type: "sine", gain: 0.12 },
  major: { notes: [392, 523], duration: 0.12, type: "triangle", gain: 0.16 },
  headline: { notes: [392, 523, 659], duration: 0.14, type: "triangle", gain: 0.2 },
};

/**
 * Per-category overrides consulted before the importance fallback.
 * Keys are EngineEvent.category values; add new categories here as the
 * audio pass deepens (crowd swells, tachiai slap, etc.).
 */
export const CATEGORY_SOUND_MAP: Record<string, ToneSpec> = {
  bout: { notes: [196, 147], duration: 0.16, type: "square", gain: 0.14 },
  discipline: { notes: [311, 233], duration: 0.14, type: "sawtooth", gain: 0.12 },
  economy: { notes: [523, 659], duration: 0.1, type: "sine", gain: 0.12 },
  health: { notes: [330, 262], duration: 0.14, type: "sine", gain: 0.12 },
  media: { notes: [440, 554], duration: 0.1, type: "triangle", gain: 0.12 },
  rivalry: { notes: [247, 196], duration: 0.14, type: "triangle", gain: 0.14 },
  narrative: { notes: [392], duration: 0.1, type: "sine", gain: 0.1 },
};

/** Resolve the tone for an event: category override, else importance. */
export function toneForEvent(event: {
  category?: string;
  importance: EventImportance;
}): ToneSpec | null {
  return (
    (event.category ? CATEGORY_SOUND_MAP[event.category] : undefined) ?? SOUND_MAP[event.importance]
  );
}
