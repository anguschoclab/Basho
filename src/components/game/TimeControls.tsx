import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Play, FastForward, Trophy, Calendar, ArrowRight, Repeat } from "lucide-react";
import { useGame } from "@/contexts/GameContext";
import { useToast } from "@/components/ui/use-toast";
import { HolidayControls } from "./HolidayControls";
import { AutoSimControls } from "./AutoSimControls";

/**
 * TimeControls
 * - Drives time through the orchestrator-backed GameContext actions.
 * - Exposes weekly tick, holiday, and auto-sim controls.
 */
export function TimeControls() {
  const {
    state,
    startBasho,
    advanceDay,
    simulateAllBouts,
    endDay,
    endBasho,
    setPhase,
    advanceInterim,
    advanceOneDay,
    goOnHoliday,
    runAutoSimAction,
  } = useGame();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isSimulating, setIsSimulating] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  const world = state.world;
  if (!world) return null;

  const inBasho = world.cyclePhase === "active_basho" && !!world.currentBasho;
  const inInterim = world.cyclePhase === "interim";
  const playerHeyaId = world.playerHeyaId;

  const handleStartBasho = () => {
    startBasho();
    toast({ title: "Basho started", description: "The tournament is underway." });
    navigate("/basho");
  };

  const handleSimDay = () => {
    simulateAllBouts();
    endDay();
    toast({ title: "Day completed", description: "All bouts simulated." });
  };

  const handleAdvanceDay = () => {
    advanceDay();
  };

  const handleEndBasho = () => {
    setShowEndConfirm(true);
  };

  const confirmEndBasho = () => {
    setShowEndConfirm(false);
    endBasho();
    toast({ title: "Basho concluded", description: "Results logged and banzuke updated." });
  };

  const handleAdvanceWeek = () => {
    advanceInterim(1);
    toast({ title: "Week advanced", description: "Training, economy, and governance have progressed." });
  };

  const handleAdvanceOneDay = () => {
    advanceOneDay();
    toast({ title: "Day advanced", description: `Day ${(world.dayIndexGlobal || 0) + 1} complete.` });
  };

  const handleAutoSim = async (config: any) => {
    setIsSimulating(true);
    try {
      const result = await runAutoSimAction(config);
      if (!result) throw new Error("No world loaded");
      return result;
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <>
    <Card>
      <CardContent className="p-4 flex flex-wrap gap-2 items-center">
        {!inBasho ? (
          <>
            {inInterim && (
              <>
                <Button variant="secondary" size="sm" onClick={handleAdvanceOneDay} className="gap-2">
                  <ArrowRight className="h-4 w-4" />
                  Advance Day
                </Button>
                <Button variant="outline" onClick={handleAdvanceWeek} className="gap-2">
                  <Repeat className="h-4 w-4" />
                  Advance Week
                </Button>
              </>
            )}
            <Button onClick={handleStartBasho} className="gap-2">
              <Play className="h-4 w-4" />
              Start Basho
            </Button>
            <HolidayControls
              onHoliday={goOnHoliday}
              playerHeyaId={playerHeyaId}
              currentPhase={world.cyclePhase}
            />
            <AutoSimControls
              onStartSim={handleAutoSim}
              isSimulating={isSimulating}
              playerHeyaId={playerHeyaId}
            />
            <Button variant="outline" onClick={() => setPhase("interim")} className="gap-2">
              <Calendar className="h-4 w-4" />
              Interim
            </Button>
          </>
        ) : (
          <>
            <Button onClick={handleSimDay} className="gap-2">
              <FastForward className="h-4 w-4" />
              Simulate Day
            </Button>
            <Button variant="outline" onClick={handleAdvanceDay} className="gap-2">
              <ArrowRight className="h-4 w-4" />
              Next Day
            </Button>
            <Button variant="outline" onClick={handleEndBasho} className="gap-2">
              <Trophy className="h-4 w-4" />
              End Basho
            </Button>
          </>
        )}
      </CardContent>
    </Card>

    <AlertDialog open={showEndConfirm} onOpenChange={setShowEndConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>End Tournament?</AlertDialogTitle>
          <AlertDialogDescription>
            This will finalize results, update banzuke rankings, and advance to the off-season.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={confirmEndBasho}>End Basho</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
