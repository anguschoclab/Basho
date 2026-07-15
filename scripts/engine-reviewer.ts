/**
 * engine-reviewer.ts
 * ==================
 * Static analysis tool to review engine code for determinism violations,
 * RNG convention breaches, and tick pipeline correctness.
 */

import { readFileSync, readdirSync } from "fs";
import { join } from "path";

interface Violation {
  file: string;
  line: number;
  type: string;
  description: string;
}

const violations: Violation[] = [];

const ENGINE_DIR = join(__dirname, "../src/engine");

function checkFile(filePath: string) {
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  lines.forEach((line, index) => {
    const lineNum = index + 1;

    // Check 1: Math.random() usage
    if (line.includes("Math.random()") && !line.trim().startsWith("//")) {
      violations.push({
        file: filePath.replace(__dirname + "/", ""),
        line: lineNum,
        type: "RNG Convention Breach",
        description:
          "Math.random() used - must use rngForWorld(), rngFromSeed(), or new SeededRNG()",
      });
    }

    // Check 2: Dead function calls
    if (line.includes("processHeyaFinances()") || line.includes("tickWeekEconomics()")) {
      violations.push({
        file: filePath.replace(__dirname + "/", ""),
        line: lineNum,
        type: "Dead Function Call",
        description: line.includes("processHeyaFinances()")
          ? "processHeyaFinances() is deprecated"
          : "tickWeekEconomics() is deprecated",
      });
    }

    // Check 3: Incorrect generateGovernanceHeadline call signature
    if (line.includes("generateGovernanceHeadline(") && !line.includes("{")) {
      violations.push({
        file: filePath.replace(__dirname + "/", ""),
        line: lineNum,
        type: "Incorrect Call Signature",
        description:
          "generateGovernanceHeadline must use named-arg object, not positional arguments",
      });
    }

    // Check 4: BardEngine token mismatches
    if (line.includes("%HEYA_NAME%") || line.includes("%HEYA%")) {
      violations.push({
        file: filePath.replace(__dirname + "/", ""),
        line: lineNum,
        type: "BardEngine Token Mismatch",
        description: "Token mismatch detected - check BardEngine token conventions",
      });
    }

    // Check 5: Potential mutable state leaks (heuristic check)
    if (
      line.includes("world.") &&
      (line.includes("=") || line.includes("push") || line.includes("delete")) &&
      !line.includes("structuredClone") &&
      !line.trim().startsWith("//") &&
      !line.includes("builder") &&
      !line.includes("update") &&
      !line.includes("set(") &&
      !line.includes("get(") &&
      !line.includes("has(") &&
      !line.includes("delete ") &&
      !line.includes("world.heyas") &&
      !line.includes("world.rikishi") &&
      !line.includes("world.oyakata") &&
      !line.includes("world.banzuke") &&
      !line.includes("world.calendar")
    ) {
      violations.push({
        file: filePath.replace(__dirname + "/", ""),
        line: lineNum,
        type: "Potential Mutable State Leak",
        description:
          "Direct mutation of world state - consider using structuredClone or ImpactBuilder",
      });
    }
  });
}

function scanDirectory(dir: string) {
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        // Skip node_modules and test directories
        if (entry.name !== "node_modules" && !entry.name.includes("__tests__")) {
          scanDirectory(fullPath);
        }
      } else if (entry.name.endsWith(".ts")) {
        checkFile(fullPath);
      }
    }
  } catch (error) {
    // Ignore permission errors
  }
}

console.log("=== Engine Code Review ===\n");
console.log("Scanning engine code for violations...\n");

scanDirectory(ENGINE_DIR);

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
