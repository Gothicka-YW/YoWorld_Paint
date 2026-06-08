# YoWorld Paint v3.5 Release Notes

Release date: 2026-04-25

Current maintenance refresh: 2026-06-08

## Highlights

- Transparency Mode now uses direct PNG loading plus a save-compatible helper image.
- Redirect/save routing no longer depends on YoWorld.info or `api.yoworld.info`.
- Legacy stored YoWorld.info proxy URLs are migrated back to their original image URL on startup.
- Automatic multiboard handling is enabled without extra Home tab controls.
- Copy Redirect Trace and Clear Trace were removed from the Home tab release UI.
- Side Panel support remains available.
- Sales Boards and the YoWorld Info capture workflow remain retired.

## Home

- Quick Image Uploader supports paste, drag/drop, and file input.
- ImgBB remains the supported upload host.
- Transparent direct PNGs can generate a hidden helper image for YoWorld's final save step.
- Home preview uses a checkerboard to make transparent areas visible.
- Oversized images are routed to Image Splitter when Resize is off.

## Tools

- Board Size Calculator calculates target pixel dimensions from board counts.
- Image Splitter creates 390 x 260 board tiles.
- Tiles can be downloaded individually or as a ZIP.
- Checkerboard previews show transparency.

## Transform

- Left/right perspective presets remain available.
- Optional 390 x 260 resize.
- Optional multitile output for board sets.

## Permissions

- Removed `https://api.yoworld.info/*`.
- Current host permissions cover YoWorld, ImgBB direct images, ImgBB API uploads, Facebook/fbcdn image sources, and standard YoWorld domains.

## How To Update A Local Unpacked Build

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click Update, or remove/reload the unpacked `YoWorld_Paint` folder.
4. Confirm the extension still shows version `3.5`.

## Notes

- No analytics or tracking.
- Uploads go to ImgBB only when the user chooses to upload.
- Paint-board redirect rules are temporary workflow rules, not a background browsing monitor.
