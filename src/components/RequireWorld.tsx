import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useGame } from "@/contexts/useGame";

/**
 * Hook that redirects to /main-menu if no world is loaded.
 * Returns true when world is available, false during redirect.
 */
export function useRequireWorld(redirectTo: string = "/main-menu"): boolean {
  const { state } = useGame();
  const navigate = useNavigate();
  const world = state.world;

  useEffect(() => {
    if (!world) navigate({ to: redirectTo, replace: true });
  }, [world, navigate, redirectTo]);

  return !!world;
}

/**
 * Wrapper component that renders children only when a world is loaded.
 * Redirects to /main-menu (or custom route) when world is null.
 * Renders null during redirect to prevent flash of empty content.
 */
export function RequireWorld({
  children,
  redirectTo = "/main-menu",
}: {
  children: ReactNode;
  redirectTo?: string;
}) {
  const hasWorld = useRequireWorld(redirectTo);

  if (!hasWorld) return null;
  return <>{children}</>;
}
