import React from "react";
import { useNavigate } from "@tanstack/react-router";
import { useGame } from "@/contexts/useGame";
import { useToast } from "@/hooks/use-toast";

export function useCalendarActions() {
  const {
    state,
    advanceInterim,
    advanceOneDay,
    simulateAllBouts,
    endDay,
    advanceDay,
    simFullBasho,
  } = useGame();
  const { toast } = useToast();
  const navigate = useNavigate();
  const world = state.world;

  const handleAdvanceDay = React.useCallback(() => {
    advanceOneDay();
    toast({ title: "Day advanced" });
  }, [advanceOneDay, toast]);

  const handleAdvanceWeek = React.useCallback(() => {
    advanceInterim(1);
    toast({ title: "Week advanced" });
  }, [advanceInterim, toast]);

  const handleSimDay = React.useCallback(() => {
    simulateAllBouts();
    endDay();
    advanceDay();
    toast({ title: "Day simulated" });
  }, [simulateAllBouts, endDay, advanceDay, toast]);

  const handleSimFullBasho = React.useCallback(() => {
    simFullBasho();
    toast({ title: "Basho complete!", description: "All 15 days simulated." });
    navigate({ to: "/basho" });
  }, [simFullBasho, navigate, toast]);

  const navToSchedule = React.useCallback(() => navigate({ to: "/basho/schedule" }), [navigate]);
  const navToBasho = React.useCallback(() => navigate({ to: "/basho" }), [navigate]);

  return {
    world,
    handleAdvanceDay,
    handleAdvanceWeek,
    handleSimDay,
    handleSimFullBasho,
    navToSchedule,
    navToBasho,
  };
}
