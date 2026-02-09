// welfare.ts
// =======================================================
// Welfare & Compliance State Machine (Canon A7)
// Implements "Medical Responsibility Chain":
//   Compliant → Watch → Investigation → Sanctioned
// - Deterministic weekly tick
// - Integrates with Injuries, Training profile, Facilities, and Oyakata personas
// - Emits events via events.ts
// =======================================================

import type { WorldState, Heya, WelfareState, ComplianceState, Id } from "./types";
import { rngForWorld } from "./rng";
import { ensureHeyaTrainingState } from "./training";
import { getManagerPersona } from "./npcAI";
import { logEngineEvent } from "./events";

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

export function ensureHeyaWelfareState(heya: Heya): WelfareState {
  const existing = heya.welfareState;
  if (existing && typeof existing.welfareRisk === "number" && existing.complianceState) {
    return existing;
  }
  const state: WelfareState = {
    welfareRisk: 10,
    complianceState: "compliant",
    weeksInState: 0,
    lastReviewedWeek: 0
  };
  heya.welfareState = state;
  return state;
}

function severityWeight(sev: string | number | undefined): number {
  if (sev === "serious" || sev === "high" || sev === 3) return 8;
  if (sev === "moderate" || sev === "medium" || sev === 2) return 4;
  return 2;
}

function computeHeyaInjuryPressure(world: WorldState, heya: Heya): { pressure: number; seriousCount: number } {
  let pressure = 0;
  let seriousCount = 0;

  for (const rid of heya.rikishiIds) {
    const r = world.rikishi.get(rid);
    if (!r) continue;

    // Prefer rich injuryStatus, fallback to injured boolean/weeks
    const status = (r as any).injuryStatus ?? (r as any).injury;
    const injured = Boolean(status?.isInjured) || Boolean((r as any).injured);
    if (!injured) continue;

    const sev = status?.severity ?? (status?.severityLabel ?? undefined);
    const w = severityWeight(sev);
    pressure += w;
    if (sev === "serious" || sev === "high" || sev === 3) seriousCount += 1;
  }

  return { pressure, seriousCount };
}

function computeWeeklyWelfareDelta(world: WorldState, heya: Heya): { delta: number; reasons: string[] } {
  const reasons: string[] = [];
  const state = ensureHeyaWelfareState(heya);

  // Injuries are the primary driver
  const { pressure, seriousCount } = computeHeyaInjuryPressure(world, heya);
  if (pressure > 0) {
    const injDelta = clamp(Math.round(pressure / 3), 0, 12);
    if (injDelta > 0) {
      reasons.push(`injury_pressure+${injDelta}`);
      state.welfareRisk += injDelta; // temporary, we'll compute delta separately as well
      state.welfareRisk -= injDelta;
    }
  }

  let delta = clamp(Math.round(pressure / 3), 0, 12);
  if (seriousCount > 0) {
    delta += 2;
    reasons.push(`serious_injuries+2`);
  }

  // Training profile and intensity
  const trainingState = ensureHeyaTrainingState(world, heya.id);
  const intensity = trainingState.activeProfile.intensity;
  const recovery = trainingState.activeProfile.recovery;

  if (intensity === "high") {
    delta += 3;
    reasons.push("high_intensity+3");
  } else if (intensity === "medium") {
    delta += 1;
    reasons.push("med_intensity+1");
  }

  if (recovery === "low") {
    delta += 2;
    reasons.push("low_recovery+2");
  } else if (recovery === "high") {
    delta -= 2;
    reasons.push("high_recovery-2");
  }

  // Facilities
  const rec = clamp(heya.facilities?.recovery ?? 50, 0, 100);
  const nut = clamp(heya.facilities?.nutrition ?? 50, 0, 100);
  const facDelta = Math.round((60 - rec) / 25) + Math.round((55 - nut) / 40);
  if (facDelta !== 0) reasons.push(`facilities${facDelta >= 0 ? "+" : ""}${facDelta}`);
  delta += facDelta;

  // Governance scandal makes regulators more suspicious
  if ((heya.scandalScore ?? 0) >= 50) {
    delta += 2;
    reasons.push("scandal_synergy+2");
  }

  // Oyakata persona influence
  const persona = getManagerPersona(world, heya.id);
  delta -= Math.round(persona.welfareDiscipline * 2); // 0..2
  if (persona.welfareDiscipline > 0) reasons.push(`manager_welfare-${Math.round(persona.welfareDiscipline * 2)}`);

  // Natural drift downward when stable is healthy
  const healthy = pressure === 0 && intensity !== "high" && recovery !== "low";
  if (healthy) {
    delta -= 2;
    reasons.push("healthy_drift-2");
  }

  return { delta, reasons };
}

function setComplianceState(state: WelfareState, next: ComplianceState) {
  if (state.complianceState !== next) {
    state.complianceState = next;
    state.weeksInState = 0;
  }
}

