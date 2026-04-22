import re

with open("src/engine/tick/phases/phase00_preflight.ts", "r") as f:
    content = f.read()

# I need to add active_basho case to the switch statement
switch_block = """    case "banzuke_reveal": {
      if ((world._interimDaysRemaining ?? 0) <= 7) {
        const nextPhase: CyclePhase = "pre_basho";
        builder.updateWorldField('cyclePhase', nextPhase);
        logTransition(world, prev, nextPhase, "Final preparations for the upcoming basho begin.");
        return { from: prev, to: nextPhase };
      }
      break;
    }
    default:
      assertNever(world.cyclePhase);"""

new_switch_block = """    case "banzuke_reveal": {
      if ((world._interimDaysRemaining ?? 0) <= 7) {
        const nextPhase: CyclePhase = "pre_basho";
        builder.updateWorldField('cyclePhase', nextPhase);
        logTransition(world, prev, nextPhase, "Final preparations for the upcoming basho begin.");
        return { from: prev, to: nextPhase };
      }
      break;
    }
    case "active_basho": {
      // Logic for active_basho transition if any, usually handled outside or no-op here
      break;
    }
    default:
      assertNever(world.cyclePhase);"""

content = content.replace(switch_block, new_switch_block)

with open("src/engine/tick/phases/phase00_preflight.ts", "w") as f:
    f.write(content)

print("Patched phase00_preflight.ts")
