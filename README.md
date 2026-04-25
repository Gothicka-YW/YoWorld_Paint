# YoWorld Paint v3.5 🎨

YoWorld Paint is a Chrome Extension fan tool for YoWorld players. It helps you create, preview, and share custom Paint Boards faster and cleaner than doing it by hand.

> ⚠️ Community fan tool. Not affiliated with YoWorld or Big Viking Games (BVG).

---

## 🚀 What's new in 3.5

- Sales Boards has been retired
  - The dedicated Sales Boards tab and YoWorld Info capture flow were removed
  - Use Windows crop/snipping plus Home Quick Upload instead
- Removed experimental "Glow Fix" feature
  - Feature did not reliably preserve dither/glow effects in YoWorld
  - Investigating better approaches for handling semi-transparent images
- All other v3.3 features remain unchanged

## 🚀 What's new in 3.3

- New Tools tab
  - Board Size Calculator (boards wide/high → target pixels)
  - Image Splitter with scale toggle (fit to grid) or natural tiling
  - Drag/drop/paste input, checkerboard thumbs to show transparency
  - Download individual tiles or a ZIP; Clear resets state
  - Tiles and tool state persist across popup reopen
- Home tab preview now shows a checkerboard behind your image to reveal transparent regions
- Popup widened to 540px and keeps the themed look from 3.2.1

## 🚀 What’s new in 3.2

- New Sales Boards capture (3×2 from YoWorld Info)
  - Pick a card on yoworld.info and capture 6 items starting at your pick
  - Tight crop (top) with safe bottom padding for captions
  - Preview and Export to 390×260 PNG
  - Buttons: Pick, Reset, Preview, Export, Restore
- Reliability
  - Fixes for “Receiving end does not exist” via on‑demand injection
  - Selector picking works on templates and mid‑list (uses picked index)
- UI polish
  - Smaller centered tabs, internal red scrollbar
  - Footer shown only in Resources, with tighter spacing
  - Added inline “How to Use” expanders on Sales Boards and Create Boards; removed duplicate FAQ bullets

## 🚀 What’s new in 3.1

- FAQ updates
  - Refreshed “Making Art in YW” with Quick Image Uploader and Manual host paths
  - Added final step to open the paint board and press OK
- Minor copy cleanup in the popup (FAQ)

## 🚀 What’s new in 3.0

- Quick Image Uploader (Home tab)
  - Click, drag & drop, or paste images directly into the popup
  - Optional high-quality PNG preparation for larger images before upload
  - Smaller transparent art is preserved without stretching when board-size prep is enabled
  - ImgBB‑only upload for reliability; link auto‑copied on success
  - Optional “Auto‑set as Current Image” applies your uploaded image immediately
  - Subtle status toasts; keyboard accessible (Enter/Space)
- Resources tab
  - Added “ImgBB – Image Host” (imgbb.com)
  - “Get your API key here” button → api.imgbb.com
- Provider cleanup
  - Removed Catbox; simplified to ImgBB only to avoid CORS/black export issues
- UI polish
  - Uploader header with Pacifico font; improved drop zone behavior

---

## ✨ Features

- Tools (popup → Tools)
  - Board Size Calculator to get the target resize for your grid
  - Image Splitter: drag/drop/paste, optional scaling to grid or natural tiling
  - Checkerboard previews to verify transparency; download tiles or ZIP
  - Tiles and settings persist after closing/reopening the popup

- Quick Image Uploader (popup → Home)
  - Paste, drag & drop, or click to select
  - Optional 390×260 PNG prep with high-quality downscaling for larger images
  - Smaller transparent art stays centered on a transparent board without stretching
  - Auto‑copy URL + optional auto‑apply to the current image
  - Home preview shows checkerboard behind images to reveal transparent areas

- Resources & FAQ
  - How‑to notes for art and boards
  - Useful Links including ImgBB host and API key page
  - Guidance for using Windows crop/snipping with the Home uploader

---

## 📦 Install

1) Download or clone this repo
2) Open Chrome → go to chrome://extensions
3) Enable Developer mode (top‑right)
4) Click “Load unpacked” and select the YoWorld_Paint folder

The extension icon should appear in your toolbar.

---

## 🔧 Setup (ImgBB)

- Get an ImgBB API key (Resources tab has a button linking to api.imgbb.com)
- Open the Resources tab → paste your key → Save Key
- In the Home tab, the Quick Image Uploader will use this key

---

## 🧭 How to use

- Home tab
  - Paste an image URL and click “Set New Image”, or
  - Use the Quick Image Uploader to paste/drag/click → Upload → Auto‑set
  - Enable board-size prep only when you want a 390×260 PNG; smaller art will stay transparent and centered instead of stretching
  - Toggle “Enable Redirect” when you’re ready to apply on YoWorld

- Windows crop workflow
  - Use Shift + Ctrl + S to capture the exact item area you want
  - Paste directly into Home → Quick Image Uploader
  - Upload as-is or enable board-size prep if you want a 390×260 PNG

---

## 🔒 Permissions

Minimal and explicit:
- `storage` - Saves user settings and state (theme, selected view mode, uploader preferences, redirect state, board/tool data)
- `declarativeNetRequest` - Applies redirect rules used by the paint-board workflow
- `declarativeNetRequestWithHostAccess` - Allows redirect rules to operate on approved host patterns
- `declarativeNetRequestFeedback` - Supports rule diagnostics/feedback while troubleshooting
- `sidePanel` - Enables opening and running YoWorld Paint in Chrome Side Panel mode
- Host permissions:
  - `https://*.facebook.com/*`
  - `https://*.fbcdn.net/*`
  - `https://*.yoworld.com/*`
  - `https://api.yoworld.info/*`
  - `https://yoworld.com/*`
  - `https://api.imgbb.com/*`

---

## 🔒 Privacy

- No analytics or tracking
- No sale of personal data
- No background collection of browsing history
- Data is only sent to external services when required by user actions:
  - ImgBB API (only when you upload an image using Quick Upload)
  - YoWorld and related redirect/proxy endpoints (only while using paint-board redirect features)
- Settings/state are stored in Chrome extension storage:
  - `chrome.storage.sync` (preferences such as theme, view mode, API key)
  - `chrome.storage.local` (runtime/state values needed for extension behavior)
- See `PRIVACY_POLICY.md` for full policy text and permission details

---

## 🛠 Tech

- Manifest V3
- Vanilla HTML/CSS/JS (no frameworks)
- Local packaged fonts (MV3‑safe): Pacifico, Staatliches, Passion One, Dancing Script

---

## ❓ Troubleshooting

- File picker opens twice or instantly closes
  - Fixed in v3.0; if it persists, reload the extension and try again
- Upload succeeds but image looks black
  - Use ImgBB (Catbox removed due to CORS tainting)
- “ImgBB key missing” warning
  - Set your API key in Resources → Save Key

---

## � Feedback & Support

- Report bugs or request features: ywa.paint@gmail.com
- Support development: https://buymeacoffee.com/ywpaint

---

## 📄 License

Fan tool provided as‑is, with no warranty. Not affiliated with YoWorld or BVG.
