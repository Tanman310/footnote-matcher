# Contributing to Footnote Matcher

Thanks for your interest in helping. Footnote Matcher is a small, volunteer-maintained project. Bug reports, testing, documentation fixes, and code are all welcome.

By taking part, you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Scope

Footnote Matcher does **one thing**: copy the formatting of one piece of text and apply it to every footnote in a Google Doc. The behavior is defined in [`docs/SPEC.md`](docs/SPEC.md).

The project stays small on purpose, so it's easy to trust, review, and maintain. Before you start work on a new feature, please open a **feature request** issue so we can agree it fits. Pull requests that add features without a prior discussion may be closed.

## Reporting bugs

Open an issue using the **Bug report** template. Include:

- what you did, what you expected, and what happened
- a link to a Google Doc that shows the problem (shared as "Anyone with the link can view"), or a description of the formatting involved
- your browser

Please don't put private or sensitive documents in issues. Make a copy with placeholder text instead.

**Security problems:** don't open a public issue. See [SECURITY.md](SECURITY.md).

## Development setup

Footnote Matcher is plain [Google Apps Script](https://developers.google.com/apps-script) (V8 runtime). There's no build step. You edit files in `src/` locally and upload them with [clasp](https://github.com/google/clasp).

You'll need Node.js, git, and a Google account. A personal Gmail account works best; school and work accounts often block Apps Script.

1. **Fork** this repository and clone your fork.
2. Turn on the **Google Apps Script API** at <https://script.google.com/home/usersettings>.
3. Create your own Apps Script project at <https://script.google.com> → **New project**, and copy its **Script ID** from **Project Settings**.
4. Copy `.clasp.json.example` to `.clasp.json` and paste in your Script ID. The real `.clasp.json` is gitignored, so it stays out of commits.
5. Log in and upload:
   ```bash
   npx @google/clasp login
   npx @google/clasp push
   ```
6. **Make a test document.** Upload [`test/footnote-matcher-test-100.docx`](test/footnote-matcher-test-100.docx) to Google Drive, open it, and choose **File → Save as Google Docs**. It has 100 footnotes with deliberately inconsistent formatting, plus italics, links, bold, and multi-paragraph footnotes that must survive a match.
7. **Run it as an add-on.** In the Apps Script editor, choose **Deploy → Test deployments → Editor add-on → Create new test**. Select **Latest code**, **Installed and enabled**, and your test document, then save and **Execute**. After each `clasp push`, refresh the test document to pick up your changes.

**Never commit `.clasprc.json`.** It holds your Google login token.

## Making a change

1. Create a branch from `main`, e.g. `fix/empty-paragraph-cursor`.
2. Keep the change focused. One fix or feature per pull request.
3. Follow the code conventions:
   - Plain Apps Script on the V8 runtime: `const`/`let`, `for...of`, no `eval`.
   - No npm dependencies, TypeScript, or bundlers without prior discussion.
   - Keep `/** @OnlyCurrentDoc */` and the minimal scopes in `src/appsscript.json`. Requests for broader permissions won't be accepted.
   - `onOpen` only builds the menu.
   - Menu actions show a friendly alert instead of an error.
   - Add a short JSDoc comment to each function.
4. **Test by hand** with the acceptance checklist in [`docs/SPEC.md`](docs/SPEC.md). Apps Script can't run locally, so manual testing in a real Google Doc is required.
5. If you change behavior, update `docs/SPEC.md` and, where users would notice, `README.md`.
6. Open a pull request and fill in the template. Say how you tested.

Keep everything you write for the project (documentation, code comments, commit messages, and pull request descriptions) neutral and written for all readers. Describe the change itself. Don't include notes, reminders, or requests addressed to the maintainer. Questions for the maintainer belong in a pull request comment or an issue.

## AI-assisted contributions

AI tools (including Claude Code, which this project uses) are fine. You're responsible for understanding and testing what you submit, the same as for code you wrote by hand. [`CLAUDE.md`](CLAUDE.md) holds project guidance for AI coding tools.

## License

By contributing, you agree that your contributions are licensed under the project's [MIT License](LICENSE).
