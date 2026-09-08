/*
 * Shared test plumbing.
 *
 * Nothing here needs a browser, a network or any optional tool, so this suite
 * has no skip paths: every test runs on every machine.
 */

import { spawnSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const CLI = join(ROOT, 'bin', 'html2markdown.js');
export const FIXTURES = join(ROOT, 'test', 'fixtures');

/** A throwaway directory, cleaned up by the operating system. */
export function tempDir() {
  return mkdtempSync(join(tmpdir(), 'html2markdown-test-'));
}

/** Run the CLI. Never throws; the caller asserts on status and output. */
export function run(args, { env = {}, cwd = ROOT, input } = {}) {
  const result = spawnSync(process.execPath, [CLI, ...args], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, ...env },
    ...(input === undefined ? {} : { input }),
  });
  return { status: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}
