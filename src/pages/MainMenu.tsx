// MainMenu.tsx
// Main Menu - Unified FTUE stable selection flow
// Follows Foundations Canon v2.0: World Entry & Stable Selection
//
// DROP-IN FIXES (runtime + canon):
// - Canon rename: Stable Lords -> Basho (titles + copy)
// - Removed Math.random() from seed generation (deterministic-friendly)
// - Fixed "Sekitori: Yes/None" to actual sekitori count
// - Fixed createWorld usage on importSave: loads imported world directly when supported; safe fallback otherwise
// - Improved recommended stables selection to avoid relying on reputation if missing
// - Safer reroll seed + seed display (no substring crash)
// - Stronger type alignment: selectionMode uses StableSelectionMode from engine types when available
//
// ADDITIONAL HARDENING / REFACTOR:
// - Never calls hooks inside handlers
// - Discovers optional direct world hydrate APIs safely (loadWorldDirect/loadImportedWorld/setWorld/hydrateWorld)
// - Avoids double-worldgen loops by syncing local seed state with loaded world seed
// - Guards optional heya.riskIndicators and heya.rikishiIds
// - Adds heya preview dialog with roster + stats; selecting a heya uses a single confirm path
// - Removes fragile use of RANK_HIERARCHY.order (uses tier when available)

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { Helmet } from "react-helmet";
import { useNavigate } from "react-router-dom";
import { useGame } from "@/contexts/GameContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import {
  CircleDot,
  Dices,
  ArrowRight,
  Building2,
  Star,
  Sparkles,
  AlertTriangle,
  TrendingDown,
  Shield,
  Plus,
  RefreshCw,
  Save,
  FolderOpen,
  Trash2,
  Upload,
  Clock
} from "lucide-react";
import type { Heya, StatureBand, BashoName, StableSelectionMode } from "@/engine/types";
import { BASHO_CALENDAR } from "@/engine/calendar";
import { deleteSave, importSave, type SaveSlotInfo } from "@/engine/saveload";
import { RANK_HIERARCHY } from "@/engine/banzuke";

const STATURE_CONFIG: Record<
  StatureBand,
  {
    label: string;
    labelJa: string;
    difficulty: string;
    color: string;
    icon: typeof Star;
  }
> = {
  legendary: {
    label: "Legendary",
    labelJa: "伝説",
    difficulty: "Very Easy",
    color: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    icon: Star
  },
  powerful: {
    label: "Powerful",
    labelJa: "強豪",
    difficulty: "Easy",
    color: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    icon: Sparkles
  },
  established: {
    label: "Established",
    labelJa: "安定",
    difficulty: "Normal",
    color: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    icon: Building2
  },
  rebuilding: {
    label: "Rebuilding",
    labelJa: "再建中",
    difficulty: "Hard",
    color: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    icon: TrendingDown
  },
  fragile: {
    label: "Fragile",
    labelJa: "危機",
    difficulty: "Very Hard",
    color: "bg-red-500/20 text-red-400 border-red-500/30",
    icon: AlertTriangle
  },
  new: {
    label: "New",
    labelJa: "新規",
    difficulty: "Extreme",
    color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    icon: Plus
  }
};

const HEYA_NAMES_COUNT = 45;

interface StableCardProps {
  heya: Heya;
  isSelected: boolean;
  onSelect: () => void;
  onPreview?: () => void;
  isRecommended?: boolean;
  sekitoriCount: number;
}

