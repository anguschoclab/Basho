/**
 * analyzeNarrativeDeps.ts — analysis tool for the boutNarrative pipeline split.
 * For each beat block (line ranges, comment-marked), reports:
 *   - declared-at-block-top names (candidates for cross-beat pipeline fields)
 *   - free identifiers not declared in the block (deps from outer scope)
 * Usage: bun scripts/analyzeNarrativeDeps.ts
 */
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { join } from "path";
import ts from "typescript";

const ROOT = join(fileURLToPath(import.meta.url), "..", "..");
const FILE = join(ROOT, "src/engine/bout/boutNarrative.ts");
const lines = readFileSync(FILE, "utf8").split("\n");

// Beat boundaries: [name, startLine(1-based), endLine inclusive]
const BEATS: Array<[string, number, number]> = [
  ["beatOpeningVenue", 212, 223],
  ["beatDynasty", 224, 242],
  ["beatDramaOpening", 243, 255],
  ["beatRivalryContext", 256, 382],
  ["beatStreakCallout", 383, 404],
  ["sectionPreBout", 405, 412],
  ["beatCurrentRecords", 413, 454],
  ["beatPrevBashoRecord", 455, 524],
  ["beatCareerHighRank", 525, 551],
  ["beatStoryline", 552, 581],
  ["beatSevenSeven", 582, 595],
  ["beatShikonaConferred", 596, 609],
  ["beatRookieTourneyCount", 610, 656],
  ["beatH2HStreak", 657, 674],
  ["beatInjuryMention", 675, 702],
  ["beatInjuryRecovery", 703, 727],
  ["beatOzekiDemotionComeback", 728, 741],
  ["beatSonOfStablemaster", 742, 755],
  ["beatPhysicalComparison", 756, 775],
  ["beatStyleDescription", 776, 793],
  ["beatBodyType", 794, 807],
  ["beatHeyaStyle", 808, 830],
  ["beatArchetypeEvolution", 831, 850],
  ["beatArchetypeCounter", 851, 866],
  ["beatAgeNarrative", 867, 888],
  ["beatVeterans", 889, 902],
  ["beatCareerWinMilestone", 903, 918],
  ["beatCareerBoutMilestone", 919, 937],
  ["beatConsecutiveKachi", 938, 954],
  ["beatKadobanaMention", 955, 970],
  ["beatOzekiReturn", 971, 989],
  ["beatYokozunaPromotion", 990, 1003],
  ["beatSpoiler", 1004, 1036],
  ["beatCareerPhase", 1037, 1059],
  ["beatRankDebut", 1060, 1097],
  ["beatHometown", 1098, 1115],
  ["beatBirthday", 1116, 1135],
  ["beatWinlessFirstWin", 1136, 1183],
  ["beatTournamentDay", 1184, 1252],
  ["beatTitleStakes", 1253, 1267],
  ["beatLeaderboard", 1268, 1306],
  ["beatPlayoffImplications", 1307, 1334],
  ["beatKenshoMention", 1335, 1349],
  ["beatBoutOfTheDay", 1350, 1368],
  ["beatRingEntrances", 1369, 1402],
  ["narrateFrames", 1403, 1835],
  ["beatFinishTechnique", 1837, 1857],
  ["beatSpecialAwards", 1858, 1871],
  ["beatCeremony", 1872, 1892],
  ["beatClosingLine", 1893, 1913],
  ["sectionPostBout", 1914, 1918],
  ["beatPostBoutReaction", 1919, 1931],
  ["beatPostBoutRecords", 1932, 1958],
  ["beatBothEven", 1959, 1975],
  ["beatPostBoutCareerImpact", 1976, 2010],
  ["beatPostBoutBoutMilestone", 2011, 2029],
  ["beatPostBoutKachi", 2030, 2096],
  ["beatPostBoutYushoRace", 2097, 2109],
  ["beatPostBoutLeaderboard", 2110, 2169],
  ["beatPostBoutStoryline", 2170, 2246],
  ["beatPostBoutUpset", 2247, 2262],
  ["beatComebackWin", 2263, 2282],
  ["beatPostBoutRivalry", 2283, 2326],
  ["beatKenshoEconomic", 2327, 2340],
  ["beatAgeDecline", 2341, 2386],
  ["beatPostBoutInjury", 2387, 2419],
  ["beatMomentumScore", 2420, 2437],
  ["beatMonoii", 2438, 2527],
  ["beatReplayHighlight", 2528, 2569],
  ["beatInterview", 2570, 2807],
];

