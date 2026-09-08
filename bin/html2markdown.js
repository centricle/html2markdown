#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';

import { convert } from '../lib/convert.js';

const HELP = `html2markdown — HTML to GitHub-flavored Markdown.

Usage
  html2markdown <input.html> [options]
  html2markdown - [options]        read HTML from stdin

Options
  -o, --output <path>     write to a file (default: stdout)
  -h, --help              this text
  -v, --version           package version

Notes
  Reads a document or a fragment; both work. Script and style elements are
  dropped rather than emitted as text, and presentational markup is reduced
  to the text it wrapped.
`;

function version() {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  return pkg.version;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

async function readStdin() {
  let data = '';
  process.stdin.setEncoding('utf8');
  for await (const chunk of process.stdin) data += chunk;
  return data;
}

let parsed;
try {
  parsed = parseArgs({
    allowPositionals: true,
    options: {
      output: { type: 'string', short: 'o' },
      help: { type: 'boolean', short: 'h', default: false },
      version: { type: 'boolean', short: 'v', default: false },
    },
  });
} catch (error) {
  fail(`${error.message}\n\nhtml2markdown --help`);
}

const { values, positionals } = parsed;

if (values.help) {
  console.log(HELP);
  process.exit(0);
}

if (values.version) {
  console.log(version());
  process.exit(0);
}

if (positionals.length === 0) {
  fail('No input file.\n\nhtml2markdown --help');
}
if (positionals.length > 1) {
  fail(`Expected one input file, got ${positionals.length}: ${positionals.join(', ')}`);
}

const input = positionals[0];
const fromStdin = input === '-';

let html;
if (fromStdin) {
  html = await readStdin();
} else {
  try {
    html = readFileSync(resolve(input), 'utf8');
  } catch (error) {
    fail(error.code === 'ENOENT' ? `No such file: ${input}` : error.message);
  }
}

if (!html.trim()) {
  fail(fromStdin ? 'Nothing on stdin.' : `${input} is empty.`);
}

let markdown;
try {
  markdown = convert(html);
} catch (error) {
  fail(error.message);
}

/*
 * Markup that carries no text at all converts to nothing. That is a real
 * result rather than a failure, but exiting 0 with empty output would look
 * identical to success from a shell wrapper, so it is called out.
 */
if (!markdown) {
  fail('No text content in the input.');
}

if (values.output) {
  try {
    writeFileSync(resolve(values.output), `${markdown}\n`);
  } catch (error) {
    fail(error.message);
  }
} else {
  process.stdout.write(`${markdown}\n`);
}
