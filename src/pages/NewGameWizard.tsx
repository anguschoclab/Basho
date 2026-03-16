import React, { useState, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useGame } from "@/contexts/GameContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, CircleUser, Star, ArrowRight, ArrowLeft, Trophy, DollarSign, Building } from "lucide-react";
import type { Heya } from "@/engine/types/heya";

// Function borrowed from MainMenu
function makeDeterministicSeed(prefix = "world"): string {
  const hash = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${hash}`;
}

const OYAKATA_BACKGROUNDS = [
  {
    id: "yokozuna",
    label: "Former Yokozuna",
    description: "High prestige and respect, but starting a stable is expensive.",
    bonuses: { prestige: 2, funds: 5_000_000, scouting: 70, training: 80 },
    icon: Trophy,
  },
  {
    id: "ozeki",
    label: "Former Ozeki",
    description: "Well respected with decent financial backing from koenkai.",
    bonuses: { prestige: 1, funds: 15_000_000, scouting: 60, training: 70 },
    icon: Star,
  },
  {
    id: "maegashira",
    label: "Former Maegashira",
    description: "A journeyman with a massive business network and deep pockets.",
    bonuses: { prestige: 0, funds: 30_000_000, scouting: 50, training: 50 },
    icon: DollarSign,
  },
];

const ICHIMON_FACTIONS = [
  { id: "dewanoumi", name: "Dewanoumi", description: "The largest and most traditional faction." },
  { id: "nishonoseki", name: "Nishonoseki", description: "A powerful and wealthy modern faction." },
  { id: "takasago", name: "Takasago", description: "Known for fierce independence and strong rivalries." },
  { id: "tokitsukaze", name: "Tokitsukaze", description: "A balanced faction with strong training roots." },
  { id: "isegahama", name: "Isegahama", description: "Currently dominant with top-tier talent." },
];

export default function NewGameWizard() {
  const navigate = useNavigate();
  const { createWorld, state } = useGame();

  useEffect(() => {
    if (!state.world) {
      createWorld(makeDeterministicSeed("world"));
    }
  }, [state.world, createWorld]);

  const [step, setStep] = useState(1);
  const [oyakataName, setOyakataName] = useState("");
  const [background, setBackground] = useState(OYAKATA_BACKGROUNDS[0].id);
  const [ichimon, setIchimon] = useState(ICHIMON_FACTIONS[0].id);

  const [selectedHeyaId, setSelectedHeyaId] = useState<string | null>(null);

  const world = state.world;

  const stables = useMemo(() => {
    if (!world) return [];
    return Array.from(world.heyas.values());
  }, [world]);

  const handleNext = () => setStep((s) => s + 1);
  const handlePrev = () => setStep((s) => Math.max(1, s - 1));

  const handleFinish = () => {
    if (!world || !selectedHeyaId) return;

    // We pass the config to createWorld.
    createWorld(world.seed, selectedHeyaId, {
      name: oyakataName || "Player",
      background,
      ichimon,
      heyaId: selectedHeyaId,
    });

    navigate({ to: "/" });
  };

  if (!world) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <p className="text-muted-foreground">Initializing world state...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Progress */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-display font-bold">New Game Setup</h1>
          <div className="flex gap-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-2 w-16 rounded-full ${s <= step ? "bg-primary" : "bg-muted"}`}
              />
            ))}
          </div>
        </div>

        {/* Step 1: Oyakata Profile */}
        {step === 1 && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <CircleUser className="w-6 h-6 text-primary" />
              Establish Your Identity
            </h2>

            <Card>
              <CardContent className="pt-6 space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="oyakataName">Oyakata Name</Label>
                  <Input
                    id="oyakataName"
                    placeholder="e.g. Takanohana"
                    value={oyakataName}
                    onChange={(e) => setOyakataName(e.target.value)}
                    className="max-w-md"
                  />
                  <p className="text-xs text-muted-foreground">This is your elder name (toshiyori-mei).</p>
                </div>

                <div className="space-y-3">
                  <Label>Background & History</Label>
                  <div className="grid gap-4 md:grid-cols-3">
                    {OYAKATA_BACKGROUNDS.map((bg) => {
                      const Icon = bg.icon;
                      const isSelected = background === bg.id;
                      return (
                        <Card
                          key={bg.id}
                          className={`cursor-pointer transition-all ${
                            isSelected ? "border-primary bg-primary/5 shadow-md" : "hover:border-primary/50"
                          }`}
                          onClick={() => setBackground(bg.id)}
                        >
                          <CardContent className="p-4 space-y-2">
                            <div className="flex items-center gap-2 font-semibold">
                              <Icon className="w-4 h-4 text-primary" />
                              {bg.label}
                            </div>
                            <p className="text-xs text-muted-foreground">{bg.description}</p>
                            <div className="text-[10px] uppercase tracking-wider text-primary pt-2 font-medium">
                              Starting Funds: ¥{(bg.bonuses.funds / 10000).toLocaleString()} Man
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button onClick={handleNext} disabled={!oyakataName.trim()} className="gap-2">
                Next <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Faction (Ichimon) */}
        {step === 2 && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <Building2 className="w-6 h-6 text-primary" />
              Choose Your Ichimon
            </h2>
            <p className="text-muted-foreground">
              Factions determine your political allies, joint training partners, and governance voting bloc.
            </p>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {ICHIMON_FACTIONS.map((faction) => {
                const isSelected = ichimon === faction.id;
                return (
                  <Card
                    key={faction.id}
                    className={`cursor-pointer transition-all ${
                      isSelected ? "border-primary bg-primary/5 shadow-md" : "hover:border-primary/50"
                    }`}
                    onClick={() => setIchimon(faction.id)}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">{faction.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{faction.description}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={handlePrev} className="gap-2">
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
              <Button onClick={handleNext} className="gap-2">
                Next <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Heya Selection */}
        {step === 3 && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <Building className="w-6 h-6 text-primary" />
              Acquire a Stable
            </h2>
            <p className="text-muted-foreground">
              Select an existing stable to inherit its roster and history.
              (Founding a new stable will be available in a future update).
            </p>

            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 max-h-[500px] overflow-y-auto p-1 pr-4">
              {stables.map((heya) => (
                <Card
                  key={heya.id}
                  className={`cursor-pointer transition-all ${
                    selectedHeyaId === heya.id ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:border-primary/50"
                  }`}
                  onClick={() => setSelectedHeyaId(heya.id)}
                >
                  <CardContent className="p-4">
                    <div className="font-bold text-lg mb-1">{heya.name}</div>
                    <div className="text-xs text-muted-foreground mb-3">
                      {heya.location || "Tokyo"} • {heya.rikishiIds?.length || 0} Wrestlers
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{heya.statureBand}</span>
                      <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{heya.facilitiesBand}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={handlePrev} className="gap-2">
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
              <Button onClick={handleFinish} disabled={!selectedHeyaId} className="gap-2" size="lg">
                Begin Journey <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
