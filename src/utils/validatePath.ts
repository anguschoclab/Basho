import path from "path";

/**
 * Validates that a file path is confined within the allowed base directory.
 * Uses path.relative to robustly prevent path traversal attacks, including
 * edge cases on Windows where string-based startsWith checks can be bypassed.
 *
 * @param filePath - The path to validate (may be relative or absolute)
 * @param allowedBaseDir - The base directory that filePath must be within
 * @returns true if filePath is within allowedBaseDir, false otherwise
 */
export function validatePath(filePath: string, allowedBaseDir: string): boolean {
  if (typeof filePath !== "string") return false;
  const resolvedPath = path.resolve(filePath);
  const resolvedBase = path.resolve(allowedBaseDir);
  const relative = path.relative(resolvedBase, resolvedPath);
  // Reject if relative path escapes base (starts with '..') or is absolute (different drive on Windows)
  if (relative.startsWith("..") || path.isAbsolute(relative)) return false;
  return true;
}
