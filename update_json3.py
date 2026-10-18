import json

with open('src/engine/bard/domains/post_bout.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

data['father_time'].extend([
  "The veteran %LOSER% looks every bit his age after that taxing bout.",
  "Age is an undefeated opponent, and it seems to have caught up with %LOSER%.",
  "A stark reminder for %LOSER% that Father Time spares no rikishi."
])

data['kensho'].extend([
  "A lucrative victory for %WINNER%, scooping up %ENVELOPES% kensho envelopes.",
  "%WINNER% claims the bout and a handsome %ENVELOPES% envelopes of kensho money.",
  "The sponsors reward %WINNER% with %ENVELOPES% kensho envelopes for a job well done."
])

data['early_decline'].extend([
  "A bit of the old spark seems missing from %LOSER% today.",
  "%LOSER% hesitates where he once would have exploded — the decline is starting to show.",
  "You have to wonder if the prime years are behind %LOSER% after a performance like that."
])

with open('src/engine/bard/domains/post_bout.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
