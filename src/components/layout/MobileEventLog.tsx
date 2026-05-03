/**
 * MobileEventLog.tsx
 * ==================
 * Bottom sheet event log for mobile/tablet screens.
 * Alternative to the desktop sidebar event log.
 */

import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Bell, X } from "lucide-react";
import { EventFeed } from "@/components/dashboard/EventFeed";
import { useGameStore } from "@/store/gameStore";
import { cn } from "@/lib/utils";

interface MobileEventLogProps {
  className?: string;
}

export function MobileEventLog({ className }: MobileEventLogProps) {
  const [open, setOpen] = useState(false);
  const eventCount = useGameStore((s) => s.workerWorld?.events?.log?.length ?? 0);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="secondary"
          size="icon"
          aria-label={
            eventCount > 0
              ? `Open Event Log (${Math.min(eventCount, 99)}${eventCount > 99 ? "+" : ""} unread events)`
              : "Open Event Log"
          }
          className={cn(
            "fixed bottom-4 right-4 h-12 w-12 rounded-full shadow-lg z-50",
            "xl:hidden", // Only show on mobile/tablet (hidden on xl desktop)
            className
          )}
        >
          <Bell className="h-5 w-5" />
          {eventCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-[10px] font-bold flex items-center justify-center text-primary-foreground">
              {Math.min(eventCount, 99)}
            </span>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent side="bottom" className="h-[80vh] flex flex-col bg-card">
        <SheetHeader className="flex flex-row items-center justify-between border-b pb-4">
          <SheetTitle className="font-display text-lg">Event Log</SheetTitle>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Close Event Log"
            onClick={() => setOpen(false)}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </SheetHeader>

        <div className="flex-1 overflow-hidden py-4">
          <EventFeed maxEvents={20} minImportance="notable" />
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default MobileEventLog;
