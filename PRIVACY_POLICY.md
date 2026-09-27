# YoWorld Paint Privacy Policy

Last updated: 2026-09-27

YoWorld Paint is a Chrome extension fan tool for creating and applying paint/sales board images. This policy explains what data is processed, why permissions are used, and what is not collected.

## Summary

- No analytics or tracking.
- No sale of personal data.
- No third-party ad SDKs.
- Data is only processed to provide extension features requested by the user.

## Data We Process

YoWorld Paint may process the following data only as needed for functionality:

- Image links you enter or generate
- Images you choose to paste, drop, or upload
- The visible portion of the active tab when you explicitly create a Sales Boards preview; this screenshot is processed locally and is not uploaded by the capture feature
- User preferences/settings (theme, view mode, uploader settings, API key)
- Temporary state needed for board generation, preview, tools, and redirect workflows

## Where Data Is Stored

- `chrome.storage.sync`
  - Used for cross-device preference sync where available (for example: theme, view mode, uploader settings, API key)
- `chrome.storage.local`
  - Used for local runtime/state values required by extension features

## External Services and Network Use

Data is sent externally only when necessary for user-initiated features:

- Picrd API (`https://picrd.com/*`)
  - Default Quick Upload host; receives only images the user explicitly uploads and returns an unlisted direct link
- ImgBB API (`https://api.imgbb.com/*`)
  - Used only when the user selects ImgBB and uploads an image via Quick Upload
- wsrv.nl image cache (`https://wsrv.nl/*`)
  - Used only for public ImgBB image links during an enabled paint-board redirect, to avoid an incompatible server-to-server ImgBB fetch
- YoWorld / YoWorld Info domains
  - Used for page integration, capture, and redirect-related functionality

The extension does not continuously transmit browsing activity.

## Permissions and Why They Are Required

The extension requests the following permissions in `manifest.json`:

- `storage`
  - Save settings and feature state.
- `scripting`
  - Run extension scripts on supported pages when required by user actions.
- `declarativeNetRequest`
  - Manage redirect rules used by paint-board workflow behavior.
- `declarativeNetRequestWithHostAccess`
  - Allow declarative network rules on approved hosts.
- `activeTab`
  - Perform tab-scoped actions after user interaction.
- `sidePanel`
  - Enable Side Panel mode.

Host permissions:

- `https://*.facebook.com/*`
- `https://*.fbcdn.net/*`
- `https://*.yoworld.com/*`
- `https://api.yoworld.info/*`
- `https://yoworld.com/*`
- `https://api.imgbb.com/*`

Optional host permissions, requested only when the related feature is used:

- `<all_urls>` (requested once when the user first uses Sales Boards; Chrome requires it for the yoworld.info selector and visible-tab capture from a persistent Side Panel)
- `https://picrd.com/*` (requested on the first Picrd Quick Upload)

## Content Script Scope

The extension does not run an always-on content script and does not inspect browsing activity in the background. When you first use Sales Boards, Chrome may ask once for website access. This optional grant lets the extension run its packaged selector helper on the active yoworld.info tab and use Chrome's visible-tab screenshot API from the persistent Side Panel. Capture happens only after you press a Sales Boards button. The screenshot is processed locally to create the preview/export and is not collected or transmitted by the capture feature. Chrome may also ask once for access to picrd.com when you start a Picrd upload.

## Data Retention

Data remains in Chrome extension storage until:

- You change/remove values in the extension UI,
- You clear extension storage,
- Or you uninstall the extension.

## Children’s Privacy

YoWorld Paint is not directed to children under 13 and does not knowingly collect personal information from children.

## Changes to This Policy

This policy may be updated as features evolve. The "Last updated" date reflects the latest revision.

## Contact

Questions or requests:

- Email: ywa.paint@gmail.com
