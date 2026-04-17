/**
 * WizardFooter.tsx
 *
 * Persistence info console for new game wizard.
 */

/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { formatYenToMan } from "@/utils/engineUtils";
import { OYAKATA_BACKGROUNDS, ICHIMON_FACTIONS } from "./wizardConstants";

interface WizardFooterProps {
  oyakataName: string;
  background: string;
  ichimon: string;
  world: { year: number };
}

export function WizardFooter({ oyakataName, background, ichimon, world }: WizardFooterProps) {
  const currentBg = OYAKATA_BACKGROUNDS.find((b) => b.id === background)!;

  return (
    <footer className="fixed bottom-0 w-full bg-background/80 border-t border-border/40 py-4 px-8 z-30 animate-in slide-in-from-bottom-5 duration-700 delay-500 fill-mode-both">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-10">
          <div>
            <p className="text-[8px] font-black uppercase tracking-[0.3em] text-muted-foreground mb-0.5">
              Oyakata
            </p>
            <p className="font-display font-black text-xs uppercase tracking-tighter">
              {oyakataName || "UNREGISTERED"}
            </p>
          </div>
          <div className="hidden md:block w-px h-6 bg-border/40" />
          <div className="hidden md:block">
            <p className="text-[8px] font-black uppercase tracking-[0.3em] text-muted-foreground mb-0.5">
              Endowment
            </p>
            <p className="font-display font-black text-xs uppercase tracking-tighter text-success">
              {formatYenToMan(currentBg.bonuses.funds)}
            </p>
          </div>
          <div className="hidden lg:block w-px h-6 bg-border/40" />
          <div className="hidden lg:block">
            <p className="text-[8px] font-black uppercase tracking-[0.3em] text-muted-foreground mb-0.5">
              Allegiance
            </p>
            <p className="font-display font-black text-xs uppercase tracking-tighter text-primary">
              {ICHIMON_FACTIONS.find((f) => f.id === ichimon)?.name || "NONE"}
            </p>
          </div>
        </div>
        <div className="text-[9px] font-black uppercase tracking-[0.4em] opacity-30 select-none hidden sm:block">
          Association Record • Year {world.year}
        </div>
      </div>
    </footer>
  );
}