// Pipeline candidate fields (outer-scope names the beats may consume)
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
]);

function analyze(blockText: string): { declared: Set<string>; free: Set<string> } {
  const wrapped = `function __f(__p:any){\n${blockText}\n}`;
  const sf = ts.createSourceFile(
    "block.ts",
    wrapped,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );
  const declared = new Set<string>();
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
    // declarations bind names
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
    else if (ts.isImportSpecifier(node)) bound.add(node.name.text);
    else if (ts.isEnumMember(node) && ts.isIdentifier(node.name)) bound.add(node.name.text);
    else if (ts.isTypeParameterDeclaration(node)) bound.add(node.name.text);

    // identifier usage (skip property names after '.' and property keys/literals)
    if (ts.isIdentifier(node)) {
      const p = node.parent;
      const isPropName =
        (ts.isPropertyAccessExpression(p) && p.name === node) ||
        (ts.isPropertyAssignment(p) && p.name === node) ||
        (ts.isPropertySignature(p) && p.name === node) ||
        (ts.isMethodSignature(p) && p.name === node) ||
        (ts.isShorthandPropertyAssignment(p) === false &&
        ts.isPropertyAssignment(p) &&
        p.initializer === node
          ? false
          : false);
      if (!isPropName) used.add(node.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);

  // declared = names bound by statements at the BLOCK's top-level function body
  const body = (sf.statements[0] as ts.FunctionDeclaration).body;
  if (body) {
    for (const stmt of body.statements) {
      if (ts.isVariableStatement(stmt)) {
        for (const d of stmt.declarationList.declarations) {
          const names: string[] = [];
          const walk = (n: ts.BindingName) => {
            if (ts.isIdentifier(n)) names.push(n.text);
            else
              ts.forEachChild(n, (c) => {
                if (ts.isBindingElement(c)) walk(c.name);
              });
          };
          walk(d.name);
          names.forEach((n) => declared.add(n));
        }
      }
      if (ts.isFunctionDeclaration(stmt) && stmt.name) declared.add(stmt.name.text);
    }
  }

  const free = new Set([...used].filter((u) => !bound.has(u) && !/^["'`]/.test(u)));
  return { declared, free };
}

// Outer-scope names visible in the file (imports + top-level fns + types are
// irrelevant — we only care about identifiers that came from the FUNCTION's
// outer params/locals, i.e. not importable).
const IMPORTABLE = new Set([
  "BardEngine",
  "RivalryService",
  "BloodlineService",
  "rngFromSeed",
  "BASHO_DAYS",
  "KACHI_KOSHI_WINS",
  "Math",
  "Object",
  "Array",
  "JSON",
  "Number",
  "String",
  "Boolean",
  "Promise",
  "Map",
  "Set",
  "console",
  "undefined",
  "recordKimariteOutcome",
  "getIntensity",
  "PbpLine",
  "PbpPhase",
  "PbpTag",
  "buildNarrativeContext",
  "focusBiasToStyleKey",
  "isSanyakuPromotionByRank",
  "SANYAKU_RANKS",
  "INTENSITY_DRAMATIC",
  "INTENSITY_UNDERSTATED",
  "INTERIM_DAYS",
  "BASHO_NAMES",
  "countMakuuchiTournaments",
  "SeededRNG",
]);

console.log("beat | top-level decls | free (pipeline deps marked *)");
const crossBeatDecls = new Map<string, string[]>();
for (const [name, s, e] of BEATS) {
  const text = lines.slice(s - 1, e).join("\n");
  const { declared, free } = analyze(text);
  const deps = [...free].filter((f) => !IMPORTABLE.has(f));
  const pipeDeps = deps.filter((d) => PIPELINE.has(d));
  const otherDeps = deps.filter((d) => !PIPELINE.has(d));
  console.log(`\n${name} [${s}-${e}]`);
  if (declared.size) console.log(`  declares: ${[...declared].join(", ")}`);
  if (pipeDeps.length) console.log(`  deps: ${pipeDeps.join(", ")}`);
  if (otherDeps.length) {
    console.log(`  CROSS-BEAT/unknown: ${otherDeps.join(", ")}`);
    for (const d of otherDeps) {
      const arr = crossBeatDecls.get(d) ?? [];
      arr.push(name);
      crossBeatDecls.set(d, arr);
    }
  }
}
console.log("\n=== cross-beat deps summary ===");
for (const [d, beats] of crossBeatDecls) console.log(`  ${d}: needed by ${beats.join(", ")}`);
