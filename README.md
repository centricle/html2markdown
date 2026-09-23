# html2markdown

HTML in, GitHub-flavored Markdown out.

```
npx @centricle/html2markdown page.html
```

## Install

```
npm install -g @centricle/html2markdown
```

Or run it without installing, with `npx @centricle/html2markdown`. To work
from a checkout instead:

```
git clone https://github.com/centricle/html2markdown.git
cd html2markdown && npm install && npm link
```

## Why another one

**No pandoc.** This began as a shell script that shelled out to pandoc, which
did the job well and is not a dependency a small tool can ask for. Every flag
that invocation had accumulated is either an option here or a problem that no
longer exists.

**Script and style contents do not become prose.** Their text nodes survive a
naive conversion and land in the output as paragraphs, which is the kind of
bug you only find after pasting a stylesheet into a document.

## Usage

```
html2markdown <input.html> [options]
html2markdown - [options]        read HTML from stdin

Options
  -o, --output <path>     write to a file (default: stdout)
  -h, --help              this text
  -v, --version           package version
```

A whole document or a bare fragment both work.

```
html2markdown page.html > page.md
curl -s https://example.com | html2markdown -
```

Installed as both `html2markdown` and `html2md`.

## What it does

Headings become ATX. Code blocks are always fenced, and a `language-*` class
survives onto the fence. Lists use a single space after the marker and indent
by two. Tables and task lists convert as GFM. Strikethrough is written
doubled, `~~like this~~`, because the single-tilde form is valid GFM but not
universally recognized.

Presentational markup is reduced to the text it wrapped, so a syntax-colored
`<span style="color:#a31515">` stack becomes the code it was coloring.
`<script>`, `<style>` and `<noscript>` are removed outright.

Input that carries no text at all is an error rather than empty output, since
a wrapper checking only the exit status cannot tell those apart.

## The bugs this inherited

Three fixes were carried over from the pandoc pipeline. They are tested here,
against a tool that no longer runs, because the bugs were in the output rather
than in pandoc, and any replacement can reintroduce them.

**A code block after a list.** An attribute-less `<pre>` became an *indented*
code block, which cannot follow a list without being absorbed into it. Pandoc
worked around that by inserting a literal `&nbsp;` line between the two, which
is what you got pasting a Stack Overflow answer. Fencing unconditionally makes
the whole problem disappear.

**Dollar signs.** GFM output has TeX math on by default, so a copied pricing
table arrived as `\$15`. There is no TeX handling here at all.

**Style attribute soup.** Copying from a code editor puts an HTML flavor on the
clipboard that is the syntax highlighting, not the document.

## Requirements

Node 20 or newer. Nothing else.

## Development

```
npm test
```

No browser, no network, no optional tooling, so every test runs everywhere and
none of them skip.

Bugs and ideas: [github.com/centricle/html2markdown/issues](https://github.com/centricle/html2markdown/issues).

## License

MIT
