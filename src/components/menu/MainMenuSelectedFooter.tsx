import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import { SumoAvatar } from "@/components/avatar/SumoAvatar";
import { resolveAvatar, oyakataStageInput } from "@/presenters/avatarProjections";
import type { Heya } from "@/engine/types/heya";
import type { WorldState } from "@/presenters/uiDigest";

interface Props {
  selectedHeyaId: string | null;
  stables: Heya[];
  /** Optional world — used to render the selected stable's oyakata portrait. */
  world?: WorldState | null;
  onBegin: (heyaId: string) => void;
}

export function MainMenuSelectedFooter({ selectedHeyaId, stables, world, onBegin }: Props) {
  if (!selectedHeyaId) return null;

  const heya = stables.find((h) => h.id === selectedHeyaId);
  const oyakata = heya?.oyakataId ? world?.oyakata.get(heya.oyakataId) : undefined;

  return (
    <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-full max-w-xl px-6 z-50 animate-in slide-in-from-bottom-10 duration-500">
      <div className="glass paper p-2 pl-4 rounded shadow-xl flex items-center justify-between border-gold/30">
        <div className="flex items-center gap-3 text-foreground min-w-0 pr-4">
          <SumoAvatar
            avatar={
              oyakata
                ? resolveAvatar({
                    id: oyakata.id,
                    stored: oyakata.avatarConfig,
                    seedAliases: oyakata.formerRikishiId ? [oyakata.formerRikishiId] : [],
                    ...oyakataStageInput(oyakata),
                  })
                : undefined
            }
            size="md"
            fallback={heya?.name}
            className="shrink-0"
          />
          <div className="min-w-0">
            <p className="stat-label text-gold tracking-[0.15em] mb-0.5">READY TO BEGIN</p>
            <p className="font-display text-xl font-bold truncate sumi-e-ink uppercase">
              {heya?.name} Stable
            </p>
            {oyakata && (
              <p className="text-[10px] text-muted-foreground truncate">{oyakata.name}</p>
            )}
          </div>
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
