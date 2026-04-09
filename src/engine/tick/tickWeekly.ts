import type { WorldState } from "../types/world";
import { logEngineEvent } from "../events";
import { buildAllPerceptionSnapshots } from "../perception";
import * as training from "../training";
import * as injuries from "../systems/health/InjuryService";
import * as economics from "../economics";
import * as governance from "../governance/GovernanceService";
import * as welfare from "../welfare";
import * as events from "../events";
import * as rivalries from "../rivalries";
import * as npcAI from "../npcAI";
import * as scoutingStore from "../scoutingStore";
import * as talentpool from "../systems/generation/TalentPoolService";
import { processWeeklyMediaBoundary, createDefaultMediaState, evaluateScandals } from "../systems/media/MediaService";
import { stableSort } from "../utils/sort";
import { runTickPipeline, safeCall, type TickStep } from "./tickOrchestrator";
import { opfsArchiveService } from "../storage/opfsArchive";
import { BardEngine } from "../narrative/BardEngine";
import { rngFromSeed } from "../rng";

/**
 * Weekly subsystem tick — called once every 7 daily ticks.
 * Canon A3.2: training, injuries, economy weekly, governance, welfare, scouting, etc.
 */
export function tickWeeklySubsystems(world: WorldState, subs: string[]): void {
  world.week += 1;
  if (world.calendar) {
    world.calendar.currentWeek = world.week;
  }

  const steps: TickStep[] = [
    {
      label: "perception_cache",
      run: (w) => {
        const snapshots = buildAllPerceptionSnapshots(w);
        const cache: Record<string, import("../perception").PerceptionSnapshot> = {};
        for (const [id, snap] of snapshots) cache[id] = snap;
        w.perceptionCache = cache;
      },
    },
    { label: "npcAI", run: (w) => { npcAI.tickWeekNPC?.(w); } },
    { label: "training", run: (w) => { training.tickWeekTraining(w); } },
    { label: "injuries", run: (w) => { injuries.tickWeekInjury(w); } },
    { label: "recovery", run: (w) => { injuries.tickWeekRecovery(w); } },
    { label: "economics_weekly", run: (w) => { economics.tickWeekEconomics(w); } },

    { label: "welfare", run: (w) => { welfare.tickWeekWelfare(w); } },
    { label: "governance", run: (w) => { governance.tickWeekGovernance(w); } },
    { label: "rivalries", run: (w) => { rivalries.tickWeekRivalries(w); } },
    { label: "events", run: (w) => { events.tickWeekEvents(w); } },
    { label: "scouting", run: (w) => { scoutingStore.tickWeekScouting(w); } },
    { label: "talentpool", run: (w) => { talentpool.tickWeekTalentPool(w); } },
    { label: "staff", run: (w) => { import("../staff").then(m => m.tickStaffWeek(w)); } },
    {
      label: "staff_warnings",
      run: (w) => {
        if (!w.staff || !w.playerHeyaId) return;
        const heya = w.heyas.get(w.playerHeyaId);
        if (!heya || !heya.staffIds) return;
        
        for (const sId of heya.staffIds) {
          const staff = w.staff.get(sId);
          if (staff && staff.fatigue > 80) {
            const rng = rngFromSeed(`staff-burnout-${w.week}-${sId}`, "narrative", "event");
            logEngineEvent(w, {
              type: "STAFF_BURNOUT",
              category: "heya",
              importance: "major",
              scope: "heya",
              heyaId: heya.id,
              title: "Staff Exhaustion Alert",
              summary: BardEngine.resolve(rng, "events.staff.burnout", { NAME: staff.name }).text,
              data: { staffId: sId, fatigue: staff.fatigue }
            });
          }
        }
      }
    },

    {
      label: "gazette_archive",
      run: (w) => {
        // Fire-and-forget background archiving of the weekly gazette
        safeCall(() => {
          if (w.mediaState?.weeklyGazette) {
             // We use a fire-and-forget promise to not block the tick pipeline
             opfsArchiveService.archiveGazette(
               w.year,
               w.week,
               w.mediaState.weeklyGazette
             ).catch(e => console.error("Failed to background archive gazette", e));
          }
        });
      }
    },
    {
      label: "media",
      run: (w) => {
        if (!w.mediaState) w.mediaState = createDefaultMediaState();
        
        // 1. Core Media Boundary (Heat/Pressure)
        const { state } = processWeeklyMediaBoundary({
          state: w.mediaState,
          world: w,
          rivalries: w.rivalriesState,
        });
        w.mediaState = state;

        // 2. Scandal Engine
        evaluateScandals(w);

        // 3. Status Decay (Motivation Caps, etc)
        // ⚡ Bolt: filter retired rikishi before applying O(N log N) stableSort to drastically reduce sorting overhead
        const activeRikishi = [];
        for (const r of w.rikishi.values()) {
          if (!r.isRetired) activeRikishi.push(r);
        }
        for (const rikishi of stableSort(activeRikishi, x => x.id)) {
          if (rikishi.motivationCapWeeks && rikishi.motivationCapWeeks > 0) {
            rikishi.motivationCapWeeks -= 1;
            if (rikishi.motivationCapWeeks === 0) {
              rikishi.motivationCap = undefined;
            }
          }
        }
      },
    },
    { label: "recruitment_window", run: (w) => { tickRecruitmentWindowClose(w); } },
    { label: "mid_interim_recruitment", run: (w) => { tickMidInterimRecruitment(w); } },
  ];

  // Bi-annual JSA Board Elections (End of year, even years)
  if (world.week === 52 && world.year % 2 === 0) {
    steps.push({ label: "elections", run: (w) => { governance.runElections(w); } });
  }

  runTickPipeline(world, subs, steps, { autosave: true });
}

