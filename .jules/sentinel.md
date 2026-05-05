
## 2025-02-24 - JSON Parse Prototype Pollution Fixed
Replaced `JSON.parse` with `destr` in `safeParse` to mitigate prototype pollution. The `destr` library safely drops `__proto__` keys during parsing, preventing potential privilege escalation or data corruption from malformed LLM responses.

## 2025-02-25 - Removed unsafe-eval from Content-Security-Policy
**Vulnerability:** The Electron app's `Content-Security-Policy` included `'unsafe-eval'` in its `script-src` directive. This allowed arbitrary code execution if an attacker could inject a string into an `eval()` or similar function call.
**Learning:** CSP headers need to be strictly configured, especially in desktop applications where arbitrary code execution can have severe system-level consequences. Even if the current codebase doesn't use `eval()`, third-party libraries might, or an attacker could find a way to inject it.
**Prevention:** Always follow defense-in-depth principles. Do not include `'unsafe-eval'` in CSP unless absolutely necessary, and if so, document why and ensure all user inputs are strictly sanitized. Regular automated security scanning of CSP headers should be implemented.

## 2025-02-26 - Insecure URL Validation for External Links
**Vulnerability:** The `setWindowOpenHandler` in the Electron main process checked if a URL was safe to open using a simple string check: `url.startsWith("https:")`. This allows attackers to bypass the check with malformed URIs.
**Learning:** String prefix checks are insufficient for URL validation, especially for native OS operations like `shell.openExternal()`. Attackers can construct URIs that pass the prefix check but execute unintended commands or exploit other URI schemes once passed to the OS shell.
**Prevention:** Always parse untrusted URLs using the native `URL` constructor (`new URL(url)`) and strictly check the parsed `protocol` property. Wrap parsing in a `try...catch` block to handle invalid strings safely.
