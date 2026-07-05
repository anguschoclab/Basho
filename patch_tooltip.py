with open("src/components/training/IndividualFocusSlots.tsx", "r") as f:
    content = f.read()

content = content.replace(
"""import { FOCUS_MODE_OPTIONS } from "@/constants/ui/training";""",
"""import { FOCUS_MODE_OPTIONS } from "@/constants/ui/training";
import { TooltipWrap } from "@/components/ui/tooltip-wrap";""")

content = content.replace(
"""                    <button
                      key={opt.value}
                      onClick={() =>
                        onIndividualFocusChange(rikishi.id, isActive ? null : opt.value)
                      }
                      className={cn(
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background",
                        "flex flex-col items-center justify-center h-14 w-20 rounded-lg transition-all gap-1",
                        isActive
                          ? "bg-primary text-white shadow-lg scale-105"
                          : "text-muted-foreground hover:bg-white/50"
                      )}
                      title={opt.description}
                    >
                      {opt.icon}
                      <span className="text-[8px] font-black uppercase tracking-tighter">
                        {opt.label}
                      </span>
                    </button>""",
"""                    <TooltipWrap key={opt.value} content={opt.description} side="top">
                      <button
                        onClick={() =>
                          onIndividualFocusChange(rikishi.id, isActive ? null : opt.value)
                        }
                        className={cn(
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background",
                          "flex flex-col items-center justify-center h-14 w-20 rounded-lg transition-all gap-1",
                          isActive
                            ? "bg-primary text-white shadow-lg scale-105"
                            : "text-muted-foreground hover:bg-white/50"
                        )}
                        aria-label={`${opt.label}: ${opt.description}`}
                      >
                        {opt.icon}
                        <span className="text-[8px] font-black uppercase tracking-tighter">
                          {opt.label}
                        </span>
                      </button>
                    </TooltipWrap>""")

with open("src/components/training/IndividualFocusSlots.tsx", "w") as f:
    f.write(content)
