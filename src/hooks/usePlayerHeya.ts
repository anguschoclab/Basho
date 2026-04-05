import { useGame } from "@/contexts/GameContext";

export function usePlayerHeya() {
  const { state } = useGame();
  const world = state.world;

  if (!world?.playerHeyaId) return { world, heya: null };

  const heya = world.heyas.get(world.playerHeyaId);
  return { world, heya: heya || null };
}
