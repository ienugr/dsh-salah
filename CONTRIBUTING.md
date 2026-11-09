# Contributing

Thank you for helping improve Salah. Contributions should keep prayer-time information accurate, location handling explicit, and the interface consistent with DeepSeek Harness.

## Set up

Use Node.js 22.15 or later. The declared Harness compatibility target is 0.2.1-rc.5.

```sh
npm ci --ignore-scripts
npm run build:ui
npm run check
npm test
npm run check:release
npm run test:e2e:preflight
npm run check:clean-install
```

The builder resolves Tailwind’s exported manifest/bin and invokes its JavaScript entry point with Node, without `.bin`, `.cmd`, or shell wrappers. Regression tests execute the real compiler from paths containing spaces and compare repeated build bytes. npm checks likewise invoke npm’s JavaScript entry point directly.

The local execution environment is macOS. GitHub Actions is configured for Ubuntu with Node 22.15/24 and native Windows with Node 24. A configured CI lane is not a passing remote run; review actual Actions results before release. End users use the included client artifact and do not need the UI build step.

The lockfile is included for reproducible development. Do not use `npm audit fix --force` or broaden the Harness engine requirement without reviewing and testing the resulting changes.

## Project structure

| File | Responsibility |
| --- | --- |
| [core.js](core.js) | Provider adapters, location search, time-zone conversion, local calculations, cache, and adjacent-day prayer context. |
| [service.js](service.js) | Shared UI/tool operations, input validation, persistent preferences, and the authenticated HTTP route. |
| [index.js](index.js) | Harness service registration and lifecycle ownership. |
| [client.js](client.js) | Interface, translations, countdowns, and floating-widget behavior. Includes generated CSS. |
| [styles.css](styles.css) and [ui.css](ui.css) | Authored styles and daisyUI build configuration. |
| [build-ui.mjs](build-ui.mjs) | Scoped, Harness-themed client stylesheet generation. |
| [test](test/) | Provider, service, and pure client-logic regression tests. |

## Interface changes

- Edit visible English and Indonesian copy together. Keep dictionary keys in sync and avoid duplicate keys.
- Let layout and control grouping explain the interface. Avoid repeated secondary labels and always-visible helper paragraphs; put optional detail in Help or accessible tooltips.
- Keep the conversation footer inline and content-sized: prayer name plus a compact countdown, not a separate branded status row.
- Keep errors, stale/fallback warnings, required form labels, and setup acknowledgements visible and accessible. Visual simplification must not weaken these safeguards.
- Use clear labels: distinguish a published timetable from local calculation, and an intentional local source from an automatic fallback.
- Do not imply that “current prayer” is a ruling on the valid prayer window.
- Use Harness theme tokens. Keep styles scoped to the plugin; do not introduce global resets or fixed UI palettes.
- Rebuild after changing component classes or styles:

  ```sh
  npm run build:ui
  ```

- Commit the rebuilt client artifact. A fresh build should not change it again.
- Test the actual plugin in Harness. A standalone page does not reproduce the Host services, theme, locale, or slot lifecycle.

Changes to a linked checkout do not guarantee automatic updates in an already open page. Follow the Plugin Manager’s activation instructions, refresh the existing Harness page when needed, and verify that the updated behavior is loaded.

## Prayer-time changes

Add regression tests for relevant date boundaries, selected-location time zones, DST changes, provider failures, and malformed responses. Never silently substitute a different location during unsupported polar conditions.

Keep sunrise out of the next-prayer countdown. Preserve overnight context so the interface can distinguish Maghrib from an upcoming after-midnight Isha, and Isha from the following day’s Fajr.

Do not change provider URLs, privacy behavior, or request limits as incidental refactoring. Explain those changes explicitly and update [Privacy](PRIVACY.md) and [Third-party notices](THIRD_PARTY_NOTICES.md).

## Test coverage and limits

### Node and clean-install checks

