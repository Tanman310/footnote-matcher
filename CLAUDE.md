# CLAUDE.md

Guidance for Claude Code working in this repository.

## What this is

**Footnote Matcher**: a Google Docs editor add-on, written in Google Apps Script, that copies the formatting at the cursor/selection and applies it to every footnote in the document. Free and open source (MIT).

**The full spec is in `docs/SPEC.md`. Read it before writing code.** It defines the menu items, which attributes are copied, which are deliberately ignored, edge cases, and the manual acceptance checklist.

## About the maintainer

The maintainer is a teacher, not a professional developer. When you finish a task:
- Explain what changed in plain language.
- Give exact steps to test it in Google Docs.
- Ask before adding dependencies, build steps, or features beyond the spec.

## Repository layout

```
src/                  ← everything here is pushed to Apps Script by clasp
  appsscript.json     ← manifest (scopes, runtime)
  Code.js             ← add-on code (to be written)
reference/
  original-code.gs    ← original Footnote Style source (MIT). Reference only. Never push or deploy it.
test/
  footnote-matcher-test-100.docx ← 100-footnote test document (import into Google Docs)
.github/              ← issue and pull request templates
CONTRIBUTING.md       ← contributor setup, scope, conventions (keep in sync with this file)
docs/
  SPEC.md             ← behavior spec and acceptance checklist
.clasp.json.example   ← template; the real .clasp.json is gitignored
```

## Code conventions

- Apps Script **V8 runtime**: use `const`/`let`, arrow functions, `for...of`, template literals. No `eval`.
- Plain Apps Script only. No TypeScript, bundler, or npm dependencies unless the maintainer agrees.
- Keep `/** @OnlyCurrentDoc */` at the top of `Code.js`, and keep scopes in `appsscript.json` to `documents.currentonly` and `script.container.ui`.
- Required entry points: `onInstall(e)` calls `onOpen(e)`; `onOpen(e)` builds the menu with `DocumentApp.getUi().createAddonMenu()`. `onOpen` may run in `AuthMode.NONE`, so it must only build the menu and never touch document content or properties.
- Every function a menu item calls must catch errors and show a short, friendly `ui.alert()` rather than an Apps Script stack trace.
- Store the saved style as one JSON string in document properties under the key `footnoteStyle`.
- Short JSDoc comment on each function.

## Workflow

Apps Script code can't run locally. The loop is: edit `src/`, then `clasp push`, then refresh the test Google Doc.

```bash
npx @google/clasp login        # once per machine; opens a browser
npx @google/clasp push         # upload src/ to the Apps Script project
npx @google/clasp open-script  # open the project in the browser (clasp 3.x)
```

- `.clasp.json` holds the script ID and `"rootDir": "src"`. It's gitignored. Copy `.clasp.json.example` and fill in the ID if it's missing.
- **Never commit `.clasprc.json`** or anything else containing credentials.
- Testing happens in Google Docs via **Deploy → Test deployments → Editor add-on** with a dedicated test document, using the checklist in `docs/SPEC.md`.
- If `clasp push` asks to overwrite the manifest, the answer is yes. `src/appsscript.json` is the source of truth.

## Git

- Small, focused commits with clear messages.
- Work on a branch and open a pull request for anything beyond a trivial fix.
- Update `README.md` when user-facing behavior changes.
