# 📜 YoWorld Paint – Changelog

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