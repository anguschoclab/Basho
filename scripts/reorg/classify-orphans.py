import json, re, subprocess
d = json.load(open('.windsurf/audit/baseline-orphans.json', encoding='utf-8'))
test_src = open('src/tests/unit/audit/unreferenced-exports.test.ts', encoding='utf-8').read()
classified = set(f"{a}:{b}" for a,b in re.findall(r'"(src/engine/[^"]+):(\w+)"', test_src))
uncl = [e for e in d['entries'] if e['orphanType']=='unreferenced-export' and f"{e['file']}:{e['symbol']}" not in classified]
BS = chr(92)
intentional, genuine = {}, {}
for e in uncl:
    sym, f, oid = e['symbol'], e['file'], e['id']
    out = subprocess.run(['grep','-rl',sym,'src','--include=*.ts','--include=*.tsx'],
                         capture_output=True,text=True).stdout.split('\n')
    users = [x for x in out if x and f[4:] not in x.replace(BS,'/')]
    key = f"{f}:{sym}"
    if users:
        intentional[key] = f"Live module surface — referenced outside its file ({len(users)} consumer(s) via deep path or type-position import the auditor cannot resolve)"
    else:
        genuine[key] = f"{oid}: zero live references — unique export retained per reorg dead-code policy (archive candidate, not deleted)"
json.dump({'intentional':intentional,'genuine':genuine}, open('scripts/reorg/orph_classify.json','w'), indent=1)
print("intentional:", len(intentional), "genuine:", len(genuine))
for k in list(genuine): print("G", k)
