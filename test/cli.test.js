import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { FIXTURES, run, tempDir } from './helpers.js';

const SAMPLE = join(FIXTURES, 'sample.html');

test('--help exits clean', () => {
  const result = run(['--help']);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Usage/);
});

test('--version prints a bare version', () => {
  const result = run(['--version']);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout.trim(), /^\d+\.\d+\.\d+$/);
});

test('no input is an error naming the help flag', () => {
  const result = run([]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /No input file/);
});

test('a missing file names the file', () => {
  const result = run(['nope.html']);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /No such file: nope\.html/);
});

test('empty stdin is an error rather than an empty document', () => {
  const result = run(['-'], { input: '' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Nothing on stdin/);
});

/* A shell wrapper that only checks the exit status cannot tell empty output
 * from success, so text-free markup fails loudly instead. */
test('markup with no text content fails rather than exiting empty', () => {
  const result = run(['-'], { input: '<style>.a{}</style>' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /No text content/);
});

test('stdin converts to stdout', () => {
  const result = run(['-'], { input: '<h1>Hi</h1>' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, '# Hi\n');
});

test('the sample page converts without leaking script or style source', () => {
  const result = run([SAMPLE]);
  assert.equal(result.status, 0, result.stderr);
  assert.doesNotMatch(result.stdout, /track\(/);
  assert.doesNotMatch(result.stdout, /color: #333/);
  assert.match(result.stdout, /# Rocket Sled Deployment Notes/);
  assert.match(result.stdout, /\$15\/mo/);
  assert.match(result.stdout, /```sh/);
});

test('--output writes to a file and leaves stdout empty', () => {
  const path = join(tempDir(), 'out.md');
  const result = run(['--output', path, SAMPLE]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, '');
  assert.match(readFileSync(path, 'utf8'), /# Rocket Sled Deployment Notes/);
});
