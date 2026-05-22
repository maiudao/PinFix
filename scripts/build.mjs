import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const outputFile = path.join(distDir, 'pinfix.user.js');
const rootOutputFile = path.join(rootDir, 'pinfix.user.js');
const extensionSourceDir = path.join(rootDir, 'src', 'extension');
const extensionOutputDir = path.join(distDir, 'chrome-extension');

const userscriptParts = [
  'src/userscript.header.txt',
  'src/modules/config.js',
  'src/modules/utils.js',
  'src/modules/i18n.js',
  'src/modules/storage.js',
  'src/modules/selector.js',
  'src/modules/anchors.js',
  'src/modules/review.js',
  'vendor/html2canvas.min.js',
  'src/modules/exporters.js',
  'src/modules/styles.js',
  'src/modules/ui.js',
  'src/modules/app.js'
];

const runtimeParts = [
  'src/modules/config.js',
  'src/modules/utils.js',
  'src/modules/i18n.js',
  'src/modules/storage.js',
  'src/modules/selector.js',
  'src/modules/anchors.js',
  'src/modules/review.js',
  'vendor/html2canvas.min.js',
  'src/modules/exporters.js',
  'src/modules/styles.js',
  'src/modules/ui.js',
  'src/modules/app.js'
];

function splitLongStringLiteral(raw, quote, maxLength = 1200) {
  const parts = [];
  let start = 0;

  while (start < raw.length) {
    let end = Math.min(start + maxLength, raw.length);

    // Avoid ending a generated string chunk with an escape slash.
    while (end > start && raw[end - 1] === '\\') {
      end -= 1;
    }

    if (end === start) {
      end = Math.min(start + maxLength, raw.length);
    }

    parts.push(raw.slice(start, end));
    start = end;
  }

  return `(${parts.map((part) => `${quote}${part}${quote}`).join(' +\n')})`;
}

function splitLongStringTokens(content) {
  let output = '';

  for (let index = 0; index < content.length; index += 1) {
    const quote = content[index];
    if (quote !== '"' && quote !== "'") {
      output += content[index];
      continue;
    }

    let raw = '';
    index += 1;

    for (; index < content.length; index += 1) {
      const character = content[index];
      if (character === '\\') {
        raw += character;
        if (index + 1 < content.length) {
          raw += content[index + 1];
          index += 1;
        }
        continue;
      }

      if (character === quote) {
        break;
      }

      raw += character;
    }

    output += raw.length > 2000 ? splitLongStringLiteral(raw, quote) : `${quote}${raw}${quote}`;
  }

  return output;
}

function wrapLongCodeLines(content, maxLength = 1400) {
  let output = '';
  let column = 0;
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let index = 0; index < content.length; index += 1) {
    const character = content[index];
    const next = content[index + 1];
    output += character;
    column += 1;

    if (character === '\n') {
      column = 0;
      lineComment = false;
      escaped = false;
      continue;
    }

    if (lineComment) {
      continue;
    }

    if (blockComment) {
      if (character === '*' && next === '/') {
        output += next;
        index += 1;
        column += 1;
        blockComment = false;
      }
      continue;
    }

    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (character === '\\') {
        escaped = true;
        continue;
      }
      if (character === quote) {
        quote = null;
      }
      continue;
    }

    if (character === '/' && next === '/') {
      lineComment = true;
      continue;
    }
    if (character === '/' && next === '*') {
      output += next;
      index += 1;
      column += 1;
      blockComment = true;
      continue;
    }
    if (character === '"' || character === "'" || character === '`') {
      quote = character;
      continue;
    }

    if (column > maxLength && (character === ';' || character === ',')) {
      output += '\n';
      column = 0;
    }
  }

  return output;
}

function makeEditorFriendly(part, content) {
  if (part !== 'vendor/html2canvas.min.js') {
    return content;
  }

  // Tampermonkey's editor can freeze on very long minified vendor lines.
  // Keep the userscript self-contained, but split html2canvas into editor-friendly lines.
  return wrapLongCodeLines(splitLongStringTokens(content));
}

