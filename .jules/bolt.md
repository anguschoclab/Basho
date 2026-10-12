## 2024-05-18 - [Optimize EventFeed Log Processing]
**Learning:** [Chaining `.filter().sort()` on large append-only arrays (like `workerWorld.events.log`) causes severe re-render latency. Since the log is chronologically ordered, backward iteration is far more efficient.]
**Action:** [Use backward iteration to find the latest matching events and `break` early instead of processing the entire array.]
