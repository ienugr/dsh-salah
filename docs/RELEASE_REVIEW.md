# Historical local-bundle release and improvement review

> **npm preparation update — 2026-11-09:** `@icanhcorpse/dsh-salah@1.2.0` is **prepared, not published**. See [the npm release review](<NPM_RELEASE_REVIEW.md>) for the renamed package's actual validation status and [Publishing](<PUBLISHING.md>) for manual owner steps. No live migration, registry install, or new browser run was performed during npm preparation. The original linked checkout remains running unchanged.

Review date: **2026-11-08**. Historical target: **`@local/dsh-salah@1.2.0`**, distributed as a GitHub checkout/local DeepSeek Harness bundle. Unless explicitly updated below, this document describes that earlier execution, not the uncommitted npm-preparation worktree.

**All six improvements were implemented, and the final local/browser gates passed for that historical target.** The unchanged [executed browser summary](<BROWSER_RESULTS.json>) records the November 8 Chrome/Harness **16-case** result under the old package name. It is not a new GUI or registry-install pass for `@icanhcorpse/dsh-salah`. Paid-service entitlement and a fresh authenticated Harness profile/storage restart remain unexecuted checks. No GitHub repository, push, tag, or npm publication was performed by the November 8 implementation session.

A later recorded baseline, [GitHub Actions run 42555380585](https://github.com/ienugr/dsh-salah/actions/runs/42555380585), succeeded in all three lanes for main commit **`c1804d2`** on November 9 (Ubuntu Node 22.15/24 and Windows Node 24). That is prior-main evidence only; the new npm worktree has not been pushed or run in new remote CI. The browser JSON retains its original snapshot, including its then-unexecuted CI note.

This review is not a security certification, legal opinion, commercial service licence, or guarantee of provider availability.

## Six-improvement acceptance matrix

| Improvement | Implementation | Executed evidence and boundary |
| --- | --- | --- |
| Source-aware settings | MyQuran's provider-controlled timetable is separate from **Offline fallback settings**; other sources use calculation settings. Existing selected values are preserved. | Node and actual Harness UI cases pass, including legacy Singapore/Hanafi choices and provider-aware city identity. |
| Real-browser regressions | The runner attaches only to an explicitly authorized existing CDP browser and uses owned test tabs with controlled Salah API responses. Missing cases cannot produce a pass. | **16/16 mandatory cases passed**, CLI exit 0, empty stderr, no unverified cases, and owned cleanup completed. This is actual UI coverage, not uncontrolled Host/provider-network E2E. |
| Portable build and clean checkout | Tailwind and npm JavaScript entry points run through Node without executable wrappers or shell strings. Clean verification isolates dependencies/npm state and guards cleanup. | Local macOS Node/build/clean-install checks pass, including paths containing spaces and byte-identical UI output. Ubuntu/Windows CI is configured, not remotely executed. |
| Widget source and freshness | Provenance distinguishes online schedules, intentional local calculation, and fallback. Fetch time/time zone are accessible; failure, staleness and exhaustion remain explicit. | Pure logic and actual timer, source/fallback, failure-latch, pointer, keyboard and viewport cases pass. An exhausted schedule is not labeled current. |
| Reviewed setup | Three explicit source, location/time-zone and method/fallback acknowledgements gate ready widget/dock countdowns. Fresh confirmation rechecks shared choices. | Actual SHA-256 reload/mismatch and A-to-B confirmation-race cases pass. Acknowledgement remains browser view state, not Host authorization. |
| Licensed geocoding | Public remains the default. Commercial selection uses only the fixed customer endpoint with a Host-managed credential and no silent public fallback. | Synthetic credential/provider and actual UI rejection/recovery cases pass. No real commercial key, paid request or entitlement was tested. |

## Executed local checks

Environment: **macOS arm64**, **Node.js 24.15.0**, **npm 11.12.1**, **Harness 0.2.1-rc.5**, and **Chrome 156.0.8078.81**.

- **122 Node regressions passed**, zero failures/skips: 99 core/service cases, 18 client cases and 5 build/install cases.
- **55 browser-free safety/contract tests passed**, zero failures/skips. These are separate from actual browser execution.
- **16 actual browser cases passed**, CLI exit 0, empty stderr and no unverified mandatory cases.
- Syntax, scoped UI compilation and release-content checks passed. English/Indonesian dictionaries contain **150 matching interface keys**.
- The full dependency audit reported **0 known vulnerabilities** on the review date; this does not guarantee the absence of undisclosed vulnerabilities.
- The isolated clean-install verifier passes locked installation with scripts disabled, syntax/Node/browser-free/release checks, fresh compilation and byte-for-byte artifact comparison. It copies only explicit release inputs into an owned temporary directory and completes guarded cleanup. This is not a fresh authenticated Harness profile.
- Supplied widget/dashboard WebP assets retain their supplied bytes, without EXIF/XMP chunks.
- Plugin installation returned `application: applied` without warnings. Live status before and after testing retained the existing manual MyQuran preferences, method/Asr choices and public geocoding selection.

## Browser scope, theme persistence and cleanup

The UI tests run inside the **actual installed Harness and Salah client**, not a standalone page or a simulated React/DOM renderer. Only `/api/salah` is controlled by a fixture using the production service with synthetic storage, credentials and provider engine. Real provider availability, licensed entitlement, actual GPS hardware/OS permission prompts and Host storage restart are outside this coverage.

Only the plugin's two browser preference keys are redirected into the owned tab's session storage, without reading existing user values. Date/GPS fixtures are owned-page APIs; the runner does not install a context-wide clock. Routes remain active until the owning page closes, preventing teardown from leaking requests to real Salah settings/providers. Origin discovery reads existing tab URLs only to match the authorized Harness origin. Existing tab content or storage, browser cookies and personal profiles are not inspected or copied; existing tabs and the browser/context are not closed.

For the final theme run, the user chose **keep the current saved preference**. The runner captured it through a real Host description before mutation; it did not reuse a historical System assumption. Each actual preference write required:

1. Exact same-origin settings mutation, namespace and single preference operation.
2. The generated **named plain-object `payload.args`** contract, not positional business arguments.
3. A matching RPC response, HTTP completion and logical success.
4. A valid numeric revision at or above the loaded/last-accepted floor, including when the optional request token is omitted.
5. Exact target preference, with accepted evidence retained before click/UI completion could fail.

The final run recorded two acknowledged writes, with monotonic revisions **9 → 10 → 11**. The original tab was then closed. A separate fresh tab obtained an authoritative Host description and verified the saved choice, selected option, HTML source indicator and BODY theme tokens/color scheme against the captured original. Fresh verification succeeded, and all owned tabs/services closed before the CLI emitted PASS. The public summary omits raw RPC identifiers, private paths, other settings values and authentication material.

The live run also confirmed a real UI lifecycle detail: after the dark write was accepted, General controls were absent. The shared settlement helper reopened them through observed navigation, checked the exact selected source/indicator, and performed **no extra preference write**.

## Independent review and regression findings

Independent domain/craft and engineering-manager reviews inspected actual callers and the distributed generated SDK, not just supplied test envelopes. Both verified Node tests; owned-copy mutations demonstrated that critical guards fail when removed. Findings were addressed before final verification:

- The first fixture's commercial selection had bypassed real service rejection. It now uses the production service and tests missing-key atomicity and explicit public recovery.
- Remembered dialog-open state was unsafe after partial close. Recovery now checks live visibility and observed idempotent navigation.
- An optimistic UI-only theme restoration had been mistaken for persistence. It was replaced with exact write acknowledgements and authoritative independent fresh reads.
- A failed first fresh reader could suppress repair; repair proof could ignore the repair revision. Shared bounded reacquisition/repair now retains all accepted revisions and never converts a failed test into PASS.
- The observer incorrectly inferred positional RPC arrays from JavaScript call syntax. The generated client and Host dispatcher prove named arguments; matcher tests now exercise that actual contract and reject obsolete arrays.
- A completed ACK could be lost if the click promise later rejected. Retention now attaches before awaiting click completion; the main failure remains a failure.
- Main caller revision forwarding lacked regression protection. A callback-level test now invokes the actual orchestration boundary, and removing the floor argument makes it fail.
- Post-ACK General disappearance caused a UI timeout. Bounded live-control reopening now preserves the same selection/indicator assertions without re-clicking the preference.
- The compact footer needed a coarse-pointer target; desktop remains 20px and coarse-pointer height is 28px. A doubled shell-continuation example was also corrected.

The earlier optimistic **16-case CLI PASS was invalidated**, and subsequent diagnostic failures were never treated as release passes. The November 8 executed result linked above supersedes them. No historical System repair is claimed: the final run honors the user's newer instruction to preserve the freshly read current choice.

## Compact-interface follow-up

The footer is a content-sized inline prayer name and short countdown, without repeated Salah branding, a separator or a forced full-width row. Optional explanations are under one collapsed Help section. Required setup checks, field labels, source distinctions and critical warnings remain visible. The reviewed-setup action shares the header instead of occupying a separate row. The user refreshed and confirmed the compact footer looked better; no automated footer-pixel measurement or real touch-device test is implied.

## Remaining external gates

- **GitHub CI:** [the source workflow](https://github.com/ienugr/dsh-salah/blob/main/.github/workflows/checks.yml) defines Ubuntu Node 22.15.0/24 and native Windows Node 24 clean-install/audit lanes. The November 8 session had not run it remotely. The later `c1804d2` baseline succeeded as noted above; new npm-preparation changes still require their own remote result before any new CI claim.
- **Commercial service:** configured-key metadata proves only credential presence, not subscription validity or entitlement. No real key was read or used for testing.
- **Profile/storage lifecycle:** isolated dependency installation is not a fresh authenticated Harness profile or a real storage restart.
- **Publication:** npm publication is still pending; follow [the current manual checklist](<PUBLISHING.md>) rather than treating the old local-bundle review as publication approval. Preserve the lockfile, generated client, notices, tests and workflow in source. Exclude dependency directories, environment files, runtime storage, raw logs, archives, tokens and CDP WebSocket URLs from public artifacts. Enable private vulnerability reporting or a real private contact channel.
- **Service terms and screenshots:** preserve attribution/licensing notices and confirm the example-city screenshots remain appropriate for publication. The supplied images show the earlier pre-release interface, not every current control.

No unexecuted CI, paid-service, storage-restart, OS or publication step should be represented as complete merely because its script exists.
