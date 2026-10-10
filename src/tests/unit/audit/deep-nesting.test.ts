/**
 * Deep-nesting audit (AST-based).
 *
 * Flags control flow buried 3+ levels deep inside JSX expressions and
 * callbacks — the "deeply nested conditional" class flagged by external
 * review tooling. Extracting named handlers/components keeps JSX readable.
 *
 * A node is a VIOLATION when it is a control-flow STATEMENT (if, switch,
 * loop) and its ancestor chain contains 3+ of:
 *   - arrow functions / function expressions (map callbacks, JSX attr handlers)
 *   - JSX expression containers `{...}`
 *   - IIFE call expressions `{(() => {...})()}`
 *   - other control-flow statements / ternaries / `&&` conditional renders
 *
 * Expression-level conditionals (ternaries, `&&`/`||`) are contributors,
 * not violations — flagging every styling ternary in `cn()` would be noise.
 *
 * Scope: src/components + src/pages (.tsx), excluding test/story files.
 */

import { describe, it, expect } from "vitest";
import ts from "typescript";
import { readdirSync, readFileSync, existsSync } from "fs";
import { join, relative } from "path";

const SRC_DIR = join(import.meta.dirname, "../../../..", "src");
const SCANNED_DIRS = ["components", "pages"];

function findTsxFiles(dir: string): string[] {
  const results: string[] = [];
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findTsxFiles(full));
    } else if (
      entry.name.endsWith(".tsx") &&
      !entry.name.includes(".test.") &&
      !entry.name.includes(".stories.")
    ) {
      results.push(full);
    }
  }
  return results;
}

/** Control-flow statements that can be flagged when deeply buried. */
function isFlaggable(node: ts.Node): boolean {
  return (
    ts.isIfStatement(node) ||
    ts.isSwitchStatement(node) ||
    ts.isForStatement(node) ||
    ts.isForInStatement(node) ||
    ts.isForOfStatement(node) ||
    ts.isWhileStatement(node) ||
    ts.isDoStatement(node)
  );
}

function isAndAndRender(node: ts.Node): boolean {
  return (
    ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken
  );
}

function isIifeCall(node: ts.Node): boolean {
  if (!ts.isCallExpression(node)) return false;
  const callee = ts.isParenthesizedExpression(node.expression)
    ? node.expression.expression
    : node.expression;
  return ts.isArrowFunction(callee) || ts.isFunctionExpression(callee);
}

/** Ancestor kinds that each add one level of "buried logic" depth. */
function addsNestingDepth(node: ts.Node): boolean {
  return (
    ts.isArrowFunction(node) ||
    ts.isFunctionExpression(node) ||
    ts.isJsxExpression(node) ||
    isFlaggable(node) ||
    ts.isConditionalExpression(node) ||
    isAndAndRender(node) ||
    isIifeCall(node)
  );
}

function nestingDepth(node: ts.Node): number {
  let depth = 0;
  let current = node.parent;
  while (current) {
    if (addsNestingDepth(current)) depth++;
    current = current.parent;
  }
  return depth;
}

function collectViolations(file: string): string[] {
  const source = ts.createSourceFile(
    file,
    readFileSync(file, "utf-8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );
  const violations: string[] = [];
  const visit = (node: ts.Node) => {
    if (isFlaggable(node) && nestingDepth(node) >= 3) {
      const { line } = source.getLineAndCharacterOfPosition(node.getStart());
      violations.push(`${relative(SRC_DIR, file)}:${line + 1}`);
    }
    node.forEachChild(visit);
  };
  visit(source);
  return violations;
}

describe("Deep-nesting audit — no control flow buried 3+ levels in JSX", () => {
  const files = SCANNED_DIRS.flatMap((d) => findTsxFiles(join(SRC_DIR, d)));

  it("no if/loop/switch/ternary nested 3+ deep in JSX callbacks or expressions", () => {
    const violations = files.flatMap(collectViolations);
    expect(violations, `Deeply nested conditionals found:\n${violations.join("\n")}`).toEqual([]);
  });
});
