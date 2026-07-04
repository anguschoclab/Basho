/**
 * Safely call a function, catching and swallowing any errors.
 * Useful for secondary systems like media or scouting that shouldn't crash the main simulation loop.
 *
 * @param fn - The function to call safely.
 */
import { warn } from "./Logger";

export function safeCall(fn: () => void): void {
  try {
    fn();
  } catch (error) {
    // Intentionally swallow errors in secondary systems to prevent main loop crashes
    warn("Recovered from error in secondary system", "safeCall", error);
  }
}
