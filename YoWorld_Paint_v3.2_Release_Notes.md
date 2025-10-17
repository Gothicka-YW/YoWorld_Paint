
# YoWorld Paint v3.2 Release Notes

**Release Date:** 2025-10-16

## Improvements
- New Sales Boards capture (3×2 from YoWorld Info)
  - Pick a card on yoworld.info and capture 6 items starting at your pick
  - Tight crop (top) with safe bottom padding for captions
  - Preview and Export to 390×260 PNG
  - Buttons: Pick, Reset, Preview, Export, Restore
- Sales Boards picker now reliably selects the full card container, even with manual text/captions present
- Selector logic is generalized to capture all cards in the grid, fixing “No selector. Use pick.” errors
- Selector picking works on templates and mid-list (uses picked index)
- Flexible sibling/descendant heuristics for repeating cards
- Connection reliability: fixes for “Receiving end does not exist” via on-demand injection
- UI polish: smaller centered tabs, internal red scrollbar, tighter spacing
- Footer shown only in Resources, with tighter spacing
- Added inline “How to Use” expanders on Sales Boards and Create Boards; removed duplicate FAQ bullets
- Debug logging removed for release

## How to Update
- Reload the extension in Chrome after updating.
- Use the Pick Card Selector in the Sales Boards tab to select any card in the grid, regardless of extra text/captions.
- Preview and Export will now work reliably for all layouts.

## Other Notes
- No changes to privacy policy or data handling; extension remains local-only and does not collect personal data.
- See CHANGELOG.md and README.md for full details.

---
For questions or feedback, contact: gothicka.ywa@gmail.com
