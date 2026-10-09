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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Palette, X, ShieldCheck } from "lucide-react";
import { useGame } from "@/contexts/useGame";
import { KeshoMawashi, TraditionalMotif } from "@/engine/types/keshoMawashi";
import { KeshoPreview, KeshoEditorControls } from "./KeshoEditorSections";

interface KeshoEditorProps {
  rikishi: UIRikishi;
  open: boolean;
  onClose: () => void;
}

export function KeshoEditor({ rikishi, open, onClose }: KeshoEditorProps) {
  const { state, setKeshoConfig } = useGame();
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
    setKeshoConfig(rikishi.id, config);
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl bg-card border-primary/20 p-0 overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 h-[80vh]">
          {/* Left Side: Preview */}
          <KeshoPreview rikishi={rikishi} config={config} />

          {/* Right Side: Editor */}
          <div className="flex flex-col h-full">
            <DialogHeader className="p-6 border-b border-border/50">
              <DialogTitle className="font-display text-xl flex items-center gap-2">
                <Palette className="h-5 w-5 text-primary" />
                Kesho-Mawashi Editor
              </DialogTitle>
            </DialogHeader>

            <ScrollArea className="flex-1 p-6">
              <KeshoEditorControls
                rikishiId={rikishi.id}
                config={config}
                onUpdateField={updateField}
                onUpdateSymbol={updateSymbol}
              />
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
