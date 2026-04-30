/**
 * RikishiKeshoMawashi.tsx
 *
 * Kesho-Mawashi (ceremonial apron) display section for sekitori.
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Medal, Palette } from "lucide-react";
import { KeshoMawashiDisplay } from "@/components/kesho/KeshoMawashiDisplay";
import { YokozunaTsunaDisplay } from "@/components/kesho/keshoComponents";
import type { UIRikishi } from "@/presenters/uiModels";
import { useState } from "react";
import { KeshoEditor } from "../game/KeshoEditor";

interface RikishiKeshoMawashiProps {
  rikishi: UIRikishi;
}

export function RikishiKeshoMawashi({ rikishi }: RikishiKeshoMawashiProps) {
  const [showEditor, setShowEditor] = useState(false);

  if (!rikishi.hasKeshoMawashi || !rikishi.keshoMawashi) {
    return null;
  }

  return (
    <>
      <div className="mb-10 p-6 bg-gradient-to-br from-primary/5 to-secondary/5 border-2 border-primary/10 rounded-lg relative overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-display font-black flex items-center gap-2 uppercase tracking-tight">
              <Medal className="h-5 w-5 text-primary" /> Ceremonial Apron
            </h3>
            <p className="text-[10px] uppercase font-black tracking-[0.2em] text-muted-foreground">
              Kesho-Mawashi • {rikishi.keshoMawashi.tier} Tier
            </p>
          </div>
          <div className="flex items-center gap-4">
            {rikishi.isPlayerOwned && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-[10px] uppercase font-bold gap-2 border-primary/20 hover:bg-primary/5"
                onClick={() => setShowEditor(true)}
              >
                <Palette className="h-3.5 w-3.5" />
                Customize Design
              </Button>
            )}
            {rikishi.isYokozuna && rikishi.yokozunaTsuna && (
              <div className="flex items-center gap-3">
                <YokozunaTsunaDisplay tsuna={rikishi.yokozunaTsuna} size="md" />
                <span className="text-xs font-bold uppercase tracking-wider text-yellow-600">
                  Yokozuna Tsuna
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-start gap-6">
          <KeshoMawashiDisplay mawashi={rikishi.keshoMawashi} size="lg" />
          <div className="flex-1 space-y-2">
            <p className="text-sm text-muted-foreground italic">
              {rikishi.keshoMawashi.description}
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <Badge variant="outline" className="text-[10px] uppercase">
                {rikishi.keshoMawashi.origin} Design
              </Badge>
              <Badge variant="outline" className="text-[10px] uppercase">
                {rikishi.keshoMawashi.basePattern} Pattern
              </Badge>
              {rikishi.keshoMawashi.sponsorInfo && (
                <Badge
                  variant="outline"
                  className="text-[10px] uppercase bg-gold/10 border-gold/30 text-gold"
                >
                  Sponsored by {rikishi.keshoMawashi.sponsorInfo.name}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      <KeshoEditor rikishi={rikishi} open={showEditor} onClose={() => setShowEditor(false)} />
    </>
  );
}
