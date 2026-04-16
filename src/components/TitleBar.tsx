import { useEffect, useState } from "react";
import { Minus, Square, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TitleBarProps {
  title?: string;
}

export function TitleBar({ title = "Sumo Manager Pro" }: TitleBarProps) {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    // Check if running in Electron
    const isElectron = typeof window !== "undefined" && window.__ELECTRON__;
    if (!isElectron) return;

    // Sync maximize state with actual window state
    const checkMaximized = async () => {
      if (window.electronCustom?.window) {
        const maximized = await window.electronCustom.window.isMaximized();
        setIsMaximized(maximized);
      }
    };

    checkMaximized();

    // Check periodically to sync with external changes (keyboard shortcuts, etc.)
    const interval = setInterval(checkMaximized, 500);

    return () => clearInterval(interval);
  }, []);

  const handleMinimize = () => {
    if (window.electronCustom?.window) {
      window.electronCustom.window.minimize();
    }
  };

  const handleMaximize = () => {
    if (window.electronCustom?.window) {
      window.electronCustom.window.maximize();
      setIsMaximized(!isMaximized);
    }
  };

  const handleClose = () => {
    if (window.electronCustom?.window) {
      window.electronCustom.window.close();
    }
  };

  const isElectron = typeof window !== "undefined" && window.__ELECTRON__;

  if (!isElectron) {
    return null; // Don't show title bar in web builds
  }

  return (
    <div
      className="flex items-center justify-between h-8 bg-background select-none"
      style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
    >
      <div className="flex items-center px-3">
        <span className="text-xs text-muted-foreground font-medium">{title}</span>
      </div>

      <div
        className="flex items-center"
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={handleMinimize}
          className="w-8 h-8 rounded-none flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Minimize"
        >
          <Minus size={14} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleMaximize}
          className="w-8 h-8 rounded-none flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          aria-label={isMaximized ? "Restore" : "Maximize"}
        >
          <Square size={12} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClose}
          className="w-8 h-8 rounded-none flex items-center justify-center hover:bg-destructive text-muted-foreground hover:text-white transition-colors"
          aria-label="Close"
        >
          <X size={14} />
        </Button>
      </div>
    </div>
  );
}
