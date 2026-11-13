# Publishing Salah to npm

**Preparation follow-up — 2026-11-12: `@ienugr/dsh-salah@1.2.1` is prepared, not published to npm.** The immutable GitHub `v1.2.0` release remains the earlier `@icanhcorpse/dsh-salah` tarball; the account-scope alignment needs a follow-up release/tag. The npm account and GitHub repository owner are both `ienugr`; the repository remains [ienugr/dsh-salah](https://github.com/ienugr/dsh-salah).

This is an **owner-side setup checklist**. The [GitHub Actions publisher workflow](https://github.com/ienugr/dsh-salah/blob/main/.github/workflows/publish-npm.yml) uses npm Trusted Publishing (OIDC); it does not use an `NPM_TOKEN`. Future stable GitHub releases trigger the workflow after the one-time npm trust configuration below. The existing GitHub `v1.2.0` release predates that workflow and remains under the older `@icanhcorpse` scope; it will not trigger the new `@ienugr` package publication. The follow-up `v1.2.1` release must be published after npm trust is configured. The workflow does not configure the npm account or grant itself publishing authority until npm trusts its exact repository, workflow, and environment identity.

## 1. Configure npm Trusted Publishing

Sign in to the new npm account `ienugr` directly on npm. Never paste an access token, password, recovery code, or one-time code into agent chat or the repository.

Configure the package's **Trusted Publisher** using these exact values:

- Provider: GitHub Actions
- Repository owner: `ienugr`
- Repository: `dsh-salah`
- Workflow filename: `publish-npm.yml`
- GitHub environment: `npm-publish`

See [npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers). Create the GitHub `npm-publish` environment and use the same name in npm's trusted-publisher configuration. You may add required reviewers to the environment as an additional approval gate. The workflow requests GitHub OIDC permission only in its publishing job; it does not use or require an `NPM_TOKEN` secret.

The package is not yet published. If npm's account UI will not let you configure a Trusted Publisher for this unpublished name, stop and follow npm's current documented bootstrap flow with the account owner. Do not add a long-lived token to the repository, an issue, or agent chat. A manual run with `publish: false` only validates and never requests OIDC; do not set `publish: true` or authorize npm publication until npm shows the expected trusted publisher.

An anonymous lookup of `@ienugr/dsh-salah` returned **404** on 2026-11-12. That establishes only that it was not anonymously visible at that time; it does not verify account ownership, publishing rights, or trusted-publisher setup.

Check exact-version availability before any publish attempt:

```sh
npm view @ienugr/dsh-salah@1.2.1 name version --json --registry=https://registry.npmjs.org
```

A failed lookup is not permission to overwrite or reuse a published name/version. npm versions are immutable; never assume unpublishing permits reuse.

## 2. Review the prepared source

Review the complete diff, including [the package manifest](<../package.json>), [source lockfile](https://github.com/ienugr/dsh-salah/blob/main/package-lock.json), [bundle patch](<../cordis.patch.yml>), and [client loader](<../client.js>). Confirm:

- Name/version are exactly `@ienugr/dsh-salah` / `1.2.1`, the package is not private, and `publishConfig.access` is `public` with the intended public registry.
- Repository, homepage, and issue metadata point to `ienugr/dsh-salah`, not a guessed npm-account GitHub repository.
- Host, patch, and client package references agree. Stable row/slot identifiers, storage domain `salah_preferences` version `1`, and the `dsh.salah.*` browser keys are not renamed as a side effect.
- Declared compatibility remains **Harness 0.2.1-rc.5** and **Node.js >=22.15**. Do not widen it without evidence.
- The [README](<../README.md>) separates the existing GitHub bundle from conditional npm installation. The [OIDC workflow](https://github.com/ienugr/dsh-salah/blob/main/.github/workflows/publish-npm.yml) binds publishing to a stable published GitHub release or an explicitly dispatched existing tag; npm account setup remains owner-controlled. [The npm review](<NPM_RELEASE_REVIEW.md>) retains validation evidence and limits.
- The [November 8 browser record](<BROWSER_RESULTS.json>) still identifies `@local/dsh-salah`. Preserve that historical artifact; do not relabel it as a renamed-package test.

Commit, push, tag, or create a GitHub release only as separate, explicitly chosen owner actions. The prior main-branch CI result does not validate uncommitted npm-preparation changes.

If the running `@local/dsh-salah` bundle links to a checkout, keep that checkout unchanged until the manager has fully unloaded it. Prepare and publish from a separate checkout/worktree; do not switch branches, pull, or apply this identity rename into the live linked directory first. Doing so can leave the old installed package alias pointing at a new client module ID and break loading on refresh. Use the [explicit migration](<../README.md#previous-installations>) when the published replacement is ready.

## 3. Run the local release gates

Use Node.js 22.15 or later. From the reviewed source directory:

```sh
npm ci --ignore-scripts
npm run build:ui
npm run check:clean-install
```

The clean-install gate runs `check`, `test`, `test:e2e:preflight`, `check:release`, `build:ui`, and then exactly one `check:package` integration in an isolated dependency checkout; it also compares the client artifact. There is no need to repeat these standalone checks just to inflate the log. `npm run check:package` remains available for a focused real-tarball consumer check. The OIDC workflow runs these gates before creating its publish artifact; its final job uses `--ignore-scripts` so no package lifecycle code executes with the OIDC permission. A manual `npm publish` that runs lifecycle hooks still invokes `prepublishOnly`. These validation commands alone do not publish to npm or install a live Harness bundle. For a quick development loop, see [Contributing](<../CONTRIBUTING.md>).

Review every result; do not convert a missing script, skipped test, or partial run into a pass. Record dates, environment, commands, and actual outcomes in [the npm review](<NPM_RELEASE_REVIEW.md>). No browser attachment, Host theme change, profile installation, or authentication is part of these local gates. A fresh authorized live-Harness smoke test is a separate step after publication.

### Finalize publication copy before the final pack

The README now uses availability-conditioned install instructions for `@ienugr/dsh-salah@1.2.1`; it does not claim that npm publication has happened. Before publishing, recheck the final README and release notes for that boundary. Retain dated preparation history in the release reviews, and rerun the affected gates plus final archive inspection after any further copy edit. The immutable `v1.2.0` GitHub asset remains under the old scope; do not reuse or overwrite its version.

### Inspect the actual tarball

Create an actual archive with lifecycle scripts disabled, then review both npm's file inventory and the archive:

```sh
npm pack --ignore-scripts --json
# For this exact package name and version:
tar -tzf ienugr-dsh-salah-1.2.1.tgz
```

Verify the archive contains its runtime exports, bundle patch, generated client, display locales/icon, license/notices, and linked documentation. Check the packed manifest, not just the working-tree manifest. Exclude environment/configuration secrets, npm authentication files, tokens, Host/profile data, browser state, dependencies, raw logs, Git state, and other archives. Do not assume a `files` allowlist makes secrets impossible. Do not commit the generated archive.

If any reviewed source, metadata, generated artifact, or documentation changes afterward, rerun the affected gates and pack inspection. Make the decision to publish against that exact reviewed content.

## 4. Use the GitHub OIDC publishing workflow

The [publisher workflow](https://github.com/ienugr/dsh-salah/blob/main/.github/workflows/publish-npm.yml) reacts to `release.published` for stable releases. It validates the published release record and exact tag/commit, requires the tag's commit to be on `main`, checks that the tag matches the scoped package version, runs clean-install/build/test/package checks and the runtime dependency audit, and installs the exact packed artifact in a production-only consumer. Only a second job receives `id-token: write`; it rechecks the tag/commit, downloads, and publishes that validated tarball with lifecycle scripts disabled. Trusted Publishing supplies provenance for tag-aligned releases. Test and package lifecycle code does not run in the OIDC-enabled publishing job. No `NPM_TOKEN` is used.

The existing GitHub `v1.2.0` release remains the old `@icanhcorpse/dsh-salah` package and predates the OIDC workflow; its event will not replay. The prepared follow-up target is `@ienugr/dsh-salah@1.2.1`. Configure the npm Trusted Publisher before creating and publishing GitHub release `v1.2.1`, so its `release.published` event can publish the matching tag automatically with provenance.

The `workflow_dispatch` path is limited to `v1.2.1` and defaults to validation-only. The follow-up tag will contain this workflow, so recovery can be dispatched using the `v1.2.1` tag ref; the workflow checks that `GITHUB_SHA` exactly matches the selected tag before enabling OIDC provenance. Set `publish: true` only after the trusted publisher is visibly configured, an anonymous preflight confirms the target version has not already been published, and the package owner explicitly approves publication. This preparation did not dispatch the workflow or publish anything to npm.

For a future stable release published directly after successful source CI, the GitHub Release event triggers the workflow automatically once OIDC is configured. Drafts and prereleases are rejected. Promoting a release that was first published as a prerelease is not automated by this trigger; create a new stable release/tag or review an explicit workflow change. Tags whose version differs from `package.json`, tags not on `main`, and missing/unpublished GitHub release records are rejected before npm publication. The workflow does not write or alter the GitHub release notes.

## 5. Verify public availability and a real consumer install

After npm reports success, verify the exact version and access:

```sh
npm view @ienugr/dsh-salah@1.2.1 name version dist.tarball --json --registry=https://registry.npmjs.org
npm access get status @ienugr/dsh-salah --registry=https://registry.npmjs.org
```

Require `public` access, and independently confirm that the exact version and tarball are readable **without npm authentication**. An authenticated owner lookup alone does not prove public availability, and propagation or service availability is not guaranteed.

With separate authorization, perform an actual Harness Plugin Manager install using the [pinned README request](<../README.md#install-from-npm>). Do not install the renamed bundle beside the old local bundle. Follow the manager's `application`, warnings, and `nextStep`, complete required restart/refresh, verify the loaded package/version and display resources, and exercise setup, timetable, and widget behavior. An `already-installed` result is not an upgrade; follow manager guidance and, when required, explicitly remove only the exact old bundle before reinstalling the pinned version. Do not edit profile files or erase user data.

Record registry/public-access evidence and the actual install outcome separately from earlier Node/packaging/browser evidence. After verifying publication, update the GitHub/source documentation's current status separately while retaining dated preparation history. This source update does not change the already published immutable tarball, whose neutral install wording must have been finalized before the final pack. None of these post-publication steps was performed during the isolated npm-preparation work.
