import { useState } from "react";
import { UIRikishi } from "@/presenters/uiModels";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Palette, Sparkles, X, ShieldCheck } from "lucide-react";
import { useGame } from "@/contexts/GameContext";
import { SumoAvatar } from "@/components/avatar/SumoAvatar";
import { KeshoMawashi, TraditionalMotif } from "@/engine/types/keshoMawashi";
import { cn } from "@/lib/utils";

const MOTIFS: TraditionalMotif[] = [
  "dragon",
  "phoenix",
  "tiger",
  "mt_fuji",
  "waves",
  "sakura",
  "pine",
  "bamboo",
  "crane",
  "rising_sun",
  "lightning",
  "waterfall",
  "temple",
  "treasure_ship",
  "carp",
  "lotus",
  "thunder",
  "wind",
  "mountain",
];

const PRESET_PALETTES = [
  { name: "Sovereign Gold", primary: "#8B0000", secondary: "#D4AF37", accent: "#FFD700" },
  { name: "Imperial Phoenix", primary: "#FF4500", secondary: "#8B0000", accent: "#FFD700" },
  { name: "Deep Ocean", primary: "#001F3F", secondary: "#0074D9", accent: "#FFFFFF" },
  { name: "Silent Bamboo", primary: "#2F4F4F", secondary: "#228B22", accent: "#F5F5DC" },
  { name: "Midnight Storm", primary: "#121212", secondary: "#4B0082", accent: "#E0E0E0" },
];

interface KeshoEditorProps {
  rikishi: UIRikishi;
  open: boolean;
  onClose: () => void;
}

