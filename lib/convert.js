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
 */
function tightLists(service) {
  service.addRule('tightListItem', {
    filter: 'li',
    replacement(content, node) {
      const body = content
        .replace(/^\n+/, '')
        .replace(/\n+$/, '\n')
        .replace(/\n/gm, '\n  ');

      const parent = node.parentNode;
      let prefix = `${service.options.bulletListMarker} `;
      if (parent.nodeName === 'OL') {
        const start = Number(parent.getAttribute('start'));
        const index = Array.prototype.indexOf.call(parent.children, node);
        prefix = `${(Number.isFinite(start) && start ? start : 1) + index}. `;
      }

      const trailing = node.nextSibling && !/\n$/.test(body) ? '\n' : '';
      return prefix + body + trailing;
    },
  });
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
  return createService().turndown(html).replace(/\n{3,}/g, '\n\n').trim();
}
