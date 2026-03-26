import React from 'react';
import { UIRikishi } from "../../presenters/uiModels";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import { UserPlus } from "lucide-react";

interface RikishiCardProps {
  rikishi: UIRikishi;
}

export const RikishiCard: React.FC<RikishiCardProps> = ({ rikishi }) => {
  const getStanceLabel = () => {
    if (rikishi.preferredGrip === 'none') return 'Oshi-Specialist';
    
    const grip = rikishi.preferredGrip === 'migi' ? 'Migi-Yotsu' : 'Hidari-Yotsu';
    const depth = rikishi.preferredGripDepth === 'maemitsu' ? '(Maemitsu)' : 
                  rikishi.preferredGripDepth === 'deep' ? '(Deep)' : '';
    
    return `${grip} ${depth}`.trim();
  };

  return (
    <Card data-testid="rikishi-card" className="w-full max-w-md bg-card/50 backdrop-blur-sm border-primary/20 hover:border-primary/40 transition-all">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-2xl font-display text-primary">{rikishi.shikona}</CardTitle>
            <p className="text-sm text-muted-foreground">{rikishi.heyaName} Heya | {rikishi.rankLabel}</p>
          </div>
          <Badge variant="outline" className="font-mono">{rikishi.archetypeName}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-muted/30 border border-primary/10">
            <h4 className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Tactical Stance</h4>
            <p className="text-lg font-display text-primary-foreground">{getStanceLabel()}</p>
          </div>

          <div>
            <h4 className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Favored Kimarite</h4>
            <div className="flex flex-wrap gap-2">
              {rikishi.favoredKimarite.map((k, i) => (
                <Badge key={i} variant="secondary" className="bg-primary/5 hover:bg-primary/10 text-primary-foreground border-primary/20">
                  {k}
                </Badge>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-primary/5">
            <div>
              <h4 className="text-[10px] uppercase tracking-widest text-muted-foreground">Height</h4>
              <p className="font-medium">{rikishi.height} cm</p>
            </div>
            <div>
              <h4 className="text-[10px] uppercase tracking-widest text-muted-foreground">Weight</h4>
              <p className="font-medium">{rikishi.weight} kg</p>
            </div>
          </div>

          {rikishi.nationality !== 'Japan' && (
            <div className="pt-2 border-t border-primary/5 bg-amber-500/5 -mx-6 px-6 py-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-[10px] uppercase tracking-widest text-amber-600 font-bold flex items-center gap-1">
                  <UserPlus className="h-3 w-3" /> Residency Tracker
                </h4>
                <span className="text-[10px] font-mono font-bold text-amber-600">
                  {Math.min(100, Math.floor((rikishi.careerHistory.length / 60) * 100))}%
                </span>
              </div>
              <Progress 
                value={Math.min(100, (rikishi.careerHistory.length / 60) * 100)} 
                className="h-1 bg-amber-200/50" 
              />
              <p className="text-[8px] text-amber-700/70 mt-1 uppercase font-bold tracking-tighter">
                Progress towards Japanese Citizenship (10yr target)
              </p>
            </div>
          )}

          <div className="pt-2 border-t border-primary/5">
            <h4 className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Career Prestige</h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1 p-2 rounded bg-yellow-500/5 border border-yellow-500/10">
                <span className="text-[10px] uppercase font-bold text-yellow-600 dark:text-yellow-400">Gold Stars Won</span>
                <span className="font-display text-xl font-bold">{rikishi.achievements.kinboshiEarned}</span>
              </div>
              <div className="flex flex-col gap-1 p-2 rounded bg-slate-400/5 border border-slate-400/10">
                <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-300">Silver Stars Won</span>
                <span className="font-display text-xl font-bold">{rikishi.achievements.ginboshiEarned}</span>
              </div>
              {rikishi.rank === 'yokozuna' && (
                <div className="col-span-2 flex justify-between items-center p-2 rounded bg-red-500/5 border border-red-500/10">
                  <span className="text-[10px] uppercase font-bold text-red-600 dark:text-red-400">Stars Conceded</span>
                  <span className="font-display font-bold text-red-600 dark:text-red-400">{rikishi.achievements.kinboshiConceded}</span>
                </div>
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-primary/5 bg-primary/5 -mx-6 px-6 py-3">
            <h4 className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 text-center">Monthly Salary Breakdown</h4>
            <div className="grid grid-cols-3 gap-2 text-[10px] text-center">
              <div className="flex flex-col p-1 rounded bg-background/50 border border-primary/10">
                <span className="text-muted-foreground uppercase font-bold mb-1">Base</span>
                <span className="font-display font-bold text-primary-foreground">¥{(rikishi.salaryBreakdown.base / 1000).toFixed(0)}k</span>
              </div>
              <div className="flex flex-col p-1 rounded bg-background/50 border border-primary/10">
                <span className="text-muted-foreground uppercase font-bold mb-1">Kinboshi</span>
                <span className="font-display font-bold text-amber-500">¥{(rikishi.salaryBreakdown.kinboshiBonus / 1000).toFixed(0)}k</span>
              </div>
              <div className="flex flex-col p-1 rounded bg-primary/20 border border-primary/30">
                <span className="text-primary uppercase font-bold mb-1">Total</span>
                <span className="font-display font-bold text-primary">¥{(rikishi.salaryBreakdown.total / 1000).toFixed(0)}k</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
