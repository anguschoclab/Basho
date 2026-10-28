/**
 * soundMap.ts — event → tone mapping for the audio layer.
 * Importance-driven: minor stays silent so the feed doesn't chirp constantly.
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
