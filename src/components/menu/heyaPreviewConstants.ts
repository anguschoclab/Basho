/**
 * heyaPreviewConstants.ts
 *
 * Constants for HeyaPreview component.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

export const HEYA_STATS = [
  {
    label: "Association Stature",
    value: (config: any, _roster: any[], _sekitoriCount: number) => config.label,
    sub: (config: any, _roster: any[]) => config.difficulty,
  },
  {
    label: "Professional Roster",
    value: (_config: any, roster: any[], _sekitoriCount: number) => roster.length,
    sub: (_config: any, _roster: any[]) => "Active Rikishi",
  },
  {
    label: "Sekitori Elite",
    value: (_config: any, _roster: any[], sekitoriCount: number) => sekitoriCount,
    sub: (_config: any, _roster: any[]) => "Salaried Ranks",
  },
];

export const RIKISHI_QUICK_STATS = [
  {
    label: "Current",
    value: (r: any) => `${r.currentBashoWins ?? 0}-${r.currentBashoLosses ?? 0}`,
    sub: "This Basho",
  },
  {
    label: "Career",
    value: (r: any) => `${r.careerWins ?? 0}-${r.careerLosses ?? 0}`,
    sub: "Lifetime",
  },
  {
    label: "Titles",
    value: (r: any) => r.careerYusho ?? 0,
    sub: "Yūshō",
  },
];

export const RIKISHI_BASIC_INFO = [
  {
    label: "Origin",
    key: "origin",
    suffix: "",
  },
  {
    label: "Age",
    key: "age",
    suffix: " Cycles",
  },
  {
    label: "Height",
    key: "height",
    suffix: "cm",
  },
  {
    label: "Weight",
    key: "weight",
    suffix: "kg",
  },
];

export const RIKISHI_ATTRIBUTES = [
  { label: "Power", key: "power" },
  { label: "Speed", key: "speed" },
  { label: "Balance", key: "balance" },
  { label: "Technique", key: "technique" },
];
