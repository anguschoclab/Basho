import React from 'react';
import { UIRikishi } from '../../presenters/uiModels';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';

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
    <Card className="w-full max-w-md bg-card/50 backdrop-blur-sm border-primary/20 hover:border-primary/40 transition-all">
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

          <div className="pt-2 border-t border-primary/5">
            <h4 className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Prestige & Achievements</h4>
            <div className="grid grid-cols-1 gap-2">
              <div className="flex justify-between items-center p-2 rounded bg-yellow-500/5 border border-yellow-500/10">
                <span className="text-xs font-medium text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                  <span className="text-lg">★</span> Gold Stars (Kinboshi)
                </span>
                <span className="font-mono text-sm font-bold">
                  {rikishi.achievements.kinboshiEarned}
                  {(rikishi.rank === 'yokozuna') && (
                    <span className="text-muted-foreground font-normal ml-1">
                      / {rikishi.achievements.kinboshiConceded} <span className="text-[10px] italic">conceded</span>
                    </span>
                  )}
                </span>
              </div>

              <div className="flex justify-between items-center p-2 rounded bg-slate-400/5 border border-slate-400/10">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-300 flex items-center gap-1">
                  <span className="text-lg">☆</span> Silver Stars (Ginboshi)
                </span>
                <span className="font-mono text-sm font-bold">
                  {rikishi.achievements.ginboshiEarned}
                  {(rikishi.rank === 'ozeki') && (
                    <span className="text-muted-foreground font-normal ml-1">
                      / {rikishi.achievements.ginboshiConceded} <span className="text-[10px] italic">conceded</span>
                    </span>
                  )}
                </span>
              </div>

              {Object.entries(rikishi.specialPrizes).some(([_, count]) => count > 0) && (
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {rikishi.specialPrizes.shukunSho > 0 && (
                    <div className="text-[10px] text-center p-1 rounded bg-blue-500/10 border border-blue-500/20">
                      <div className="text-blue-400 font-bold">SHUKUN</div>
                      <div>{rikishi.specialPrizes.shukunSho}</div>
                    </div>
                  )}
                  {rikishi.specialPrizes.kantoSho > 0 && (
                    <div className="text-[10px] text-center p-1 rounded bg-green-500/10 border border-green-500/20">
                      <div className="text-green-400 font-bold">KANTO</div>
                      <div>{rikishi.specialPrizes.kantoSho}</div>
                    </div>
                  )}
                  {rikishi.specialPrizes.ginoSho > 0 && (
                    <div className="text-[10px] text-center p-1 rounded bg-purple-500/10 border border-purple-500/20">
                      <div className="text-purple-400 font-bold">GINO</div>
                      <div>{rikishi.specialPrizes.ginoSho}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-primary/5 bg-primary/5 -mx-6 px-6 py-3">
            <h4 className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Salary Breakdown</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Base Salary</span>
                <span>¥{rikishi.salaryBreakdown.base.toLocaleString()}</span>
              </div>
              {rikishi.salaryBreakdown.kinboshiBonus > 0 && (
                <div className="flex justify-between text-yellow-500/80">
                  <span>Kinboshi Stipend</span>
                  <span>+ ¥{rikishi.salaryBreakdown.kinboshiBonus.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between font-bold pt-1 border-t border-primary/10 text-primary">
                <span>Monthly Total</span>
                <span>¥{rikishi.salaryBreakdown.total.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
