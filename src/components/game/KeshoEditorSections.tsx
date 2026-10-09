/**
 * KeshoEditorSections.tsx
 *
 * Sections of KeshoEditor — the avatar preview pane and the editor controls
 * (motif grid, preset palettes, color pickers, gold-thread density).
 */

import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { SumoAvatar } from "@/components/avatar/SumoAvatar";
import { KeshoMawashi, TraditionalMotif } from "@/engine/types/keshoMawashi";
import type { AvatarConfig } from "@/engine/types/avatar";
import { cn } from "@/lib/utils";
import { MOTIFS, PRESET_PALETTES } from "./keshoEditorData";

/** Left pane — live avatar preview plus design-summary badges. */
export function KeshoPreview({
  rikishi,
  config,
}: {
  rikishi: { shikona: string; avatarConfig?: AvatarConfig; id: string };
  config: Partial<KeshoMawashi>;
}) {
  // Preview config merged into avatar config
  const previewAvatarConfig = {
    ...rikishi.avatarConfig,
    seed: rikishi.avatarConfig?.seed ?? rikishi.id,
    mawashiColor: config.primaryColor || "#BC002D",
  };

  return (
    <div className="relative flex flex-col items-center justify-center bg-muted/30 p-8 border-r border-border/50 overflow-hidden">
      <div className="absolute inset-0 bg-grid-white/5" />

      <div className="relative z-10 text-center space-y-4">
        {/* Large Preview */}
        <div className="p-8 rounded-full bg-background/50 border border-primary/10 shadow-2xl backdrop-blur-xs">
          <SumoAvatar
            config={previewAvatarConfig as AvatarConfig}
            size="xl"
            expression="determined"
          />
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
  );
}

/** Editor scroll area — motif grid, presets, color pickers, density slider. */
export function KeshoEditorControls({
  rikishiId,
  config,
  onUpdateField,
  onUpdateSymbol,
}: {
  rikishiId: string;
  config: Partial<KeshoMawashi>;
  onUpdateField: (
    field: keyof Partial<KeshoMawashi>,
    value: KeshoMawashi[keyof KeshoMawashi]
  ) => void;
  onUpdateSymbol: (motif: TraditionalMotif) => void;
}) {
  return (
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
              aria-label={`Select motif ${m.replace("_", " ")}`}
              onClick={() => onUpdateSymbol(m)}
              className={cn(
                "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring",
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
              aria-label={`Select preset ${p.name}`}
              onClick={() => {
                onUpdateField("primaryColor", p.primary);
                onUpdateField("secondaryColor", p.secondary);
                onUpdateField("accentColor", p.accent);
              }}
              className={cn(
                "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                "flex flex-col gap-2 min-w-[80px] group transition-all rounded-md"
              )}
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
          <Label
            htmlFor={`primaryColor-${rikishiId}`}
            className="text-[10px] uppercase font-bold text-muted-foreground"
          >
            Main Fabric
          </Label>
          <div className="flex items-center gap-3">
            <input
              id={`primaryColor-${rikishiId}`}
              type="color"
              value={config.primaryColor}
              onChange={(e) => onUpdateField("primaryColor", e.target.value)}
              className="h-10 w-12 rounded border-0 cursor-pointer p-0 bg-transparent"
            />
            <span className="text-xs font-mono uppercase">{config.primaryColor}</span>
          </div>
        </div>
        <div className="space-y-3">
          <Label
            htmlFor={`accentColor-${rikishiId}`}
            className="text-[10px] uppercase font-bold text-muted-foreground"
          >
            Embroidery
          </Label>
          <div className="flex items-center gap-3">
            <input
              id={`accentColor-${rikishiId}`}
              type="color"
              value={config.accentColor}
              onChange={(e) => onUpdateField("accentColor", e.target.value)}
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
          onValueChange={(v) => onUpdateField("goldThreadDensity", v[0] / 100)}
          max={100}
          step={5}
          className="py-4"
        />
        <p className="text-[10px] text-muted-foreground italic">
          Higher density adds more reflective gold thread to the embroidery work.
        </p>
      </div>
    </div>
  );
}
