import { Badge } from "@/components/ui/badge";
import { ArrowUp, ArrowDown, Minus, ChevronsUp, ChevronsDown, ArrowUpRight } from "lucide-react";
import type { UIRankDelta } from "@/presenters/uiModels";

/** Defines the structure for props. */
interface Props {
  delta: UIRankDelta;
}

/**
 * rank change indicator.
 * @param { delta } - The rank delta token from the projection layer.
 */
export function RankChangeIndicator({ delta }: Props) {
  if (delta.type === "new") {
    return (
      <Badge
        variant="outline"
        className="text-[8px] h-4 px-1 border-primary/40 text-primary gap-0.5"
      >
        <ArrowUpRight className="h-2.5 w-2.5" /> NEW
      </Badge>
    );
  }

  if (delta.type === "unchanged") {
    return <Minus className="h-3 w-3 text-muted-foreground/40" />;
  }

  const steps = delta.steps;

  if (delta.type === "up") {
    const Icon = steps >= 5 ? ChevronsUp : ArrowUp;
    return (
      <span className="flex items-center gap-0.5 text-success">
        <Icon className="h-3 w-3" />
        <span className="text-[9px] font-mono font-bold">+{steps}</span>
      </span>
    );
  } else {
    const Icon = steps >= 5 ? ChevronsDown : ArrowDown;
    return (
      <span className="flex items-center gap-0.5 text-destructive">
        <Icon className="h-3 w-3" />
        <span className="text-[9px] font-mono font-bold">−{steps}</span>
      </span>
    );
  }
}
