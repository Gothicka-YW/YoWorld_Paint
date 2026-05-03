# YoWorld Paint v3.5 — Release Notes

Release date: 2026-04-25

Highlights (includes v3.4 + v3.5 updates)
v3.5 specific changes
- Removed experimental "Glow Fix" feature from Home tab
  - The old workaround is no longer needed
  - Glow/dithering preservation is no longer an active issue for the current Home upload path
  - Direct ImgBB PNG handling now preserves transparency and image quality much more reliably in-game
  - Version bump: manifest version/name and UI title updated to 3.5
- Added side panel manifest support and permission (`side_panel` + `sidePanel`)

- New Tools tab
  - Board Size Calculator (boards wide/high -> target pixels)
  - Image Splitter with scale toggle (fit to grid) or natural tiling
  - Drag/drop/paste input; checkerboard thumbs to see transparency
  - Download tiles individually or as a ZIP (store, no compression)
  - Clear button and saved state so tiles persist after closing the popup
- Home preview now shows a checkerboard under images to reveal transparent regions
- Create Boards tab retired; renamed to Transform with a note to use Sales Boards for captures or Tools for splitting/warping
- Popup widened to 540px and keeps the themed look from 3.2.1
- Added Side Panel view support
  - Extension can open as a traditional popup or in Chrome Side Panel
  - Side panel uses a dedicated full-height UI with responsive layout
- Added View Mode preference in Resources tab
  - Choose Popup or Side Panel in "Preferred View"
  - Preference is saved and applied for future use
- Theme support works across both popup and side panel views



How to update
1) In chrome://extensions, turn on Developer mode.
2) Click "Update" if already loaded, or "Load unpacked" and select the YoWorld_Paint folder.
3) Confirm the popup header shows v3.5 and extension details show version 3.5.

Notes
- No analytics or tracking. Uploads only go to ImgBB when you choose to upload; other state lives in Chrome storage.
- ZIP export uses a hand-rolled store archive (no compression) to avoid MV3 restrictions.