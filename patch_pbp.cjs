const fs = require('fs');
const file = 'src/engine/pbp.ts';
let code = fs.readFileSync(file, 'utf8');

if (!code.includes('tactical_adaptation')) {

  // 1. Add tactical phase handling
  const tacticalFactType = `export interface MomentumFact {`;
  code = code.replace(
    tacticalFactType,
    `export interface TacticalAdaptFact {
  phase: "tactical";
  beat: number;
  trailingSide: Side;
  reason: string;
}

export interface MomentumFact {`
  );

  // 2. Add TacticalAdaptFact to Fact union
  code = code.replace(
    '| MomentumFact\n  | FinishFact',
    '| MomentumFact\n  | TacticalAdaptFact\n  | FinishFact'
  );

  // 3. Update buildPbpFromBoutResult extraction loop
  const pbpExtractLoop = `} else if (entry.phase === "momentum") {`;
  code = code.replace(
    pbpExtractLoop,
    `} else if (entry.phase === "tactical") {
        facts.push({
          phase: "tactical",
          beat: ++momentumBeat, // share beat with momentum
          trailingSide: entry.data?.trailingSide as Side,
          reason: "tactical_adaptation"
        } as TacticalAdaptFact);
      } else if (entry.phase === "momentum") {`
  );

  // 4. Update the translation of facts to strings
  const stringifyLoop = `if (f.phase === "tachiai") {`;
  code = code.replace(
    stringifyLoop,
    `if (f.phase === "tactical") {
      const fact = f as TacticalAdaptFact;
      const desc = fact.trailingSide === "east" ? ctx.east.shikona : ctx.west.shikona;
      lines.push({
        text: \`\${desc} is visibly struggling! But sensing the overwhelming pressure, he attempts a sudden tactical shift to break the deadlock!\`,
        tags: ["gasps"]
      });
    } else if (f.phase === "tachiai") {`
  );

  fs.writeFileSync(file, code);
  console.log("Patched pbp.ts");
} else {
  console.log("pbp.ts already patched");
}
