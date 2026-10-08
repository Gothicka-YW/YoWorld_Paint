# YoWorld Paint v3.5.14 — Release Notes

Release date: 2026-10-08

## Reliable Paint Board Saving

- Fixes uploaded images disappearing after Redirect is turned off and the Paint Board is saved again.
- Prepares Game-ready uploads locally as compact 390×260 PNGs before they are sent to Picrd or ImgBB.
- Preserves an exact full-color PNG whenever it already fits the save target.
- Uses adaptive perceptual compression only when reduction is necessary and selects the highest-quality result that fits the save-safe target.
- Uses direct Picrd, ImgBB, and Postimages image links so the prepared file is not re-encoded by an additional relay.
- Redirects only Paint Board image-loading GET requests, leaving YoWorld save and update requests untouched.

## Better Image Quality

- Bundles the MIT-licensed UPNG encoder locally for improved gradients, transparency, and color retention.
- Replaces the earlier hand-built palette selection with UPNG's perceptual quantizer.
- Keeps the optional Clean faint transparency control for artwork that contains unwanted hidden color or haze.
- Adds no remote compression service, backend dependency, or new Chrome permission.

## Compatibility and Privacy

- Remains independent of YoWorld Info.
- Keeps Picrd as the default free image host and ImgBB as an optional API-key host.
- Retains wsrv.nl only as a fallback for manually entered public image links from other hosts.
- Updates the Privacy Policy to explain that image resizing and compression happen locally before upload.
- The extension does not use analytics, advertising SDKs, active-tab capture, or injected content scripts.

Live Privacy Policy: https://gothicka-yw.github.io/YoWorld_Paint/privacy-policy.html

YoWorld Paint is a community fan tool and is not affiliated with YoWorld or Big Viking Games.
