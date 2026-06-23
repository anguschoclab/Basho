/**
 * asyncPool.ts
 * ============
 * Bounded-concurrency async mapper.
 */

/**
 * Maps over an array with a concurrency limit, preserving input order in the output.
 * Starts up to `limit` invocations immediately; launches the next as each resolves.
 * Rejects fast on the first error (matches Promise.all semantics).
 *
 * @param items - Input array
 * @param limit - Maximum concurrent invocations (clamped to [1, items.length])
 * @param fn - Async mapper receiving (item, index)
 * @returns Array of results in the same order as `items`
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  if (items.length === 0) return [];
  const cap = Math.max(1, Math.min(limit, items.length));
  const results: R[] = new Array(items.length);
  let cursor = 0;
  let active = 0;

  return new Promise<R[]>((resolve, reject) => {
    const launch = (i: number): void => {
      active++;
      fn(items[i], i)
        .then((r) => {
          results[i] = r;
          active--;
          advance();
        })
        .catch((err) => {
          reject(err);
        });
    };
    const advance = (): void => {
      if (cursor >= items.length && active === 0) {
        resolve(results);
        return;
      }
      while (active < cap && cursor < items.length) {
        launch(cursor++);
      }
    };
    advance();
  });
}