async function buildBundle(parts) {
  const chunks = [];

  for (const part of parts) {
    const filePath = path.join(rootDir, part);
    const content = await readFile(filePath, 'utf8');
    chunks.push(makeEditorFriendly(part, content).trimEnd());
  }

  return `${chunks.join('\n\n')}\n`;
}

function wrapExtensionContentScript(content) {
  return `(() => {
  if (window.__pinfixExtensionBundleLoaded__) {
    return;
  }

  window.__pinfixExtensionBundleLoaded__ = true;
  window.__pinfixExtensionMode__ = true;

  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message && message.type === 'PINFIX_PING') {
        sendResponse({ ready: true });
        return false;
      }

      if (message && message.type === 'PINFIX_APPLY_GLOBAL_SETTINGS') {
        window.__pinfixExtensionStorageCache__ = window.__pinfixExtensionStorageCache__ || {};
        window.__pinfixExtensionStorageCache__['pinfix:global'] = {
          version: 1,
          savedAt: Date.now(),
          settings: message.settings || {}
        };
        if (window.__pinfixApp__ && typeof window.__pinfixApp__.reloadGlobalSettings === 'function') {
          window.__pinfixApp__.reloadGlobalSettings();
        }
        sendResponse({ ok: true });
        return false;
      }

      if (message && (message.type === 'PINFIX_CURRENT_PAGE_DATA_CLEARED' || message.type === 'PINFIX_ALL_DATA_CLEARED')) {
        if (message.type === 'PINFIX_ALL_DATA_CLEARED') {
          window.__pinfixExtensionStorageCache__ = {};
        }
        if (message.type === 'PINFIX_CURRENT_PAGE_DATA_CLEARED' && message.key) {
          window.__pinfixExtensionStorageCache__ = window.__pinfixExtensionStorageCache__ || {};
          delete window.__pinfixExtensionStorageCache__[message.key];
        }
        if (window.__pinfixApp__ && typeof window.__pinfixApp__.reloadPageData === 'function') {
          window.__pinfixApp__.reloadPageData();
        }
        sendResponse({ ok: true });
      }
      return false;
    });
  }

  const startPinFixBundle = () => {
${content.trimEnd()
    .split('\n')
    .map((line) => `    ${line}`)
    .join('\n')}
  };

  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(null)
      .then((items) => {
        window.__pinfixExtensionStorageCache__ = items || {};
        startPinFixBundle();
      })
      .catch(() => {
        window.__pinfixExtensionStorageCache__ = {};
        startPinFixBundle();
      });
    return;
  }

  window.__pinfixExtensionStorageCache__ = {};
  startPinFixBundle();
})();
`;
}

async function copyDirectory(sourceDir, targetDir) {
  await mkdir(targetDir, { recursive: true });
  const entries = await readdir(sourceDir, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);

    if (entry.isDirectory()) {
      await copyDirectory(sourcePath, targetPath);
      continue;
    }

    const content = await readFile(sourcePath);
    await writeFile(targetPath, content);
  }
}

await mkdir(distDir, { recursive: true });
const bundle = await buildBundle(userscriptParts);
await writeFile(outputFile, bundle, 'utf8');
await writeFile(rootOutputFile, bundle, 'utf8');

await rm(extensionOutputDir, { recursive: true, force: true });
await copyDirectory(extensionSourceDir, extensionOutputDir);

const extensionRuntime = await buildBundle(runtimeParts);
await writeFile(
  path.join(extensionOutputDir, 'pinfix-content.js'),
  wrapExtensionContentScript(extensionRuntime),
  'utf8'
);

console.log(`Built ${path.relative(rootDir, outputFile)}, ${path.relative(rootDir, rootOutputFile)}, and ${path.relative(rootDir, extensionOutputDir)}`);
