# YoWorld Paint Privacy Policy

Last updated: 2026-06-08

YoWorld Paint is a Chrome extension fan tool for creating and applying paint board images. This policy explains what data is processed, why permissions are used, and what is not collected.

## Summary

- No analytics or tracking.
- No sale of personal data.
- No third-party ad SDKs.
- Data is processed only to provide extension features requested by the user.

## Data We Process

YoWorld Paint may process the following data only as needed for functionality:

- Image links you enter or generate.
- Images you choose to paste, drop, or upload.
- User preferences and settings, including theme, view mode, uploader settings, and ImgBB API key.
- Temporary state needed for board preview, tools, transformation, upload, and redirect workflows.

## Where Data Is Stored

- `chrome.storage.sync`
  - Used for cross-device preference sync where available, such as theme, view mode, uploader settings, and API key.
- `chrome.storage.local`
  - Used for local runtime/state values required by extension features.

## External Services And Network Use

Data is sent externally only when necessary for user-initiated features:

- ImgBB API (`https://api.imgbb.com/*`)
  - Used only when you upload an image through Quick Image Uploader or when YoWorld Paint creates a save-compatible helper for a direct transparent ImgBB PNG.
- YoWorld domains
  - Used only for the paint-board redirect workflow while applying artwork to boards.
- Direct image hosts allowed by the extension, such as ImgBB direct image hosts
  - Used for previewing and redirecting images selected by the user.

YoWorld Paint does not depend on YoWorld.info or `api.yoworld.info`, and it does not continuously transmit browsing activity.

## Permissions And Why They Are Required

The extension requests the following permissions in `manifest.json`:

- `storage`
  - Save settings and feature state.
- `declarativeNetRequest`
  - Manage redirect rules used by the paint-board workflow.
- `declarativeNetRequestWithHostAccess`
  - Allow declarative network rules on approved hosts.
- `declarativeNetRequestFeedback`
  - Support internal troubleshooting diagnostics for rule behavior.
- `sidePanel`
  - Enable Chrome Side Panel mode.

Host permissions:

- `https://*.facebook.com/*`
- `https://*.fbcdn.net/*`
- `https://i.ibb.co/*`
- `https://i.imgbb.com/*`
- `https://*.yoworld.com/*`
- `https://yoworld.com/*`
- `https://api.imgbb.com/*`

## Content Script Scope

The extension does not declare persistent content scripts in the manifest.

## Data Retention

Data remains in Chrome extension storage until:

- You change or remove values in the extension UI.
- You clear extension storage.
- You uninstall the extension.

## Children's Privacy

YoWorld Paint is not directed to children under 13 and does not knowingly collect personal information from children.

## Changes To This Policy

This policy may be updated as features evolve. The "Last updated" date reflects the latest revision.

## Contact

Questions or requests:

- Email: `ywa.paint@gmail.com`
