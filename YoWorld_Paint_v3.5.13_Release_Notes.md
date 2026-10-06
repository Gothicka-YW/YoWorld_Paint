# YoWorld Paint v3.5.13 — Release Notes

Release date: 2026-10-06

## Paint Board Apply Fix

- Restores Paint Board image application after the previous compatibility endpoint stopped resolving.
- Removes all runtime and manifest-permission dependency on YoWorld Info.
- Uses the independent `wsrv.nl` image relay for public direct-image links during preview and enabled Paint Board redirects.
- Supports Picrd, ImgBB, Postimages, and pasted direct-image links through one consistent compatibility path.

## Other Current Features

- Side Panel is now the default view, with Popup still available as a saved preference.
- Added Picrd as the default free Quick Upload host; ImgBB remains available as an optional host.
- Improved 390×260 resizing and transparency handling to retain more image detail while avoiding unwanted in-game haze.
- Fixed black-image behavior affecting some ImgBB-hosted images.
- Removed the broken Sales Boards tab after its upstream template creator changed.
- Removed the related `scripting`, `activeTab`, and broad optional website-access permissions.
- Added refreshed Resources links, tutorials, Chrome Web Store copy, and a complete privacy policy.
- Added Side Panel recovery so Chrome refreshes an invalidated panel page after an extension update or developer reload.

## Privacy

- No analytics, advertising SDKs, or sale of personal data.
- Image files are sent to Picrd or ImgBB only when the user explicitly starts an upload; the selected public image link is sent to wsrv.nl for compatible preview and Paint Board application.
- The extension does not inject content scripts or capture the active tab.
- Live policy: https://gothicka-yw.github.io/YoWorld_Paint/privacy-policy.html

YoWorld Paint is a community fan tool and is not affiliated with YoWorld or Big Viking Games.
