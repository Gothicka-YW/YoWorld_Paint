# YoWorld Paint v3.2 — Release Notes

Release date: 2025-10-09

Highlights
- New Sales Boards capture (3×2 from YoWorld Info)
  - Pick a card on yoworld.info and capture 6 items starting at your pick
  - Tight crop on top and safe bottom padding for captions
  - Preview and Export to 390×260 PNG
  - Buttons: Pick, Reset, Preview, Export, Restore
- Reliability & UX
  - Selector picking works on templates; starts from your picked index (mid‑list OK)
  - Fixes “Receiving end does not exist” by injecting the content script when needed
  - Tabs are smaller and centered; scrollbar is internal and red‑themed
  - Footer is shown only in Resources with tighter spacing
- Docs
  - README, Changelog, and Privacy Policy updated for v3.2

How to update
1) In chrome://extensions, toggle “Developer mode”
2) Click “Load unpacked” (or “Update” if already loaded) and select the YoWorld_Paint folder
3) Confirm the extension shows v3.2 in the popup header and in the extension details

Notes
- No analytics, tracking, or server‑side data collection. Sales Boards capture stores minimal selectors and the last picked index locally to repeat the capture reliably.
