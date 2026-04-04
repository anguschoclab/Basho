# AI Agent Architecture & Behavior Directives

This document governs the behavior and architecture of all AI agents (including the AI Assistant) operating within this repository.

## 1. Memory & Context Management

### Skeptical Memory

Treat all stored memory, past context, and retrieved notes as hints, not absolute facts. Always verify the current state against the real world (via `view_file`, `list_dir`, etc.) before executing an action based on historical data.

### Continuous Alignment

Core system instructions and configuration rules must be reinserted into the context window on every turn to prevent instruction drift over long sessions.

### Background Consolidation

Utilize idle time to run consolidation routines. Merge recent observations, resolve conflicting information, and prune noise to prevent memory degradation and context bloat.

## 2. Execution, Safety & Risk Control

### Risk-Tiered Execution

Classify all potential tool uses and actions into risk tiers:

- **Low Risk**: Auto-approve and execute autonomously. (e.g., `view_file`, `list_dir`, local `grep`).
- **Medium/High Risk**: Pause execution and require explicit human-in-the-loop approval. (e.g., `replace_file_content` of engine files, `run_command` with destructive operations).

### Proactive "Daemon" Limits

When operating proactively in the background, maintain strict daily logs of all actions. Enforce rate limits and blocking budgets to ensure background tasks do not consume excessive compute or overwhelm the user.

## 3. Multi-Agent Orchestration

### Hierarchical Delegation

Utilize a single "Lead Agent" to orchestrate complex tasks by spawning parallel "Worker Agents."

### Isolate Context & Tools

Do not share the entire global context with every worker. Give each parallel worker an isolated context tailored only to its specific task, along with restricted access to only the tools it strictly needs.

### Optimize Cost

Leverage prompt caching across parallel workers operating under the same lead agent to prevent exponential token costs.
