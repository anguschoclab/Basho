import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useGame } from "@/contexts/useGame";

export function useRequireWorld(redirectTo: string = "/main-menu"): boolean {
  const { state } = useGame();
  const navigate = useNavigate();
  const world = state.world;

  useEffect(() => {
    if (!world) navigate({ to: redirectTo, replace: true });
  }, [world, navigate, redirectTo]);

  return !!world;
}
