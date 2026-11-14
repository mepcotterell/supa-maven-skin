#!/usr/bin/env node
/**
 * @fileoverview Release preflight for `.github/workflows/release.yml`. Before the release
 * workflow builds, signs, or publishes anything, it checks that the run is on a `v*` tag, that the
 * tag names Maven's `project.version`, that the version is not a SNAPSHOT, and that `CHANGELOG.md`
 * has the dated `## [x.y.z] - YYYY-MM-DD` heading the GitHub Release notes are cut from. Without
 * it, a mistyped tag published a Maven artifact under one version and a GitHub Release under
 * another, and a `workflow_dispatch` on a branch deployed to Maven Central with no GitHub Release.
 *
 * Usage (the workflow sets `POM_VERSION` from `mvn help:evaluate`; Actions sets `GITHUB_REF`):
 *   POM_VERSION=0.2.1 node --experimental-strip-types scripts/check-release-ready.ts
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

/** What the preflight compares before a release publishes anything. */
export interface ReleaseMetadata {
  /** The full Git ref the workflow runs on, such as `refs/tags/v0.2.1`. */
  ref: string;
  /** Maven's `project.version` for the checked-out commit. */
  pomVersion: string;
  /** The text of `CHANGELOG.md` at the checked-out commit. */
  changelog: string;
}

/** Prefix of the refs a release may run on; `release.yml` triggers on `v*` tags. */
const TAG_REF_PREFIX = 'refs/tags/v';

/**
 * Returns the version a release ref names: `0.2.1` for `refs/tags/v0.2.1`.
 *
 * The full ref is compared rather than the short name, so a branch named `v0.2.1` (a
 * `workflow_dispatch` run on it has the short name `v0.2.1` too) is not taken for a tag.
 *
 * @param ref - The full Git ref, such as `refs/tags/v0.2.1` or `refs/heads/main`.
 * @returns The version after the `v`, or null when the ref is not a `v*` tag.
 */
export function releaseVersionFromRef(ref: string): string | null {
  if (!ref.startsWith(TAG_REF_PREFIX)) {
    return null;
  }
  const version = ref.slice(TAG_REF_PREFIX.length);
  return version === '' ? null : version;
}

/**
 * Escapes a string for literal use inside a regular expression.
 *
 * @param text - The text to match literally.
 * @returns The text with every regular expression metacharacter escaped.
 */
function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Checks the ref, version, and changelog of a release. Every failed check is reported, so one
 * run lists everything to fix.
 *
 * @param metadata - The ref, POM version, and changelog text to compare.
 * @returns One message per failed check; empty when the release may proceed.
 */
export function checkReleaseMetadata(metadata: ReleaseMetadata): string[] {
  const errors: string[] = [];
  const { ref, pomVersion, changelog } = metadata;
  const tagVersion = releaseVersionFromRef(ref);

  if (tagVersion === null) {
    errors.push(
      `Releases run only on a v* tag, but this run is on "${ref || '(no ref)'}". ` +
        'Push a vX.Y.Z tag, or start workflow_dispatch from a v* tag rather than a branch.'
    );
  } else if (tagVersion !== pomVersion) {
    errors.push(
      `Tag v${tagVersion} does not match project.version ${pomVersion} in pom.xml. ` +
        `Tag the commit whose pom.xml has <version>${tagVersion}</version>.`
    );
  }

  if (pomVersion.endsWith('-SNAPSHOT')) {
    errors.push(
      `project.version ${pomVersion} is a SNAPSHOT. A release commit sets <version> without ` +
        '-SNAPSHOT; CI publishes SNAPSHOTs from main.'
    );
  }

  if (tagVersion !== null) {
    const heading = new RegExp(`^## \\[${escapeRegExp(tagVersion)}\\] - \\d{4}-\\d{2}-\\d{2}[ \\t]*$`, 'm');
    if (!heading.test(changelog)) {
      errors.push(
        `CHANGELOG.md has no "## [${tagVersion}] - YYYY-MM-DD" heading. Move the [Unreleased] ` +
          'entries under a dated heading for this version; the GitHub Release notes come from it.'
      );
    }
  }

  return errors;
}

/**
 * Runs the preflight on the checked-out commit and reports the result.
 *
 * @returns The process exit code: 0 when the release may proceed, 1 otherwise.
 */
function main(): number {
  const rootDir = resolve(import.meta.dirname, '..');
  const metadata: ReleaseMetadata = {
    ref: process.env['GITHUB_REF'] ?? '',
    pomVersion: (process.env['POM_VERSION'] ?? '').trim(),
    changelog: readFileSync(resolve(rootDir, 'CHANGELOG.md'), 'utf8')
  };
  if (metadata.pomVersion === '') {
    console.error('Release preflight: POM_VERSION is not set; pass Maven\'s project.version.');
    return 1;
  }

  const errors = checkReleaseMetadata(metadata);
  if (errors.length > 0) {
    for (const error of errors) {
      console.error(`Release preflight: ${error}`);
    }
    return 1;
  }
  console.log(`Release preflight: ${metadata.ref} matches project.version ${metadata.pomVersion} and its CHANGELOG.md heading.`);
  return 0;
}

// Run only as a script, not when the unit tests import the checks.
if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(main());
}
