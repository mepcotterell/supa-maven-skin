#!/usr/bin/env node
/**
 * @fileoverview Release preflight for `.github/workflows/release.yml`. Before the release
 * workflow builds, signs, or publishes anything, it checks that the run is on a `v*` tag, that the
 * tag names Maven's `project.version`, that the version is not a SNAPSHOT, and that `CHANGELOG.md`
 * has the dated `## [x.y.z] - YYYY-MM-DD` heading the GitHub Release notes are cut from. Without
 * it, a mistyped tag published a Maven artifact under one version and a GitHub Release under
 * another, and a `workflow_dispatch` on a branch deployed to Maven Central with no GitHub Release.
 *
 * It then waits for the `ci.yml` push run on `main` for the exact tagged commit to succeed, so
 * the build, tests, and rendered accessibility checks pass before anything is published. Without
 * it, v0.1.6, v0.1.7, and v0.2.0 were each published minutes before their commit's CI finished.
 *
 * Usage (the workflow sets `POM_VERSION` from `mvn help:evaluate` and `GH_TOKEN` to its
 * `GITHUB_TOKEN`; Actions sets `GITHUB_REF`, `GITHUB_SHA`, and `GITHUB_REPOSITORY`):
 *   POM_VERSION=0.2.1 node --experimental-strip-types scripts/check-release-ready.ts
 */
import { execFile } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

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
 * How long the preflight waits for the tagged commit's CI run to finish: 60 minutes.
 *
 * CI on `main` usually takes 5 to 15 minutes, and 22 minutes is the slowest run seen, one that
 * queued behind the previous push's run (`ci.yml` lets one `main` run wait for another). Its own
 * job time limits allow at most 15 (build) + 25 (accessibility) + 10 (Pages deploy or SNAPSHOT
 * publish) = 50 minutes, so an hour also covers the slowest run CI allows plus 10 minutes of
 * runner queueing. A run still unfinished after that fails the release, which can be re-run once
 * CI is done; the preflight job's own time limit is just above this one.
 */
export const CI_WAIT_TIMEOUT_MS = 60 * 60 * 1000;

/** Time between run lookups: 120 lookups in an hour, far below the token's API rate limit. */
export const CI_POLL_INTERVAL_MS = 30 * 1000;

/**
 * How long to wait for a run to appear: GitHub creates a push's run within seconds, so a run
 * still missing after two minutes means the commit was never pushed to `main`.
 */
export const CI_MISSING_GRACE_MS = 2 * 60 * 1000;

/** One `ci.yml` workflow run, as the GitHub REST API reports it. */
export interface CiRun {
  /** The run's numeric ID. */
  id: number;
  /** The run's page on GitHub, for the log. */
  url: string;
  /** The commit the run built. */
  headSha: string;
  /** The branch the run was on, or null when it had none. */
  headBranch: string | null;
  /** The event that started the run, such as `push` or `pull_request`. */
  event: string;
  /** `queued`, `in_progress`, `completed`, and the like. */
  status: string;
  /** `success`, `failure`, `cancelled`, and the like once completed; otherwise null. */
  conclusion: string | null;
}

/** Lists the `ci.yml` runs for a commit SHA. */
export type CiRunLookup = (sha: string) => Promise<CiRun[]>;

/** How long to wait for CI, and the clock to wait with (injected by the tests). */
export interface CiWaitOptions {
  /** The full commit SHA the release builds. */
  sha: string;
  /** Lists the `ci.yml` runs for a commit. */
  lookup: CiRunLookup;
  /** Total time to wait for a run that has not finished; defaults to `CI_WAIT_TIMEOUT_MS`. */
  timeoutMs?: number;
  /** Time between lookups; defaults to `CI_POLL_INTERVAL_MS`. */
  intervalMs?: number;
  /** Time to wait for a run to appear; defaults to `CI_MISSING_GRACE_MS`. */
  missingGraceMs?: number;
  /** Waits the given number of milliseconds. */
  sleep?: (ms: number) => Promise<void>;
  /** Returns the current time in milliseconds. */
  now?: () => number;
  /** Writes a progress line. */
  log?: (message: string) => void;
}

