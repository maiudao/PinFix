# PinFix

PinFix is a web page annotation tool for marking up real web pages. It helps product owners, designers, testers, and non-programmers point at page areas, write change requests, and send developers or Codex a clear screenshot plus structured notes.

PinFix 是一个网页标注工具。它适合产品负责人、设计师、测试人员和不写代码的人，用来在真实网页上标出哪里要改、写清楚怎么改，然后把截图和结构化说明发给开发或 Codex。

## 中文说明

### PinFix 能做什么

- 右键网页模块或拖框区域生成编号标注。
- 给每个编号写“修改要求”。
- 复制结构化 Markdown 说明。
- 框选当前可见区域并复制或下载 PNG 图片。
- 用隐私遮挡盖住敏感信息。
- 用“补充说明”写页面整体要求。
- 用全站共享模板复用常见补充说明。
- 自动保存当前页面的标注、修改要求、遮挡和补充说明。
- 左侧工具会按网页亮暗自动切换，也可以在设置页强制亮色或暗色。

### 适合什么场景

- 给开发说明页面 UI、文案、排版、交互问题。
- 给 Codex 说明真实网页上的具体修改点。
- 在后台页、商品页、表单页、活动页里连续标注多个问题。
- 把截图中的编号和文字说明对应起来，减少沟通遗漏。

### 安装

PinFix 现在有两种安装方式：

- 油猴版：安装 Tampermonkey，打开 [pinfix.user.js](pinfix.user.js)，在 Tampermonkey 里确认安装。
- Chrome 插件版：运行 `npm run build`，打开 `chrome://extensions/`，启用开发者模式，加载 `dist/chrome-extension`。

普通用户如果只想快速试用，可以继续安装根目录这个 `pinfix.user.js` 文件。Chrome 插件版适合需要更接近真实画面的框选截图、设置页、自动显示授权和支持作者入口的场景。

### 使用

1. 打开需要标注的网页。
2. 点击左侧的双圆点入口，打开 PinFix。
3. 点 `选择`，把鼠标移到要标注的网页模块上。
4. 右键模块生成编号；也可以拖框圈住多个模块，或点击候选框里的普通标注按钮。
5. 点击红框、编号或写要求按钮，填写这一处的修改要求。
6. 继续标注其他模块；如果要选内部小模块，可以把鼠标移到小模块上右键生成编号。
7. 点 `复制`，复制结构化文字说明。
8. 点 `截图` 后像系统截图一样拖框，松开后会优先复制到剪贴板；如果浏览器限制图片复制，会自动下载 PNG。

### 常用功能

- `选择`：进入网页模块选择模式。
- `截图`：进入框选截图，松开后复制或下载选区图片。
- `复制`：复制 Markdown 修改说明。
- `补充说明`：写不属于某一个编号的页面整体说明，也可以新建、编辑、删除全站共享模板。

### 关闭和数据

点击工具栏右上角的关闭按钮后，PinFix 会进入静默状态：页面上只保留左侧小入口，红框、编号、遮挡、修改要求、补充说明、菜单和提示都会隐藏，不影响正常浏览网页。

关闭不会删除数据。重新打开 PinFix 后，当前页面之前的标注和说明会恢复。

补充说明模板保存在油猴脚本自己的本地存储里，所有网页都能共用同一套模板。清空当前页只会清空当前页正文和勾选状态，不会删除模板。

Chrome 插件版会把设置、页面标注、遮挡、补充说明和模板保存到本机 `chrome.storage.local`。如果开启“自动显示入口”，PinFix 只会在用户手动加入并授权的网站自动显示，不会默认读取所有网站。

### 显示和主题

- 左侧工具栏只保留 `选择`、`截图`、`复制`、`清空本页` 这些高频按钮。
- 标注颜色、线宽、编号大小、标签样式、框线留白、页面亮暗策略、默认显示备注和页面内工具主题都在插件设置页调整。
- 页面内工具主题默认自动跟随网页背景；如果判断不准，可以在设置页改成固定亮色或固定暗色。
- 设置页底部只保留隐私说明和支持作者入口，不再把商店文案暴露给普通用户。

### 截图说明

- 点 `截图` 会进入框选截图，松开后优先把选区图片复制到剪贴板。
- 右键点击截图按钮不会再打开额外菜单；在框选过程中按 Esc 或右键可取消。
- 截图完成、取消或重新打开工具栏后，会回到 `选择`，避免卡在一次性截图状态。
- Chrome 插件版会优先使用浏览器原生当前画面截图后裁切，更接近所见即所得。
- 如果浏览器限制图片复制，PinFix 会自动下载 PNG。

### 限制

