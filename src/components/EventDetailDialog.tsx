import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MentionText } from "./MentionText";
import type { EngineEvent } from "@/engine/types/events";
import { getEventRoute } from "./layout/eventLogHelpers";
import { Link } from "@tanstack/react-router";
import {
  Trophy,
  Swords,
  HeartPulse,
  Coins,
  GraduationCap,
  Star,
  AlertTriangle,
  MessageCircle,
  Search,
  Wrench,
  Info,
  ChevronRight,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Props for the EventDetailDialog component.
 */
interface EventDetailDialogProps {
  /** The engine event to display in the dialog. If null, the dialog won't render content. */
  event: EngineEvent | null;
  /** Whether the dialog is currently open. */
  isOpen: boolean;
  /** Callback function to execute when the dialog is closed. */
  onClose: () => void;
}

type ImportanceEntry = {
  label: string;
  variant: "secondary" | "default" | "destructive";
  className: string;
};

const importanceMap: Record<string, ImportanceEntry> = {
  minor: { label: "Minor", variant: "secondary", className: "" },
  notable: { label: "Notable", variant: "default", className: "" },
  major: {
    label: "Major",
    variant: "default",
    className: "bg-warning hover:bg-warning",
  },
  headline: { label: "Headline", variant: "destructive", className: "" },
};

const categoryIconMap: Record<string, React.ReactNode> = {
  basho: <Trophy className="h-5 w-5 text-gold" />,
  match: <Swords className="h-5 w-5 text-destructive" />,
  training: <GraduationCap className="h-5 w-5 text-primary" />,
  injury: <HeartPulse className="h-5 w-5 text-destructive" />,
  economy: <Coins className="h-5 w-5 text-success" />,
  sponsor: <Coins className="h-5 w-5 text-success" />,
  scouting: <Search className="h-5 w-5 text-accent" />,
  rivalry: <Swords className="h-5 w-5 text-warning" />,
  welfare: <AlertTriangle className="h-5 w-5 text-gold" />,
  media: <MessageCircle className="h-5 w-5 text-muted-foreground" />,
  milestone: <Star className="h-5 w-5 text-gold" />,
  facility: <Wrench className="h-5 w-5 text-muted-foreground" />,
};

/**
 * A dialog component that displays detailed information about a simulation event.
 * Shows the event's title, summary, category icon, and importance badge.
 *
 * @param props - Component properties
 */
export function EventDetailDialog({ event, isOpen, onClose }: EventDetailDialogProps) {
  if (!event) return null;

  const importance = importanceMap[event.importance] || importanceMap.minor;
  const targetRoute = getEventRoute(event);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] overflow-hidden border-none p-0 bg-card text-muted-foreground shadow-2xl">
        {/* Header with Category Color Bar */}
        <div
          className={cn(
            "h-1.5 w-full",
            event.importance === "headline"
              ? "bg-destructive"
              : event.importance === "major"
                ? "bg-warning"
                : "bg-primary"
          )}
        />

        <div className="p-6 space-y-6">
          <DialogHeader className="space-y-4">
            <div className="flex items-center justify-between">
              <Badge
                variant={importance.variant}
                className={cn("uppercase tracking-wider px-3 py-1", importance.className || "")}
              >
                {importance.label}
              </Badge>
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Calendar className="h-4 w-4" />
                <span>
                  Year {event.year}, Week {event.week}
                </span>
              </div>
            </div>

            <DialogTitle className="text-2xl font-bold tracking-tight text-white leading-tight">
              <MentionText text={event.title} />
            </DialogTitle>
          </DialogHeader>

          <div className="flex gap-4 p-4 rounded-xl bg-card/50 border border-border/50">
            <div className="shrink-0 mt-1">
              {categoryIconMap[event.category] || (
                <Info className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div className="space-y-1">
              <div className="text-xs uppercase font-bold text-muted-foreground tracking-widest">
                {event.category}
              </div>
              <DialogDescription className="text-muted-foreground text-base leading-relaxed">
                <MentionText text={event.summary} />
              </DialogDescription>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="border-border text-muted-foreground hover:bg-card hover:text-muted-foreground"
            >
              Close
            </Button>
            {targetRoute && (
              <Button asChild className="bg-primary hover:bg-primary text-white gap-2">
                <Link to={targetRoute} onClick={onClose}>
                  View Details
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            )}
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
