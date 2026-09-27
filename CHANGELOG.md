# YoWorld Paint - Changelog
## v3.5.11 — Sales Boards Side Panel Permission Fix
**Release Date:** 2026-09-27

Fixes and changes
- Fixes Sales Boards Preview and Export failing in Side Panel mode with Chrome's “Either the '<all_urls>' or 'activeTab' permission is required” error.
- Uses one optional Sales Boards access prompt, requested only when the user uses the feature and never during installation.
- Requests access before selector and preview actions so the permission prompt remains connected to the user's button click.
- Replaces the raw Chrome permission error with clear instructions when access is declined.
- Restores the public product name and header to **YoWorld Paint v3.5.11**.
- Updates Resources with the Chrome Web Store listing, YoWorld Info template, and packaged Privacy Policy.
- Updates every packaged Privacy Policy copy and replaces the tab-tutorial placeholders with current instructions.
- Removes the helper sentence directly beneath the Enable Redirect toggle.
- Updates the packaged Chrome Web Store description and the manifest's short description.
- Refreshes the Side Panel document after an extension update or developer reload so Chrome does not leave an empty panel shell visible.

## v3.5.10 — Image Quality and Simple Transparency Control
**Release Date:** 2026-09-27

Fixes and changes
- Preserves soft transparency by default so glow, snow, translucent art, and antialiased edges retain more detail.
- Replaces the multi-mode design with one simple optional Clean faint transparency checkbox.
- Keeps the v3.5.9 hard cleanup available for images with unwanted haze or hidden background color.
- Saves the cleanup preference for future Quick Uploads.
- Keeps 390×260 aspect-preserving resizing, Picrd default hosting, and optional ImgBB hosting.

## v3.5.9 — YoWorld Transparency Cleanup
**Release Date:** 2026-09-27

Fixes and changes
- Detects partial alpha in images prepared by the default Game-ready upload path.
- Converts partial transparency to a YoWorld-safe binary edge at a 50% alpha threshold.
- Clears hidden RGB color from pixels that become transparent, preventing faint colored haze from becoming solid in-game.
- Preserves exact-size PNG bytes when their transparency is already safe.
- Keeps Picrd as the default host and ImgBB as an optional host.

## v3.5.8 — Picrd Default Uploader
**Release Date:** 2026-09-27

Fixes and changes
- Makes Picrd the default Quick Upload host; it is free and requires no API key.
- Keeps ImgBB available as an optional host and preserves existing ImgBB API-key settings.
- Requests Picrd access only when the user uploads, avoiding a new required host permission during extension update.
- Preserves uploaded PNG files exactly through Picrd and keeps non-ImgBB images on the established YoWorld image route.
- Displays ImgBB previews through the compatibility cache instead of the currently unreliable direct CDN request.
- Adds an always-visible reminder and toggle messages to keep Redirect enabled until the first YoWorld Save/OK completes.

## v3.5.7 — ImgBB Black-Image Recovery
**Release Date:** 2026-09-27

Fixes
- Detects direct ImgBB CDN links before creating the paint-board redirect rule.
- Routes ImgBB images through the wsrv.nl image cache because the existing YoWorld server-side fetch currently returns a solid-black fallback PNG for ImgBB sources.
- Keeps non-ImgBB image hosts on the existing YoWorld image route.
- Adds no new Chrome host permission, avoiding an update-time site-access prompt.
- Retains Side Panel as the default with the optional Popup preference.

## v3.5.2 — Popup Recovery
**Release Date:** 2026-09-11

Fixes
- Restored reliable toolbar opening for both Popup and Side Panel preferences.
- Added a safe popup fallback when Side Panel setup fails or is unavailable.
- Applies the saved view preference on install, browser startup, and preference changes.
- Removed the required yoworld.info page access added by the previous store update; Sales Boards now uses temporary active-tab access and asks for optional site access only when needed.
- Removed the unused `declarativeNetRequestFeedback` permission.
- Removed the obsolete duplicate Tools panel at startup so the live Tools tab has a single unambiguous panel.
- Hardened tab activation against incomplete or stale markup.

Store update note
- The preceding published update added required site access. Chrome can disable an existing extension when an update adds a permission warning until the user accepts it. This build avoids making yoworld.info access mandatory at update time.

## v3.4 — Update
**Release Date:** 2026-02-10

Changes
- Added Side Panel view support
  - Extension can now open as a traditional popup or as a browser side panel
  - Side panel provides a full-height, flexible-width view that stays open alongside browser tabs
  - Dedicated side panel UI (`sidepanel.html`) with optimized full-space layout
- View Mode preference in Resources tab
  - New "Preferred View" selector above theme settings
  - Choose between "Popup" (traditional) or "Side Panel" (new)
  - Preference is saved and automatically applied when opening the extension
  - Switching to side panel mode automatically opens the side panel view
