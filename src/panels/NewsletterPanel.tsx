import React from "react";

const Save: any = (globalThis as any).__dmSave;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <div className="rounded-xl border border-gray-200 p-4 bg-white/50">{children}</div>
    </div>
  );
}

export default function NewsletterPanel() {
  const [tab, setTab] = React.useState<"week" | "archive">("week");
  const week = Save?.getWeek?.() ?? 1;
  const current = Save?.getNewsletterWorking?.() ?? [];
  const archive = Save?.getNewsletterIssues?.() ?? [];
  const styleRoll = Save?.getStyleWeek?.(week) ?? {};
  const fotw = Save?.getLatestIssueFOTW?.() ?? null;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <button
          className={`px-3 py-1 rounded-full ${tab === "week" ? "bg-indigo-600 text-white" : "bg-gray-100"}`}
          onClick={() => setTab("week")}
        >
          This Week
        </button>
        <button
          className={`px-3 py-1 rounded-full ${tab === "archive" ? "bg-indigo-600 text-white" : "bg-gray-100"}`}
          onClick={() => setTab("archive")}
        >
          Archive
        </button>
      </div>

      {tab === "week" && (
        <div>
          <Section title="Fight of the Week">
            <div className="text-sm text-gray-700">
              {fotw ? <>See Archive for full issue.</> : <>Will be chosen at week close.</>}
            </div>
          </Section>

          <Section title="Style Records (This Week)">
            <div className="text-sm grid grid-cols-2 gap-2">
              {Object.entries(styleRoll).map(([style, rec]: any) => (
                <div key={style} className="flex justify-between">
                  <span className="font-medium">{style}</span>
                  <span>{rec.w}-{rec.l}-{rec.k} • {(rec.pct * 100).toFixed(0)}%</span>
                </div>
              ))}
              {Object.keys(styleRoll).length === 0 && (
                <div className="text-gray-500 col-span-2">No fights yet.</div>
              )}
            </div>
          </Section>

          <Section title="Recap (live working list)">
            <ul className="text-sm list-disc pl-5 space-y-1">
              {current.map((c: any) => (
                <li key={c?.summary?.id}>
                  <span className="font-medium">{c?.summary?.a}</span> vs{" "}
                  <span className="font-medium">{c?.summary?.d}</span>
                  {c?.summary?.winner ? (
                    <> — winner: <b>{c?.summary?.winner === "A" ? c?.summary?.a : c?.summary?.d}</b></>
                  ) : null}
                  {c?.summary?.tags?.length ? <> — <i>{c?.summary?.tags.join(", ")}</i></> : null}
                </li>
              ))}
              {current.length === 0 && (
                <li className="text-gray-500">Fights will appear here as they happen.</li>
              )}
            </ul>
          </Section>
        </div>
      )}

      {tab === "archive" && (
        <div className="space-y-4">
          {archive.map((issue: any) => (
            <div key={issue.id} className="rounded-xl border p-4">
              <div className="font-semibold mb-2">Issue • Week {issue.week}</div>
              <div className="text-sm text-gray-600 mb-3">Fights: {issue.fights?.length ?? 0}</div>
              <ol className="text-sm list-decimal pl-5 space-y-1">
                {issue.fights?.map((c: any) => (
                  <li key={c?.summary?.id}>
                    <span className="font-medium">{c?.summary?.a}</span> vs{" "}
                    <span className="font-medium">{c?.summary?.d}</span>
                    {c?.summary?.winner ? (
                      <> — winner: <b>{c?.summary?.winner === "A" ? c?.summary?.a : c?.summary?.d}</b></>
                    ) : null}
                    {c?.summary?.tags?.length ? <> — <i>{c?.summary?.tags.join(", ")}</i></> : null}
                  </li>
                ))}
              </ol>
            </div>
          ))}
          {archive.length === 0 && <div className="text-gray-500">No archived issues yet.</div>}
        </div>
      )}
    </div>
  );
}
