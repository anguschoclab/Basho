/**
 * engine-reviewer.ts
 * ==================
 * Static analysis tool to review engine code for determinism violations,
 * RNG convention breaches, and tick pipeline correctness.
 */

import { readFileSync, readdirSync } from "fs";
import { join } from "path";

export interface Violation {
  file: string;
  line: number;
  type: string;
  description: string;
}

const ENGINE_DIR = join(__dirname, "../src/engine");

/** Strip string/comment contents so they don't trigger heuristic checks. */
function stripLiteralAndComments(raw: string): string {
  return raw
    .replace(/"(?:\\.|[^"\\])*"/g, "\"\"")
    .replace(/'(?:\\.|[^'\\])*'/g, "''")
    .replace(/`(?:\\.|[^`\\])*`/g, "``")
    .replace(/\/\/.*/, "");
}

function pushViolation(
  violations: Violation[],
  filePath: string,
  lineNum: number,
  type: string,
  description: string,
): void {
  violations.push({
    file: filePath.replace(__dirname + "/", ""),
    line: lineNum,
    type,
    description,
  });
}

export function reviewSource(content: string, filePath: string): Violation[] {
  const violations: Violation[] = [];
  const lines = content.split("\n");

  lines.forEach((rawLine, index) => {
    const lineNum = index + 1;
    const trimmed = rawLine.trim();
    if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) {
      return;
    }

    const line = stripLiteralAndComments(rawLine);

    // Check 1: Math.random() usage (only in real code, not comments/strings)
    if (/\bMath\.random\(\)/.test(line) && !line.trim().startsWith("//")) {
      pushViolation(violations, filePath, lineNum, "RNG Convention Breach", "Math.random() used - must use rngForWorld(), rngFromSeed(), or new SeededRNG()");
    }

    // Check 2: Dead function calls
    if (/\bprocessHeyaFinances\(\)/.test(line) || /\btickWeekEconomics\(\)/.test(line)) {
      pushViolation(
        violations,
        filePath,
        lineNum,
        "Dead Function Call",
        /\bprocessHeyaFinances\(\)/.test(line)
          ? "processHeyaFinances() is deprecated"
          : "tickWeekEconomics() is deprecated",
      );
    }

    // Check 3: Incorrect generateGovernanceHeadline call signature
    if (/\bgenerateGovernanceHeadline\(/.test(line) && !line.includes("{")) {
      pushViolation(
        violations,
        filePath,
        lineNum,
        "Incorrect Call Signature",
        "generateGovernanceHeadline must use named-arg object, not positional arguments",
      );
    }

    // Check 4: BardEngine token mismatches
    if (/(%HEYA_NAME%|%HEYA%)/.test(line)) {
      pushViolation(
        violations,
        filePath,
        lineNum,
        "BardEngine Token Mismatch",
        "Token mismatch detected - check BardEngine token conventions",
      );
    }

    // Check 5: Potential mutable state leaks
    // We look for actual assignment or mutating method calls on a world.* member,
    // not comparisons, destructuring, or safe reads.
    const hasWorldMutation =
      /\bworld\.[A-Za-z_$][\w$]*(?:\[[^\]]+\])?\s*(?:(?:\+|-|\*|\/)?|\*\*|%)?=(?![=>])/.test(line) ||
      /\bworld\.[A-Za-z_$][\w$]*(?:\[[^\]]+\])?\.(?:push|delete|splice|set|shift|unshift|pop|sort|reverse)\s*\(/.test(line);

    if (
      hasWorldMutation &&
      !line.includes("structuredClone") &&
      !line.includes("builder") &&
      !line.includes("updateWorldField")
    ) {
      pushViolation(
        violations,
        filePath,
        lineNum,
        "Potential Mutable State Leak",
        "Direct mutation of world state - consider using structuredClone or ImpactBuilder",
      );
    }
  });

  return violations;
}

function checkFile(filePath: string, violations: Violation[]) {
  // Skip test files for static analysis; tests are allowed to construct partial/throwaway states.
  if (filePath.endsWith(".test.ts") || filePath.endsWith(".spec.ts")) {
    return;
  }
  const content = readFileSync(filePath, "utf-8");
  violations.push(...reviewSource(content, filePath));
}

function scanDirectory(dir: string, violations: Violation[]) {
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        // Skip node_modules and test directories
        if (entry.name !== "node_modules" && !entry.name.includes("__tests__")) {
          scanDirectory(fullPath, violations);
        }
      } else if (entry.name.endsWith(".ts")) {
        checkFile(fullPath, violations);
      }
    }
  } catch (_error) {
    // Ignore permission errors
  }
}

function main() {
  const violations: Violation[] = [];

  console.log("=== Engine Code Review ===\n");
  console.log("Scanning engine code for violations...\n");

  scanDirectory(ENGINE_DIR, violations);

  if (violations.length === 0) {
    console.log("✅ No violations found!\n");
    console.log("Engine code follows all conventions:");
    console.log("  ✓ Uses seeded RNG (no Math.random)");
    console.log("  ✓ No dead function calls");
    console.log("  ✓ Correct call signatures");
    console.log("  ✓ Proper BardEngine tokens");
    console.log("  ✓ No mutable state leaks");
  } else {
    console.log(`⚠️  Found ${violations.length} violation(s):\n`);

    violations.forEach((v, i) => {
      console.log(`${i + 1}. ${v.type}`);
      console.log(`   File: ${v.file}:${v.line}`);
      console.log(`   ${v.description}\n`);
    });

    console.log("=== Summary ===");
    console.log(`Total violations: ${violations.length}`);
    console.log("\nPlease fix these violations to ensure engine determinism and correctness.");
  }

  process.exit(violations.length > 0 ? 1 : 0);
}

if (import.meta.main) {
  main();
}
