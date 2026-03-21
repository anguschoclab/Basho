const fs = require('fs');
let file = fs.readFileSync('src/engine/descriptorBands.ts', 'utf8');

const motivationBandStr = `
// === Motivation Bands ===

export type MotivationBand = "driven" | "eager" | "content" | "distracted" | "apathetic";

export const MOTIVATION_LABELS: Record<MotivationBand, string> = {
  driven: "Driven",
  eager: "Eager",
  content: "Content",
  distracted: "Distracted",
  apathetic: "Apathetic"
};

/**
 * To motivation band.
 *  * @param value - The value.
 *  * @param prev - The previous band.
 *  * @returns The result.
 */
export function toMotivationBand(value: number, prev?: MotivationBand): MotivationBand {
  const bands: Array<{ b: MotivationBand; t: number }> = [
    { b: "driven", t: 85 },
    { b: "eager", t: 65 },
    { b: "content", t: 40 },
    { b: "distracted", t: 20 },
    { b: "apathetic", t: 0 },
  ];
  return toBand(value, bands, prev);
}

`;

if (!file.includes('export type MotivationBand')) {
  file = file.replace('// === Momentum Bands ===', motivationBandStr + '\n// === Momentum Bands ===');
  fs.writeFileSync('src/engine/descriptorBands.ts', file, 'utf8');
}
