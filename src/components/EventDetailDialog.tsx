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
import { EngineEvent } from "@/engine/types/events";
import { getEventRoute } from "./layout/eventLogHelpers";
import { Link } from "@tanstack/react-router";
import {
  Trophy,
  Swords,
  HeartPulse,
  Coins,
  GraduationCap,
  Scale,
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

const importanceMap = {
  minor: { label: "Minor", variant: "secondary" as const },
  notable: { label: "Notable", variant: "default" as const },
  major: {
    label: "Major",
    variant: "default" as const,
    className: "bg-orange-500 hover:bg-orange-600",
  },
  headline: { label: "Headline", variant: "destructive" as const },
};

const categoryIconMap: Record<string, React.ReactNode> = {
  basho: <Trophy className="h-5 w-5 text-yellow-500" />,
  match: <Swords className="h-5 w-5 text-red-500" />,
  training: <GraduationCap className="h-5 w-5 text-blue-500" />,
  injury: <HeartPulse className="h-5 w-5 text-red-500" />,
  economy: <Coins className="h-5 w-5 text-green-500" />,
  sponsor: <Coins className="h-5 w-5 text-green-500" />,
  scouting: <Search className="h-5 w-5 text-purple-500" />,
  rivalry: <Swords className="h-5 w-5 text-orange-500" />,
  welfare: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
  media: <MessageCircle className="h-5 w-5 text-zinc-400" />,
  milestone: <Star className="h-5 w-5 text-gold" />,
  facility: <Wrench className="h-5 w-5 text-zinc-400" />,
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
      <DialogContent className="sm:max-w-[500px] overflow-hidden border-none p-0 bg-zinc-950 text-zinc-100 shadow-2xl">
        {/* Header with Category Color Bar */}
        <div
          className={cn(
            "h-1.5 w-full",
            event.importance === "headline"
              ? "bg-red-500"
              : event.importance === "major"
                ? "bg-orange-500"
                : "bg-blue-500"
          )}
        />

        <div className="p-6 space-y-6">
          <DialogHeader className="space-y-4">
            <div className="flex items-center justify-between">
              <Badge
                variant={importance.variant}
                className={cn("uppercase tracking-wider px-3 py-1", importance.className)}
              >
                {importance.label}
              </Badge>
              <div className="flex items-center gap-2 text-zinc-400 text-sm">
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

          <div className="flex gap-4 p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/50">
            <div className="shrink-0 mt-1">
              {categoryIconMap[event.category] || <Info className="h-5 w-5 text-zinc-400" />}
            </div>
            <div className="space-y-1">
              <div className="text-xs uppercase font-bold text-zinc-500 tracking-widest">
                {event.category}
              </div>
              <DialogDescription className="text-zinc-300 text-base leading-relaxed">
                <MentionText text={event.summary} />
              </DialogDescription>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
            >
              Close
            </Button>
            {targetRoute && (
              <Button asChild className="bg-blue-600 hover:bg-blue-500 text-white gap-2">
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
