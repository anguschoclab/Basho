import React, { useState } from "react";
import { useGame } from "../contexts/GameContext";
import { listBashoSummaries } from "../engine/historyIndex";

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

const RecordsTab: React.FC<{ world: any }> = ({ world }) => {
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
            {cat.data.slice(0, 5).map((entry: any, idx: number) => (
              <li key={idx} className="flex justify-between items-center text-lg">
                <span className="text-white">
                  {idx + 1}. {entry.shikona} ({entry.heya})
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

const HallOfFameTab: React.FC<{ world: any }> = ({ world }) => {
  const inductees = world.hallOfFame?.inductees || [];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12">
      {inductees.map((ind: any, i: number) => (
        <div
          key={i}
          className="hof-card relative p-8 border-2 border-[#d4af37] bg-[#111] overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-2 bg-[#d4af37] text-black font-bold uppercase text-xs">
            {ind.category}
          </div>
          <div className="text-center mb-6">
            <div className="text-4xl font-extrabold mb-1">{ind.shikona}</div>
            <div className="text-[#8b7355] tracking-widest uppercase italic">{ind.heya}</div>
          </div>
          <div className="space-y-2 border-t border-[#3d2b1f] pt-4 text-sm">
            <div className="flex justify-between">
              <span>Inducted Year:</span> <span className="text-white">{ind.inductedYear}</span>
            </div>
            <div className="flex justify-between">
              <span>Highest Rank:</span>{" "}
              <span className="text-white uppercase">{ind.highestRank}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Wins:</span> <span className="text-white">{ind.totalCareerWins}</span>
            </div>
            <div className="flex justify-between">
              <span>Yusho:</span> <span className="text-white">{ind.yushoCount}</span>
            </div>
          </div>
        </div>
      ))}
      {inductees.length === 0 && (
        <div className="col-span-full text-center py-24 text-[#5c4033] italic text-2xl">
          The Hall of Fame is empty. Future legends await...
        </div>
      )}
    </div>
  );
};

const StablesTab: React.FC<{ world: any }> = ({ world }) => {
  const activeStables = Array.from(world.heyas.values());

  return (
    <div className="space-y-12">
      {activeStables.map((heya: any) => (
        <div key={heya.id} className="heya-ancestry-row border-l-4 border-[#d4af37] pl-8 py-4">
          <h2 className="text-3xl font-bold mb-4">{heya.nameJa || heya.name}</h2>
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
            {(heya.lineage || []).map((tenure: any, idx: number) => (
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

const AlmanacTab: React.FC<{ world: any }> = ({ world }) => {
  const summaries = world.historyIndex ? listBashoSummaries(world.historyIndex).reverse() : [];

  return (
    <div className="space-y-8">
      {summaries.slice(0, 20).map((summary) => (
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
                {world.rikishi.get(summary.yusho)?.shikona || "N/A"}
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
