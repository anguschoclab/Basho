const fs = require('fs');
let code = fs.readFileSync('src/engine/descriptorBands.ts', 'utf8');

if (!code.includes('DurationBand')) {
  const durationBands = `
// === Duration Bands (Constitution C5 / A7.1) ===

export type DurationBand = "a_moment" | "a_few_days" | "a_week" | "several_weeks" | "a_month" | "an_extended_period";

const DURATION_BANDS: BandDef<DurationBand>[] = [
  { band: "a_moment", min: 0, max: 2 },
  { band: "a_few_days", min: 2, max: 7 },
  { band: "a_week", min: 7, max: 14 },
  { band: "several_weeks", min: 14, max: 28 },
  { band: "a_month", min: 28, max: 60 },
  { band: "an_extended_period", min: 60, max: Infinity },
];

export function toDurationBand(days: number): DurationBand {
  return toBand(days, DURATION_BANDS);
}

export const DURATION_LABELS: Record<DurationBand, string> = {
  a_moment: "A Moment",
  a_few_days: "A Few Days",
  a_week: "A Week",
  several_weeks: "Several Weeks",
  a_month: "A Month",
  an_extended_period: "An Extended Period",
};
`;
  code = code + durationBands;
  fs.writeFileSync('src/engine/descriptorBands.ts', code);
}
