# YoWorld Paint v3.5.15

**Release date:** October 8, 2026

## Chromium Browser Compatibility

- Adds a universal Popup fallback for browsers that do not implement Chrome's Side Panel API.
- Keeps Side Panel as the default experience on compatible Chrome and Microsoft Edge versions.
- Prevents unsupported side-panel calls from leaving the toolbar icon blank or unresponsive.
- Uses synchronized extension storage when available and automatically falls back to local extension storage otherwise.
- Disables the Side Panel setting when the current browser cannot provide it.
- Adds a clear compatibility message if the redirect API is unavailable.
- Improves compatibility with Opera, Opera GX, Brave, Vivaldi, and other current Chromium-based desktop browsers.

## Unchanged Core Behavior

- Picrd remains the default free upload host, with ImgBB available as an optional API-key host.
- Game-ready uploads remain 390×260 and retain the v3.5.14 save-safe image preparation and perceptual quality improvements.
- The Paint Board redirect remains limited to GET requests so YoWorld save/update requests are not redirected.
- The extension remains independent of YoWorld Info.
- No new permissions, analytics, tracking, backend, or external compression service were added.

## Installation

Install `YoWorld_Paint_v3.5.15.zip` through the Chrome Web Store or load the extracted folder from the browser's Extensions page in Developer mode.

Fan-made tool. Not affiliated with YoWorld or Big Viking Games (BVG).
