import { type ReactNode } from "react";
import { useRequireWorld } from "@/hooks/useRequireWorld";
import { PageLoader } from "@/components/PageLoader";

/**
 * Wrapper component that renders children only when a world is loaded.
 * Restores the autosave in place on cold boot, or redirects to /main-menu
 * when there is nothing to restore. Renders the page loader while the
 * world is absent so reloads never show a blank screen.
 */
export function RequireWorld({
  children,
  redirectTo = "/main-menu",
}: {
  children: ReactNode;
  redirectTo?: string;
}) {
  const hasWorld = useRequireWorld(redirectTo);

  if (!hasWorld) return <PageLoader />;
  return <>{children}</>;
}
