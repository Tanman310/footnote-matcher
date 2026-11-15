/** @OnlyCurrentDoc */

/**
 * Footnote Matcher
 * Copies the formatting at the cursor/selection and applies it to every
 * footnote in the document. Behavior is defined in docs/SPEC.md.
 */

/** Key under which the saved style is stored in document properties. */
const STYLE_KEY = 'footnoteStyle';

/** Character-level attributes that are copied. */
const TEXT_ATTRIBUTES = ['FONT_FAMILY', 'FONT_SIZE', 'FOREGROUND_COLOR', 'BACKGROUND_COLOR'];

/** Paragraph-level attributes that are copied. */
const PARAGRAPH_ATTRIBUTES = [
  'LINE_SPACING',
  'SPACING_BEFORE',
  'SPACING_AFTER',
  'HORIZONTAL_ALIGNMENT',
  'INDENT_START',
  'INDENT_END',
  'INDENT_FIRST_LINE',
];

const HOW_TO_SET_STYLE =
  'Format one footnote the way you like, click inside it, then choose ' +
  '"Match all footnotes to selection".';

/**
 * Runs when the add-on is installed.
 * @param {Object} e The install event.
 */
function onInstall(e) {
  onOpen(e);
}

/**
 * Builds the add-on menu. May run in AuthMode.NONE, so it only builds the menu.
 * @param {Object} e The open event.
 */
function onOpen(e) {
  DocumentApp.getUi()
    .createAddonMenu()
    .addItem('Match all footnotes to selection', 'matchFootnotesToSelection')
    .addItem('Re-apply footnote style', 'reapplyFootnoteStyle')
    .addToUi();
}

/**
 * Menu item: reads the formatting at the cursor/selection, saves it as this
 * document's footnote style, and applies it to every footnote.
 */
function matchFootnotesToSelection() {
  runWithFriendlyErrors_(() => {
    const ui = DocumentApp.getUi();
    const doc = DocumentApp.getActiveDocument();

    const source = findSource_(doc);
    if (!source) {
      ui.alert(
        'Nothing to match',
        'Click inside the footnote you want to copy (or select some of its text), then try again. ' +
          'Images and other non-text items can\'t be used as the source.',
        ui.ButtonSet.OK
      );
      return;
    }

    const style = readStyle_(source);
    if (Object.keys(style).length === 0) {
      ui.alert(
        'No formatting found',
        'The text at your cursor only uses the document\'s default formatting, so there is ' +
          'nothing to copy. Set the font, size, or spacing on that footnote first, then try again.',
        ui.ButtonSet.OK
      );
      return;
    }

    PropertiesService.getDocumentProperties().setProperty(STYLE_KEY, JSON.stringify(style));
    applyAndReport_(doc, style, 'The style was saved, so you can use "Re-apply footnote style" once you add footnotes.');
  });
}

/**
 * Menu item: applies the saved footnote style again, for footnotes added
 * since the last match.
 */
function reapplyFootnoteStyle() {
  runWithFriendlyErrors_(() => {
    const ui = DocumentApp.getUi();
    const doc = DocumentApp.getActiveDocument();

    const style = loadStyle_();
    if (!style || Object.keys(style).length === 0) {
      ui.alert('No footnote style saved yet', HOW_TO_SET_STYLE, ui.ButtonSet.OK);
      return;
    }

    applyAndReport_(doc, style, '');
  });
}

/**
 * Runs a menu action and shows a short alert instead of a stack trace if it fails.
 * @param {function(): void} action The work to do.
 */
function runWithFriendlyErrors_(action) {
  try {
    action();
  } catch (err) {
    console.error(err);
    const ui = DocumentApp.getUi();
    ui.alert(
      'Footnote Matcher ran into a problem',
      'Nothing else was changed. Please try again.\n\nDetails: ' + (err && err.message ? err.message : err),
      ui.ButtonSet.OK
    );
  }
}

/**
 * Finds where to read formatting from: the start of the selection if there is
 * one, otherwise the cursor.
 * @param {DocumentApp.Document} doc The active document.
 * @return {?{paragraph: DocumentApp.Element, text: ?DocumentApp.Text, offset: ?number}}
 *     The source paragraph, its text (if any) and the character offset, or
 *     null if there is no usable cursor or selection.
 */
