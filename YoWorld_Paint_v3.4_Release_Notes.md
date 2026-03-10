# YoWorld Paint v3.4 — Release Notes

Release date: 2026-02-10

Highlights (includes v3.3 + v3.4 updates)
- New Tools tab
  - Board Size Calculator (boards wide/high -> target pixels)
  - Image Splitter with scale toggle (fit to grid) or natural tiling
  - Drag/drop/paste input; checkerboard thumbs to see transparency
  - Download tiles individually or as a ZIP (store, no compression)
  - Clear button and saved state so tiles persist after closing the popup
- Home preview now shows a checkerboard under images to reveal transparent regions
- Create Boards tab retired; renamed to Transform with a note to use Sales Boards for captures or Tools for splitting/warping
- Popup widened to 540px and keeps the themed look from 3.2.1

v3.4 specific changes
- Removed experimental "Glow Fix" feature from Home tab
  - Feature was designed to preserve dither/glow effects by converting semi-transparent pixels
  - Did not reliably work when images were uploaded to YoWorld paint boards
  - Currently investigating better approaches similar to Fiddler's method
- Version bump: manifest version/name and UI title updated to 3.4

How to update
1) In chrome://extensions, turn on Developer mode.
2) Click "Update" if already loaded, or "Load unpacked" and select the YoWorld_Paint folder.
3) Confirm the popup header shows v3.4 and extension details show version 3.4.

Notes
- No analytics or tracking. Uploads only go to ImgBB when you choose to upload; other state lives in Chrome storage.
- ZIP export uses a hand-rolled store archive (no compression) to avoid MV3 restrictions.
- Working on improved solution for handling dithered/glow images that will work properly with YoWorld's upload system.
