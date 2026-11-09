# Changelog

## 1.2.0 — Unreleased

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

These entries describe local release preparation; no GitHub release or npm publication is implied.

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
