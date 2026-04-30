import re

with open("src/engine/types/__tests__/banzuke.test.ts", "r") as f:
    content = f.read()

content = content.replace("expect(() => toRankPosition({ rank: 'maegashira', side: 'east' } as any)).toThrow(", "expect(() => toRankPosition({ rank: 'maegashira', side: 'east' } as unknown as { rank: Rank; side: Side; rankNumber?: number })).toThrow(")

with open("src/engine/types/__tests__/banzuke.test.ts", "w") as f:
    f.write(content)

print("Patched banzuke.test.ts")
