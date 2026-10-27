/**
 * designScan.ts
 * =============
 * Mechanical design-bible violation scan, shared between:
 *   - CLI inventory output (bun scripts/designScan.ts -> docs/audit/design-violations.csv)
 *   - the future src/tests/unit/audit/designBible.test.ts gate
 *
 * Each rule is a named RegExp scan over production source lines. Rules map to
 * design-bible sections; severity drives Phase 5 fix ordering.
 */

import { readdirSync, statSync, readFileSync } from "fs";
import { join, relative, extname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const ROOT = join(__filename, "..", "..", "..");
const SRC = join(ROOT, "src");

export interface DesignViolation {
  file: string;
  line: number;
  rule: string;
  severity: "P0" | "P1" | "P2";
  bibleRef: string;
  snippet: string;
}

interface Rule {
  id: string;
  severity: "P0" | "P1" | "P2";
  bibleRef: string;
  pattern: RegExp;
  /** scopes: which top-level src dirs the rule applies to */
  scopes: string[];
  /** skip lines matching this (comments, allowlists) */
  skip?: RegExp;
  /** file paths exempt from this rule (relative-path regex, e.g. canvas literal palette) */
  exempt?: RegExp;
  /** additional pattern that must appear within lookaheadSpan lines (incl. this line) */
  lookahead?: RegExp;
  /** how many lines ahead the lookahead may match */
  lookaheadSpan?: number;
}

const RULES: Rule[] = [
  {
    id: "hex-color",
    severity: "P0",
    bibleRef: "§1.1 colors — tokens only",
    pattern: /#[0-9a-fA-F]{3,8}\b/,
    scopes: ["pages", "components", "contexts", "hooks", "presenters"],
    skip: /^\s*(\/\/|\*|text-\[10px)/,
  },
  {
    id: "rgb-color",
    severity: "P0",
    bibleRef: "§1.1 colors — tokens only",
    pattern: /\brgba?\s*\(/,
    scopes: ["pages", "components", "contexts", "hooks", "presenters"],
    skip: /^\s*(\/\/|\*)|rgba?\(\s*var\(--/,
  },
  {
    id: "banned-gradient",
    severity: "P0",
    bibleRef: "§1.3/§3.3 anti-patterns — no decorative gradients",
    pattern:
      /bg-gradient|from-(purple|violet|fuchsia|indigo-5)|via-(purple|violet|fuchsia)|to-(purple|violet|fuchsia)/,
    scopes: ["pages", "components", "contexts", "hooks", "presenters"],
  },
  {
    id: "glassmorphism",
    severity: "P1",
    bibleRef: "§3.3 anti-patterns — no glassmorphism",
    pattern: /backdrop-blur|bg-white\/[0-9]|bg-black\/[0-9].*blur/,
    scopes: ["pages", "components", "contexts"],
  },
  {
    id: "banned-font",
    severity: "P0",
    bibleRef: "§2.1 typography — Shippori/Spectral/JetBrains only",
    pattern: /font-sans\b|\bInter\b|\bRoboto\b|system-ui|ui-sans/,
    scopes: ["pages", "components", "contexts", "hooks"],
    skip: /font-serif-jp|font-display|font-body|font-mono|import |require\(/,
  },
  {
    id: "hardcoded-palette",
    severity: "P0",
    bibleRef: "§1.1 colors — tokens only, no raw palette classes",
    pattern:
      /\b(?:text|bg|border|ring|fill|stroke|from|via|to)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d/,
    scopes: ["pages", "components", "contexts"],
  },
  {
    id: "italic-numerals",
    severity: "P2",
    bibleRef: "§2.3 data display — numerals never italic",
    // italic class on this line + numeric/rank content within 3 lines
    pattern: /italic/,
    lookahead:
      /\{[^}]*\b(record|wins|losses|score|rank|rankLabel|count|total|avg|points|streak)\b[^}]*\}|font-mono/,
    lookaheadSpan: 3,
    scopes: ["pages", "components"],
  },
  {
    id: "oversized-tracking",
    severity: "P2",
    bibleRef: "§2.2 tracking ≤0.15em",
    pattern: /tracking-\[(0\.(1[6-9]|[2-9])\d*em|[1-9]\d*em|[0-9.]+px)\]/,
    scopes: ["pages", "components"],
  },
  {
    id: "arbitrary-text-size",
    severity: "P1",
    bibleRef: "§2.2 type scale — no arbitrary px sizes",
    pattern: /text-\[(?!10px|11px|12px)\d+(\.\d+)?px\]/,
    scopes: ["pages", "components"],
  },
  {
    id: "generic-pill",
    severity: "P2",
    bibleRef: "§5.x components — no generic pills",
    pattern: /rounded-full.*(badge|status|chip)|badge.*rounded-full/i,
    scopes: ["pages", "components"],
  },
  {
    id: "screaming-copy",
    severity: "P2",
    bibleRef: "§11 writing style — no SCREAMING_SNAKE display copy",
    // requires an underscore — single uppercase words (eyebrows, badges) are the
    // sanctioned mono style; SECTOR_ALPHA-style snake tokens are the violation
    pattern: /["'`>][A-Z][A-Z_]{2,}_[A-Z_]*[A-Z]["'<`]/,
    scopes: ["pages", "components"],
    skip: /import|from |require\(|const |className=|data-testid|key=|id=|type:|sendCommand|command|_SIM|_CMD|aria-|role=|includes\(|===|!==|filterTypes|startsWith|endsWith|\.test\(|match\(/,
  },
  {
    id: "hardcoded-hsl",
    severity: "P0",
    bibleRef: "§2 colors — tokens only, no hardcoded HSL",
    // hsl(222 32% 5%) is a violation; hsl(var(--gold) / 0.4) is not.
    pattern: /\bhsl\(\s*(?!var\s*\()\d/,
    scopes: ["pages", "components", "contexts", "hooks", "presenters", "constants"],
    skip: /^\s*(\/\/|\/\*|\*)/,
    // drawingPalette is the sanctioned single source of canvas/SVG literals
    exempt: /constants\/ui\/drawingPalette\.ts$/,
  },
  {
    id: "raw-white-black",
    severity: "P0",
    bibleRef: "§2 colors — tokens only, no raw white/black utilities",
    // text-white, bg-black/80, border-white/20, from-black, ring-white/10, etc.
    pattern:
      /\b(?:text|bg|border|ring|fill|stroke|divide|placeholder|accent|caret|shadow|outline|decoration|from|via|to)-(?:white|black)(?:\/\d+)?\b/,
    scopes: ["pages", "components", "contexts"],
    skip: /^\s*(\/\/|\/\*|\*)/,
  },
  {
    id: "rgba-shadow",
    severity: "P1",
    bibleRef: "§2 colors — tokens only, no raw rgb()/rgba() shadows",
    // no \b — arbitrary classes like shadow-[..._rgba(0,0,0,.5)] are preceded by "_"
    pattern: /[^a-zA-Z]rgba?\(\s*\d|\brgba?\(\s*\d/,
    scopes: ["pages", "components", "contexts", "hooks", "presenters", "constants"],
    skip: /^\s*(\/\/|\/\*|\*)/,
    exempt: /constants\/ui\/drawingPalette\.ts$/,
  },
  {
    id: "inline-oversized-tracking",
    severity: "P2",
    bibleRef: "§3.3 tracking ≤0.15em",
    // letterSpacing: "0.18em" / letterSpacing="0.2em" / letterSpacing: "1em"
    pattern: /letterSpacing\s*[:=]\s*["'`](?:0?\.(?:1[6-9]|[2-9])|[1-9])\d*em["'`]/,
    scopes: ["pages", "components"],
    skip: /^\s*(\/\/|\/\*|\*)/,
  },
  {
    id: "cosplay-copy",
    severity: "P2",
    bibleRef: "§11 writing style — no HUD-cosplay institutional language",
    pattern:
      /\b(?:Control Center|CONTROL CENTER|Institutional Interface|Institutional Grade|Scout Intel|Scouting Intelligence|intelligence network|Intel requested|Perception Intel|COMMAND CENTER)\b/,
    scopes: ["pages", "components", "constants", "hooks"],
    skip: /^\s*(\/\/|\/\*|\*)|import |from |require\(|templatePath/,
  },
];

// ─── Walk ────────────────────────────────────────────────────────────────────

function* walk(dir: string): Generator<string> {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (e === "node_modules" || e === "tests") continue;
      yield* walk(p);
    } else if (st.isFile()) {
      const ext = extname(p);
      if ((ext === ".ts" || ext === ".tsx") && !e.includes(".test.")) yield p;
    }
  }
}

export function scanDesignViolations(): DesignViolation[] {
  const out: DesignViolation[] = [];
  for (const file of walk(SRC)) {
    const rel = relative(ROOT, file);
    const top = rel.split("/")[1]; // src/<top>/...
    const src = readFileSync(file, "utf8");
    const lines = src.split("\n");
    for (const rule of RULES) {
      if (!rule.scopes.includes(top)) continue;
      if (rule.exempt?.test(rel)) continue;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!rule.pattern.test(line)) continue;
        if (rule.skip?.test(line)) continue;
        if (rule.lookahead) {
          const window = lines.slice(i, i + (rule.lookaheadSpan ?? 1)).join(" ");
          if (!rule.lookahead.test(window)) continue;
        }
        out.push({
          file: rel,
          line: i + 1,
          rule: rule.id,
          severity: rule.severity,
          bibleRef: rule.bibleRef,
          snippet: line.trim().slice(0, 120),
        });
      }
    }
  }
  return out;
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const violations = scanDesignViolations();
  const escapeCsv = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const csv = [
    "file,line,rule,severity,bibleRef,snippet",
    ...violations.map(
      (v) =>
        `${v.file},${v.line},${v.rule},${v.severity},${escapeCsv(v.bibleRef)},${escapeCsv(v.snippet)}`
    ),
  ].join("\n");
  const out = join(ROOT, "docs", "audit", "design-violations.csv");
  const { mkdirSync, writeFileSync } = await import("fs");
  mkdirSync(join(out, ".."), { recursive: true });
  writeFileSync(out, csv + "\n");
  const counts = new Map<string, number>();
  for (const v of violations) counts.set(v.rule, (counts.get(v.rule) ?? 0) + 1);
  console.log(
    `${violations.length} violations across ${new Set(violations.map((v) => v.file)).size} files`
  );
  for (const [r, n] of [...counts].sort()) console.log(`  ${r}: ${n}`);
}
