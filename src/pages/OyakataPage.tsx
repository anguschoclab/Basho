import React, { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useGame } from "@/contexts/GameContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getArchetypeDescription } from "@/engine/oyakataPersonalities";
import type { Oyakata } from "@/engine/types";
import { Brain, Heart, Briefcase, Zap, Scale } from "lucide-react";

export default function OyakataPage() {
  const { state } = useGame();
  const world = state.world;
  const [selectedOyakata, setSelectedOyakata] = useState<Oyakata | null>(null);

  useEffect(() => {
    if (world && world.playerHeyaId) {
      const playerHeya = world.heyas.get(world.playerHeyaId);
      if (playerHeya && playerHeya.oyakataId) {
        const o = world.oyakata.get(playerHeya.oyakataId);
        if (o) setSelectedOyakata(o);
      }
    }
  }, [world]);

  if (!world || !selectedOyakata) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">Loading Oyakata...</div>
      </AppLayout>
    );
  }

  const traits = selectedOyakata.traits;

  const traitItems = [
    { key: "ambition", label: "Ambition", icon: Zap, value: traits.ambition },
    { key: "patience", label: "Patience", icon: Brain, value: traits.patience },
    { key: "risk", label: "Risk Tolerance", icon: Scale, value: traits.risk },
    { key: "tradition", label: "Tradition", icon: Briefcase, value: traits.tradition },
    { key: "compassion", label: "Compassion", icon: Heart, value: traits.compassion },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* HEADER */}
        <div className="flex items-start gap-6">
          <Avatar className="h-32 w-32 border-4 border-muted">
            <AvatarFallback className="text-4xl font-bold bg-slate-800 text-white">
              {selectedOyakata.name[0]}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-bold">{selectedOyakata.name}</h1>
              <Badge variant="outline" className="text-lg capitalize">
                {selectedOyakata.archetype?.replace("_", " ")}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-2">
              {getArchetypeDescription(selectedOyakata.archetype)}
            </p>
            <div className="flex gap-4 mt-4 text-sm text-muted-foreground">
              <span>Age: {selectedOyakata.age}</span>
              <span>Years in Charge: {selectedOyakata.yearsInCharge}</span>
            </div>
          </div>
        </div>

        {/* TRAITS */}
        <Card>
          <CardHeader>
            <CardTitle>Personality Traits</CardTitle>
            <CardDescription>These traits influence training, scouting, and management decisions.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {traitItems.map(trait => (
                <div key={trait.key} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <trait.icon className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{trait.label}</span>
                    <span className="ml-auto text-sm text-muted-foreground">{Math.round(trait.value)}</span>
                  </div>
                  <Progress value={trait.value} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ALL OYAKATA */}
        <Card>
          <CardHeader>
            <CardTitle>All Oyakata</CardTitle>
            <CardDescription>Browse all stable masters in the sumo world.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from(world.oyakata.values()).map((o) => {
                const heya = world.heyas.get(o.heyaId);
                const isSelected = o.id === selectedOyakata.id;
                return (
                  <Card 
                    key={o.id} 
                    className={`cursor-pointer transition-colors ${isSelected ? 'ring-2 ring-primary' : 'hover:bg-muted/50'}`}
                    onClick={() => setSelectedOyakata(o)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>{o.name[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{o.name}</p>
                          <p className="text-sm text-muted-foreground">{heya?.name || "Unknown Stable"}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="mt-2 capitalize text-xs">
                        {o.archetype?.replace("_", " ")}
                      </Badge>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
