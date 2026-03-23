const fs = require('fs');
const path = './src/engine/descriptorBands.ts';
let content = fs.readFileSync(path, 'utf8');

// 1. Update RikishiDescriptor interface
content = content.replace(
  /export interface RikishiDescriptor \{[\s\S]*?\}/,
  (match) => {
    return match.replace('}', '  injuryModifiers?: string[];\n}');
  }
);

// 2. Add getInjuryModifiers function
const getInjuryModifiersCode = `
// === Injury Modifiers (C5.4) ===

export function getInjuryModifiers(
  isInjured: boolean,
  injuryStatus?: { type: string; severity: string | number; location?: string; weeksRemaining: number; }
): string[] {
  if (!isInjured || !injuryStatus || injuryStatus.type === "none") {
    return [];
  }

  const modifiers: string[] = [];
  const sev = typeof injuryStatus.severity === "string"
    ? (injuryStatus.severity === "minor" ? 10 : injuryStatus.severity === "moderate" ? 50 : 80)
    : injuryStatus.severity;

  const loc = injuryStatus.location?.toLowerCase() || "";
  const isLowerBody = ["knee", "ankle", "foot", "leg", "hip"].includes(loc);
  const isCoreOrUpper = ["back", "neck", "shoulder"].includes(loc);

  if (sev < 30) { // minor
    if (isLowerBody) modifiers.push("taped_up");
    else if (isCoreOrUpper) modifiers.push("moving_gingerly");
    else modifiers.push("taped_up");
  } else { // moderate or severe
    if (isLowerBody) modifiers.push("favoring_it");
    else if (isCoreOrUpper) modifiers.push("hampered");
    else modifiers.push("hampered");
  }

  return modifiers;
}

// === Aggregated Rikishi Descriptor (for UI cards) ===`;

content = content.replace('// === Aggregated Rikishi Descriptor (for UI cards) ===', getInjuryModifiersCode);

// 3. Update toRikishiDescriptor
content = content.replace(
  /export function toRikishiDescriptor\(r: \{[\s\S]*?\}, prev\?: Partial<RikishiDescriptor>\): RikishiDescriptor \{/,
  `export function toRikishiDescriptor(r: {
  power: number;
  speed: number;
  balance: number;
  technique: number;
  condition: number;
  fatigue: number;
  momentum: number;
  talentSeed?: number;
  injured?: boolean;
  injuryStatus?: {
    type: string;
    severity: string | number;
    location?: string;
    weeksRemaining: number;
  };
}, prev?: Partial<RikishiDescriptor>): RikishiDescriptor {`
);

content = content.replace(
  /potentialBand: toPotentialBand\(r.talentSeed, prev\?.potentialBand\),\n\s*\};/,
  `potentialBand: toPotentialBand(r.talentSeed, prev?.potentialBand),
    injuryModifiers: getInjuryModifiers(r.injured ?? false, r.injuryStatus),
  };`
);

fs.writeFileSync(path, content);
console.log('Done');
