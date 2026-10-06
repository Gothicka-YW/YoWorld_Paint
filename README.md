# YoWorld Paint v3.5.13 🎨

YoWorld Paint is a Chrome Extension fan tool for YoWorld players. It helps you create, preview, transform, split, upload, and share custom Paint Boards—faster and cleaner than doing it by hand.

> ⚠️ Community fan tool. Not affiliated with YoWorld or Big Viking Games (BVG).

## 🚀 What's new in 3.5.13

- Restores Paint Board image application after the retired compatibility endpoint stopped resolving.
- Removes all runtime and permission dependency on YoWorld Info.
- Routes user-selected public image links through the existing `wsrv.nl` compatibility relay for both preview and Paint Board application.
- Keeps Picrd as the default upload host and ImgBB as an optional host.

## 🚀 What's new in 3.5.12

- Removes the broken Sales Boards tab after its upstream template creator changed.
- Removes the related capture scripts and the `scripting`, `activeTab`, and `<all_urls>` permissions.
- Keeps Home, Transform, Tools, FAQ, Resources, uploading, and Paint Board apply behavior unchanged.
- Updates Resources, the Privacy Policy, and the packaged tab tutorials.

## 🚀 What's new in 3.5.10

- Preserves soft details by default for glow-heavy, translucent artwork.
- Adds one optional Clean faint transparency checkbox for images with unwanted haze.
- Remembers the cleanup preference for future uploads.
- Keeps the existing aspect-preserving 390×260 resize behavior.

## 🚀 What's new in 3.5.9

- Cleans partial transparency in Game-ready uploads before they reach YoWorld.
- Prevents faint colored glow/background pixels from becoming solid shapes in-game.
- Keeps crisp opaque artwork and fully transparent areas intact.
- Picrd remains the default uploader; ImgBB remains optional.

---

## 🚀 What's new in 3.4

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

- Tools (popup → Tools)
  - Board Size Calculator to get the target resize for your grid
  - Image Splitter: drag/drop/paste, optional scaling to grid or natural tiling
  - Checkerboard previews to verify transparency; download tiles or ZIP
  - Tiles and settings persist after closing/reopening the popup

- Quick Image Uploader (popup → Home)
  - Paste, drag & drop, or click to select
  - Optional game-ready 390×260 resize without stretching
  - Picrd is the default free host; ImgBB remains optional
  - Optional faint-transparency cleanup for difficult images
  - Auto‑copy URL + optional auto‑apply to the current image
  - Home preview shows checkerboard behind images to reveal transparent areas

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

## 🔧 Optional ImgBB Setup

- Get an ImgBB API key (Resources tab has a button linking to api.imgbb.com)
- Open the Resources tab → paste your key → Save Key
- In the Home tab, the Quick Image Uploader will use this key

---

## 🧭 How to use

- Home tab
  - Paste an image URL and click “Set New Image”, or
  - Use the Quick Image Uploader to paste/drag/click → Upload → Auto‑set
  - Toggle “Enable Redirect” when you’re ready to apply on YoWorld

---

## 🔒 Permissions

Minimal and explicit:
- `storage` - Saves user settings and state (theme, selected view mode, uploader preferences, redirect state, board/tool data)
- `declarativeNetRequest` - Applies redirect rules used by the paint-board workflow
- `declarativeNetRequestWithHostAccess` - Allows redirect rules to operate on approved host patterns
- `sidePanel` - Enables opening and running YoWorld Paint in Chrome Side Panel mode
- Host permissions:
  - `https://*.facebook.com/*`
  - `https://*.fbcdn.net/*`
  - `https://*.yoworld.com/*`
  - `https://yoworld.com/*`
  - `https://api.imgbb.com/*`
- Optional host permissions, requested only when the related feature is used:
  - `https://picrd.com/*` (requested on the first Picrd Quick Upload)

---

## 🔒 Privacy

- No analytics or tracking
- No sale of personal data
- No background collection of browsing history
- Data is only sent to external services when required by user actions:
  - Picrd (default Quick Upload host, only when you upload an image)
  - ImgBB API (only when you select ImgBB and upload an image)
  - YoWorld services (only while using the Paint Board apply/redirect workflow)
  - wsrv.nl image relay (only for previewing and applying the public image link selected by the user)
- Settings/state are stored in Chrome extension storage:
  - `chrome.storage.sync` (preferences such as theme, view mode, API key)
  - `chrome.storage.local` (runtime/state values needed for extension behavior)
- [Live Privacy Policy](https://gothicka-yw.github.io/YoWorld_Paint/privacy-policy.html)
- See `PRIVACY_POLICY.md` for the repository copy and complete permission details

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
  - Use Picrd, the default Quick Upload host in v3.5.8 and later. ImgBB remains available, with its preview routed through a compatibility image cache.
- “ImgBB key missing” warning
  - Set your API key in Resources → Save Key

---

## � Feedback & Support

- Report bugs or request features: ywa.paint@gmail.com
- Support development: https://buymeacoffee.com/ywpaint

---

## 📄 License

Fan tool provided as‑is, with no warranty. Not affiliated with YoWorld or BVG.
