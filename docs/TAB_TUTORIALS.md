# YoWorld Paint v3.5.11 Tab Tutorials

These tutorials cover the current Side Panel and Popup interfaces. Side Panel is the recommended default, but the controls work the same way in both views.

## Home Tab

Use Home to upload an image, set its direct link, preview it, and apply it to a YoWorld Paint Board.

1. Leave **Picrd** selected for free uploading without an API key, or select **ImgBB** after saving an API key in Resources.
2. Paste, drop, or select an image.
3. Leave **Game-ready 390×260** enabled when the image should be fitted to one board without stretching.
4. Leave **Clean faint transparency** off to preserve soft glow and translucent details. Enable it only when faint hidden color becomes a solid haze in YoWorld.
5. Leave **Auto-set as Current Image** enabled if the uploaded link should immediately become the active image.
6. Click **Upload**. You can also paste an existing direct image link into the URL field and click **Set New Image**.
7. Turn on **Enable Redirect**, open the Paint Board, and complete the first Save/OK. Turn Redirect off after that save finishes.

Troubleshooting:

- If Picrd asks for permission, approve it once and retry the upload.
- If ImgBB reports a missing key, save and test the key in Resources.
- If the saved board loses its image, repeat the first save while Redirect remains enabled.

## Sales Boards Tab

Use Sales Boards to capture six item cards from YoWorld Info as a 3×2 board.

1. Open [YoWorld Info's template page](https://yoworld.info/template), enable its template preview, and size the page so three cards appear per row.
2. Click **Pick Card Selector**. The first time, Chrome may request one-time Sales Boards website access; approve it to allow selection and visible-tab capture.
3. Click the first item card in the desired six-item group.
4. Click **Preview (3×2)** and confirm the 390×260 preview.
5. Click **Export (Crop)** to download the board.
6. Use **Restore List** to return to the saved scroll position, or **Reset Selectors** before choosing a different layout.
7. Upload the exported PNG from Home.

Troubleshooting:

- Keep `yoworld.info/template` as the active tab while picking or previewing.
- Reload the YoWorld Info page if the selector helper cannot be reached.
- If fewer than six cards are found, adjust the page to three cards per row and pick the first card again.

## Transform Tab

Use Transform to make a slanted in-game screenshot appear front-facing.

1. Select, drop, or paste an image.
2. Choose **Load Left Preset** or **Load Right Preset** for the board's current facing direction.
3. Enable **Resize to 390×260** for a single-board result, or enable **Multi-tile output** for a larger transformed image.
4. Adjust the matrix values only when the preset needs fine-tuning.
5. Click **Apply**, inspect the preview, then use **Export PNG**, **Export All Tiles**, or **Copy**.
6. Click **Clear** to begin again.

## Tools Tab

Use Tools to calculate a multi-board canvas and split artwork into 390×260 tiles.

1. Enter the number of boards wide and high. The calculator displays the required total pixel size.
2. Prepare artwork at that target size for the cleanest result.
3. Select, drop, or paste the image into **Image Splitter**.
4. Enable **Scale to target size** only when you want the extension to resize the source to the calculated grid.
5. Click **Split into tiles**.
6. Download or copy individual tiles, or click **Download ZIP** for the complete set.

Tip: Tile order runs left-to-right and then top-to-bottom.

## FAQ Tab

FAQ contains the short in-extension instructions for Quick Upload, manual hosting, redirect timing, image hosting, and transparency cleanup. Review this tab when an image applies differently in YoWorld than it appears in the source preview.

## Resources Tab

Resources contains current YoWorld Paint links and saved preferences.

- **Useful Links:** Open the Chrome Web Store listing, YoWorld Info Sales Board template, Privacy Policy, image generators, editors, and hosts.
- **Uploader Settings:** Save and test an optional ImgBB API key. Picrd remains the default and needs no API key.
- **Default View:** Choose Side Panel or Popup for future toolbar clicks.
- **Theme:** Choose the interface color theme; Chrome sync stores the selection.

## Privacy and Permissions

- Sales Boards asks once for optional website access because Chrome requires it for visible-tab capture from a persistent Side Panel.
- The capture runs only after a Sales Boards action and is processed locally for preview/export.
- Picrd access is requested only when a Picrd upload starts.
- See the packaged `PRIVACY_POLICY.md` or the Privacy Policy link in Resources for the full policy.
