<div align="center">

# 📌 Google Docs Tab State Persist

**Keep your Google Docs Document Tabs exactly as you left them even after a refresh.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue.svg)](#)
[![Chrome](https://img.shields.io/badge/Chrome-supported-4285F4?logo=googlechrome&logoColor=white)](#)
[![Edge](https://img.shields.io/badge/Edge-supported-0078D7?logo=microsoftedge&logoColor=white)](#)

</div>

---

## The problem

Google Docs' [Document Tabs](https://support.google.com/docs/answer/15499791) feature lets you nest tabs up to three levels deep — great for organizing large documents. But every time you refresh the page, Google Docs **re-expands every single tab**, no matter how you had them arranged. On a document with dozens of tabs, that's a wall of clutter every time you reload.

There's no setting in Google Docs to fix this. So this extension does it for you.

## What it does

This is a lightweight browser extension that watches the tabs sidebar in the background and:

- 🧠 **Remembers** which tabs you collapse or expand, per document
- 🔁 **Reapplies** that exact layout automatically every time you reload the page
- 🔒 Stores everything **locally on your device** — nothing is sent anywhere, nothing is shared with document collaborators
- ⚡ Adds no UI to Docs itself — you keep using the native collapse/expand arrows exactly as before

## Install

### From source

1. Download or clone this repository.
2. Open `chrome://extensions` (Chrome) or `edge://extensions` (Edge).
3. Turn on **Developer mode** (top-right toggle).
4. Click **Load unpacked** and select the project folder (the one containing `manifest.json`).
5. Open a Google Doc that has Document Tabs — that's it, no setup needed.

> Works identically in both Chrome and Edge — Edge supports Chrome's Manifest V3 extension format natively.

## Usage

Just use Google Docs normally:

1. Click a tab's collapse/expand arrow (▶ / ▼) like you always would.
2. Refresh the page whenever you like.
3. Your tabs come back exactly as you left them — no re-expanding, no re-collapsing.

Click the extension icon in your toolbar if you ever want to **reset the saved layout** for the current document back to Google's default.

## How it works

Google doesn't publish or document the internal structure of the Document Tabs sidebar, so this extension avoids relying on brittle, auto-generated CSS class names wherever possible. Instead it:

1. Locates the tabs sidebar via its accessibility role (`role="tree"`) rather than styling hooks.
2. Tracks each tab's own collapse/expand toggle button and its current state.
3. Persists state to `chrome.storage.local`, keyed per document.
4. On load — and whenever Docs re-renders the sidebar — it compares the live state against your saved state and simulates the same click you'd make yourself to correct any mismatch, so Google's own internal state stays fully in sync (not just a visual patch).

**Known limitation:** Google Docs briefly renders all tabs expanded before any extension can react, so you may see a short flash on load before it settles into your saved layout. This is inherent to fixing the behavior from outside Google's own code — there's no way to prevent Google's initial default render from a content script.

## Privacy

- No network requests are made by this extension. Ever.
- No analytics, no tracking, no telemetry.
- All saved layout data lives in your browser's local extension storage and is scoped per document ID.
- Uninstalling the extension removes all of its stored data.

## Contributing

Issues and pull requests are welcome. If Google changes the Docs sidebar markup and detection breaks, please open an issue with:

- The output of `document.querySelectorAll('[role="treeitem"]').length` in the DevTools console
- The output of `document.querySelectorAll('.chapterItemArrowContainer[role="button"]').length`
- Any errors or unexpected behavior you're seeing

## License

Licensed under the [MIT License](./LICENSE).

## Author

**Rijwanul**
🌐 [rijwanul.com](https://rijwanul.com)
✉️ [hello@rijwanul.com](mailto:hello@rijwanul.com)

---

<div align="center">
<sub>If this saved you from a wall of re-expanded tabs, consider ⭐️ starring the repo.</sub>
</div>
