/**
 * useMainMenuState.ts
 *
 * MainMenu state — world-seed sync, stable selection data, and
 * reroll/seed handlers.
 */

import { useState, useMemo, useEffect, useRef } from "react";
import { useGame } from "@/contexts/useGame";
import { useGameStore } from "@/store/gameStore";
import { makeDeterministicSeed } from "@/presenters/engineAccess";
import {
  selectStablesByStature,
  selectRecommendedStables,
} from "@/presenters/projections/stableSelectionProjections";
import { getSekitoriInHeya } from "@/presenters/engineAccess";
import { getAllHeyas } from "@/presenters/worldAccess";
import type { Heya } from "@/engine/types/heya";
import type { StatureBand, StableSelectionMode } from "@/engine/types/narrative";

export function useMainMenuState() {
  const game = useGame();
  const { createWorld, state, quickSave } = game;

  const [seed, setSeed] = useState("");
  const [showSeedInput, setShowSeedInput] = useState(false);
  const [selectionMode, setSelectionMode] = useState<StableSelectionMode>("recommended");
  const [selectedHeyaId, setSelectedHeyaId] = useState<string | null>(null);
  const [previewHeya, setPreviewHeya] = useState<Heya | null>(null);

  const seedRef = useRef(seed);
  seedRef.current = seed;

  const workerWorld = useGameStore((s) => s.workerWorld);

  // Sync world seed
  useEffect(() => {
    // workerWorld is set synchronously on WORLD_UPDATED, ahead of the
    // startTransition that lands it in state.world — if it exists, a world
    // is already in transit and auto-creating would post a competing
    // START_WORLD whose result can clobber the real one.
    if (!state?.world && !workerWorld) {
      const worldSeed = makeDeterministicSeed("world");
      setSeed(worldSeed);
      if (typeof createWorld === "function") createWorld(worldSeed);
    } else if (state.world?.seed && seedRef.current !== state.world.seed) {
      setSeed(state.world.seed);
    }
  }, [state?.world, workerWorld, createWorld]);

  const stables = useMemo(() => {
    if (!state?.world) return [];
    return getAllHeyas(state.world);
  }, [state?.world]);

  const sekitoriCounts = useMemo(() => {
    const map = new Map<string, number>();
    if (!state?.world) return map;
    for (const h of getAllHeyas(state.world)) {
      map.set(h.id, getSekitoriInHeya(state.world, h.id));
    }
    return map;
  }, [state?.world]);

  const recommendedStables = useMemo(() => {
    if (!state?.world) return [];
    return selectRecommendedStables(state.world);
  }, [state?.world]);

  const stablesByStature = useMemo(() => {
    if (!state?.world) {
      return {
        legendary: [],
        powerful: [],
        established: [],
        rebuilding: [],
        fragile: [],
        new: [],
      } as Record<StatureBand, Heya[]>;
    }
    return selectStablesByStature(state.world);
  }, [state?.world]);

  const handleRerollWorld = () => {
    const newSeed = makeDeterministicSeed("world");
    setSeed(newSeed);
    setSelectedHeyaId(null);
    createWorld(newSeed);
  };

  const handleSetSeed = () => {
    if (!seed.trim()) return;
    createWorld(seed.trim());
    setShowSeedInput(false);
  };

  // Autosave when playerHeyaId is set (world is fully initialized)
  useEffect(() => {
    const gameState = game as { state?: { playerHeyaId?: string } };
    if (gameState.state?.playerHeyaId && quickSave) {
      quickSave();
    }
  }, [game, quickSave]);

  return {
    world: state?.world ?? null,
    seed,
    setSeed,
    showSeedInput,
    setShowSeedInput,
    selectionMode,
    setSelectionMode,
    selectedHeyaId,
    setSelectedHeyaId,
    previewHeya,
    setPreviewHeya,
    stables,
    sekitoriCounts,
    recommendedStables,
    stablesByStature,
    handleRerollWorld,
    handleSetSeed,
  };
}
