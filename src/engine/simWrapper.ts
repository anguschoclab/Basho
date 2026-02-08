// Wrapper for simulateFight with signals
import { simulateFight, MinutePlan, FightOutcome } from './stub';
import { sendSignal } from './signals';

export function simulateFightAndSignal(planA: MinutePlan, planD: MinutePlan): FightOutcome {
  const out = simulateFight(planA, planD);
  
  // Emit signal for UI
  sendSignal({
    type: 'fight:result',
    payload: {
      winnerSide: out.winner,
      by: out.by,
      minutes: out.minutes,
      tags: [],
    },
  });
  
  return out;
}

export { simulateFight };
