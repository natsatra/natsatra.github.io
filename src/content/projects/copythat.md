---
title: 'CopyThat: Browser extension'
description: 'A tabbed, color-coded notepad with a one-click copy function'
isFeatured: true
type: 'project'
tags: ['JavaScript', 'HTML', 'Browser extension']
---
## Overview
CopyThat is a tabbed notepad that lives in the browser toolbar. It stores text and code snippets in color-coded tabs and copies any tab's contents to the clipboard with one click. I built it because I needed a notepad available everywhere on my primary browser — pleasant to look at, able to copy entire snippets in one click, and free of fluff.

It's for text you paste repeatedly: canned support replies, code snippets, form boilerplate, addresses, meeting links. Instead of hunting through a document or a notes app in another window, the snippet is two clicks away from any page.

CopyThat is a Manifest V3 extension that runs entirely inside its own popup — it makes no network requests, injects nothing into web pages, and keeps all data on your device. It's compatible with Chrome (and Chromium-based browsers) and Firefox 109+.

## Features

- **Tabbed notes** — up to 20 tabs, each with its own title and up to 25,000 characters of content.
- **One-click copy** — the copy button sends the active tab's full contents to the system clipboard.
- **Color coding** — assign each tab a color from a 9-swatch picker, or fall back to the automatic palette rotation.
- **Inline rename, drag-and-drop reordering, and keyboard navigation** for fast, mouse-optional organizing.
- **Bulk delete** — an edit mode with checkboxes, select-all, and a click-twice-to-confirm delete.
- **Live metadata** — character count against the limit, tab count, and a live last-edited timestamp.

## Architecture

The entire extension is three files — an MV3 manifest declaring the popup and two permissions, the popup markup and styles, and one script holding all the logic. There's no background service worker, no content script, and no host permissions: code executes only while the popup is open, in the popup's own isolated document.

Notes persist in `chrome.storage.local` under a per-tab key scheme, which keeps each record well under the per-item quota and stops a write failure on one tab from corrupting the rest. Writes debounce at 400 ms, quota errors surface as a visible toast instead of failing silently, and a migration path from the older single-key format runs automatically on first load.

## Security design

I document security products for a living, so I treated a notepad that holds people's snippets as a product with a threat model:

- **Local storage only — no account, no sync.** Notes stay in `chrome.storage.local` rather than `storage.sync`, so contents never upload to Google's servers, nothing ties the notes to an identity, and with no auth flow there are no tokens to steal. The accepted trade-off: notes don't follow you across devices.
- **Two permissions, no more.** `storage` and `clipboardWrite` — no host permissions, so the extension can't read or change any web page, and no `clipboardRead`, so it can write to your clipboard but never inspect it.
- **No network activity.** No fetch, sockets, or external assets anywhere; combined with MV3's content security policy, there's no channel through which note contents could leave the machine.
- **XSS-safe DOM handling.** User text enters the DOM through safe sinks only (`textContent`, `createTextNode`), and pasting keeps just the `text/plain` representation, discarding any HTML riding along in the clipboard.
- **Zero runtime dependencies.** The shipped extension is vanilla JavaScript; nothing from npm ends up in the installed package, which removes the risk of a compromised dependency in the supply chain.

The README also documents what the extension *doesn't* protect against — data isn't encrypted at rest, there's no popup lock, no backup, and it's a notepad, not a password manager — because stating the boundaries honestly matters as much as listing the protections.

## My role

Solo project — I designed, built, audited, and documented it:

- Designed the UX around the one-click-copy workflow and built the full extension in vanilla JavaScript.
- Made the security decisions documented here and audited the code against them (safe DOM sinks, no network calls, permission minimalism).
- Wrote the README as a security-focused document: architecture, each design decision with its reasoning, known limitations stated plainly, and a "verify it yourself" section with grep commands so anyone can audit a checkout in minutes.

## Tech stack
Vanilla JavaScript, HTML, and CSS on the Manifest V3 extension APIs (`chrome.storage`, clipboard). ESLint for development tooling — nothing ships at runtime.

## Links
<a href="https://github.com/natsatra/CopyThat" target="_blank" rel="noopener noreferrer">View on GitHub</a> — the full README, including installation steps and the self-audit commands.