function findSource_(doc) {
  const selection = doc.getSelection();
  const rangeElements = selection ? selection.getRangeElements() : [];
  if (rangeElements.length > 0) {
    // Use the first selected piece that holds text. Images, lines, etc. are
    // skipped, so selecting only an image counts as "nothing to match".
    for (const rangeElement of rangeElements) {
      const offset = rangeElement.isPartial() ? rangeElement.getStartOffset() : null;
      const source = sourceFromElement_(rangeElement.getElement(), offset);
      if (source) return source;
    }
    return null;
  }

  const cursor = doc.getCursor();
  if (!cursor) return null;
  const element = cursor.getElement();
  if (!element) return null;
  if (element.getType() === DocumentApp.ElementType.TEXT) {
    // Like the Docs toolbar, read the character just before the cursor.
    const offset = cursor.getOffset();
    return sourceFromElement_(element, offset > 0 ? offset - 1 : null);
  }
  // Cursor in an empty paragraph, or next to a non-text element.
  return sourceFromElement_(element, null);
}

/**
 * Builds a source from one element: a piece of text, a paragraph/list item,
 * or a container such as a table cell (its first paragraph is used).
 * @param {DocumentApp.Element} element The element.
 * @param {?number} offset Character to read, or null for "first visible character".
 * @return {?{paragraph: DocumentApp.Element, text: ?DocumentApp.Text, offset: ?number}}
 *     The source, or null if the element holds no text (e.g. an image).
 */
function sourceFromElement_(element, offset) {
  if (!element) return null;
  const type = element.getType();

  if (type === DocumentApp.ElementType.TEXT) {
    const paragraph = findParagraph_(element);
    return paragraph ? { paragraph: paragraph, text: element.asText(), offset: offset } : null;
  }

  let paragraph = null;
  if (isParagraphLike_(element)) {
    paragraph = findParagraph_(element);
  } else if (
    type === DocumentApp.ElementType.TABLE ||
    type === DocumentApp.ElementType.TABLE_ROW ||
    type === DocumentApp.ElementType.TABLE_CELL
  ) {
    const found =
      element.findElement(DocumentApp.ElementType.PARAGRAPH) ||
      element.findElement(DocumentApp.ElementType.LIST_ITEM);
    if (found) paragraph = findParagraph_(found.getElement());
  }
  if (!paragraph) return null; // an image, horizontal rule, etc.

  const text = paragraph.editAsText();
  return { paragraph: paragraph, text: text.getText().length > 0 ? text : null, offset: null };
}

/**
 * Picks which character to read formatting from. A given offset is used as
 * is; otherwise the first non-space character, since the formatting of
 * spaces is invisible and often left over from older edits or Word imports.
 * @param {string} content The text.
 * @param {?number} offset The requested character, or null.
 * @return {number} A valid index into content (content must not be empty).
 */
function pickIndex_(content, offset) {
  const last = content.length - 1;
  if (offset !== null && offset !== undefined) return Math.min(Math.max(offset, 0), last);
  const firstVisible = content.search(/\S/);
  return firstVisible === -1 ? 0 : firstVisible;
}

/**
 * Tells whether an element is a paragraph or a list item.
 * @param {DocumentApp.Element} element The element to check.
 * @return {boolean} True for paragraphs and list items.
 */
function isParagraphLike_(element) {
  const type = element.getType();
  return type === DocumentApp.ElementType.PARAGRAPH || type === DocumentApp.ElementType.LIST_ITEM;
}

/**
 * Walks up from an element to the paragraph or list item that contains it.
 * @param {DocumentApp.Element} element The starting element.
 * @return {?DocumentApp.Element} The paragraph/list item, or null if none.
 */
function findParagraph_(element) {
  let current = element;
  while (current) {
    if (isParagraphLike_(current)) {
      return current.getType() === DocumentApp.ElementType.LIST_ITEM
        ? current.asListItem()
        : current.asParagraph();
    }
    current = current.getParent();
  }
  return null;
}

