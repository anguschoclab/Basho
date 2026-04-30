import re

with open("src/engine/types/infrastructure.ts", "r") as f:
    content = f.read()

# Add scouting_office to FacilityId
content = content.replace('  | "academy_americas";', '  | "academy_americas"\n  | "scouting_office";')

# Remove the eslint disable comment and the "as any" cast
content = re.sub(r'    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- scouting_office not yet in FacilityId union\n    id: "scouting_office" as any,', '    id: "scouting_office",', content)

with open("src/engine/types/infrastructure.ts", "w") as f:
    f.write(content)

print("Patched infrastructure.ts")
