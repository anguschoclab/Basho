import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Keyboard, PanelRightOpen } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SHORTCUT_REFERENCE } from "@/hooks/useKeyboardShortcuts";

interface FloatingShortcutsProps {
  eventLogOpen: boolean;
  setEventLogOpen: (open: boolean) => void;
}

export function FloatingShortcuts({ eventLogOpen, setEventLogOpen }: FloatingShortcutsProps) {
  return (
    <div className="fixed bottom-4 right-4 z-40 flex items-center gap-2">
      {!eventLogOpen && (
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 bg-card shadow-sm border-border/50 hover:bg-accent"
          onClick={() => setEventLogOpen(true)}
          title="Open Event Log"
          aria-label="Open Event Log"
        >
          <PanelRightOpen className="h-4 w-4 text-muted-foreground" />
        </Button>
      )}

      <Tooltip>
        <TooltipTrigger asChild>
          <div className="h-9 w-9 flex items-center justify-center rounded-lg bg-card/80 backdrop-blur border border-border/50 cursor-help shadow-sm">
            <Keyboard className="h-4 w-4 text-muted-foreground" />
          </div>
        </TooltipTrigger>
        <TooltipContent side="left" className="p-3 w-64">
          <div className="space-y-2">
            <div className="font-semibold text-xs border-b pb-1.5 mb-2">Keyboard Shortcuts</div>
            {SHORTCUT_REFERENCE.map((s) => (
              <div key={s.key} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{s.action}</span>
                <Badge variant="secondary" className="font-mono text-[10px] px-1.5 py-0 h-4">
                  {s.key}
                </Badge>
              </div>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
