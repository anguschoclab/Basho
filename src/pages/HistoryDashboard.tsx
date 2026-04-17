import React, { useState } from "react";
import { useGame } from "../contexts/GameContext";
import { listBashoSummaries } from "../engine/historyIndex";
import { selectRetiredRikishi } from "../presenters/selectors";
import type {
  WorldState,
  Rikishi,
  Heya,
  BashoHistorySummary,
  RecordEntry,
  HoFInductee,
} from "@/presenters/uiDigest";

/**
 * HistoryDashboard - The Museum of Sumo
 * =====================================
 * A premium archival UI for exploring the 100+ years of simulation history.
 */
export const HistoryDashboard: React.FC = () => {
  const { state } = useGame();
  const world = state.world;
  const [activeTab, setActiveTab] = useState<"records" | "hof" | "stables" | "almanac">("records");

  if (!world) return <div className="p-12 text-center text-[#5c4033]">No world loaded.</div>;

  return (
    <div className="history-museum min-h-screen bg-[#1a1a1a] text-[#d4af37] font-serif p-8">
      <style>
        {`
                .history-museum {
                    background-image: 
                        linear-gradient(rgba(26, 26, 26, 0.95), rgba(26, 26, 26, 0.95)),
                        url('https://www.transparenttextures.com/patterns/dark-leather.png') !important;
                }
                .record-card {
                    background: linear-gradient(145deg, #2a2a2a, #1a1a1a);
                    box-shadow: 5px 5px 15px #0d0d0d, -5px -5px 15px #272727;
                }
                .gold-text {
                    color: #d4af37;
                    text-shadow: 0 0 5px rgba(212, 175, 55, 0.3);
                }
                `}
      </style>

      <header className="text-center mb-12 border-b border-[#d4af37] pb-8">
        <h1 className="text-5xl uppercase tracking-widest mb-2 font-bold">Museum of Sumo</h1>
        <p className="text-[#8b7355] italic text-lg">
          Preserving the legacy of the Dohyo since Year 0
        </p>
      </header>

      <nav className="flex justify-center gap-8 mb-12">
        {(["records", "hof", "stables", "almanac"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`text-xl uppercase tracking-wider pb-2 border-b-2 transition-all ${
              activeTab === tab
                ? "border-[#d4af37] text-white"
                : "border-transparent text-[#5c4033] hover:text-[#d4af37]"
            }`}
          >
            {tab}
          </button>
        ))}
      </nav>

      <main className="max-w-6xl mx-auto">
        {activeTab === "records" && <RecordsTab world={world} />}
        {activeTab === "hof" && <HallOfFameTab world={world} />}
        {activeTab === "stables" && <StablesTab world={world} />}
        {activeTab === "almanac" && <AlmanacTab world={world} />}
      </main>
    </div>
  );
};

const RecordsTab: React.FC<{ world: WorldState }> = ({ world }) => {
  const categories = [
    { label: "All-Time Wins", data: world.records?.allTime?.careerWins || [] },
    { label: "Top Division Yusho", data: world.records?.allTime?.yusho || [] },
    { label: "Consecutive Wins", data: world.records?.allTime?.consecutiveYusho || [] },
    { label: "Kinboshi Collectors", data: world.records?.allTime?.kinboshi || [] },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {categories.map((cat, i) => (
        <div key={i} className="record-card p-6 rounded-lg border border-[#3d2b1f]">
          <h2 className="text-2xl border-b border-[#5c4033] mb-4 pb-2 uppercase tracking-tighter">
            {cat.label}
          </h2>
          <ul className="space-y-4">
            {cat.data.slice(0, 5).map((entry: RecordEntry, idx: number) => (
              <li key={idx} className="flex justify-between items-center text-lg">
                <span className="text-white">
                  {idx + 1}. {entry.shikona}
                </span>
                <span className="gold-text font-bold">{entry.value}</span>
              </li>
            ))}
            {cat.data.length === 0 && (
              <li className="text-[#5c4033] italic">No records yet recorded...</li>
            )}
          </ul>
        </div>
      ))}
    </div>
  );
};

