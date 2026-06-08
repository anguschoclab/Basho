import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import type { Heya } from "@/engine/types/heya";

interface Props {
  selectedHeyaId: string | null;
  stables: Heya[];
  onBegin: (heyaId: string) => void;
}

export function MainMenuSelectedFooter({ selectedHeyaId, stables, onBegin }: Props) {
  if (!selectedHeyaId) return null;

  return (
    <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-full max-w-xl px-6 z-50 animate-in slide-in-from-bottom-10 duration-500">
      <div className="glass paper p-2 pl-6 rounded shadow-xl flex items-center justify-between border-gold/30">
        <div className="text-foreground min-w-0 pr-4">
          <p className="stat-label text-gold tracking-[0.2em] mb-0.5">READY TO BEGIN</p>
          <p className="font-display text-xl font-bold truncate sumi-e-ink uppercase">
            {stables.find((h) => h.id === selectedHeyaId)?.name} Stable
          </p>
        </div>
        <Button
          size="lg"
          variant="primary-gradient"
          className="h-14 px-10 gap-3 text-sm shadow-md"
          onClick={() => onBegin(selectedHeyaId)}
        >
          Inaugurate <ChevronRight className="h-5 w-5 stroke-[3]" />
        </Button>
      </div>
    </div>
  );
}
