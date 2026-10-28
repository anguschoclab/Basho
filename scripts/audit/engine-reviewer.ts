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

const ENGINE_DIR = join(__dirname, "../../src/engine");

/** Strip string/comment contents so they don't trigger heuristic checks. */
function stripLiteralAndComments(raw: string): string {
  return raw
    .replace(/"(?:\\.|[^"\\])*"/g, '""')
    .replace(/'(?:\\.|[^'\\])*'/g, "''")
    .replace(/`(?:\\.|[^`\\])*`/g, "``")
    .replace(/\/\/.*/, "");
}

function pushViolation(
  violations: Violation[],
  filePath: string,
  lineNum: number,
  type: string,
  description: string
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
      pushViolation(
        violations,
        filePath,
        lineNum,
        "RNG Convention Breach",
        "Math.random() used - must use rngForWorld(), rngFromSeed(), or new SeededRNG()"
      );
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
          : "tickWeekEconomics() is deprecated"
      );
    }

    // Check 3: Incorrect generateGovernanceHeadline call signature
    if (/\bgenerateGovernanceHeadline\(/.test(line) && !line.includes("{")) {
      pushViolation(
        violations,
        filePath,
        lineNum,
        "Incorrect Call Signature",
        "generateGovernanceHeadline must use named-arg object, not positional arguments"
      );
    }

    // Check 4: BardEngine token mismatches
    if (/(%HEYA_NAME%|%HEYA%)/.test(line)) {
      pushViolation(
        violations,
        filePath,
        lineNum,
        "BardEngine Token Mismatch",
        "Token mismatch detected - check BardEngine token conventions"
      );
    }

    // @world-builder annotation marks intentional world mutations (world
    // creation, lazy init); shared by Check 5 and Check 6 below.
    const hasWorldBuilderAnnotation = rawLine.includes("@world-builder");

    // Check 5: Uuid-label-collision candidates (V14-R01). Seeded-RNG labels
    // that repeat within one world lifetime mint colliding ids/streams. Flag
    // labels that are constant literals (no discriminator at all) or that
    // interpolate ONLY the year — per-tick calls need a day/week/entity
    // discriminator. `// @rng-fixed` marks an intentional constant label.
    if (
      !hasWorldBuilderAnnotation &&
      !rawLine.includes("@rng-fixed") &&
      /\b(rngFromSeed|rngForWorld|getSystemRNG)\s*\(/.test(line)
    ) {
      const callMatch = line.match(/\b(?:rngFromSeed|rngForWorld|getSystemRNG)\s*\(([^)]*)\)/);
      const args = callMatch?.[1] ?? "";
      const parts = args.split(",");
      const labelArg = parts.length >= 3 ? parts.slice(2).join(",").trim() : parts[1]?.trim() ?? "";
      const isConstantLabel = /^(""|''|``|"[^"]*"|'[^']*'|`[^`$]*`)$/.test(labelArg);
      const yearOnlyLabel =
        /`[^`]*\$\{[^}]*\byear\b[^}]*\}[^`]*`/.test(labelArg) &&
        !/\$\{[^}]*\b(day|week|dayIndexGlobal|id|heyaId|rikishiId|index|i\b|count|n\b)\b[^}]*\}/.test(
          labelArg
        );
      if (isConstantLabel) {
        pushViolation(
          violations,
          filePath,
          lineNum,
          "RNG Label Collision Risk",
          "Seeded-RNG label is a constant with no discriminator — repeats mint colliding ids. Add a day/week/entity discriminator or mark intentional with // @rng-fixed"
        );
      } else if (yearOnlyLabel) {
        pushViolation(
          violations,
          filePath,
          lineNum,
          "RNG Label Collision Risk",
          "Seeded-RNG label is year-scoped only — calls more than once per year collide. Add a day/week/entity discriminator or mark intentional with // @rng-fixed"
        );
      }
    }

    // Check 6: Potential mutable state leaks
    // We look for actual assignment or mutating method calls on a world.* member,
    // not comparisons, destructuring, or safe reads.
    const hasWorldMutation =
      /\bworld\.[A-Za-z_$][\w$]*(?:\[[^\]]+\])?\s*(?:(?:\+|-|\*|\/)?|\*\*|%)?=(?![=>])/.test(
        line
      ) ||
      /\bworld\.[A-Za-z_$][\w$]*(?:\[[^\]]+\])?\.(?:push|delete|splice|set|shift|unshift|pop|sort|reverse)\s*\(/.test(
        line
      );

    if (
      hasWorldMutation &&
      !hasWorldBuilderAnnotation &&
      !line.includes("structuredClone") &&
      !line.includes("builder") &&
      !line.includes("updateWorldField")
    ) {
      pushViolation(
        violations,
        filePath,
        lineNum,
        "Potential Mutable State Leak",
        "Direct mutation of world state - consider using structuredClone or ImpactBuilder"
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
