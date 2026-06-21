import { Button } from "@/components/ui/button";
import { RefreshCw, Dices, Database } from "lucide-react";
import { safeShortSeed } from "@/utils/engineUtils";

interface Props {
  seed: string;
  worldSeed?: string;
  showSeedInput: boolean;
  onToggleSeedInput: () => void;
  onReroll: () => void;
}

export function MainMenuFooter({
  seed,
  worldSeed,
  showSeedInput,
  onToggleSeedInput,
  onReroll,
}: Props) {
  const displaySeed = worldSeed || seed;

  return (
    <footer className="w-full border-t border-border/20 py-8 px-6 flex flex-col items-center gap-6 bg-arena-ground">
      {/* World Generation Controls */}
      <div className="flex flex-wrap items-center justify-center gap-8 text-center">
        <div className="space-y-1">
          <p className="stat-label text-gold/60">WORLD SEED</p>
          <p className="font-mono text-xs text-gold tracking-widest uppercase">
            {safeShortSeed(displaySeed)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-3 text-[10px] font-mono font-bold uppercase tracking-widest"
            onClick={onReroll}
          >
            <RefreshCw className="h-3.5 w-3.5 mr-2" /> Reroll World
          </Button>
          <Button
            variant={showSeedInput ? "default" : "outline"}
            size="sm"
            className="h-8 px-3 text-[10px] font-mono font-bold uppercase tracking-widest"
            onClick={onToggleSeedInput}
          >
            <Dices className="h-3.5 w-3.5 mr-2" /> {showSeedInput ? "Hide Seed" : "Manual Seed"}
          </Button>
        </div>
      </div>

      <div className="w-full max-w-md h-px bg-gold/10" />

      {/* Archive & Copyright */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-muted-foreground hover:text-gold transition-colors"
          onClick={() => document.getElementById("archive-trigger")?.click()}
        >
          <Database className="w-3.5 h-3.5" />
          Career Archives
        </Button>
      </div>
      <div className="text-center space-y-2">
        <p className="text-[10px] font-display font-bold uppercase tracking-[0.4em] text-gold/30">
          Reach the Summit — 頂点を目指せ
        </p>
        <p className="text-[9px] font-mono text-muted-foreground/30 uppercase tracking-widest">
          © 2026 Sumo Manager Pro · Institutional Grade Simulation
        </p>
      </div>
    </footer>
  );
}
