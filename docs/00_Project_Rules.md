# PinFix Project Rules

## 1. Code comments are required

PinFix must not become a project with almost no comments in the code.

Every core code file should include enough comments to help a non-programmer project owner understand the intent of the code later. Comments should explain why a piece of logic exists, what problem it solves, and what risk it avoids. They should not repeat obvious code line by line.

Required comment areas:

- Main module entry points.
- Feature modules such as element selection, annotation rendering, screenshot export, text export, storage, and language switching.
- Any browser limitation workaround.
- Any logic that hides PinFix's own toolbar before screenshot export.
- Any code that saves or restores user drafts.
- Any code that saves or restores user settings such as language, color, line width, label style, and screenshot countdown.
- Any light/dark page contrast detection logic.
- Any overlay logic that may affect the original page's clicks, scrolling, or keyboard shortcuts.
- Any public configuration option.

Recommended comment style:

- Use simple English comments in code, so the project is easier to open source.
- Keep UI text bilingual through language files, not hard-coded in feature logic.
- Add short Chinese notes in docs when a technical idea may be hard to understand.

Bad comments:

```js
// Set value
value = nextValue;
```

Good comments:

```js
// Keep annotation notes outside the screenshot image.
// Codex can read the image for location and the exported text for detailed instructions.
```

## 2. Product priority

PinFix is built for product owners, designers, testers, and non-programmers who need to explain web page changes clearly to coding assistants or developers.

The product should stay light:

- One quiet entry button by default.
- No heavy dashboard on the page.
- No long setup before making the first annotation.
- Export should create clear screenshots and clean text, not complicated project files.

## 3. First version boundary

The first version is a Tampermonkey userscript.

The first version should support:

- Marking page modules.
- Numbered labels such as 1, 2, 3 or circled labels in supported fonts.
- Collapsible note input under or above each marked module.
- Copying structured text.
- Exporting or preparing a current viewport screenshot.
- Hiding PinFix's own controls before screenshot export or manual Windows screenshot.
- Simplified Chinese and English UI.

The first version should not promise:

- Perfect full-page long screenshots.
- Perfect screenshots for video, map, iframe, cross-domain image, or canvas content.
- One-step paste of both image file and text file into every app.
- Automatic understanding of the user's business logic.

## 4. Design standard

PinFix should feel precise, calm, and polished. It should look like a professional markup tool, not a debug panel.

Design rules:

- Use a compact left-side floating launcher.
- Use icon-first buttons with tooltips.
- Keep the main toolbar to a small number of primary buttons.
- Put low-frequency actions in popovers or settings instead of showing everything at once.
- Keep all tool buttons large enough to click comfortably.
- Use strong but tasteful annotation colors.
- Keep annotation labels readable on both light and dark pages.
- Do not let note inputs block too much page content.
- Save the user's last-used mode and settings automatically.
- Support keyboard use for common actions where possible.

## 5. Documentation standard

All project documentation should be understandable to non-programmers.

When technical words are necessary, explain them simply. For example:

- Userscript: a small browser script installed through Tampermonkey.
- Viewport: the part of the web page currently visible on screen.
- DOM: the page structure that the browser uses internally.
- Selector: a path that helps find the same page element again.
