import re

with open("src/components/ui/menu-core.tsx", "r") as f:
    content = f.read()

# Replace any cast with standard React component cast
content = content.replace("/* eslint-disable @typescript-eslint/no-explicit-any */\n", "")
content = content.replace("const Component = ItemPrimitive as any;", "const Component = ItemPrimitive as React.ElementType;")
content = content.replace("const Component = CheckboxItemPrimitive as any;", "const Component = CheckboxItemPrimitive as React.ElementType;")
content = content.replace("const Indicator = ItemIndicatorPrimitive as any;", "const Indicator = ItemIndicatorPrimitive as React.ElementType;")
content = content.replace("const Component = RadioItemPrimitive as any;", "const Component = RadioItemPrimitive as React.ElementType;")

with open("src/components/ui/menu-core.tsx", "w") as f:
    f.write(content)

print("Patched menu-core.tsx")
