import re

with open("src/engine/types/world.ts", "r") as f:
    content = f.read()

# Replace unknown[] for day1/day2 with string[] assuming they are schedule/activity IDs
content = content.replace("day1: unknown[];", "day1: string[];")
content = content.replace("day2: unknown[];", "day2: string[];")

with open("src/engine/types/world.ts", "w") as f:
    f.write(content)

print("Patched world.ts")
