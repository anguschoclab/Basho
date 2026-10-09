import { SeededRNG } from "../rng";
import { seededRandom } from "./seededRandom";

const OYAKATA_NAMES = [
  "Miyagino",
  "Isegahama",
  "Kokonoe",
  "Takasago",
  "Dewanoumi",
  "Hakkaku",
  "Futagoyama",
  "Shibatayama",
  "Arashio",
  "Tokitsukaze",
  "Kasugano",
  "Oguruma",
  "Kise",
  "Tamanoi",
  "Oshima",
];

/**
 * Selects a deterministic Oyakata (elder) name from a predefined historical list.
 *
 * @param seed - The base string seed used for deterministic selection.
 * @param rng - Optional injected SeededRNG instance to bypass local seededRandom.
 * @returns A valid Oyakata name string from the static names list.
 */
export function generateOyakataName(seed: string, rng?: SeededRNG): string {
  // Deterministic pick using injected RNG or local seeded core.
  const roll = rng ? () => rng.next() : seededRandom(seed + "::oyakataName");

  const idx = Math.floor(roll() * OYAKATA_NAMES.length);
  return OYAKATA_NAMES[Math.max(0, Math.min(OYAKATA_NAMES.length - 1, idx))];
}
