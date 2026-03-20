import type { WorldState } from "../types/world";
import { logEngineEvent } from "../events";
import { autosave } from "../saveload";
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
import * as myosekiMarket from "../myosekiMarket";
import { processWeeklyMediaBoundary, createDefaultMediaState } from "../media";

/**
 * Safe call.
 *  * @param fn - The Fn.
 *  * @returns The result.
 */
function safeCall(fn: () => void): boolean {
  try {
    fn();
    return true;
  } catch {
    return false;
  }
}

/**
 * Weekly subsystem tick — called once every 7 daily ticks.
 * Canon A3.2: training, injuries, economy weekly, governance, welfare, scouting, etc.
 */
export function tickWeeklySubsystems(world: WorldState, subs: string[]): void {
  world.week += 1;
  if (world.calendar) {
    world.calendar.currentWeek = world.week;
  }

  // Build perception cache FIRST — consumed by npcAI and UI (A7.1)
  safeCall(() => {
    const snapshots = buildAllPerceptionSnapshots(world);
    const cache: Record<string, import("../perception").PerceptionSnapshot> = {};
    for (const [id, snap] of snapshots) cache[id] = snap;
    world.perceptionCache = cache;
  }) && subs.push("perception_cache");

  safeCall(() => { npcAI.tickWeek?.(world); }) && subs.push("npcAI");
  safeCall(() => { training.tickWeek(world); }) && subs.push("training");
  safeCall(() => { injuries.tickWeek(world); }) && subs.push("injuries");
  safeCall(() => { economics.tickWeek(world); }) && subs.push("economics_weekly");
  safeCall(() => { welfare.tickWeek(world); }) && subs.push("welfare");
  safeCall(() => { governance.tickWeek(world); }) && subs.push("governance");
  safeCall(() => { rivalries.tickWeek(world); }) && subs.push("rivalries");
  safeCall(() => { events.tickWeek(world); }) && subs.push("events");
  safeCall(() => { scoutingStore.tickWeek(world); }) && subs.push("scouting");
  safeCall(() => { talentpool.tickWeek(world); }) && subs.push("talentpool");
  safeCall(() => { myosekiMarket.tickMyosekiMarket(world); }) && subs.push("myoseki_market");
  // Bi-annual JSA Board Elections (End of year, even years)
  if (world.week === 52 && world.year % 2 === 0) {
    safeCall(() => { governance.runElections(world); }) && subs.push("elections");
  }


  // Media weekly boundary — decay heat/pressure, generate features
  safeCall(() => {
    if (!world.mediaState) world.mediaState = createDefaultMediaState();
    const { state } = processWeeklyMediaBoundary({
      state: world.mediaState,
      world,
      rivalries: world.rivalriesState,
    });
    world.mediaState = state;
  }) && subs.push("media");

  // Recruitment window lifecycle — check if window should close
  safeCall(() => { tickRecruitmentWindowClose(world); }) && subs.push("recruitment_window");

  // Mid-interim recruitment window (Constitution: recruitment at week 3 of interim)
  safeCall(() => { tickMidInterimRecruitment(world); }) && subs.push("mid_interim_recruitment");

  // Autosave at weekly boundary (Constitution §6)
  safeCall(() => { autosave(world); });
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
 * Opens a second, shorter window for player and triggers NPC opportunistic recruitment.
 */
export function tickMidInterimRecruitment(world: WorldState): void {
  if (world.cyclePhase !== "interim") return;

  const interimDaysRemaining = world._interimDaysRemaining ?? 0;
  const totalInterimDays = 42; // 6 weeks
  const elapsedDays = totalInterimDays - interimDaysRemaining;
  const elapsedWeeks = Math.floor(elapsedDays / 7);

  // Fire at week 3 of interim (roughly day 21)
  if (elapsedWeeks !== 3) return;

  // Don't re-open if a window is already open
  const existingWindow = world._recruitmentWindow;
  if (existingWindow?.isOpen) return;

  const playerHeya = world.playerHeyaId ? world.heyas.get(world.playerHeyaId) : null;

  if (playerHeya) {
    world._recruitmentWindow = {
      openedAtWeek: world.week,
      closesAtWeek: world.week + 2, // Shorter 2-week window
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
