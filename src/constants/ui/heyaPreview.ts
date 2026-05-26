/**
 * Constants for HeyaPreview component.
 */

/** Heya configuration for preview display */
export interface HeyaPreviewConfig {
  label: string;
  difficulty: string;
}

/** Rikishi preview data with stats */
export interface RikishiPreview {
  currentBashoWins?: number;
  currentBashoLosses?: number;
  careerWins?: number;
  careerLosses?: number;
  careerYusho?: number;
}

/** Heya stat entry with value functions */
export interface HeyaStatEntry {
  label: string;
  value: (
    config: HeyaPreviewConfig,
    roster: RikishiPreview[],
    sekitoriCount: number
  ) => string | number;
  sub: (config: HeyaPreviewConfig, roster: RikishiPreview[]) => string;
}

/** Rikishi quick stat entry */
export interface RikishiQuickStatEntry {
  label: string;
  value: (r: RikishiPreview) => string | number;
  sub: string;
}

/** Basic info field definition */
export interface BasicInfoField {
  label: string;
  key: string;
  suffix: string;
}

/** Attribute field definition */
export interface AttributeField {
  label: string;
  key: string;
}

export const HEYA_STATS: HeyaStatEntry[] = [
  {
    label: "Association Stature",
    value: (config, _roster, _sekitoriCount) => config.label,
    sub: (config, _roster) => config.difficulty,
  },
  {
    label: "Professional Roster",
    value: (_config, roster, _sekitoriCount) => roster.length,
    sub: () => "Active Rikishi",
  },
  {
    label: "Sekitori Elite",
    value: (_config, _roster, sekitoriCount) => sekitoriCount,
    sub: () => "Salaried Ranks",
  },
];

export const RIKISHI_QUICK_STATS: RikishiQuickStatEntry[] = [
  {
    label: "Current",
    value: (r) => `${r.currentBashoWins ?? 0}-${r.currentBashoLosses ?? 0}`,
    sub: "This Basho",
  },
  {
    label: "Career",
    value: (r) => `${r.careerWins ?? 0}-${r.careerLosses ?? 0}`,
    sub: "Lifetime",
  },
  {
    label: "Titles",
    value: (r) => r.careerYusho ?? 0,
    sub: "Yūshō",
  },
];

export const RIKISHI_BASIC_INFO: BasicInfoField[] = [
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

export const RIKISHI_ATTRIBUTES: AttributeField[] = [
  { label: "Power", key: "power" },
  { label: "Speed", key: "speed" },
  { label: "Balance", key: "balance" },
  { label: "Technique", key: "technique" },
];
