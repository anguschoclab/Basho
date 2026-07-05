with open("src/components/training/IndividualFocusSlots.tsx", "r") as f:
    content = f.read()

content = content.replace(
"""                      className={cn(
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background",
                        "flex flex-col items-center justify-center h-14 w-20 rounded-lg transition-all gap-1",
                        isActive
                          ? "bg-primary text-white shadow-lg scale-105"
                          : "text-muted-foreground hover:bg-white/50"
                      )}
                      title={opt.description}
                    >
                      {opt.icon}""",
"""                      className={cn(
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background",
                        "flex flex-col items-center justify-center h-14 w-20 rounded-lg transition-all gap-1",
                        isActive
                          ? "bg-primary text-white shadow-lg scale-105"
                          : "text-muted-foreground hover:bg-white/50"
                      )}
                      title={opt.description}
                      aria-label={`${opt.label}: ${opt.description}`}
                    >
                      {opt.icon}""")

with open("src/components/training/IndividualFocusSlots.tsx", "w") as f:
    f.write(content)
