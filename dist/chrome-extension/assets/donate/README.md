# PinFix Donation Assets

Place payment QR code images in this folder:

- `wechat.png`
- `alipay.png`
- or other local `png`, `jpg`, `jpeg`, `webp` files

Then edit `src/extension/donation.config.json` and set the matching method's
`enabled` field to `true`.

Keep donation images local to the extension package. Do not use remote image URLs,
SVG files, scripts, payment SDKs, or tracking links.

These images are packaged into `dist/chrome-extension` when you run:

```bash
npm run build
```