- Theme system now works correctly in both popup and side panel modes
- All features (Quick Upload, Sales Boards, Transform, Tools, FAQ) fully functional in both views
- Side panel UI uses responsive sizing with scrollable content areas
- Added `sidePanel` permission to manifest
- Removed "Glow Fix" feature from Home tab
  - Feature was experimental and did not reliably preserve dither/glow effects when images were uploaded to YoWorld
  - Fiddler-style injection/interception approaches are non-viable for this MV3 extension architecture

Files Added
- `popup/sidepanel.html` - Dedicated side panel interface
- `popup/sidepanel.css` - Side panel-specific layout styling

Notes
- Default view mode remains "Popup" for existing users
- All functionality is identical between popup and side panel views
- Side panel view is optimized for wider screens and extended use
- Dither/glow handling remains an open problem for future updates

## v3.2.1 — Update
**Release Date:** 2025-11-08

Improvements
- Resilience: background redirect probes YoWorld Info proxy and falls back to direct image URL if the proxy is down
- Home: data URLs pasted in the input are auto‑uploaded and converted to https links (ImgBB)
- Sales Boards: picker works on any page (not limited to yoworld.info); improved messages when injection fails
- UI: transparency preview uses a standard grey checkerboard behind PNGs (Home preview and Sales tiles)
- Version bump: manifest version/name and UI title updated to 3.2.1

Other updates included in 3.2.1
- Themes: Added Pastel Breeze, Mint Frost, Aurora Rose, and a high‑contrast Teal Contrast theme; removed Solar Gold (low contrast)
- Theme selector: Alphabetized dropdown; Crimson remains the default
- Accessibility: Enable Redirect toggle ON state now uses the active theme accent gradient + glow + label accent for clearer status
- UI: Added Tools tab placeholder (Perspective Fix & Image Splitter design phase) and widened popup to 540px to fit six tabs
- Styling: Quick Image Uploader heading standardized to FAQ heading font; restored lost uploader/toast styles into CSS (removed inline styling)

Notes
- Perspective/Skew correction and Image Splitting are in design only (no shipped logic yet)
- Testing of offline yoworld.info fallback still pending manual simulation

## v3.3 — Release
**Release Date:** 2026-01-07

Highlights
- New Tools tab
  - Board Size Calculator (quick cols × rows → target pixels)
  - Image Splitter (390×260 tiles) with scale toggle or natural tiling
  - Drag/drop/paste input, checkerboard thumbs to show transparency
  - Download individual tiles or ZIP (store, no compression), Clear button
  - Tiles and tool state persist across popup reopen
- Create Boards tab retired; tab renamed to Transform with guidance to use Sales Boards for captures or Tools for splitting/warping
- Home preview now shows a checkerboard under images to visualize transparency
- Popup layout widened to 540px; theme styling retained from 3.2.1

## v3.2 — Release
**Release Date:** 2025-10-09

Highlights
- New "Sales Boards" tab (capture from YoWorld Info)
  - Pick any card on yoworld.info/template and capture a fixed 3×2 (6 items) grid
  - Tight crop on top; extra bottom padding to protect captions
  - Crops and scales to 390×260 PNG
  - Buttons: Pick, Reset, Preview, Export, Restore
- Robust picking and discovery
  - Records container selector, card selector, and picked index
  - Starts capture at your picked index (mid‑list works like YoWishlist‑50)
  - Flexible sibling/descendant heuristics for repeating cards
- Connection reliability
  - Detects missing listener and injects content script on demand
  - Helpful status messages if not on yoworld.info
- UI polish
  - Compact, centered tabs; internal red scrollbar
  - Footer moved to Resources only; spacing tightened
  - Inline “How to Use” expanders added to Sales Boards and Create Boards tabs; duplicate FAQ section removed
- Documentation
  - README and Privacy Policy updated for new behavior

## v3.1 — Update
**Release Date:** 2025-10-05

Changes
- FAQ updates:
  - “Making Art in YW” now shows both paths: Quick Image Uploader and Manual host
  - Added a final step: open your YoWorld paint board and press OK to apply
  - Minor copy/link cleanup in FAQ
- Version bump: manifest version/name and UI title updated to v3.1
- No functional changes to uploader, permissions, or Sales Boards since v3.0

## v3.0 — Release
**Release Date:** 2025-10-01

Highlights
- New Quick Image Uploader on Home
  - Click, drag & drop, or paste images directly
  - Auto‑resizes to 390×260 PNG before upload
  - ImgBB‑only upload with API key stored in Chrome sync
  - Auto‑copy link on success + optional “Auto‑set as Current Image”
  - Subtle status toasts for paste/drop/select/upload events
  - Keyboard accessible (Enter/Space) and improved drop zone behavior
  - Polished header with Pacifico font for the title
- Resources updates
  - Added “ImgBB – Image Host” (imgbb.com) to Useful Links (alphabetical)
  - Added subtle secondary button: “Get your API key here” → api.imgbb.com
- Provider/permissions cleanup
  - Removed Catbox support and related host permissions
  - Simplified uploader to ImgBB only
