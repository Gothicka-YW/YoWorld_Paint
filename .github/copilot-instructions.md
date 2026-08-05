# Copilot Instructions for YoWorld Paint

## Project Overview
- **YoWorld Paint** is a Chrome Extension (Manifest V3) for YoWorld players to create, preview, and share custom Paint Boards and Sales Boards.
- The extension is written in vanilla JS/HTML/CSS for compatibility and simplicity. No frameworks are used.
- The UI is organized into four main tabs: Home, Sales Boards, FAQ, and Resources (see `popup/popup.html`).
- The extension uses local and sync Chrome storage for state and settings, and declarativeNetRequest for redirect rules.

## Key Components & Data Flow
- **Popup UI** (`popup/`): Main user interface, with tabbed navigation and live preview. Each tab has its own JS file under `popup/tabs/`.
- **Sales Boards**: Users can compose a 3x2 grid of images/captions, preview, and export as PNG. See `popup/tabs/sales.js`.
- **Uploader Logic** (`src/lib/uploader.js`): Handles image uploads to providers (Uploadcare, Catbox). Provider logic in `src/providers/`.
- **Settings** (`src/lib/settings.js`): Reads/writes user settings (e.g., preferred upload provider, API keys) via `chrome.storage.sync`.
- **Background Worker** (`background.js`): Listens for storage changes and updates redirect rules using `chrome.declarativeNetRequest`.
- **Content Script** (`content/sb_capture.js`): Captures Sales Board images from YoWorld Info.

## Developer Workflows
- **Install/Load**: See `HOW_TO_INSTALL.txt` for step-by-step Chrome extension loading.
- **No build step**: All code is plain JS/CSS/HTML. Just edit and reload the extension in Chrome.
- **Debugging**: Use Chrome DevTools on the popup or background page. Console logs are present in key files (e.g., `background.js`).
- **Testing**: Manual testing via the extension popup and YoWorld site. No automated tests.

## Project-Specific Patterns & Conventions
- **MV3 Safety**: Fonts are packaged locally in `popup/fonts/` and loaded via `fonts.css` for Manifest V3 compliance.
- **Settings**: Use `getSettings`/`setSettings` from `src/lib/settings.js` for all settings access. Do not access `chrome.storage` directly elsewhere.
- **Uploader**: Always use `uploadImage` from `src/lib/uploader.js` for uploads. It handles provider fallback and timeouts.
- **UI Updates**: Use DOM APIs directly. No frameworks or virtual DOM.
- **Tab State**: Last opened tab is remembered via `localStorage` (`popup/popup.js`).
- **Image Size**: Sales Boards and Home preview expect images sized 390x260 px.

## Integration Points
- **External APIs**: Uploadcare and Catbox for image hosting. See `src/providers/` for API details.
- **YoWorld Integration**: Content script enables direct upload to YoWorld paintboards when on yoworld.com.
- **Permissions**: See `manifest.json` for required Chrome extension permissions and host permissions.

## Examples
- To add a new upload provider, implement in `src/providers/`, update `src/lib/uploader.js` to include fallback logic, and expose settings in the Resources tab if needed.
- To add a new tab, update `popup/popup.html`, add a JS file in `popup/tabs/`, and register it in `popup/popup.js`.

## References
- See `README.md` for user-facing features and install instructions.
- See `CHANGELOG.md` for recent changes and known issues.
- See `README_summary.md` for upload pipeline and provider notes.

---
For questions or feedback, email ywa.paint@gmail.com.
