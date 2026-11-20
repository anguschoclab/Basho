import { useMemo, useState } from "react";
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
import { Users, Send } from "lucide-react";
import { useGameStore } from "@/state/stores/gameStore";
import type { Heya } from "@/engine/types/heya";
import type { HeyaTrainingState } from "@/engine/types/training";
import type { Rikishi } from "@/engine/types/rikishi";
import { DEGEIKO_MAX_PARTICIPANTS } from "@/constants/engine/degeiko";

interface Props {
  heyas: Heya[];
  trainingState?: Map<string, HeyaTrainingState>;
  playerHeyaId: string;
  heyaRikishi: Rikishi[];
}

/**
 * W I — degeiko request panel. Sends up to DEGEIKO_MAX_PARTICIPANTS
 * rikishi to train at another stable for the week; the session resolves
 * in the weekly training phase.
 */
export function DegeikoPanel({ heyas, trainingState, playerHeyaId, heyaRikishi }: Props) {
  const sendCommand = useGameStore((s) => s.sendCommand);
  const [targetHeyaId, setTargetHeyaId] = useState<string>("");
  const [selected, setSelected] = useState<string[]>([]);

  const otherHeyas = useMemo(
    () => heyas.filter((h) => h.id !== playerHeyaId),
    [heyas, playerHeyaId]
  );
  const eligible = useMemo(
    () => heyaRikishi.filter((r) => !r.injured && !r.isRetired),
    [heyaRikishi]
  );
  const pending = trainingState?.get(playerHeyaId)?.pendingDegeiko;
  const pendingTarget = pending
    ? heyas.find((h) => h.id === pending.targetHeyaId)?.name
    : undefined;

  const toggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length < DEGEIKO_MAX_PARTICIPANTS
          ? [...prev, id]
          : prev
    );

  const submit = () => {
    if (!targetHeyaId || selected.length === 0) return;
    sendCommand({
      type: "REQUEST_DEGEIKO",
      heyaId: playerHeyaId,
      targetHeyaId,
      rikishiIds: selected,
    });
    setSelected([]);
    setTargetHeyaId("");
  };

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <Users className="h-4 w-4" /> Degeiko — Cross-Stable Keiko
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {pending ? (
          <div className="text-xs text-muted-foreground">
            <Badge variant="outline" className="mr-2">
              Scheduled
            </Badge>
            {pending.rikishiIds.length} rikishi training at{" "}
            <span className="font-bold text-foreground">
              {pendingTarget ?? pending.targetHeyaId}
            </span>{" "}
            this week.
          </div>
        ) : (
          <>
            <Select value={targetHeyaId} onValueChange={setTargetHeyaId}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Choose a host stable…" />
              </SelectTrigger>
              <SelectContent>
                {otherHeyas.map((h) => (
                  <SelectItem key={h.id} value={h.id}>
                    {h.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex flex-wrap gap-1.5">
              {eligible.map((r) => (
                <Badge
                  key={r.id}
                  variant={selected.includes(r.id) ? "default" : "outline"}
                  className="cursor-pointer select-none"
                  onClick={() => toggle(r.id)}
                >
                  {r.shikona}
                </Badge>
              ))}
            </div>

            <Button
              size="sm"
              className="h-7 text-xs"
              disabled={!targetHeyaId || selected.length === 0}
              onClick={submit}
            >
              <Send className="h-3 w-3 mr-1" /> Request degeiko ({selected.length}/
              {DEGEIKO_MAX_PARTICIPANTS})
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
