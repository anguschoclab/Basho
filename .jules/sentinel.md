
## 2025-02-24 - JSON Parse Prototype Pollution Fixed
Replaced `JSON.parse` with `destr` in `safeParse` to mitigate prototype pollution. The `destr` library safely drops `__proto__` keys during parsing, preventing potential privilege escalation or data corruption from malformed LLM responses.

## 2025-02-25 - Removed unsafe-eval from Content-Security-Policy
**Vulnerability:** The Electron app's `Content-Security-Policy` included `'unsafe-eval'` in its `script-src` directive. This allowed arbitrary code execution if an attacker could inject a string into an `eval()` or similar function call.
**Learning:** CSP headers need to be strictly configured, especially in desktop applications where arbitrary code execution can have severe system-level consequences. Even if the current codebase doesn't use `eval()`, third-party libraries might, or an attacker could find a way to inject it.
**Prevention:** Always follow defense-in-depth principles. Do not include `'unsafe-eval'` in CSP unless absolutely necessary, and if so, document why and ensure all user inputs are strictly sanitized. Regular automated security scanning of CSP headers should be implemented.

## 2026-05-09 - Secure URI scheme validation in Electron shell.openExternal
**Vulnerability:** The Electron main process used a weak string prefix check (`url.startsWith("https:")`) before passing URLs to `shell.openExternal()`. This could allow attackers to bypass the check (e.g., using spaces or mixed case) or exploit OS-level URI scheme handlers to execute arbitrary commands if malicious input was passed to a new window request.
**Learning:** Simple string matching is insufficient for URL validation, especially when interfacing with native OS functions. `shell.openExternal()` is a common vector for command injection in Electron apps if not properly secured.
**Prevention:** Always use the built-in `URL` constructor to properly parse and validate URLs. Explicitly check `parsedUrl.protocol === "https:"` inside a `try...catch` block to ensure robust validation and prevent crashes from malformed inputs.
