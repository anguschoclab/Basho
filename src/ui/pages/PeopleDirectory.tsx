import React from 'react';
import { useStore } from '../hooks/useStore';

export default function PeopleDirectory() {
  const rows: any[] = useStore(s => 
    Object.values(s.warriors || {}).map((w: any) => ({
      id: w.id,
      name: w.displayName || w.name,
      style: w.style,
      rep: typeof w.reputationScore === 'number' ? w.reputationScore : 0
    }))
  );

  return (
    <div className="page">
      <div className="page-header">
        <div className="title">People Directory</div>
      </div>
      <div className="card">
        <div className="overflow-auto" style={{ maxHeight: 420 }}>
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-neutral-800">
              <tr>
                <th className="text-left p-2">Warrior</th>
                <th className="text-left p-2">Class</th>
                <th className="text-left p-2">Reputation</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-neutral-700">
                  <td className="p-2">{r.name}</td>
                  <td className="p-2">{r.style}</td>
                  <td className="p-2">
                    {r.rep > 0 ? 'Renowned' : r.rep < 0 ? 'Notorious' : 'Balanced'}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-4 text-center text-neutral-500">
                    No warriors found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
