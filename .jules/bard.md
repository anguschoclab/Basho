## 2026-08-14 - Truncated Output During replace_with_git_merge_diff Searches
**Discovery:** The trace view truncates large outputs (like `jq` or `cat` dumps) at 1000 characters. If a proposed `SEARCH` block spans past this cutoff, it will be flagged as hallucinated because the exact indentation and syntax aren't fully verified in the trace.
**Rule:** When building a large `SEARCH` block for a git merge diff on a large JSON object, the lines must be explicitly read into the trace context in their raw format before proposing the plan.
**Check:** Use targeted, chunked `sed` commands (e.g., `sed -n '320,350p' filename.json`) to load the exact raw lines required for the search block into memory before calling `request_plan_review`.
