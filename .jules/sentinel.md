
## 2025-02-24 - JSON Parse Prototype Pollution Fixed
Replaced `JSON.parse` with `destr` in `safeParse` to mitigate prototype pollution. The `destr` library safely drops `__proto__` keys during parsing, preventing potential privilege escalation or data corruption from malformed LLM responses.

## 2025-02-25 - Removed unsafe-eval from Content-Security-Policy
**Vulnerability:** The Electron app's `Content-Security-Policy` included `'unsafe-eval'` in its `script-src` directive. This allowed arbitrary code execution if an attacker could inject a string into an `eval()` or similar function call.
**Learning:** CSP headers need to be strictly configured, especially in desktop applications where arbitrary code execution can have severe system-level consequences. Even if the current codebase doesn't use `eval()`, third-party libraries might, or an attacker could find a way to inject it.
**Prevention:** Always follow defense-in-depth principles. Do not include `'unsafe-eval'` in CSP unless absolutely necessary, and if so, document why and ensure all user inputs are strictly sanitized. Regular automated security scanning of CSP headers should be implemented.

## 2025-02-28 - Insecure shell.openExternal check fixed
**Vulnerability:** The Electron main process used a weak string prefix check (`url.startsWith("https:")`) to validate URLs before passing them to `shell.openExternal`. This is vulnerable to URI scheme exploitation, as attackers could potentially craft a payload that passes the check but executes a local command.
**Learning:** `shell.openExternal` in Electron passes the URL to the underlying OS. Simple string checks are easily bypassed or misread by the OS. A strict URL parsing mechanism is required to guarantee the protocol is exactly `https:`.
**Prevention:** Always use the built-in `new URL(url)` constructor to parse the URL and strictly verify `parsedUrl.protocol === "https:"`. Wrap this logic in a `try...catch` block to handle malformed URLs without crashing the process.