const HallOfFameTab: React.FC<{ world: WorldState }> = ({ world }) => {
  const inductees = world.hallOfFame?.inductees || [];
  const retired = selectRetiredRikishi(world);

  return (
    <div className="space-y-16">
      <section>
        <h2 className="text-2xl uppercase tracking-widest border-b border-[#d4af37] pb-3 mb-8">
          Hall of Fame Inductees
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12">
          {inductees.map((ind: HoFInductee, i: number) => (
            <div
              key={i}
              className="hof-card relative p-8 border-2 border-[#d4af37] bg-[#111] overflow-hidden group"
            >
              <div className="absolute top-0 right-0 p-2 bg-[#d4af37] text-black font-bold uppercase text-xs">
                {ind.category}
              </div>
              <div className="text-center mb-6">
                <div className="text-4xl font-bold mb-1">{ind.shikona}</div>
                <div className="text-[#8b7355] tracking-widest uppercase italic">
                  {world.heyas.get(ind.rikishiId)?.name ?? "—"}
                </div>
              </div>
              <div className="space-y-2 text-sm text-[#5c4033]">
                <div>
                  Highest Rank: <span className="text-white">{ind.stats.highestRank}</span>
                </div>
                <div>
                  Career Wins: <span className="text-white">{ind.stats.careerWins}</span>
                </div>
                <div>
                  Yusho: <span className="text-white">{ind.stats.yushoCount}</span>
                </div>
              </div>
            </div>
          ))}
          {inductees.length === 0 && (
            <div className="col-span-full text-center py-16 text-[#5c4033] italic text-2xl">
              The Hall of Fame is empty. Future legends await...
            </div>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-2xl uppercase tracking-widest border-b border-[#5c4033] pb-3 mb-8">
          Retired Legends
        </h2>
        {retired.length === 0 ? (
          <p className="text-center py-12 text-[#5c4033] italic">No retirements on record yet.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {retired.slice(0, 40).map((r: Rikishi) => {
              const heyaName = world.heyas?.get(r.heyaId)?.name || r.heyaId;
              return (
                <div
                  key={r.id}
                  className="record-card p-4 border border-[#3d2b1f] rounded text-center"
                >
                  <div className="text-lg font-bold mb-1">{r.shikona}</div>
                  <div className="text-xs text-[#8b7355] uppercase tracking-wider mb-2">
                    {r.rank || "—"}
                  </div>
                  <div className="text-xs text-[#5c4033] italic truncate">{heyaName}</div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

interface LineageTenure {
  generation: number;
  name: string;
  startYear: number;
  endYear?: number;
  achievements?: {
    sekitoriCount?: number;
    titlesWon?: number;
  };
}

const StablesTab: React.FC<{ world: WorldState }> = ({ world }) => {
  const activeStables = Array.from(world.heyas.values());

  return (
    <div className="space-y-12">
      {activeStables.map((heya: Heya) => (
        <div key={heya.id} className="heya-ancestry-row border-l-4 border-[#d4af37] pl-8 py-4">
          <h2 className="text-3xl font-bold mb-4">{heya.nameJa || heya.name}</h2>
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
            {(heya.lineage || []).map((tenure: LineageTenure, idx: number) => (
              <div
                key={idx}
                className="flex-shrink-0 w-64 bg-[#222] p-4 border border-[#3d2b1f] relative"
              >
                <div className="absolute -left-2 top-1/2 w-4 h-4 rounded-full bg-[#d4af37]" />
                <div className="text-[#8b7355] text-xs uppercase mb-1">
                  Generation {tenure.generation}
                </div>
                <div className="text-xl font-bold mb-2">{tenure.name}</div>
                <div className="text-sm text-[#5c4033] mb-4">
                  {tenure.startYear} — {tenure.endYear || "Present"}
                </div>
                <div className="text-xs space-y-1 text-white border-t border-[#3d2b1f] pt-2">
                  <div>Sekitori Produced: {tenure.achievements?.sekitoriCount || 0}</div>
                  <div>Titles Won: {tenure.achievements?.titlesWon || 0}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

const AlmanacTab: React.FC<{ world: WorldState }> = ({ world }) => {
  const summaries = world.historyIndex ? listBashoSummaries(world.historyIndex).reverse() : [];

  return (
    <div className="space-y-8">
      {summaries.slice(0, 20).map((summary: BashoHistorySummary) => (
        <div
          key={summary.bashoKey}
          className="almanac-entry bg-[#111] p-6 border-b border-[#3d2b1f] group hover:bg-[#1a1a1a] transition-all"
        >
          <div className="flex justify-between items-end mb-4">
            <div>
              <span className="text-4xl font-bold mr-4">{summary.year}</span>
              <span className="text-[#d4af37] uppercase tracking-widest text-xl">
                {summary.bashoName}
              </span>
            </div>
            <div className="text-[#8b7355] italic">Volume {summary.year + 1}</div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="stat">
              <label className="block text-xs uppercase text-[#5c4033]">Yusho Winner</label>
              <span className="text-lg text-white font-bold">
                {summary.yusho ? (world.rikishi.get(summary.yusho)?.shikona ?? "N/A") : "N/A"}
              </span>
            </div>
            <div className="stat">
              <label className="block text-xs uppercase text-[#5c4033]">Jun-Yusho</label>
              <span className="text-sm text-white">
                {(summary.junYusho || []).length} Competitors
              </span>
            </div>
            <div className="stat">
              <label className="block text-xs uppercase text-[#5c4033]">Prizes Awarded</label>
              <span className="text-sm text-white">
                {[summary.ginoSho, summary.kantosho, summary.shukunsho].filter(Boolean).length}{" "}
                Sansho
              </span>
            </div>
          </div>
        </div>
      ))}
      {summaries.length === 0 && (
        <div className="text-center py-24 text-[#5c4033] italic text-2xl">
          The world is young. No history has been written yet.
        </div>
      )}
    </div>
  );
};