/**
 * Check if the player's recruitment window should close.
 * Per A3.4, windows have a fixed duration set at open time.
 */
function tickRecruitmentWindowClose(world: WorldState): void {
  const rw = world._recruitmentWindow;
  if (!rw || !rw.isOpen) return;

  if (world.week >= rw.closesAtWeek) {
    rw.isOpen = false;

    if (world.playerHeyaId) {
      const rng = rngFromSeed(`recruit-close-${world.week}`, "narrative", "event");
      const title = BardEngine.resolve(rng, "events.titles.RECRUITMENT_WINDOW_CLOSED").text;
      const summary = BardEngine.resolve(rng, "events.recruitment.closed").text;

      logEngineEvent(world, {
        type: "RECRUITMENT_WINDOW_CLOSED",
        category: "career",
        importance: "notable",
        scope: "heya",
        heyaId: world.playerHeyaId,
        title,
        summary,
        data: { phase: rw.phase, openedAtWeek: rw.openedAtWeek, closedAtWeek: world.week }
      });
    }
  }
}

/**
 * Mid-interim recruitment window (Constitution: recruitment occurs at mid-interim week 3).
 */
function tickMidInterimRecruitment(world: WorldState): void {
  if (world.cyclePhase !== "interim") return;

  const interimDaysRemaining = world._interimDaysRemaining ?? 0;
  const totalInterimDays = 42;
  const elapsedDays = totalInterimDays - interimDaysRemaining;
  const elapsedWeeks = Math.floor(elapsedDays / 7);

  if (elapsedWeeks !== 3) return;

  const existingWindow = world._recruitmentWindow;
  if (existingWindow?.isOpen) return;

  const playerHeya = world.playerHeyaId ? world.heyas.get(world.playerHeyaId) : null;

  // Block recruitment if welfare sanctions are active (Constitution A6.3)
  if (playerHeya?.welfareState?.complianceState === "sanctioned") {
    const rng = rngFromSeed(`recruit-blocked-${world.week}`, "narrative", "event");
    const title = BardEngine.resolve(rng, "events.titles.RECRUITMENT_BLOCKED_SANCTIONS").text;
    const summary = BardEngine.resolve(rng, "events.welfare.sanctioned", { HEYANAME: playerHeya.name }).text;

    logEngineEvent(world, {
      type: "RECRUITMENT_BLOCKED_SANCTIONS",
      category: "discipline",
      importance: "major",
      scope: "heya",
      heyaId: playerHeya.id,
      title,
      summary,
      data: { complianceState: "sanctioned", welfareRisk: playerHeya.welfareState?.welfareRisk ?? 0 }
    });
    return;
  }

  if (playerHeya) {
    world._recruitmentWindow = {
      openedAtWeek: world.week,
      closesAtWeek: world.week + 2,
      vacancies: 0,
      isOpen: true,
      phase: "mid_interim"
    };

    logEngineEvent(world, {
      type: "RECRUITMENT_WINDOW_OPEN",
      category: "career",
      importance: "notable",
      scope: "heya",
      heyaId: playerHeya.id,
      title: BardEngine.resolve(rngFromSeed(`recruit-open-${world.week}`, "narrative", "event"), "events.titles.RECRUITMENT_WINDOW_OPEN").text,
      summary: BardEngine.resolve(rngFromSeed(`recruit-open-desc-${world.week}`, "narrative", "event"), "events.recruitment.open").text,
      data: {
        rosterSize: (playerHeya.rikishiIds ?? []).length,
        windowDuration: 2,
        closesAtWeek: world.week + 2,
        phase: "mid_interim"
      }
    });
  }

  // NPC opportunistic recruitment during mid-interim
  safeCall(() => {
    const smallStables: Record<string, number> = {};
    let hasItems = false;
    // ⚡ Bolt: filter out large and player-owned stables before applying O(N log N) stableSort
    const npcStables = [];
    for (const h of world.heyas.values()) {
      if (h.id !== world.playerHeyaId && (h.rikishiIds ?? []).length < 6) {
        npcStables.push(h);
      }
    }
    for (const heya of stableSort(npcStables, x => x.id)) {
      smallStables[heya.id] = Math.max(1, 6 - (heya.rikishiIds ?? []).length);
      hasItems = true;
    }

    if (hasItems) {
      talentpool.fillVacanciesForNPC(world, smallStables);
    }
  });
}
