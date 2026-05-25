import { useGame } from "@/contexts/GameContext";

/**
 * Custom hook to retrieve the player's current heya (stable) from the game state.
 *
 * @returns An object containing the current world state and the player's heya, or null if not found.
 */
export function usePlayerHeya() {
  const { state } = useGame();
  const world = state.world;

  if (!world?.playerHeyaId) return { world, heya: null };

  const heya = world.heyas.get(world.playerHeyaId);
  return { world, heya: heya || null };
}
