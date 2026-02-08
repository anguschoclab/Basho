import * as React from 'react';

function tone(fame: number) {
  if (fame >= 80) return 'bg-purple-600 text-white';
  if (fame >= 50) return 'bg-purple-500/80 text-white';
  if (fame >= 20) return 'bg-purple-400/70 text-white';
  return 'bg-zinc-600/60 text-white';
}

export function FameChip({ value }: { value: number }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs rounded-full ${tone(value)}`}>
      Fame {Math.round(value)}
    </span>
  );
}
