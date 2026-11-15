# Security Policy

## Supported versions

Only the latest version of Footnote Matcher (the `main` branch and, once published, the current Marketplace release) gets fixes.

## Reporting a vulnerability

**Please don't open a public issue for security problems.**

Report them privately through GitHub instead: on this repository's **Security** tab, choose **Report a vulnerability**. If that isn't available, email **footnote-matcher@miller310.com**.

Please include what you found, how to reproduce it, and what an attacker could do with it. You should get a reply within 7 days. This is a volunteer project, so a fix may take longer.

## What's in scope

By design, Footnote Matcher only asks for access to the document that is open (`documents.currentonly`) and for permission to show its menu and alerts (`script.container.ui`). It makes no network requests and stores only the saved footnote style, inside the document's own properties.

Anything that breaks those limits is a security issue: for example, reading or changing other documents, sending data anywhere, or requesting broader permissions.
