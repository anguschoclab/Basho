import json, re, csv, io

TEST = 'src/tests/unit/audit/unreferenced-exports.test.ts'
s = open(TEST, encoding='utf-8').read()
bp = '.windsurf/audit/baseline-orphans.json'
d = json.load(open(bp, encoding='utf-8'))
by_key = {f"{e['file']}:{e['symbol']}": e for e in d['entries']}

# Parse the two maps from the test file
def map_block(src, name):
    start = src.index(f"const {name}")
    end = src.index("\n};", start)
    return start, end

i0, i1 = map_block(s, "INTENTIONAL_EXPORTS")
g0, g1 = map_block(s, "GENUINE_ORPHANS")
intentional = set(re.findall(r'"(src/engine/[^"]+:\w+)"', s[i0:i1]))

# 1. Fix stale ORPH-XXXX citations in GENUINE reasons to current entry ids
gblock = s[g0:g1]
def fix_reason(m):
    key = m.group(1); reason = m.group(2)
    e = by_key.get(key)
    if not e: return m.group(0)
    fixed = re.sub(r'ORPH-\d+', e['id'], reason)
    return f'"{key}":\n    "{fixed}"'
gblock = re.sub(r'"(src/engine/[^"]+:\w+)":\s*\n?\s*"([^"]+)"', fix_reason, gblock)
s = s[:g0] + gblock + s[g1:]
open(TEST, 'w', encoding='utf-8').write(s)

# 2. Set baseline statuses for every classified key
genuine = set(re.findall(r'"(src/engine/[^"]+:\w+)"', gblock))
ni = ng = 0
for e in d['entries']:
    k = f"{e['file']}:{e['symbol']}"
    if k in intentional:
        e['status'] = 'intentional'; ni += 1
    elif k in genuine:
        e['status'] = 'genuine'; ng += 1
json.dump(d, open(bp, 'w'), indent=2)

# 3. CSV statuses
cp = '.windsurf/audit/orphan-tracker.csv'
r = list(csv.reader(io.StringIO(open(cp, encoding='utf-8').read())))
hdr = r[0]; fi, si, sti = hdr.index('File'), hdr.index('Symbol'), hdr.index('Status')
for row in r[1:]:
    if len(row) <= sti: continue
    k = f"{row[fi]}:{row[si]}"
    if k in intentional: row[sti] = 'intentional'
    elif k in genuine: row[sti] = 'genuine'
out = io.StringIO(); csv.writer(out, quoting=csv.QUOTE_ALL, lineterminator='\n').writerows(r)
open(cp, 'w', encoding='utf-8').write(out.getvalue())
print(f"statuses: intentional={ni} genuine={ng}; genuine reasons re-cited")
