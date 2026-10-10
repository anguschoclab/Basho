/**
 * emitNarrativeModules.ts — codemod for the boutNarrative pipeline split.
 *
 * Emits src/engine/bout/narrative/*.ts beat modules. Each beat function:
 *   function beatName(p: PbpPipeline): void { const {deps...} = p; <verbatim body> }
 *
 * Hoisted cross-beat locals are stripped from beat bodies (they live in
 * buildPipeline in pipeline.ts, which is hand-written).
 *
 * Usage: bun scripts/emitNarrativeModules.ts
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import { join } from "path";
import ts from "typescript";

const ROOT = join(fileURLToPath(import.meta.url), "..", "..");
const SRC_FILE = join(ROOT, "src/engine/bout/boutNarrative.ts");
const OUT_DIR = join(ROOT, "src/engine/bout/narrative");
const source = readFileSync(SRC_FILE, "utf8");
const lines = source.split("\n");

// ─── Beat table: name, module, startLine, endLine(1-based, exclusive end = next start)
const BEATS: Array<{ name: string; mod: string; start: number; end: number }> = [
  { name: "beatOpeningVenue", mod: "prelude", start: 212, end: 223 },
  { name: "beatDynasty", mod: "prelude", start: 224, end: 242 },
  { name: "beatDramaOpening", mod: "prelude", start: 243, end: 255 },
  { name: "beatRivalryContext", mod: "prelude", start: 256, end: 382 },
  { name: "beatStreakCallout", mod: "prelude", start: 383, end: 404 },
  { name: "beatCurrentRecords", mod: "context", start: 413, end: 454 },
  { name: "beatPrevBashoRecord", mod: "context", start: 455, end: 524 },
  { name: "beatCareerHighRank", mod: "context", start: 525, end: 551 },
  { name: "beatStoryline", mod: "context", start: 552, end: 581 },
  { name: "beatSevenSeven", mod: "context", start: 582, end: 595 },
  { name: "beatShikonaConferred", mod: "context", start: 596, end: 609 },
  { name: "beatRookieTourneyCount", mod: "context", start: 610, end: 656 },
  { name: "beatH2HStreak", mod: "context", start: 657, end: 674 },
  { name: "beatInjuryMention", mod: "context", start: 675, end: 702 },
  { name: "beatInjuryRecovery", mod: "context", start: 703, end: 727 },
  { name: "beatOzekiDemotionComeback", mod: "context", start: 728, end: 741 },
  { name: "beatSonOfStablemaster", mod: "context", start: 742, end: 755 },
  { name: "beatPhysicalComparison", mod: "context", start: 756, end: 775 },
  { name: "beatStyleDescription", mod: "context", start: 776, end: 793 },
  { name: "beatBodyType", mod: "context2", start: 794, end: 807 },
  { name: "beatHeyaStyle", mod: "context2", start: 808, end: 830 },
  { name: "beatArchetypeEvolution", mod: "context2", start: 831, end: 850 },
  { name: "beatArchetypeCounter", mod: "context2", start: 851, end: 866 },
  { name: "beatAgeNarrative", mod: "context2", start: 867, end: 888 },
  { name: "beatVeterans", mod: "context2", start: 889, end: 902 },
  { name: "beatCareerWinMilestone", mod: "context2", start: 903, end: 918 },
  { name: "beatCareerBoutMilestone", mod: "context2", start: 919, end: 937 },
  { name: "beatConsecutiveKachi", mod: "context2", start: 938, end: 954 },
  { name: "beatKadobanMention", mod: "context2", start: 955, end: 970 },
  { name: "beatOzekiReturn", mod: "context2", start: 971, end: 989 },
  { name: "beatYokozunaPromotion", mod: "context2", start: 990, end: 1003 },
  { name: "beatSpoiler", mod: "context2", start: 1004, end: 1036 },
  { name: "beatCareerPhase", mod: "context2", start: 1037, end: 1059 },
  { name: "beatRankDebut", mod: "context2", start: 1060, end: 1097 },
  { name: "beatHometown", mod: "stakes", start: 1098, end: 1115 },
  { name: "beatBirthday", mod: "stakes", start: 1116, end: 1135 },
  { name: "beatWinlessFirstWin", mod: "stakes", start: 1136, end: 1183 },
  { name: "beatTournamentDay", mod: "stakes", start: 1184, end: 1252 },
  { name: "beatTitleStakes", mod: "stakes", start: 1253, end: 1267 },
  { name: "beatLeaderboard", mod: "stakes", start: 1268, end: 1306 },
  { name: "beatPlayoffImplications", mod: "stakes", start: 1307, end: 1334 },
  { name: "beatKenshoMention", mod: "stakes", start: 1335, end: 1349 },
  { name: "beatBoutOfTheDay", mod: "stakes", start: 1350, end: 1368 },
  { name: "beatRingEntrances", mod: "ceremony", start: 1369, end: 1402 },
  { name: "narrateFrames", mod: "frames", start: 1403, end: 1835 },
  { name: "beatFinishTechnique", mod: "resolution", start: 1837, end: 1857 },
  { name: "beatSpecialAwards", mod: "resolution", start: 1858, end: 1871 },
  { name: "beatCeremony", mod: "resolution", start: 1872, end: 1892 },
  { name: "beatClosingLine", mod: "resolution", start: 1893, end: 1913 },
  { name: "beatPostBoutReaction", mod: "postbout", start: 1919, end: 1931 },
  { name: "beatPostBoutRecords", mod: "postbout", start: 1932, end: 1958 },
  { name: "beatBothEven", mod: "postbout", start: 1959, end: 1975 },
  { name: "beatPostBoutCareerImpact", mod: "postbout", start: 1976, end: 2010 },
  { name: "beatPostBoutBoutMilestone", mod: "postbout", start: 2011, end: 2029 },
  { name: "beatPostBoutKachi", mod: "postbout", start: 2030, end: 2096 },
  { name: "beatPostBoutYushoRace", mod: "postbout2", start: 2097, end: 2109 },
  { name: "beatPostBoutLeaderboard", mod: "postbout2", start: 2110, end: 2169 },
  { name: "beatPostBoutStoryline", mod: "postbout2", start: 2170, end: 2246 },
  { name: "beatPostBoutUpset", mod: "postbout2", start: 2247, end: 2262 },
  { name: "beatComebackWin", mod: "postbout2", start: 2263, end: 2282 },
  { name: "beatPostBoutRivalry", mod: "postbout2", start: 2283, end: 2326 },
  { name: "beatKenshoEconomic", mod: "postbout2", start: 2327, end: 2340 },
  { name: "beatAgeDecline", mod: "postbout2", start: 2341, end: 2386 },
  { name: "beatPostBoutInjury", mod: "postbout2", start: 2387, end: 2419 },
  { name: "beatMomentumScore", mod: "postbout2", start: 2420, end: 2437 },
  { name: "beatMonoii", mod: "postbout2", start: 2438, end: 2527 },
  { name: "beatReplayHighlight", mod: "postbout2", start: 2528, end: 2569 },
  { name: "beatInterview", mod: "interview", start: 2570, end: 2807 },
];

// Cross-beat locals hoisted into the pipeline — stripped from beat bodies.
const HOISTED = new Set([
  "rivalryState",
  "rivalryKey",
  "pair",
  "isGrudgeMatch",
  "preBoutRng",
  "postBoutRng",
  "winnerRikishi",
  "loserRikishi",
  "eastWins",
  "eastLosses",
  "westWins",
  "westLosses",
  "winnerWins",
  "winnerLosses",
  "loserWins",
  "loserLosses",
  "eastAge",
  "westAge",
  "bashoInfo",
]);

// Pipeline fields every beat may consume.
const PIPELINE = new Set([
  "push",
  "ctx",
  "rng",
  "intensity",
  "east",
  "west",
  "result",
  "seed",
  "bashoName",
  "day",
  "world",
  "lines",
  ...HOISTED,
]);

// Parse original import block → name -> module specifier
const importMap = new Map<string, string>();
for (const m of source.matchAll(/import\s*(?:type\s*)?\{([^}]+)\}\s*from\s*["']([^"']+)["']/g)) {
  for (const part of m[1].split(",")) {
    const name = part
      .trim()
      .split(/\s+as\s+/)
      .pop()
      ?.trim();
    if (name) importMap.set(name, m[2]);
  }
}
// also capture the import-kind (type vs value) roughly
const typeImports = new Set<string>();
for (const m of source.matchAll(/import\s+type\s*\{([^}]+)\}\s*from\s*["']([^"']+)["']/g)) {
  for (const part of m[1].split(",")) {
    const name = part
      .trim()
      .split(/\s+as\s+/)
      .pop()
      ?.trim();
    if (name) typeImports.add(name);
  }
}

// ─── Identifier analysis (same approach as analyzeNarrativeDeps) ────────────

function analyze(blockText: string): { used: Set<string> } {
  const wrapped = `function __f(__p:any){\n${blockText}\n}`;
  const sf = ts.createSourceFile(
    "block.ts",
    wrapped,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );
  const bound = new Set<string>(["__p", "__f"]);
  const used = new Set<string>();
  const collectBound = (name: ts.BindingName | undefined) => {
    if (!name) return;
    if (ts.isIdentifier(name)) bound.add(name.text);
    else
      ts.forEachChild(name, (n) => {
        if (ts.isBindingElement(n)) collectBound(n.name);
      });
  };
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node)) collectBound(node.name);
    else if (
      ts.isFunctionDeclaration(node) ||
      ts.isFunctionExpression(node) ||
      ts.isArrowFunction(node)
    ) {
      if (ts.isFunctionDeclaration(node) && node.name) bound.add(node.name.text);
      node.parameters.forEach((p) => collectBound(p.name));
    } else if (ts.isParameter(node)) collectBound(node.name);
    else if (ts.isCatchClause(node) && node.variableDeclaration)
      collectBound(node.variableDeclaration.name);
    else if (ts.isClassDeclaration(node) && node.name) bound.add(node.name.text);
    if (ts.isIdentifier(node)) {
      const p = node.parent;
      const isPropName =
        (ts.isPropertyAccessExpression(p) && p.name === node) ||
        (ts.isPropertyAssignment(p) && p.name === node) ||
        (ts.isPropertySignature(p) && p.name === node) ||
        (ts.isMethodSignature(p) && p.name === node);
      if (!isPropName) used.add(node.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return { used: new Set([...used].filter((u) => !bound.has(u))) };
}

// strip single-line `const NAME = ...;` statements for hoisted names
function stripHoisted(text: string): string {
  for (const name of HOISTED) {
    const re = new RegExp(`\\n[ \\t]*const ${name}\\s*=[^\\n]*\\n`, "g");
    text = text.replace(re, "\n");
  }
  return text;
}

const MODULES = new Map<string, string[]>();
const MODULE_IMPORTS = new Map<string, Set<string>>();

for (const beat of BEATS) {
  let body = lines.slice(beat.start - 1, beat.end).join("\n");
  body = stripHoisted(body);
  const { used } = analyze(body);
  const deps = [...used].filter((u) => PIPELINE.has(u)).sort();
  const external = [...used].filter((u) => !PIPELINE.has(u) && importMap.has(u));

  const destructure = deps.length ? `  const { ${deps.join(", ")} } = p;\n` : "";
  const fn = `\nfunction ${beat.name}(p: PbpPipeline): void {\n${destructure}${body}\n}\n`;

  if (!MODULES.has(beat.mod)) MODULES.set(beat.mod, []);
  const modList = MODULES.get(beat.mod);
  if (modList) modList.push(fn);

  if (!MODULE_IMPORTS.has(beat.mod)) MODULE_IMPORTS.set(beat.mod, new Set());
  const modImports = MODULE_IMPORTS.get(beat.mod);
  for (const e of external) modImports?.add(e);
}

mkdirSync(OUT_DIR, { recursive: true });
for (const [mod, fns] of MODULES) {
  const imports = MODULE_IMPORTS.get(mod) ?? new Set<string>();
  // group by specifier
  const bySpec = new Map<string, { names: string[]; isType: boolean }>();
  for (const name of imports) {
    const spec = importMap.get(name);
    if (!spec) continue;
    // adjust relative spec for narrative/ dir depth: ./x -> ../x ; ../x -> ../../x
    const adj = spec.startsWith("./") ? `.${spec}` : spec.startsWith("../") ? `../${spec}` : spec;
    if (!bySpec.has(adj)) bySpec.set(adj, { names: [], isType: typeImports.has(name) });
    const group = bySpec.get(adj);
    if (group) {
      group.names.push(name);
      if (!typeImports.has(name)) group.isType = false;
    }
  }
  const importLines = [...bySpec.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(
      ([spec, { names, isType }]) =>
        `import ${isType ? "type " : ""}{ ${names.sort().join(", ")} } from "${spec}";`
    )
    .join("\n");
  const header = `/**\n * bout/narrative/${mod}.ts — extracted beats from generateBoutNarrative.\n * Code moved verbatim; dependencies arrive via the shared PbpPipeline.\n */\nimport type { PbpPipeline } from "./pipeline";\n${importLines}\n`;
  writeFileSync(join(OUT_DIR, `${mod}.ts`), header + fns.join(""));
  console.log(`wrote narrative/${mod}.ts (${fns.length} beats)`);
}
console.log("\nPipeline deps used (HOISTED):", [...HOISTED].join(", "));
