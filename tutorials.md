# YoWorld Paint Tutorials

## Install YoWorld Paint

1. Install from the Chrome Web Store, or load this folder unpacked for local testing.
2. Pin the YoWorld Paint icon from Chrome's Extensions menu.
3. Open YoWorld Paint from the toolbar.

## Set Up Quick Image Uploader

1. Create or log in to an ImgBB account.
2. Open YoWorld Paint > Resources.
3. Click Get your API key here.
4. Copy the ImgBB API key.
5. Paste it into Uploader Settings.
6. Click Save Key.

Quick Image Uploader uses the key only when you upload an image.

## Upload An Image From Home

1. Open Home.
2. In Quick Image Uploader, paste, drag/drop, or click to select an image.
3. Leave Resize to 390 x 260 on for the most reliable one-board save.
4. Keep Auto-set Image on if you want the uploaded image placed into the Home URL field automatically.
5. Click Upload.
6. Confirm the preview shows your image.

If Resize is off and the image is larger than one board, YoWorld Paint sends it to Tools > Image Splitter.

## Use Transparency Mode

Use Transparency Mode for PNG images with transparent or semi-transparent pixels.

1. Turn on Transparency Mode (Direct URL).
2. Upload or set a direct ImgBB PNG.
3. YoWorld Paint will keep the direct PNG for preview quality.
4. If needed, YoWorld Paint will create a hidden save-compatible helper image for the final YoWorld save step.

The helper is built by the extension and does not depend on YoWorld.info.

## Apply An Image To A YoWorld Paint Board

1. In Home, set or upload the image.
2. Turn on Enable Redirect.
3. In YoWorld, open a paint board.
4. Press OK on the paint board.
5. Return to YoWorld Paint and turn off Enable Redirect.
6. Reopen the same paint board in YoWorld and press OK again to lock it in.

If you are applying the same image to multiple boards, repeat step 4 on each board while Redirect is on. Then turn Redirect off and lock in each touched board. There are no extra multiboard controls to manage.

## Manually Set An Image URL

1. Upload your image to a direct image host.
2. Copy the direct image URL.
3. Paste the URL into the Home image field.
4. Click Set New Image.

For best transparent PNG behavior, use direct ImgBB PNG URLs. When Transparency Mode is on, YoWorld Paint can generate a save-compatible helper for direct ImgBB PNGs.

## Windows Crop Workflow

The old Sales Boards tab is retired. Use a crop-and-upload workflow instead.

1. Press `Shift + Ctrl + S`.
2. Drag around the exact area you want.
3. Paste into Home > Quick Image Uploader with `Ctrl + V`.
4. Upload and apply normally.

Mac clipboard screenshot shortcut: `Cmd + Ctrl + Shift + 4`.

## Transform Tab

1. Load the left-facing or right-facing preset.
2. Choose whether to resize to 390 x 260.
3. Use multitile output when the transformed image should cover multiple boards.
4. Upload your source image.
5. Click Apply.
6. Export the tile or tiles.
7. Upload each tile from Home and apply it to its board.

## Tools Tab

- Board Size Calculator: enter board columns and rows to get target pixel dimensions.
- Image Splitter: upload, paste, or drop an image, then split into 390 x 260 board tiles.
- Download tiles individually or as a ZIP.

## Resources Tab

- Save or test the ImgBB API key.
- Choose Popup or Side Panel view mode.
- Choose a theme.

## Troubleshooting

- If an image disappears after testing, make sure you completed the Redirect OFF lock-in step.
- If a transparent image has edge artifacts, reload the unpacked extension and upload again to generate a fresh helper.
- If a board feels stuck, turn Redirect off, wait a few seconds, refresh YoWorld, then clear or replace the board.
- If Quick Upload fails, test your ImgBB key in Resources.
