# YoWorld Paint v3.0 🎨

YoWorld Paint is a Chrome Extension fan tool for YoWorld players. It helps you create, preview, and share custom Paint Boards and Sales Boards—faster and cleaner than doing it by hand.

> ⚠️ Community fan tool. Not affiliated with YoWorld or Big Viking Games (BVG).

---

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

## � Privacy

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
