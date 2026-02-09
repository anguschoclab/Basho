// Reusable clickable name component for rikishi, stable, and oyakata names
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

type NameType = "rikishi" | "stable" | "oyakata";

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

export function ClickableName({ 
  type, 
  id, 
  name, 
  className,
  children 
}: ClickableNameProps) {
  const basePath = routeMap[type];
  const to = `${basePath}/${id}`;
  
  return (
    <Link 
      to={to} 
      className={cn(
        "cursor-pointer hover:text-primary hover:underline underline-offset-2 transition-colors",
        className
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {children || name}
    </Link>
  );
}

// Convenience components for specific types
export function RikishiName({ id, name, className, children }: Omit<ClickableNameProps, 'type'>) {
  return <ClickableName type="rikishi" id={id} name={name} className={className}>{children}</ClickableName>;
}

export function StableName({ id, name, className, children }: Omit<ClickableNameProps, 'type'>) {
  return <ClickableName type="stable" id={id} name={name} className={className}>{children}</ClickableName>;
}

export function OyakataName({ id, name, className, children }: Omit<ClickableNameProps, 'type'>) {
  return <ClickableName type="oyakata" id={id} name={name} className={className}>{children}</ClickableName>;
}
