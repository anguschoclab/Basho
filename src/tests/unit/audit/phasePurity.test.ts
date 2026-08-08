import { describe, it, expect } from "vitest";
import { readdirSync } from "fs";
import { join } from "path";
import { Project, SyntaxKind } from "ts-morph";

const SRC_DIR = join(import.meta.dirname, "../../../..", "src");
const PHASES_DIR = join(SRC_DIR, "engine/tick/phases");

function findTsFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findTsFiles(fullPath));
    } else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts")) {
      results.push(fullPath);
    }
  }
  return results;
}

const project = new Project({
  tsConfigFilePath: join(SRC_DIR, "..", "tsconfig.json"),
  skipAddingFilesFromTsConfig: true,
});

function isWorldIdentifier(node: import("ts-morph").Expression): boolean {
  return node.getKind() === SyntaxKind.Identifier && node.getText() === "world";
}

function isBuilderCall(node: import("ts-morph").Node): boolean {
  const text = node.getText();
  return text.includes("builder.") || text.includes("ImpactBuilder") || text.includes("builder.updateWorldField");
}

function checkExpressionAssignment(node: import("ts-morph").BinaryExpression): string | null {
  const left = node.getLeft();
  const right = node.getRight();

  if (isBuilderCall(left) || isBuilderCall(right)) return null;

  if (left.getKind() === SyntaxKind.PropertyAccessExpression) {
    const pa = left as import("ts-morph").PropertyAccessExpression;
    const root = pa;
    let expr: import("ts-morph").Expression = root;
    while (expr.getKind() === SyntaxKind.PropertyAccessExpression) {
      expr = (expr as import("ts-morph").PropertyAccessExpression).getExpression();
    }
    if (isWorldIdentifier(expr)) {
      return `direct assignment: ${node.getText()}`;
    }
  }
  return null;
}

function checkCallExpression(node: import("ts-morph").CallExpression): string | null {
  const expr = node.getExpression();
  if (expr.getKind() !== SyntaxKind.PropertyAccessExpression) return null;
  const pa = expr as import("ts-morph").PropertyAccessExpression;
  const methodName = pa.getName();

  if (methodName !== "push" && methodName !== "splice" && methodName !== "pop" && methodName !== "shift" && methodName !== "unshift" && methodName !== "fill" && methodName !== "sort" && methodName !== "reverse") return null;

  const obj = pa.getExpression();
  let root: import("ts-morph").Expression = obj;
  while (root.getKind() === SyntaxKind.PropertyAccessExpression) {
    root = (root as import("ts-morph").PropertyAccessExpression).getExpression();
  }
  if (isWorldIdentifier(root)) {
    return `mutating call: ${node.getText()}`;
  }
  return null;
}

describe("L4.1: phase purity — no direct world.* mutations outside builder (AST-based)", () => {
  it("tick phases do not directly assign to world.* properties (must use ImpactBuilder)", () => {
    const phaseFiles = findTsFiles(PHASES_DIR);
    const violations: string[] = [];

    for (const filePath of phaseFiles) {
      const sourceFile = project.addSourceFileAtPath(filePath);
      const relativePath = filePath.replace(SRC_DIR + "/", "");

      sourceFile.forEachDescendant((node) => {
        if (node.getKind() === SyntaxKind.BinaryExpression) {
          const be = node as import("ts-morph").BinaryExpression;
          if (be.getOperatorToken().getKind() === SyntaxKind.EqualsToken) {
            const violation = checkExpressionAssignment(be);
            if (violation) {
              const line = be.getStartLineNumber();
              violations.push(`${relativePath}:${line}: ${violation}`);
            }
          }
        }

        if (node.getKind() === SyntaxKind.CallExpression) {
          const ce = node as import("ts-morph").CallExpression;
          const violation = checkCallExpression(ce);
          if (violation) {
            const line = ce.getStartLineNumber();
            violations.push(`${relativePath}:${line}: ${violation}`);
          }
        }
      });
    }

    expect(violations.length, `Direct world.* mutations in tick phases:\n${violations.join("\n")}`).toEqual(0);
  });
});
