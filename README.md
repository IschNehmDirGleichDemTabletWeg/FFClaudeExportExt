# FFClaudeExportExt

A Firefox extension to export chats from Claude.ai (and Open WebUI) as formatted HTML or PDF.

---

## Features

- **HTML Export** – Downloads a fully formatted `.html` file, ready to import into OneNote or save as archive
- **PDF / Print** – Opens a print-optimized view with correct multi-page layout
- **Syntax Highlighting** – Code blocks retain their colors from Claude.ai
- **Chat Layout** – User messages appear as bubbles (right-aligned), Claude responses on the left
- **Decorative Dividers** – Classic letterhead-style ornament dividers between messages ( ✦ ✦ ✦ )
- **Message Timestamps** – Each user message shows the full date and time (incl. seconds) it was sent
- **Usage Bars** – Live display of Claude session (5h) and weekly (7d) usage limits directly in the popup
- **Works on Claude.ai and localhost** (Open WebUI support in progress)

---

## Installation

### Option A – Signed (permanent, recommended)

Download the signed `.xpi` from the releases section here and open it in Firefox.

### Option B – Temporary (developer mode)

1. Clone or download this repository
2. Open Firefox and go to `about:debugging`
3. Click **"This Firefox"** → **"Load Temporary Add-on"**
4. Select `manifest.json` from the extension folder

> Note: Temporary add-ons are removed on every Firefox restart.

---

## Usage

1. Open a chat on **Claude.ai**
2. Click the **Chat Exporter** icon in the Firefox toolbar
3. Choose:
   - **Print / PDF** – opens a print dialog (multi-page, clean layout)
   - **Export as HTML** – downloads a `.html` file named `20260405_20-46_Claude_Chat_<title>.html`
4. Import the HTML file into OneNote or open it in any browser

---

## File Structure

```
FFClaudeExportExt/
  manifest.json     <- Extension metadata (Manifest V2)
  content.js        <- DOM reader for Claude.ai + Open WebUI
  popup.html        <- Toolbar popup UI
  popup.js          <- Button logic, communicates with content.js
  icons/
    icon48.png
    icon96.png
```

---

## Known Limitations

- **Claude.ai DOM selectors** may break if Claude.ai updates their CSS classes. If nothing is exported, check the browser console and update the selectors in `extractClaude()` in `content.js`.
- **Timestamps** – Full date and time (incl. seconds) are retrieved directly from the Claude.ai API.
- **Open WebUI** support is not yet fully tested – selectors may need adjustment for your version.
- **DOCX export** is planned for Phase 2.

---

## Troubleshooting

If the export shows "No chat messages found":

1. Open Firefox DevTools (`F12`) on Claude.ai
2. Go to the **Console** tab
3. Run: `document.querySelectorAll("div.group div.contents").length`
4. If the result is `0`, Claude.ai changed their DOM structure – open an issue with a screenshot of the inspector.

---

## Roadmap

- [x] HTML export
- [x] PDF / Print support
- [x] Syntax highlighting
- [x] Mozilla signed release
- [x] Usage bars (5h session + 7d weekly limit)
- [x] Message timestamps (full date + time incl. seconds)
- [ ] Open WebUI selectors
- [ ] DOCX export (Phase 2)
- [ ] Dark mode export theme

---

## Author

**IschNehmDirGleichDemTabletWeg**
Built with Claude (Sonnet 4.6) in one evening session. 😄

---

## License

MIT – do whatever you want with it.
