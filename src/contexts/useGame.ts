import { use } from "react";
import { GameContext } from "./gameContextInstance";

/** Use game. */
export function useGame() {
  const context = use(GameContext);
  if (!context) throw new Error("useGame must be used within a GameProvider");
  return context;
}
