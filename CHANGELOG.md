# Changelog

## 1.2.0 — 2026-11-11

GitHub distribution uses the validated `icanhcorpse-dsh-salah-1.2.0.tgz` bundle and SHA-256 checksums. The existing GitHub release did not publish the public npm target `@icanhcorpse/dsh-salah@1.2.0`; future stable releases published directly are wired to npm Trusted Publishing (OIDC) after the account owner configures its publisher. The source repository remains [ienugr/dsh-salah](https://github.com/ienugr/dsh-salah). No npm registry install or live local-to-scoped migration is implied.

### npm distribution preparation

- Prepared the public scoped package identity, repository metadata, and public publish configuration; kept version `1.2.0`.
- Documented post-publication installation through Harness Plugin Manager, safe exact-name local-bundle migration/removal, and a no-build local-checkout fallback in the [README](<README.md>).
- Preserved storage domain `salah_preferences` version `1`, existing service/row/slot identifiers, and `dsh.salah.*` browser view keys. Existing privacy normalization remains in effect; this is not a promise to restore legacy saved GPS records.
- Added an [owner OIDC publishing setup guide](<docs/PUBLISHING.md>) and [npm validation review](<docs/NPM_RELEASE_REVIEW.md>), separating tarball checks, npm account configuration, actual publication, and live installation.
- Retained the unchanged [November 8 browser record](<docs/BROWSER_RESULTS.json>) for `@local/dsh-salah`. Its 16 passing cases are historical local-package UI evidence, not a renamed-package GUI test. CI for the tagged release commit is linked from the GitHub release and validates the declared cross-platform gates, not live Harness UI.

### Added

- Explicit first-run review of source, location/time zone, and method before ready widget/dock countdowns.
- Source-aware MyQuran fallback settings, actual-source and fetch-freshness indicators.
- Explicit public/non-commercial and licensed customer geocoding modes with Host-only credential resolution and no silent provider changes.
- Portable Node-based build/npm invocation, isolated clean-dependency installation checks, and Ubuntu/Windows CI lanes.
- A real-Harness browser regression runner using an explicitly authorized existing CDP browser, controlled Salah API responses, and strict incomplete-coverage reporting.

### Changed

- Compacted the conversation footer to an inline prayer name and short countdown, without the repeated Salah label or forced full-width row.
- Moved optional interface explanations into Help/tooltips while retaining setup checks and visible warnings.
- Revised English and Indonesian interface copy for clearer prayer, source, location, and fallback labels.
- Reworked public installation, privacy, development, and service-attribution documentation.
- Added supplied screenshots of the floating widget and full prayer-times page.
- Added release validation and a continuous-integration configuration.

The GitHub release and its assets are published separately after the exact commit passes CI. npm publication and live scoped-package installation are not implied by that release.

## 1.1.0 — 2026-11-05

### Added

- A compact floating widget inside Harness, with the latest prayer start and next-prayer countdown.
- Pointer and keyboard movement, viewport clamping, and browser-local position/visibility preferences.
- Controls to hide, reopen, and reset the widget.
- Adjacent-day context for current-prayer information across midnight.

## 1.0.0 — 2026-11-05

### Added

- A Prayer times page and compact conversation countdown.
- AlAdhan, MyQuran, and local Adhan calculation sources.
- Browser location, city search, and manual coordinates/time-zone selection.
- Profile-wide source and calculation preferences.
- Shared UI and agent operations, authenticated Host requests, and provider/lifecycle regression tests.
