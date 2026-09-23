/*
 * HTML to GitHub-flavored Markdown.
 *
 * This replaces a pandoc invocation that lived in a shell script for years.
 * Pandoc did the job well; it is simply not a dependency a published package
 * can ask for. "First, brew install pandoc" is where people stop reading.
 *
 * Each flag that pandoc call had accumulated is accounted for here, because
 * every one of them was paid for with a real bug:
 *
 *   fence.lua filter      An attribute-less <pre> became an *indented* code
 *                         block, which cannot follow a list without being
 *                         swallowed by it, so pandoc wedged a literal &nbsp;
 *                         line between them. Turndown fences unconditionally
 *                         when told to, so the filter is now one option.
 *   -raw_html             Dropped leftover <span style=…> soup. Turndown does
 *                         this by default, keeping the text and losing the tag.
 *   -tex_math_dollars     gfm has it on by default, so a copied price table
 *                         came out as \$15. Turndown has no TeX handling at
 *                         all, so the problem does not exist here.
 *   --wrap=none           Turndown never wraps.
 *
 * What pandoc got right for free and turndown does not: script and style
 * element *contents* are text nodes, so without an explicit removal their
 * source lands in the output as prose.
 */

import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';

/*
 * Turndown's own list rule writes `-   item`, three spaces, and indents
 * nested lists by four. It is valid and it is ugly, and it does not match
 * what the pandoc pipeline emitted or what anyone writes by hand.
 *
 * Continuation lines are indented by the width of the marker, which is what
 * CommonMark requires: `- ` is two columns, `1. ` is three, `10. ` is four.
 * A fixed two-space indent under a numbered item is not a nested list, so
 * GitHub flattened every nested ordered list into its parent.
 */
function tightLists(service) {
  service.addRule('tightListItem', {
    filter: 'li',
    replacement(content, node) {
      const parent = node.parentNode;
      let prefix = `${service.options.bulletListMarker} `;
      if (parent.nodeName === 'OL') {
        /* CommonMark allows a start of 0 but not a negative one. */
        const start = parent.getAttribute('start');
        const first = /^\d+$/.test(start) ? Number(start) : 1;
        const index = Array.prototype.indexOf.call(parent.children, node);
        prefix = `${first + index}. `;
      }

      /* Blank lines inside a loose item stay empty rather than becoming
       * marker-width runs of spaces. */
      const indent = ' '.repeat(prefix.length);
      const body = content
        .replace(/^\n+/, '')
        .replace(/\n+$/, '\n')
        .replace(/\n(?=[^\n])/g, `\n${indent}`);

      const trailing = node.nextSibling && !/\n$/.test(body) ? '\n' : '';
      return prefix + body + trailing;
    },
  });
}

/*
 * Turndown separates blocks with blank lines and can leave three or more in a
 * row where the source had empty elements. Collapsing them is right for prose
 * and wrong inside a fenced code block, where the blank lines are content.
 */
function collapseBlankLines(markdown) {
  const out = [];
  let fence = null;
  let blanks = 0;
  for (const line of markdown.split('\n')) {
    const marker = line.match(/^\s*(`{3,}|~{3,})/)?.[1];
    if (fence) {
      out.push(line);
      if (marker && marker[0] === fence[0] && marker.length >= fence.length && line.trim() === marker) {
        fence = null;
      }
      continue;
    }
    if (marker) {
      fence = marker;
      blanks = 0;
      out.push(line);
      continue;
    }
    blanks = line === '' ? blanks + 1 : 0;
    if (blanks <= 1) out.push(line);
  }
  return out.join('\n');
}

/*
 * The gfm plugin emits a single tilde. GitHub accepts it, but enough
 * renderers only recognize the doubled form that the narrower spelling is not
 * worth the compatibility it costs.
 */
function doubledStrikethrough(service) {
  service.addRule('doubleStrikethrough', {
    filter: ['del', 's'],
    replacement: (content) => (content.trim() ? `~~${content}~~` : ''),
  });
}

export function createService() {
  const service = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
    emDelimiter: '*',
    strongDelimiter: '**',
    linkStyle: 'inlined',
    hr: '---',
  });

  service.use(gfm);

  /* Their text nodes are code, not content. Turndown keeps text by default,
   * so a stylesheet in the source becomes a paragraph in the output. */
  service.remove(['script', 'style', 'noscript']);

  tightLists(service);
  doubledStrikethrough(service);

  return service;
}

/**
 * Convert an HTML string to Markdown.
 *
 * @returns {string} Markdown, with no trailing newline
 */
export function convert(html) {
  return collapseBlankLines(createService().turndown(html)).trim();
}
