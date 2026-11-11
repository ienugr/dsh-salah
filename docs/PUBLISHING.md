# Publishing Salah to npm

**Preparation snapshot — 2026-11-09: prepared, not published.** The intended first public package is `@icanhcorpse/dsh-salah@1.2.0`. The npm account is `icanhcorpse`; the source repository remains [ienugr/dsh-salah](https://github.com/ienugr/dsh-salah). Changing the npm scope does not change GitHub ownership.

This is an **owner-run manual checklist**, not authorization for an agent or CI to publish, authenticate, alter a live profile, or migrate an installation. No GitHub publishing workflow is enabled. No unattended publication or first-publish OIDC setup is assumed.

## 1. Confirm identity and package availability

In your own terminal, authenticate directly with npm if needed. Never paste a token, password, recovery code, or one-time code into agent chat, issues, or source files.

```sh
npm login --registry=https://registry.npmjs.org
npm whoami --registry=https://registry.npmjs.org
```

`npm whoami` must return `icanhcorpse`. Confirm that this account controls the intended scope and has permission to publish this package; the account name alone does not prove that permission.

The preparation session's anonymous public-registry lookup returned **404**. That proves only that the package was not anonymously visible at that time. It does not establish account authentication, namespace ownership, publishing rights, or the absence of a private package.

Check the exact version before publishing:

```sh
npm view @icanhcorpse/dsh-salah@1.2.0 name version --json --registry=https://registry.npmjs.org
```

A failed lookup is not permission to overwrite a version. Published npm name/version pairs are immutable; do not assume that unpublishing permits reuse. Keep `1.2.0` for this initial preparation unless the owner makes an explicit version decision after checking registry state.

## 2. Review the prepared source

Review the complete diff, including [the package manifest](<../package.json>), [source lockfile](https://github.com/ienugr/dsh-salah/blob/main/package-lock.json), [bundle patch](<../cordis.patch.yml>), and [client loader](<../client.js>). Confirm:

- Name/version are exactly `@icanhcorpse/dsh-salah` / `1.2.0`, the package is not private, and `publishConfig.access` is `public` with the intended public registry.
- Repository, homepage, and issue metadata point to `ienugr/dsh-salah`, not a guessed npm-account GitHub repository.
- Host, patch, and client package references agree. Stable row/slot identifiers, storage domain `salah_preferences` version `1`, and the `dsh.salah.*` browser keys are not renamed as a side effect.
- Declared compatibility remains **Harness 0.2.1-rc.5** and **Node.js >=22.15**. Do not widen it without evidence.
- During preparation, the [README](<../README.md>) accurately labels publication pending; finalize neutral availability wording before the final pack as described below. [The npm review](<NPM_RELEASE_REVIEW.md>) retains dated status, actual results, and remaining limits.
- The [November 8 browser record](<BROWSER_RESULTS.json>) still identifies `@local/dsh-salah`. Preserve that historical artifact; do not relabel it as a renamed-package test.

Commit, push, tag, or create a GitHub release only as separate, explicitly chosen owner actions. The prior main-branch CI result does not validate uncommitted npm-preparation changes.

If the running `@local/dsh-salah` bundle links to a checkout, keep that checkout unchanged until the manager has fully unloaded it. Prepare and publish from a separate checkout/worktree; do not switch branches, pull, or apply this identity rename into the live linked directory first. Doing so can leave the old installed package alias pointing at a new client module ID and break loading on refresh. Use the [explicit migration](<../README.md#migrate-from-localdsh-salah>) when the published replacement is ready.

## 3. Run the local release gates

Use Node.js 22.15 or later. From the reviewed source directory:

```sh
npm ci --ignore-scripts
npm run build:ui
npm run check:clean-install
```

The clean-install gate runs `check`, `test`, `test:e2e:preflight`, `check:release`, `build:ui`, and then exactly one `check:package` integration in an isolated dependency checkout; it also compares the client artifact. There is no need to repeat these standalone checks just to inflate the log. `npm run check:package` remains available for a focused real-tarball consumer check, and the publication hook invokes it independently. Neither command publishes to npm or installs a live Harness bundle. For a quick development loop, see [Contributing](<../CONTRIBUTING.md>).

Review every result; do not convert a missing script, skipped test, or partial run into a pass. Record dates, environment, commands, and actual outcomes in [the npm review](<NPM_RELEASE_REVIEW.md>). No browser attachment, Host theme change, profile installation, or authentication is part of these local gates. A fresh authorized live-Harness smoke test is a separate step after publication.

### Finalize publication copy before the final pack

Keep the current **publication pending** banner during preparation. Once the owner is ready to finalize the first release, **before the final pack**, replace preparation-only README assertions such as “has not been published” with neutral, availability-conditioned wording: for example, “Install this version through Harness Plugin Manager once it is publicly available on npm.” This must not claim publication has already happened. Retain dated preparation status and historical proof in the release reviews. Rerun the affected gates, then inspect the **final** archive below; the first published tarball must contain that finalized copy. Do not plan to correct an immutable `1.2.0` tarball by republishing the same version.

### Inspect the actual tarball

Create an actual archive with lifecycle scripts disabled, then review both npm's file inventory and the archive:

```sh
npm pack --ignore-scripts --json
# For this exact package name and version:
tar -tzf icanhcorpse-dsh-salah-1.2.0.tgz
```

Verify the archive contains its runtime exports, bundle patch, generated client, display locales/icon, license/notices, and linked documentation. Check the packed manifest, not just the working-tree manifest. Exclude environment/configuration secrets, npm authentication files, tokens, Host/profile data, browser state, dependencies, raw logs, Git state, and other archives. Do not assume a `files` allowlist makes secrets impossible. Do not commit the generated archive.

If any reviewed source, metadata, generated artifact, or documentation changes afterward, rerun the affected gates and pack inspection. Make the decision to publish against that exact reviewed content.

## 4. Publish only after explicit owner approval

**This command changes the public registry. Do not run it during preparation.** Once identity, permissions, review, and all required gates are satisfactory, the owner may explicitly run:

```sh
npm publish --access public --registry=https://registry.npmjs.org
```

The package's `prepublishOnly` hook reruns release/package checks when the owner invokes publication; it does not authorize or initiate publication on its own. Complete any npm-required authentication or second-factor prompt directly with npm. Do not disable account protections or disclose credentials to an agent. A local pack/check success is not a publish success.

## 5. Verify public availability and a real consumer install

After npm reports success, verify the exact version and access:

```sh
npm view @icanhcorpse/dsh-salah@1.2.0 name version dist.tarball --json --registry=https://registry.npmjs.org
npm access get status @icanhcorpse/dsh-salah --registry=https://registry.npmjs.org
```

Require `public` access, and independently confirm that the exact version and tarball are readable **without npm authentication**. An authenticated owner lookup alone does not prove public availability, and propagation or service availability is not guaranteed.

With separate authorization, perform an actual Harness Plugin Manager install using the [pinned README request](<../README.md#install-from-npm--after-publication>). Do not install the renamed bundle beside the old local bundle. Follow the manager's `application`, warnings, and `nextStep`, complete required restart/refresh, verify the loaded package/version and display resources, and exercise setup, timetable, and widget behavior. An `already-installed` result is not an upgrade; follow manager guidance and, when required, explicitly remove only the exact old bundle before reinstalling the pinned version. Do not edit profile files or erase user data.

Record registry/public-access evidence and the actual install outcome separately from earlier Node/packaging/browser evidence. After verifying publication, update the GitHub/source documentation's current status separately while retaining dated preparation history. This source update does not change the already published immutable tarball, whose neutral install wording must have been finalized before the final pack. None of these post-publication steps was performed during the isolated npm-preparation work.
