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
