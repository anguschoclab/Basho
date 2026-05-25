
## 2025-02-24 - JSON Parse Prototype Pollution Fixed
Replaced `JSON.parse` with `destr` in `safeParse` to mitigate prototype pollution. The `destr` library safely drops `__proto__` keys during parsing, preventing potential privilege escalation or data corruption from malformed LLM responses.

## 2025-02-25 - Removed unsafe-eval from Content-Security-Policy
**Vulnerability:** The Electron app's `Content-Security-Policy` included `'unsafe-eval'` in its `script-src` directive. This allowed arbitrary code execution if an attacker could inject a string into an `eval()` or similar function call.
**Learning:** CSP headers need to be strictly configured, especially in desktop applications where arbitrary code execution can have severe system-level consequences. Even if the current codebase doesn't use `eval()`, third-party libraries might, or an attacker could find a way to inject it.
**Prevention:** Always follow defense-in-depth principles. Do not include `'unsafe-eval'` in CSP unless absolutely necessary, and if so, document why and ensure all user inputs are strictly sanitized. Regular automated security scanning of CSP headers should be implemented.

## 2025-05-07 - Secure URL parsing for shell.openExternal
**Vulnerability:** The Electron app passed `url` string values directly to `shell.openExternal` after only a naive string comparison (`url.startsWith("https:")`). This could be exploited by protocol smuggling or OS-specific parsing quirks.
**Learning:** Naive string matching on URLs is dangerous. Depending on the operating system handler, malformed strings or edge-case protocol combinations might bypass simple string checks, leading to arbitrary command execution or file access.
**Prevention:** Always instantiate a `new URL()` object when handling untrusted URLs and strictly verify the `protocol` property before passing it to native handlers like `shell.openExternal()`. Wrap it in a `try...catch` to prevent malformed URL exceptions from crashing the process.

## 2025-02-27 - Unsafe URL Validation in will-navigate
**Vulnerability:** The Electron app used `navigationUrl.startsWith("file://")` to check if a local file was being navigated to during the `will-navigate` event. This could be bypassed using URLs that start with "file://" but are actually malicious or invalid.
**Learning:** Checking string prefixes for URL validation is fundamentally insecure because strings can easily trick weak patterns.
**Prevention:** Always parse untrusted URLs using the standard `new URL(url)` API and verify the `protocol` property exactly (e.g., `parsedUrl.protocol === "file:"`). Wrap the parsing in a `try...catch` to prevent invalid URLs from crashing the handler or bypassing security checks.

## 2025-05-08 - Block Unrestricted Local File Navigation
**Vulnerability:** The Electron app's `will-navigate` event handler permitted navigation to any `file:` protocol URL (`parsedUrl.protocol === "file:"`). This allowed navigation to arbitrary, potentially malicious local HTML files which could then execute within the privileged Electron renderer context and abuse exposed IPC APIs.
**Learning:** Naively allowing all `file:` navigation undermines Electron sandbox security, as it trusts any local file implicitly. Only explicitly trusted origins (e.g., the dev server) should be permitted during in-page navigation. Production files loaded via `loadFile()` don't inherently require enabling `will-navigate`.
**Prevention:** Strictly deny all `will-navigate` events by default (`event.preventDefault()`). Only explicitly allow known, safe origins (like the dev server's exact origin, verified via `URL.origin`, not `startsWith`) if necessary.
