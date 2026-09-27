# YoWorld Paint v3.5.2 — Popup Recovery

Release date: September 11, 2026

This release repairs extension opening after the previous Chrome Web Store update.

## What changed

- Popup mode is restored as the safe default and fallback.
- Side Panel mode now configures the toolbar action correctly and persists across browser restarts.
- The extension no longer requires blanket yoworld.info page access just to update or open.
- Sales Boards uses temporary active-tab access. If a persistent Side Panel session needs yoworld.info access, Chrome asks for that site only when the feature is used.
- An unused network-debugging permission was removed.
- Obsolete duplicate Tools markup is removed before the interface is initialized.
- The visible version and manifest version now agree at v3.5.2.

## If Chrome disabled the previous version

Open `chrome://extensions`, find YoWorld Paint, and enable it once. Chrome may have disabled the earlier update because it added required site access. After v3.5.2 is installed and enabled, future opening does not depend on that required yoworld.info permission.
