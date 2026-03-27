/**
 * WorkerInitializer.tsx
 * =====================
 * Initializes the Engine Worker on mount.
 */

import { useEffect } from "react";
import { useGameStore } from "../../store/gameStore";

export function WorkerInitializer() {
  const initWorker = useGameStore((state) => state.initWorker);

  useEffect(() => {
    initWorker();
  }, [initWorker]);

  return null;
}
