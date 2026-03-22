import type { WorldState } from "../types/world";
import { logEngineEvent } from "../events";
import { buildAllPerceptionSnapshots } from "../perception";
import * as training from "../training";
import * as injuries from "../injuries";
import * as economics from "../economics";
import * as governance from "../governance";
import * as welfare from "../welfare";
import * as events from "../events";
import * as rivalries from "../rivalries";
import * as npcAI from "../npcAI";
import * as scoutingStore from "../scoutingStore";
import * as talentpool from "../talentpool";
import { processWeeklyMediaBoundary, createDefaultMediaState } from "../media";
import { runTickPipeline, safeCall, type TickStep } from "./tickOrchestrator";

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
    { label: "npcAI", run: (w) => { npcAI.tickWeek?.(w); } },
    { label: "training", run: (w) => { training.tickWeek(w); } },
    { label: "injuries", run: (w) => { injuries.tickWeek(w); } },
    { label: "economics_weekly", run: (w) => { economics.tickWeek(w); } },
    { label: "welfare", run: (w) => { welfare.tickWeek(w); } },
    { label: "governance", run: (w) => { governance.tickWeek(w); } },
    { label: "rivalries", run: (w) => { rivalries.tickWeek(w); } },
    { label: "events", run: (w) => { events.tickWeek(w); } },
    { label: "scouting", run: (w) => { scoutingStore.tickWeek(w); } },
    { label: "talentpool", run: (w) => { talentpool.tickWeek(w); } },
    {
      label: "media",
      run: (w) => {
        if (!w.mediaState) w.mediaState = createDefaultMediaState();
        const { state } = processWeeklyMediaBoundary({
          state: w.mediaState,
          world: w,
          rivalries: w.rivalriesState,
        });
        w.mediaState = state;
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
export function tickRecruitmentWindowClose(world: WorldState): void {
  const rw = world._recruitmentWindow;
  if (!rw || !rw.isOpen) return;

  if (world.week >= rw.closesAtWeek) {
    rw.isOpen = false;

    if (world.playerHeyaId) {
      logEngineEvent(world, {
        type: "RECRUITMENT_WINDOW_CLOSED",
        category: "career",
        importance: "notable",
        scope: "heya",
        heyaId: world.playerHeyaId,
        title: "Recruitment window closed",
        summary: `The ${rw.phase === "post_basho" ? "post-basho" : "mid-interim"} recruitment window has closed.`,
        data: { phase: rw.phase, openedAtWeek: rw.openedAtWeek, closedAtWeek: world.week }
      });
    }
  }
}

/**
 * Mid-interim recruitment window (Constitution: recruitment occurs at mid-interim week 3).
 */
export function tickMidInterimRecruitment(world: WorldState): void {
  if (world.cyclePhase !== "interim") return;

  const interimDaysRemaining = world._interimDaysRemaining ?? 0;
  const totalInterimDays = 42;
  const elapsedDays = totalInterimDays - interimDaysRemaining;
  const elapsedWeeks = Math.floor(elapsedDays / 7);

  if (elapsedWeeks !== 3) return;

  const existingWindow = world._recruitmentWindow;
  if (existingWindow?.isOpen) return;

  const playerHeya = world.playerHeyaId ? world.heyas.get(world.playerHeyaId) : null;

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
      title: "Mid-interim recruitment window",
      summary: "A brief mid-interim recruitment window opens. Scout and sign for 2 weeks.",
      data: {
        rosterSize: playerHeya.rikishiIds.length,
        windowDuration: 2,
        closesAtWeek: world.week + 2,
        phase: "mid_interim"
      }
    });
  }

  // NPC opportunistic recruitment during mid-interim
  safeCall(() => {
    const smallStables: Record<string, number> = {};
    for (const heya of world.heyas.values()) {
      if (heya.id === world.playerHeyaId) continue;
      if (heya.rikishiIds.length < 6) {
        smallStables[heya.id] = Math.max(1, 6 - heya.rikishiIds.length);
      }
    }
    if (Object.keys(smallStables).length > 0) {
      talentpool.fillVacanciesForNPC(world, smallStables);
    }
  });
}
