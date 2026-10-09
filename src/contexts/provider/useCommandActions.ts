/**
 * useCommandActions.ts
 *
 * Worker-command passthrough actions for GameProvider — economy/
 * governance commands and social/tutorial commands dispatched to the
 * engine worker. `useCommandActions` composes both bags.
 */

import { useCallback, useMemo } from "react";
import { type HolidayConfig, type HolidayResult } from "@/engine/holiday";
import type { GameState } from "../gameTypes";
import { useGameStore } from "@/store/gameStore";

/** Economy + governance worker commands. */
function useGovernanceEconomyCommands(state: GameState) {
  const sendCommand = useGameStore((s) => s.sendCommand);

  const buildInfrastructure = useCallback(
    (heyaId: string, facilityId: import("@/engine/types/infrastructure").FacilityId) => {
      sendCommand({ type: "BUILD_INFRASTRUCTURE", heyaId, facilityId });
    },
    [sendCommand]
  );

  const issueRuling = useCallback(
    (rulingId: string, severity: "lenient" | "standard" | "harsh") => {
      sendCommand({ type: "ISSUE_RULING", rulingId, severity });
    },
    [sendCommand]
  );

  const recruitSponsor = useCallback(
    (sponsorId: string) => {
      const heyaId = state.world?.playerHeyaId;
      if (!heyaId) return false;
      return sendCommand({ type: "RECRUIT_SPONSOR", heyaId, sponsorId });
    },
    [state.world?.playerHeyaId, sendCommand]
  );

  const applyPressConference = useCallback(
    (heyaId: string, effects: { reputation: number; morale: number; mediaHeat: number }) => {
      sendCommand({
        type: "APPLY_PRESS_CONFERENCE",
        heyaId,
        reputationDelta: effects.reputation,
        moraleDelta: effects.morale,
        mediaHeatDelta: effects.mediaHeat,
      });
    },
    [sendCommand]
  );

  const setHeyaDiet = useCallback(
    (heyaId: string, diet: import("@/engine/types/economy").DietRegimen) => {
      sendCommand({ type: "SET_HEYA_DIET", heyaId, diet });
    },
    [sendCommand]
  );

  const retireRikishi = useCallback(
    (rikishiId: string, reason: string) => {
      sendCommand({ type: "RETIRE_RIKISHI", rikishiId, reason });
    },
    [sendCommand]
  );

  const spendPoliticalCapital = useCallback(
    (heyaId: string, amount: number) => {
      sendCommand({ type: "SPEND_POLITICAL_CAPITAL", heyaId, amount });
    },
    [sendCommand]
  );

  const investInFacility = useCallback(
    (heyaId: string, axis: import("@/engine/facilities").FacilityAxis, points: number) => {
      sendCommand({ type: "INVEST_IN_FACILITY", heyaId, axis, points });
    },
    [sendCommand]
  );

  return useMemo(
    () => ({
      buildInfrastructure,
      issueRuling,
      recruitSponsor,
      applyPressConference,
      setHeyaDiet,
      retireRikishi,
      spendPoliticalCapital,
      investInFacility,
    }),
    [
      buildInfrastructure,
      issueRuling,
      recruitSponsor,
      applyPressConference,
      setHeyaDiet,
      retireRikishi,
      spendPoliticalCapital,
      investInFacility,
    ]
  );
}

