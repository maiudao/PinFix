# PinFix Chrome Extension Manual Check

Load this folder in Chrome:

```text
dist/chrome-extension
```

## Basic Flow

1. Open `chrome://extensions/`.
2. Enable Developer mode.
3. Click "Load unpacked" and choose `dist/chrome-extension`.
4. Open a normal `http://` or `https://` page.
5. Click the PinFix extension icon and choose "开启当前页面标注".
6. Add one annotation, write a note, refresh the page, and activate PinFix again.
7. Confirm the annotation is restored from `chrome.storage.local`.
8. Click the screenshot button, drag-select an area, and release. Right-clicking the screenshot button should not open a menu.
9. Confirm the selected image is copied when the browser allows it, or downloaded as PNG when image copy is blocked.
10. Confirm the selected image does not include PinFix overlays and is cropped to the dragged area.
11. Reopen PinFix after finishing or canceling capture and confirm the toolbar returns to Select.
12. Open the options page and confirm there is no user-facing "商店文案" footer link.

Unsupported pages such as `chrome://` should show a clear message in the popup.

## Polish Checks

1. Popup text clearly explains: enable, mark, copy.
2. Options page can save language, color, line width, label size, label style, box spacing, page mode, tool theme, notes visibility, launcher position, and auto-show site list.
3. Options page can clear current page data and all local PinFix data.
4. Donation page loads `donation.config.json` and shows configured QR codes.
5. Desktop white and dark pages both keep the launcher, toolbar, notes, labels, and borders readable.
6. Set tool theme to Auto, Light, and Dark in options; confirm the page launcher and toolbar follow the chosen mode.
7. Narrow mobile viewport has no horizontal overflow, the toolbar stays inside the viewport, and the capture hint fits within the screen.
8. Area capture can be canceled with Esc or right-click while selecting.
9. Auto-show asks for optional site permission only after the user adds the current site.
10. Open options from the popup and confirm "加入当前网站" still points to the web page you were annotating, not the options page itself.
11. Confirm `store-listing.zh-CN.md`, `privacy-policy.zh-CN.md`, and `store-assets-and-review.zh-CN.md` are present before preparing a store upload.
12. Remove a site from the auto-show list and confirm Chrome no longer keeps that optional site permission when no remaining saved origin uses the same host.
13. Open `privacy.html` and confirm the privacy explanation is readable inside the extension package.
14. Turn off "自动显示入口" and confirm saved optional site permissions are revoked; turn it on again and confirm Chrome asks before restoring them.
15. Open options after the extension has been idle for a while and confirm "加入当前网站" still targets the last normal web page, not the extension page.
16. Put a test QR image in `assets/donate/`, enable it in `donation.config.json`, rebuild, and confirm the donation page shows only packaged `png`, `jpg`, `jpeg`, or `webp` images.
17. Remove an auto-show site and check that the options page shows a clear warning if Chrome refuses to revoke permission.
18. On a complex styled page, compare the area capture with what Chrome shows on screen. It should use native visible-tab capture first; html2canvas is only a fallback.

## Package Checks

The zip used for local testing or later store preparation should contain extension files at the root:

```text
manifest.json
background.js
pinfix-content.js
options.html
assets/icons/icon-16.png
```

Check that zip entries use `/`, for example `assets/icons/icon-16.png`, not Windows-style backslashes.

## Final Code Checks

Run before packaging:

```bash
npm run build
node --check dist/chrome-extension/background.js
node --check dist/chrome-extension/options.js
node --check dist/chrome-extension/popup.js
node --check dist/chrome-extension/donation.js
node --check dist/chrome-extension/pinfix-content.js
```

Also confirm the extension HTML files do not use inline scripts or remote scripts.
