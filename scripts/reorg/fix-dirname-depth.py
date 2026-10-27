import re, os
ROOT = os.getcwd().replace(os.sep, '/')
pat = re.compile(r'((?:__dirname|import\.meta\.dirname)\s*,\s*)"((?:\.\.(?:/\.\.)*))"')
fixed = 0
for dp, dn, fs in os.walk(os.path.join(ROOT, 'tests')):
    for fn in fs:
        if not fn.endswith(('.ts','.tsx')): continue
        full = os.path.join(dp,fn).replace(os.sep,'/')
        s = open(full, encoding='utf-8').read()
        def repl(m):
            dots = m.group(2)
            n = dots.count('..')
            if n < 2: return m.group(0)
            return m.group(1) + '"' + '../' * (n-1) + '"'
        out = pat.sub(repl, s)
        if out != s:
            open(full,'w',encoding='utf-8').write(out); fixed += 1
print("depth-fixed:", fixed)
