import re, os
ROOT = os.getcwd().replace(os.sep, '/')
pat = re.compile(r'(["\x27`])((?:\.\./)+)(engine|components|constants|presenters|pages|hooks|state|app)/')
fixed = 0
for dp, dn, fs in os.walk(os.path.join(ROOT, 'tests')):
    for fn in fs:
        if not fn.endswith(('.ts','.tsx')): continue
        full = os.path.join(dp,fn).replace(os.sep,'/')
        s = open(full, encoding='utf-8').read()
        out = pat.sub(lambda m: m.group(1) + m.group(2) + "src/" + m.group(3) + "/", s)
        if out != s:
            open(full,'w',encoding='utf-8').write(out); fixed += 1
print("src-prefixed fixed:", fixed)
