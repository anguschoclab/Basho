/**
 * useBashoPageState.ts
 *
 * State and derived data for BashoPage — digest projections, bout
 * auto-show tracking, and day-advance/simulate handlers.
 */

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useGame } from "@/contexts/useGame";
import { projectBashoUIDigest } from "@/presenters/uiDigest";
import type { UIRikishi } from "@/presenters/uiModels";
import type { BoutTactic } from "@/engine/types/combat";
import type { BoutResult } from "@/engine/types/basho";
import type { BoutMatchUI } from "@/presenters/uiDigestTypes";
import { projectNakabi } from "@/presenters/nakabiProjections";
import { projectOfficials } from "@/presenters/officialsProjections";
import { projectCornerAdvice } from "@/presenters/projections/cornerAdviceProjection";

/** Defines the structure for selected bout. */
export interface SelectedBout {
  east: UIRikishi;
  west: UIRikishi;
  result: BoutResult;
  isPlayerBout: boolean;
}

/**
 * Make pair key.
 */
export function makePairKey(a: string, b: string) {
  return a < b ? `${a}__${b}` : `${b}__${a}`;
}

export function useBashoPageState() {
  const navigate = useNavigate();
  const { state, simulateBout, simulateAllBouts, advanceDay, endBasho, setBoutTactic } = useGame();
  const { world } = state;

  const [selectedBout, setSelectedBout] = useState<SelectedBout | null>(null);
  const [autoShowPlayerBout, setAutoShowPlayerBout] = useState<SelectedBout | null>(null);
  const [showEndBashoConfirm, setShowEndBashoConfirm] = useState(false);
  const [showScheduleOverview, setShowScheduleOverview] = useState(false);
  const lastAutoShownKeyRef = useRef<string | null>(null);

  const bashoDigest = useMemo(() => {
    if (!world) return null;
    return projectBashoUIDigest(world);
  }, [world]);

  const nakabiProjection = useMemo(() => {
    if (!world) return { summary: null, isNakabiDay: false };
    return projectNakabi(world);
  }, [world]);

  const officialsProjection = useMemo(() => {
    if (!world)
      return { gyoji: [], shimpan: [], topGyoji: null, totalBoutsOfficiated: 0, totalReversals: 0 };
    return projectOfficials(world);
  }, [world]);

  const cornerAdvice = useMemo(() => {
    if (!world || !bashoDigest) return null;
    return projectCornerAdvice(world, bashoDigest.playerRikishiIds);
  }, [world, bashoDigest]);

  const lastBoutKey = useMemo(() => {
    const last = state.lastBoutResult;
    if (!last || !bashoDigest) return null;
    return `${makePairKey(last.winnerRikishiId, last.loserRikishiId)}::${bashoDigest.day}::${last.kimarite || ""}`;
  }, [state.lastBoutResult, bashoDigest]);

  const nextBoutIndex = useMemo(() => {
    if (!bashoDigest) return -1;
    return bashoDigest.matches.findIndex((m: BoutMatchUI) => !m.result);
  }, [bashoDigest]);

  useEffect(() => {
    if (state.phase === "basho_recap" || state.phase === "basho_results") {
      navigate({ to: "/recap" });
    }
  }, [state.phase, navigate]);

  // Auto-show player bout logic reconstruction
  useEffect(() => {
    const last = state.lastBoutResult;
    if (
      !last ||
      !lastBoutKey ||
      lastAutoShownKeyRef.current === lastBoutKey ||
      selectedBout ||
      !bashoDigest
    )
      return;

    const matchToday = bashoDigest.matches.find(
      (m: BoutMatchUI) =>
        (m.eastRikishiId === last.winnerRikishiId && m.westRikishiId === last.loserRikishiId) ||
        (m.eastRikishiId === last.loserRikishiId && m.westRikishiId === last.winnerRikishiId)
    );

    if (matchToday && matchToday.isPlayerBout && matchToday.eastRikishi && matchToday.westRikishi) {
      setAutoShowPlayerBout({
        east: matchToday.eastRikishi,
        west: matchToday.westRikishi,
        result: last,
        isPlayerBout: true,
      });
      lastAutoShownKeyRef.current = lastBoutKey;
    }
  }, [bashoDigest, lastBoutKey, selectedBout, state.lastBoutResult]);

  const handleSimulateNext = useCallback(() => {
    if (nextBoutIndex >= 0) {
      const match = bashoDigest?.matches[nextBoutIndex];
      simulateBout(nextBoutIndex, match?.boutId);
    }
  }, [nextBoutIndex, simulateBout, bashoDigest]);

  const handleSimulateAll = useCallback(() => {
    simulateAllBouts();
  }, [simulateAllBouts]);

  const handleNextDay = useCallback(() => {
    if (bashoDigest && bashoDigest.day >= 15) setShowEndBashoConfirm(true);
    else advanceDay();
  }, [bashoDigest, advanceDay]);

  const handleTacticChange = useCallback(
    (id: string, tactic: string) => setBoutTactic(id, tactic as BoutTactic),
    [setBoutTactic]
  );

  const confirmEndBasho = useCallback(() => {
    setShowEndBashoConfirm(false);
    endBasho();
    navigate({ to: "/recap" });
  }, [endBasho, navigate]);

  const handleBoutClick = useCallback((match: BoutMatchUI) => {
    if (!match.result || !match.eastRikishi || !match.westRikishi) return;
    setSelectedBout({
      east: match.eastRikishi,
      west: match.westRikishi,
      result: match.result,
      isPlayerBout: match.isPlayerBout,
    });
  }, []);

  return {
    state,
    world,
    simulateBout,
    simulateAllBouts,
    bashoDigest,
    nakabiProjection,
    officialsProjection,
    cornerAdvice,
    nextBoutIndex,
    selectedBout,
    setSelectedBout,
    autoShowPlayerBout,
    setAutoShowPlayerBout,
    showEndBashoConfirm,
    setShowEndBashoConfirm,
    showScheduleOverview,
    setShowScheduleOverview,
    handleSimulateNext,
    handleSimulateAll,
    handleNextDay,
    handleTacticChange,
    confirmEndBasho,
    handleBoutClick,
  };
}
