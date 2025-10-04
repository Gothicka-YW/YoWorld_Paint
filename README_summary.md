# [ARCHIVED] YoWorld Paint v2.2 — Upload Pipeline Fixes (Session Summary)

> Note: This document is historical and reflects a v2.2-era provider setup (Uploadcare/Cloudinary/Catbox). As of v3.x, the extension uses an ImgBB-only uploader and this summary no longer applies to the current build.

**Date:** 2025-09-22  

This document summarizes what we fixed and what we attempted for the **Sales Boards (Tab 2)** upload flow and the **Send to Home** pathway.

---

## Current Working Build
This archive: `YWP_v2.2_provider_uploads_branch_no_imgur_HOTFIX7.zip`

**Provider order used by “Send to Home”:**
1. **Uploadcare** — REST API (`https://upload.uploadcare.com/base/`), CDN URLs shaped as  
   `https://ucarecdn.com/<uuid>/board.png`  
   - Uses `UPLOADCARE_STORE=1` so files persist.  
   - Added filename segment to URLs.  
   - Added CDN reachability probe with auto-fallback.
2. **Cloudinary** (unsigned preset)  
3. **Catbox** — proxied through `images.weserv.nl` to avoid black canvas.

---

## Resources Tab (Uploader Settings)
Now contains only:  
- **Uploadcare Public Key (optional)**  
- **Cloudinary Cloud Name (optional)**  
- **Cloudinary Unsigned Preset (optional)**  

Removed: **Imgur Client ID** (UI + logic + manifest hosts).

---

## Fixes Applied
- Patched **Send to Home** to use `uploadPreferred(blob)` instead of `uploadImageWithFallback(blob)`.  
- Fixed `uploadViaUploadcare`:  
  - Forced `UPLOADCARE_STORE=1`  
  - Added filename in returned URL  
  - Added image probe to confirm CDN link works, else fallback  
- Removed broken ES module import in `sales.js` that broke preview rendering.  
- Removed Imgur branches, alerts, and UI.  
- Updated alert message:  
  - **Old:** “Upload failed or Imgur Client ID missing. Set it in Resources.”  
  - **New:** “Upload failed. Check Resources settings or try again.”  

---

## Known Notes
- If Uploadcare trial/project is expired or delivery restricted, the probe fails and fallback is used automatically (Cloudinary → Catbox).  
- Catbox direct links still need proxy wrapping for correct rendering — already in place.  

---
