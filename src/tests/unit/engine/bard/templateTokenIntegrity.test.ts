import { describe, it, expect, beforeAll } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join, basename } from "node:path";
import ts from "typescript";
import { BardEngine } from "@/engine/bard/BardEngine";
import { rngFromSeed } from "@/engine/rng";

/**
 * Exhaustive template-integrity sweep.
 *
 * Parses every src/engine/**.ts file with the TypeScript compiler and finds
 * each `BardEngine.resolve(...)` call site, extracting:
 *   - the path expression: literal strings; template literals with resolvable
 *     segments (identifier bindings, parameter literal-unions, Record literal
 *     element access) become concrete candidate paths; unresolved segments
 *     become `[^.]+` wildcards enumerated against the domain leaf index; and
 *   - the context keys the production caller supplies (top-level object-
 *     literal keys; "bag" when the context is a caller-built NarrativeContext).
 *
 * Every resolved path is then exercised across many seeds and asserted:
 *   - resolution never returns an empty/[MISSING:] result,
 *   - no unresolved %TOKEN% leaks into output.
 *
 * Extraction happens at test time, so new/changed call sites are covered
 * automatically. A site the extractor cannot classify fails the sweep instead
 * of silently dropping coverage.
 */

const ENGINE_DIR = join(__dirname, "../../../../engine");
const DOMAINS_DIR = join(ENGINE_DIR, "bard/domains");

// ---------------------------------------------------------------------------
// Domain leaf enumeration
// ---------------------------------------------------------------------------

function collectLeaves(domain: string, node: unknown, parts: string[], out: Set<string>): void {
  if (Array.isArray(node)) {
    if (node.some((e) => typeof e === "string")) out.add(`${domain}.${parts.join(".")}`);
    return;
  }
  if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node)) {
      collectLeaves(domain, v, [...parts, k], out);
    }
    return;
  }
  if (typeof node === "string" && parts.length > 0) {
    out.add(`${domain}.${parts.join(".")}`);
  }
}

const ALL_LEAVES = new Set<string>();
for (const file of readdirSync(DOMAINS_DIR).filter((f) => f.endsWith(".json"))) {
  const domain = basename(file, ".json");
  collectLeaves(domain, JSON.parse(readFileSync(join(DOMAINS_DIR, file), "utf-8")), [], ALL_LEAVES);
}

// ---------------------------------------------------------------------------
// Source index (parsed once)
// ---------------------------------------------------------------------------

const sourceFiles: ts.SourceFile[] = [];

function walkDir(dir: string): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "__tests__") walkDir(full);
    } else if (entry.name.endsWith(".ts") && !entry.name.includes(".test.")) {
      sourceFiles.push(
        ts.createSourceFile(full, readFileSync(full, "utf-8"), ts.ScriptTarget.Latest, true)
      );
    }
  }
}
walkDir(ENGINE_DIR);

function forEachNode(root: ts.Node, visit: (n: ts.Node) => void): void {
  visit(root);
  ts.forEachChild(root, (c) => forEachNode(c, visit));
}

/** All string literals in `type X = "a" | "b"` alias declarations across sources. */
function typeUnionLiterals(alias: string): string[] {
  const out: string[] = [];
  for (const sf of sourceFiles) {
    forEachNode(sf, (n) => {
      if (ts.isTypeAliasDeclaration(n) && n.name.text === alias) {
        forEachNode(n.type, (t) => {
          if (ts.isLiteralTypeNode(t) && ts.isStringLiteral(t.literal)) out.push(t.literal.text);
        });
      }
    });
  }
  return out;
}

/**
 * `name: "lit"` / `name: \`tpl\`` property-assignment initializers across all
 * sources — covers named-args call conventions (e.g. `templatePath: "…"`) and
 * config-map entries (e.g. narrativeEventMap `titlePath`/`summaryPath`).
 */
function propertyLiteralValues(name: string): string[] {
  const out: string[] = [];
  for (const sf of sourceFiles) {
    forEachNode(sf, (n) => {
      if (
        ts.isPropertyAssignment(n) &&
        (ts.isIdentifier(n.name) || ts.isStringLiteral(n.name)) &&
        n.name.text === name &&
        ts.isStringLiteral(n.initializer)
      ) {
        out.push(n.initializer.text);
      }
    });
  }
  return out;
}

