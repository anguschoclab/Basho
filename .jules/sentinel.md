
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

## 2025-05-09 - Missing Runtime Validation on IPC Handlers
**Vulnerability:** The Electron app's `app:getPath` IPC handler used TypeScript type assertions (`as 'home' | 'userData' | ...`) to implicitly restrict the `name` argument from the renderer. However, since TypeScript is stripped during compilation, any string could be passed from the renderer at runtime. This meant a compromised renderer process could request arbitrary paths (e.g., `exe`, `module`, `crashDumps`) that might expose sensitive system directories or facilitate further exploits.
**Learning:** Type assertions are compile-time only and provide zero runtime security. When dealing with boundary interfaces like IPC where untrusted data enters a privileged context (the main process), runtime validation is mandatory.
**Prevention:** Never rely on TypeScript assertions (`as Type`) for input validation on IPC boundaries. Always implement strict runtime validation, such as explicit allowlists (e.g., `const ALLOWED_PATHS = [...] as const` and `ALLOWED_PATHS.includes()`), to verify arguments before passing them to privileged Electron or Node.js APIs.

## 2025-05-27 - Validate IPC Arguments at Runtime
**Vulnerability:** The `app:getPath` IPC handler relied purely on a TypeScript type assertion (`name as "home" | "appData" | ...`) to limit which paths could be requested from the main process. Since type checking is stripped at runtime, any string could be passed via IPC from the renderer, potentially allowing an attacker to request sensitive paths like `exe` or `module`.
**Learning:** TypeScript type boundaries do not exist at runtime in JavaScript. IPC handlers are security boundaries between the less trusted renderer process and the privileged main process. Any data crossing this boundary must be rigorously validated at runtime.
**Prevention:** Always implement strict runtime validation (such as explicit allowlists) for any arguments passed over IPC before using them in privileged main process APIs. Never rely solely on TypeScript type assertions for security.

## 2025-05-29 - Unsafe IPC Type Assertions
**Vulnerability:** The Electron app's `app:getPath` IPC handler relied on TypeScript type assertions (e.g. `name as 'home' | 'appData' ...`) for input validation. Because TypeScript types are stripped at runtime, this provided no actual protection against a compromised renderer sending arbitrary strings. An attacker could potentially request unintended application paths.
**Learning:** Type assertions in IPC handlers provide a false sense of security. Any data coming from the renderer must be considered untrusted and strictly validated at runtime.
**Prevention:** Always implement explicit runtime validation (such as allowlists) for arguments passed over IPC before using them in privileged main process APIs. Never rely solely on TypeScript types for security boundaries.
