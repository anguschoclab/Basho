import json

with open('src/engine/bard/domains/post_bout.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Expanding kachi_koshi
data['kachi_koshi'].extend([
  "The milestone is reached — %SHIKONA% hits %WINS% wins for kachi-koshi.",
  "%SHIKONA% crosses the finish line for a winning record, now sitting at %WINS% wins.",
  "A crucial %WINS%th victory for %SHIKONA%, securing kachi-koshi.",
  "Kachi-koshi achieved! %SHIKONA% celebrates reaching %WINS% wins this basho."
])

# Expanding make_koshi
data['make_koshi'].extend([
  "The dreaded make-koshi is official as %SHIKONA% drops to %LOSSES% losses.",
  "A tough reality for %SHIKONA% — %LOSSES% losses confirm a losing tournament.",
  "%SHIKONA% suffers his %LOSSES%th defeat, sealing make-koshi.",
  "There's no escaping it now — %LOSSES% losses mean a losing record for %SHIKONA%."
])

with open('src/engine/bard/domains/post_bout.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