Node tests use synthetic credentials, controlled provider responses, local calculations, and real bounded subprocesses. They cover cancellation, persistence, authentication boundaries, legacy preferences, commercial/public endpoint selection, credential-safe results/caches, countdown/current-prayer/setup logic, and portable build/cleanup behavior. They do not prove future API availability or a paid key’s entitlement.

`npm run check:clean-install` copies an explicit release-file allowlist into a unique temporary directory with spaces in its path. It excludes dependencies, environment files, Git state, and runtime storage; uses isolated npm configuration/cache/logs; installs from the lockfile with scripts disabled; runs syntax, Node, browser-free preflight, and release-content checks; rebuilds; and compares the client artifact before guarded cleanup. This validates a fresh dependency checkout, not a fresh authenticated Harness profile or a remote Windows/CI run.

### Real-Harness browser regressions

The browser runner attaches only to an explicitly authorized, already-open Chromium CDP endpoint. It does not launch a browser, inspect personal browser profiles, copy cookies/tokens, or start a replacement application.

```sh
SALAH_CDP_URL=http://127.0.0.1:9223 \
SALAH_BASE_URL=http://127.0.0.1:3080 \
npm run check:browser
```

Use your own authorized endpoint; the example port is not discovered or scanned. Open and authenticate Harness normally in that browser first. Never commit an authentication token or CDP WebSocket URL.

The suite creates an owned test tab containing the actual Harness shell and installed plugin. Only Salah’s API is fulfilled by a controlled, in-memory fixture using the production service contract and synthetic provider data/credentials.

Framework RPC fixtures must follow the generated Remote wire contract, not infer it from JavaScript call syntax. In the declared runtime, unary requests use a **named plain-object `payload.args`** (`ns`, `ops`, optional `expectedRevision` for settings mutations), not a positional array. Undefined optional fields are omitted. Theme verification must correlate the exact request/response, require logical success and a finished response, enforce the loaded authoritative revision floor, and then prove the saved choice from a separate fresh reader; optimistic UI state alone is insufficient. This is real UI regression coverage, not a full live-provider/Host-network end-to-end test. The runner isolates only the plugin’s browser preference keys, never reads their existing values, and closes only its own tab.

Missing browser access, incomplete mandatory coverage, missing observed Host-theme controls, failed restoration, or UI errors must produce a nonzero result. Browser-free preflight tests are not browser-test passes. Theme tests require explicit permission to temporarily change the shared Harness preference, use observed real controls, and verify restoration. The [observed English Host-theme contract](docs/HOST_THEME_CONTRACT.json) was captured from the real 0.2.1-rc.5 interface; verify it against your runtime rather than guessing selectors. This runtime uses Light/Dark/System buttons and separate HTML state/BODY CSS, not a theme dropdown.

After authorizing the temporary preference change, a POSIX-shell run can include the captured contract:

```sh
SALAH_CDP_URL=http://127.0.0.1:9223 \
SALAH_ALLOW_HOST_THEME_CHANGES=1 \
SALAH_HOST_THEME_CONTRACT="$(node --input-type=module -e 'import { readFileSync } from "node:fs"; process.stdout.write(readFileSync("docs/HOST_THEME_CONTRACT.json", "utf8"));')" \
npm run check:browser
```

Without both the authorization flag and a valid observed contract, the actual Host-theme case remains unverified and the full suite does not pass. Clock changes are limited to the owned tab’s browser API fixture; do not use context-wide Playwright clocks on a user’s existing browser.

For a release, confirm actual executed results for permission recovery, reviewed setup, source-aware controls, failure/freshness behavior, floating-widget pointer/keyboard controls, narrow viewports, midnight/time-zone rollover, and real Host light/dark themes. Record remaining unverified cases honestly and preserve the original user preferences.

## Pull requests

Describe the problem, the behavior changed, and the checks performed. Include screenshots for visible changes without exposing tokens, precise private locations, or unrelated application content. Do not commit dependency directories, local runtime state, credentials, or package archives.

Report sensitive issues privately using [Security reporting](SECURITY.md), not a public pull request.
