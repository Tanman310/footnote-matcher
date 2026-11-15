# Footnote Matcher — Specification

## Purpose

A free, open-source Google Docs editor add-on that does one thing: **copy the formatting of one piece of text (usually a footnote you've already styled) and apply it to every footnote in the document.**

It is a focused rewrite of [Footnote Style](https://github.com/davidrthorn/footnote-style) by David Thorn (MIT), which is no longer available on the Google Workspace Marketplace. The original source is kept in `reference/original-code.gs` for comparison only; it is not deployed.

## User-facing behavior

The add-on adds one menu under **Extensions → Footnote Matcher**:

| Menu item | What it does |
|---|---|
| **Match all footnotes to selection** | Reads the formatting where the cursor is (or at the start of the selection), applies it to every footnote paragraph, and saves it as this document's footnote style. |
| **Re-apply footnote style** | Applies the saved style again, for footnotes added since the last match. If no style is saved yet, shows a short alert explaining how to set one. |

### Typical use

1. Format one footnote the way you want it (font, size, spacing, and so on).
2. Put the cursor in that footnote, or triple-click to select the whole paragraph (needed for paragraph settings like alignment and indents).
3. Choose **Match all footnotes to selection**.
4. After adding more footnotes later, choose **Re-apply footnote style**.

## What gets copied

**Text attributes** (read at the cursor/selection start):
- `FONT_FAMILY`
- `FONT_SIZE`
- `FOREGROUND_COLOR`
- `BACKGROUND_COLOR` (highlight)

**Paragraph attributes** (read from the containing paragraph):
- `LINE_SPACING`
- `SPACING_BEFORE`
- `SPACING_AFTER`
- `HORIZONTAL_ALIGNMENT`
- `INDENT_START`, `INDENT_END`, `INDENT_FIRST_LINE`

**Never copied or changed**, so emphasis inside footnotes (italicized titles, links in citations) survives:
- `BOLD`, `ITALIC`, `UNDERLINE`, `STRIKETHROUGH`, `LINK_URL`
- The text color of linked text, so links keep their own color (usually blue). If the source character is itself a link, its color isn't copied.
- `HEADING`

A text attribute that comes back `null` at the source character is *inherited* (not set on the text itself), so the value from the paragraph's named style (e.g. Normal text, via `Body.getHeadingAttributes`) is used instead. This matters for documents imported from Word, where the visible font often comes from Normal text. Anything still `null` after that is skipped, not written as `null`, with one exception: when the source character has no highlight, `BACKGROUND_COLOR` is saved as `null` and applying it removes highlights from the footnotes.

## Edge cases to handle

- **No cursor and no selection** → friendly alert, no changes.
- **Cursor in an empty paragraph** → the cursor's element is a `Paragraph`, not `Text`; read paragraph attributes and whatever text attributes are available without crashing.
- **Selection made of whole elements** (not partial) → use the first element; it may be a `Paragraph` or `ListItem` with no text child.
- **Document has no footnotes** → alert ("No footnotes found"), but still save the style.
- **Footnote paragraphs that are list items** → apply the same attributes.

## Scope and permissions

- Only touches the open document: `@OnlyCurrentDoc` / `documents.currentonly` scope, plus `script.container.ui` for the menu and alerts.
- Stores the saved style in `PropertiesService.getDocumentProperties()` as a single JSON string (key: `footnoteStyle`).
- No network calls, no analytics, no user data leaves the document.

## Out of scope (for now)

- Per-user default styles across documents (the original's "Use as default" / "Restore default").
- Styling the footnote reference numbers in the body text.
- Automatically re-applying when footnotes are added (Apps Script has no edit trigger for Docs).
- A sidebar or settings UI.

## Known problems in the original code (don't carry these over)

- `updateFootnotes()` reads document properties *before* copying in user defaults, so defaults don't apply until the second run.
- Uses `eval()` to build the alignment enum; use a lookup on `DocumentApp.HorizontalAlignment` instead.
- Iterates arrays with `for...in`.
- Crashes when there's no cursor or selection (`cursor.getElement()` on `null`).
- Crashes when the cursor is in an empty paragraph (`asText()` on a `Paragraph`).
- Stores each attribute as a separate string property with a `_fs` suffix; numbers come back as strings.

## Acceptance checklist (manual, in a test document)

- [ ] Menu appears under Extensions after the add-on is installed/test-deployed.
- [ ] Style a footnote (e.g., Georgia 9pt, 1.0 spacing, 0pt after), place cursor in it, run Match → all footnotes match.
- [ ] Italic words and links inside other footnotes are unchanged.
- [ ] Triple-click a footnote with justified alignment, run Match → all footnotes justified.
- [ ] Add a new footnote, run Re-apply → it matches.
- [ ] Run Re-apply in a fresh doc with no saved style → helpful alert.
- [ ] Run Match with nothing selected and the cursor outside the document body → helpful alert, no error.
- [ ] Run in a document with zero footnotes → helpful alert.
- [ ] Works with 100+ footnotes in reasonable time (under ~30 seconds).
