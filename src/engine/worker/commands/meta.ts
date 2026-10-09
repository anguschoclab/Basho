/**
 * commands/meta.ts
 * ================
 * Meta-game commands: bookmarks, tutorial flow, exhibitions, holidays,
 * and succession.
 */

import type { EngineCommand } from "../types";
import { WorldCircuitService } from "../../systems/worldCircuit/WorldCircuitService";
import { runHoliday } from "../../holiday";
import * as legacy from "../../systems/legacy/DynastyService";
import {
  addBookmark,
  removeBookmark,
  updateBookmarkNote,
} from "../../systems/bookmark/BookmarkService";
import {
  advanceTutorialStep as svcAdvanceTutorialStep,
  setTutorialFlag as svcSetTutorialFlag,
  finishExhibition as svcFinishExhibition,
  completeTutorial as svcCompleteTutorial,
} from "../../systems/tutorial/TutorialService";
import { logEventImpact } from "../../core/ImpactBuilder";
import { resolveImpacts } from "../../core/ImpactResolver";
import type { WorkerRuntime } from "../runtime";
import type { CommandHandlerMap } from "./types";

type Cmd<T extends EngineCommand["type"]> = Extract<EngineCommand, { type: T }>;

function acceptExhibitionCmd(rt: WorkerRuntime, cmd: Cmd<"ACCEPT_EXHIBITION">) {
  if (rt.world) {
    const w = rt.world;
    const pending = w.pendingExhibitions ?? [];
    const invitation = pending.find((i) => i.id === cmd.invitationId);
    if (invitation) {
      const heyaId = invitation.heyaId;
      // Auto-select the highest-ranked active rikishi from the heya if not provided
      const rikishiId =
        cmd.rikishiId ||
        (() => {
          const heyaRikishi = [...w.activeRikishiIds]
            .map((id) => w.rikishi.get(id))
            .filter(
              (r): r is NonNullable<typeof r> =>
                r !== undefined && r.heyaId === heyaId && !r.isRetired
            )
            // rankNumber 1 is the TOP of the banzuke — ascending picks strongest
            .sort((a, b) => (a.rankNumber ?? 99) - (b.rankNumber ?? 99));
          return heyaRikishi[0]?.id ?? "";
        })();
      if (!rikishiId) return;
      const impact = WorldCircuitService.processExhibitionResult(
        rt.world,
        heyaId,
        rikishiId,
        invitation
      );
      rt.world = resolveImpacts(rt.world, [impact]);
      // Remove the accepted invitation from pending
      const remaining = (rt.world.pendingExhibitions ?? []).filter(
        (i) => i.id !== cmd.invitationId
      );
      rt.world = { ...rt.world, pendingExhibitions: remaining };
      rt.syncAndDigest();
    }
  }
}

function goOnHolidayCmd(rt: WorkerRuntime, cmd: Cmd<"GO_ON_HOLIDAY">) {
  if (rt.world) {
    // Inject playerHeyaId from the world so evaluateGates can fire.
    // HolidayDialog doesn't know the heya id; the worker does.
    const config = cmd.config.playerHeyaId
      ? cmd.config
      : { ...cmd.config, playerHeyaId: rt.world.playerHeyaId };
    const result = runHoliday(rt.world, config);
    // runHoliday returns reports[] — the last report is the final world state
    if (result && result.reports.length > 0) {
      rt.world = result.reports[result.reports.length - 1];
    }
    // Log a holiday_return event so selectHolidayDigest can surface the
    // digest on the Dashboard. Without this, the "Holiday Return Digest"
    // section never renders — the projection scans world.events.log for
    // data.eventId === "holiday_return" / data.status === "holiday_return".
    if (result) {
      const incidents = result.digest.categories.flatMap((c) =>
        c.items.map((item) => ({ type: c.id, description: item }))
      );
      const holidayEventImpact = logEventImpact(
        "MANAGEMENT_DECISION",
        "ai_decision",
        {
          status: "holiday_return",
          eventId: "holiday_return",
          target: config.target,
          daysAdvanced: result.daysAdvanced,
          summary: result.digest.headline,
          incidents,
          gateTriggered: result.gateTriggered?.gate ?? null,
          phaseOnExit: result.phaseOnExit,
        },
        "GO_ON_HOLIDAY",
        { importance: "headline" }
      );
      rt.world = resolveImpacts(rt.world, [holidayEventImpact]);
    }
    rt.syncAndDigest();
  }
}

export function metaCommands(rt: WorkerRuntime): CommandHandlerMap {
  return {
    BOOKMARK_ENTITY: (cmd) => {
      if (rt.world) {
        const impact = addBookmark(rt.world, cmd.entityType, cmd.entityId, cmd.note);
        rt.world = resolveImpacts(rt.world, [impact]);
        rt.syncWorld();
      }
    },
    UNBOOKMARK_ENTITY: (cmd) => {
      if (rt.world) {
        const impact = removeBookmark(rt.world, cmd.entityType, cmd.entityId);
        rt.world = resolveImpacts(rt.world, [impact]);
        rt.syncWorld();
      }
    },
    UPDATE_BOOKMARK_NOTE: (cmd) => {
      if (rt.world) {
        const impact = updateBookmarkNote(rt.world, cmd.entityType, cmd.entityId, cmd.note);
        rt.world = resolveImpacts(rt.world, [impact]);
        rt.syncWorld();
      }
    },
    ADVANCE_TUTORIAL_STEP: (cmd) => {
      if (rt.world) {
        const impact = svcAdvanceTutorialStep(rt.world, cmd.step);
        rt.world = resolveImpacts(rt.world, [impact]);
        rt.syncWorld();
      }
    },
    SET_TUTORIAL_FLAG: (cmd) => {
      if (rt.world) {
        const impact = svcSetTutorialFlag(rt.world, cmd.flag);
        rt.world = resolveImpacts(rt.world, [impact]);
        rt.syncWorld();
      }
    },
    FINISH_EXHIBITION: (cmd) => {
      if (rt.world) {
        const impact = svcFinishExhibition(rt.world, cmd.flag, cmd.step);
        rt.world = resolveImpacts(rt.world, [impact]);
        rt.syncWorld();
      }
    },
    COMPLETE_TUTORIAL: () => {
      if (rt.world) {
        const impact = svcCompleteTutorial(rt.world);
        rt.world = resolveImpacts(rt.world, [impact]);
        rt.syncWorld();
      }
    },
    ACCEPT_EXHIBITION: (cmd) => acceptExhibitionCmd(rt, cmd),
    DECLINE_EXHIBITION: (cmd) => {
      if (rt.world) {
        const remaining = (rt.world.pendingExhibitions ?? []).filter(
          (i) => i.id !== cmd.invitationId
        );
        rt.world = { ...rt.world, pendingExhibitions: remaining };
        rt.syncAndDigest();
      }
    },
    GO_ON_HOLIDAY: (cmd) => goOnHolidayCmd(rt, cmd),
    TRIGGER_SUCCESSION: (cmd) => {
      if (rt.world) {
        const impact = legacy.DynastyService.triggerSuccession(
          rt.world,
          cmd.heyaId,
          cmd.successorId
        );
        rt.world = resolveImpacts(rt.world, [impact]);
        rt.syncAndDigest();
      }
    },
  };
}
