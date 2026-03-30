/**
 * Safely call a function, catching and swallowing any errors.
 * Useful for secondary systems like media or scouting that shouldn't crash the main simulation loop.
 * 
 * @param fn - The function to call safely.
 */
export function safeCall(fn: () => void): void {
  try {
    fn();
  } catch (error) {
    // Intentionally swallow errors in secondary systems to prevent main loop crashes
    console.warn("Recovered from error in secondary system:", error);
  }
}
