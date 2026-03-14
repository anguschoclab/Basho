// PressConference.tsx — Interactive media/press conference events
import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Newspaper, Mic, Camera, MessageSquare, TrendingUp, TrendingDown } from "lucide-react";
import type { WorldState } from "@/engine/types/world";

interface PressQuestion {
  id: string;
  reporter: string;
  outlet: string;
  question: string;
  answers: Array<{
    label: string;
    tone: "humble" | "confident" | "deflect" | "aggressive";
    effect: { reputation: number; morale: number; mediaHeat: number };
    response: string;
  }>;
}

function generatePressQuestions(world: WorldState): PressQuestion[] {
  const playerHeya = world.playerHeyaId ? world.heyas.get(world.playerHeyaId) : null;
  if (!playerHeya) return [];
  
  const questions: PressQuestion[] = [];
  const lastBasho = world.history[world.history.length - 1];
  
  // Question about basho performance
  const totalWins = playerHeya.rikishiIds.reduce((sum, id) => {
    const r = world.rikishi.get(id);
    return sum + (r?.currentBashoWins ?? 0);
  }, 0);
  const totalLosses = playerHeya.rikishiIds.reduce((sum, id) => {
    const r = world.rikishi.get(id);
    return sum + (r?.currentBashoLosses ?? 0);
  }, 0);
  const winRate = totalWins + totalLosses > 0 ? totalWins / (totalWins + totalLosses) : 0.5;

  questions.push({
    id: "basho_performance",
    reporter: "Yamada",
    outlet: "NHK Sports",
    question: winRate >= 0.6 
      ? `Your stable had an impressive tournament. What's the secret to your success?`
      : winRate >= 0.45
        ? `A mixed basho for ${playerHeya.name}. How do you assess your wrestlers' performances?`
        : `A difficult tournament for your stable. What changes do you plan to make?`,
    answers: [
      {
        label: "Humble",
        tone: "humble",
        effect: { reputation: 3, morale: 1, mediaHeat: -5 },
        response: "We are grateful for every match. Our wrestlers gave their best, and we will continue to work hard in the keiko-ba.",
      },
      {
        label: "Confident",
        tone: "confident",
        effect: { reputation: 1, morale: 3, mediaHeat: 5 },
        response: "Our training methods are producing results. I expect even greater things from my wrestlers next basho.",
      },
      {
        label: "Deflect",
        tone: "deflect",
        effect: { reputation: 0, morale: 0, mediaHeat: -10 },
        response: "The dohyo speaks for itself. We focus on what's ahead, not what's behind.",
      },
    ],
  });

  // Question about rivalries or specific results
  if (lastBasho) {
    const hasYusho = lastBasho.yusho && playerHeya.rikishiIds.includes(lastBasho.yusho);
    
    questions.push({
      id: "future_plans",
      reporter: "Suzuki",
      outlet: "Sumo Journal",
      question: hasYusho
        ? "With a Yūshō winner under your roof, what are your goals for next tournament?"
        : "What's your recruitment strategy heading into the off-season?",
      answers: [
        {
          label: "Ambitious",
          tone: "confident",
          effect: { reputation: 2, morale: 4, mediaHeat: 8 },
          response: "We aim for the Emperor's Cup. Every wrestler in our stable dreams of standing at the top.",
        },
        {
          label: "Strategic",
          tone: "deflect",
          effect: { reputation: 4, morale: 2, mediaHeat: 2 },
          response: "We're focused on developing our young talent and strengthening our foundations.",
        },
        {
          label: "Provocative",
          tone: "aggressive",
          effect: { reputation: -2, morale: 5, mediaHeat: 15 },
          response: "The other stables should be worried. We're just getting started.",
        },
      ],
    });
  }

  return questions;
}

interface PressConferenceProps {
  world: WorldState;
  open: boolean;
  onClose: (effects: { reputation: number; morale: number; mediaHeat: number }) => void;
}

export function PressConference({ world, open, onClose }: PressConferenceProps) {
  const questions = useMemo(() => generatePressQuestions(world), [world]);
  const [currentQ, setCurrentQ] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [totalEffects, setTotalEffects] = useState({ reputation: 0, morale: 0, mediaHeat: 0 });
  const [showResult, setShowResult] = useState(false);
  const [lastResponse, setLastResponse] = useState<string | null>(null);

  const question = questions[currentQ];

  const handleAnswer = (ansIdx: number) => {
    if (!question) return;
    const answer = question.answers[ansIdx];
    setSelectedAnswers([...selectedAnswers, ansIdx]);
    setLastResponse(answer.response);
    setShowResult(true);
    setTotalEffects({
      reputation: totalEffects.reputation + answer.effect.reputation,
      morale: totalEffects.morale + answer.effect.morale,
      mediaHeat: totalEffects.mediaHeat + answer.effect.mediaHeat,
    });
  };

  const handleNext = () => {
    setShowResult(false);
    setLastResponse(null);
    if (currentQ < questions.length - 1) {
      setCurrentQ(currentQ + 1);
    } else {
      onClose(totalEffects);
    }
  };

  if (questions.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose(totalEffects)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <Mic className="h-5 w-5" />
            Press Conference
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Question {currentQ + 1} of {questions.length}
          </p>
        </DialogHeader>

        {question && (
          <div className="space-y-4">
            {/* Reporter */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Camera className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{question.reporter}</p>
                <p className="text-xs text-muted-foreground">{question.outlet}</p>
              </div>
            </div>

            {/* Question */}
            <div className="p-4 rounded-lg border">
              <p className="text-sm italic leading-relaxed">"{question.question}"</p>
            </div>

            {/* Answer choices or result */}
            {!showResult ? (
              <div className="space-y-2">
                {question.answers.map((ans, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    className="w-full justify-start text-left h-auto py-3 px-4"
                    onClick={() => handleAnswer(i)}
                  >
                    <MessageSquare className="h-4 w-4 mr-3 shrink-0 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">{ans.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 whitespace-normal">{ans.response.slice(0, 60)}...</p>
                    </div>
                  </Button>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-4 rounded-lg bg-card border">
                  <p className="text-sm italic">"{lastResponse}"</p>
                </div>

                <div className="flex gap-3 text-xs justify-center">
                  {totalEffects.reputation > 0 && (
                    <Badge variant="outline" className="gap-1 text-emerald-500">
                      <TrendingUp className="h-3 w-3" /> Rep +{totalEffects.reputation}
                    </Badge>
                  )}
                  {totalEffects.reputation < 0 && (
                    <Badge variant="outline" className="gap-1 text-destructive">
                      <TrendingDown className="h-3 w-3" /> Rep {totalEffects.reputation}
                    </Badge>
                  )}
                  {totalEffects.mediaHeat > 5 && (
                    <Badge variant="outline" className="gap-1 text-amber-500">
                      <Newspaper className="h-3 w-3" /> Media Heat +{totalEffects.mediaHeat}
                    </Badge>
                  )}
                </div>

                <Button onClick={handleNext} className="w-full">
                  {currentQ < questions.length - 1 ? "Next Question" : "End Conference"}
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