export function tickWeek(world: WorldState): number {
  let events = 0;

  for (const heya of world.heyas.values()) {
    const w = ensureHeyaWelfareState(heya);
    const beforeRisk = w.welfareRisk;

    const { delta, reasons } = computeWeeklyWelfareDelta(world, heya);
    w.welfareRisk = clamp(Math.round(w.welfareRisk + delta), 0, 100);
    w.weeksInState += 1;
    w.lastReviewedWeek = world.week ?? 0;

    const riskUp = w.welfareRisk - beforeRisk;

    // Transition logic
    const { seriousCount } = computeHeyaInjuryPressure(world, heya);

    if (w.complianceState === "compliant") {
      if (w.welfareRisk >= 45 || seriousCount >= 2) {
        setComplianceState(w, "watch");
        logEngineEvent(world, {
          type: "COMPLIANCE_WATCH",
          category: "discipline",
          importance: "notable",
          scope: "heya",
          heyaId: heya.id,
          title: "Compliance Watch",
          summary: `${heya.name} has been placed under watch for welfare concerns.`,
          data: { welfareRisk: w.welfareRisk, reasons: reasons.join("|") }
        });
        events += 1;
      }
    } else if (w.complianceState === "watch") {
      // Escalate if risk stays high
      if (w.welfareRisk >= 65 && w.weeksInState >= 2) {
        setComplianceState(w, "investigation");
        w.investigation = {
          openedWeek: world.week ?? 0,
          severity: w.welfareRisk >= 80 ? "high" : w.welfareRisk >= 72 ? "medium" : "low",
          triggers: reasons,
          progress: 0
        };
        logEngineEvent(world, {
          type: "COMPLIANCE_INVESTIGATION_OPENED",
          category: "discipline",
          importance: w.welfareRisk >= 80 ? "headline" : "major",
          scope: "heya",
          heyaId: heya.id,
          title: "Investigation Opened",
          summary: `Regulators open a welfare investigation into ${heya.name}.`,
          data: { welfareRisk: w.welfareRisk, triggers: reasons.join("|") }
        });
        events += 1;
      } else if (w.welfareRisk <= 25 && w.weeksInState >= 3) {
        setComplianceState(w, "compliant");
        logEngineEvent(world, {
          type: "COMPLIANCE_CLEARED",
          category: "discipline",
          importance: "minor",
          scope: "heya",
          heyaId: heya.id,
          title: "Watch Lifted",
          summary: `${heya.name} has improved conditions and returns to good standing.`,
          data: { welfareRisk: w.welfareRisk }
        });
        events += 1;
      }
    } else if (w.complianceState === "investigation") {
      const inv = w.investigation;
      if (!inv) {
        w.investigation = { openedWeek: world.week ?? 0, severity: "low", triggers: reasons, progress: 0 };
      }

      // Progress based on facilities and manager discipline
      const persona = getManagerPersona(world, heya.id);
      const rec = clamp(heya.facilities?.recovery ?? 50, 0, 100);
      const nut = clamp(heya.facilities?.nutrition ?? 50, 0, 100);
      const progressGain = clamp(Math.round(4 + rec / 30 + nut / 60 + persona.welfareDiscipline * 5), 2, 12);
      w.investigation!.progress = clamp((w.investigation!.progress ?? 0) + progressGain, 0, 100);

      // Sanction if conditions worsen
      if (w.welfareRisk >= 85 || (seriousCount >= 3 && w.welfareRisk >= 70)) {
        setComplianceState(w, "sanctioned");
        w.sanctions = {
          recruitmentFreezeWeeks: 12,
          trainingIntensityCap: "medium",
          fineYen: 5_000_000,
          note: "Mandatory welfare remediation plan"
        };
        logEngineEvent(world, {
          type: "COMPLIANCE_SANCTIONED",
          category: "discipline",
          importance: "headline",
          scope: "heya",
          heyaId: heya.id,
          title: "Sanctions Issued",
          summary: `${heya.name} is sanctioned for welfare violations. Recruitment frozen and training restricted.`,
          data: { welfareRisk: w.welfareRisk, fineYen: w.sanctions.fineYen ?? 0 }
        });
        events += 1;
      } else if (w.investigation!.progress >= 100 && w.welfareRisk <= 50) {
        // De-escalate
        setComplianceState(w, "watch");
        w.investigation = undefined;
        logEngineEvent(world, {
          type: "COMPLIANCE_INVESTIGATION_CLOSED",
          category: "discipline",
          importance: "major",
          scope: "heya",
          heyaId: heya.id,
          title: "Investigation Closed",
          summary: `${heya.name} meets remediation requirements and exits investigation.`,
          data: { welfareRisk: w.welfareRisk }
        });
        events += 1;
      }
    } else if (w.complianceState === "sanctioned") {
      // Apply sanction decay
      if (w.sanctions?.recruitmentFreezeWeeks && w.sanctions.recruitmentFreezeWeeks > 0) {
        w.sanctions.recruitmentFreezeWeeks -= 1;
      }
      // Improve chance to downgrade once risk is low and sanctions served
      const freezeDone = !w.sanctions?.recruitmentFreezeWeeks || w.sanctions.recruitmentFreezeWeeks <= 0;
      if (freezeDone && w.welfareRisk <= 45 && w.weeksInState >= 4) {
        setComplianceState(w, "watch");
        w.sanctions = undefined;
        logEngineEvent(world, {
          type: "COMPLIANCE_SANCTIONS_LIFTED",
          category: "discipline",
          importance: "major",
          scope: "heya",
          heyaId: heya.id,
          title: "Sanctions Lifted",
          summary: `${heya.name} has served sanctions and returns to watch status.`,
          data: { welfareRisk: w.welfareRisk }
        });
        events += 1;
      }
    }

    // Risk indicator hook
    if (!heya.riskIndicators) (heya as any).riskIndicators = { financial: false, governance: false, rivalry: false };
    (heya.riskIndicators as any).welfare = w.complianceState !== "compliant" || w.welfareRisk >= 55;

    // Emit change event when risk moves materially
    if (Math.abs(riskUp) >= 8) {
      logEngineEvent(world, {
        type: "WELFARE_RISK_UPDATE",
        category: "discipline",
        importance: w.welfareRisk >= 70 ? "major" : "notable",
        scope: "heya",
        heyaId: heya.id,
        title: "Welfare Risk Shift",
        summary: `${heya.name} welfare risk is now ${w.welfareRisk}.`,
        data: { welfareRisk: w.welfareRisk, delta: riskUp, reasons: reasons.join("|") }
      });
      events += 1;
    }
  }

  return events;
}
