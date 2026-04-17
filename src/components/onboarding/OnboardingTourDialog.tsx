import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useGameStore } from "@/store/gameStore";
import { Trophy, Swords, Clock, ChevronRight, Sparkles, PartyPopper } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    title: "Welcome to the Stable, Oyakata!",
    description:
      "You are now the master of your own Sumo stable. Your goal is to train champions and dominate the Banzuke. First, learn how time flows in this world.",
    icon: <Clock className="h-12 w-12 text-primary" />,
    accent: "Time Advancement",
    body: "The game moves week-by-week. Use the 'Advance Time' button on the dashboard to trigger training, injuries, and technical progression.",
    image: "dashboard_focus",
  },
  {
    title: "The Sacred Banzuke",
    description:
      "Every two months (6 times a year), a Grand Sumo Tournament (Basho) is held. Your rikishi's performance there determines their rank.",
    icon: <Trophy className="h-12 w-12 text-amber-500" />,
    accent: "Rank & Prestige",
    body: "The Banzuke is more than a list—it's your legacy. Aim for the Sanyaku (top ranks) to unlock higher salaries and legendary status.",
    image: "banzuke_focus",
  },
  {
    title: "Rivalries & Drama",
    description:
      "Sumo isn't just about strength; it's about the stories told in the ring. High-stakes bouts create heat between rikishi and stables.",
    icon: <Swords className="h-12 w-12 text-rose-500" />,
    accent: "Living World",
    body: "Check the Rivalries tab to see which matches are heating up. High-heat bouts draw bigger crowds and more media attention!",
    image: "rivalry_focus",
  },
];

export function OnboardingTourDialog() {
  const showTour = useGameStore((state) => state.showTour);
  const dismissTour = useGameStore((state) => state.dismissTour);
  const [currentStep, setCurrentStep] = useState(0);

  const stepData = STEPS[currentStep];
  const isLastStep = currentStep === STEPS.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      dismissTour("completed");
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleSkip = () => {
    dismissTour("skipped");
  };

  return (
    <Dialog open={showTour} onOpenChange={(open) => !open && handleSkip()}>
      <DialogContent className="sm:max-w-[500px] overflow-hidden p-0 border-none bg-background/95 backdrop-blur-xl shadow-2xl">
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 w-full h-1 bg-muted">
          <div
            className="h-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        <div className="p-8 pb-4">
          <DialogHeader className="items-center text-center space-y-4">
            <div className="relative">
              <div className="absolute -inset-4 bg-primary/20 blur-2xl rounded-full animate-pulse" />
              <div className="relative bg-card p-4 rounded-2xl shadow-inner border border-border/50">
                {stepData.icon}
              </div>
            </div>

            <div className="space-y-2">
              <DialogTitle className="text-2xl font-display font-bold">
                {stepData.title}
              </DialogTitle>
              <DialogDescription className="text-sm leading-relaxed">
                {stepData.description}
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="mt-8 p-6 rounded-xl bg-secondary/50 border border-primary/10 relative overflow-hidden group hover:border-primary/30 transition-colors">
            <div className="absolute -right-4 -top-4 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
              {stepData.icon}
            </div>
            <h4 className="text-[10px] uppercase tracking-widest font-bold text-primary mb-2 flex items-center gap-2">
              <Sparkles className="h-3 w-3" />
              {stepData.accent}
            </h4>
            <p className="text-sm text-foreground/90 font-medium leading-relaxed">
              {stepData.body}
            </p>
          </div>
        </div>

        <div className="p-8 pt-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-1.5">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    i === currentStep ? "w-6 bg-primary" : "w-1.5 bg-muted"
                  )}
                />
              ))}
            </div>

            <button
              onClick={handleSkip}
              className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip Tour
            </button>
          </div>

          <Button onClick={handleNext} size="lg" className="w-full font-bold group h-12">
            {isLastStep ? (
              <>
                <PartyPopper className="mr-2 h-4 w-4" />
                Begin Your Legacy
              </>
            ) : (
              <>
                Next Guide
                <ChevronRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
