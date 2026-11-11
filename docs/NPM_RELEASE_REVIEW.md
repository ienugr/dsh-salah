# npm distribution preparation review

Initial preparation review: **2026-11-09**; release-verification follow-up: **2026-11-11**. Target: **`@icanhcorpse/dsh-salah@1.2.0`** on `https://registry.npmjs.org`, with public access. Source repository: [ienugr/dsh-salah](https://github.com/ienugr/dsh-salah).

## Status: npm package prepared — NOT PUBLISHED

The package was prepared on `prepare/npm-distribution` from `c1804d2`. The npm package remains unpublished; the GitHub v1.2.0 release distributes a separately validated tarball. The repository includes a Trusted Publishing (OIDC) workflow for future stable releases and a guarded manual dispatch for this existing tag. The workflow has not been dispatched, and no npm-side trusted publisher has been configured. The release page and Actions runs remain authoritative for the exact release tag and its CI. The original linked local checkout remains unchanged. This report does not claim npm publication or authentication, live bundle installation or local-to-scoped migration, a current browser run, or changed Harness theme/profile state.

An anonymous public-registry lookup returned **404** during preparation. This is evidence of no anonymous public visibility at lookup time, not proof that no private package exists or that the intended npm account is authenticated or has publishing rights.

## Distribution and consumer contract

- Public package target: `@icanhcorpse/dsh-salah`, version **1.2.0**. Do not infer a version bump or GitHub-owner change from the npm scope change.
- Supported runtime remains **Harness 0.2.1-rc.5** only; Host Node.js **>=22.15**. Other Harness versions are unvalidated.
- The [README](<../README.md>) describes installation **after publication** through Harness Plugin Manager with the exact pinned spec and explicit public registry. Published consumers do not need cloning, a build, a global npm installation, or a nonexistent CLI.
- The manager's returned `application`, warnings, and `nextStep` govern activation. `already-installed` is not an upgrade; a stable slot ID is not proof of newly loaded code.
- The [publishing guide](<PUBLISHING.md>) documents the OIDC workflow at `publish-npm.yml`, the `npm-publish` environment, and the account-owner trust setup. It does not imply that npm trust is configured or that any workflow was dispatched.

## Stable state and migration boundaries

The rename is intended to preserve storage domain **`salah_preferences`, version `1`**, browser view keys **`dsh.salah.floating.v1`** / **`dsh.salah.review.v1`**, and existing service, slot, and row identifiers. Package/loader references change together; persistence identifiers do not.

Keep the prepared worktree separate from the active linked checkout: applying the package/client identity rename to that live directory before unloading the old bundle can break its next refresh. A commit in this preparation worktree does not require changing the live checkout.

The old and new package names must not be active together because those identities overlap. The [README migration](<../README.md#migrate-from-localdsh-salah>) requires the Plugin Manager to list the exact installed name, remove only `@local/dsh-salah`, fully unload the old generation, and install the scoped package only after its GitHub bundle or npm distribution is available. Keep the old linked checkout available until unloading and replacement verification are complete. Do not edit profile files, delete settings, clear browser data, or alter Host credentials as a rename step.

State reuse assumes the same Harness profile and storage backend; browser view state also depends on the same browser origin. Changing profiles/backends/devices is not covered by this rename. The storage facility allows one open handle per domain name, so the old generation must close its handle before the new one opens it. This is preservation of the existing data contract, not a byte-for-byte promise about all legacy records: privacy normalization may already have scrubbed saved current-device GPS locations. Current GPS fixes remain transient, and [Privacy](<../PRIVACY.md>) continues to define persistence and erasure limits. Bundle removal is not guaranteed data erasure. No live migration or storage-restart proof was obtained in this preparation.

## Evidence: keep historical and current checks separate

| Evidence | Result and exact boundary |
| --- | --- |
| [November 8 browser record](<BROWSER_RESULTS.json>) | Historical **16/16 PASS** for **`@local/dsh-salah@1.2.0`**, Chrome 156.0.8078.81, Harness 0.2.1-rc.5 on macOS arm64. Actual Harness UI with controlled Salah API fixtures, not full live-provider/network coverage. The JSON remains unchanged and is not a browser pass for the renamed npm package. |
| [November 8 release review](<RELEASE_REVIEW.md>) | Historical local/build/browser detail and limits. Its counts are not current npm-worktree test counts. |
| [Prior GitHub Actions run 42555380585](https://github.com/ienugr/dsh-salah/actions/runs/42555380585) | Historical baseline for main commit **`c1804d2`**, November 9. It predates this scoped-package release work. The browser JSON's CI note describes its November 8 snapshot, not this later baseline. |
| Renamed-package local gates | **Passed on macOS arm64 / Node 26.13.0 / npm 11.20.0 (November 11):** 137 Node tests, 55 browser-free tests, dependencyless bootstrap, fresh clean install/build, and actual tarball production-only consumer install/import. These are not live Harness or public-registry installation results. |
| Public npm publication/access | **Not performed / not verified.** Anonymous lookup was 404. |
| Actual scoped registry install and fresh browser smoke | **Not performed.** Existing live UI and unchanged registration IDs do not substitute for this check. |

## Current npm-worktree validation log

Revalidated on **November 11, macOS arm64, Node.js 26.13.0 and npm 11.20.0** after the release-document updates. The counts below come from current-worktree runs, not the historical browser record. The complete clean-install/consumer integration and standalone Node/browser-free/release checks exited 0; no tests failed or were skipped.

| Gate | Current result |
| --- | --- |
| Manifest/lock/patch/client scoped-identity consistency and stable persistence IDs | Passed. Client differs only in its registration package ID; Host/service/core/styles and dependency-lock entries beyond root identity remain unchanged. |
| `npm ci --ignore-scripts` and `npm run build:ui` | Passed with isolated empty npm configuration and public registry; fresh generated client is byte-for-byte equal to the prepared artifact. |
| Syntax (`npm run check`), Node tests (`npm test`), browser-free preflight (`npm run test:e2e:preflight`) | Passed: **137 Node tests** and **55 browser-free tests**, zero failures/skips. Includes packaging, real dependencyless bootstrap and nested-process timeout/abort tests. |
| `npm run check:clean-install` | Passed: **48 allowlisted release inputs**, isolated locked development install, all check/test/build stages, exactly one packed-artifact integration, artifact comparison and guarded cleanup. This is not a live profile/storage-restart test. |
| `npm run check:package` | Passed as the clean-install integration: real tarball, **44 packed files**, verified archive size/SHA-1/SHA-512, anonymous production-only install, actual scoped Node import, runtime dependencies/exports/resources/loader ID/prebuilt CSS, and no development/build dependencies. Host apply and Client factory were not called. |
| `npm run check:release` and actual packed-file review | Passed: **44 packed files**, **63 packed-local documentation links**, **150 matching interface keys**; package metadata/assets/imports and historical-evidence attribution validated. This does not rerun a browser suite. |
| Documentation links, forbidden-content review, unchanged historical browser JSON | Passed. Source-only links now use GitHub source URLs; relative links must exist in the packed inventory. Historical browser JSON remains byte-identical to `c1804d2`; live checkout remains clean and unchanged. |

## Review findings addressed

- The initial actual clean CLI exited **13** before installing because a top-level-await import cycle connected the clean verifier and artifact checker. A pure bootstrap environment helper removed the cycle. Real copied-checkout tests now prove startup without `node_modules`, and a deliberately invalid local lock proves the CLI reaches the bounded npm stage without downloading dependencies.
- Independent review found source-only lock/workflow links absent from the tarball. They now link to GitHub source, and a packed-inventory link validator rejects checkout-only targets even when those files exist beside the sources.
- Independent review reproduced nested POSIX subprocess groups surviving an outer timeout. Cleanup now verifies owned PID/PPID/PGID metadata, freezes and captures owned descendants, terminates children first, and confirms disappearance before returning. Real nested timeout and abort regressions pass. No command-line, environment, profile or unrelated-process data is inspected for this cleanup.
- Unconfirmed teardown fails closed using reserved verifier status `86` across the clean, release and package CLI boundaries. Owned temporary directories are retained rather than deleted while cleanup is uncertain; ordinary confirmed-failure cleanup still removes them. Windows live tree-kill results are checked for failure rather than assuming success, and standalone inventory preview owns interruption signals and drains its child. The Windows result contract is unit-tested, not a native-Windows execution claim; a real POSIX preview-cancellation fixture verifies child disappearance, temporary cleanup and listener restoration. This is verification tooling, not a general Host process manager.

The initial partial/failed checks were not promoted to success; the final current-source integration above supersedes them. GitHub CI exercises Ubuntu Node 22.15/24 and Windows Node 24 for the exact release commit. The taskkill failure contract is tested without claiming an injected native-Windows failure; a live scoped-package Harness installation, real storage restart and provider entitlements remain separate checks.

## Separate npm and live-install gates

1. Configure npm Trusted Publishing for owner `ienugr`, repository `dsh-salah`, workflow `publish-npm.yml`, and GitHub environment `npm-publish`. Verify the account has permission for `@icanhcorpse/dsh-salah`; do not disclose credentials. If npm requires an owner-controlled first-publish bootstrap because the package does not exist yet, follow current npm guidance and review that action separately.
2. After that setup, `workflow_dispatch` from `main` with input `tag: v1.2.0` runs validation only by default. Setting `publish: true` explicitly publishes the existing tag through OIDC, with provenance disabled for that one-off because the event SHA is `main` while the package source is the older tag. Future stable releases published directly publish automatically with tag-aligned provenance; promotion from an already-published prerelease is not wired. The workflow has **not** been dispatched and the npm package remains unpublished at this review.
3. Confirm public access and anonymous exact-version/tarball availability after publication. Separately authorize an actual Harness install smoke test and local-to-scoped migration, following manager lifecycle instructions without activating both names or deleting user data; record the loaded package/version and exercised behavior.
4. Keep provider availability, commercial entitlement, hardware GPS/OS prompts, real storage restart, and other-runtime compatibility limits explicit. Earlier synthetic/local tests do not close these gates.

This review is not a security certification, legal opinion, service licence, or guarantee of registry/provider availability.
