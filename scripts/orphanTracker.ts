/**
 * orphanTracker.ts
 * ================
 * Pure functions that keep the orphan tracker's ORPH-XXXX ids and triage
 * columns (TestFile / Status / PR) stable across audit regenerations.
 *
 * Semantics: ids are append-only. A prior row matched by `file|symbol` keeps
 * its id and carries its triage columns forward; genuinely new rows get fresh
 * ids above the prior maximum, allocated deterministically in sorted
 * `file|symbol` order. Freed ids are never backfilled — renumbering would
 * break ORPH-XXXX citations in GENUINE_ORPHANS reasons.
 */

export interface PriorTrackerRow {
  id: string;
  file: string;
  symbol: string;
  testFile: string;
  status: string;
  pr: string;
}

export interface TrackedEntry {
  id: string;
  file: string;
  symbol: string;
  status: string;
}

// Column order in orphan-tracker.csv:
// ID,File,Symbol,OrphanType,Priority,UIRoute,NPCConsumer,TickPhase,TestFile,Status,PR
const COL = { id: 0, file: 1, symbol: 2, testFile: 8, status: 9, pr: 10 };

const ID_PATTERN = /^ORPH-(\d+)$/;

function trackerKey(file: string, symbol: string): string {
  return `${file}|${symbol}`;
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      fields.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  fields.push(cur);
  return fields;
}

/** Parse an orphan-tracker CSV into prior-row state. Header-only or empty input returns []. */
export function parseTrackerCsv(csvText: string): PriorTrackerRow[] {
  const lines = csvText.split("\n").filter((l) => l.trim().length > 0);
  const rows: PriorTrackerRow[] = [];
  for (const line of lines.slice(1)) {
    const f = parseCsvLine(line);
    if (f.length < 3 || !f[COL.file]) continue;
    rows.push({
      id: f[COL.id] ?? "",
      file: f[COL.file],
      symbol: f[COL.symbol] ?? "",
      testFile: f[COL.testFile] ?? "",
      status: f[COL.status] ?? "",
      pr: f[COL.pr] ?? "",
    });
  }
  return rows;
}

/**
 * Merge freshly detected audit entries with prior tracker rows.
 *
 * Returns the entries (same order) with final ids and triage columns:
 * matched rows keep `prior.id`/`status`/`testFile`/`pr`; unmatched rows get a
 * fresh `ORPH-XXXX` above the prior maximum plus empty triage columns.
 */
export function mergeTrackerState<T extends TrackedEntry>(
  entries: T[],
  priorRows: PriorTrackerRow[]
): Array<T & { testFile: string; pr: string }> {
  const priorByKey = new Map<string, PriorTrackerRow>();
  let maxId = 0;
  for (const row of priorRows) {
    priorByKey.set(trackerKey(row.file, row.symbol), row);
    const m = ID_PATTERN.exec(row.id);
    if (m) maxId = Math.max(maxId, parseInt(m[1], 10));
  }

  // Fresh ids go to unmatched entries in sorted file|symbol order so repeated
  // runs allocate identically regardless of detection/traversal order.
  const freshIds = new Map<number, string>();
  entries
    .map((e, i) => ({ e, i }))
    .filter(({ e }) => !priorByKey.has(trackerKey(e.file, e.symbol)))
    .sort((a, b) =>
      trackerKey(a.e.file, a.e.symbol).localeCompare(trackerKey(b.e.file, b.e.symbol))
    )
    .forEach(({ i }) => {
      freshIds.set(i, `ORPH-${String(++maxId).padStart(4, "0")}`);
    });

  return entries.map((e, i) => {
    const prior = priorByKey.get(trackerKey(e.file, e.symbol));
    if (!prior) {
      return { ...e, id: freshIds.get(i) ?? e.id, testFile: "", pr: "" };
    }
    return {
      ...e,
      id: prior.id,
      status: prior.status || e.status,
      testFile: prior.testFile,
      pr: prior.pr,
    };
  });
}
