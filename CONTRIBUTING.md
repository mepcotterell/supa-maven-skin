# Contributing to Supa Maven Skin

The project's conventions (code style, the accessibility and documentation rules, and where code lives) are in [AGENTS.md](AGENTS.md).

## Building and Testing

```bash
# Fast frontend inner loop (ESLint, SCSS WCAG 2.2 AA/AAA contrast linter, Velocity linter, Docs version linter, Vitest, bundle size budget)
npm run lint && npm test && npm run build

# Full Maven build + Vitest unit tests + maven-invoker-plugin integration tests (each project in src/it/) + self-site render
mvn -B -ntp clean verify site

# Rendered-page WCAG 2.2 A/AA checks, plus AAA contrast on the modus palettes (axe-core +
# Playwright Chromium) on target/site/ and on each Invoker fixture's target/it/<name>/target/site/.
# Not part of npm test or mvn verify; needs the sites built above and a one-time browser install.
# CI runs them in their own job on the sites the JDK 21 build renders, with --require-fixtures so
# a missing fixture site fails instead of being skipped, and a SNAPSHOT publish and the Pages
# deploy wait for them. Name a fixture or a fixture page to scan only that.
npx playwright install chromium
npm run test:a11y
npm run test:a11y -- sample-site localized-site/fr/index.html

# The same checks in Firefox or WebKit (Chromium is the default, and CI's), here over the
# variants interaction scenarios use by default. --engine overrides the A11Y_ENGINE variable.
# Scenarios an engine cannot run are skipped, each with its reason printed once.
npx playwright install firefox webkit
npm run test:a11y -- --engine firefox --variants furo/light,furo/dark,modus/dark
A11Y_ENGINE=webkit npm run test:a11y -- --variants furo/light,furo/dark,modus/dark

# Regenerate the README screenshots in .github/screenshots/ from target/site/ (same browser).
npm run screenshots
```

Update GitHub Actions pins by resolving the desired upstream tag to its full commit SHA (dereferencing annotated tags), and update the trailing release-version comment alongside the pin.

## Publishing

CI (SNAPSHOTs from `main`) and `release.yml` (tags `v*`) build and verify without secrets, then hand `target/classes` to a separate job that imports the signing key. That job names its Maven goals instead of running a lifecycle phase, so no npm, Vite, Vitest, Checkstyle, or Invoker execution runs with the key. When you add an execution to the `release` profile in `pom.xml`, add its goal to both publish commands. To try the publish step locally after `mvn clean verify`, without signing or uploading:

```bash
mvn -B -ntp -Prelease jar:jar source:jar-no-fork@attach-sources jar:jar@attach-javadocs \
  gpg:sign@sign-artifacts central-publishing:publish -Dgpg.skip=true -DskipUpload=true
```

## Releasing

1. On `main`, set `<version>` in `pom.xml`, `version` in `package.json`, and `<latest-release.version>` to the release version, without `-SNAPSHOT`. Move the `## [Unreleased]` entries in `CHANGELOG.md` under a `## [x.y.z] - YYYY-MM-DD` heading and update the install snippets; `npm run lint:docs` lists what is left.
2. Commit, push `main`, then push the tag `vx.y.z` on that commit.

The release workflow (`release.yml`) starts with a preflight job that holds no secrets and fails the release, before anything is built or signed, unless:

- the run is on a `v*` tag; a `workflow_dispatch` run must also be started from the tag, not a branch;
- the tag without its `v` equals Maven's `project.version`;
- that version is not a SNAPSHOT;
- `CHANGELOG.md` has its `## [x.y.z] - YYYY-MM-DD` heading, whose section becomes the GitHub Release notes;
- the `ci.yml` run for the push of the tagged commit to `main` (build, tests, and the rendered accessibility checks) succeeded.

The checks are in `scripts/check-release-ready.ts`. The first four fail at once. For the last, push the tag after `main`'s CI succeeds; a tag pushed earlier makes the release wait, checking every 30 seconds for up to 60 minutes, and then build and publish once CI succeeds. The release fails if that CI run fails or is cancelled, if it is still running after 60 minutes, or if the commit still has no such run two minutes after the check starts, as when the tag is on a commit never pushed to `main`. CI runs on `main` one at a time and keeps only the newest waiting run, so pushing to `main` again while the tagged commit's run is still waiting for an earlier one cancels it, which also fails the release.

To fix a failed preflight on the tag, delete the tag, fix the commit on `main`, and tag again. When the tagged commit's CI failed for a reason unrelated to the commit, or was cancelled or timed out, re-run its failed jobs; once it succeeds, re-run the release workflow's failed jobs.
