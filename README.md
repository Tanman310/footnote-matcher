# Footnote Matcher

A free, open-source Google Docs add-on that makes all your footnotes look the same. Format one footnote the way you want it, then apply that formatting to every footnote in the document in one click.

> **Status:** in development. Not yet on the Google Workspace Marketplace.

## How it works

1. Format one footnote the way you want it: font, size, color, line spacing, alignment, indents.
2. Put your cursor in that footnote. For paragraph settings like alignment and indents, triple-click to select the whole footnote paragraph.
3. Go to **Extensions → Footnote Matcher → Match all footnotes to selection**.
4. When you add more footnotes later, use **Extensions → Footnote Matcher → Re-apply footnote style**.

Bold, italics, underline, strikethrough, and links are **never** changed, so italicized titles and linked citations inside your footnotes stay as they are. Links also keep their own color.

## Privacy

Footnote Matcher only works on the document you have open. It doesn't send your data anywhere and doesn't collect analytics. The saved style lives in the document itself.

## Credits

A focused rewrite of [Footnote Style](https://github.com/davidrthorn/footnote-style) by David Thorn, used under the MIT License.

## Contributing / development

See [`docs/SPEC.md`](docs/SPEC.md) for the behavior spec and [`CLAUDE.md`](CLAUDE.md) for development setup (Google Apps Script + [clasp](https://github.com/google/clasp)).

## License

[MIT](LICENSE)
