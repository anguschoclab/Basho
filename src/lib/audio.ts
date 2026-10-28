/**
 * audio.ts — minimal WebAudio player for engine events.
 * No assets: tones are synthesized. No-ops off-window or when muted via
 * localStorage "basho:audio" === "off".
 */

import { SOUND_MAP, type ToneSpec } from "@/constants/audio/soundMap";
import type { EngineEvent } from "@/engine/types/events";

export function isAudioEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem("basho:audio") !== "off";
  } catch {
    return true;
  }
}

export function setAudioEnabled(enabled: boolean): void {
  try {
    window.localStorage.setItem("basho:audio", enabled ? "on" : "off");
  } catch {
    /* storage unavailable — keep silent default */
  }
}

let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ctx ??= new AC();
  return ctx;
}

export function playTone(spec: ToneSpec): void {
  const audio = getContext();
  if (!audio) return;
  if (audio.state === "suspended") void audio.resume();

  let t = audio.currentTime;
  for (const freq of spec.notes) {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = spec.type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(spec.gain, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + spec.duration);
    osc.connect(gain).connect(audio.destination);
    osc.start(t);
    osc.stop(t + spec.duration);
    t += spec.duration;
  }
}

/** Play the mapped tone for an engine event. Silent for minor events and when muted. */
export function playForEvent(event: EngineEvent): void {
  if (!isAudioEnabled()) return;
  const spec = SOUND_MAP[event.importance] ?? null;
  if (spec) playTone(spec);
}