/** Everything the full preflight checks. */
export interface ReleaseReadyOptions extends ReleaseMetadata, CiWaitOptions {}

/** The branch whose CI runs a release relies on; `ci.yml` runs on pushes to it. */
const CI_BRANCH = 'main';

/**
 * Waits the given time.
 *
 * @param ms - Milliseconds to wait.
 * @returns A promise that resolves after the wait.
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
}

/**
 * Formats a duration in whole minutes for messages.
 *
 * @param ms - The duration in milliseconds.
 * @returns The duration, such as `60 minutes`.
 */
function minutes(ms: number): string {
  const count = Math.round(ms / 60_000);
  return `${count} minute${count === 1 ? '' : 's'}`;
}

/**
 * Waits for the commit's `ci.yml` push run on `main` to succeed. Only a run for exactly this
 * commit counts: CI's build, tests, and rendered accessibility checks then cover the code the
 * release publishes. A run that is queued or running is polled until it finishes or the time
 * limit passes; a missing run is given a short grace period to appear. When the commit has more
 * than one such run, one success is enough, and a run still going is waited for.
 *
 * @param options - The commit, the run lookup, and the wait bounds.
 * @returns A failure message, or null when CI succeeded.
 */
export async function waitForCiSuccess(options: CiWaitOptions): Promise<string | null> {
  const {
    sha,
    lookup,
    timeoutMs = CI_WAIT_TIMEOUT_MS,
    intervalMs = CI_POLL_INTERVAL_MS,
    missingGraceMs = CI_MISSING_GRACE_MS,
    sleep = delay,
    now = Date.now,
    log = console.log
  } = options;

  if (!/^[0-9a-f]{40}$/.test(sha)) {
    return `"${sha}" is not a full commit SHA, so its CI run cannot be found.`;
  }

  const start = now();
  for (;;) {
    let runs: CiRun[];
    try {
      runs = (await lookup(sha)).filter(
        (candidate) =>
          candidate.headSha === sha && candidate.event === 'push' && candidate.headBranch === CI_BRANCH
      );
    } catch (error) {
      return `Could not list the ci.yml runs for ${sha}: ${error instanceof Error ? error.message : String(error)}`;
    }
    const elapsed = now() - start;

    const succeeded = runs.find((candidate) => candidate.status === 'completed' && candidate.conclusion === 'success');
    if (succeeded) {
      log(`CI run ${succeeded.url} for ${sha} succeeded.`);
      return null;
    }

    const pending = runs.find((candidate) => candidate.status !== 'completed');
    if (pending) {
      if (elapsed >= timeoutMs) {
        return (
          `CI run ${pending.url} for ${sha} is still ${pending.status} after ${minutes(timeoutMs)}. ` +
          "Re-run this workflow's failed jobs once it succeeds."
        );
      }
      log(`Waiting for CI run ${pending.url} for ${sha} (${pending.status}, ${minutes(elapsed)} so far).`);
      await sleep(Math.min(intervalMs, timeoutMs - elapsed));
      continue;
    }

    const failed = runs.reduce<CiRun | null>(
      (latest, candidate) => (latest === null || candidate.id > latest.id ? candidate : latest),
      null
    );
    if (failed) {
      return (
        `CI run ${failed.url} for ${sha} concluded "${failed.conclusion ?? 'unknown'}". Re-run its ` +
        "failed jobs and then this workflow's failed jobs, or fix main and tag a new commit."
      );
    }

    if (elapsed >= missingGraceMs) {
      return (
        `No ci.yml push run on ${CI_BRANCH} exists for ${sha} after ${minutes(missingGraceMs)}. ` +
        `Tag a commit after pushing it to ${CI_BRANCH}, or push it and re-run this workflow's failed jobs.`
      );
    }
    log(`No ci.yml push run on ${CI_BRANCH} for ${sha} yet; checking again.`);
    await sleep(Math.min(intervalMs, missingGraceMs - elapsed));
  }
}

