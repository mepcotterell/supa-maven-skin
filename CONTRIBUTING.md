# Contributing to Supa Maven Skin

The project's conventions (code style, the accessibility and documentation rules, and where code lives) are in [AGENTS.md](AGENTS.md).

## Building and Testing

```bash
# Fast frontend inner loop (ESLint, SCSS WCAG 2.2 AA/AAA contrast linter, Velocity linter, Docs version linter, Vitest, bundle size budget)
npm run lint && npm test && npm run build

# Full Maven build + Vitest unit tests + maven-invoker-plugin integration test + self-site render
mvn -B -ntp clean verify site

# Rendered-page WCAG 2.2 A/AA checks, plus AAA contrast on the modus palettes (axe-core +
# Playwright Chromium) on target/site/.
# Not part of npm test or mvn verify; needs the site built above and a one-time browser install.
npx playwright install chromium
npm run test:a11y

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