- PinFix 当前只处理当前可见区域，不做长图截图。
- Chrome 插件版框选截图优先使用浏览器原生画面；油猴版仍使用页面重绘作为兜底。
- 油猴版或原生截图失败后的兜底导出，可能仍无法完整处理跨域图片、视频、地图、iframe、canvas 等内容。
- 遇到浏览器不允许截图的页面，建议直接使用系统截图工具。
- 页面标注数据和共享模板都保存在本机浏览器里，不上传到服务器。

## English Guide

### What PinFix Does

PinFix lets you annotate a live web page, number the areas that need changes, write notes for each number, and export clear change requests.

It helps you:

- Right-click page modules or drag an area to create numbered annotations.
- Write a change request for each annotation.
- Copy structured Markdown notes.
- Drag-select the visible page area and copy or download it as a PNG.
- Mask sensitive areas before sharing.
- Add page-level notes that are not tied to one annotation.
- Reuse shared templates for common page-level notes.
- Keep page data saved locally.
- Adapt the in-page launcher and toolbar to light or dark pages.

### When To Use It

- Explaining UI, copy, layout, or interaction changes to developers.
- Giving Codex precise web page modification instructions.
- Reviewing product pages, admin pages, forms, and landing pages.
- Matching screenshot numbers with written requirements.

### Install

PinFix now has two install options:

- Userscript: install Tampermonkey, open [pinfix.user.js](pinfix.user.js), and confirm installation.
- Chrome extension: run `npm run build`, open `chrome://extensions/`, enable Developer mode, and load `dist/chrome-extension`.

For quick testing, install only the root `pinfix.user.js` file. The Chrome extension build is useful for more accurate area capture, options, optional auto-show permissions, and the author support page.

### How To Use

1. Open the page you want to review.
2. Click the small double-dot launcher on the left side.
3. Click `Select`, then move your mouse over the page module.
4. Right-click the module to create an annotation. You can also drag an area or use the annotate button in the candidate toolbar.
5. Click the red box, number label, or edit button to write the change request.
6. Continue annotating. You can still select smaller elements inside an already annotated larger module.
7. Click `Copy` to copy structured Markdown notes.
8. Click `Capture` to drag-select an area. PinFix copies it when possible, or downloads a PNG if the browser blocks image copy.

### Main Tools

- `Select`: choose page elements to annotate.
- `Capture`: drag-select an area, then copy or download the selected image.
- `Copy`: copy Markdown notes.
- `More notes`: add page-level notes and create, edit, or delete shared templates.

### Closing PinFix

Click the close button in the toolbar to make PinFix quiet. Only the small launcher stays visible. Red boxes, labels, masks, notes, menus, and hints are hidden, so the page can be browsed normally.

Closing PinFix does not delete data. Reopen it and the current page annotations come back.

More-notes templates are stored in the userscript's own local storage and are shared across websites. Clearing one page removes only that page's note text and selected templates, not the shared template library.

The Chrome extension build stores settings, annotations, masks, notes, and templates in local `chrome.storage.local`. Auto-show uses optional site permissions only after the user adds and approves a site.

### Display And Theme

- The left toolbar keeps only frequent actions: `Select`, `Capture`, `Copy`, and clear current page.
- Annotation color, line width, label size, label style, box spacing, page contrast mode, default note visibility, and in-page tool theme live in the options page.
- The in-page tool theme follows the page automatically by default. You can force light or dark in options when a site is unusual.
- The options footer keeps privacy and support links only. Store listing copy is kept as source material, not shown as a user-facing options link.

### Screenshot Notes

- Click `Capture` to drag-select an area and copy the image when the browser allows it.
- Right-clicking the Capture button no longer opens a separate capture menu; press Esc or right-click while selecting to cancel.
- After capture completes, is canceled, or PinFix is reopened, the toolbar returns to `Select`.
- The Chrome extension build uses browser-native visible-tab capture first, then crops to the selected area.
- If image clipboard access is blocked, PinFix downloads a PNG instead.

### Limits

- PinFix captures only the current viewport, not a full long page.
- Chrome extension area capture uses browser-native visible-tab capture first; the userscript still uses browser-side rendering as a fallback.
- Userscript capture and fallback export may still miss cross-origin images, videos, maps, iframes, or canvas content.
- If a page blocks browser capture, use your system screenshot tool.
- All annotation data stays in local browser storage and is not uploaded.

## Development

The installable userscript is:

- [pinfix.user.js](pinfix.user.js)

The local Chrome extension package is generated at:

- `dist/chrome-extension`

Source files are modular under `src/`, and the build output includes both the single userscript and Chrome extension package.

```bash
npm run build
```

The build updates:

- [pinfix.user.js](pinfix.user.js)
- [dist/pinfix.user.js](dist/pinfix.user.js)
- `dist/chrome-extension`

Local demo:

- [demo/index.html](demo/index.html)

Extension handoff docs:

- `src/extension/VERIFY.md`
- `src/extension/store-listing.zh-CN.md`
- `src/extension/privacy-policy.zh-CN.md`
- `src/extension/store-assets-and-review.zh-CN.md`
