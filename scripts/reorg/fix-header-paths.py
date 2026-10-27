import re, os
ROOT = os.getcwd().replace(os.sep, '/')
moves = re.findall(r'\["(src/[^"]+|scripts/[^"]+|e2e/[^"]+|tests/[^"]+)",\s*"([^"]+)"\]', open('scripts/reorg/moves.ts',encoding='utf-8').read())
pairs = sorted(set(moves), key=lambda p: -len(p[0]))
def newpath(p):
    for o,n in pairs:
        if p == o or p.startswith(o+"/"): return n + p[len(o):]
    return None
fixed = 0
for dp, dn, fs in os.walk(os.path.join(ROOT,'src')):
    for fn in fs:
        if not fn.endswith(('.ts','.tsx')): continue
        full = os.path.join(dp,fn).replace(os.sep,'/')
        s = open(full, encoding='utf-8').read()
        m = re.search(r'^(?://|/?\*+)\s*(src/[^\s*]+\.(?:ts|tsx|css))\s*$', s[:800], re.M)
        if not m: continue
        n = newpath(m.group(1))
        if n:
            s = s[:m.start(1)] + n + s[m.end(1):]
            open(full,'w',encoding='utf-8').write(s); fixed += 1
print("header paths fixed:", fixed)