export function KeshoEditor({ rikishi, open, onClose }: KeshoEditorProps) {
  const { state, updateWorld } = useGame();
  const world = state.world;

  // Initialize with current config or default
  const existingConfig = world?.customKeshoConfigs?.[rikishi.id] || {};
  const [config, setConfig] = useState<Partial<KeshoMawashi>>({
    primaryColor: rikishi.keshoMawashi?.primaryColor || "#BC002D",
    secondaryColor: rikishi.keshoMawashi?.secondaryColor || "#FFFFFF",
    accentColor: rikishi.keshoMawashi?.accentColor || "#FFD700",
    goldThreadDensity: rikishi.keshoMawashi?.goldThreadDensity || 0.5,
    mainSymbol: rikishi.keshoMawashi?.mainSymbol || {
      type: "motif",
      value: "rising_sun",
      position: "center",
      size: "large",
      prominence: 0.8,
    },
    ...existingConfig,
  });

  if (!world) return null;

  const handleSave = () => {
    const updatedCustomConfigs = {
      ...(world.customKeshoConfigs || {}),
      [rikishi.id]: config,
    };

    updateWorld({
      ...world,
      customKeshoConfigs: updatedCustomConfigs,
    });
    onClose();
  };

  const updateField = (
    field: keyof Partial<KeshoMawashi>,
    value: KeshoMawashi[keyof KeshoMawashi]
  ) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  const updateSymbol = (motif: TraditionalMotif) => {
    setConfig((prev) => ({
      ...prev,
      mainSymbol: {
        ...(prev.mainSymbol || {
          type: "motif",
          position: "center",
          size: "large",
          prominence: 0.8,
        }),
        value: motif as string,
      },
    }));
  };

  // Preview config merged into avatar config
  const previewAvatarConfig = {
    ...rikishi.avatarConfig,
    seed: rikishi.avatarConfig?.seed ?? rikishi.id,
    mawashiColor: config.primaryColor || "#BC002D",
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl bg-card border-primary/20 p-0 overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 h-[80vh]">
          {/* Left Side: Preview */}
          <div className="relative flex flex-col items-center justify-center bg-muted/30 p-8 border-r border-border/50 overflow-hidden">
            <div className="absolute inset-0 bg-grid-white/5" />

            <div className="relative z-10 text-center space-y-4">
              {/* Large Preview */}
              <div className="p-8 rounded-full bg-background/50 border border-primary/10 shadow-2xl backdrop-blur-sm">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <SumoAvatar config={previewAvatarConfig as any} size="xl" expression="determined" />
              </div>

              <div>
                <h3 className="font-display font-bold text-2xl uppercase tracking-tight">
                  {rikishi.shikona}
                </h3>
                <p className="text-sm text-muted-foreground uppercase tracking-widest font-medium">
                  Design Preview
                </p>
              </div>

              {/* Design Summary Badge */}
              <div className="flex flex-wrap justify-center gap-2 pt-4">
                <Badge variant="outline" className="border-primary/20 bg-primary/5">
                  {config.mainSymbol?.value?.toString().replace("_", " ")} Motif
                </Badge>
                <Badge variant="outline" className="border-gold/20 bg-gold/5 text-gold">
                  {Math.round((config.goldThreadDensity || 0) * 100)}% Gold Thread
                </Badge>
              </div>
            </div>

            <div className="absolute bottom-6 left-6 text-[10px] text-muted-foreground/60 font-mono flex items-center gap-2">
              <Sparkles className="h-3 w-3" />
              DRESSMAKER VERSION 1.0 (FREE CUSTOMIZATION)
            </div>
          </div>

          {/* Right Side: Editor */}
          <div className="flex flex-col h-full">
            <DialogHeader className="p-6 border-b border-border/50">
              <DialogTitle className="font-display text-xl flex items-center gap-2">
                <Palette className="h-5 w-5 text-primary" />
                Kesho-Mawashi Editor
              </DialogTitle>
            </DialogHeader>

            <ScrollArea className="flex-1 p-6">
              <div className="space-y-8 pb-10">
                {/* 1. Motifs */}
                <div className="space-y-4">
                  <Label className="text-xs uppercase tracking-widest text-muted-foreground font-bold">
                    Traditional Motif
                  </Label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {MOTIFS.map((m) => (
                      <button
                        key={m}
                        onClick={() => updateSymbol(m)}
                        className={cn(
                          "px-2 py-3 rounded-lg border text-[10px] uppercase font-bold transition-all truncate",
                          config.mainSymbol?.value === m
                            ? "bg-primary text-primary-foreground border-primary shadow-md"
                            : "bg-muted/50 border-transparent hover:border-primary/30"
                        )}
                      >
                        {m.replace("_", " ")}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Presets */}
                <div className="space-y-4">
                  <Label className="text-xs uppercase tracking-widest text-muted-foreground font-bold">
                    Design Presets
                  </Label>
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {PRESET_PALETTES.map((p) => (
                      <button
                        key={p.name}
                        onClick={() => {
                          updateField("primaryColor", p.primary);
                          updateField("secondaryColor", p.secondary);
                          updateField("accentColor", p.accent);
                        }}
                        className="flex flex-col gap-2 min-w-[80px] group transition-all"
                      >
                        <div className="h-10 w-full rounded-md flex overflow-hidden border border-border group-hover:border-primary">
                          <div className="flex-1" style={{ backgroundColor: p.primary }} />
                          <div className="w-1/3" style={{ backgroundColor: p.secondary }} />
                          <div className="w-4" style={{ backgroundColor: p.accent }} />
                        </div>
                        <span className="text-[9px] font-bold text-center text-muted-foreground group-hover:text-foreground">
                          {p.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Color Controls */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">
                      Main Fabric
                    </Label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={config.primaryColor}
                        onChange={(e) => updateField("primaryColor", e.target.value)}
                        className="h-10 w-12 rounded border-0 cursor-pointer p-0 bg-transparent"
                      />
                      <span className="text-xs font-mono uppercase">{config.primaryColor}</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">
                      Embroidery
                    </Label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={config.accentColor}
                        onChange={(e) => updateField("accentColor", e.target.value)}
                        className="h-10 w-12 rounded border-0 cursor-pointer p-0 bg-transparent"
                      />
                      <span className="text-xs font-mono uppercase">{config.accentColor}</span>
                    </div>
                  </div>
                </div>

                {/* 4. Gold Thread Density */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs uppercase tracking-widest text-muted-foreground font-bold">
                      Gold Thread Density
                    </Label>
                    <span className="text-xs font-mono font-bold text-primary">
                      {Math.round((config.goldThreadDensity || 0) * 100)}%
                    </span>
                  </div>
                  <Slider
                    value={[(config.goldThreadDensity || 0) * 100]}
                    onValueChange={(v) => updateField("goldThreadDensity", v[0] / 100)}
                    max={100}
                    step={5}
                    className="py-4"
                  />
                  <p className="text-[10px] text-muted-foreground italic">
                    Higher density adds more reflective gold thread to the embroidery work.
                  </p>
                </div>
              </div>
            </ScrollArea>

            <DialogFooter className="p-6 bg-muted/20 border-t border-border/50 gap-3">
              <Button variant="ghost" onClick={onClose} className="rounded-full">
                <X className="h-4 w-4 mr-1" /> Cancel
              </Button>
              <Button
                onClick={handleSave}
                className="rounded-full bg-primary hover:bg-primary/90 gap-2 px-8"
              >
                <ShieldCheck className="h-4 w-4" /> Save Authority
              </Button>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
