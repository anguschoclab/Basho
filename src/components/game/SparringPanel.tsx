import { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Swords, Plus, X } from "lucide-react";
import type { Rikishi } from "@/engine/types/rikishi";
import type { SparringPair } from "@/engine/types/training";
import { SparringService } from "@/engine/systems/training/SparringService";

interface Props {
  heyaRikishi: Rikishi[];
  pairs: SparringPair[];
  onAddPair: (aId: string, bId: string) => void;
  onRemovePair: (aId: string, bId: string) => void;
}

const CHEM_STYLES = {
  friction: {
    label: "Friction",
    className: "text-[hsl(var(--success))] border-[hsl(var(--success)/0.35)]",
  },
  rut: { label: "Rut", className: "text-[hsl(var(--warning))] border-[hsl(var(--warning)/0.35)]" },
  neutral: { label: "Neutral", className: "text-muted-foreground" },
} as const;

export function SparringPanel({ heyaRikishi, pairs, onAddPair, onRemovePair }: Props) {
  const [selectedA, setSelectedA] = useState("");
  const [selectedB, setSelectedB] = useState("");

  const pairedIds = useMemo(() => new Set(pairs.flatMap((p) => [p.aId, p.bId])), [pairs]);

  const rikishiById = useMemo(() => new Map(heyaRikishi.map((r) => [r.id, r])), [heyaRikishi]);

  const availableRikishi = useMemo(
    () => heyaRikishi.filter((r) => !pairedIds.has(r.id) && !r.injured && !r.isRetired),
    [heyaRikishi, pairedIds]
  );

  const previewChemistry = useMemo(() => {
    if (!selectedA || !selectedB) return null;
    const a = rikishiById.get(selectedA);
    const b = rikishiById.get(selectedB);
    if (!a || !b) return null;
    return SparringService.calculateChemistry(a, b);
  }, [selectedA, selectedB, rikishiById]);

  const handleAdd = () => {
    if (selectedA && selectedB) {
      onAddPair(selectedA, selectedB);
      setSelectedA("");
      setSelectedB("");
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-display font-semibold flex items-center gap-2">
          <Swords className="h-4 w-4 text-muted-foreground" />
          Sparring Pairs
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {pairs.length === 0 && (
          <p className="text-xs text-muted-foreground italic font-body">
            No sparring pairs assigned. Pair rikishi with different styles for best results.
          </p>
        )}

        {pairs.map((pair) => {
          const a = rikishiById.get(pair.aId);
          const b = rikishiById.get(pair.bId);
          if (!a || !b) return null;
          const chem = CHEM_STYLES[pair.chemistry];
          return (
            <div
              key={`${pair.aId}-${pair.bId}`}
              className="flex items-center justify-between gap-2 py-1"
            >
              <span className="text-sm">
                {a.shikona} <span className="text-muted-foreground">vs</span> {b.shikona}
              </span>
              <Badge
                variant="outline"
                className={`font-mono text-[9px] tracking-wider ${chem.className}`}
              >
                {chem.label}
              </Badge>
              <span className="text-xs text-muted-foreground font-mono tabular-nums">
                {pair.weeksActive}w
              </span>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                title="Remove pair"
                onClick={() => onRemovePair(pair.aId, pair.bId)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          );
        })}

        {availableRikishi.length >= 2 && (
          <div className="flex gap-2 items-center pt-2 border-t">
            <Select value={selectedA} onValueChange={setSelectedA}>
              <SelectTrigger className="w-32 h-7 text-xs">
                <SelectValue placeholder="Rikishi A" />
              </SelectTrigger>
              <SelectContent>
                {availableRikishi.map((r) =>
                  r.id === selectedB ? null : (
                    <SelectItem key={r.id} value={r.id}>
                      {r.shikona}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
            <span className="text-muted-foreground text-xs">vs</span>
            <Select value={selectedB} onValueChange={setSelectedB}>
              <SelectTrigger className="w-32 h-7 text-xs">
                <SelectValue placeholder="Rikishi B" />
              </SelectTrigger>
              <SelectContent>
                {availableRikishi.map((r) =>
                  r.id === selectedA ? null : (
                    <SelectItem key={r.id} value={r.id}>
                      {r.shikona}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
            {previewChemistry && (
              <span className={`text-xs ${CHEM_STYLES[previewChemistry].className}`}>
                {CHEM_STYLES[previewChemistry].label}
              </span>
            )}
            <Button
              size="sm"
              className="h-7 text-xs"
              disabled={!selectedA || !selectedB}
              onClick={handleAdd}
            >
              <Plus className="h-3 w-3 mr-1" />
              Pair
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
