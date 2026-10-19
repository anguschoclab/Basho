// Reusable clickable name component for rikishi, stable, and oyakata names
import { use } from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { GameContext } from "@/contexts/gameContextInstance";

/** Type representing name type. */
type NameType = "rikishi" | "stable" | "oyakata";

/** Defines the structure for clickable name props. */
interface ClickableNameProps {
  type: NameType;
  id: string;
  name: string;
  className?: string;
  children?: React.ReactNode;
}

const routeMap: Record<Exclude<NameType, "oyakata">, string> = {
  rikishi: "/rikishi",
  stable: "/stable",
};

const SAFE_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

function sanitizeId(id: string): string {
  if (!id) return "";
  return SAFE_ID_PATTERN.test(id) ? id : "";
}

/**
 * A reusable component for clickable links to rikishi, stables, and oyakata profiles.
 *
 * @param props - Component properties
 * @param props.type - The type of entity (rikishi, stable, or oyakata)
 * @param props.id - The unique identifier for the entity
 * @param props.name - The display name of the entity
 * @param props.className - Optional CSS classes for styling
 * @param props.children - Optional children to render instead of the name
 */
export function ClickableName({ type, id, name, className, children }: ClickableNameProps) {
  const ctx = use(GameContext);
  const safeId = sanitizeId(id);

  // There is no /oyakata/$id route — an oyakata mention links to their stable
  // page instead; unresolved IDs render as plain text rather than a dead link.
  if (type === "oyakata") {
    const heyaId = ctx?.state?.world?.oyakata.get(id)?.heyaId;
    const safeHeyaId = sanitizeId(heyaId ?? "");
    if (!safeHeyaId) {
      return <span className={className}>{children ?? name}</span>;
    }
    return (
      <Link
        to="/stable/$id"
        params={{ id: safeHeyaId }}
        className={cn(
          "cursor-pointer hover:text-primary hover:underline underline-offset-2 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 rounded-xs",
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {children ?? name}
      </Link>
    );
  }

  const to = `${routeMap[type]}/${safeId}`;

  return (
    <Link
      to={to}
      className={cn(
        "cursor-pointer hover:text-primary hover:underline underline-offset-2 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 rounded-xs",
        className
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {children ?? name}
    </Link>
  );
}

// Convenience components for specific types

/**
 * A convenience component for clickable rikishi names.
 *
 * @param props - Component properties
 * @param props.id - The unique identifier for the rikishi
 * @param props.name - The display name of the rikishi
 * @param props.className - Optional CSS classes for styling
 * @param props.children - Optional children to render instead of the name
 */
export function RikishiName({ id, name, className, children }: Omit<ClickableNameProps, "type">) {
  return (
    <ClickableName type="rikishi" id={id} name={name} className={className}>
      {children}
    </ClickableName>
  );
}

/**
 * A convenience component for clickable stable names.
 *
 * @param props - Component properties
 * @param props.id - The unique identifier for the stable
 * @param props.name - The display name of the stable
 * @param props.className - Optional CSS classes for styling
 * @param props.children - Optional children to render instead of the name
 */
export function StableName({ id, name, className, children }: Omit<ClickableNameProps, "type">) {
  return (
    <ClickableName type="stable" id={id} name={name} className={className}>
      {children}
    </ClickableName>
  );
}

/**
 * A convenience component for clickable oyakata names.
 *
 * There is no /oyakata/$id route — when `heyaId` is provided the name links to
 * the oyakata's stable page (/stable/$heyaId); otherwise it renders plain
 * text rather than a dead link.
 *
 * @param props - Component properties
 * @param props.id - The unique identifier for the oyakata
 * @param props.heyaId - The oyakata's stable id; links to that stable's page
 * @param props.name - The display name of the oyakata
 * @param props.className - Optional CSS classes for styling
 * @param props.children - Optional children to render instead of the name
 */
export function OyakataName({
  heyaId,
  name,
  className,
  children,
}: Omit<ClickableNameProps, "type"> & { heyaId?: string }) {
  if (!heyaId) {
    return <span className={className}>{children ?? name}</span>;
  }
  return (
    <ClickableName type="stable" id={heyaId} name={name} className={className}>
      {children}
    </ClickableName>
  );
}