/** Object literal bound to an identifier (module-level const or local decl). */
function objectLiteralFor(name: string): ts.ObjectLiteralExpression | undefined {
  for (const sf of sourceFiles) {
    let found: ts.ObjectLiteralExpression | undefined;
    forEachNode(sf, (n) => {
      if (
        !found &&
        ts.isVariableDeclaration(n) &&
        ts.isIdentifier(n.name) &&
        n.name.text === name &&
        n.initializer &&
        ts.isObjectLiteralExpression(n.initializer)
      ) {
        found = n.initializer;
      }
    });
    if (found) return found;
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Path-spec extraction
// ---------------------------------------------------------------------------

interface PathSpec {
  /** literal paths written in source — asserted to resolve */
  literals: string[];
  /** paths computed from unions/map values — filtered to existing leaves */
  computed: string[];
  /** wildcard patterns — enumerated against the leaf index */
  patterns: RegExp[];
}

const EMPTY_SPEC: PathSpec = { literals: [], computed: [], patterns: [] };

function mergeSpec(...specs: (PathSpec | undefined)[]): PathSpec {
  const out: PathSpec = { literals: [], computed: [], patterns: [] };
  for (const s of specs) {
    if (!s) continue;
    out.literals.push(...s.literals);
    out.computed.push(...s.computed);
    out.patterns.push(...s.patterns);
  }
  return out;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isFunctionLike(n: ts.Node): boolean {
  return (
    ts.isFunctionDeclaration(n) ||
    ts.isFunctionExpression(n) ||
    ts.isArrowFunction(n) ||
    ts.isMethodDeclaration(n) ||
    ts.isConstructorDeclaration(n) ||
    ts.isGetAccessorDeclaration(n) ||
    ts.isSetAccessorDeclaration(n)
  );
}

function enclosingFunction(node: ts.Node): ts.Node | undefined {
  let cur: ts.Node | undefined = node.parent;
  while (cur) {
    if (isFunctionLike(cur) || ts.isSourceFile(cur)) return cur;
    cur = cur.parent;
  }
  return undefined;
}

function enclosingBlock(node: ts.Node): ts.Node | undefined {
  let cur: ts.Node | undefined = node.parent;
  while (cur) {
    if (ts.isBlock(cur) || ts.isSourceFile(cur) || ts.isCaseClause(cur) || ts.isDefaultClause(cur))
      return cur;
    cur = cur.parent;
  }
  return undefined;
}

function isAncestor(ancestor: ts.Node, node: ts.Node): boolean {
  let cur: ts.Node | undefined = node.parent;
  while (cur) {
    if (cur === ancestor) return true;
    cur = cur.parent;
  }
  return false;
}

/** Union literals from a TypeNode ("a" | "b" | Alias). */
function literalsFromTypeNode(t: ts.TypeNode | undefined): string[] {
  if (!t) return [];
  if (ts.isUnionTypeNode(t)) return t.types.flatMap(literalsFromTypeNode);
  if (ts.isLiteralTypeNode(t) && ts.isStringLiteral(t.literal)) return [t.literal.text];
  if (ts.isParenthesizedTypeNode(t)) return literalsFromTypeNode(t.type);
  if (ts.isTypeReferenceNode(t) && ts.isIdentifier(t.typeName)) {
    return typeUnionLiterals(t.typeName.text);
  }
  return [];
}

/**
 * Literals for `name` when it arrives via a function parameter —
 * either a positional param `name: "a" | "b"`, a destructured prop
 * `({ name }: { name: "a" | "b" })`, or a `const { name } = args` where
 * `args` is a param annotated `{ name: "a" | "b" }`.
 */
function paramUnionLiterals(scope: ts.Node, name: string): string[] {
  let fn = scope;
  while (fn && !isFunctionLike(fn)) fn = fn.parent!;
  if (!fn || !isFunctionLike(fn)) return [];
  for (const p of (fn as ts.FunctionLikeDeclaration).parameters) {
    // positional param
    if (ts.isIdentifier(p.name) && p.name.text === name) {
      const lits = literalsFromTypeNode(p.type);
      if (lits.length) return lits;
    }
    // destructured param: ({ name }: { name: union })
    if (ts.isObjectBindingPattern(p.name)) {
      const elem = p.name.elements.find((e) => ts.isIdentifier(e.name) && e.name.text === name);
      if (elem && p.type && ts.isTypeLiteralNode(p.type)) {
        const member = p.type.members.find(
          (m) =>
            ts.isPropertySignature(m) &&
            (ts.isIdentifier(m.name) || ts.isStringLiteral(m.name)) &&
            m.name.text === name
        ) as ts.PropertySignature | undefined;
        const lits = literalsFromTypeNode(member?.type);
        if (lits.length) return lits;
      }
    }
  }
  return [];
}

/** All string literals inside a map object's property values (any depth). */
function mapValueLiterals(obj: ts.ObjectLiteralExpression, memberName?: string): string[] {
  const out: string[] = [];
  for (const prop of obj.properties) {
    if (!ts.isPropertyAssignment(prop)) continue;
    if (memberName !== undefined) {
      // collect `memberName: "lit"` inside nested entry objects
      forEachNode(prop.initializer, (n) => {
        if (
          ts.isPropertyAssignment(n) &&
          (ts.isIdentifier(n.name) || ts.isStringLiteral(n.name)) &&
          n.name.text === memberName &&
          ts.isStringLiteral(n.initializer)
        ) {
          out.push(n.initializer.text);
        }
      });
    } else if (ts.isStringLiteral(prop.initializer)) {
      out.push(prop.initializer.text);
    }
  }
  return out;
}

function identSpec(name: string, callNode: ts.Node, seen: Set<string>): PathSpec | undefined {
  if (seen.has(name)) return undefined;
  seen.add(name);
  const callStart = callNode.getStart();

  // Walk scope chain looking for the binding.
  let scope = enclosingFunction(callNode);
  while (scope) {
    const decls: ts.VariableDeclaration[] = [];
    const assigns: ts.Expression[] = [];
    forEachNode(scope, (n) => {
      if (n === callNode) return;
      if (n.getStart() >= callStart) return;
      if (
        ts.isVariableDeclaration(n) &&
        ts.isIdentifier(n.name) &&
        n.name.text === name &&
        // the decl's block must contain the call (block-scoped binding)
        isAncestor(enclosingBlock(n)!, callNode)
      ) {
        decls.push(n);
      }
      if (
        ts.isBinaryExpression(n) &&
        n.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
        ts.isIdentifier(n.left) &&
        n.left.text === name &&
        n.getEnd() <= callStart &&
        enclosingFunction(n) === scope
      ) {
        assigns.push(n.right);
      }
    });
    if (decls.length || assigns.length) {
      const spec: PathSpec = { literals: [], computed: [], patterns: [] };
      // nearest decl's initializer
      decls.sort((a, b) => b.getStart() - a.getStart());
      if (decls[0].initializer) {
        const s = exprSpec(decls[0].initializer, callNode, seen);
        mergeInto(spec, s);
      }
      for (const a of assigns) mergeInto(spec, exprSpec(a, callNode, seen));
      if (spec.literals.length || spec.computed.length || spec.patterns.length) return spec;
    }
    // parameter unions / destructured props
    const paramLits = paramUnionLiterals(scope, name);
    if (paramLits.length) return { literals: [], computed: paramLits, patterns: [] };
    scope = enclosingFunction(scope);
  }

  // `const { name } = args` where args is a param with a literal-typed prop
  scope = enclosingFunction(callNode);
  while (scope) {
    let resolved: PathSpec | undefined;
    forEachNode(scope, (n) => {
      if (resolved || n.getStart() >= callStart) return;
      if (
        ts.isVariableDeclaration(n) &&
        ts.isObjectBindingPattern(n.name) &&
        n.name.elements.some((e) => ts.isIdentifier(e.name) && e.name.text === name) &&
        n.initializer &&
        ts.isIdentifier(n.initializer)
      ) {
        resolved = {
          literals: [],
          computed: paramPropLiterals(scope!, n.initializer.text, name),
          patterns: [],
        };
      }
    });
    if (resolved?.computed.length) return resolved;
    scope = enclosingFunction(scope);
  }

  // Named-args convention / config maps: `name: "lit"` anywhere.
  const propLits = propertyLiteralValues(name);
  if (propLits.length) return { literals: [], computed: propLits, patterns: [] };

  return undefined;
}

function paramPropLiterals(scope: ts.Node, paramName: string, propName: string): string[] {
  let fn = scope;
  while (fn && !isFunctionLike(fn)) fn = fn.parent!;
  if (!fn || !isFunctionLike(fn)) return [];
  for (const p of (fn as ts.FunctionLikeDeclaration).parameters) {
    if (
      ts.isIdentifier(p.name) &&
      p.name.text === paramName &&
      p.type &&
      ts.isTypeLiteralNode(p.type)
    ) {
      const member = p.type.members.find(
        (m) =>
          ts.isPropertySignature(m) &&
          (ts.isIdentifier(m.name) || ts.isStringLiteral(m.name)) &&
          m.name.text === propName
      ) as ts.PropertySignature | undefined;
      const lits = literalsFromTypeNode(member?.type);
      if (lits.length) return lits;
    }
  }
  return [];
}

function mergeInto(target: PathSpec, src: PathSpec | undefined): void {
  if (!src) return;
  target.literals.push(...src.literals);
  target.computed.push(...src.computed);
  target.patterns.push(...src.patterns);
}

function exprSpec(expr: ts.Expression, callNode: ts.Node, seen: Set<string>): PathSpec | undefined {
  if (ts.isStringLiteral(expr) || ts.isNoSubstitutionTemplateLiteral(expr)) {
    return { literals: [expr.text], computed: [], patterns: [] };
  }
  if (
    ts.isParenthesizedExpression(expr) ||
    ts.isAsExpression(expr) ||
    ts.isSatisfiesExpression(expr)
  ) {
    return exprSpec(expr.expression, callNode, seen);
  }
  if (
    expr.kind === ts.SyntaxKind.NullKeyword ||
    expr.kind === ts.SyntaxKind.UndefinedKeyword ||
    (ts.isIdentifier(expr) && expr.text === "undefined")
  ) {
    return EMPTY_SPEC; // conditional null branch — no candidate
  }
  if (ts.isConditionalExpression(expr)) {
    return mergeSpec(
      exprSpec(expr.whenTrue, callNode, seen),
      exprSpec(expr.whenFalse, callNode, seen)
    );
  }
  if (ts.isTemplateExpression(expr)) {
    // Try to resolve every span to literal sets → cartesian literals.
    const slotSpecs: (PathSpec | undefined)[] = expr.templateSpans.map((span) =>
      exprSpec(span.expression, callNode, new Set(seen))
    );
    const allResolved = slotSpecs.every(
      (s) => s && s.patterns.length === 0 && s.literals.length + s.computed.length > 0
    );
    if (allResolved) {
      let combos: string[] = [expr.head.text];
      for (let i = 0; i < slotSpecs.length; i++) {
        const vals = [...slotSpecs[i]!.literals, ...slotSpecs[i]!.computed];
        const tail = expr.templateSpans[i].literal.text;
        const next: string[] = [];
        for (const c of combos) for (const v of vals) next.push(c + v + tail);
        combos = next;
      }
      return { literals: [], computed: combos, patterns: [] };
    }
    // Partial substitution into the regex: resolved spans contribute
    // alternations; unresolved spans become [^.]+ wildcards.
    let src = `^${escapeRe(expr.head.text)}`;
    for (let i = 0; i < expr.templateSpans.length; i++) {
      const s = slotSpecs[i];
      const vals = s ? [...s.literals, ...s.computed] : [];
      src += vals.length ? `(?:${vals.map(escapeRe).join("|")})` : `[^.]+`;
      src += escapeRe(expr.templateSpans[i].literal.text);
    }
    return { literals: [], computed: [], patterns: [new RegExp(`${src}$`)] };
  }
  if (ts.isIdentifier(expr)) {
    return identSpec(expr.text, callNode, seen);
  }
  if (ts.isElementAccessExpression(expr)) {
    // `map[key]` — harvest all leaf string literals from the map's object literal.
    const mapExpr = expr.expression;
    if (ts.isIdentifier(mapExpr)) {
      const obj = objectLiteralFor(mapExpr.text);
      if (obj) {
        return { literals: [], computed: mapValueLiterals(obj), patterns: [] };
      }
    }
    return undefined;
  }
  if (ts.isPropertyAccessExpression(expr)) {
    // `x.member` where x = mapExpr[key] → collect `member` values from map entries.
    const obj = expr.expression;
    const member = expr.name.text;
    if (ts.isIdentifier(obj)) {
      // resolve obj's binding for an element access
      const declInit = findDeclInit(obj.text, callNode);
      if (declInit && ts.isElementAccessExpression(declInit)) {
        const mapExpr = declInit.expression;
        if (ts.isIdentifier(mapExpr)) {
          const lit = objectLiteralFor(mapExpr.text);
          if (lit) {
            return { literals: [], computed: mapValueLiterals(lit, member), patterns: [] };
          }
        }
      }
    }
    const lits = propertyLiteralValues(member);
    if (lits.length) return { literals: [], computed: lits, patterns: [] };
    return undefined;
  }
  if (
    ts.isBinaryExpression(expr) &&
    expr.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken
  ) {
    return mergeSpec(exprSpec(expr.left, callNode, seen), exprSpec(expr.right, callNode, seen));
  }
  return undefined;
}

/** Nearest in-scope initializer for an identifier declared before `callNode`. */
function findDeclInit(name: string, callNode: ts.Node): ts.Expression | undefined {
  const callStart = callNode.getStart();
  let scope = enclosingFunction(callNode);
  while (scope) {
    let best: ts.VariableDeclaration | undefined;
    forEachNode(scope, (n) => {
      if (
        ts.isVariableDeclaration(n) &&
        ts.isIdentifier(n.name) &&
        n.name.text === name &&
        n.getStart() < callStart &&
        isAncestor(enclosingBlock(n)!, callNode)
      ) {
        if (!best || n.getStart() > best.getStart()) best = n;
      }
    });
    if (best) return best.initializer;
    scope = enclosingFunction(scope);
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Call-site scan
// ---------------------------------------------------------------------------

interface CallSite {
  spec: PathSpec;
  ctxKeys: string[] | null; // null = caller-built bag context
  loc: string;
}

const callSites: CallSite[] = [];
const unresolvable: string[] = [];

function extractCtxKeys(expr: ts.Expression | undefined): string[] | null {
  if (!expr) return [];
  if (ts.isParenthesizedExpression(expr)) return extractCtxKeys(expr.expression);
  if (!ts.isObjectLiteralExpression(expr)) return null;
  const keys: string[] = [];
  let bag = false;
  for (const prop of expr.properties) {
    if (ts.isSpreadAssignment(prop)) {
      bag = true;
      continue;
    }
    if (ts.isShorthandPropertyAssignment(prop)) {
      keys.push(prop.name.text);
      continue;
    }
    if (ts.isPropertyAssignment(prop)) {
      const n = prop.name;
      if (ts.isIdentifier(n) || ts.isStringLiteral(n) || ts.isNumericLiteral(n)) {
        keys.push(n.text);
      }
    }
  }
  return bag ? null : keys;
}

for (const sf of sourceFiles) {
  forEachNode(sf, (node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.expression.getText(sf) === "BardEngine" &&
      node.expression.name.text === "resolve"
    ) {
      const loc = `${basename(sf.fileName)}:${
        sf.getLineAndCharacterOfPosition(node.getStart()).line + 1
      }`;
      const pathExpr = node.arguments[1];
      if (!pathExpr) return;
      const spec = exprSpec(pathExpr, node, new Set());
      const ctxKeys = extractCtxKeys(node.arguments[2]);
      if (!spec || (!spec.literals.length && !spec.computed.length && !spec.patterns.length)) {
        unresolvable.push(`${loc} — ${ts.SyntaxKind[pathExpr.kind]}`);
      } else {
        callSites.push({ spec, ctxKeys, loc });
      }
    }
  });
}

// ---------------------------------------------------------------------------
// Expand specs to concrete (path, context) rows
// ---------------------------------------------------------------------------

/**
 * Keys real callers pass inside `ctx:`/`data:`/`context:` object literals, plus
 * object-literal args to EventBus.* factories — the true caller surface for
 * caller-built NarrativeContext bags (supplements the documented key list).
 */
function bagContextKeys(): string[] {
  const keys = new Set<string>();
  const addObj = (o: ts.ObjectLiteralExpression): void => {
    for (const p of o.properties) {
      if (ts.isSpreadAssignment(p)) continue;
      const n =
        ts.isPropertyAssignment(p) || ts.isShorthandPropertyAssignment(p) ? p.name : undefined;
      if (n && (ts.isIdentifier(n) || ts.isStringLiteral(n) || ts.isNumericLiteral(n))) {
        keys.add(n.text);
      }
    }
  };
  for (const sf of sourceFiles) {
    forEachNode(sf, (n) => {
      if (ts.isPropertyAssignment(n) && ts.isObjectLiteralExpression(n.initializer)) {
        const name = ts.isIdentifier(n.name) || ts.isStringLiteral(n.name) ? n.name.text : "";
        if (name === "ctx" || name === "context" || name === "data") addObj(n.initializer);
      }
      if (
        ts.isCallExpression(n) &&
        ts.isPropertyAccessExpression(n.expression) &&
        n.expression.expression.getText(sf) === "EventBus"
      ) {
        for (const a of n.arguments) {
          if (ts.isObjectLiteralExpression(a)) addObj(a);
        }
      }
    });
  }
  return [...keys];
}

/**
 * Superset context for caller-built NarrativeContext bags (EventBus factories,
 * HeadlineGenerator, narrativeEventMap consumers). Only keys that real callers
 * or EventBus.enrichEventContext() supply — the enrichment guarantees
 * heya/heyaname/oyakata/shikona/winner/loser/east/west names; documented
 * caller fields (factory jsdocs + test ctxs) cover the rest.
 */
const BAG_CONTEXT: Record<string, string> = Object.fromEntries(
  [
    "shikona",
    "heya",
    "heyaname",
    "stable",
    "oyakata",
    "winner",
    "loser",
    "east",
    "west",
    "rival",
    "rikishiId",
    "heyaId",
    "stableId",
    "oyakataId",
    "winnerId",
    "loserId",
    "winnerRikishiId",
    "loserRikishiId",
    "eastRikishiId",
    "westRikishiId",
    "rivalId",
    "rikishiRivalId",
    "status",
    "incident",
    "reason",
    "day",
    "week",
    "month",
    "year",
    "amount",
    "score",
    "heat",
    "severity",
    "type",
    "axis",
    "newLevel",
    "oldMood",
    "newMood",
    "intensity",
    "reasoning",
    "strategy",
    "winnerName",
    "loserName",
    "kimarite",
    "kimariteName",
    "upset",
    "isKinboshi",
    "dayInBasho",
    "basho",
    "bashoName",
    "division",
    "rank",
    "title",
    "summary",
    "count",
    "total",
    "prize",
    "prizeName",
    "heyaName",
    "oyakataName",
    "location",
    "from",
    "to",
    "name",
    "attr",
    "SHIKONA",
    "HEYA",
    "HEYA_NAME",
    "HEYANAME",
    "WINNER",
    "LOSER",
    "KIMARITE",
    "EAST",
    "WEST",
    "EAST_NAME",
    "WEST_NAME",
    "DAY",
    "WINS",
    "LOSSES",
    "STREAK",
    "COUNT",
    "RIVAL",
    "P1",
    "P2",
    "OPPONENT",
    "OPPONENT_RANK",
    "MILESTONE",
    "AGE",
    "STATUS",
    "REASON",
    "AREA",
    "SEVERITY",
    "RANK",
    "DIVISION",
    "AMOUNT",
    "WEEK",
    "MONTH",
    "YEAR",
    "TITLE",
    "TYPE",
    "RESULT",
    "NAME",
    ...bagContextKeys(),
  ].map((k) => [k, "X"])
);

interface Row {
  path: string;
  context: Record<string, string>;
  loc: string;
}

const rows = new Map<string, Row>();
const guardedAbsent: string[] = [];

/**
 * Narrow value domains for unresolved template-literal spans whose runtime
 * values are known but not statically expressible as the wildcard `[^.]+`
 * implies — e.g. `post_bout.${loserDecline.replace("-","_")}` only produces the
 * three decline leaves, and `combat.phases.finish.${result.awardFact}` only
 * the two award facts. Keyed by the generated regex source.
 */
const PATTERN_HINTS: Record<string, string[]> = {
  "^post_bout\\.[^.]+$": ["early_decline", "late_decline", "twilight"],
  "^combat\\.phases\\.finish\\.[^.]+$": ["kinboshi", "ginboshi"],
};

function addRow(path: string, ctxKeys: string[] | null, loc: string): void {
  const context = ctxKeys === null ? BAG_CONTEXT : Object.fromEntries(ctxKeys.map((k) => [k, "X"]));
  const key = `${path}::${Object.keys(context).sort().join(",")}`;
  if (!rows.has(key)) rows.set(key, { path, context, loc });
}

for (const site of callSites) {
  const candidates: { path: string; mustExist: boolean }[] = [
    ...site.spec.literals.map((path) => ({ path, mustExist: true })),
    ...site.spec.computed.map((path) => ({ path, mustExist: false })),
  ];
  for (const re of site.spec.patterns) {
    const hint = PATTERN_HINTS[re.source];
    if (hint) {
      for (const v of hint) {
        const path = re.source
          .replace(/^\^/, "")
          .replace(/\$$/, "")
          .replace(/\[\^\.\]\+/, v)
          .replace(/\\([.])/g, "$1");
        candidates.push({ path, mustExist: true });
      }
      continue;
    }
    let matches = [...ALL_LEAVES].filter((p) => re.test(p));
    if (matches.length === 0) {
      const relaxed = new RegExp(re.source.replace(/\[\^\.\]\+/g, ".*"));
      matches = [...ALL_LEAVES].filter((p) => relaxed.test(p));
    }
    if (matches.length === 0) {
      unresolvable.push(`${site.loc} — pattern ${re} matched no domain leaf`);
    }
    for (const p of matches) candidates.push({ path: p, mustExist: false });
  }
  for (const { path, mustExist } of candidates) {
    if (mustExist || ALL_LEAVES.has(path)) {
      addRow(path, site.ctxKeys, site.loc);
    } else {
      guardedAbsent.push(`${path} (${site.loc})`);
    }
  }
}

/**
 * Content-only paths with no production call site (documented in
 * consolidation-verdict-v8.md) — swept explicitly so their exclusion from
 * call-site coverage is intentional.
 */
const CONTENT_ONLY: Row[] = ["Tokyo", "Osaka", "Nagoya", "Fukuoka"].flatMap((city) => [
  { path: `world.venues.${city}.closing`, context: { DAY: "5" }, loc: "content-only" },
]);

const SEEDS = 40;

describe("bard domain template token integrity", () => {
  const files = readdirSync(DOMAINS_DIR).filter((f) => f.endsWith(".json"));
  expect(files.length).toBeGreaterThan(0);

  beforeAll(async () => {
    await BardEngine.loadDomains();
  });

  for (const file of files) {
    it(`${file}: parses as valid JSON`, () => {
      expect(() => JSON.parse(readFileSync(join(DOMAINS_DIR, file), "utf-8"))).not.toThrow();
    });
  }

  it("every BardEngine.resolve call site was classifiable", () => {
    expect(unresolvable).toEqual([]);
  });

  for (const { path, context, loc } of [...rows.values(), ...CONTENT_ONLY]) {
    it(`${path} resolves with no unresolved tokens (${loc})`, () => {
      const unresolved: string[] = [];
      const missing: string[] = [];
      for (let i = 0; i < SEEDS; i++) {
        const rng = rngFromSeed(`token-integrity-${i}`, "test", path);
        const res = BardEngine.resolve(rng, path, context);
        if (!res.text || res.text.includes("[MISSING:")) {
          missing.push(`seed ${i}: ${res.text}`);
        } else if (/%[A-Z_]+%|\{\{[a-zA-Z0-9_]+\}\}/.test(res.text)) {
          unresolved.push(`seed ${i}: ${res.text}`);
        }
      }
      expect(missing, "unresolved/missing template").toEqual([]);
      expect(unresolved, "tokens leaked into output").toEqual([]);
    });
  }
});