function StableCard({ heya, isSelected, onSelect, onPreview, isRecommended, sekitoriCount }: StableCardProps) {
  const config = STATURE_CONFIG[heya.statureBand];
  const Icon = config.icon;

  const financial = !!(heya as any)?.riskIndicators?.financial;
  const governance = !!(heya as any)?.riskIndicators?.governance;
  const rivalry = !!(heya as any)?.riskIndicators?.rivalry;

  return (
    <Card
      className={`cursor-pointer transition-all hover:border-primary/50 ${
        isSelected ? "border-primary ring-2 ring-primary/30" : ""
      }`}
      onClick={onSelect}
      onDoubleClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onPreview?.();
      }}
      title="Click to select • Double-click to preview roster"
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-lg flex items-center gap-2">
              <span className="truncate">{heya.name}</span>
              {isRecommended && (
                <Badge variant="secondary" className="text-xs">
                  Recommended
                </Badge>
              )}
            </CardTitle>
            {heya.nameJa && <p className="text-sm text-muted-foreground font-display truncate">{heya.nameJa}</p>}
          </div>
          <Badge className={`${config.color} border shrink-0`}>
            <Icon className="w-3 h-3 mr-1" />
            {config.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-2">
        {heya.descriptor && <p className="text-sm text-muted-foreground italic">{heya.descriptor}</p>}

        <div className="flex flex-wrap gap-2 text-xs">
          <span className="text-muted-foreground">
            Difficulty: <span className="text-foreground font-medium">{config.difficulty}</span>
          </span>
          <span className="text-muted-foreground">•</span>
          <span className="text-muted-foreground">
            Sekitori: <span className="text-foreground font-medium">{sekitoriCount}</span>
          </span>
        </div>

        {(financial || governance || rivalry) && (
          <div className="flex gap-1 pt-1 flex-wrap">
            {financial && (
              <Badge variant="outline" className="text-xs bg-red-500/10 text-red-400 border-red-500/30">
                💴 Financial Risk
              </Badge>
            )}
            {governance && (
              <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-400 border-yellow-500/30">
                ⚖️ Governance Watch
              </Badge>
            )}
            {rivalry && (
              <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-400 border-purple-500/30">
                🔥 Active Rivalry
              </Badge>
            )}
          </div>
        )}

        {onPreview && (
          <div className="pt-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                onPreview();
              }}
            >
              Preview roster
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function safeShortSeed(seed: string | undefined | null): string {
  if (!seed) return "unknown";
  return seed.length <= 14 ? seed : `${seed.slice(0, 14)}…`;
}

function makeDeterministicSeed(prefix = "world"): string {
  // No Math.random() — deterministic-friendly, stable, adequate uniqueness for local worlds
  return `${prefix}-${Date.now()}`;
}

function safeRankSortKey(rank: any): number {
  // Prefer tier from your rank hierarchy (lower tier => higher rank)
  const tier = (RANK_HIERARCHY as any)?.[rank]?.tier;
  return Number.isFinite(tier) ? tier : 999;
}

export default function MainMenu() {
  const navigate = useNavigate();

  // Pull everything we might need ONCE (no hooks inside handlers)
  const game = useGame() as any;
  const { createWorld, state, loadFromSlot, loadFromAutosave, hasAutosave, getSaveSlots } = game;

  // Optional direct-load APIs (best effort, no assumptions)
  const loadWorldDirect =
    game?.loadWorldDirect ||
    game?.loadImportedWorld ||
    game?.setWorld ||
    game?.hydrateWorld ||
    null;

  const [seed, setSeed] = useState("");
  const [showSeedInput, setShowSeedInput] = useState(false);
  const [selectionMode, setSelectionMode] = useState<StableSelectionMode>("recommended");
  const [selectedHeyaId, setSelectedHeyaId] = useState<string | null>(null);

  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [saveSlots, setSaveSlots] = useState<SaveSlotInfo[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  const [previewHeya, setPreviewHeya] = useState<Heya | null>(null);

  // Read save slots (safe)
  useEffect(() => {
    try {
      if (typeof getSaveSlots === "function") setSaveSlots(getSaveSlots());
      else setSaveSlots([]);
    } catch {
      setSaveSlots([]);
    }
  }, [getSaveSlots]);

  const canContinue = (typeof hasAutosave === "function" && hasAutosave()) || saveSlots.length > 0;

  // Ensure a world exists on first mount, but avoid regeneration loops.
  useEffect(() => {
    if (!state?.world) {
      const worldSeed = makeDeterministicSeed("world");
      setSeed(worldSeed);
      if (typeof createWorld === "function") createWorld(worldSeed);
      return;
    }
    // Sync local seed display to active world seed (once available)
    if (state.world?.seed && seed !== state.world.seed) setSeed(state.world.seed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.world]);

  const stables = useMemo((): Heya[] => {
    if (!state?.world) return [];
    return Array.from(state.world.heyas.values()) as Heya[];
  }, [state?.world]);

  // Heya -> sekitori count
  const sekitoriCounts = useMemo(() => {
    const map = new Map<string, number>();
    if (!state?.world) return map;

    for (const h of state.world.heyas.values() as IterableIterator<Heya>) {
      let count = 0;
      for (const rid of (h.rikishiIds ?? []) as string[]) {
        const r = state.world.rikishi.get(rid);
        if (r && (RANK_HIERARCHY as any)?.[r.rank]?.isSekitori) count += 1;
      }
      map.set(h.id, count);
    }
    return map;
  }, [state?.world]);

  const recommendedStables = useMemo((): Heya[] => {
    return stables
      .filter((h) => h.statureBand === "established" || h.statureBand === "powerful")
      .slice()
      .sort((a, b) => {
        const sa = sekitoriCounts.get(a.id) ?? 0;
        const sb = sekitoriCounts.get(b.id) ?? 0;
        if (sb !== sa) return sb - sa;

        const fa = Number.isFinite(a.funds) ? a.funds : 0;
        const fb = Number.isFinite(b.funds) ? b.funds : 0;
        if (fb !== fa) return fb - fa;

        return a.name.localeCompare(b.name);
      })
      .slice(0, 6);
  }, [stables, sekitoriCounts]);

  const stablesByStature = useMemo(() => {
    const groups: Record<StatureBand, Heya[]> = {
      legendary: [],
      powerful: [],
      established: [],
      rebuilding: [],
      fragile: [],
      new: []
    };
    stables.forEach((h) => groups[h.statureBand]?.push(h));
    (Object.keys(groups) as StatureBand[]).forEach((k) => {
      groups[k].sort((a, b) => (sekitoriCounts.get(b.id) ?? 0) - (sekitoriCounts.get(a.id) ?? 0));
    });
    return groups;
  }, [stables, sekitoriCounts]);

  const getHeyaRoster = useCallback(
    (heya: Heya) => {
      if (!state?.world) return [];
      const roster = (heya.rikishiIds ?? [])
        .map((id: string) => state.world.rikishi.get(id))
        .filter(Boolean) as any[];

      roster.sort((a, b) => {
        const ta = safeRankSortKey(a.rank);
        const tb = safeRankSortKey(b.rank);
        if (ta !== tb) return ta - tb;

        const an = typeof a.rankNumber === "number" ? a.rankNumber : 0;
        const bn = typeof b.rankNumber === "number" ? b.rankNumber : 0;
        if (an !== bn) return an - bn;

        // East before West if present
        if (a.side !== b.side) return a.side === "east" ? -1 : 1;
        return String(a.shikona ?? "").localeCompare(String(b.shikona ?? ""));
      });

      return roster;
    },
    [state?.world]
  );

  const handleContinue = () => {
    if (typeof hasAutosave === "function" && hasAutosave()) {
      if (typeof loadFromAutosave === "function") loadFromAutosave();
      navigate("/");
      return;
    }
    if (saveSlots.length > 0) setShowLoadDialog(true);
  };

  const handleLoadSlot = (slotName: string) => {
    if (typeof loadFromSlot === "function" && loadFromSlot(slotName)) {
      setShowLoadDialog(false);
      navigate("/");
    }
  };

  const handleDeleteSlot = (slotName: string) => {
    try {
      deleteSave(slotName);
    } finally {
      try {
        if (typeof getSaveSlots === "function") setSaveSlots(getSaveSlots());
        else setSaveSlots([]);
      } catch {
        setSaveSlots([]);
      }
    }
  };

  const applyImportedWorld = useCallback(
    (importedWorld: any) => {
      if (!importedWorld) return;

      if (typeof loadWorldDirect === "function") {
        loadWorldDirect(importedWorld);
        return;
      }

      if (typeof createWorld === "function") {
        // eslint-disable-next-line no-console
        console.warn(
          "[MainMenu] No loadWorldDirect/loadImportedWorld/setWorld API found. Falling back to createWorld(seed, playerHeyaId). Imported data may not be preserved."
        );
        createWorld(importedWorld.seed, importedWorld.playerHeyaId);
      }
    },
    [createWorld, loadWorldDirect]
  );

  const handleImportSave = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const importedWorld = await importSave(file);
      if (importedWorld) {
        applyImportedWorld(importedWorld);
        setSeed(importedWorld.seed || "");
        navigate("/");
      }
    } finally {
      setIsImporting(false);
      e.target.value = "";
    }
  };

  const formatSaveDate = (isoDate: string) => {
    const date = new Date(isoDate);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getBashoDisplay = (bashoName?: BashoName) => {
    if (!bashoName) return "";
    const info = (BASHO_CALENDAR as any)?.[bashoName];
    return info ? `${info.nameEn}` : String(bashoName);
  };

  const handleRerollWorld = () => {
    const newSeed = seed?.trim() ? seed.trim() : makeDeterministicSeed("world");
    setSeed(newSeed);
    setSelectedHeyaId(null);
    if (typeof createWorld === "function") createWorld(newSeed);
  };

  const handleSetSeed = () => {
    const s = seed.trim();
    if (!s) return;
    setSelectedHeyaId(null);
    if (typeof createWorld === "function") createWorld(s);
    setShowSeedInput(false);
  };

  const beginWithHeya = (heyaId: string) => {
    if (!state?.world) return;
    if (typeof createWorld === "function") createWorld(state.world.seed, heyaId);
    navigate("/");
  };

  const handleConfirmStable = () => {
    if (!state?.world) return;

    if (selectedHeyaId) beginWithHeya(selectedHeyaId);
  };

  const canConfirm = selectedHeyaId !== null;

  if (!state?.world) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary shadow-lg mb-6 animate-pulse">
          <CircleDot className="h-10 w-10 text-primary-foreground" />
        </div>
        <p className="text-muted-foreground">Generating sumo world...</p>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Basho — Sumo Management Simulation</title>
        <meta
          name="description"
          content="Take control of a heya. Train rikishi, compete in basho, and build a legacy in the world of professional sumo."
        />
      </Helmet>

      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg">
                <CircleDot className="h-8 w-8 text-primary-foreground" />
              </div>
            </div>

            <h1 className="font-display text-4xl font-bold tracking-tight mb-2">Basho</h1>
            <p className="font-display text-xl text-muted-foreground mb-2">相撲経営シミュレーション</p>
            <p className="text-muted-foreground max-w-md mx-auto mb-4">
              Choose your heya. Train your rikishi. Compete for glory on the dohyo.
            </p>

            {/* Continue / Load / Import buttons */}
            <div className="flex items-center justify-center gap-3 mb-6">
              {canContinue && (
                <Button size="lg" variant="default" className="gap-2" onClick={handleContinue}>
                  <ArrowRight className="w-4 h-4" />
                  Continue
                </Button>
              )}

              <Dialog open={showLoadDialog} onOpenChange={setShowLoadDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="lg" className="gap-2">
                    <FolderOpen className="w-4 h-4" />
                    Load Game
                  </Button>
                </DialogTrigger>

                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Save className="w-5 h-5" />
                      Load Saved Game
                    </DialogTitle>
                    <DialogDescription>Choose a save slot to continue your journey.</DialogDescription>
                  </DialogHeader>

                  <ScrollArea className="max-h-[400px]">
                    <div className="space-y-2">
                      {saveSlots.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">No saved games found.</p>
                      ) : (
                        saveSlots.map((slot) => (
                          <Card key={slot.key} className="hover:bg-muted/50 transition-colors">
                            <CardContent className="p-3 flex items-center justify-between">
                              <div className="flex-1 cursor-pointer" onClick={() => handleLoadSlot(slot.slotName)}>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{slot.playerHeyaName || "Unknown Heya"}</span>
                                  <Badge variant="secondary" className="text-xs">
                                    {slot.slotName === "autosave" ? "Auto" : slot.slotName}
                                  </Badge>
                                </div>
                                <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                                  <span>Year {slot.year}</span>
                                  {slot.bashoName && (
                                    <>
                                      <span>•</span>
                                      <span>{getBashoDisplay(slot.bashoName)}</span>
                                    </>
                                  )}
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {formatSaveDate(slot.savedAt)}
                                  </span>
                                </div>
                              </div>

                              {slot.slotName !== "autosave" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteSlot(slot.slotName);
                                  }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>
                  </ScrollArea>

                  <DialogFooter className="flex-col sm:flex-row gap-2">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept=".json"
                        className="hidden"
                        onChange={handleImportSave}
                        disabled={isImporting}
                      />
                      <Button variant="outline" className="gap-2 w-full sm:w-auto" asChild>
                        <span>
                          <Upload className="w-4 h-4" />
                          {isImporting ? "Importing..." : "Import Save"}
                        </span>
                      </Button>
                    </label>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {/* World info & reroll */}
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">
                World: <code className="bg-muted px-2 py-0.5 rounded">{safeShortSeed(state.world.seed)}</code>
              </span>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground">{stables.length} Heyas</span>

              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={handleRerollWorld}>
                <RefreshCw className="w-3 h-3" />
                Reroll World
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => setShowSeedInput(!showSeedInput)}
              >
                <Dices className="w-3 h-3" />
                {showSeedInput ? "Hide Seed" : "Enter Seed"}
              </Button>
            </div>

            {showSeedInput && (
              <div className="mt-4 flex items-center justify-center gap-2 max-w-md mx-auto">
                <Input
                  placeholder="Enter world seed..."
                  value={seed}
                  onChange={(e) => setSeed(e.target.value)}
                  className="text-sm"
                />
                <Button size="sm" onClick={handleSetSeed}>
                  Apply
                </Button>
              </div>
            )}
          </div>

          {/* Selection Mode Tabs */}
          <Tabs value={selectionMode} onValueChange={(v) => setSelectionMode(v as StableSelectionMode)} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="recommended" className="gap-2">
                <Star className="w-4 h-4" />
                Recommended
              </TabsTrigger>
              <TabsTrigger value="take_over" className="gap-2">
                <Building2 className="w-4 h-4" />
                Take Over
              </TabsTrigger>
            </TabsList>

            {/* Recommended Start */}
            <TabsContent value="recommended" className="space-y-4">
              <Card className="bg-muted/30 paper">
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground">
                    <Shield className="inline w-4 h-4 mr-1" />
                    These heyas offer a balanced start with room to grow. Good for learning the systems.
                  </p>
                </CardContent>
              </Card>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {recommendedStables.map((heya) => (
                  <StableCard
                    key={heya.id}
                    heya={heya}
                    isSelected={selectedHeyaId === heya.id}
                    onSelect={() => setSelectedHeyaId(heya.id)}
                    onPreview={() => setPreviewHeya(heya)}
                    isRecommended
                    sekitoriCount={sekitoriCounts.get(heya.id) ?? 0}
                  />
                ))}
              </div>

              {selectedHeyaId && (
                <div className="mt-6 flex justify-center">
                  <Button size="lg" className="gap-2 min-w-[220px]" onClick={() => beginWithHeya(selectedHeyaId)}>
                    Begin Journey
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* Take Over Existing */}
            <TabsContent value="take_over" className="space-y-4">
              <Card className="bg-muted/30 paper">
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground">
                    <Building2 className="inline w-4 h-4 mr-1" />
                    Inherit an existing heya with its history, rivalries, and challenges. Difficulty varies by stature.
                  </p>
                </CardContent>
              </Card>

              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-6">
                  {(Object.keys(stablesByStature) as StatureBand[]).map((stature) => {
                    const stablesInGroup = stablesByStature[stature];
                    if (stablesInGroup.length === 0 || stature === "new") return null;

                    const config = STATURE_CONFIG[stature];
                    const GroupIcon = config.icon;

                    return (
                      <div key={stature}>
                        <h3 className="font-display text-lg font-semibold mb-3 flex items-center gap-2">
                          <GroupIcon className="w-5 h-5" />
                          {config.label} ({config.difficulty})
                          <span className="text-muted-foreground font-normal text-sm">
                            — {stablesInGroup.length} heyas
                          </span>
                        </h3>
                        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                          {stablesInGroup.map((heya) => (
                            <StableCard
                              key={heya.id}
                              heya={heya}
                              isSelected={selectedHeyaId === heya.id}
                              onSelect={() => setSelectedHeyaId(heya.id)}
                              onPreview={() => setPreviewHeya(heya)}
                              sekitoriCount={sekitoriCounts.get(heya.id) ?? 0}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>

              {selectedHeyaId && (
                <div className="mt-6 flex justify-center">
                  <Button size="lg" className="gap-2 min-w-[220px]" onClick={() => beginWithHeya(selectedHeyaId)}>
                    Begin Journey
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </TabsContent>

          </Tabs>

          {/* Heya Preview Dialog */}
          <Dialog open={!!previewHeya} onOpenChange={(open) => !open && setPreviewHeya(null)}>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
              {previewHeya && (
                <>
                  <DialogHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <DialogTitle className="text-xl flex items-center gap-2">
                          <span className="truncate">{previewHeya.name}</span>
                          {previewHeya.nameJa && (
                            <span className="text-muted-foreground font-display text-lg truncate">
                              {previewHeya.nameJa}
                            </span>
                          )}
                        </DialogTitle>
                        <DialogDescription className="mt-1">
                          {previewHeya.descriptor || "Review the roster before starting your journey."}
                        </DialogDescription>
                      </div>
                      <Badge className={`${STATURE_CONFIG[previewHeya.statureBand].color} border shrink-0`}>
                        {React.createElement(STATURE_CONFIG[previewHeya.statureBand].icon, {
                          className: "w-3 h-3 mr-1"
                        })}
                        {STATURE_CONFIG[previewHeya.statureBand].label}
                      </Badge>
                    </div>
                  </DialogHeader>

                  <div className="flex flex-wrap gap-4 py-2 border-b text-sm">
                    <div>
                      <span className="text-muted-foreground">Difficulty: </span>
                      <span className="font-medium">{STATURE_CONFIG[previewHeya.statureBand].difficulty}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Sekitori: </span>
                      <span className="font-medium">{sekitoriCounts.get(previewHeya.id) ?? 0}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total Wrestlers: </span>
                      <span className="font-medium">{previewHeya.rikishiIds?.length ?? 0}</span>
                    </div>
                  </div>

                  <div className="flex-1 overflow-hidden">
                    <h4 className="font-semibold text-sm mb-2 mt-2">Roster</h4>
                    <ScrollArea className="h-[280px] pr-4">
                      <div className="space-y-1">
                        {getHeyaRoster(previewHeya).map((r: any) => {
                          const rankInfo = (RANK_HIERARCHY as any)?.[r.rank];
                          const isSekitori = !!rankInfo?.isSekitori;
                          const rankJa = rankInfo?.nameJa ?? String(r.rank ?? "");
                          return (
                            <div
                              key={r.id}
                              className={`flex items-center justify-between py-1.5 px-2 rounded text-sm ${
                                isSekitori ? "bg-primary/5" : "bg-muted/30"
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className={`font-medium truncate ${isSekitori ? "text-primary" : ""}`}>
                                  {r.shikona}
                                </span>
                                {isSekitori && (
                                  <Badge variant="outline" className="text-xs py-0 shrink-0">
                                    Sekitori
                                  </Badge>
                                )}
                              </div>
                              <div className="text-muted-foreground text-xs shrink-0">
                                {rankJa}
                                {typeof r.rankNumber === "number" && r.rankNumber > 0 ? ` ${r.rankNumber}` : ""}
                                {r.side ? ` • ${String(r.side).toUpperCase()}` : ""}
                              </div>
                            </div>
                          );
                        })}
                        {getHeyaRoster(previewHeya).length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-4">No wrestlers in roster.</p>
                        )}
                      </div>
                    </ScrollArea>
                  </div>

                  <DialogFooter className="mt-4">
                    <Button variant="outline" onClick={() => setPreviewHeya(null)}>
                      Back
                    </Button>
                    <Button
                      className="gap-2"
                      onClick={() => {
                        setSelectedHeyaId(previewHeya.id);
                        setPreviewHeya(null);
                        beginWithHeya(previewHeya.id);
                      }}
                    >
                      Begin Journey
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>

          {/* Footer */}
          <div className="mt-12 text-center text-sm text-muted-foreground">
            <p className="mb-2">82 authentic kimarite • 6 annual tournaments • {HEYA_NAMES_COUNT}+ stables</p>
            <p className="font-display text-xs">頂点を目指せ — Reach for the summit</p>
          </div>
        </div>
      </div>
    </>
  );
}
