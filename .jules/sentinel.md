
## 2025-02-24 - JSON Parse Prototype Pollution Fixed
Replaced `JSON.parse` with `destr` in `safeParse` to mitigate prototype pollution. The `destr` library safely drops `__proto__` keys during parsing, preventing potential privilege escalation or data corruption from malformed LLM responses.

## 2025-02-25 - Removed unsafe-eval from Content-Security-Policy
**Vulnerability:** The Electron app's `Content-Security-Policy` included `'unsafe-eval'` in its `script-src` directive. This allowed arbitrary code execution if an attacker could inject a string into an `eval()` or similar function call.
**Learning:** CSP headers need to be strictly configured, especially in desktop applications where arbitrary code execution can have severe system-level consequences. Even if the current codebase doesn't use `eval()`, third-party libraries might, or an attacker could find a way to inject it.
**Prevention:** Always follow defense-in-depth principles. Do not include `'unsafe-eval'` in CSP unless absolutely necessary, and if so, document why and ensure all user inputs are strictly sanitized. Regular automated security scanning of CSP headers should be implemented.

## 2025-02-26 - Unsafe URL Validation in shell.openExternal
**Vulnerability:** The Electron app used `url.startsWith("https:")` to check if a URL should be opened externally. This could be bypassed using URLs that start with "https:" but are actually malicious or invalid when passed to `shell.openExternal`.
**Learning:** Checking string prefixes for URL validation is fundamentally insecure because strings can easily trick weak patterns (e.g., `https:malicious-app://payload` might pass).
**Prevention:** Always parse untrusted URLs using the standard `new URL(url)` API and verify the `protocol` property exactly (e.g., `parsedUrl.protocol === "https:"`). Wrap the parsing in a `try...catch` to prevent invalid URLs from crashing the handler.

## 2025-02-27 - Unsafe URL Validation in will-navigate
**Vulnerability:** The Electron app used `navigationUrl.startsWith("file://")` to check if a local file was being navigated to during the `will-navigate` event. This could be bypassed using URLs that start with "file://" but are actually malicious or invalid.
**Learning:** Checking string prefixes for URL validation is fundamentally insecure because strings can easily trick weak patterns.
**Prevention:** Always parse untrusted URLs using the standard `new URL(url)` API and verify the `protocol` property exactly (e.g., `parsedUrl.protocol === "file:"`). Wrap the parsing in a `try...catch` to prevent invalid URLs from crashing the handler or bypassing security checks.
