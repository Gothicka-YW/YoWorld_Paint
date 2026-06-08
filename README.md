# YoWorld Paint v3.5

YoWorld Paint is a Chrome extension fan tool for YoWorld players. It helps create, upload, preview, split, transform, and apply custom paint-board images.

Community fan tool. Not affiliated with YoWorld or Big Viking Games.

## What's New In v3.5

- Transparency Mode uses direct PNG loading for cleaner transparent artwork.
- Transparent uploads generate a save-compatible helper image automatically when needed.
- Paint-board save routing no longer depends on YoWorld.info or `api.yoworld.info`.
- Automatic multiboard support is built in; there are no extra "Apply to Multiple Boards" controls.
- Copy Redirect Trace and Clear Trace were removed from the Home tab for a cleaner release UI.
- The old Sales Boards / YoWorld Info capture flow remains retired.
- Side Panel mode is supported and remains recommended for longer sessions.

## Main Features

- Home
  - Set an image URL manually.
  - Upload by paste, drag/drop, or file picker through Quick Image Uploader.
  - Preview artwork on a checkerboard background.
  - Use Transparency Mode for PNG artwork with transparency.
  - Apply artwork to one or more YoWorld paint boards through Redirect.

- Quick Image Uploader
  - Uses ImgBB with your saved API key.
  - Prepares board-sized PNGs for reliable saves.
  - Sends oversized images to Tools > Image Splitter when Resize is off.
  - Creates a hidden save-compatible helper for transparent direct PNGs.

- Tools
  - Board Size Calculator.
  - Image Splitter for 390 x 260 board tiles.
  - Tile previews with checkerboard transparency.
  - Download individual tiles or a ZIP.

- Transform
  - Perspective presets for left/right board angles.
  - Optional 390 x 260 resize.
  - Optional multitile output.

- Resources
  - ImgBB API key setup.
  - Popup or Side Panel view mode.
  - Theme selection.

## Install

1. Download or clone this repository.
2. Open Chrome and go to `chrome://extensions`.
3. Enable Developer mode.
4. Click Load unpacked.
5. Select the `YoWorld_Paint` folder.

The extension icon should appear in your toolbar.

## ImgBB Setup

1. Create or log in to an ImgBB account.
2. Open YoWorld Paint > Resources.
3. Click Get your API key here.
4. Copy your ImgBB API key.
5. Paste it into Uploader Settings.
6. Click Save Key.

Quick Image Uploader uses this key only when you choose to upload an image.

## Applying An Image To A Paint Board

1. In Home, choose or upload an image.
2. Turn on Enable Redirect.
3. In YoWorld, open the paint board and press OK.
4. Return to YoWorld Paint and turn off Enable Redirect.
5. Reopen the same board in YoWorld and press OK once more to lock in the saved board image.

For multiple boards, repeat the board OK step on each board while Redirect is on, then turn Redirect off and lock in each touched board. Multiboard handling is automatic.

## Transparency Mode

Transparency Mode is designed for direct ImgBB PNGs with transparent or semi-transparent pixels.

- Direct PNG preview keeps transparency cleaner while Redirect is on.
- A save-compatible helper is generated for YoWorld's final save step.
- The helper avoids the old YoWorld.info proxy dependency.
- Some very soft alpha edges may still need tuning image by image, but the current helper is adaptive and works better across light and dark edges.

## Windows Crop Workflow

The old Sales Boards tab is retired. The replacement workflow is:

1. Use Windows crop/snipping to capture exactly what you want.
2. Paste into Home > Quick Image Uploader.
3. Upload and auto-set the image.
4. Apply it to a board with the normal Redirect workflow.

Windows shortcut: `Shift + Ctrl + S`

Mac clipboard screenshot shortcut: `Cmd + Ctrl + Shift + 4`

## Permissions

- `storage`: saves settings and extension state.
- `declarativeNetRequest`: applies paint-board redirect rules.
- `declarativeNetRequestWithHostAccess`: allows redirect rules on approved hosts.
- `declarativeNetRequestFeedback`: keeps internal troubleshooting diagnostics available.
- `sidePanel`: enables Chrome Side Panel mode.

Host permissions:

- `https://*.facebook.com/*`
- `https://*.fbcdn.net/*`
- `https://i.ibb.co/*`
- `https://i.imgbb.com/*`
- `https://*.yoworld.com/*`
- `https://yoworld.com/*`
- `https://api.imgbb.com/*`

YoWorld Paint does not require `api.yoworld.info`.

## Privacy

- No analytics.
- No tracking.
- No sale of personal data.
- No background collection of browsing history.
- Images are sent to ImgBB only when you upload through Quick Image Uploader.
- Redirect rules are used only for the paint-board workflow.
- Settings and runtime state are stored in Chrome extension storage.

See `PRIVACY_POLICY.md` for the full policy.

## Troubleshooting

- If a newly uploaded transparent image still shows old edge behavior, reload the unpacked extension and upload again so a fresh helper image is generated.
- If a board seems stuck, turn Redirect off, wait a few seconds, refresh YoWorld, and try clearing or replacing the board again.
- If Quick Upload fails, confirm your ImgBB API key in Resources.
- If a source is larger than one board, use Tools > Image Splitter for sharper multiboard output.

## Feedback And Support

- Email: `ywa.paint@gmail.com`
- Support development: `https://buymeacoffee.com/ywpaint`

## License

Fan tool provided as-is, with no warranty. Not affiliated with YoWorld or Big Viking Games.
