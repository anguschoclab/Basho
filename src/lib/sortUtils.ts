export type SortDirection = "asc" | "desc";

/**
 * Compare two items by an accessor function, respecting sort direction.
 * Undefined values are treated as last in both ascending and descending order.
 * Returns 0 for equal values, preserving stable sort order from Array.prototype.sort.
 */
export function compareBy<T>(
  a: T,
  b: T,
  accessor: (item: T) => string | number | undefined,
  order: SortDirection
): number {
  const valA = accessor(a);
  const valB = accessor(b);

  if (valA === undefined && valB === undefined) return 0;
  if (valA === undefined) return 1;
  if (valB === undefined) return -1;

  if (valA < valB) return order === "asc" ? -1 : 1;
  if (valA > valB) return order === "asc" ? 1 : -1;
  return 0;
}
