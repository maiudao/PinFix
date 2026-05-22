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
8. Use screenshot save or image copy. Chrome native visible-tab capture is tried first; html2canvas remains as fallback.

Unsupported pages such as `chrome://` should show a clear message in the popup.

## Step 3 Checks

1. Popup text clearly explains: enable, mark, copy.
2. Options page can save language, color, line width, label size, launcher position, and auto-show site list.
3. Options page can clear current page data and all local PinFix data.
4. Donation page loads `donation.config.json` and shows configured QR codes.
5. Desktop white and dark pages both keep the launcher, toolbar, notes, labels, and borders readable.
6. Narrow mobile viewport has no horizontal overflow and the note panel behaves like a bottom sheet.
7. Auto-show asks for optional site permission only after the user adds the current site.
8. Open options from the popup and confirm "加入当前网站" still points to the web page you were annotating, not the options page itself.
9. Confirm `store-listing.zh-CN.md`, `privacy-policy.zh-CN.md`, and `store-assets-and-review.zh-CN.md` are present before preparing a store upload.
10. Remove a site from the auto-show list and confirm Chrome no longer keeps that optional site permission when no remaining saved origin uses the same host.
11. Open `privacy.html` and confirm the privacy explanation is readable inside the extension package.
12. Turn off "自动显示入口" and confirm saved optional site permissions are revoked; turn it on again and confirm Chrome asks before restoring them.
13. Open options after the extension has been idle for a while and confirm "加入当前网站" still targets the last normal web page, not the extension page.
14. Put a test QR image in `assets/donate/`, enable it in `donation.config.json`, rebuild, and confirm the donation page shows only packaged `png`, `jpg`, `jpeg`, or `webp` images.
15. Remove an auto-show site and check that the options page shows a clear warning if Chrome refuses to revoke permission.

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
