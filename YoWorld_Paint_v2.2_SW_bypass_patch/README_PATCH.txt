YoWorld Paint v2.1 — SW Bypass Patch (keep the full v2.1 UI)
============================================================

What this does
--------------
This patch adds a tiny content script that rewrites the game's paint_board image *in the page*
so it no longer depends on yoworld.info (no proxy, no CORS). It uses the same "Enable Redirect"
toggle and image URL you already set in the YoWorld Paint popup.

What's included
---------------
- ywp-sw-bypass.js              ← the content script injected on https://yoworld.com/*
- ywp-bypass-bootstrap.js       ← runs in the popup to register/unregister the content script

How to apply to your existing v2.1
----------------------------------
1) Drop the two JS files above into your extension folder (same level as popup.html).
   Your layout will look like this afterwards:
     /popup/popup.html
     /popup/popup.css
     /popup/popup.js
     /popup/sales-tab.js
     /popup/resizer.js
     /popup/ywp-links-override.js
     /ywp-bypass-bootstrap.js        <-- NEW
     /ywp-sw-bypass.js               <-- NEW
     /background.js
     /manifest.json
     ...etc.

2) Edit **popup/popup.html** and add this line near the existing script tags (before </body>):

     <script src="../ywp-bypass-bootstrap.js"></script>

   (If your scripts are all in the root next to popup.html, adjust the relative path accordingly.
    The goal is simply to load ywp-bypass-bootstrap.js when the popup opens.)

3) Edit **manifest.json** and ensure these are present:
   - "permissions": include "scripting" (and "storage" if not already there)
   - "host_permissions": include "https://yoworld.com/*"

   Example fragment to merge:
   {
     "permissions": ["storage", "scripting"],
     "host_permissions": ["https://yoworld.com/*"]
   }

4) Reload the extension at chrome://extensions, re-open the popup, toggle **Enable Redirect** ON,
   paste your direct image link, click **Set New Image**, then reload the game.

Advanced: dynamic host permission
---------------------------------
The bootstrap will request host permission for https://yoworld.com/* on first run if not already allowed.

Uninstall / revert
------------------
- Remove the two new files and the <script> tag from popup.html, then reload the extension.

Tested flow (Chrome 118+ / MV3)
-------------------------------
- Popup shows your image preview.
- Game room requests the /user/images/paint_board/... URL → page script swaps it
  to your Imgur URL (with a cache-buster) at document_start.
- No service-worker or CORS dependency; the board image changes immediately on refresh.

Patch built: 2025-08-31T14:38:13.040867Z
