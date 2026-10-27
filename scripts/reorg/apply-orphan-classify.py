import json, re, csv, io

cls = json.load(open('scripts/reorg/orph_classify.json', encoding='utf-8'))
TEST = 'src/tests/unit/audit/unreferenced-exports.test.ts'
s = open(TEST, encoding='utf-8').read()

def rows(d):
    out = []
    for k, v in d.items():
        out.append(f'  "{k}":\n    "{v}",')
    return "\n".join(out)

# Insert intentional rows before the closing of INTENTIONAL_EXPORTS
i_end = s.index("\n};\n\n/**\n * GENUINE") if "\n};\n\n/**\n * GENUINE" in s else s.index("\n};\n", s.index("const INTENTIONAL_EXPORTS"))
s = s[:i_end] + "\n\n  // ── Classified during 2026-10 reorg (systems/* promoted to domains) ──\n" + rows(cls['intentional']) + s[i_end:]

# Insert genuine rows before the closing of GENUINE_ORPHANS
g_start = s.index("const GENUINE_ORPHANS")
g_end = s.index("\n};", g_start)
s = s[:g_end] + "\n\n  // ── Zero-reference exports found during reorg scan-set widening ──\n" + rows(cls['genuine']) + s[g_end:]
open(TEST, 'w', encoding='utf-8').write(s)

# Update baseline-orphans.json statuses
bp = '.windsurf/audit/baseline-orphans.json'
d = json.load(open(bp, encoding='utf-8'))
ni = ng = 0
for e in d['entries']:
    k = f"{e['file']}:{e['symbol']}"
    if k in cls['intentional']:
        e['status'] = 'intentional'; ni += 1
    elif k in cls['genuine']:
        e['status'] = 'genuine'; ng += 1
json.dump(d, open(bp, 'w'), indent=2)

# CSV statuses too
cp = '.windsurf/audit/orphan-tracker.csv'
txt = open(cp, encoding='utf-8').read()
r = list(csv.reader(io.StringIO(txt)))
hdr = r[0]
fi, si, sti = hdr.index('File'), hdr.index('Symbol'), hdr.index('Status')
for row in r[1:]:
    if len(row) <= sti: continue
    k = f"{row[fi]}:{row[si]}"
    if k in cls['intentional']: row[sti] = 'intentional'
    elif k in cls['genuine']: row[sti] = 'genuine'
out = io.StringIO(); csv.writer(out, quoting=csv.QUOTE_ALL, lineterminator='\n').writerows(r)
open(cp, 'w', encoding='utf-8').write(out.getvalue())
print(f"intentional={ni} genuine={ng} rows classified; baseline+csv updated")
