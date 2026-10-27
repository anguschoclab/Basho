/**
 * src/contexts/GameContext.tsx
 * ===========================
 * Game State Context Provider
 *
 * Provides the main game state context with actions for world management,
 * basho simulation, and UI interactions. Action domains live under
 * ./provider/ — this component only composes them.
 *
 * @see gameReducer for the main reducer logic
 * @see gameActions for action creators
 * @see gameTypes for type definitions
 */

import { useReducer, useMemo, useTransition, ReactNode } from "react";
import { registerElectronStorage } from "@/contexts/electronStorageProvider";

// Register electron-store as the engine's storage backend (falls back to localStorage for web builds)
registerElectronStorage();

import { initialGameState } from "@/contexts/gameTypes";
import { gameReducer } from "@/contexts/gameReducer";

// Re-export types so existing imports from GameContext still work
export type { GamePhase, GameState } from "@/contexts/gameTypes";

import { GameContext, type GameContextValue } from "@/contexts/gameContextInstance";
import { useWorkerSync } from "@/contexts/provider/useWorkerSync";
import { useFlowActions } from "@/contexts/provider/useFlowActions";
import { useCommandActions } from "@/contexts/provider/useCommandActions";
import { useSaveQueryActions } from "@/contexts/provider/useSaveQueryActions";

// === PROVIDER ===

/**
 * Game provider component.
 * Wraps the application with the game context provider.
 *
 * @param {Object} props - Component props
 * @param {ReactNode} props.children - Child components to wrap
 */
export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialGameState);
  const [isPending, startTransition] = useTransition();

  const { digest } = useWorkerSync(state, dispatch, startTransition);
  const flow = useFlowActions(state, dispatch, startTransition);
  const commands = useCommandActions(state);
  const saves = useSaveQueryActions(state, dispatch);

  const value: GameContextValue = useMemo(
    () => ({ state, digest, isPending, ...flow, ...commands, ...saves }),
    [state, digest, isPending, flow, commands, saves]
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

// === HOOK ===
// useGame has been moved to ./useGame.ts to satisfy react-refresh/only-export-components.
