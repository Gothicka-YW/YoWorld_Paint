# YoWorld Paint v3.4 — Release Notes

Release date: 2026-02-10

Changes
- Removed experimental "Glow Fix" feature from Home tab
  - Feature was designed to preserve dither/glow effects by converting semi-transparent pixels
  - Did not reliably work when images were uploaded to YoWorld paint boards
  - Currently investigating better approaches similar to Fiddler's method
- Version bump: manifest version/name and UI title updated to 3.4
- All other v3.3 features remain unchanged

How to update
1) In chrome://extensions, turn on Developer mode.
2) Click "Update" if already loaded, or "Load unpacked" and select the YoWorld_Paint folder.
3) Confirm the popup header shows v3.4 and extension details show version 3.4.

Notes
- No analytics or tracking. Uploads only go to ImgBB when you choose to upload; other state lives in Chrome storage.
- ZIP export uses a hand-rolled store archive (no compression) to avoid MV3 restrictions.
- Working on improved solution for handling dithered/glow images that will work properly with YoWorld's upload system.
