import * as React from "react";

export const Chip: React.FC<{ label: string; tone?: "neutral"|"good"|"bad" }> = ({ label, tone="neutral" }) => {
  const toneCls = tone === "good" ? "bg-emerald-600/20 text-emerald-300 ring-emerald-500/30"
                 : tone === "bad" ? "bg-rose-600/20 text-rose-300 ring-rose-500/30"
                 : "bg-slate-600/20 text-slate-200 ring-slate-500/30";
  return <span className={"inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ring-1 " + toneCls}>{label}</span>;
};

export const FlairChip: React.FC<{ flair?: string|null }> = ({ flair }) => {
  if (!flair) return null;
  return <Chip label={flair} tone="good" />;
};

export const ResponsivenessChip: React.FC<{ active: boolean }> = ({ active }) => (
  active ? <Chip label="Responsiveness" tone="good" /> : null
);

export const RiposteChip: React.FC<{ chains?: number }> = ({ chains=0 }) => (
  chains > 0 ? <Chip label={chains > 1 ? `Riposte x${chains}` : "Riposte"} tone="good" /> : null
);