- UX fixes
  - File picker opens once (no double dialog)
  - First attempt upload reliability (no need to retry)
- Version bump
  - Manifest version set to 3.0; UI title/header updated to v3.0

Notes
- Manual testing completed in the popup and Resources tabs.


## v2.3 - In Testing
**Date** 2025-09-24
- Updated tabs (4): Home, Sales Boards, FAQ, Resources
- Additional fonts & sizes added to Sales Boards
- Updated intro Home tab png
- Tried direct 'Send to Home' button from Sales Board for fast application. Unreliable.

ToDo:
- Update Sales Boards grid with import of item image/full item name ability.
- 

## v2.2 Release - Tested
**Release Date:** 2025-09-03
- Added optional donation button under FAQ tab.
- Tested for bugs. None found:
	- Home tab: applies images to paint boards as expected
	- Sales Boards: URL input, text input/sizing/style, export, and save .png working as expected.
	- FAQ: In-tact section texts, unaffiliated notice, and donation properly placed and working
	- No console or stack trace errors found 
**NOTE**: When yoworld.info is inoperable, extension will break. There is a minimal working version which only puts images on paint boards (old school way). Consider uploading this to GitHub as well.

## v2.1 (BETA) — In testing
**Release Date:** 2025-08-28
- **Navigation/UI**
  - All three tabs now have **subtle square borders** (1px).  
  - **Sales Boards** tab hover color fixed to use the dark red accent.
  - Renamed “**How To Use**” tab to **FAQ**.
- **FAQ panel**
  - Added **Creating Sales Boards** section (5 steps + ⭐ tip) above **Useful Links**.
  - Renamed “**How to make art?**” to **Making Art in YW**.
  - Unified heading **size/style** for **Making Art in YW**, **Creating Sales Boards**, and **Useful Links**.
  - Added footer disclaimer (Unofficial fan tool; no data collected; Feedback: ywa.paint@gmail.com) **shown only on FAQ**.
- **No layout regressions:** did **not** change tab widths; scrolling is allowed on FAQ.
- **Useful Links:** kept your current working links unchanged.


YoWorld Paint 2.0 - Beta
**Release Date:** 2025-08-26
- Sales Boards: remembers the **last opened tab** (popup reopens on Sales Boards if it was used last).
- Auto-save & restore of URLs/captions via chrome.storage.local.
- Instant caption updates while typing; 3-line centered wrapping retained.
- Export unchanged (390×260 PNG).
- Global font update: All UI fonts standardized to Verdana (with safe stack Verdana, Geneva, Tahoma, sans-serif), ensuring consistent look across tabs and popups.
- Applied to popup/popup.css, popup/sales-tab.css, popup/popup.js, and options/options.css.
- Base body font-family rule added to enforce Verdana everywhere.
- Removed inconsistencies where some buttons or form elements used Georgia or other fonts.
- Ensures a unified style for future feature updates.


## v1.3.4 (BETA)
**Release Date:** 2025-08-26
- Fix: Sales Boards tab not showing due to script error in v1.3.3.
- Change: Captions **update instantly** as you type (no debounce), implemented safely.
- Keeps 3-line centered wrapping.
## v1.3.2 (BETA)
**Release Date:** 2025-08-26
- Sales Boards captions improved again.
- Captions now wrap up to **3 centered lines** before truncating with ellipsis.
- Keeps font at 12px for readability.

## v1.3.1 (BETA)
**Release Date:** 2025-08-26
- Improved Sales Boards caption handling.
- Captions now wrap up to **2 centered lines** before truncating with ellipsis.
- Ensures long item names display more cleanly inside each cell.

## v1.3 (BETA)
**Release Date:** 2025-08-26
- Switched Sales Boards to a new **6-grid layout** (3×2).
- Each cell has a gray border, image on top (Contain mode, no crop), caption centered below inside the border.
- Removed old 3-wide layout and Fit Mode toggle.
- Export still produces a **390×260 PNG**.

## v1.1 (BETA)
**Release Date:** 2025-08-25  
- 🎨 UI Polish:
  - Updated color theme: accent `#520404`, hover `#300202`.
  - Added hover shadows and soft press effect to buttons.
  - Added divider line under tab row for clearer separation.
  - Serif font (Georgia) applied to “Set New Image” button.
- 🖼 Default Image:
  - Changed fallback default from `8AoVUG0.png` → `kcVh1HW.png`.
- 🖲 Controls:
  - “Enable Direct” Ant switch now gray when off, accent red when on/hover.
- 🔤 Text/Labels:
  - Header renamed to “YoWorld Paint”.
  - Tab updated to “How To Use”.
  - “Set new image” → “Set New Image” (persists after click).
- 🧹 Cleanup:
  - Removed Board Composer UI (kept code intact for later).
- ✅ Tested: image transfer to YoWorld Paint Boards works as intended.

---

## v1.0 (BETA)
- First working build of popup extension.
- Basic Imgur → YoWorld paintboard workflow.
- Initial styling and default Imgur fallback (`8AoVUG0.png`).