/** Tutorial, scouting, social, and facility worker commands. */
function useSocialTutorialCommands() {
  const sendCommand = useGameStore((s) => s.sendCommand);

  const setScoutingInvestment = useCallback(
    (rikishiId: string, investment: import("@/engine/types/narrative").ScoutingInvestment) => {
      return sendCommand({ type: "SET_SCOUTING_INVESTMENT", rikishiId, investment });
    },
    [sendCommand]
  );

  const setKeshoConfig = useCallback(
    (rikishiId: string, config: Partial<import("@/engine/types/keshoMawashi").KeshoMawashi>) => {
      sendCommand({ type: "SET_KESHO_CONFIG", rikishiId, config });
    },
    [sendCommand]
  );

  const advanceTutorialStep = useCallback(
    (step: import("@/engine/types/tutorial").TutorialStep) => {
      sendCommand({ type: "ADVANCE_TUTORIAL_STEP", step });
    },
    [sendCommand]
  );

  const setTutorialFlag = useCallback(
    (flag: keyof import("@/engine/types/tutorial").TutorialFlags) => {
      sendCommand({ type: "SET_TUTORIAL_FLAG", flag });
    },
    [sendCommand]
  );

  const finishExhibition = useCallback(
    (
      flag: keyof import("@/engine/types/tutorial").TutorialFlags,
      step: import("@/engine/types/tutorial").TutorialStep
    ) => {
      sendCommand({ type: "FINISH_EXHIBITION", flag, step });
    },
    [sendCommand]
  );

  const completeTutorial = useCallback(() => {
    sendCommand({ type: "COMPLETE_TUTORIAL" });
  }, [sendCommand]);

  const goOnHoliday = useCallback(
    (config: HolidayConfig): HolidayResult | null => {
      // Route through the worker so the holiday runs on the worker thread
      // and the world state is synced back via the normal command pipeline.
      sendCommand({ type: "GO_ON_HOLIDAY", config });
      return null;
    },
    [sendCommand]
  );

  const assignMentor = useCallback(
    (mentorId: string, apprenticeId: string) => {
      sendCommand({ type: "ASSIGN_MENTOR", mentorId, apprenticeId });
    },
    [sendCommand]
  );

  const removeMentor = useCallback(
    (apprenticeId: string) => {
      sendCommand({ type: "REMOVE_MENTOR", apprenticeId });
    },
    [sendCommand]
  );

  const addSparringPair = useCallback(
    (heyaId: string, aId: string, bId: string) => {
      sendCommand({ type: "ADD_SPARRING_PAIR", heyaId, aId, bId });
    },
    [sendCommand]
  );

  const removeSparringPair = useCallback(
    (heyaId: string, aId: string, bId: string) => {
      sendCommand({ type: "REMOVE_SPARRING_PAIR", heyaId, aId, bId });
    },
    [sendCommand]
  );

  const bookmarkEntity = useCallback(
    (entityType: string, entityId: string, note?: string) => {
      sendCommand({ type: "BOOKMARK_ENTITY", entityType, entityId, note });
    },
    [sendCommand]
  );

  const unbookmarkEntity = useCallback(
    (entityType: string, entityId: string) => {
      sendCommand({ type: "UNBOOKMARK_ENTITY", entityType, entityId });
    },
    [sendCommand]
  );

  const updateBookmarkNote = useCallback(
    (entityType: string, entityId: string, note: string) => {
      sendCommand({ type: "UPDATE_BOOKMARK_NOTE", entityType, entityId, note });
    },
    [sendCommand]
  );

  return useMemo(
    () => ({
      setScoutingInvestment,
      setKeshoConfig,
      advanceTutorialStep,
      setTutorialFlag,
      finishExhibition,
      completeTutorial,
      goOnHoliday,
      assignMentor,
      removeMentor,
      addSparringPair,
      removeSparringPair,
      bookmarkEntity,
      unbookmarkEntity,
      updateBookmarkNote,
    }),
    [
      setScoutingInvestment,
      setKeshoConfig,
      advanceTutorialStep,
      setTutorialFlag,
      finishExhibition,
      completeTutorial,
      goOnHoliday,
      assignMentor,
      removeMentor,
      addSparringPair,
      removeSparringPair,
      bookmarkEntity,
      unbookmarkEntity,
      updateBookmarkNote,
    ]
  );
}

export function useCommandActions(state: GameState) {
  const gov = useGovernanceEconomyCommands(state);
  const social = useSocialTutorialCommands();
  return useMemo(() => ({ ...gov, ...social }), [gov, social]);
}
