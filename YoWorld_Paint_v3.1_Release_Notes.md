# YoWorld Paint v3.1 --- Release Notes

### Release Date

October 2025

------------------------------------------------------------------------

## 🧩 Overview

**YoWorld Paint v3.1** refines the creative workflow for YoWorld players
who design in-game boards, sales boards, and upload art through
Uploadcare or Cloudinary.\
This update focuses on UI polish, stability improvements, and
quality-of-life changes that make editing and exporting faster and more
reliable.

------------------------------------------------------------------------

## ✨ New Features

-   **Expanded Font Integration**\
    Added more TTF fonts for creative text customization on boards.

-   **Overhauled Uploadcare/Cloudinary Handling**\
    Improved upload reliability, progress tracking, and error handling.

-   **Refined Board Layout Engine**\
    Adjusted 390×260 scaling for consistent alignment across all board
    types.

-   **Improved PNG Export Stability**\
    Reduced lag and timeout risk on large or detailed board exports.

-   **Enhanced Browser Compatibility**\
    Added fallback support for restricted permission environments to
    ensure functionality even when host access is limited.

------------------------------------------------------------------------

## 🎨 UI & UX Improvements

-   Refined dark maroon palette for hover and press states (`#520404`,
    `#3A0303`, `#240101`).\
-   Improved tab padding, spacing, and hover borders.\
-   Unified font sizing and tab alignment for a cleaner popup
    interface.\
-   FAQ and Sales Boards panels now load faster and retain scroll
    position.\
-   Adjusted image preview spacing for improved visibility and balance.

------------------------------------------------------------------------

## ⚙️ Quality of Life Updates

-   Auto-saves user designs to `chrome.storage.local` between sessions.\
-   Faster popup load times and improved resource caching.\
-   Optimized drag, resize, and placement responsiveness within the
    canvas.\
-   Added internal delay throttling to prevent rapid image API calls.

------------------------------------------------------------------------

## 🐞 Bug Fixes

-   Fixed **duplicate upload triggers** on slower networks.\
-   Fixed **alignment bug** when resizing under 200×200 pixels.\
-   Fixed **Sales Board border render** issue when using custom fonts.\
-   Fixed **"image not found"** errors on saved board URL retrieval.\
-   Fixed **tab memory persistence** after popup reload.

------------------------------------------------------------------------

## 🧱 Base Version

**Built on:** YoWorld Paint v2.3 (fonts added TTF)

Carried forward baseline improvements:\
- Stable FAQ tab layout\
- Normalized tab widths\
- Persistent footer disclaimer\
- Square-corner UI design and dark red hover tones

------------------------------------------------------------------------

## 🗂 File Information

**Package:** `YoWorld_Paint v3.1.zip`\
**Type:** Chrome Extension (Manifest v3)\
**Purpose:** Design, edit, and export YoWorld boards for in-game use and
community sharing.

------------------------------------------------------------------------

## 🕰 Version History

  -----------------------------------------------------------------------
         Version         Highlights                   Status
  ---------------------- ---------------------------- -------------------
         **v1.0**        Initial concept build for    Legacy
                         YoWorld Paint                

         **v2.0**        Introduced Sales Boards and  Stable
                         How-To tab                   

         **v2.1**        Tab width normalization, new Stable
                         popup layout, footer         
                         disclaimer                   

         **v2.2**        Visual refresh, restored     Stable
                         on/off switch, FAQ redesign  

         **v2.3**        Added TTF font support and   Stable
                         fixed scaling issues         

         **v3.1**        Font expansion, upload       Current
                         stability, and UI polish     
  -----------------------------------------------------------------------
