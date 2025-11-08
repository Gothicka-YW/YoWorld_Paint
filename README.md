# YoWorld Paint v3.2.1 🎨

YoWorld Paint is a Chrome Extension fan tool for YoWorld players. It helps you create, preview, and share custom Paint Boards and Sales Boards—faster and cleaner than doing it by hand.

> ⚠️ Community fan tool. Not affiliated with YoWorld or Big Viking Games (BVG).

---

## 🚀 What’s new (post 3.2.1, upcoming)

These changes are committed after 3.2.1 and will appear in the next tagged release:

- New themes: Pastel Breeze, Mint Frost, Aurora Rose, Teal Contrast (high‑contrast dark teal)
- Removed Solar Gold (insufficient contrast in UI contexts)
- Theme dropdown now alphabetical (Crimson still default)
- Enable Redirect toggle ON state visually upgraded (accent gradient, glow, label color)
- Tools tab added (early placeholder for Perspective Fix & Image Splitter features)
- Popup width increased to 540px to accommodate six tabs without wrapping
- Quick Uploader heading matches FAQ heading style; lost drop zone/toast styles restored and centralized in CSS

## 🚀 What’s new in 3.2.1

- Resilience & reliability
  - Redirect now prefers the YoWorld Info proxy when reachable and falls back safely to the direct image URL if the proxy is down
  - Added “Save in YoWorld” button (Home tab) to perform a direct upload via the content script so the image truly persists when you click OK in-game
  - Data URL pasted in the Home input is auto‑uploaded (ImgBB) and converted to a stable https link
- Sales Boards
  - Picker works on any page (domain‑agnostic), not just yoworld.info
  - Status/error messages clarified when injection fails
- Transparency preview
  - Home preview and Sales Boards tiles now show a checkerboard pattern behind PNGs with alpha
- Version bump & docs
  - Manifest version/name updated to 3.2.1
  - README + CHANGELOG updated for new behaviors

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
  - Auto‑resizes to 390×260 PNG before upload
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

- Sales Boards (popup → Sales Boards)
  - Multiple layouts (classic 3×2, banner/hero/strips/mosaic/list variants)
  - Two‑line captions with intelligent wrapping and font fitting
  - Image Fit: Contain or Cover (per‑board setting)
  - Live preview exactly matches exported canvas
  - Export to 390×260 PNG
  - Picker now reliably selects the full card, even with manual text/captions
  - Selector logic is robust and works for all grid layouts

- Quick Image Uploader (popup → Home)
  - Paste, drag & drop, or click to select
  - Auto‑resize to 390×260 and upload to ImgBB
  - Auto‑copy URL + optional auto‑apply to the current image

- Resources & FAQ
  - How‑to notes for art and boards
  - Useful Links including ImgBB host and API key page

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
  - Toggle “Enable Redirect” when you’re ready to apply on YoWorld

- Sales Boards
  - Pick a layout and Image Fit
  - Paste up to 6 direct image links (or paste images directly)
  - Type captions; adjust font and size
  - Export PNG when satisfied

---

## 🔒 Permissions

Minimal and explicit:
- storage (remember settings and board data)
- declarativeNetRequest (+WithHostAccess +Feedback) for redirect rules
- activeTab (to assist when applying on yoworld.com)
- Host permissions: YoWorld domains, imgbb.com API

---

## 🔒 Privacy

- No analytics or tracking
- No data sent anywhere except:
  - ImgBB (only when you upload via Quick Uploader)
  - YoWorld domains (when applying/previewing boards)
- Settings are stored in Chrome storage (local + sync for your API key)

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
