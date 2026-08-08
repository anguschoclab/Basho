import { type ReactNode } from "react";
import { useRequireWorld } from "@/hooks/useRequireWorld";

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
