import json

with open('src/engine/bard/domains/post_bout.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Expanding birthday_kachi (from 3 to 6)
data['birthday_kachi'].extend([
  "A perfect birthday for %SHIKONA%, wrapping up kachi-koshi on his special day.",
  "Birthday cheers all around — %SHIKONA% locks in his winning record today.",
  "No better way to celebrate! %SHIKONA% secures kachi-koshi on his birthday."
])

# Expanding birthday_milestone (from 3 to 6)
data['birthday_milestone'].extend([
  "A truly memorable birthday for %SHIKONA%, reaching %MILESTONE% career victories.",
  "%SHIKONA% hits win number %MILESTONE% on his birthday. A reason to celebrate tonight.",
  "The milestone arrives right on his birthday! %MILESTONE% wins for %SHIKONA%."
])

# Expanding career_milestone (from 3 to 6)
data['career_milestone'].extend([
  "%SHIKONA% enters the history books with his %MILESTONE%th career victory.",
  "A monumental achievement — %SHIKONA% stands tall with %MILESTONE% career wins.",
  "Win number %MILESTONE% for %SHIKONA% — a testament to his dedication on the dohyo."
])

# Expanding career_bout_milestone (from 3 to 6)
data['career_bout_milestone'].extend([
  "Stepping onto the dohyo for the %MILESTONE%th time, %SHIKONA% shows incredible longevity.",
  "A testament to resilience — %SHIKONA% reaches %MILESTONE% career bouts.",
  "That marks %MILESTONE% total bouts for %SHIKONA%. A true ironman of the sport."
])

# Expanding comeback_win (from 4 to 7)
data['comeback_win'].extend([
  "From the brink of defeat! %WINNER% orchestrates a spectacular turnaround.",
  "A miraculous escape! %WINNER% somehow pulls out the victory against %LOSER%.",
  "Down but not out — %WINNER% digs deep to steal the win from %LOSER%."
])

with open('src/engine/bard/domains/post_bout.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
