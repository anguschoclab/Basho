import os, json, shutil

broken = []
for root, dirs, files in os.walk('node_modules'):
    normalized = root.replace(chr(92), '/')
    depth = normalized.count('node_modules')
    if depth < 2:
        continue
    if set(files) == {'package.json'} and not dirs:
        try:
            with open(os.path.join(root, 'package.json')) as f:
                pkg = json.load(f)
            main = pkg.get('main', 'index.js').lstrip('./')
            if not os.path.exists(os.path.join(root, main)):
                broken.append(root)
        except Exception as e:
            broken.append(root)

print(f'Found {len(broken)} broken nested packages:')
for p in broken:
    print(p)