/**
 * Reads the copyable attributes from the source, skipping any that are null
 * (unset or mixed). The result is plain JSON-safe data.
 * @param {{paragraph: DocumentApp.Element, text: ?DocumentApp.Text, offset: ?number}} source
 *     Where to read from.
 * @return {Object} Attribute name → value, e.g. {FONT_SIZE: 9, HORIZONTAL_ALIGNMENT: 'JUSTIFY'}.
 */
function readStyle_(source) {
  const paragraphAttrs = source.paragraph.getAttributes() || {};

  // An empty paragraph has no text, so fall back to the paragraph's own attributes.
  let textAttrs = paragraphAttrs;
  let fromCharacter = false;
  if (source.text) {
    const content = source.text.getText();
    if (content.length > 0) {
      textAttrs = source.text.getAttributes(pickIndex_(content, source.offset)) || {};
      fromCharacter = true;
    }
  }

  // A blank text attribute means "inherited from the paragraph's named style"
  // (e.g. Normal text). Look up that inherited value so what you see is what
  // gets copied.
  const inherited = inheritedTextAttributes_(source.paragraph);
  const style = {};
  for (const name of TEXT_ATTRIBUTES) {
    // A link's color is link styling, not the footnote's text color.
    if (name === 'FOREGROUND_COLOR' && fromCharacter && textAttrs.LINK_URL) continue;
    let value = textAttrs[name];
    if (value === null || value === undefined) value = inherited[name];
    if (value !== null && value !== undefined) style[name] = value;
  }
  // A single character with no highlight really means "no highlight" (it
  // can't be mixed), so save that explicitly; applying it clears highlights.
  if (fromCharacter && !('BACKGROUND_COLOR' in style)) style.BACKGROUND_COLOR = null;
  for (const name of PARAGRAPH_ATTRIBUTES) {
    const value = paragraphAttrs[name];
    if (value === null || value === undefined) continue;
    // The alignment is an enum; store its name so it survives JSON.
    style[name] = name === 'HORIZONTAL_ALIGNMENT' ? String(value).toUpperCase() : value;
  }
  return style;
}

/**
 * Returns the text attributes a paragraph inherits from its named style
 * (Normal text, Heading 1, ...), as set in the document's styles.
 * @param {DocumentApp.Paragraph|DocumentApp.ListItem} paragraph The paragraph.
 * @return {Object} Attribute name → value; empty if it can't be determined.
 */
function inheritedTextAttributes_(paragraph) {
  try {
    const heading = paragraph.getHeading() || DocumentApp.ParagraphHeading.NORMAL;
    return DocumentApp.getActiveDocument().getBody().getHeadingAttributes(heading) || {};
  } catch (err) {
    console.error(err);
    return {};
  }
}

/**
 * Loads the saved style from document properties.
 * @return {?Object} The saved style, or null if none is saved or it can't be read.
 */
function loadStyle_() {
  const raw = PropertiesService.getDocumentProperties().getProperty(STYLE_KEY);
  if (!raw) return null;
  try {
    const style = JSON.parse(raw);
    return style && typeof style === 'object' ? style : null;
  } catch (err) {
    return null;
  }
}

/**
 * Applies a style to every footnote and tells the user if there were no
 * footnotes or if some could not be changed.
 * @param {DocumentApp.Document} doc The active document.
 * @param {Object} style The style to apply.
 * @param {string} noFootnotesNote Extra sentence for the "no footnotes" alert.
 */
function applyAndReport_(doc, style, noFootnotesNote) {
  const ui = DocumentApp.getUi();
  const result = applyStyleToFootnotes_(doc, style);

  if (result.footnotes === 0) {
    ui.alert(
      'No footnotes found',
      ('This document doesn\'t have any footnotes yet. ' + noFootnotesNote).trim(),
      ui.ButtonSet.OK
    );
    return;
  }
  if (result.failed > 0) {
    ui.alert(
      'Some footnotes were skipped',
      `${result.failed} footnote paragraph(s) could not be fully updated. The rest were changed.`,
      ui.ButtonSet.OK
    );
  }
}

