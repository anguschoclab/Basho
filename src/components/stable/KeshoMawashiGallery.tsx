import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KeshoMawashiDisplay } from "@/components/kesho/KeshoMawashiDisplay";
import { RikishiName } from "@/components/ClickableName";
import type { Rikishi } from "@/engine/types/rikishi";
import { Badge } from "@/components/ui/badge";
import { Palette, Award, ShieldCheck } from "lucide-react";

interface KeshoMawashiGalleryProps {
  world: { heyas: Map<string, { rikishiIds?: string[] }>; rikishi: Map<string, Rikishi> };
  heyaId: string;
}

export function KeshoMawashiGallery({ world, heyaId }: KeshoMawashiGalleryProps) {
  const heya = world.heyas.get(heyaId);

  const sekitoriWithKesho = useMemo(() => {
    if (!heya) return [];
    return (heya.rikishiIds ?? [])
      .map((id) => world.rikishi.get(id))
      .filter((r): r is Rikishi => !!(r && r.keshoMawashi))
      .sort((a, b) => {
        // Sort by rank: Makuuchi first, then Juryo
        const getRankWeight = (r: Rikishi) => {
          if (r.division === "makuuchi") return 100;
          if (r.division === "juryo") return 50;
          return 0;
        };
        return getRankWeight(b) - getRankWeight(a);
      });
  }, [world, heya]);

  if (sekitoriWithKesho.length === 0) {
    return (
      <Card className="paper border-dashed bg-muted/20">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Palette className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <h3 className="font-display font-bold text-lg">No Kesho-mawashi Found</h3>
          <p className="text-sm text-muted-foreground max-w-md mt-2">
            Ceremonial aprons are only conferred upon rikishi who reach the Sekitori ranks (Juryo
            and Makuuchi). Promote your wrestlers to see their unique designs here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <Award className="h-5 w-5 text-gold" />
        <h2 className="text-xl font-display font-black uppercase tracking-tight">
          Ceremonial Gallery
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {sekitoriWithKesho.map((rikishi) => (
          <Card
            key={rikishi.id}
            className="paper overflow-hidden group hover:border-primary transition-all duration-300"
          >
            <CardHeader className="p-4 pb-0 flex flex-row items-center justify-between space-y-0">
              <div className="space-y-1">
                <CardTitle className="text-sm">
                  <RikishiName
                    id={rikishi.id}
                    name={rikishi.shikona}
                    className="hover:text-primary transition-colors"
                  />
                </CardTitle>
                <div className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">
                  {rikishi.rank} {rikishi.side === "east" ? "East" : "West"}
                </div>
              </div>
              <Badge variant="outline" className="text-[8px] font-black uppercase h-5">
                {rikishi.division}
              </Badge>
            </CardHeader>
            <CardContent className="p-6 pt-2 flex flex-col items-center gap-4">
              <div className="relative group-hover:scale-105 transition-transform duration-500 py-4">
                {rikishi.keshoMawashi && (
                  <KeshoMawashiDisplay
                    mawashi={rikishi.keshoMawashi}
                    size="lg"
                    className="shadow-2xl"
                  />
                )}
              </div>
              <div className="w-full space-y-3 bg-muted/30 p-3 rounded-lg border">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <ShieldCheck className="h-3 w-3" /> Design Specification
                </div>
                <div className="grid grid-cols-2 gap-y-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Origin:</span>
                    <span className="ml-2 capitalize font-medium">
                      {rikishi.keshoMawashi?.origin.replace("_", " ")}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Pattern:</span>
                    <span className="ml-2 capitalize font-medium">
                      {rikishi.keshoMawashi?.basePattern}
                    </span>
                  </div>
                  {rikishi.keshoMawashi?.sponsorInfo && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Sponsor:</span>
                      <span className="ml-2 font-bold text-primary">
                        {rikishi.keshoMawashi.sponsorInfo.name}
                      </span>
                    </div>
                  )}
                </div>
                {rikishi.keshoMawashi?.description && (
                  <p className="text-[10px] italic text-muted-foreground border-t pt-2 mt-2 leading-relaxed">
                    "{rikishi.keshoMawashi.description}"
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
