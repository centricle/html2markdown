import test from 'node:test';
import assert from 'node:assert/strict';

import { convert } from '../lib/convert.js';

/*
 * The three cases below are the ones the pandoc pipeline this replaces had to
 * be patched for. They are regression tests against a tool that no longer
 * runs, which is the point: the bugs were in the output, not in pandoc, and
 * any replacement can reintroduce them.
 */

test('a code block after a list is fenced, not indented and wedged apart', () => {
  const markdown = convert('<ul><li>one</li></ul><pre><code>npm test</code></pre>');
  assert.equal(markdown, '- one\n\n```\nnpm test\n```');
  assert.doesNotMatch(markdown, /&nbsp;/);
});

test('a dollar amount is not escaped as TeX math', () => {
  assert.match(convert('<p>It costs $15/mo, up from $9.</p>'), /\$15\/mo, up from \$9/);
});

test('presentational span soup is reduced to its text', () => {
  assert.equal(convert('<div><span style="color:#a31515">const</span> <span>x</span></div>'), 'const x');
});

/* Turndown keeps text nodes by default, and the contents of these elements
 * are text nodes, so without an explicit removal a stylesheet becomes prose. */
test('script and style contents are dropped rather than emitted as text', () => {
  const markdown = convert('<style>.a{color:red}</style><p>keep</p><script>alert(1)</script>');
  assert.equal(markdown, 'keep');
});

test('bullets are one space, not the three turndown defaults to', () => {
  assert.equal(convert('<ul><li>a</li><li>b</li></ul>'), '- a\n- b');
});

test('nested lists indent by the width of the parent marker', () => {
  assert.equal(convert('<ul><li>a<ul><li>b</li></ul></li></ul>'), '- a\n  - b');
  /* Two spaces under `1.` is not a nested list in CommonMark; GitHub flattens it. */
  assert.equal(
    convert('<ol><li>one<ol><li>nested<ol><li>deep</li></ol></li></ol></li><li>two</li></ol>'),
    '1. one\n   1. nested\n      1. deep\n2. two',
  );
  assert.equal(
    convert('<ol start="9"><li>nine<ul><li>x</li></ul></li><li>ten<ul><li>y</li></ul></li></ol>'),
    '9. nine\n   - x\n10. ten\n    - y',
  );
});

test('an ordered list honors its start attribute', () => {
  assert.equal(convert('<ol start="3"><li>three</li><li>four</li></ol>'), '3. three\n4. four');
  assert.equal(convert('<ol start="0"><li>zero</li><li>one</li></ol>'), '0. zero\n1. one');
  /* Negative and non-numeric starts are not valid Markdown; fall back to 1. */
  assert.equal(convert('<ol start="-3"><li>a</li><li>b</li></ol>'), '1. a\n2. b');
  assert.equal(convert('<ol start="x"><li>a</li></ol>'), '1. a');
});

test('a loose list item has empty blank lines, not runs of spaces', () => {
  const markdown = convert('<ul><li><p>para one</p><p>para two</p></li><li><p>second</p></li></ul>');
  assert.equal(markdown, '- para one\n\n  para two\n- second');
  assert.doesNotMatch(markdown, /^[ \t]+$/m);
});

/* Single-tilde strikethrough is valid GFM but not universally recognized. */
test('strikethrough is doubled for wider renderer support', () => {
  assert.equal(convert('<p><del>gone</del> and <s>also</s></p>'), '~~gone~~ and ~~also~~');
});

test('a code language class survives onto the fence', () => {
  assert.equal(convert('<pre><code class="language-js">const a = 1;</code></pre>'), '```js\nconst a = 1;\n```');
});

test('a table becomes a GFM table', () => {
  const markdown = convert('<table><thead><tr><th>A</th></tr></thead><tbody><tr><td>1</td></tr></tbody></table>');
  assert.match(markdown, /\| A \|/);
  assert.match(markdown, /\| 1 \|/);
});

test('links and emphasis survive', () => {
  assert.equal(
    convert('<p><a href="https://e.example">x</a> <em>i</em> <strong>b</strong></p>'),
    '[x](https://e.example) *i* **b**',
  );
});

test('headings use atx', () => {
  assert.equal(convert('<h1>One</h1><h3>Three</h3>'), '# One\n\n### Three');
});

test('runs of blank lines are collapsed', () => {
  assert.doesNotMatch(convert('<p>a</p><div></div><div></div><p>b</p>'), /\n{3}/);
});

test('blank lines inside a fenced code block are content and are kept', () => {
  assert.equal(convert('<pre><code>a\n\n\n\nb</code></pre>'), '```\na\n\n\n\nb\n```');
  assert.equal(
    convert('<ul><li>a<pre><code>x\n\n\ny</code></pre></li></ul>'),
    '- a\n\n  ```\n  x\n\n\n  y\n  ```',
  );
});

test('markup carrying no text converts to nothing', () => {
  assert.equal(convert('<style>.a{}</style>'), '');
});