/**
 * Runs every release check: the ref, version, and changelog first, and only when they pass, the
 * wait for the commit's CI, so a mistyped tag fails at once instead of after CI.
 *
 * @param options - The release metadata, commit, and run lookup.
 * @returns One message per failed check; empty when the release may proceed.
 */
export async function checkReleaseReady(options: ReleaseReadyOptions): Promise<string[]> {
  const errors = checkReleaseMetadata(options);
  if (errors.length > 0) {
    return errors;
  }
  const ciError = await waitForCiSuccess(options);
  return ciError === null ? [] : [ciError];
}

/** The fields of a GitHub REST API workflow run that the preflight reads. */
interface GitHubWorkflowRun {
  /** The run's numeric ID. */
  id: number;
  /** The run's page on GitHub. */
  html_url: string;
  /** The commit the run built. */
  head_sha: string;
  /** The branch the run was on. */
  head_branch: string | null;
  /** The event that started the run. */
  event: string;
  /** The run's status, such as `in_progress`. */
  status: string | null;
  /** The run's conclusion once completed. */
  conclusion: string | null;
}

/**
 * Creates a lookup that lists a commit's `ci.yml` push runs on `main` with `gh api`, which reads
 * the workflow's `GITHUB_TOKEN` from `GH_TOKEN` and needs only `actions: read`.
 *
 * @param repository - The `owner/name` of the repository.
 * @returns The lookup.
 */
function ghCiRunLookup(repository: string): CiRunLookup {
  return async (sha: string): Promise<CiRun[]> => {
    const { stdout } = await execFileAsync('gh', [
      'api',
      '--method',
      'GET',
      `repos/${repository}/actions/workflows/ci.yml/runs`,
      '-f',
      `head_sha=${sha}`,
      '-f',
      'event=push',
      '-f',
      `branch=${CI_BRANCH}`,
      '-f',
      'per_page=100'
    ]);
    const body = JSON.parse(stdout) as { workflow_runs?: GitHubWorkflowRun[] };
    return (body.workflow_runs ?? []).map((workflowRun) => ({
      id: workflowRun.id,
      url: workflowRun.html_url,
      headSha: workflowRun.head_sha,
      headBranch: workflowRun.head_branch,
      event: workflowRun.event,
      status: workflowRun.status ?? 'unknown',
      conclusion: workflowRun.conclusion
    }));
  };
}

/**
 * Runs the preflight on the checked-out commit and reports the result.
 *
 * @returns The process exit code: 0 when the release may proceed, 1 otherwise.
 */
async function main(): Promise<number> {
  const rootDir = resolve(import.meta.dirname, '..');
  const repository = process.env['GITHUB_REPOSITORY'] ?? '';
  const options: ReleaseReadyOptions = {
    ref: process.env['GITHUB_REF'] ?? '',
    pomVersion: (process.env['POM_VERSION'] ?? '').trim(),
    changelog: readFileSync(resolve(rootDir, 'CHANGELOG.md'), 'utf8'),
    sha: process.env['GITHUB_SHA'] ?? '',
    lookup: ghCiRunLookup(repository)
  };
  if (options.pomVersion === '') {
    console.error("Release preflight: POM_VERSION is not set; pass Maven's project.version.");
    return 1;
  }
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository)) {
    console.error('Release preflight: GITHUB_REPOSITORY is not set to owner/name.');
    return 1;
  }

  const errors = await checkReleaseReady(options);
  if (errors.length > 0) {
    for (const error of errors) {
      console.error(`Release preflight: ${error}`);
    }
    return 1;
  }
  console.log(
    `Release preflight: ${options.ref} matches project.version ${options.pomVersion} and its ` +
      `CHANGELOG.md heading, and CI succeeded for ${options.sha}.`
  );
  return 0;
}

// Run only as a script, not when the unit tests import the checks.
if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().then(
    (code) => process.exit(code),
    (error: unknown) => {
      console.error(error);
      process.exit(1);
    }
  );
}
