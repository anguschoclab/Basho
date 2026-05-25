// Reusable clickable name component for rikishi, stable, and oyakata names
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

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

const routeMap: Record<NameType, string> = {
  rikishi: "/rikishi",
  stable: "/stable",
  oyakata: "/oyakata", // Oyakata links to their profile page
};

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
  const basePath = routeMap[type];
  const to = `${basePath}/${id}`;

  return (
    <Link
      to={to}
      className={cn(
        "cursor-pointer hover:text-primary hover:underline underline-offset-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 rounded-sm",
        className
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {children || name}
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
 * @param props - Component properties
 * @param props.id - The unique identifier for the oyakata
 * @param props.name - The display name of the oyakata
 * @param props.className - Optional CSS classes for styling
 * @param props.children - Optional children to render instead of the name
 */
export function OyakataName({ id, name, className, children }: Omit<ClickableNameProps, "type">) {
  return (
    <ClickableName type="oyakata" id={id} name={name} className={className}>
      {children}
    </ClickableName>
  );
}
