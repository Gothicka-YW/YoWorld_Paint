# YoWorld Paint v3.5 Maintenance Summary

Last updated: 2026-06-08

This document describes the current extension structure after legacy cleanup and the v3.5 transparency/routing maintenance work.

## Active User-Facing Tabs

- Home
  - Redirect controls.
  - Transparency Mode.
  - Image preview and direct URL input.
  - Quick Image Uploader.
- Transform
  - Perspective presets and tile export.
- Tools
  - Board Size Calculator and Image Splitter.
- FAQ
  - Current upload and board-save guidance.
- Resources
  - ImgBB API key, view mode, themes, and useful links.

## Retired Features

- Sales Boards tab.
- YoWorld Info capture workflow.
- Create Boards tab.
- Glow Fix experiment.
- Copy Redirect Trace and Clear Trace Home controls.
- Manual Apply to Multiple Boards / Finish Applying controls.

## Current Routing

- The service worker uses Chrome Declarative Net Request rules.
- Direct transparent ImgBB PNGs are used for high-quality preview routing.
- Transparent images can receive a hidden save-compatible helper.
- Multiboard handling is automatic.
- Routing no longer depends on YoWorld.info or `api.yoworld.info`.
- Old stored proxy URLs are migrated back to their original image URL.

## Required Files

- `background.js`
  - Redirect rules, board tracking, finalization, migration, and internal diagnostics.
- `popup/popup.html`
  - Popup UI.
- `popup/sidepanel.html`
  - Side Panel UI.
- `popup/popup.js`
  - Navigation, themes, and shared UI behavior.
- `popup/tabs/home.js`
  - Home workflow, uploads, transparent helper generation, and preview behavior.
- `popup/tabs/transform.js`
  - Perspective transformation.
- `popup/tabs/tools.js`
  - Calculator, splitter, and ZIP export.
- `popup/tabs/resources.js`
  - ImgBB API key management.
- `src/`
  - Active uploader and settings modules. Do not remove.

## Release Checks

1. Reload the unpacked extension.
2. Confirm popup and Side Panel headers display v3.5.
3. Test Quick Image Uploader.
4. Test a transparent PNG through the Redirect ON/OFF lock-in workflow.
5. Test replacing and erasing a board.
6. Test the same image on multiple boards.
7. Test refresh and extension restart persistence.
8. Confirm active redirect rules do not contain `api.yoworld.info`.
9. Confirm the Home tab does not display trace controls.

## Notes

- Historical changelog entries may mention retired features because they document older releases.
- Current behavior is defined by the v3.5 section of the changelog, README, release notes, and current in-app FAQ.
