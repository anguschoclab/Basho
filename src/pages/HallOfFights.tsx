import React from 'react';
import { LoreArchive } from '../lore/LoreArchive';

export default function HallOfFights() {
  const hall = LoreArchive.allHall();
  const fights = LoreArchive.allFights();

  const getFight = (fightId: string) => fights.find((f) => f.id === fightId);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Hall of Fights</h1>
      
      {hall.length === 0 ? (
        <p className="text-neutral-400">No legendary fights recorded yet.</p>
      ) : (
        <div className="space-y-4">
          {hall.map((entry, i) => {
            const fight = getFight(entry.fightId);
            return (
              <div
                key={`${entry.week}-${entry.label}-${i}`}
                className="rounded-lg border border-neutral-700 bg-neutral-800/50 p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-amber-400">{entry.label}</span>
                  <span className="text-sm text-neutral-400">Week {entry.week}</span>
                </div>
                {fight && (
                  <div className="mt-2 text-sm text-neutral-300">
                    {fight.a} vs {fight.d} — Winner: {fight.winner || 'Draw'} by {fight.by || 'Decision'}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
