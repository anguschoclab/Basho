/**
 * staffMeta.ts
 *
 * Staff display constants — role labels/descriptions, band colors, sort
 * options + accessor, and the competence→bonus text map.
 */

import type { Staff, StaffRole } from "@/engine/types/staff";

export const ROLE_LABELS: Record<StaffRole, string> = {
  oyakata: "Steward",
  assistant_oyakata: "Lead Coach",
  technique_coach: "Technique Specialist",
  conditioning_coach: "Conditioning Specialist",
  nutritionist: "Dietitian",
  medical_staff: "Chief Physio",
  scout: "Recruitment Scout",
  administrator: "Stable Secretary",
};

export const ROLE_DESCRIPTIONS: Record<StaffRole, string> = {
  oyakata: "The head of the stable, overseeing all operations.",
  assistant_oyakata: "Focuses on general training and stable discipline.",
  technique_coach: "Improves technical skill gains during practice.",
  conditioning_coach: "Enhances physical attribute growth and stamina.",
  nutritionist: "Optimizes chanko-nabe for weight and health.",
  medical_staff: "Reduces injury severity and speeds up recovery.",
  scout: "Finds and assesses better prospects in the talent pool.",
  administrator: "Reduces costs and manages institutional relationships.",
};

export const STAFF_SORT_OPTIONS = [
  { key: "name", label: "Name" },
  { key: "role", label: "Role" },
  { key: "tenure", label: "Tenure" },
  { key: "competence", label: "Competence" },
];

export const STAFF_ACCESSOR: Record<string, (s: Staff) => string | number | undefined> = {
  name: (s) => s.name,
  role: (s) => s.role,
  tenure: (s) => s.yearsAtBeya,
  competence: (s) => s.competenceBands.primary,
};

export const STAFF_BAND_COLORS: Record<string, string> = {
  monstrous: "text-primary",
  dominant: "text-primary",
  great: "text-success",
  strong: "text-success",
  serviceable: "text-west",
  limited: "text-warning",
  feeble: "text-destructive",
  respectable: "text-success",
  respected: "text-success",
  renowned: "text-primary",
  legendary: "text-primary",
  devoted: "text-success",
  unshakable: "text-primary",
};

const ROLE_BONUS_DESCRIPTIONS: Record<StaffRole, string> = {
  oyakata: "Stable Management",
  assistant_oyakata: "All-rounder training support",
  technique_coach: "Accelerates Skill/Technique gains",
  conditioning_coach: "Accelerates Physical/Stamina gains",
  nutritionist: "Weight management & Health",
  medical_staff: "Accelerates Injury recovery",
  scout: "Improved talent discovery",
  administrator: "Reduces overhead costs",
};

const COMPETENCE_BONUS_LABELS: Record<string, string> = {
  monstrous: "+50%",
  dominant: "+30%",
  great: "+20%",
  strong: "+15%",
  serviceable: "+10%",
  limited: "+5%",
  feeble: "+1%",
};

/** Tooltip text describing the role bonus at the staffer's competence band. */
export function staffBonusText(staff: Staff): string {
  const value = COMPETENCE_BONUS_LABELS[staff.competenceBands.primary.toLowerCase()] || "??";
  return `${ROLE_BONUS_DESCRIPTIONS[staff.role]}: ${value}`;
}
