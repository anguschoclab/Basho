// Reusable clickable name component for rikishi, stable, and oyakata names
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

type NameType = "rikishi" | "stable" | "oyakata";

interface ClickableNameProps {
  type: NameType;
  id: string;
  name?: string;
  className?: string;
  children?: React.ReactNode;
}

export function ClickableName({ 
  type, 
  id, 
  name, 
  className,
  children 
}: ClickableNameProps) {
  
  if (type === "rikishi") {
    return (
      <Link
        to="/rikishi/$rikishiId"
        params={{ rikishiId: id }}
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

  if (type === "stable") {
    return (
      <Link
        to="/stable/$id"
        params={{ id }}
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

  return (
    <Link 
      to="/oyakata"
      search={{ id }}
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
