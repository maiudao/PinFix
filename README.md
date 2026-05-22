# PinFix

PinFix is a Tampermonkey userscript for marking up real web pages. It helps product owners, designers, testers, and non-programmers point at page areas, write change requests, and send developers or Codex a clear screenshot plus structured notes.

PinFix 是一个油猴网页标注脚本。它适合产品负责人、设计师、测试人员和不写代码的人，用来在真实网页上标出哪里要改、写清楚怎么改，然后把截图和结构化说明发给开发或 Codex。

## 中文说明

### PinFix 能做什么

- 在网页上双击模块生成编号标注。
- 给每个编号写“修改要求”。
- 复制结构化 Markdown 说明。
- 截取或保存当前可见区域图片。
- 用“截图准备”模式配合系统截图。
- 用隐私遮挡盖住敏感信息。
- 用“补充说明”写页面整体要求。
- 用全站共享模板复用常见补充说明。
- 自动保存当前页面的标注、修改要求、遮挡和补充说明。

### 适合什么场景

- 给开发说明页面 UI、文案、排版、交互问题。
- 给 Codex 说明真实网页上的具体修改点。
- 在后台页、商品页、表单页、活动页里连续标注多个问题。
- 把截图中的编号和文字说明对应起来，减少沟通遗漏。

### 安装

1. 安装 Tampermonkey。
2. 打开 [pinfix.user.js](pinfix.user.js)。
3. 在 Tampermonkey 里确认安装。

普通使用只需要安装根目录这个 `pinfix.user.js` 文件。

### 使用

1. 打开需要标注的网页。
2. 点击左侧的双圆点入口，打开 PinFix。
3. 点 `选择`，把鼠标移到要标注的网页模块上。
4. 双击模块生成编号，或者点击候选框中间的普通标注按钮。
5. 点击红框、编号或写要求按钮，填写这一处的修改要求。
6. 继续标注其他模块；如果要选内部小模块，可以直接在已标注区域里继续双击内部元素。
7. 点 `复制`，复制结构化文字说明。
8. 点 `截图 > 保存到本地` 保存当前可见区域图片，或双击 `截图` 按钮快速截图。

### 常用功能

- `选择`：进入网页模块选择模式。
- `样式`：调整标注颜色、粗细、编号大小和显示策略。
- `截图`：截图准备、保存到本地、复制图片。
- `复制`：复制 Markdown 修改说明。
- `更多`：撤销、隐藏备注、清空当前页、隐私遮挡、语言、快捷键、标注清单。
- `补充说明`：写不属于某一个编号的页面整体说明，也可以新建、编辑、删除全站共享模板。

### 关闭和数据

点击工具栏右上角的关闭按钮后，PinFix 会进入静默状态：页面上只保留左侧小入口，红框、编号、遮挡、修改要求、补充说明、菜单和提示都会隐藏，不影响正常浏览网页。

关闭不会删除数据。重新打开 PinFix 后，当前页面之前的标注和说明会恢复。

补充说明模板保存在油猴脚本自己的本地存储里，所有网页都能共用同一套模板。清空当前页只会清空当前页正文和勾选状态，不会删除模板。

### 截图说明

- 双击 `截图` 按钮会优先把当前可见区域图片复制到剪贴板。
- 如果浏览器限制图片复制，PinFix 会自动下载 PNG。
- `截图 > 保存到本地` 会直接保存当前可见区域 PNG。
- `截图 > 截图准备` 会隐藏工具栏和输入框，只保留网页、红框和编号，方便用系统截图。

### 限制

- PinFix 当前只处理当前可见区域，不做长图截图。
- 图片导出是浏览器内重绘，不等于系统原生截图。
- 跨域图片、视频、地图、iframe、canvas 等内容可能无法完整导出。
- 遇到复杂页面，建议用“截图准备”配合 `Win + Shift + S` 或系统截图工具。
- 页面标注数据和共享模板都保存在本机浏览器里，不上传到服务器。

## English Guide

### What PinFix Does

PinFix lets you annotate a live web page, number the areas that need changes, write notes for each number, and export clear change requests.

It helps you:

- Double-click page modules to create numbered annotations.
- Write a change request for each annotation.
- Copy structured Markdown notes.
- Save or copy a screenshot of the current viewport.
- Use screenshot-prep mode for system screenshots.
- Mask sensitive areas before sharing.
- Add page-level notes that are not tied to one annotation.
- Reuse shared templates for common page-level notes.
- Keep page data saved locally.

### When To Use It

- Explaining UI, copy, layout, or interaction changes to developers.
- Giving Codex precise web page modification instructions.
- Reviewing product pages, admin pages, forms, and landing pages.
- Matching screenshot numbers with written requirements.

### Install

1. Install Tampermonkey.
2. Open [pinfix.user.js](pinfix.user.js).
3. Confirm installation in Tampermonkey.

For normal use, install only the root `pinfix.user.js` file.

### How To Use

1. Open the page you want to review.
2. Click the small double-dot launcher on the left side.
3. Click `Select`, then move your mouse over the page module.
4. Double-click the module to create an annotation, or use the annotate button in the candidate toolbar.
5. Click the red box, number label, or edit button to write the change request.
6. Continue annotating. You can still select smaller elements inside an already annotated larger module.
7. Click `Copy` to copy structured Markdown notes.
8. Use `Capture > Save locally`, or double-click `Capture` for a quick screenshot.

### Main Tools

- `Select`: choose page elements to annotate.
- `Style`: change color, line width, label size, and contrast mode.
- `Capture`: screenshot mode, save locally, copy image.
- `Copy`: copy Markdown notes.
- `More`: undo, hide notes, clear page data, privacy masks, language, hotkeys, annotation list.
- `More notes`: add page-level notes and create, edit, or delete shared templates.

### Closing PinFix

Click the close button in the toolbar to make PinFix quiet. Only the small launcher stays visible. Red boxes, labels, masks, notes, menus, and hints are hidden, so the page can be browsed normally.

Closing PinFix does not delete data. Reopen it and the current page annotations come back.

More-notes templates are stored in the userscript's own local storage and are shared across websites. Clearing one page removes only that page's note text and selected templates, not the shared template library.

### Screenshot Notes

- Double-click `Capture` to copy the current viewport image when the browser allows it.
- If image clipboard access is blocked, PinFix downloads a PNG instead.
- `Capture > Save locally` saves the current viewport as PNG.
- `Capture > Screenshot mode` hides PinFix controls so you can use the system screenshot tool.

### Limits

- PinFix captures only the current viewport, not a full long page.
- Image export is browser-rendered, not a native system screenshot.
- Cross-origin images, videos, maps, iframes, and canvas content may not export perfectly.
- For complex pages, use screenshot mode with your system screenshot tool.
- All annotation data stays in local browser storage and is not uploaded.

## Development

The installable userscript is:

- [pinfix.user.js](pinfix.user.js)

Source files are modular under `src/`, and the build output is a single userscript.

```bash
npm run build
```

The build updates:

- [pinfix.user.js](pinfix.user.js)
- [dist/pinfix.user.js](dist/pinfix.user.js)

Local demo:

- [demo/index.html](demo/index.html)