/**
 * Applies a style to every paragraph (and list item) of every footnote.
 * Bold, italic, underline, strikethrough, links and headings are never touched.
 * @param {DocumentApp.Document} doc The active document.
 * @param {Object} style The style to apply.
 * @return {{footnotes: number, failed: number}} How many footnotes were found
 *     and how many paragraphs could not be fully updated.
 */
function applyStyleToFootnotes_(doc, style) {
  const footnotes = allFootnotes_(doc);
  let failed = 0;

  for (const footnote of footnotes) {
    const contents = footnote.getFootnoteContents();
    if (!contents) continue; // e.g. a footnote that only exists as a suggestion
    for (const paragraph of contents.getParagraphs()) {
      try {
        applyStyleToParagraph_(paragraph, style);
      } catch (err) {
        console.error(err);
        failed++;
      }
    }
  }
  return { footnotes: footnotes.length, failed: failed };
}

/**
 * Applies a style to one paragraph or list item using the specific setters,
 * so that nothing outside the style is changed.
 * @param {DocumentApp.Paragraph|DocumentApp.ListItem} paragraph The target.
 * @param {Object} style The style to apply.
 */
function applyStyleToParagraph_(paragraph, style) {
  const has = (name) => style[name] !== null && style[name] !== undefined;

  // Paragraph settings go in one call so the three indents are set together.
  // Only the keys listed here are touched; bold, italic, links etc. are left alone.
  const paragraphAttrs = {};
  for (const name of PARAGRAPH_ATTRIBUTES) {
    if (!has(name)) continue;
    if (name === 'HORIZONTAL_ALIGNMENT') {
      const alignment = DocumentApp.HorizontalAlignment[String(style[name]).toUpperCase()];
      if (alignment) paragraphAttrs[DocumentApp.Attribute.HORIZONTAL_ALIGNMENT] = alignment;
    } else {
      paragraphAttrs[DocumentApp.Attribute[name]] = Number(style[name]);
    }
  }
  if (Object.keys(paragraphAttrs).length > 0) paragraph.setAttributes(paragraphAttrs);

  const text = paragraph.editAsText();
  if (text.getText().length === 0) return; // nothing to color or resize
  if (has('FONT_FAMILY')) text.setFontFamily(String(style.FONT_FAMILY));
  if (has('FONT_SIZE')) text.setFontSize(Number(style.FONT_SIZE));
  if (has('FOREGROUND_COLOR')) setColorExceptLinks_(text, String(style.FOREGROUND_COLOR));
  if (has('BACKGROUND_COLOR')) {
    text.setBackgroundColor(String(style.BACKGROUND_COLOR));
  } else if ('BACKGROUND_COLOR' in style) {
    text.setBackgroundColor(null); // source had no highlight: remove highlights
  }
}

/**
 * Sets the text color of a paragraph's text, skipping linked text so links
 * keep their own color (usually blue).
 * @param {DocumentApp.Text} text The paragraph's text.
 * @param {string} color The color, e.g. '#000000'.
 */
function setColorExceptLinks_(text, color) {
  const length = text.getText().length;
  const starts = text.getTextAttributeIndices();
  for (let i = 0; i < starts.length; i++) {
    const start = starts[i];
    const end = (i + 1 < starts.length ? starts[i + 1] : length) - 1;
    if (end < start) continue;
    if (!text.getLinkUrl(start)) text.setForegroundColor(start, end, color);
  }
}

/**
 * Collects the footnotes from every tab of the document, including nested
 * tabs. Document.getFootnotes() alone only covers the tab you are in.
 * @param {DocumentApp.Document} doc The active document.
 * @return {DocumentApp.Footnote[]} All footnotes, tab by tab.
 */
function allFootnotes_(doc) {
  if (typeof doc.getTabs !== 'function') return doc.getFootnotes() || [];
  const footnotes = [];
  const visit = (tabs) => {
    for (const tab of tabs) {
      if (tab.getType() === DocumentApp.TabType.DOCUMENT_TAB) {
        footnotes.push(...(tab.asDocumentTab().getFootnotes() || []));
      }
      visit(tab.getChildTabs());
    }
  };
  visit(doc.getTabs());
  return footnotes;
}
