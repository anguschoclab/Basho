/**
 * Asserts that a code path is never reached.
 * Useful for exhaustive checks in switch statements over union types.
 *
 * @param x - The value that should never be reached.
 * @returns Never.
 */
export function assertNever(x: never): never {
  throw new Error(`Unexpected object: ${x}`);
}
