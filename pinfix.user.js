// ==UserScript==
// @name         PinFix
// @namespace    https://pinfix.local
// @version      1.0.0
// @description  Annotate real web pages with numbered notes for Codex or developers.
// @author       PinFix
// @match        *://*/*
// @include      http://localhost:*/*
// @include      https://localhost:*/*
// @include      http://127.0.0.1:*/*
// @include      https://127.0.0.1:*/*
// @include      http://[::1]:*/*
// @include      https://[::1]:*/*
// @grant        GM_addStyle
// @sandbox      DOM
// @run-at       document-idle
// @license      MIT
// ==/UserScript==

const PINFIX_VERSION = '1.0.0';
const PINFIX_STORAGE_VERSION = 1;
const PINFIX_Z_INDEX = 2147483000;

const PINFIX_COLOR_PRESETS = {
  red: { key: 'red', color: '#E11D2E' },
  orange: { key: 'orange', color: '#EA580C' },
  amber: { key: 'amber', color: '#D97706' },
  blue: { key: 'blue', color: '#2563EB' },
  teal: { key: 'teal', color: '#0F766E' },
  green: { key: 'green', color: '#16A34A' },
  neutral: { key: 'neutral', color: '#111827' }
};

const PINFIX_LINE_WIDTHS = {
  thin: 2,
  medium: 4,
  thick: 6
};

const PINFIX_LABEL_SIZES = {
  small: 34,
  medium: 40,
  large: 46
};

const PINFIX_LABEL_STYLES = {
  solid: 'solid',
  ring: 'ring'
};

const PINFIX_BOX_PADDING_OPTIONS = {
  tight: 0,
  compact: 4,
  normal: 8,
  wide: 12
};

const PINFIX_COUNTDOWN_OPTIONS = [3, 5, 10];
const PINFIX_MIN_TOOL_TARGET_WIDTH = 132;
const PINFIX_MIN_TOOL_TARGET_HEIGHT = 54;

const PINFIX_DEFAULT_SETTINGS = {
  language: 'auto',
  colorPreset: 'red',
  lineWidth: 'medium',
  labelSize: 'medium',
  labelStyle: 'solid',
  boxPadding: 'normal',
  contrastMode: 'auto',
  countdown: 5,
  notesVisible: true,
  lastTool: 'select'
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function fillTemplate(template, values) {
  return String(template || '').replace(/\{(\w+)\}/g, (fullMatch, key) => {
    return Object.prototype.hasOwnProperty.call(values || {}, key) ? String(values[key]) : fullMatch;
  });
}

function createId(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatTimestamp(date, language) {
  try {
    return new Intl.DateTimeFormat(language === 'zh-CN' ? 'zh-CN' : 'en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  } catch (error) {
    return date.toISOString();
  }
}

function getViewportRect() {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    scrollX: window.scrollX,
    scrollY: window.scrollY
  };
}

function getDocumentSize() {
  const doc = document.documentElement;
  const body = document.body;

  return {
    width: Math.max(doc.scrollWidth, doc.clientWidth, body ? body.scrollWidth : 0),
    height: Math.max(doc.scrollHeight, doc.clientHeight, body ? body.scrollHeight : 0)
  };
}

function expandRect(rect, padding) {
  const gap = Number(padding || 0);
  return {
    pageLeft: rect.pageLeft - gap,
    pageTop: rect.pageTop - gap,
    width: rect.width + gap * 2,
    height: rect.height + gap * 2
  };
}

function rectsRoughlyMatch(leftRect, rightRect) {
  if (!leftRect || !rightRect) {
    return false;
  }

  const tolerance = 3;
  return (
    Math.abs(leftRect.pageLeft - rightRect.pageLeft) <= tolerance &&
    Math.abs(leftRect.pageTop - rightRect.pageTop) <= tolerance &&
    Math.abs(leftRect.width - rightRect.width) <= tolerance &&
    Math.abs(leftRect.height - rightRect.height) <= tolerance
  );
}

function summariseNote(note) {
  const firstLine = String(note || '').trim().split(/\r?\n/)[0] || '';
  return firstLine.length > 48 ? `${firstLine.slice(0, 45)}...` : firstLine;
}

function getBrowserLanguage() {
  return navigator.language && navigator.language.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en';
}

function isEditableTarget(target) {
  if (!target || !(target instanceof Element)) {
    return false;
  }

  if (target.closest('[contenteditable="true"]')) {
    return true;
  }

  return ['INPUT', 'TEXTAREA', 'SELECT', 'OPTION'].includes(target.tagName);
}

function createI18n() {
  const messages = {
    'zh-CN': {
      launcherOpen: '打开点改',
      launcherClose: '关闭点改',
      select: '选择',
      style: '样式',
      capture: '截图',
      copy: '复制',
      more: '更多',
      screenshotMode: '截图准备',
      exportImage: '保存当前画面',
      copyImage: '复制图片',
      saveLocally: '保存到本地',
      copyNotes: '复制文字',
      undo: '撤销上一步',
      clearPage: '清空本页',
      clearAllPageData: '清空当前页全部内容',
      clearMasks: '清空遮挡',
      notesOn: '显示备注',
      notesOff: '隐藏备注',
      dangerZone: '危险操作',
      clearAllHint: '会清空标注、修改要求、补充说明和隐私遮挡，可用撤销恢复。',
      language: '语言',
      hotkeys: '快捷键',
      expand: '展开',
      collapse: '收起',
      reviewStatus: '导出前检查',
      reviewReady: '说明已写完整，可以直接导出',
      reviewMissing: '还有 {count} 个标注没写说明',
      reviewMissingList: '未填写编号：{numbers}',
      reviewContinue: '还有 {count} 个标注没写说明，再点一次继续',
      reviewMasks: '当前遮挡数量：{count}',
      globalNotes: '补充说明',
      globalNotesHint: '写业务逻辑、整体方向或无法绑定到单个编号的说明',
      globalNoteTab: '正文',
      templateAdd: '新增模板',
      templateUntitled: '未命名模板',
      templateTitleLabel: '模板标题',
      templateTitlePlaceholder: '输入模板标题',
      templateContentLabel: '模板内容',
      templateContentPlaceholder: '输入模板详细内容',
      templateDelete: '删除模板',
      templateSelectionTitle: '勾选模板',
      templateEmptyHint: '还没有模板，点击右上角的 + 新建一个。',
      templatePreviewEmpty: '这个模板还没有填写正文内容。',
      templateDeleteConfirm: '确认删除这个模板吗？删除后当前页面勾选也会立即失效。',
      globalNoteMergeHint: '这里写页面级补充说明，复制时会和下方勾选模板一起带出。',
      templateAutoSaveHint: '标题和内容失焦后自动保存，复制时只会带出模板正文。',
      notePlaceholder: '写这里要怎么改，刷新后会自动恢复',
      noteMissingShort: '未填写说明',
      changeRequest: '修改要求',
      annotationExists: '这个模块已经标过了，已帮你定位过去',
      maskExists: '这个区域已经有遮挡了',
      styleColor: '颜色',
      styleWidth: '粗细',
      styleLabelSize: '标签大小',
      styleLabelStyle: '标签样式',
      styleBoxPadding: '框线留白',
      styleContrast: '亮暗策略',
      styleSolid: '实心',
      styleRing: '描边',
      colorRed: '红色',
      colorOrange: '橙色',
      colorAmber: '琥珀',
      colorBlue: '蓝色',
      colorTeal: '青绿色',
      colorGreen: '绿色',
      colorNeutral: '黑白中性',
      widthThin: '细',
      widthMedium: '中',
      widthThick: '粗',
      sizeSmall: '小',
      sizeMedium: '中',
      sizeLarge: '大',
      paddingTight: '贴边',
      paddingCompact: '微留白',
      paddingNormal: '标准',
      paddingWide: '宽松',
      contrastAuto: '自动',
      contrastLight: '亮页',
      contrastDark: '暗页',
      countdown: '倒计时',
      languageAuto: '跟随浏览器',
      languageZh: '简体中文',
      languageEn: 'English',
      deleted: '已删除标注',
      restored: '已撤销上一步',
      copiedNotes: '文字已复制',
      copyFailed: '复制失败，请手动重试',
      copiedImage: '图片已复制',
      downloadedImage: '已下载 PNG 图片',
      screenshotCopiedPaste: '截图已复制，可以直接 Ctrl+V 粘贴',
      screenshotDownloadedFallback: '浏览器限制了图片复制，已自动保存 PNG',
      noRecentScreenshot: '还没有可保存的最近截图',
      screenshotReady: '截图准备已开始',
      screenshotDone: '截图准备已结束',
      focusDone: '已定位到对应标注',
      nothingToCopy: '还没有可复制的标注内容',
      clearConfirm: '确认清空当前页面的全部标注、修改要求、补充说明和隐私遮挡吗？清空后可用撤销恢复。',
      deleteConfirm: '确认删除这个标注吗？',
      clearMasksConfirm: '确认清空当前页面的全部遮挡吗？',
      annotationList: '标注清单',
      viewAnnotationList: '查看标注清单（{count}）',
      annotationListHint: '悬停或点击可在右侧查看详情',
      noteReadyShort: '已填写修改要求',
      noteMissingStatus: '待补充修改要求',
      pageCleared: '已清空当前页全部内容',
      privacyMode: '隐私遮挡',
      privacyModeOn: '已进入遮挡模式，点击敏感区域即可生成遮挡',
      privacyModeOff: '已退出遮挡模式',
      privacyModeStart: '开始遮挡',
      privacyModeStop: '停止遮挡',
      privacyMaskAdded: '已添加遮挡',
      privacyMasksCleared: '已清空遮挡',
      privacyHint: '导出时会保留这些遮挡，用来盖住敏感内容',
      maskLabel: '遮挡',
      actionEditNote: '写修改要求',
      actionMaskArea: '遮挡这个区域',
      actionDelete: '删除',
      actionShrinkMask: '缩小遮挡',
      actionExpandMask: '扩大遮挡',
      actionDeleteMask: '删除遮挡',
      emptyState: '还没有标注，先点“选择”再双击网页模块',
      pageTitle: '需要修改的页面',
      pageUrl: '页面地址',
      viewportMode: '截图模式：当前可见区域',
      changeSummary: '需要修改的地方',
      changeDetails: '具体修改要求',
      businessNote: '需要修改的背后业务逻辑',
      extraInfo: '补充信息',
      viewportInfo: '浏览器视口',
      countInfo: '标注数量',
      timeInfo: '生成时间',
      exportLimit: '复杂页面导出可能不完整，必要时请用截图准备配合系统截图',
      tipShrink: '缩小选区',
      tipExpand: '扩大选区',
      tipSelectMode: '普通标注',
      tipMaskMode: '遮挡模式',
      hotkeyCopy: 'Ctrl/Cmd + Shift + C：复制文字',
      hotkeyScreenshot: 'Ctrl/Cmd + Shift + S：截图准备',
      hotkeyExport: 'Ctrl/Cmd + Shift + E：保存当前画面',
      hotkeyUndo: 'Ctrl/Cmd + Z：撤销上一步',
      hotkeyNotes: 'Ctrl/Cmd + Shift + H：显示或隐藏备注'
    },
    en: {
      launcherOpen: 'Open PinFix',
      launcherClose: 'Close PinFix',
      select: 'Select',
      style: 'Style',
      capture: 'Capture',
      copy: 'Copy',
      more: 'More',
      screenshotMode: 'Screenshot mode',
      exportImage: 'Save current view',
      copyImage: 'Copy image',
      saveLocally: 'Save locally',
      copyNotes: 'Copy notes',
      undo: 'Undo',
      clearPage: 'Clear page',
      clearAllPageData: 'Clear all page data',
      clearMasks: 'Clear masks',
      notesOn: 'Show notes',
      notesOff: 'Hide notes',
      dangerZone: 'Danger zone',
      clearAllHint: 'Clears annotations, change requests, more notes, and privacy masks. You can undo it.',
      language: 'Language',
      hotkeys: 'Hotkeys',
      expand: 'Expand',
      collapse: 'Collapse',
      reviewStatus: 'Export check',
      reviewReady: 'All annotations have notes. You can export now.',
      reviewMissing: '{count} annotations still need notes.',
      reviewMissingList: 'Missing note numbers: {numbers}',
      reviewContinue: '{count} annotations still need notes. Click again to continue.',
      reviewMasks: 'Privacy masks on page: {count}',
      globalNotes: 'More notes',
      globalNotesHint: 'Use this for business context, whole-page direction, or notes not tied to one marker.',
      globalNoteTab: 'Notes',
      templateAdd: 'Add template',
      templateUntitled: 'Untitled template',
      templateTitleLabel: 'Template title',
      templateTitlePlaceholder: 'Enter a template title',
      templateContentLabel: 'Template content',
      templateContentPlaceholder: 'Enter the template content',
      templateDelete: 'Delete template',
      templateSelectionTitle: 'Choose templates',
      templateEmptyHint: 'No templates yet. Click + to create one.',
      templatePreviewEmpty: 'This template does not have body content yet.',
      templateDeleteConfirm: 'Delete this template? It will also stop being selected on the current page.',
      globalNoteMergeHint: 'Write page-level context here. Copy will append the selected templates below.',
      templateAutoSaveHint: 'Title and content save on blur. Only the template body is copied later.',
      notePlaceholder: 'Describe what should change here. PinFix saves it automatically.',
      noteMissingShort: 'Missing note',
      changeRequest: 'Change request',
      annotationExists: 'That area is already annotated. PinFix moved to it.',
      maskExists: 'This area is already masked',
      styleColor: 'Color',
      styleWidth: 'Line width',
      styleLabelSize: 'Label size',
      styleLabelStyle: 'Label style',
      styleBoxPadding: 'Box spacing',
      styleContrast: 'Page mode',
      styleSolid: 'Solid',
      styleRing: 'Ring',
      colorRed: 'Red',
      colorOrange: 'Orange',
      colorAmber: 'Amber',
      colorBlue: 'Blue',
      colorTeal: 'Teal',
      colorGreen: 'Green',
      colorNeutral: 'Neutral',
      widthThin: 'Thin',
      widthMedium: 'Medium',
      widthThick: 'Thick',
      sizeSmall: 'Small',
      sizeMedium: 'Medium',
      sizeLarge: 'Large',
      paddingTight: 'Tight',
      paddingCompact: 'Compact',
      paddingNormal: 'Normal',
      paddingWide: 'Wide',
      contrastAuto: 'Auto',
      contrastLight: 'Light page',
      contrastDark: 'Dark page',
      countdown: 'Countdown',
      languageAuto: 'Browser default',
      languageZh: '简体中文',
      languageEn: 'English',
      deleted: 'Annotation deleted',
      restored: 'Undid the last action',
      copiedNotes: 'Notes copied',
      copyFailed: 'Copy failed. Please try again.',
      copiedImage: 'Image copied',
      downloadedImage: 'PNG downloaded',
      screenshotCopiedPaste: 'Screenshot copied. Press Ctrl+V to paste.',
      screenshotDownloadedFallback: 'Image copy was limited by the browser, so PinFix saved a PNG.',
      noRecentScreenshot: 'No recent screenshot to save',
      screenshotReady: 'Screenshot mode started',
      screenshotDone: 'Screenshot mode ended',
      focusDone: 'Moved to the annotation',
      nothingToCopy: 'No annotations to copy yet',
      clearConfirm: 'Clear all annotations, change requests, more notes, and privacy masks on this page? You can undo it.',
      deleteConfirm: 'Delete this annotation?',
      clearMasksConfirm: 'Clear all privacy masks on this page?',
      annotationList: 'Annotations',
      viewAnnotationList: 'View annotation list ({count})',
      annotationListHint: 'Hover or click to see details on the side.',
      noteReadyShort: 'Change request written',
      noteMissingStatus: 'Needs a change request',
      pageCleared: 'All page data cleared',
      privacyMode: 'Privacy mask',
      privacyModeOn: 'Privacy masking is on. Click sensitive areas to cover them.',
      privacyModeOff: 'Privacy masking is off',
      privacyModeStart: 'Start masking',
      privacyModeStop: 'Stop masking',
      privacyMaskAdded: 'Privacy mask added',
      privacyMasksCleared: 'Privacy masks cleared',
      privacyHint: 'These masks stay in screenshots and image exports to hide sensitive data.',
      maskLabel: 'MASK',
      actionEditNote: 'Write change request',
      actionMaskArea: 'Mask this area',
      actionDelete: 'Delete',
      actionShrinkMask: 'Shrink mask',
      actionExpandMask: 'Expand mask',
      actionDeleteMask: 'Delete mask',
      emptyState: 'No annotations yet. Click Select, hover an area, then right-click to annotate.',
      pageTitle: 'Page to update',
      pageUrl: 'Page URL',
      viewportMode: 'Capture mode: current viewport',
      changeSummary: 'Items to update',
      changeDetails: 'Detailed requests',
      businessNote: 'Business context behind these changes',
      extraInfo: 'Extra information',
      viewportInfo: 'Browser viewport',
      countInfo: 'Annotation count',
      timeInfo: 'Generated at',
      exportLimit: 'Complex pages may export imperfectly. Use Screenshot mode with a system capture when needed.',
      tipShrink: 'Shrink selection',
      tipExpand: 'Expand selection',
      tipSelectMode: 'Annotate mode',
      tipMaskMode: 'Mask mode',
      hotkeyCopy: 'Ctrl/Cmd + Shift + C: Copy notes',
      hotkeyScreenshot: 'Ctrl/Cmd + Shift + S: Screenshot mode',
      hotkeyExport: 'Ctrl/Cmd + Shift + E: Save current view',
      hotkeyUndo: 'Ctrl/Cmd + Z: Undo',
      hotkeyNotes: 'Ctrl/Cmd + Shift + H: Toggle notes'
    }
  };

  return {
    resolveLanguage(languageSetting) {
      return languageSetting === 'auto' ? getBrowserLanguage() : languageSetting;
    },
    t(language, key) {
      const group = messages[language] || messages.en;
      return group[key] || messages.en[key] || key;
    }
  };
}

function createStorage() {
  const globalKey = 'pinfix:global';
  const templateKey = 'pinfix:templates';
  const pageKeyPrefix = 'pinfix:page';

  // Use a stable URL so dashboard pages with temporary query params
  // do not create a new save record every time a token changes.
  function normaliseUrl(urlValue) {
    const url = new URL(urlValue, window.location.href);
    const keepHash = url.hash && url.hash !== '#' ? url.hash : '';
    return `${url.origin}${url.pathname}${keepHash}`;
  }

  function loadJson(key, fallback) {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function saveJson(key, value) {
    window.localStorage.setItem(key, JSON.stringify(value));
  }

  return {
    normaliseUrl,
    loadGlobalSettings() {
      const payload = loadJson(globalKey, null);
      if (!payload || payload.version !== PINFIX_STORAGE_VERSION) {
        return { ...PINFIX_DEFAULT_SETTINGS };
      }

      return {
        ...PINFIX_DEFAULT_SETTINGS,
        ...payload.settings
      };
    },
    saveGlobalSettings(settings) {
      saveJson(globalKey, {
        version: PINFIX_STORAGE_VERSION,
        savedAt: Date.now(),
        settings
      });
    },
    loadTemplates() {
      const payload = loadJson(templateKey, null);
      if (!payload || payload.version !== PINFIX_STORAGE_VERSION) {
        return [];
      }

      return Array.isArray(payload.templates) ? payload.templates : [];
    },
    saveTemplates(templates) {
      saveJson(templateKey, {
        version: PINFIX_STORAGE_VERSION,
        savedAt: Date.now(),
        templates: Array.isArray(templates) ? templates : []
      });
    },
    loadPageData(urlValue) {
      const key = `${pageKeyPrefix}:${normaliseUrl(urlValue)}`;
      const payload = loadJson(key, null);
      if (!payload || payload.version !== PINFIX_STORAGE_VERSION) {
        return {
          annotations: [],
          masks: [],
          globalNote: '',
          selectedTemplateIds: [],
          pageSettings: {}
        };
      }

      return {
        annotations: Array.isArray(payload.annotations) ? payload.annotations : [],
        masks: Array.isArray(payload.masks) ? payload.masks : [],
        globalNote: typeof payload.globalNote === 'string' ? payload.globalNote : '',
        selectedTemplateIds: Array.isArray(payload.selectedTemplateIds) ? payload.selectedTemplateIds : [],
        pageSettings: payload.pageSettings || {}
      };
    },
    savePageData(urlValue, payload) {
      const key = `${pageKeyPrefix}:${normaliseUrl(urlValue)}`;
      saveJson(key, {
        version: PINFIX_STORAGE_VERSION,
        savedAt: Date.now(),
        annotations: payload.annotations || [],
        masks: payload.masks || [],
        globalNote: payload.globalNote || '',
        selectedTemplateIds: Array.isArray(payload.selectedTemplateIds) ? payload.selectedTemplateIds : [],
        pageSettings: payload.pageSettings || {}
      });
    },
    clearPageData(urlValue) {
      const key = `${pageKeyPrefix}:${normaliseUrl(urlValue)}`;
      window.localStorage.removeItem(key);
    }
  };
}

function createSelectorManager(options) {
  let enabled = false;
  let currentChain = [];
  let currentIndex = 0;
  let lastPoint = null;
  let manualIndexLocked = false;

  function isIgnoredElement(element) {
    return !element || options.isIgnored(element);
  }

  function isVisibleElement(element) {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);

    return (
      rect.width >= 8 &&
      rect.height >= 8 &&
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      Number(style.opacity || '1') > 0
    );
  }

  function hasVisibleBoxStyle(style) {
    const hasBackground = style.backgroundColor !== 'transparent'
      && style.backgroundColor !== 'rgba(0, 0, 0, 0)';
    return style.borderStyle !== 'none' || hasBackground || style.backgroundImage !== 'none';
  }

  // The selector prefers blocks that look like real modules instead of
  // tiny text spans, but still keeps the full ancestor chain for [ and ].
  function isMeaningfulCandidate(element) {
    if (!element || !(element instanceof HTMLElement)) {
      return false;
    }

    if (['HTML', 'BODY'].includes(element.tagName)) {
      return false;
    }

    if (!isVisibleElement(element)) {
      return false;
    }

    const rect = element.getBoundingClientRect();
    const area = rect.width * rect.height;
    const viewportArea = window.innerWidth * window.innerHeight;
    const style = window.getComputedStyle(element);
    const interactive = ['BUTTON', 'A', 'INPUT', 'TEXTAREA', 'SELECT', 'LABEL'].includes(element.tagName);
    const hasVisualBox = hasVisibleBoxStyle(style);
    const looksInline = style.display === 'inline' && !interactive;

    if (rect.width > window.innerWidth * 0.98 && rect.height > window.innerHeight * 0.98) {
      return false;
    }

    if (looksInline && area < 2200) {
      return false;
    }

    return interactive || hasVisualBox || area > 3000 || element.children.length > 0;
  }

  function collectChain(startElement) {
    const chain = [];
    let current = startElement;

    while (current && current instanceof HTMLElement && current !== document.body) {
      if (!isIgnoredElement(current) && isMeaningfulCandidate(current)) {
        chain.push(current);
      }
      current = current.parentElement;
    }

    return chain;
  }

  function getSelectionMode() {
    return typeof options.getSelectionMode === 'function' ? options.getSelectionMode() : 'annotate';
  }

  function isSelectionActive() {
    return typeof options.isSelectionActive === 'function' ? options.isSelectionActive() : true;
  }

  function getElementsAtPoint(point) {
    if (document.elementsFromPoint) {
      return document.elementsFromPoint(point.x, point.y).filter((item) => item instanceof HTMLElement);
    }

    const single = document.elementFromPoint(point.x, point.y);
    return single instanceof HTMLElement ? [single] : [];
  }

  // Saved PinFix overlays can sit above the page. In select mode we need the
  // first real page element under the pointer, not our own annotation chrome.
  function getSelectableTarget(point) {
    const stack = getElementsAtPoint(point);
    return stack.find((element) => !isIgnoredElement(element) && isMeaningfulCandidate(element)) || null;
  }

  function getElementArea(element) {
    const rect = element.getBoundingClientRect();
    return rect.width * rect.height;
  }

  function isBroadContainer(element) {
    const rect = element.getBoundingClientRect();
    const viewportArea = window.innerWidth * window.innerHeight;
    const area = rect.width * rect.height;

    return (
      area > viewportArea * 0.68 ||
      (rect.width > window.innerWidth * 0.92 && rect.height > window.innerHeight * 0.72)
    );
  }

  function scoreDefaultCandidate(element, index) {
    const rect = element.getBoundingClientRect();
    const area = getElementArea(element);
    const viewportArea = window.innerWidth * window.innerHeight;
    const tagName = element.tagName;
    const style = window.getComputedStyle(element);
    const interactive = ['BUTTON', 'A', 'INPUT', 'TEXTAREA', 'SELECT', 'LABEL'].includes(tagName);
    const hasVisualBox = hasVisibleBoxStyle(style);
    const containerLike = element.children.length > 1 && ['DIV', 'SECTION', 'ARTICLE', 'LI'].includes(tagName);
    let score = index * 8;

    if (interactive) {
      score -= 18;
    }

    if (area < 1200 || rect.width < 20 || rect.height < 20) {
      score += interactive || hasVisualBox ? 6 : 36;
    }

    if (hasVisualBox) {
      score -= 10;
    }

    if (containerLike && area > 4200) {
      score += 16;
    }

    if (area > viewportArea * 0.45) {
      score += 80;
    }

    if (isBroadContainer(element)) {
      score += 160;
    }

    if (['MAIN', 'HEADER', 'FOOTER'].includes(tagName)) {
      score += 80;
    }

    if (style.display === 'inline' && !interactive) {
      score += 24;
    }

    return score;
  }

  function findDefaultIndex(chain) {
    if (!chain.length) {
      return 0;
    }

    return chain
      .map((element, index) => ({ index, score: scoreDefaultCandidate(element, index) }))
      .sort((left, right) => left.score - right.score)[0].index;
  }

  function notifyCandidate() {
    const element = currentChain[currentIndex] || null;
    options.onCandidateChange({
      element,
      chain: currentChain,
      index: currentIndex
    });
  }

  function refreshFromPoint(point) {
    if (!enabled || !isSelectionActive() || !point) {
      return;
    }

    const target = getSelectableTarget(point);
    if (!target) {
      currentChain = [];
      currentIndex = 0;
      notifyCandidate();
      return;
    }

    const chain = collectChain(target);
    const currentElement = currentChain[currentIndex] || null;
    currentChain = chain;
    if (manualIndexLocked && currentElement && chain.includes(currentElement) && !isBroadContainer(currentElement)) {
      currentIndex = chain.indexOf(currentElement);
    } else {
      manualIndexLocked = false;
      currentIndex = findDefaultIndex(chain);
    }
    notifyCandidate();
  }

  function handlePointerMove(event) {
    if (!isSelectionActive()) {
      return;
    }

    lastPoint = { x: event.clientX, y: event.clientY };
    refreshFromPoint(lastPoint);
  }

  function stopSelectionEvent(event) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  }

  function handleClick(event) {
    if (!enabled || !isSelectionActive() || getSelectionMode() !== 'mask') {
      return;
    }

    if (isIgnoredElement(event.target)) {
      return;
    }

    lastPoint = { x: event.clientX, y: event.clientY };
    refreshFromPoint(lastPoint);
    stopSelectionEvent(event);

    const element = currentChain[currentIndex];
    if (!element) {
      return;
    }

    options.onSelect(element);
    manualIndexLocked = false;
  }

  function handleContextMenu(event) {
    if (!enabled || !isSelectionActive() || getSelectionMode() === 'mask') {
      return;
    }

    if (isIgnoredElement(event.target)) {
      return;
    }

    lastPoint = { x: event.clientX, y: event.clientY };
    refreshFromPoint(lastPoint);
    stopSelectionEvent(event);

    const element = currentChain[currentIndex];
    if (!element) {
      return;
    }

    options.onSelect(element);
    manualIndexLocked = false;
  }

  function adjustSelection(direction) {
    if (!currentChain.length) {
      return;
    }

    currentIndex = clamp(currentIndex + direction, 0, currentChain.length - 1);
    manualIndexLocked = true;
    notifyCandidate();
  }

  function handleKeydown(event) {
    if (!enabled || !isSelectionActive() || isEditableTarget(event.target)) {
      return;
    }

    if (event.key === '[') {
      event.preventDefault();
      adjustSelection(-1);
    }

    if (event.key === ']') {
      event.preventDefault();
      adjustSelection(1);
    }
  }

  return {
    enable() {
      if (enabled) {
        return;
      }

      enabled = true;
      window.addEventListener('pointermove', handlePointerMove, true);
      window.addEventListener('click', handleClick, true);
      window.addEventListener('contextmenu', handleContextMenu, true);
      window.addEventListener('keydown', handleKeydown, true);

      if (lastPoint) {
        refreshFromPoint(lastPoint);
      }
    },
    disable() {
      if (!enabled) {
        return;
      }

      enabled = false;
      currentChain = [];
      currentIndex = 0;
      manualIndexLocked = false;
      window.removeEventListener('pointermove', handlePointerMove, true);
      window.removeEventListener('click', handleClick, true);
      window.removeEventListener('contextmenu', handleContextMenu, true);
      window.removeEventListener('keydown', handleKeydown, true);
      notifyCandidate();
    },
    isEnabled() {
      return enabled;
    },
    shrink() {
      adjustSelection(-1);
    },
    expand() {
      adjustSelection(1);
    },
    refresh() {
      refreshFromPoint(lastPoint);
    }
  };
}

function cssEscapeValue(value) {
  if (window.CSS && typeof window.CSS.escape === 'function') {
    return window.CSS.escape(value);
  }

  return String(value).replace(/[^a-zA-Z0-9_-]/g, '\\$&');
}

function captureElementRect(element) {
  const rect = element.getBoundingClientRect();

  return {
    pageLeft: rect.left + window.scrollX,
    pageTop: rect.top + window.scrollY,
    width: rect.width,
    height: rect.height,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight
  };
}

// Store both a CSS selector and a short text hint. The selector restores
// cleanly on most pages, while the text hint helps when the structure moves.
function buildElementAnchor(element) {
  return {
    selector: buildElementSelector(element),
    tagName: element.tagName,
    text: String(element.innerText || element.textContent || '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 120),
    rect: captureElementRect(element)
  };
}

function buildElementSelector(element) {
  if (element.id) {
    return `#${cssEscapeValue(element.id)}`;
  }

  const parts = [];
  let current = element;

  while (current && current instanceof HTMLElement && current !== document.body) {
    const tag = current.tagName.toLowerCase();
    const parent = current.parentElement;
    const className = Array.from(current.classList || [])
      .filter((item) => item && item.length < 28)
      .slice(0, 2)
      .map((item) => `.${cssEscapeValue(item)}`)
      .join('');

    if (!parent) {
      parts.unshift(tag);
      break;
    }

    const siblings = Array.from(parent.children).filter(
      (child) => child.tagName === current.tagName
    );
    const index = siblings.indexOf(current) + 1;
    parts.unshift(`${tag}${className}:nth-of-type(${index})`);
    current = parent;
  }

  return parts.join(' > ');
}

function findElementFromAnchor(anchor) {
  if (!anchor) {
    return null;
  }

  if (anchor.selector) {
    try {
      const direct = document.querySelector(anchor.selector);
      if (direct) {
        return direct;
      }
    } catch (error) {
      // Ignore invalid selectors from older saved data.
    }
  }

  if (anchor.tagName && anchor.text) {
    const candidates = Array.from(document.getElementsByTagName(anchor.tagName));
    const match = candidates.find((element) => {
      const text = String(element.innerText || element.textContent || '')
        .replace(/\s+/g, ' ')
        .trim();
      return text && anchor.text && text.includes(anchor.text.slice(0, 24));
    });

    if (match) {
      return match;
    }
  }

  return null;
}

function resolveAnnotationRect(annotation) {
  const anchorElement = findElementFromAnchor(annotation.anchor);
  if (anchorElement) {
    return {
      rect: captureElementRect(anchorElement),
      element: anchorElement
    };
  }

  return {
    rect: annotation.anchor ? annotation.anchor.rect : annotation.rect,
    element: null
  };
}

function parseRgbColor(colorValue) {
  const value = String(colorValue || '').trim();
  const rgbMatch = value.match(/rgba?\(([^)]+)\)/i);

  if (!rgbMatch) {
    return null;
  }

  const parts = rgbMatch[1].split(',').map((item) => Number(item.trim()));
  if (parts.length < 3) {
    return null;
  }

  return {
    r: parts[0],
    g: parts[1],
    b: parts[2],
    a: parts[3] == null ? 1 : parts[3]
  };
}

function luminanceFromRgb(rgb) {
  const channels = [rgb.r, rgb.g, rgb.b].map((value) => {
    const normalised = value / 255;
    return normalised <= 0.03928
      ? normalised / 12.92
      : ((normalised + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function detectSurfaceTone(element, contrastMode) {
  if (contrastMode === 'light') {
    return 'light';
  }

  if (contrastMode === 'dark') {
    return 'dark';
  }

  let current = element;
  while (current && current instanceof HTMLElement) {
    const computedStyle = window.getComputedStyle(current);
    const rgb = parseRgbColor(computedStyle.backgroundColor);
    if (rgb && rgb.a > 0.05) {
      return luminanceFromRgb(rgb) > 0.45 ? 'light' : 'dark';
    }
    current = current.parentElement;
  }

  const textRgb = parseRgbColor(window.getComputedStyle(element).color);
  if (textRgb) {
    return luminanceFromRgb(textRgb) > 0.55 ? 'dark' : 'light';
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getAnnotationReviewSummary(annotations, masks) {
  const missingAnnotations = annotations.filter((annotation) => !String(annotation.note || '').trim());
  const missingNumbers = missingAnnotations.map((annotation) => annotation.number);

  return {
    annotationCount: annotations.length,
    maskCount: masks.length,
    missingCount: missingNumbers.length,
    missingNumbers,
    ready: missingNumbers.length === 0
  };
}

/*!
 * html2canvas 1.4.1 <https://html2canvas.hertzen.com>
 * Copyright (c) 2022 Niklas von Hertzen <https://hertzen.com>
 * Released under MIT License
 */
!function(A,e){"object"==typeof exports&&"undefined"!=typeof module?module.exports=e():"function"==typeof define&&define.amd?define(e):(A="undefined"!=typeof globalThis?globalThis:A||self).html2canvas=e()}(this,function(){"use strict";
/*! *****************************************************************************
    Copyright (c) Microsoft Corporation.

    Permission to use, copy, modify, and/or distribute this software for any
    purpose with or without fee is hereby granted.

    THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
    REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
    AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
    INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
    LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
    OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
    PERFORMANCE OF THIS SOFTWARE.
    ***************************************************************************** */var r=function(A,e){return(r=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(A,e){A.__proto__=e}||function(A,e){for(var t in e)Object.prototype.hasOwnProperty.call(e,t)&&(A[t]=e[t])})(A,e)};function A(A,e){if("function"!=typeof e&&null!==e)throw new TypeError("Class extends value "+String(e)+" is not a constructor or null");function t(){this.constructor=A}r(A,e),A.prototype=null===e?Object.create(e):(t.prototype=e.prototype,new t)}var h=function(){return(h=Object.assign||function(A){for(var e,t=1,r=arguments.length;t<r;t++)for(var B in e=arguments[t])Object.prototype.hasOwnProperty.call(e,B)&&(A[B]=e[B]);return A}).apply(this,arguments)};function a(A,s,o,i){return new(o=o||Promise)(function(t,e){function r(A){try{n(i.next(A))}catch(A){e(A)}}function B(A){try{n(i.throw(A))}catch(A){e(A)}}function n(A){var e;A.done?t(A.value):((e=A.value)instanceof o?e:new o(function(A){A(e)})).then(r,B)}n((i=i.apply(A,s||[])).next())})}function H(t,r){var B,n,s,o={label:0,sent:function(){if(1&s[0])throw s[1];return s[1]},trys:[],ops:[]},A={next:e(0),throw:e(1),return:e(2)};return"function"==typeof Symbol&&(A[Symbol.iterator]=function(){return this}),A;function e(e){return function(A){return function(e){if(B)throw new TypeError("Generator is already executing.");for(;o;)try{if(B=1,n&&(s=2&e[0]?n.return:e[0]?n.throw||((s=n.return)&&s.call(n),
0):n.next)&&!(s=s.call(n,e[1])).done)return s;switch(n=0,(e=s?[2&e[0],s.value]:e)[0]){case 0:case 1:s=e;break;case 4:return o.label++,{value:e[1],done:!1};case 5:o.label++,n=e[1],e=[0];continue;case 7:e=o.ops.pop(),o.trys.pop();continue;default:if(!(s=0<(s=o.trys).length&&s[s.length-1])&&(6===e[0]||2===e[0])){o=0;continue}if(3===e[0]&&(!s||e[1]>s[0]&&e[1]<s[3])){o.label=e[1];break}if(6===e[0]&&o.label<s[1]){o.label=s[1],s=e;break}if(s&&o.label<s[2]){o.label=s[2],o.ops.push(e);break}s[2]&&o.ops.pop(),o.trys.pop();continue}e=r.call(t,o)}catch(A){e=[6,A],n=0}finally{B=s=0}if(5&e[0])throw e[1];return{value:e[0]?e[1]:void 0,done:!0}}([e,A])}}}function t(A,e,t){if(t||2===arguments.length)for(var r,B=0,n=e.length;B<n;B++)!r&&B in e||((r=r||Array.prototype.slice.call(e,0,B))[B]=e[B]);return A.concat(r||e)}var d=(B.prototype.add=function(A,e,t,r){return new B(this.left+A,this.top+e,this.width+t,this.height+r)},B.fromClientRect=function(A,e){return new B(e.left+A.windowBounds.left,e.top+A.windowBounds.top,e.width,e.height)},B.fromDOMRectList=function(A,e){e=Array.from(e).find(function(A){return 0!==A.width});return e?new B(e.left+A.windowBounds.left,e.top+A.windowBounds.top,e.width,e.height):B.EMPTY},B.EMPTY=new B(0,0,0,0),B);function B(A,e,t,r){this.left=A,this.top=e,this.width=t,this.height=r}for(var f=function(A,e){return d.fromClientRect(A,e.getBoundingClientRect())},Q=function(A){for(var e=[],
t=0,r=A.length;t<r;){var B,n=A.charCodeAt(t++);55296<=n&&n<=56319&&t<r?56320==(64512&(B=A.charCodeAt(t++)))?e.push(((1023&n)<<10)+(1023&B)+65536):(e.push(n),t--):e.push(n)}return e},g=function(){for(var A=[],e=0;e<arguments.length;e++)A[e]=arguments[e];if(String.fromCodePoint)return String.fromCodePoint.apply(String,A);var t=A.length;if(!t)return"";for(var r=[],B=-1,n="";++B<t;){var s=A[B];s<=65535?r.push(s):(s-=65536,r.push(55296+(s>>10),s%1024+56320)),(B+1===t||16384<r.length)&&(n+=String.fromCharCode.apply(String,r),r.length=0)}return n},e="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",n="undefined"==typeof Uint8Array?[]:new Uint8Array(256),s=0;s<e.length;s++)n[e.charCodeAt(s)]=s;for(var o="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",c="undefined"==typeof Uint8Array?[]:new Uint8Array(256),i=0;i<o.length;i++)c[o.charCodeAt(i)]=i;function w(A,e,t){return A.slice?A.slice(e,t):new Uint16Array(Array.prototype.slice.call(A,e,t))}var U=(l.prototype.get=function(A){var e;if(0<=A){if(A<55296||56319<A&&A<=65535)return e=this.index[A>>5],this.data[e=(e<<2)+(31&A)];if(A<=65535)return e=this.index[2048+(A-55296>>5)],this.data[e=(e<<2)+(31&A)];if(A<this.highStart)return e=this.index[e=2080+(A>>11)],e=this.index[e+=A>>5&63],this.data[e=(e<<2)+(31&A)];if(A<=1114111)return this.data[this.highValueIndex]}return this.errorValue},l);function l(A,e,t,r,B,
n){this.initialValue=A,this.errorValue=e,this.highStart=t,this.highValueIndex=r,this.index=B,this.data=n}for(var C="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",u="undefined"==typeof Uint8Array?[]:new Uint8Array(256),F=0;F<C.length;F++)u[C.charCodeAt(F)]=F;function p(A,e,t,r){var B=r[t];if(Array.isArray(A)?-1!==A.indexOf(B):A===B)for(var n=t;n<=r.length;){if((o=r[++n])===e)return 1;if(o!==D)break}if(B===D)for(n=t;0<n;){var s=r[--n];if(Array.isArray(A)?-1!==A.indexOf(s):A===s)for(var o,i=t;i<=r.length;){if((o=r[++i])===e)return 1;if(o!==D)break}if(s!==D)break}}function E(A,e){for(var t=A;0<=t;){var r=e[t];if(r!==D)return r;t--}return 0}function I(t,A){var e=(B=function(A,r){void 0===r&&(r="strict");var B=[],n=[],s=[];return A.forEach(function(A,e){var t=rA.get(A);if(50<t?(s.push(!0),t-=50):s.push(!1),-1!==["normal","auto","loose"].indexOf(r)&&-1!==[8208,8211,12316,12448].indexOf(A))return n.push(e),B.push(16);if(4!==t&&11!==t)return n.push(e),31===t?B.push("strict"===r?O:q):t===AA||29===t?B.push(J):43===t?131072<=A&&A<=196605||196608<=A&&A<=262141?B.push(q):B.push(J):void B.push(t);if(0===e)return n.push(e),B.push(J);t=B[e-1];return-1===iA.indexOf(t)?(n.push(n[e-1]),B.push(t)):(n.push(e),B.push(J))}),[n,B,s]}(t,(A=A||{lineBreak:"normal",wordBreak:"normal"}).lineBreak))[0],r=B[1],B=B[2];return[e,r="break-all"===A.wordBreak||"break-word"===A.wordBreak?r.map(function(A){return-1!==[R,
J,AA].indexOf(A)?q:A}):r,"keep-all"===A.wordBreak?B.map(function(A,e){return A&&19968<=t[e]&&t[e]<=40959}):void 0]}var y,K,m,L,b,D=10,v=13,x=15,M=17,S=18,T=19,G=20,O=21,V=22,k=24,R=25,N=26,P=27,X=28,J=30,Y=32,W=33,Z=34,_=35,q=37,j=38,z=39,$=40,AA=42,eA=[9001,65288],tA="×",rA=(m=function(A){var e,t,r,B,n=.75*A.length,s=A.length,o=0;"="===A[A.length-1]&&(n--,"="===A[A.length-2]&&n--);for(var n=new("undefined"!=typeof ArrayBuffer&&"undefined"!=typeof Uint8Array&&void 0!==Uint8Array.prototype.slice?ArrayBuffer:Array)(n),i=Array.isArray(n)?n:new Uint8Array(n),Q=0;Q<s;Q+=4)e=c[A.charCodeAt(Q)],t=c[A.charCodeAt(Q+1)],r=c[A.charCodeAt(Q+2)],B=c[A.charCodeAt(Q+3)],i[o++]=e<<2|t>>4,i[o++]=(15&t)<<4|r>>2,i[o++]=(3&r)<<6|63&B;return n}(y=("KwAAAAAAAAAACA4AUD0AADAgAAACAAAAAAAIABAAGABAAEgAUABYAGAAaABgAGgAYgBqAF8AZwBgAGgAcQB5AHUAfQCFAI0AlQCdAKIAqgCyALoAYABoAGAAaABgAGgAwgDKAGAAaADGAM4A0wDbAOEA6QDxAPkAAQEJAQ8BFwF1AH0AHAEkASwBNAE6AUIBQQFJAVEBWQFhAWgBcAF4ATAAgAGGAY4BlQGXAZ8BpwGvAbUBvQHFAc0B0wHbAeMB6wHxAfkBAQIJAvEBEQIZAiECKQIxAjgCQAJGAk4CVgJeAmQCbAJ0AnwCgQKJApECmQKgAqgCsAK4ArwCxAIwAMwC0wLbAjAA4wLrAvMC+AIAAwcDDwMwABcDHQMlAy0DNQN1AD0DQQNJA0kDSQNRA1EDVwNZA1kDdQB1AGEDdQBpA20DdQN1AHsDdQCBA4kDkQN1AHUAmQOhA3UAdQB1AHUAdQB1AHUAdQB1AHUAdQB1AHUAdQB1AHUAdQB1AKYDrgN1AHUAtgO+A8YDzgPWAxcD3gPjA+sD8wN1AHUA+wMDBAkEdQANBBUEHQQlBCoEFwMyBDgEYABABBcDSARQBFgEYARoBDAAcAQzAXgEgASIBJAEdQCXBHUAnwSnBK4EtgS6BMIEyAR1AHUAdQB1AHUAdQCVANAEYABgAGAAYABgAGAAYABgANgEYADcBOQEYADsBPQE/AQEBQwFFAUcBSQFLAU0BWQEPAVEBUsFUwVbBWAAYgVgAGoFcgV6BYIFigWRBWAAmQWfBaYFYABgAGAAYABgAKoFYACxBbAFuQW6BcEFwQXHBcEFwQXPBdMF2wXjBeoF8gX6BQIGCgYSBhoGIgYqBjIGOgZgAD4GRgZMBmAAUwZaBmAAYABgAGAAYABgAGAAYABgAGAAYABgAGIGYABpBnAGYABgAGAAYABgAGAAYABgAGAAYAB4Bn8GhQZgAGAAYAB1AHcDFQSLBmAAYABgAJMGdQA9A3UAmwajBqsGqwaVALMGuwbDBjAAywbSBtIG1QbSBtIG0gbSBtIG0gbdBuMG6wbzBvsGAwcLBxMHAwcbByMHJwcsBywHMQcsB9IGOAdAB0gHTgfSBkgHVgfSBtIG0gbSBtIG0gbSBtIG0gbSBiwHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywH" +
"LAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAdgAGAALAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywH" +
"LAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAdbB2MHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsB2kH0gZwB64EdQB1AHUAdQB1AHUAdQB1AHUHfQdgAIUHjQd1AHUAlQedB2AA" +
"YAClB6sHYACzB7YHvgfGB3UAzgfWBzMB3gfmB1EB7gf1B/0HlQENAQUIDQh1ABUIHQglCBcDLQg1CD0IRQhNCEEDUwh1AHUAdQBbCGMIZAhlCGYIZwhoCGkIYwhkCGUIZghnCGgIaQhjCGQIZQhmCGcIaAhpCGMIZAhlCGYIZwhoCGkIYwhkCGUIZghnCGgIaQhjCGQIZQhmCGcIaAhpCGMIZAhlCGYIZwhoCGkIYwhkCGUIZghnCGgIaQhjCGQIZQhmCGcIaAhpCGMIZAhlCGYIZwhoCGkIYwhkCGUIZghnCGgIaQhjCGQIZQhmCGcIaAhpCGMIZAhlCGYIZwhoCGkIYwhkCGUIZghnCGgIaQhjCGQIZQhmCGcIaAhpCGMIZAhlCGYIZwhoCGkIYwhkCGUIZghnCGgIaQhjCGQIZQhmCGcIaAhpCGMIZAhlCGYIZwhoCGkIYwhkCGUIZghnCGgIaQhjCGQIZQhmCGcIaAhpCGMIZAhlCGYIZwhoCGkIYwhkCGUIZghnCGgIaQhjCGQIZQhmCGcIaAhpCGMIZAhlCGYIZwhoCGkIYwhkCGUIZghnCGgIaQhjCGQIZQhmCGcIaAhpCGMIZAhlCGYIZwhoCGkIYwhkCGUIZghnCGgIaQhjCGQIZQhmCGcIaAhpCGMIZAhlCGYIZwhoCGkIYwhkCGUIZghnCGgIaQhjCGQIZQhmCGcIaAhpCGMIZAhlCGYIZwhoCGkIYwhkCGUIZghnCGgIaQhjCGQIZQhmCGcIaAhpCGMIZAhlCGYIZwhoCGkIYwhkCGUIZghnCGgIaQhjCGQIZQhmCGcIaAhpCGMIZAhlCGYIZwhoCGkIYwhkCGUIZghnCGgIaQhjCGQIZQhmCGcIaAhpCGMIZAhlCGYIZwhoCGkIYwhkCGUIZghnCGgIaQhjCGQIZQhmCGcIaAhpCGMIZAhlCGYIZwhoCGkIYwhkCGUIZghnCGgIaQhjCGQIZQhmCGcIaAhpCGMIZAhlCGYIZwhoCGkIYwhkCGUIZghnCGgIcAh3CHoIMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwAIIIggiCCIIIggiCCIIIggiCCIIIggiCCIIIggiCCIIIggiCCIIIggiCCIIIggiCCIIIggiCCIII" +
"ggiCCIIIgggwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAALAcsBywHLAcsBywHLAcsBywHLAcsB4oILAcsB44I0gaWCJ4Ipgh1AHUAqgiyCHUAdQB1AHUAdQB1AHUAdQB1AHUAtwh8AXUAvwh1AMUIyQjRCNkI4AjoCHUAdQB1AO4I9gj+CAYJDgkTCS0HGwkjCYIIggiCCIIIggiCCIIIggiCCIIIggiCCIIIggiCCIIIggiCCIIIggiCCIIIggiCCIIIggiCCIIIggiCCIIIggiAAIAAAAFAAYABgAGIAXwBgAHEAdQBFAJUAogCyAKAAYABgAEIA4ABGANMA4QDxAMEBDwE1AFwBLAE6AQEBUQF4QkhCmEKoQrhCgAHIQsAB0MLAAcABwAHAAeDC6ABoAHDCwMMAAcABwAHAAdDDGMMAAcAB6MM4wwjDWMNow3jDaABoAGgAaABoAGgAaABoAGgAaABoAGgAaABoAGgAaABoAGgAaABoAEjDqABWw6bDqABpg6gAaABoAHcDvwOPA+gAaABfA/8DvwO/A78DvwO/A78DvwO/A78DvwO/A78DvwO/A78DvwO/A78DvwO/A78DvwO/A78DvwO/A78DpcPAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAH" +
"AAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcAB9cPKwkyCToJMAB1AHUAdQBCCUoJTQl1AFUJXAljCWcJawkwADAAMAAwAHMJdQB2CX4JdQCECYoJjgmWCXUAngkwAGAAYABxAHUApgn3A64JtAl1ALkJdQDACTAAMAAwADAAdQB1AHUAdQB1AHUAdQB1AHUAowYNBMUIMAAwADAAMADICcsJ0wnZCRUE4QkwAOkJ8An4CTAAMAB1AAAKvwh1AAgKDwoXCh8KdQAwACcKLgp1ADYKqAmICT4KRgowADAAdQB1AE4KMAB1AFYKdQBeCnUAZQowADAAMAAwADAAMAAwADAAMAAVBHUAbQowADAAdQC5CXUKMAAwAHwBxAijBogEMgF9CoQKiASMCpQKmgqIBKIKqgquCogEDQG2Cr4KxgrLCjAAMADTCtsKCgHjCusK8Qr5CgELMAAwADAA" +
"MAB1AIsECQsRC3UANAEZCzAAMAAwADAAMAB1ACELKQswAHUANAExCzkLdQBBC0kLMABRC1kLMAAwADAAMAAwADAAdQBhCzAAMAAwAGAAYABpC3ELdwt/CzAAMACHC4sLkwubC58Lpwt1AK4Ltgt1APsDMAAwADAAMAAwADAAMAAwAL4LwwvLC9IL1wvdCzAAMADlC+kL8Qv5C/8LSQswADAAMAAwADAAMAAwADAAMAAHDDAAMAAwADAAMAAODBYMHgx1AHUAdQB1AHUAdQB1AHUAdQB1AHUAdQB1AHUAdQB1AHUAdQB1AHUAdQB1AHUAdQB1AHUAdQB1ACYMMAAwADAAdQB1AHUALgx1AHUAdQB1AHUAdQA2DDAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwAHUAdQB1AHUAdQB1AHUAdQB1AHUAdQB1AHUAdQB1AHUAdQB1AD4MdQBGDHUAdQB1AHUAdQB1AEkMdQB1AHUAdQB1AFAMMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwAHUAdQB1AHUAdQB1AHUAdQB1AHUAdQB1AHUAdQBYDHUAdQB1AF8MMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAB1AHUAdQB1AHUAdQB1AHUAdQB1AHUAdQB1AHUAdQB1AHUA+wMVBGcMMAAwAHwBbwx1AHcMfwyHDI8MMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAYABgAJcMMAAwADAAdQB1AJ8MlQClDDAAMACtDCwHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsB7UMLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHdQB1AHUAdQB1AHUAdQB1AHUAdQB1AHUAdQB1AA0EMAC9DDAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAA" +
"MAAsBywHLAcsBywHLAcsBywHLQcwAMEMyAwsBywHLAcsBywHLAcsBywHLAcsBywHzAwwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwAHUAdQB1ANQM2QzhDDAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMABgAGAAYABgAGAAYABgAOkMYADxDGAA+AwADQYNYABhCWAAYAAODTAAMAAwADAAFg1gAGAAHg37AzAAMAAwADAAYABgACYNYAAsDTQNPA1gAEMNPg1LDWAAYABgAGAAYABgAGAAYABgAGAAUg1aDYsGVglhDV0NcQBnDW0NdQ15DWAAYABgAGAAYABgAGAAYABgAGAAYABgAGAAYABgAGAAlQCBDZUAiA2PDZcNMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAnw2nDTAAMAAwADAAMAAwAHUArw23DTAAMAAwADAAMAAwADAAMAAwADAAMAB1AL8NMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAB1AHUAdQB1AHUAdQDHDTAAYABgAM8NMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAA1w11ANwNMAAwAD0B5A0wADAAMAAwADAAMADsDfQN/A0EDgwOFA4wABsOMAAwADAAMAAwADAAMAAwANIG0gbSBtIG0gbSBtIG0gYjDigOwQUuDsEFMw7SBjoO0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIGQg5KDlIOVg7SBtIGXg5lDm0OdQ7SBtIGfQ6EDooOjQ6UDtIGmg6hDtIG0gaoDqwO0ga0DrwO0gZgAGAAYADEDmAAYAAkBtIGzA5gANIOYADaDokO0gbSBt8O5w7SBu8O0gb1DvwO0gZgAGAAxA7SBtIG0gbSBtIGYABgAGAAYAAED2AAsAUMD9IG" +
"0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIGFA8sBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAccD9IGLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHJA8sBywHLAcsBywHLAccDywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywPLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAc0D9IG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIGLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAccD9IG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIGFA8sBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHPA/SBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG" +
"0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gYUD0QPlQCVAJUAMAAwADAAMACVAJUAlQCVAJUAlQCVAEwPMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAA//8EAAQABAAEAAQABAAEAAQABAANAAMAAQABAAIABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQACgATABcAHgAbABoAHgAXABYAEgAeABsAGAAPABgAHABLAEsASwBLAEsASwBLAEsASwBLABgAGAAeAB4AHgATAB4AUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQABYAGwASAB4AHgAeAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAAWAA0AEQAeAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArAAQABAAEAAQABAAFAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAJABYAGgAbABsAGwAeAB0AHQAeAE8AFwAeAA0AHgAeABoAGwBPAE8ADgBQAB0AHQAdAE8ATwAXAE8ATwBPABYAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAB0AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4A" +
"HgAeAB4AHgAeAB4AHgAdAFAAUABQAFAAUABQAFAAUAAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAFAAHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAAeAB4AHgAeAFAATwBAAE8ATwBPAEAATwBQAFAATwBQAB4AHgAeAB4AHgAeAB0AHQAdAB0AHgAdAB4ADgBQAFAAUABQAFAAHgAeAB4AHgAeAB4AHgBQAB4AUAAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4ABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAJAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAkACQAJAAkACQAJAAkABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAeAB4AHgAeAFAAHgAeAB4AKwArAFAAUABQAFAAGABQACsAKwArACsAHgAeAFAAHgBQAFAAUAArAFAAKwAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AKwAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4ABAAEAAQABAAEAAQABAAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4A" +
"HgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArACsAUAAeAB4AHgAeAB4AHgBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAAYAA0AKwArAB4AHgAbACsABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQADQAEAB4ABAAEAB4ABAAEABMABAArACsAKwArACsAKwArACsAVgBWAFYAVgBWAFYAVgBWAFYAVgBWAFYAVgBWAFYAVgBWAFYAVgBWAFYAVgBWAFYAVgBWAFYAKwArACsAKwBWAFYAVgBWAB4AHgArACsAKwArACsAKwArACsAKwArACsAHgAeAB4AHgAeAB4AHgAeAB4AGgAaABoAGAAYAB4AHgAEAAQABAAEAAQABAAEAAQABAAEAAQAEwAEACsAEwATAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABABLAEsASwBLAEsASwBLAEsASwBLABoAGQAZAB4AUABQAAQAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQABMAUAAEAAQABAAEAAQABAAEAB4AHgAEAAQABAAEAAQABABQAFAABAAEAB4ABAAEAAQABABQAFAASwBLAEsASwBLAEsASwBLAEsASwBQAFAAUAAeAB4AUAAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AKwAeAFAABABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEACsA" +
"KwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAABAAEAAQABAAEAAQABAAEAAQABAAEAFAAKwArACsAKwArACsAKwArACsAKwArACsAKwArAEsASwBLAEsASwBLAEsASwBLAEsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAABAAEAAQABAAEAAQABAAEAAQAUABQAB4AHgAYABMAUAArACsABAAbABsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAAEAAQABAAEAFAABAAEAAQABAAEAFAABAAEAAQAUAAEAAQABAAEAAQAKwArAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAAEAAQABAArACsAHgArAFAAUABQAFAAUABQAFAAUABQAFAAUAArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArAFAAUABQAFAAUABQAFAAUABQAFAAKwArACsAKwArACsAKwArACsAKwArAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAB4ABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAAQABAAEAFAABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAUAAEAAQABAAEAAQABAAEAFAAUABQAFAAUABQAFAAUABQAFAABAAEAA0ADQBLAEsASwBLAEsASwBLAEsASwBLAB4AUABQAFAAUABQAFAAUABQAFAA" +
"UABQAFAAUABQAFAAUAAEAAQABAArAFAAUABQAFAAUABQAFAAUAArACsAUABQACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwBQAFAAUABQAFAAUABQACsAUAArACsAKwBQAFAAUABQACsAKwAEAFAABAAEAAQABAAEAAQABAArACsABAAEACsAKwAEAAQABABQACsAKwArACsAKwArACsAKwAEACsAKwArACsAUABQACsAUABQAFAABAAEACsAKwBLAEsASwBLAEsASwBLAEsASwBLAFAAUAAaABoAUABQAFAAUABQAEwAHgAbAFAAHgAEACsAKwAEAAQABAArAFAAUABQAFAAUABQACsAKwArACsAUABQACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwBQAFAAUABQAFAAUABQACsAUABQACsAUABQACsAUABQACsAKwAEACsABAAEAAQABAAEACsAKwArACsABAAEACsAKwAEAAQABAArACsAKwAEACsAKwArACsAKwArACsAUABQAFAAUAArAFAAKwArACsAKwArACsAKwBLAEsASwBLAEsASwBLAEsASwBLAAQABABQAFAAUAAEAB4AKwArACsAKwArACsAKwArACsAKwAEAAQABAArAFAAUABQAFAAUABQAFAAUABQACsAUABQAFAAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwBQAFAAUABQAFAAUABQACsAUABQACsAUABQAFAAUABQACsAKwAEAFAABAAEAAQABAAEAAQABAAEACsABAAEAAQAKwAEAAQABAArACsAUAArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwBQAFAABAAEACsAKwBLAEsASwBLAEsASwBLAEsASwBLAB4AGwArACsAKwArACsAKwArAFAABAAEAAQABAAEAAQAKwAEAAQABAArAFAAUABQAFAAUABQAFAAUAArACsAUABQACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAAQABAAEAAQABAArACsABAAEACsAKwAEAAQABAArACsAKwArACsAKwArAAQABAAEACsAKwArACsAUABQACsAUABQAFAABAAEACsAKwBLAEsASwBLAEsASwBLAEsASwBLAB4AUABQAFAA" +
"UABQAFAAUAArACsAKwArACsAKwArACsAKwArAAQAUAArAFAAUABQAFAAUABQACsAKwArAFAAUABQACsAUABQAFAAUAArACsAKwBQAFAAKwBQACsAUABQACsAKwArAFAAUAArACsAKwBQAFAAUAArACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUAArACsAKwArAAQABAAEAAQABAArACsAKwAEAAQABAArAAQABAAEAAQAKwArAFAAKwArACsAKwArACsABAArACsAKwArACsAKwArACsAKwArAEsASwBLAEsASwBLAEsASwBLAEsAUABQAFAAHgAeAB4AHgAeAB4AGwAeACsAKwArACsAKwAEAAQABAAEAAQAUABQAFAAUABQAFAAUABQACsAUABQAFAAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwArACsAUAAEAAQABAAEAAQABAAEACsABAAEAAQAKwAEAAQABAAEACsAKwArACsAKwArACsABAAEACsAUABQAFAAKwArACsAKwArAFAAUAAEAAQAKwArAEsASwBLAEsASwBLAEsASwBLAEsAKwArACsAKwArACsAKwAOAFAAUABQAFAAUABQAFAAHgBQAAQABAAEAA4AUABQAFAAUABQAFAAUABQACsAUABQAFAAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArAFAAUABQAFAAUABQAFAAUABQAFAAKwBQAFAAUABQAFAAKwArAAQAUAAEAAQABAAEAAQABAAEACsABAAEAAQAKwAEAAQABAAEACsAKwArACsAKwArACsABAAEACsAKwArACsAKwArACsAUAArAFAAUAAEAAQAKwArAEsASwBLAEsASwBLAEsASwBLAEsAKwBQAFAAKwArACsAKwArACsAKwArACsAKwArACsAKwAEAAQABAAEAFAAUABQAFAAUABQAFAAUABQACsAUABQAFAAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAABAAEAFAABAAEAAQABAAEAAQABAArAAQABAAEACsABAAEAAQABABQAB4AKwArACsAKwBQAFAA" +
"UAAEAFAAUABQAFAAUABQAFAAUABQAFAABAAEACsAKwBLAEsASwBLAEsASwBLAEsASwBLAFAAUABQAFAAUABQAFAAUABQABoAUABQAFAAUABQAFAAKwAEAAQABAArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQACsAKwArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArAFAAUABQAFAAUABQAFAAUABQACsAUAArACsAUABQAFAAUABQAFAAUAArACsAKwAEACsAKwArACsABAAEAAQABAAEAAQAKwAEACsABAAEAAQABAAEAAQABAAEACsAKwArACsAKwArAEsASwBLAEsASwBLAEsASwBLAEsAKwArAAQABAAeACsAKwArACsAKwArACsAKwArACsAKwArAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXAAqAFwAXAAqACoAKgAqACoAKgAqACsAKwArACsAGwBcAFwAXABcAFwAXABcACoAKgAqACoAKgAqACoAKgAeAEsASwBLAEsASwBLAEsASwBLAEsADQANACsAKwArACsAKwBcAFwAKwBcACsAXABcAFwAXABcACsAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcACsAXAArAFwAXABcAFwAXABcAFwAXABcAFwAKgBcAFwAKgAqACoAKgAqACoAKgAqACoAXAArACsAXABcAFwAXABcACsAXAArACoAKgAqACoAKgAqACsAKwBLAEsASwBLAEsASwBLAEsASwBLACsAKwBcAFwAXABcAFAADgAOAA4ADgAeAA4ADgAJAA4ADgANAAkAEwATABMAEwATAAkAHgATAB4AHgAeAAQABAAeAB4AHgAeAB4AHgBLAEsASwBLAEsASwBLAEsASwBLAFAAUABQAFAAUABQAFAAUABQAFAADQAEAB4ABAAeAAQAFgARABYAEQAEAAQAUABQAFAAUABQAFAAUABQACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwArACsAKwAEAAQABAAEAAQABAAEAAQABAAEAAQA" +
"BAAEAAQADQAEAAQABAAEAAQADQAEAAQAUABQAFAAUABQAAQABAAEAAQABAAEAAQABAAEAAQABAArAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAArAA0ADQAeAB4AHgAeAB4AHgAEAB4AHgAeAB4AHgAeACsAHgAeAA4ADgANAA4AHgAeAB4AHgAeAAkACQArACsAKwArACsAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcACoAKgAqACoAKgAqACoAKgAqACoAKgAqACoAKgAqACoAKgAqACoAKgBcAEsASwBLAEsASwBLAEsASwBLAEsADQANAB4AHgAeAB4AXABcAFwAXABcAFwAKgAqACoAKgBcAFwAXABcACoAKgAqAFwAKgAqACoAXABcACoAKgAqACoAKgAqACoAXABcAFwAKgAqACoAKgBcAFwAXABcAFwAXABcAFwAXABcAFwAXABcACoAKgAqACoAKgAqACoAKgAqACoAKgAqAFwAKgBLAEsASwBLAEsASwBLAEsASwBLACoAKgAqACoAKgAqAFAAUABQAFAAUABQACsAUAArACsAKwArACsAUAArACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAHgBQAFAAUABQAFgAWABYAFgAWABYAFgAWABYAFgAWABYAFgAWABYAFgAWABYAFgAWABYAFgAWABYAFgAWABYAFgAWABYAFgAWABZAFkAWQBZAFkAWQBZAFkAWQBZAFkAWQBZAFkAWQBZAFkAWQBZAFkAWQBZAFkAWQBZAFkAWQBZAFkAWQBZAFkAWgBaAFoAWgBaAFoAWgBaAFoAWgBaAFoAWgBaAFoAWgBaAFoAWgBaAFoAWgBaAFoAWgBaAFoAWgBaAFoAWgBaAFAAUABQAFAAUABQAFAAUABQACsAUABQAFAAUAArACsAUABQAFAAUABQAFAAUAArAFAAKwBQAFAAUABQACsAKwBQAFAAUABQAFAAUABQAFAAUAArAFAAUABQAFAAKwArAFAAUABQAFAAUABQAFAAUABQAFAA" +
"UABQAFAAUABQAFAAUAArAFAAUABQAFAAKwArAFAAUABQAFAAUABQAFAAKwBQACsAUABQAFAAUAArACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwBQAFAAUABQACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArACsABAAEAAQAHgANAB4AHgAeAB4AHgAeAB4AUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQACsAKwArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAHgAeAB4AHgAeAB4AHgAeAB4AHgArACsAKwArACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQACsAKwBQAFAAUABQAFAAUAArACsADQBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAHgAeAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAANAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAAWABEAKwArACsAUABQAFAAUABQAFAAUABQAFAAUABQAA0ADQANAFAAUABQAFAAUABQAFAAUABQAFAAUAArACsAKwArACsAKwArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwBQAFAAUABQAAQABAAEACsAKwArACsAKwArACsAKwArACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAAEAAQABAANAA0AKwArACsAKwArACsAKwArACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAABAAEACsAKwArACsAKwArACsAKwArACsAKwArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwBQAFAAUAArAAQABAArACsAKwArACsAKwArACsAKwArACsAKwBcAFwAXABcAFwAXABcAFwA" +
"XABcAFwAXABcAFwAXABcAFwAXABcAFwAKgAqACoAKgAqACoAKgAqACoAKgAqACoAKgAqACoAKgAqACoAKgAqAA0ADQAVAFwADQAeAA0AGwBcACoAKwArAEsASwBLAEsASwBLAEsASwBLAEsAKwArACsAKwArACsAUABQAFAAUABQAFAAUABQAFAAUAArACsAKwArACsAKwAeAB4AEwATAA0ADQAOAB4AEwATAB4ABAAEAAQACQArAEsASwBLAEsASwBLAEsASwBLAEsAKwArACsAKwArACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArACsAKwArACsAKwArAFAAUABQAFAAUAAEAAQAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAAQAUAArACsAKwArACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArACsAKwArACsAKwArACsAKwArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwAEAAQABAAEAAQABAAEAAQABAAEAAQABAArACsAKwArAAQABAAEAAQABAAEAAQABAAEAAQABAAEACsAKwArACsAHgArACsAKwATABMASwBLAEsASwBLAEsASwBLAEsASwBcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXAArACsAXABcAFwAXABcACsAKwArACsAKwArACsAKwArACsAKwBcAFwAXABcAFwAXABcAFwAXABcAFwAXAArACsAKwArAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcACsAKwArACsAKwArAEsASwBLAEsASwBLAEsASwBLAEsAXAArACsAKwAqACoAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAAQABAAEAAQABAArACsAHgAeAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcACoAKgAqACoAKgAqACoAKgAqACoAKwAqACoA" +
"KgAqACoAKgAqACoAKgAqACoAKgAqACoAKgAqACoAKgAqACoAKgAqACoAKgAqACoAKgAqACoAKwArAAQASwBLAEsASwBLAEsASwBLAEsASwArACsAKwArACsAKwBLAEsASwBLAEsASwBLAEsASwBLACsAKwArACsAKwArACoAKgAqACoAKgAqACoAXAAqACoAKgAqACoAKgArACsABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsABAAEAAQABAAEAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAAQABAAEAAQABABQAFAAUABQAFAAUABQACsAKwArACsASwBLAEsASwBLAEsASwBLAEsASwANAA0AHgANAA0ADQANAB4AHgAeAB4AHgAeAB4AHgAeAB4ABAAEAAQABAAEAAQABAAEAAQAHgAeAB4AHgAeAB4AHgAeAB4AKwArACsABAAEAAQAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAABAAEAAQABAAEAAQABAAEAAQABAAEAAQABABQAFAASwBLAEsASwBLAEsASwBLAEsASwBQAFAAUABQAFAAUABQAFAABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEACsAKwArACsAKwArACsAKwAeAB4AHgAeAFAAUABQAFAABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEACsAKwArAA0ADQANAA0ADQBLAEsASwBLAEsASwBLAEsASwBLACsAKwArAFAAUABQAEsASwBLAEsASwBLAEsASwBLAEsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAA0ADQBQAFAAUABQAFAAUABQAFAAUAArACsAKwArACsAKwArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQACsA" +
"KwBQAFAAUAAeAB4AHgAeAB4AHgAeAB4AKwArACsAKwArACsAKwArAAQABAAEAB4ABAAEAAQABAAEAAQABAAEAAQABAAEAAQABABQAFAAUABQAAQAUABQAFAAUABQAFAABABQAFAABAAEAAQAUAArACsAKwArACsABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEACsABAAEAAQABAAEAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AKwArAFAAUABQAFAAUABQACsAKwBQAFAAUABQAFAAUABQAFAAKwBQACsAUAArAFAAKwAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeACsAKwAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgArAB4AHgAeAB4AHgAeAB4AHgBQAB4AHgAeAFAAUABQACsAHgAeAB4AHgAeAB4AHgAeAB4AHgBQAFAAUABQACsAKwAeAB4AHgAeAB4AHgArAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AKwArAFAAUABQACsAHgAeAB4AHgAeAB4AHgAOAB4AKwANAA0ADQANAA0ADQANAAkADQANAA0ACAAEAAsABAAEAA0ACQANAA0ADAAdAB0AHgAXABcAFgAXABcAFwAWABcAHQAdAB4AHgAUABQAFAANAAEAAQAEAAQABAAEAAQACQAaABoAGgAaABoAGgAaABoAHgAXABcAHQAVABUAHgAeAB4AHgAeAB4AGAAWABEAFQAVABUAHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4ADQAeAA0ADQANAA0AHgANAA0ADQAHAB4AHgAeAB4AKwAEAAQABAAEAAQABAAEAAQABAAEAFAAUAArACsATwBQAFAAUABQAFAAHgAeAB4AFgARAE8AUABPAE8ATwBPAFAAUABQAFAAUAAeAB4AHgAWABEAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQACsAKwArABsAGwAbABsAGwAbABsAGgAbABsAGwAbABsAGwAbABsAGwAbABsAGwAbABsA" +
"GgAbABsAGwAbABoAGwAbABoAGwAbABsAGwAbABsAGwAbABsAGwAbABsAGwAbABsAGwAbAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAHgAeAFAAGgAeAB0AHgBQAB4AGgAeAB4AHgAeAB4AHgAeAB4AHgBPAB4AUAAbAB4AHgBQAFAAUABQAFAAHgAeAB4AHQAdAB4AUAAeAFAAHgBQAB4AUABPAFAAUAAeAB4AHgAeAB4AHgAeAFAAUABQAFAAUAAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAFAAHgBQAFAAUABQAE8ATwBQAFAAUABQAFAATwBQAFAATwBQAE8ATwBPAE8ATwBPAE8ATwBPAE8ATwBPAFAAUABQAFAATwBPAE8ATwBPAE8ATwBPAE8ATwBQAFAAUABQAFAAUABQAFAAUAAeAB4AUABQAFAAUABPAB4AHgArACsAKwArAB0AHQAdAB0AHQAdAB0AHQAdAB0AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB0AHgAdAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAdAB4AHQAdAB4AHgAeAB0AHQAeAB4AHQAeAB4AHgAdAB4AHQAbABsAHgAdAB4AHgAeAB4AHQAeAB4AHQAdAB0AHQAeAB4AHQAeAB0AHgAdAB0AHQAdAB0AHQAeAB0AHgAeAB4AHgAeAB0AHQAdAB0AHgAeAB4AHgAdAB0AHgAeAB4AHgAeAB4AHgAeAB4AHgAdAB4AHgAeAB0AHgAeAB4AHgAeAB0AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAdAB0AHgAeAB0AHQAdAB0AHgAeAB0AHQAeAB4AHQAdAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB0AHQAeAB4AHQAdAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHQAeAB4AHgAdAB4AHgAeAB4AHgAeAB4AHQAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB0AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AFAAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeABYAEQAWABEA" +
"HgAeAB4AHgAeAB4AHQAeAB4AHgAeAB4AHgAeACUAJQAeAB4AHgAeAB4AHgAeAB4AHgAWABEAHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AJQAlACUAJQAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArAE8ATwBPAE8ATwBPAE8ATwBPAE8ATwBPAE8ATwBPAE8ATwBPAE8ATwBPAE8ATwBPAE8ATwBPAE8ATwBPAE8ATwAdAB0AHQAdAB0AHQAdAB0AHQAdAB0AHQAdAB0AHQAdAB0AHQAdAB0AHQAdAB0AHQAdAB0AHQAdAB0AHQAdAB0AHQAdAE8ATwBPAE8ATwBPAE8ATwBPAE8ATwBPAE8ATwBPAE8ATwBPAE8ATwBPAFAAHQAdAB0AHQAdAB0AHQAdAB0AHQAdAB0AHgAeAB4AHgAdAB0AHQAdAB0AHQAdAB0AHQAdAB0AHQAdAB0AHQAdAB0AHQAdAB0AHQAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHQAdAB0AHQAdAB0AHQAdAB0AHQAdAB0AHQAdAB0AHQAeAB4AHQAdAB0AHQAeAB4AHgAeAB4AHgAeAB4AHgAeAB0AHQAeAB0AHQAdAB0AHQAdAB0AHgAeAB4AHgAeAB4AHgAeAB0AHQAeAB4AHQAdAB4AHgAeAB4AHQAdAB4AHgAeAB4AHQAdAB0AHgAeAB0AHgAeAB0AHQAdAB0AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAdAB0AHQAdAB4AHgAeAB4AHgAeAB4AHgAeAB0AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAlACUAJQAlAB4AHQAdAB4AHgAdAB4AHgAeAB4AHQAdAB4AHgAeAB4AJQAlAB0AHQAlAB4AJQAlACUAIAAlACUAHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAlACUAJQAeAB4AHgAeAB0AHgAdAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAdAB0A" +
"HgAdAB0AHQAeAB0AJQAdAB0AHgAdAB0AHgAdAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeACUAHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHQAdAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAlACUAJQAlACUAJQAlACUAJQAlACUAJQAdAB0AHQAdACUAHgAlACUAJQAdACUAJQAdAB0AHQAlACUAHQAdACUAHQAdACUAJQAlAB4AHQAeAB4AHgAeAB0AHQAlAB0AHQAdAB0AHQAdACUAJQAlACUAJQAdACUAJQAgACUAHQAdACUAJQAlACUAJQAlACUAJQAeAB4AHgAlACUAIAAgACAAIAAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB0AHgAeAB4AFwAXABcAFwAXABcAHgATABMAJQAeAB4AHgAWABEAFgARABYAEQAWABEAFgARABYAEQAWABEATwBPAE8ATwBPAE8ATwBPAE8ATwBPAE8ATwBPAE8ATwBPAE8ATwBPAE8ATwAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeABYAEQAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAWABEAFgARABYAEQAWABEAFgARAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AFgARABYAEQAWABEAFgARABYAEQAWABEAFgARABYAEQAWABEAFgARABYAEQAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAWABEAFgARAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AFgARAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAdAB0AHQAdAB0AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4A" +
"HgAeAB4AHgArACsAHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AKwAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AUABQAFAAUAAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAEAAQABAAeAB4AKwArACsAKwArABMADQANAA0AUAATAA0AUABQAFAAUABQAFAAUABQACsAKwArACsAKwArACsAUAANACsAKwArACsAKwArACsAKwArACsAKwArACsAKwAEAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArACsAKwArACsAKwArACsAKwBQAFAAUABQAFAAUABQACsAUABQAFAAUABQAFAAUAArAFAAUABQAFAAUABQAFAAKwBQAFAAUABQAFAAUABQACsAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXAA0ADQANAA0ADQANAA0ADQAeAA0AFgANAB4AHgAXABcAHgAeABcAFwAWABEAFgARABYAEQAWABEADQANAA0ADQATAFAADQANAB4ADQANAB4AHgAeAB4AHgAMAAwADQANAA0AHgANAA0AFgANAA0ADQANAA0ADQANAA0AHgANAB4ADQANAB4AHgAeACsAKwArACsAKwArACsAKwArACsAKwArACsAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACsAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAKwArACsAKwArACsAKwArACsAKwArACsAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwAlACUAJQAlACUAJQAlACUAJQAlACUAJQArACsAKwArAA0AEQARACUAJQBHAFcAVwAWABEAFgARABYAEQAWABEAFgARACUAJQAWABEAFgARABYAEQAWABEAFQAWABEAEQAlAFcA" +
"VwBXAFcAVwBXAFcAVwBXAAQABAAEAAQABAAEACUAVwBXAFcAVwA2ACUAJQBXAFcAVwBHAEcAJQAlACUAKwBRAFcAUQBXAFEAVwBRAFcAUQBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFEAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBRAFcAUQBXAFEAVwBXAFcAVwBXAFcAUQBXAFcAVwBXAFcAVwBRAFEAKwArAAQABAAVABUARwBHAFcAFQBRAFcAUQBXAFEAVwBRAFcAUQBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFEAVwBRAFcAUQBXAFcAVwBXAFcAVwBRAFcAVwBXAFcAVwBXAFEAUQBXAFcAVwBXABUAUQBHAEcAVwArACsAKwArACsAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAKwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAKwAlACUAVwBXAFcAVwAlACUAJQAlACUAJQAlACUAJQAlACsAKwArACsAKwArACsAKwArACsAKwArAFEAUQBRAFEAUQBRAFEAUQBRAFEAUQBRAFEAUQBRAFEAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQArAFcAVwBXAFcAVwBXAFcAVwBXAFcAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQBPAE8ATwBPAE8ATwBPAE8AJQBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXACUAJQAlAFcAVwBXAFcA" +
"VwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAEcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAKwArACsAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQArACsAKwArACsAKwArACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAADQATAA0AUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABLAEsASwBLAEsASwBLAEsASwBLAFAAUAArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAFAABAAEAAQABAAeAAQABAAEAAQABAAEAAQABAAEAAQAHgBQAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AUABQAAQABABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAAQABAAeAA0ADQANAA0ADQArACsAKwArACsAKwArACsAHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAFAAUABQAFAAUABQAFAAUABQAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AUAAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgBQAB4AHgAeAB4AHgAeAFAAHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgArACsAHgAeAB4AHgAeAB4AHgAeAB4AKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwAeAB4AUABQAFAAUABQAFAAUABQAFAAUABQAAQAUABQAFAABABQAFAAUABQAAQAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAAQABAAEAAQABAAeAB4AHgAeAAQAKwArACsAUABQAFAAUABQAFAAHgAeABoAHgArACsAKwArACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAADgAOABMAEwArACsA" +
"KwArACsAKwArACsABAAEAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAAQABAAEAAQABAAEACsAKwArACsAKwArACsAKwANAA0ASwBLAEsASwBLAEsASwBLAEsASwArACsAKwArACsAKwAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABABQAFAAUABQAFAAUAAeAB4AHgBQAA4AUABQAAQAUABQAFAAUABQAFAABAAEAAQABAAEAAQABAAEAA0ADQBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAKwArACsAKwArACsAKwArACsAKwArAB4AWABYAFgAWABYAFgAWABYAFgAWABYAFgAWABYAFgAWABYAFgAWABYAFgAWABYAFgAWABYAFgAWABYACsAKwArAAQAHgAeAB4AHgAeAB4ADQANAA0AHgAeAB4AHgArAFAASwBLAEsASwBLAEsASwBLAEsASwArACsAKwArAB4AHgBcAFwAXABcAFwAKgBcAFwAXABcAFwAXABcAFwAXABcAEsASwBLAEsASwBLAEsASwBLAEsAXABcAFwAXABcACsAUABQAFAAUABQAFAAUABQAFAABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEACsAKwArACsAKwArACsAKwArAFAAUABQAAQAUABQAFAAUABQAFAAUABQAAQABAArACsASwBLAEsASwBLAEsASwBLAEsASwArACsAHgANAA0ADQBcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAKgAqACoAXAAqACoAKgBcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXAAqAFwAKgAqACoAXABcACoAKgBcAFwAXABcAFwAKgAqAFwAKgBcACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArAFwAXABcACoAKgBQAFAAUABQAFAAUABQAFAAUABQAFAABAAEAAQABAAEAA0ADQBQAFAAUAAEAAQAKwArACsAKwArACsAKwArACsA" +
"KwBQAFAAUABQAFAAUAArACsAUABQAFAAUABQAFAAKwArAFAAUABQAFAAUABQACsAKwArACsAKwArACsAKwArAFAAUABQAFAAUABQAFAAKwBQAFAAUABQAFAAUABQACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAHgAeACsAKwArACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAAEAAQABAAEAAQABAAEAAQADQAEAAQAKwArAEsASwBLAEsASwBLAEsASwBLAEsAKwArACsAKwArACsAVABVAFUAVQBVAFUAVQBVAFUAVQBVAFUAVQBVAFUAVQBVAFUAVQBVAFUAVQBVAFUAVQBVAFUAVQBUAFUAVQBVAFUAVQBVAFUAVQBVAFUAVQBVAFUAVQBVAFUAVQBVAFUAVQBVAFUAVQBVAFUAVQBVACsAKwArACsAKwArACsAKwArACsAKwArAFkAWQBZAFkAWQBZAFkAWQBZAFkAWQBZAFkAWQBZAFkAWQBZAFkAKwArACsAKwBaAFoAWgBaAFoAWgBaAFoAWgBaAFoAWgBaAFoAWgBaAFoAWgBaAFoAWgBaAFoAWgBaAFoAWgBaAFoAKwArACsAKwAGAAYABgAGAAYABgAGAAYABgAGAAYABgAGAAYABgAGAAYABgAGAAYABgAGAAYABgAGAAYABgAGAAYABgAGAAYAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXACUAJQBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAJQAlACUAJQAlACUAUABQAFAAUABQAFAAUAArACsAKwArACsAKwArACsAKwArACsAKwBQAFAAUABQAFAAKwArACsAKwArAFYABABWAFYAVgBWAFYAVgBWAFYAVgBWAB4AVgBWAFYAVgBWAFYAVgBWAFYAVgBWAFYAVgArAFYAVgBWAFYAVgArAFYAKwBWAFYAKwBWAFYAKwBWAFYAVgBWAFYAVgBWAFYAVgBWAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AKwArACsAKwArACsAKwArACsAKwArACsA" +
"KwArACsAKwArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAEQAWAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUAAaAB4AKwArAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAGAARABEAGAAYABMAEwAWABEAFAArACsAKwArACsAKwAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEACUAJQAlACUAJQAWABEAFgARABYAEQAWABEAFgARABYAEQAlACUAFgARACUAJQAlACUAJQAlACUAEQAlABEAKwAVABUAEwATACUAFgARABYAEQAWABEAJQAlACUAJQAlACUAJQAlACsAJQAbABoAJQArACsAKwArAFAAUABQAFAAUAArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwArAAcAKwATACUAJQAbABoAJQAlABYAEQAlACUAEQAlABEAJQBXAFcAVwBXAFcAVwBXAFcAVwBXABUAFQAlACUAJQATACUAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXABYAJQARACUAJQAlAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwAWACUAEQAlABYAEQARABYAEQARABUAVwBRAFEAUQBRAFEAUQBRAFEAUQBRAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAEcARwArACsAVwBXAFcAVwBXAFcAKwArAFcAVwBXAFcAVwBXACsAKwBXAFcAVwBXAFcAVwArACsAVwBXAFcAKwArACsAGgAbACUAJQAlABsAGwArAB4AHgAeAB4A" +
"HgAeAB4AKwArACsAKwArACsAKwArACsAKwAEAAQABAAQAB0AKwArAFAAUABQAFAAUABQAFAAUABQAFAAUABQACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwBQAFAAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArACsAKwArACsADQANAA0AKwArACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQACsAKwArAB4AHgAeAB4AHgAeAB4AHgAeAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgBQAFAAHgAeAB4AKwAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAAQAKwArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwAEAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQACsAKwArACsAKwArACsAKwArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwArACsAKwArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAABAAEAAQABAAEACsAKwArACsAKwBQAFAA" +
"UABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArAA0AUABQAFAAUAArACsAKwArAFAAUABQAFAAUABQAFAAUAANAFAAUABQAFAAUAArACsAKwArACsAKwArACsAKwArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwArACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQACsAKwArACsAKwArACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQACsAKwArACsAKwArACsAKwArACsAKwAeACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAUABQAFAAUABQAFAAKwArAFAAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArAFAAUAArACsAKwBQACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwANAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAAeAB4AUABQAFAAUABQAFAAUAArACsAKwArACsAKwArAFAAUABQAFAAUABQAFAAUABQACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArAFAAUAArACsAKwArACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQACsAKwArAA0AUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQACsAKwArACsAKwAeAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQACsAKwArACsA" +
"UABQAFAAUABQAAQABAAEACsABAAEACsAKwArACsAKwAEAAQABAAEAFAAUABQAFAAKwBQAFAAUAArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwArAAQABAAEACsAKwArACsABABQAFAAUABQAFAAUABQAFAAUAArACsAKwArACsAKwArAA0ADQANAA0ADQANAA0ADQAeACsAKwArACsAKwArACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAAeAFAAUABQAFAAUABQAFAAUAAeAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAAQABAArACsAKwArAFAAUABQAFAAUAANAA0ADQANAA0ADQAUACsAKwArACsAKwArACsAKwArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwArACsADQANAA0ADQANAA0ADQBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArACsAKwArACsAKwArAB4AHgAeAB4AKwArACsAKwArACsAKwArACsAKwArACsAUABQAFAAUABQAFAAUAArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArAFAAUABQAFAAUABQAFAAUABQACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQACsAKwArACsAKwArACsAKwArACsAKwArACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArACsAKwArACsAKwArAFAAUABQAFAAUABQAAQABAAEAAQAKwArACsAKwArACsAKwArAEsASwBLAEsASwBLAEsASwBLAEsAKwArACsAKwArACsAUABQAFAAUABQAFAAUABQAFAAUAArAAQABAANACsAKwBQAFAAKwArACsAKwArACsAKwArACsAKwArACsAKwArAFAAUABQAFAAUABQAAQABAAEAAQA" +
"BAAEAAQABAAEAAQABABQAFAAUABQAB4AHgAeAB4AHgArACsAKwArACsAKwAEAAQABAAEAAQABAAEAA0ADQAeAB4AHgAeAB4AKwArACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAEsASwBLAEsASwBLAEsASwBLAEsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsABABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAAQABAAEAAQABAAEAAQABAAEAAQABAAeAB4AHgANAA0ADQANACsAKwArACsAKwArACsAKwArACsAKwAeACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwArACsAKwArACsAKwBLAEsASwBLAEsASwBLAEsASwBLACsAKwArACsAKwArAFAAUABQAFAAUABQAFAABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEACsASwBLAEsASwBLAEsASwBLAEsASwANAA0ADQANAFAABAAEAFAAKwArACsAKwArACsAKwArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAABAAeAA4AUAArACsAKwArACsAKwArACsAKwAEAFAAUABQAFAADQANAB4ADQAEAAQABAAEAB4ABAAEAEsASwBLAEsASwBLAEsASwBLAEsAUAAOAFAADQANAA0AKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwArACsAKwArACsAKwArACsAKwArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAAEAAQABAAEAAQABAAEAAQABAAEAAQABAANAA0AHgANAA0AHgAEACsAUABQAFAAUABQAFAAUAArAFAAKwBQAFAAUABQACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwBQAFAAUABQAFAAUABQAFAAUABQAA0AKwArACsAKwArACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAAEAAQABAAEAAQABAAEAAQABAAEAAQAKwArACsAKwArAEsASwBLAEsA" +
"SwBLAEsASwBLAEsAKwArACsAKwArACsABAAEAAQABAArAFAAUABQAFAAUABQAFAAUAArACsAUABQACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwBQAFAAUABQAFAAUABQACsAUABQACsAUABQAFAAUABQACsABAAEAFAABAAEAAQABAAEAAQABAArACsABAAEACsAKwAEAAQABAArACsAUAArACsAKwArACsAKwAEACsAKwArACsAKwBQAFAAUABQAFAABAAEACsAKwAEAAQABAAEAAQABAAEACsAKwArAAQABAAEAAQABAArACsAKwArACsAKwArACsAKwArACsABAAEAAQABAAEAAQABABQAFAAUABQAA0ADQANAA0AHgBLAEsASwBLAEsASwBLAEsASwBLAA0ADQArAB4ABABQAFAAUAArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwAEAAQABAAEAFAAUAAeAFAAKwArACsAKwArACsAKwArAEsASwBLAEsASwBLAEsASwBLAEsAKwArACsAKwArACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAABAAEAAQABAAEAAQABAArACsABAAEAAQABAAEAAQABAAEAAQADgANAA0AEwATAB4AHgAeAA0ADQANAA0ADQANAA0ADQANAA0ADQANAA0ADQANAFAAUABQAFAABAAEACsAKwAEAA0ADQAeAFAAKwArACsAKwArACsAKwArACsAKwArAEsASwBLAEsASwBLAEsASwBLAEsAKwArACsAKwArACsADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArAFAAUABQAFAAUABQAFAAUABQAFAAUAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAFAAKwArACsAKwArACsAKwBLAEsASwBLAEsASwBLAEsASwBLACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAKwArACoA" +
"KgAqACoAKgAqACoAKgAqACoAKgAqACoAKgAqACsAKwArACsASwBLAEsASwBLAEsASwBLAEsASwBcAFwADQANAA0AKgBQAFAAUABQAFAAUABQAFAAUABQAFAAUAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAeACsAKwArACsASwBLAEsASwBLAEsASwBLAEsASwBQAFAAUABQAFAAUABQAFAAUAArACsAKwArACsAKwArACsAKwArACsAKwBQAFAAUABQAFAAUABQAFAAKwArAFAAKwArAFAAUABQAFAAUABQAFAAUAArAFAAUAArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAABAAEAAQABAAEAAQAKwAEAAQAKwArAAQABAAEAAQAUAAEAFAABAAEAA0ADQANACsAKwArACsAKwArACsAKwArAEsASwBLAEsASwBLAEsASwBLAEsAKwArACsAKwArACsAUABQAFAAUABQAFAAUABQACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAABAAEAAQABAAEAAQABAArACsABAAEAAQABAAEAAQABABQAA4AUAAEACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArAFAABAAEAAQABAAEAAQABAAEAAQABABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAAEAAQABAAEAAQABAAEAFAABAAEAAQABAAOAB4ADQANAA0ADQAOAB4ABAArACsAKwArACsAKwArACsAUAAEAAQABAAEAAQABAAEAAQABAAEAAQAUABQAFAAUABQAFAAUABQAFAAUAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAA0ADQANAFAADgAOAA4ADQANACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwBQAFAAUABQAFAAUABQAFAAUAArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAABAAEAAQABAAEAAQABAAEACsA" +
"BAAEAAQABAAEAAQABAAEAFAADQANAA0ADQANACsAKwArACsAKwArACsAKwArACsASwBLAEsASwBLAEsASwBLAEsASwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArACsAKwAOABMAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwArAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAArAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAArACsAKwArACsAKwArACsAKwBQAFAAUABQAFAAUABQACsAUABQACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAAEAAQABAAEAAQABAArACsAKwAEACsABAAEACsABAAEAAQABAAEAAQABABQAAQAKwArACsAKwArACsAKwArAEsASwBLAEsASwBLAEsASwBLAEsAKwArACsAKwArACsAUABQAFAAUABQAFAAKwBQAFAAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAAEAAQABAAEAAQAKwAEAAQAKwAEAAQABAAEAAQAUAArACsAKwArACsAKwArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAABAAEAAQABAAeAB4AKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwBQACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAB4AHgAeAB4AHgAeAB4AHgAaABoAGgAaAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgArACsAKwArACsAKwArACsAKwArACsAKwArAA0AUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQACsAKwArACsAKwArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQACsADQANAA0ADQANACsAKwArACsAKwArACsAKwArACsAKwBQAFAAUABQACsAKwArACsAKwArACsAKwArACsA" +
"KwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAASABIAEgAQwBDAEMAUABQAFAAUABDAFAAUABQAEgAQwBIAEMAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAASABDAEMAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwAJAAkACQAJAAkACQAJABYAEQArACsAKwArACsAKwArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABIAEMAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArAEsASwBLAEsASwBLAEsASwBLAEsAKwArACsAKwANAA0AKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwArAAQABAAEAAQABAANACsAKwArACsAKwArACsAKwArACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAAEAAQABAAEAAQABAAEAA0ADQANAB4AHgAeAB4AHgAeAFAAUABQAFAADQAeACsAKwArACsAKwArACsAKwArACsASwBLAEsASwBLAEsASwBLAEsASwArAFAAUABQAFAAUABQAFAAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArACsAKwArACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAANAA0AHgAeACsAKwArACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAKwArACsAKwAEAFAABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAKwArACsAKwArACsAKwAEAAQABAAEAFAA" +
"UABQAFAAUABQAFAAUABQAFAAUABQAFAARwBHABUARwAJACsAKwArACsAKwArACsAKwArACsAKwAEAAQAKwArACsAKwArACsAKwArACsAKwArACsAKwArAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXACsAKwArACsAKwArACsAKwBXAFcAVwBXAFcAVwBXAFcAVwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAUQBRAFEAKwArACsAKwArACsAKwArACsAKwArACsAKwBRAFEAUQBRACsAKwArACsAKwArACsAKwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXACsAKwArACsAUABQAFAAUABQAFAAUABQAFAAUABQACsAKwArACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQACsAKwArACsAKwArACsAUABQAFAAUABQAFAAUABQAFAAUAArACsAHgAEAAQADQAEAAQABAAEACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgArACsAKwArACsAKwArACsAKwArAB4AHgAeAB4AHgAeAB4AKwArAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAAQABAAEAAQABAAeAB4AHgAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAB4AHgAEAAQABAAEAAQABAAEAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4ABAAEAAQABAAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4ABAAEAAQAHgArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAA" +
"UABQACsAKwArACsAKwArACsAKwArACsAKwArAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgArACsAKwArACsAKwArACsAKwAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgArAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AKwBQAFAAKwArAFAAKwArAFAAUAArACsAUABQAFAAUAArAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeACsAUAArAFAAUABQAFAAUABQAFAAKwAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AKwBQAFAAUABQACsAKwBQAFAAUABQAFAAUABQAFAAKwBQAFAAUABQAFAAUABQACsAHgAeAFAAUABQAFAAUAArAFAAKwArACsAUABQAFAAUABQAFAAUAArAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AKwArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAHgBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgBQAFAAUABQAFAAUABQAFAAUABQAFAAHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAB4AHgAeAB4AHgAeAB4AHgAeACsAKwBLAEsASwBLAEsASwBLAEsASwBLAEsASwBLAEsASwBLAEsASwBLAEsASwBLAEsASwBLAEsASwBLAEsASwBLAEsASwBLAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAeAB4AHgAeAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQA" +
"BAAeAB4AHgAeAB4AHgAeAB4ABAAeAB4AHgAeAB4AHgAeAB4AHgAeAAQAHgAeAA0ADQANAA0AHgArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwAEAAQABAAEAAQAKwAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArAAQABAAEAAQABAAEAAQAKwAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAKwArAAQABAAEAAQABAAEAAQAKwAEAAQAKwAEAAQABAAEAAQAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArACsAKwAEAAQABAAEAAQABAAEAFAAUABQAFAAUABQAFAAKwArAEsASwBLAEsASwBLAEsASwBLAEsAKwArACsAKwBQAB4AKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUAAEAAQABAAEAEsASwBLAEsASwBLAEsASwBLAEsAKwArACsAKwArABsAUABQAFAAUABQACsAKwBQAFAAUABQAFAAUABQAFAAUAAEAAQABAAEAAQABAAEACsAKwArACsAKwArACsAKwArAB4AHgAeAB4ABAAEAAQABAAEAAQABABQACsAKwArACsASwBLAEsASwBLAEsASwBLAEsASwArACsAKwArABYAFgArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAGgBQAFAAUAAaAFAAUABQAFAAKwArACsAKwArACsAKwArACsAKwArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAAeAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQACsAKwBQAFAAUABQACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwBQAFAAKwBQACsAKwBQACsAUABQAFAAUABQAFAAUABQAFAAUAArAFAAUABQAFAAKwBQACsAUAArACsA" +
"KwArACsAKwBQACsAKwArACsAUAArAFAAKwBQACsAUABQAFAAKwBQAFAAKwBQACsAKwBQACsAUAArAFAAKwBQACsAUAArAFAAUAArAFAAKwArAFAAUABQAFAAKwBQAFAAUABQAFAAUABQACsAUABQAFAAUAArAFAAUABQAFAAKwBQACsAUABQAFAAUABQAFAAUABQAFAAUAArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArACsAKwArACsAUABQAFAAKwBQAFAAUABQAFAAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwAeAB4AKwArACsAKwArACsAKwArACsAKwArACsAKwArAE8ATwBPAE8ATwBPAE8ATwBPAE8ATwBPAE8AJQAlACUAHQAdAB0AHQAdAB0AHQAdAB0AHQAdAB0AHQAdAB0AHQAdAB0AHgAeAB0AHQAdAB0AHQAdAB0AHQAdAB0AHQAdAB0AHQAdAB0AHQAdAB4AHgAeACUAJQAlAB0AHQAdAB0AHQAdAB0AHQAdAB0AHQAdAB0AHQAdAB0AHQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQApACkAKQApACkAKQApACkAKQApACkAKQApACkAKQApACkAKQApACkAKQApACkAKQApACkAJQAlACUAJQAlACAAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAeAB4AJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlAB4AHgAlACUAJQAlACUAHgAlACUAJQAlACUAIAAgACAAJQAlACAAJQAlACAAIAAgACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACEAIQAhACEAIQAlACUAIAAgACUAJQAgACAAIAAgACAAIAAgACAAIAAgACAAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAJQAlACUA" +
"IAAlACUAJQAlACAAIAAgACUAIAAgACAAJQAlACUAJQAlACUAJQAgACUAIAAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAHgAlAB4AJQAeACUAJQAlACUAJQAgACUAJQAlACUAHgAlAB4AHgAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlAB4AHgAeAB4AHgAeAB4AJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAeAB4AHgAeAB4AHgAeAB4AHgAeACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACAAIAAlACUAJQAlACAAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACAAJQAlACUAJQAgACAAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAHgAeAB4AHgAeAB4AHgAeACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAeAB4AHgAeAB4AHgAlACUAJQAlACUAJQAlACAAIAAgACUAJQAlACAAIAAgACAAIAAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeABcAFwAXABUAFQAVAB4AHgAeAB4AJQAlACUAIAAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACAAIAAgACUAJQAlACUAJQAlACUAJQAlACAAJQAlACUAJQAlACUAJQAlACUAJQAlACAAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AJQAlACUAJQAlACUAJQAlACUAJQAlACUAHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AJQAlACUAJQAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeACUAJQAlACUAJQAlACUAJQAeAB4AHgAeAB4AHgAeAB4AHgAeACUAJQAlACUAJQAlAB4AHgAeAB4AHgAeAB4AHgAlACUA" +
"JQAlACUAJQAlACUAHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAgACUAJQAgACUAJQAlACUAJQAlACUAJQAgACAAIAAgACAAIAAgACAAJQAlACUAJQAlACUAIAAlACUAJQAlACUAJQAlACUAJQAgACAAIAAgACAAIAAgACAAIAAgACUAJQAgACAAIAAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAgACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACAAIAAlACAAIAAlACAAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAgACAAIAAlACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAJQAlAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AKwAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArAEsASwBLAEsASwBLAEsASwBLAEsAKwArACsAKwArACsAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAKwArAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXACUAJQBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwAlACUAJQAlACUAJQAlACUAJQAlACUAVwBXACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAKwAEACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArAAQABAAEAAQA" +
"BAAEAAQABAAEAAQABAAEAAQABAAEAAQAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArAA==")),L=Array.isArray(m)?function(A){for(var e=A.length,t=[],r=0;r<e;r+=4)t.push(A[r+3]<<24|A[r+2]<<16|A[r+1]<<8|A[r]);return t}(m):new Uint32Array(m),b=Array.isArray(m)?function(A){for(var e=A.length,t=[],r=0;r<e;r+=2)t.push(A[r+1]<<8|A[r]);return t}(m):new Uint16Array(m),y=w(b,12,L[4]/2),K=2===L[5]?w(b,(24+L[4])/2):(m=L,b=Math.ceil((24+L[4])/4),m.slice?m.slice(b,K):new Uint32Array(Array.prototype.slice.call(m,b,K))),new U(L[0],L[1],L[2],L[3],y,K)),BA=[J,36],nA=[1,2,3,5],sA=[D,8],oA=[P,N],iA=nA.concat(sA),QA=[j,z,$,Z,_],cA=[x,v],aA=(gA.prototype.slice=function(){return g.apply(void 0,this.codePoints.slice(this.start,this.end))},gA);function gA(A,e,t,r){this.codePoints=A,this.required="!"===e,this.start=t,this.end=r}function wA(A,e){var t=Q(A),r=(e=I(t,e))[0],B=e[1],n=e[2],s=t.length,o=0,i=0;return{next:function(){if(s<=i)return{done:!0,value:null};for(var A=tA;i<s&&(A=function(A,e,t,r,B){if(0===t[r])return tA;var n=r-1;if(Array.isArray(B)&&!0===B[n])return tA;var s=n-1,o=1+n,i=e[n],r=0<=s?e[s]:0,B=e[o];if(2===i&&3===B)return tA;if(-1!==nA.indexOf(i))return"!";if(-1!==nA.indexOf(B))return tA;if(-1!==sA.indexOf(B))return tA;if(8===E(n,e))return"÷";if(11===rA.get(A[n]))return tA;if((i===Y||i===W)&&11===rA.get(A[o]))return tA;if(7===i||7===B)return tA;if(9===i)return tA;if(-1===[D,v,x].indexOf(i)&&9===B)return tA;
if(-1!==[M,S,T,k,X].indexOf(B))return tA;if(E(n,e)===V)return tA;if(p(23,V,n,e))return tA;if(p([M,S],O,n,e))return tA;if(p(12,12,n,e))return tA;if(i===D)return"÷";if(23===i||23===B)return tA;if(16===B||16===i)return"÷";if(-1!==[v,x,O].indexOf(B)||14===i)return tA;if(36===r&&-1!==cA.indexOf(i))return tA;if(i===X&&36===B)return tA;if(B===G)return tA;if(-1!==BA.indexOf(B)&&i===R||-1!==BA.indexOf(i)&&B===R)return tA;if(i===P&&-1!==[q,Y,W].indexOf(B)||-1!==[q,Y,W].indexOf(i)&&B===N)return tA;if(-1!==BA.indexOf(i)&&-1!==oA.indexOf(B)||-1!==oA.indexOf(i)&&-1!==BA.indexOf(B))return tA;if(-1!==[P,N].indexOf(i)&&(B===R||-1!==[V,x].indexOf(B)&&e[1+o]===R)||-1!==[V,x].indexOf(i)&&B===R||i===R&&-1!==[R,X,k].indexOf(B))return tA;if(-1!==[R,X,k,M,S].indexOf(B))for(var Q=n;0<=Q;){if((c=e[Q])===R)return tA;if(-1===[X,k].indexOf(c))break;Q--}if(-1!==[P,N].indexOf(B))for(var c,Q=-1!==[M,S].indexOf(i)?s:n;0<=Q;){if((c=e[Q])===R)return tA;if(-1===[X,k].indexOf(c))break;Q--}if(j===i&&-1!==[j,z,Z,_].indexOf(B)||-1!==[z,Z].indexOf(i)&&-1!==[z,$].indexOf(B)||-1!==[$,_].indexOf(i)&&B===$)return tA;if(-1!==QA.indexOf(i)&&-1!==[G,N].indexOf(B)||-1!==QA.indexOf(B)&&i===P)return tA;if(-1!==BA.indexOf(i)&&-1!==BA.indexOf(B))return tA;if(i===k&&-1!==BA.indexOf(B))return tA;if(-1!==BA.concat(R).indexOf(i)&&B===V&&-1===eA.indexOf(A[o])||-1!==BA.concat(R).indexOf(B)&&i===S)return tA;if(41===i&&41===B){for(var a=t[n],
g=1;0<a&&41===e[--a];)g++;if(g%2!=0)return tA}return i===Y&&B===W?tA:"÷"}(t,B,r,++i,n))===tA;);if(A===tA&&i!==s)return{done:!0,value:null};var e=new aA(t,A,o,i);return o=i,{value:e,done:!1}}}}function UA(A){return 48<=A&&A<=57}function lA(A){return UA(A)||65<=A&&A<=70||97<=A&&A<=102}function CA(A){return 10===A||9===A||32===A}function uA(A){return 97<=(t=e=A)&&t<=122||65<=(e=e)&&e<=90||128<=A||95===A;var e,t}function FA(A){return uA(A)||UA(A)||45===A}function hA(A,e){return 92===A&&10!==e}function dA(A,e,t){return 45===A?uA(e)||hA(e,t):!!uA(A)||92===A&&10!==e}function fA(A,e,t){return 43===A||45===A?!!UA(e)||46===e&&UA(t):UA(46===A?e:A)}var HA={type:2},pA={type:3},EA={type:4},IA={type:13},yA={type:8},KA={type:21},mA={type:9},LA={type:10},bA={type:11},DA={type:12},vA={type:14},xA={type:23},MA={type:1},SA={type:25},TA={type:24},GA={type:26},OA={type:27},VA={type:28},kA={type:29},RA={type:31},NA={type:32},PA=(XA.prototype.write=function(A){this._value=this._value.concat(Q(A))},XA.prototype.read=function(){for(var A=[],e=this.consumeToken();e!==NA;)A.push(e),e=this.consumeToken();return A},XA.prototype.consumeToken=function(){var A=this.consumeCodePoint();switch(A){case 34:return this.consumeStringToken(34);case 35:var e=this.peekCodePoint(0),t=this.peekCodePoint(1),r=this.peekCodePoint(2);if(FA(e)||hA(t,r)){var B=dA(e,t,r)?2:1;return{type:5,value:this.consumeName(),flags:B}}break;case 36:if(61===this.peekCodePoint(0))return this.consumeCodePoint(),
IA;break;case 39:return this.consumeStringToken(39);case 40:return HA;case 41:return pA;case 42:if(61===this.peekCodePoint(0))return this.consumeCodePoint(),vA;break;case 43:if(fA(A,this.peekCodePoint(0),this.peekCodePoint(1)))return this.reconsumeCodePoint(A),this.consumeNumericToken();break;case 44:return EA;case 45:var r=A,B=this.peekCodePoint(0),n=this.peekCodePoint(1);if(fA(r,B,n))return this.reconsumeCodePoint(A),this.consumeNumericToken();if(dA(r,B,n))return this.reconsumeCodePoint(A),this.consumeIdentLikeToken();if(45===B&&62===n)return this.consumeCodePoint(),this.consumeCodePoint(),TA;break;case 46:if(fA(A,this.peekCodePoint(0),this.peekCodePoint(1)))return this.reconsumeCodePoint(A),this.consumeNumericToken();break;case 47:if(42===this.peekCodePoint(0))for(this.consumeCodePoint();;){var s=this.consumeCodePoint();if(42===s&&47===(s=this.consumeCodePoint()))return this.consumeToken();if(-1===s)return this.consumeToken()}break;case 58:return GA;case 59:return OA;case 60:if(33===this.peekCodePoint(0)&&45===this.peekCodePoint(1)&&45===this.peekCodePoint(2))return this.consumeCodePoint(),this.consumeCodePoint(),SA;break;case 64:var n=this.peekCodePoint(0),o=this.peekCodePoint(1),i=this.peekCodePoint(2);if(dA(n,o,i))return{type:7,value:this.consumeName()};break;case 91:return VA;case 92:if(hA(A,this.peekCodePoint(0)))return this.reconsumeCodePoint(A),this.consumeIdentLikeToken();
break;case 93:return kA;case 61:if(61===this.peekCodePoint(0))return this.consumeCodePoint(),yA;break;case 123:return bA;case 125:return DA;case 117:case 85:o=this.peekCodePoint(0),i=this.peekCodePoint(1);return 43!==o||!lA(i)&&63!==i||(this.consumeCodePoint(),this.consumeUnicodeRangeToken()),this.reconsumeCodePoint(A),this.consumeIdentLikeToken();case 124:if(61===this.peekCodePoint(0))return this.consumeCodePoint(),mA;if(124===this.peekCodePoint(0))return this.consumeCodePoint(),KA;break;case 126:if(61===this.peekCodePoint(0))return this.consumeCodePoint(),LA;break;case-1:return NA}return CA(A)?(this.consumeWhiteSpace(),RA):UA(A)?(this.reconsumeCodePoint(A),this.consumeNumericToken()):uA(A)?(this.reconsumeCodePoint(A),this.consumeIdentLikeToken()):{type:6,value:g(A)}},XA.prototype.consumeCodePoint=function(){var A=this._value.shift();return void 0===A?-1:A},XA.prototype.reconsumeCodePoint=function(A){this._value.unshift(A)},XA.prototype.peekCodePoint=function(A){return A>=this._value.length?-1:this._value[A]},XA.prototype.consumeUnicodeRangeToken=function(){for(var A=[],e=this.consumeCodePoint();lA(e)&&A.length<6;)A.push(e),e=this.consumeCodePoint();for(var t=!1;63===e&&A.length<6;)A.push(e),e=this.consumeCodePoint(),t=!0;if(t)return{type:30,start:parseInt(g.apply(void 0,A.map(function(A){return 63===A?48:A})),16),end:parseInt(g.apply(void 0,A.map(function(A){return 63===A?70:A})),
16)};var r=parseInt(g.apply(void 0,A),16);if(45===this.peekCodePoint(0)&&lA(this.peekCodePoint(1))){this.consumeCodePoint();for(var e=this.consumeCodePoint(),B=[];lA(e)&&B.length<6;)B.push(e),e=this.consumeCodePoint();return{type:30,start:r,end:parseInt(g.apply(void 0,B),16)}}return{type:30,start:r,end:r}},XA.prototype.consumeIdentLikeToken=function(){var A=this.consumeName();return"url"===A.toLowerCase()&&40===this.peekCodePoint(0)?(this.consumeCodePoint(),this.consumeUrlToken()):40===this.peekCodePoint(0)?(this.consumeCodePoint(),{type:19,value:A}):{type:20,value:A}},XA.prototype.consumeUrlToken=function(){var A=[];if(this.consumeWhiteSpace(),-1===this.peekCodePoint(0))return{type:22,value:""};var e,t=this.peekCodePoint(0);if(39===t||34===t){t=this.consumeStringToken(this.consumeCodePoint());return 0===t.type&&(this.consumeWhiteSpace(),-1===this.peekCodePoint(0)||41===this.peekCodePoint(0))?(this.consumeCodePoint(),{type:22,value:t.value}):(this.consumeBadUrlRemnants(),xA)}for(;;){var r=this.consumeCodePoint();if(-1===r||41===r)return{type:22,value:g.apply(void 0,A)};if(CA(r))return this.consumeWhiteSpace(),-1===this.peekCodePoint(0)||41===this.peekCodePoint(0)?(this.consumeCodePoint(),{type:22,value:g.apply(void 0,A)}):(this.consumeBadUrlRemnants(),xA);if(34===r||39===r||40===r||(0<=(e=r)&&e<=8||11===e||14<=e&&e<=31||127===e))return this.consumeBadUrlRemnants(),xA;if(92===r){if(!hA(r,
this.peekCodePoint(0)))return this.consumeBadUrlRemnants(),xA;A.push(this.consumeEscapedCodePoint())}else A.push(r)}},XA.prototype.consumeWhiteSpace=function(){for(;CA(this.peekCodePoint(0));)this.consumeCodePoint()},XA.prototype.consumeBadUrlRemnants=function(){for(;;){var A=this.consumeCodePoint();if(41===A||-1===A)return;hA(A,this.peekCodePoint(0))&&this.consumeEscapedCodePoint()}},XA.prototype.consumeStringSlice=function(A){for(var e="";0<A;){var t=Math.min(5e4,A);e+=g.apply(void 0,this._value.splice(0,t)),A-=t}return this._value.shift(),e},XA.prototype.consumeStringToken=function(A){for(var e="",t=0;;){var r,B=this._value[t];if(-1===B||void 0===B||B===A)return{type:0,value:e+=this.consumeStringSlice(t)};if(10===B)return this._value.splice(0,t),MA;92!==B||-1!==(r=this._value[t+1])&&void 0!==r&&(10===r?(e+=this.consumeStringSlice(t),t=-1,this._value.shift()):hA(B,r)&&(e+=this.consumeStringSlice(t),e+=g(this.consumeEscapedCodePoint()),t=-1)),t++}},XA.prototype.consumeNumber=function(){var A=[],e=4;for(43!==(t=this.peekCodePoint(0))&&45!==t||A.push(this.consumeCodePoint());UA(this.peekCodePoint(0));)A.push(this.consumeCodePoint());var t=this.peekCodePoint(0),r=this.peekCodePoint(1);if(46===t&&UA(r))for(A.push(this.consumeCodePoint(),this.consumeCodePoint()),e=8;UA(this.peekCodePoint(0));)A.push(this.consumeCodePoint());t=this.peekCodePoint(0);var r=this.peekCodePoint(1),B=this.peekCodePoint(2);
if((69===t||101===t)&&((43===r||45===r)&&UA(B)||UA(r)))for(A.push(this.consumeCodePoint(),this.consumeCodePoint()),e=8;UA(this.peekCodePoint(0));)A.push(this.consumeCodePoint());return[function(A){var e=0,t=1;43!==A[e]&&45!==A[e]||(45===A[e]&&(t=-1),e++);for(var r=[];UA(A[e]);)r.push(A[e++]);var B=r.length?parseInt(g.apply(void 0,r),10):0;46===A[e]&&e++;for(var n=[];UA(A[e]);)n.push(A[e++]);var s=n.length,o=s?parseInt(g.apply(void 0,n),10):0;69!==A[e]&&101!==A[e]||e++;var i=1;43!==A[e]&&45!==A[e]||(45===A[e]&&(i=-1),e++);for(var Q=[];UA(A[e]);)Q.push(A[e++]);var c=Q.length?parseInt(g.apply(void 0,Q),10):0;return t*(B+o*Math.pow(10,-s))*Math.pow(10,i*c)}(A),e]},XA.prototype.consumeNumericToken=function(){var A=this.consumeNumber(),e=A[0],t=A[1],r=this.peekCodePoint(0),B=this.peekCodePoint(1),A=this.peekCodePoint(2);return dA(r,B,A)?{type:15,number:e,flags:t,unit:this.consumeName()}:37===r?(this.consumeCodePoint(),{type:16,number:e,flags:t}):{type:17,number:e,flags:t}},XA.prototype.consumeEscapedCodePoint=function(){var A,e=this.consumeCodePoint();if(lA(e)){for(var t=g(e);lA(this.peekCodePoint(0))&&t.length<6;)t+=g(this.consumeCodePoint());CA(this.peekCodePoint(0))&&this.consumeCodePoint();var r=parseInt(t,16);return 0===r||55296<=(A=r)&&A<=57343||1114111<r?65533:r}return-1===e?65533:e},XA.prototype.consumeName=function(){for(var A="";;){var e=this.consumeCodePoint();if(FA(e))A+=g(e);
else{if(!hA(e,this.peekCodePoint(0)))return this.reconsumeCodePoint(e),A;A+=g(this.consumeEscapedCodePoint())}}},XA);function XA(){this._value=[]}var JA=(YA.create=function(A){var e=new PA;return e.write(A),new YA(e.read())},YA.parseValue=function(A){return YA.create(A).parseComponentValue()},YA.parseValues=function(A){return YA.create(A).parseComponentValues()},YA.prototype.parseComponentValue=function(){for(var A=this.consumeToken();31===A.type;)A=this.consumeToken();if(32===A.type)throw new SyntaxError("Error parsing CSS component value, unexpected EOF");this.reconsumeToken(A);for(var e=this.consumeComponentValue();31===(A=this.consumeToken()).type;);if(32===A.type)return e;throw new SyntaxError("Error parsing CSS component value, multiple values found when expecting only one")},YA.prototype.parseComponentValues=function(){for(var A=[];;){var e=this.consumeComponentValue();if(32===e.type)return A;A.push(e),A.push()}},YA.prototype.consumeComponentValue=function(){var A=this.consumeToken();switch(A.type){case 11:case 28:case 2:return this.consumeSimpleBlock(A.type);case 19:return this.consumeFunction(A)}return A},YA.prototype.consumeSimpleBlock=function(A){for(var e={type:A,values:[]},t=this.consumeToken();;){if(32===t.type||ce(t,A))return e;this.reconsumeToken(t),e.values.push(this.consumeComponentValue()),t=this.consumeToken()}},YA.prototype.consumeFunction=function(A){for(var e={name:A.value,
values:[],type:18};;){var t=this.consumeToken();if(32===t.type||3===t.type)return e;this.reconsumeToken(t),e.values.push(this.consumeComponentValue())}},YA.prototype.consumeToken=function(){var A=this._tokens.shift();return void 0===A?NA:A},YA.prototype.reconsumeToken=function(A){this._tokens.unshift(A)},YA);function YA(A){this._tokens=A}function WA(A){return 15===A.type}function ZA(A){return 17===A.type}function _A(A){return 20===A.type}function qA(A){return 0===A.type}function jA(A,e){return _A(A)&&A.value===e}function zA(A){return 31!==A.type}function $A(A){return 31!==A.type&&4!==A.type}function Ae(A){var e=[],t=[];return A.forEach(function(A){if(4===A.type){if(0===t.length)throw new Error("Error parsing function args, zero tokens for arg");return e.push(t),void(t=[])}31!==A.type&&t.push(A)}),t.length&&e.push(t),e}function ee(A){return 17===A.type||15===A.type}function te(A){return 16===A.type||ee(A)}function re(A){return 1<A.length?[A[0],A[1]]:[A[0]]}function Be(A,e,t){var r=A[0],A=A[1];return[Ue(r,e),Ue(void 0!==A?A:r,t)]}function ne(A){return 15===A.type&&("deg"===A.unit||"grad"===A.unit||"rad"===A.unit||"turn"===A.unit)}function se(A){switch(A.filter(_A).map(function(A){return A.value}).join(" ")){case"to bottom right":case"to right bottom":case"left top":case"top left":return[ae,ae];case"to top":case"bottom":return Ce(0);case"to bottom left":case"to left bottom":case"right top":case"top right":return[ae,
we];case"to right":case"left":return Ce(90);case"to top left":case"to left top":case"right bottom":case"bottom right":return[we,we];case"to bottom":case"top":return Ce(180);case"to top right":case"to right top":case"left bottom":case"bottom left":return[we,ae];case"to left":case"right":return Ce(270)}return 0}function oe(A){return 0==(255&A)}function ie(A){var e=255&A,t=255&A>>8,r=255&A>>16,A=255&A>>24;return e<255?"rgba("+A+","+r+","+t+","+e/255+")":"rgb("+A+","+r+","+t+")"}function Qe(A,e){if(17===A.type)return A.number;if(16!==A.type)return 0;var t=3===e?1:255;return 3===e?A.number/100*t:Math.round(A.number/100*t)}var ce=function(A,e){return 11===e&&12===A.type||(28===e&&29===A.type||2===e&&3===A.type)},ae={type:17,number:0,flags:4},ge={type:16,number:50,flags:4},we={type:16,number:100,flags:4},Ue=function(A,e){if(16===A.type)return A.number/100*e;if(WA(A))switch(A.unit){case"rem":case"em":return 16*A.number;default:return A.number}return A.number},le=function(A,e){if(15===e.type)switch(e.unit){case"deg":return Math.PI*e.number/180;case"grad":return Math.PI/200*e.number;case"rad":return e.number;case"turn":return 2*Math.PI*e.number}throw new Error("Unsupported angle type")},Ce=function(A){return Math.PI*A/180},ue=function(A,e){if(18===e.type){var t=me[e.name];if(void 0===t)throw new Error('Attempting to parse an unsupported color function "'+e.name+'"');return t(A,e.values)}if(5===e.type){if(3===e.value.length){var r=e.value.substring(0,
1),B=e.value.substring(1,2),n=e.value.substring(2,3);return Fe(parseInt(r+r,16),parseInt(B+B,16),parseInt(n+n,16),1)}if(4===e.value.length){var r=e.value.substring(0,1),B=e.value.substring(1,2),n=e.value.substring(2,3),s=e.value.substring(3,4);return Fe(parseInt(r+r,16),parseInt(B+B,16),parseInt(n+n,16),parseInt(s+s,16)/255)}if(6===e.value.length){r=e.value.substring(0,2),B=e.value.substring(2,4),n=e.value.substring(4,6);return Fe(parseInt(r,16),parseInt(B,16),parseInt(n,16),1)}if(8===e.value.length){r=e.value.substring(0,2),B=e.value.substring(2,4),n=e.value.substring(4,6),s=e.value.substring(6,8);return Fe(parseInt(r,16),parseInt(B,16),parseInt(n,16),parseInt(s,16)/255)}}if(20===e.type){e=Le[e.value.toUpperCase()];if(void 0!==e)return e}return Le.TRANSPARENT},Fe=function(A,e,t,r){return(A<<24|e<<16|t<<8|Math.round(255*r)<<0)>>>0},he=function(A,e){e=e.filter($A);if(3===e.length){var t=e.map(Qe),r=t[0],B=t[1],t=t[2];return Fe(r,B,t,1)}if(4!==e.length)return 0;e=e.map(Qe),r=e[0],B=e[1],t=e[2],e=e[3];return Fe(r,B,t,e)};function de(A,e,t){return t<0&&(t+=1),1<=t&&--t,t<1/6?(e-A)*t*6+A:t<.5?e:t<2/3?6*(e-A)*(2/3-t)+A:A}function fe(A,e){return ue(A,JA.create(e).parseComponentValue())}function He(A,e){return A=ue(A,e[0]),(e=e[1])&&te(e)?{color:A,stop:e}:{color:A,stop:null}}function pe(A,t){var e=A[0],r=A[A.length-1];null===e.stop&&(e.stop=ae),null===r.stop&&(r.stop=we);for(var B=[],n=0,
s=0;s<A.length;s++){var o=A[s].stop;null!==o?(n<(o=Ue(o,t))?B.push(o):B.push(n),n=o):B.push(null)}for(var i=null,s=0;s<B.length;s++){var Q=B[s];if(null===Q)null===i&&(i=s);else if(null!==i){for(var c=s-i,a=(Q-B[i-1])/(1+c),g=1;g<=c;g++)B[i+g-1]=a*g;i=null}}return A.map(function(A,e){return{color:A.color,stop:Math.max(Math.min(1,B[e]/t),0)}})}function Ee(A,e,t){var r="number"==typeof A?A:(s=e/2,r=(n=t)/2,s=Ue((B=A)[0],e)-s,n=r-Ue(B[1],n),(Math.atan2(n,s)+2*Math.PI)%(2*Math.PI)),B=Math.abs(e*Math.sin(r))+Math.abs(t*Math.cos(r)),n=e/2,s=t/2,e=B/2,t=Math.sin(r-Math.PI/2)*e,e=Math.cos(r-Math.PI/2)*e;return[B,n-e,n+e,s-t,s+t]}function Ie(A,e){return Math.sqrt(A*A+e*e)}function ye(A,e,B,n,s){return[[0,0],[0,e],[A,0],[A,e]].reduce(function(A,e){var t=e[0],r=e[1],r=Ie(B-t,n-r);return(s?r<A.optimumDistance:r>A.optimumDistance)?{optimumCorner:e,optimumDistance:r}:A},{optimumDistance:s?1/0:-1/0,optimumCorner:null}).optimumCorner}var Ke=function(A,e){var t=e.filter($A),r=t[0],B=t[1],n=t[2],e=t[3],t=(17===r.type?Ce(r.number):le(A,r))/(2*Math.PI),A=te(B)?B.number/100:0,r=te(n)?n.number/100:0,B=void 0!==e&&te(e)?Ue(e,1):1;if(0==A)return Fe(255*r,255*r,255*r,1);n=r<=.5?r*(1+A):r+A-r*A,e=2*r-n,A=de(e,n,t+1/3),r=de(e,n,t),t=de(e,n,t-1/3);return Fe(255*A,255*r,255*t,B)},me={hsl:Ke,hsla:Ke,rgb:he,rgba:he},Le={ALICEBLUE:4042850303,ANTIQUEWHITE:4209760255,AQUA:16777215,AQUAMARINE:2147472639,AZURE:4043309055,
BEIGE:4126530815,BISQUE:4293182719,BLACK:255,BLANCHEDALMOND:4293643775,BLUE:65535,BLUEVIOLET:2318131967,BROWN:2771004159,BURLYWOOD:3736635391,CADETBLUE:1604231423,CHARTREUSE:2147418367,CHOCOLATE:3530104575,CORAL:4286533887,CORNFLOWERBLUE:1687547391,CORNSILK:4294499583,CRIMSON:3692313855,CYAN:16777215,DARKBLUE:35839,DARKCYAN:9145343,DARKGOLDENROD:3095837695,DARKGRAY:2846468607,DARKGREEN:6553855,DARKGREY:2846468607,DARKKHAKI:3182914559,DARKMAGENTA:2332068863,DARKOLIVEGREEN:1433087999,DARKORANGE:4287365375,DARKORCHID:2570243327,DARKRED:2332033279,DARKSALMON:3918953215,DARKSEAGREEN:2411499519,DARKSLATEBLUE:1211993087,DARKSLATEGRAY:793726975,DARKSLATEGREY:793726975,DARKTURQUOISE:13554175,DARKVIOLET:2483082239,DEEPPINK:4279538687,DEEPSKYBLUE:12582911,DIMGRAY:1768516095,DIMGREY:1768516095,DODGERBLUE:512819199,FIREBRICK:2988581631,FLORALWHITE:4294635775,FORESTGREEN:579543807,FUCHSIA:4278255615,GAINSBORO:3705462015,GHOSTWHITE:4177068031,GOLD:4292280575,GOLDENROD:3668254975,GRAY:2155905279,GREEN:8388863,GREENYELLOW:2919182335,GREY:2155905279,HONEYDEW:4043305215,HOTPINK:4285117695,INDIANRED:3445382399,INDIGO:1258324735,IVORY:4294963455,KHAKI:4041641215,LAVENDER:3873897215,LAVENDERBLUSH:4293981695,LAWNGREEN:2096890111,LEMONCHIFFON:4294626815,LIGHTBLUE:2916673279,LIGHTCORAL:4034953471,LIGHTCYAN:3774873599,LIGHTGOLDENRODYELLOW:4210742015,LIGHTGRAY:3553874943,LIGHTGREEN:2431553791,LIGHTGREY:3553874943,
LIGHTPINK:4290167295,LIGHTSALMON:4288707327,LIGHTSEAGREEN:548580095,LIGHTSKYBLUE:2278488831,LIGHTSLATEGRAY:2005441023,LIGHTSLATEGREY:2005441023,LIGHTSTEELBLUE:2965692159,LIGHTYELLOW:4294959359,LIME:16711935,LIMEGREEN:852308735,LINEN:4210091775,MAGENTA:4278255615,MAROON:2147483903,MEDIUMAQUAMARINE:1724754687,MEDIUMBLUE:52735,MEDIUMORCHID:3126187007,MEDIUMPURPLE:2473647103,MEDIUMSEAGREEN:1018393087,MEDIUMSLATEBLUE:2070474495,MEDIUMSPRINGGREEN:16423679,MEDIUMTURQUOISE:1221709055,MEDIUMVIOLETRED:3340076543,MIDNIGHTBLUE:421097727,MINTCREAM:4127193855,MISTYROSE:4293190143,MOCCASIN:4293178879,NAVAJOWHITE:4292783615,NAVY:33023,OLDLACE:4260751103,OLIVE:2155872511,OLIVEDRAB:1804477439,ORANGE:4289003775,ORANGERED:4282712319,ORCHID:3664828159,PALEGOLDENROD:4008225535,PALEGREEN:2566625535,PALETURQUOISE:2951671551,PALEVIOLETRED:3681588223,PAPAYAWHIP:4293907967,PEACHPUFF:4292524543,PERU:3448061951,PINK:4290825215,PLUM:3718307327,POWDERBLUE:2967529215,PURPLE:2147516671,REBECCAPURPLE:1714657791,RED:4278190335,ROSYBROWN:3163525119,ROYALBLUE:1097458175,SADDLEBROWN:2336560127,SALMON:4202722047,SANDYBROWN:4104413439,SEAGREEN:780883967,SEASHELL:4294307583,SIENNA:2689740287,SILVER:3233857791,SKYBLUE:2278484991,SLATEBLUE:1784335871,SLATEGRAY:1887473919,SLATEGREY:1887473919,SNOW:4294638335,SPRINGGREEN:16744447,STEELBLUE:1182971135,TAN:3535047935,TEAL:8421631,THISTLE:3636451583,TOMATO:4284696575,TRANSPARENT:0,
TURQUOISE:1088475391,VIOLET:4001558271,WHEAT:4125012991,WHITE:4294967295,WHITESMOKE:4126537215,YELLOW:4294902015,YELLOWGREEN:2597139199},be={name:"background-clip",initialValue:"border-box",prefix:!1,type:1,parse:function(A,e){return e.map(function(A){if(_A(A))switch(A.value){case"padding-box":return 1;case"content-box":return 2}return 0})}},De={name:"background-color",initialValue:"transparent",prefix:!1,type:3,format:"color"},Ke=function(t,A){var r=Ce(180),B=[];return Ae(A).forEach(function(A,e){if(0===e){e=A[0];if(20===e.type&&-1!==["top","left","right","bottom"].indexOf(e.value))return void(r=se(A));if(ne(e))return void(r=(le(t,e)+Ce(270))%Ce(360))}A=He(t,A);B.push(A)}),{angle:r,stops:B,type:1}},ve="closest-side",xe="farthest-side",Me="closest-corner",Se="farthest-corner",Te="ellipse",Ge="contain",he=function(r,A){var B=0,n=3,s=[],o=[];return Ae(A).forEach(function(A,e){var t=!0;0===e?t=A.reduce(function(A,e){if(_A(e))switch(e.value){case"center":return o.push(ge),!1;case"top":case"left":return o.push(ae),!1;case"right":case"bottom":return o.push(we),!1}else if(te(e)||ee(e))return o.push(e),!1;return A},t):1===e&&(t=A.reduce(function(A,e){if(_A(e))switch(e.value){case"circle":return B=0,!1;case Te:return!(B=1);case Ge:case ve:return n=0,!1;case xe:return!(n=1);case Me:return!(n=2);case"cover":case Se:return!(n=3)}else if(ee(e)||te(e))return(n=!Array.isArray(n)?[]:n).push(e),
!1;return A},t)),t&&(A=He(r,A),s.push(A))}),{size:n,shape:B,stops:s,position:o,type:2}},Oe=function(A,e){if(22===e.type){var t={url:e.value,type:0};return A.cache.addImage(e.value),t}if(18!==e.type)throw new Error("Unsupported image type "+e.type);t=ke[e.name];if(void 0===t)throw new Error('Attempting to parse an unsupported image function "'+e.name+'"');return t(A,e.values)};var Ve,ke={"linear-gradient":function(t,A){var r=Ce(180),B=[];return Ae(A).forEach(function(A,e){if(0===e){e=A[0];if(20===e.type&&"to"===e.value)return void(r=se(A));if(ne(e))return void(r=le(t,e))}A=He(t,A);B.push(A)}),{angle:r,stops:B,type:1}},"-moz-linear-gradient":Ke,"-ms-linear-gradient":Ke,"-o-linear-gradient":Ke,"-webkit-linear-gradient":Ke,"radial-gradient":function(B,A){var n=0,s=3,o=[],i=[];return Ae(A).forEach(function(A,e){var t,r=!0;0===e&&(t=!1,r=A.reduce(function(A,e){if(t)if(_A(e))switch(e.value){case"center":return i.push(ge),A;case"top":case"left":return i.push(ae),A;case"right":case"bottom":return i.push(we),A}else(te(e)||ee(e))&&i.push(e);else if(_A(e))switch(e.value){case"circle":return n=0,!1;case Te:return!(n=1);case"at":return!(t=!0);case ve:return s=0,!1;case"cover":case xe:return!(s=1);case Ge:case Me:return!(s=2);case Se:return!(s=3)}else if(ee(e)||te(e))return(s=!Array.isArray(s)?[]:s).push(e),!1;return A},r)),r&&(A=He(B,A),o.push(A))}),{size:s,shape:n,stops:o,position:i,type:2}},
"-moz-radial-gradient":he,"-ms-radial-gradient":he,"-o-radial-gradient":he,"-webkit-radial-gradient":he,"-webkit-gradient":function(r,A){var e=Ce(180),B=[],n=1;return Ae(A).forEach(function(A,e){var t,A=A[0];if(0===e){if(_A(A)&&"linear"===A.value)return void(n=1);if(_A(A)&&"radial"===A.value)return void(n=2)}18===A.type&&("from"===A.name?(t=ue(r,A.values[0]),B.push({stop:ae,color:t})):"to"===A.name?(t=ue(r,A.values[0]),B.push({stop:we,color:t})):"color-stop"!==A.name||2===(A=A.values.filter($A)).length&&(t=ue(r,A[1]),A=A[0],ZA(A)&&B.push({stop:{type:16,number:100*A.number,flags:A.flags},color:t})))}),1===n?{angle:(e+Ce(180))%Ce(360),stops:B,type:n}:{size:3,shape:0,stops:B,position:[],type:n}}},Re={name:"background-image",initialValue:"none",type:1,prefix:!1,parse:function(e,A){if(0===A.length)return[];var t=A[0];return 20===t.type&&"none"===t.value?[]:A.filter(function(A){return $A(A)&&!(20===(A=A).type&&"none"===A.value||18===A.type&&!ke[A.name])}).map(function(A){return Oe(e,A)})}},Ne={name:"background-origin",initialValue:"border-box",prefix:!1,type:1,parse:function(A,e){return e.map(function(A){if(_A(A))switch(A.value){case"padding-box":return 1;case"content-box":return 2}return 0})}},Pe={name:"background-position",initialValue:"0% 0%",type:1,prefix:!1,parse:function(A,e){return Ae(e).map(function(A){return A.filter(te)}).map(re)}},Xe={name:"background-repeat",initialValue:"repeat",
prefix:!1,type:1,parse:function(A,e){return Ae(e).map(function(A){return A.filter(_A).map(function(A){return A.value}).join(" ")}).map(Je)}},Je=function(A){switch(A){case"no-repeat":return 1;case"repeat-x":case"repeat no-repeat":return 2;case"repeat-y":case"no-repeat repeat":return 3;default:return 0}};(he=Ve=Ve||{}).AUTO="auto",he.CONTAIN="contain";function Ye(A,e){return _A(A)&&"normal"===A.value?1.2*e:17===A.type?e*A.number:te(A)?Ue(A,e):e}var We,Ze,_e={name:"background-size",initialValue:"0",prefix:!(he.COVER="cover"),type:1,parse:function(A,e){return Ae(e).map(function(A){return A.filter(qe)})}},qe=function(A){return _A(A)||te(A)},he=function(A){return{name:"border-"+A+"-color",initialValue:"transparent",prefix:!1,type:3,format:"color"}},je=he("top"),ze=he("right"),$e=he("bottom"),At=he("left"),he=function(A){return{name:"border-radius-"+A,initialValue:"0 0",prefix:!1,type:1,parse:function(A,e){return re(e.filter(te))}}},et=he("top-left"),tt=he("top-right"),rt=he("bottom-right"),Bt=he("bottom-left"),he=function(A){return{name:"border-"+A+"-style",initialValue:"solid",prefix:!1,type:2,parse:function(A,e){switch(e){case"none":return 0;case"dashed":return 2;case"dotted":return 3;case"double":return 4}return 1}}},nt=he("top"),st=he("right"),ot=he("bottom"),it=he("left"),he=function(A){return{name:"border-"+A+"-width",initialValue:"0",type:0,prefix:!1,parse:function(A,e){return WA(e)?e.number:0}}},
Qt=he("top"),ct=he("right"),at=he("bottom"),gt=he("left"),wt={name:"color",initialValue:"transparent",prefix:!1,type:3,format:"color"},Ut={name:"direction",initialValue:"ltr",prefix:!1,type:2,parse:function(A,e){return"rtl"!==e?0:1}},lt={name:"display",initialValue:"inline-block",prefix:!1,type:1,parse:function(A,e){return e.filter(_A).reduce(function(A,e){return A|Ct(e.value)},0)}},Ct=function(A){switch(A){case"block":case"-webkit-box":return 2;case"inline":return 4;case"run-in":return 8;case"flow":return 16;case"flow-root":return 32;case"table":return 64;case"flex":case"-webkit-flex":return 128;case"grid":case"-ms-grid":return 256;case"ruby":return 512;case"subgrid":return 1024;case"list-item":return 2048;case"table-row-group":return 4096;case"table-header-group":return 8192;case"table-footer-group":return 16384;case"table-row":return 32768;case"table-cell":return 65536;case"table-column-group":return 131072;case"table-column":return 262144;case"table-caption":return 524288;case"ruby-base":return 1048576;case"ruby-text":return 2097152;case"ruby-base-container":return 4194304;case"ruby-text-container":return 8388608;case"contents":return 16777216;case"inline-block":return 33554432;case"inline-list-item":return 67108864;case"inline-table":return 134217728;case"inline-flex":return 268435456;case"inline-grid":return 536870912}return 0},ut={name:"float",initialValue:"none",prefix:!1,
type:2,parse:function(A,e){switch(e){case"left":return 1;case"right":return 2;case"inline-start":return 3;case"inline-end":return 4}return 0}},Ft={name:"letter-spacing",initialValue:"0",prefix:!1,type:0,parse:function(A,e){return!(20===e.type&&"normal"===e.value||17!==e.type&&15!==e.type)?e.number:0}},ht={name:"line-break",initialValue:(he=We=We||{}).NORMAL="normal",prefix:!(he.STRICT="strict"),type:2,parse:function(A,e){return"strict"!==e?We.NORMAL:We.STRICT}},dt={name:"line-height",initialValue:"normal",prefix:!1,type:4},ft={name:"list-style-image",initialValue:"none",type:0,prefix:!1,parse:function(A,e){return 20===e.type&&"none"===e.value?null:Oe(A,e)}},Ht={name:"list-style-position",initialValue:"outside",prefix:!1,type:2,parse:function(A,e){return"inside"!==e?1:0}},pt={name:"list-style-type",initialValue:"none",prefix:!1,type:2,parse:function(A,e){switch(e){case"disc":return 0;case"circle":return 1;case"square":return 2;case"decimal":return 3;case"cjk-decimal":return 4;case"decimal-leading-zero":return 5;case"lower-roman":return 6;case"upper-roman":return 7;case"lower-greek":return 8;case"lower-alpha":return 9;case"upper-alpha":return 10;case"arabic-indic":return 11;case"armenian":return 12;case"bengali":return 13;case"cambodian":return 14;case"cjk-earthly-branch":return 15;case"cjk-heavenly-stem":return 16;case"cjk-ideographic":return 17;case"devanagari":return 18;case"ethiopic-numeric":return 19;
case"georgian":return 20;case"gujarati":return 21;case"gurmukhi":case"hebrew":return 22;case"hiragana":return 23;case"hiragana-iroha":return 24;case"japanese-formal":return 25;case"japanese-informal":return 26;case"kannada":return 27;case"katakana":return 28;case"katakana-iroha":return 29;case"khmer":return 30;case"korean-hangul-formal":return 31;case"korean-hanja-formal":return 32;case"korean-hanja-informal":return 33;case"lao":return 34;case"lower-armenian":return 35;case"malayalam":return 36;case"mongolian":return 37;case"myanmar":return 38;case"oriya":return 39;case"persian":return 40;case"simp-chinese-formal":return 41;case"simp-chinese-informal":return 42;case"tamil":return 43;case"telugu":return 44;case"thai":return 45;case"tibetan":return 46;case"trad-chinese-formal":return 47;case"trad-chinese-informal":return 48;case"upper-armenian":return 49;case"disclosure-open":return 50;case"disclosure-closed":return 51;default:return-1}}},he=function(A){return{name:"margin-"+A,initialValue:"0",prefix:!1,type:4}},Et=he("top"),It=he("right"),yt=he("bottom"),Kt=he("left"),mt={name:"overflow",initialValue:"visible",prefix:!1,type:1,parse:function(A,e){return e.filter(_A).map(function(A){switch(A.value){case"hidden":return 1;case"scroll":return 2;case"clip":return 3;case"auto":return 4;default:return 0}})}},Lt={name:"overflow-wrap",initialValue:"normal",prefix:!1,type:2,parse:function(A,
e){return"break-word"!==e?"normal":"break-word"}},he=function(A){return{name:"padding-"+A,initialValue:"0",prefix:!1,type:3,format:"length-percentage"}},bt=he("top"),Dt=he("right"),vt=he("bottom"),xt=he("left"),Mt={name:"text-align",initialValue:"left",prefix:!1,type:2,parse:function(A,e){switch(e){case"right":return 2;case"center":case"justify":return 1;default:return 0}}},St={name:"position",initialValue:"static",prefix:!1,type:2,parse:function(A,e){switch(e){case"relative":return 1;case"absolute":return 2;case"fixed":return 3;case"sticky":return 4}return 0}},Tt={name:"text-shadow",initialValue:"none",type:1,prefix:!1,parse:function(n,A){return 1===A.length&&jA(A[0],"none")?[]:Ae(A).map(function(A){for(var e={color:Le.TRANSPARENT,offsetX:ae,offsetY:ae,blur:ae},t=0,r=0;r<A.length;r++){var B=A[r];ee(B)?(0===t?e.offsetX=B:1===t?e.offsetY=B:e.blur=B,t++):e.color=ue(n,B)}return e})}},Gt={name:"text-transform",initialValue:"none",prefix:!1,type:2,parse:function(A,e){switch(e){case"uppercase":return 2;case"lowercase":return 1;case"capitalize":return 3}return 0}},Ot={name:"transform",initialValue:"none",prefix:!0,type:0,parse:function(A,e){if(20===e.type&&"none"===e.value)return null;if(18!==e.type)return null;var t=Vt[e.name];if(void 0===t)throw new Error('Attempting to parse an unsupported transform function "'+e.name+'"');return t(e.values)}},Vt={matrix:function(A){A=A.filter(function(A){return 17===A.type}).map(function(A){return A.number});
return 6===A.length?A:null},matrix3d:function(A){var e=A.filter(function(A){return 17===A.type}).map(function(A){return A.number}),t=e[0],r=e[1];e[2],e[3];var B=e[4],n=e[5];e[6],e[7],e[8],e[9],e[10],e[11];var s=e[12],A=e[13];return e[14],e[15],16===e.length?[t,r,B,n,s,A]:null}},he={type:16,number:50,flags:4},kt=[he,he],Rt={name:"transform-origin",initialValue:"50% 50%",prefix:!0,type:1,parse:function(A,e){e=e.filter(te);return 2!==e.length?kt:[e[0],e[1]]}},Nt={name:"visible",initialValue:"none",prefix:!1,type:2,parse:function(A,e){switch(e){case"hidden":return 1;case"collapse":return 2;default:return 0}}};(he=Ze=Ze||{}).NORMAL="normal",he.BREAK_ALL="break-all";function Pt(A,e){return 0!=(A&e)}function Xt(A,e,t){return(A=A&&A[Math.min(e,A.length-1)])?t?A.open:A.close:""}var Jt={name:"word-break",initialValue:"normal",prefix:!(he.KEEP_ALL="keep-all"),type:2,parse:function(A,e){switch(e){case"break-all":return Ze.BREAK_ALL;case"keep-all":return Ze.KEEP_ALL;default:return Ze.NORMAL}}},Yt={name:"z-index",initialValue:"auto",prefix:!1,type:0,parse:function(A,e){if(20===e.type)return{auto:!0,order:0};if(ZA(e))return{auto:!1,order:e.number};throw new Error("Invalid z-index number parsed")}},Wt=function(A,e){if(15===e.type)switch(e.unit.toLowerCase()){case"s":return 1e3*e.number;case"ms":return e.number}throw new Error("Unsupported time type")},Zt={name:"opacity",initialValue:"1",type:0,
prefix:!1,parse:function(A,e){return ZA(e)?e.number:1}},_t={name:"text-decoration-color",initialValue:"transparent",prefix:!1,type:3,format:"color"},qt={name:"text-decoration-line",initialValue:"none",prefix:!1,type:1,parse:function(A,e){return e.filter(_A).map(function(A){switch(A.value){case"underline":return 1;case"overline":return 2;case"line-through":return 3;case"none":return 4}return 0}).filter(function(A){return 0!==A})}},jt={name:"font-family",initialValue:"",prefix:!1,type:1,parse:function(A,e){var t=[],r=[];return e.forEach(function(A){switch(A.type){case 20:case 0:t.push(A.value);break;case 17:t.push(A.number.toString());break;case 4:r.push(t.join(" ")),t.length=0}}),t.length&&r.push(t.join(" ")),r.map(function(A){return-1===A.indexOf(" ")?A:"'"+A+"'"})}},zt={name:"font-size",initialValue:"0",prefix:!1,type:3,format:"length"},$t={name:"font-weight",initialValue:"normal",type:0,prefix:!1,parse:function(A,e){return ZA(e)?e.number:!_A(e)||"bold"!==e.value?400:700}},Ar={name:"font-variant",initialValue:"none",type:1,prefix:!1,parse:function(A,e){return e.filter(_A).map(function(A){return A.value})}},er={name:"font-style",initialValue:"normal",prefix:!1,type:2,parse:function(A,e){switch(e){case"oblique":return"oblique";case"italic":return"italic";default:return"normal"}}},tr={name:"content",initialValue:"none",type:1,prefix:!1,parse:function(A,e){if(0===e.length)return[];
var t=e[0];return 20===t.type&&"none"===t.value?[]:e}},rr={name:"counter-increment",initialValue:"none",prefix:!0,type:1,parse:function(A,e){if(0===e.length)return null;var t=e[0];if(20===t.type&&"none"===t.value)return null;for(var r=[],B=e.filter(zA),n=0;n<B.length;n++){var s=B[n],o=B[n+1];20===s.type&&(o=o&&ZA(o)?o.number:1,r.push({counter:s.value,increment:o}))}return r}},Br={name:"counter-reset",initialValue:"none",prefix:!0,type:1,parse:function(A,e){if(0===e.length)return[];for(var t=[],r=e.filter(zA),B=0;B<r.length;B++){var n=r[B],s=r[B+1];_A(n)&&"none"!==n.value&&(s=s&&ZA(s)?s.number:0,t.push({counter:n.value,reset:s}))}return t}},nr={name:"duration",initialValue:"0s",prefix:!1,type:1,parse:function(e,A){return A.filter(WA).map(function(A){return Wt(e,A)})}},sr={name:"quotes",initialValue:"none",prefix:!0,type:1,parse:function(A,e){if(0===e.length)return null;var t=e[0];if(20===t.type&&"none"===t.value)return null;var r=[],B=e.filter(qA);if(B.length%2!=0)return null;for(var n=0;n<B.length;n+=2){var s=B[n].value,o=B[n+1].value;r.push({open:s,close:o})}return r}},or={name:"box-shadow",initialValue:"none",type:1,prefix:!1,parse:function(n,A){return 1===A.length&&jA(A[0],"none")?[]:Ae(A).map(function(A){for(var e={color:255,offsetX:ae,offsetY:ae,blur:ae,spread:ae,inset:!1},t=0,r=0;r<A.length;r++){var B=A[r];jA(B,"inset")?e.inset=!0:ee(B)?(0===t?e.offsetX=B:1===t?e.offsetY=B:2===t?e.blur=B:e.spread=B,
t++):e.color=ue(n,B)}return e})}},ir={name:"paint-order",initialValue:"normal",prefix:!1,type:1,parse:function(A,e){var t=[];return e.filter(_A).forEach(function(A){switch(A.value){case"stroke":t.push(1);break;case"fill":t.push(0);break;case"markers":t.push(2)}}),[0,1,2].forEach(function(A){-1===t.indexOf(A)&&t.push(A)}),t}},Qr={name:"-webkit-text-stroke-color",initialValue:"currentcolor",prefix:!1,type:3,format:"color"},cr={name:"-webkit-text-stroke-width",initialValue:"0",type:0,prefix:!1,parse:function(A,e){return WA(e)?e.number:0}},ar=(gr.prototype.isVisible=function(){return 0<this.display&&0<this.opacity&&0===this.visibility},gr.prototype.isTransparent=function(){return oe(this.backgroundColor)},gr.prototype.isTransformed=function(){return null!==this.transform},gr.prototype.isPositioned=function(){return 0!==this.position},gr.prototype.isPositionedWithZIndex=function(){return this.isPositioned()&&!this.zIndex.auto},gr.prototype.isFloating=function(){return 0!==this.float},gr.prototype.isInlineLevel=function(){return Pt(this.display,4)||Pt(this.display,33554432)||Pt(this.display,268435456)||Pt(this.display,536870912)||Pt(this.display,67108864)||Pt(this.display,134217728)},gr);function gr(A,e){this.animationDuration=lr(A,nr,e.animationDuration),this.backgroundClip=lr(A,be,e.backgroundClip),this.backgroundColor=lr(A,De,e.backgroundColor),this.backgroundImage=lr(A,Re,e.backgroundImage),
this.backgroundOrigin=lr(A,Ne,e.backgroundOrigin),this.backgroundPosition=lr(A,Pe,e.backgroundPosition),this.backgroundRepeat=lr(A,Xe,e.backgroundRepeat),this.backgroundSize=lr(A,_e,e.backgroundSize),this.borderTopColor=lr(A,je,e.borderTopColor),this.borderRightColor=lr(A,ze,e.borderRightColor),this.borderBottomColor=lr(A,$e,e.borderBottomColor),this.borderLeftColor=lr(A,At,e.borderLeftColor),this.borderTopLeftRadius=lr(A,et,e.borderTopLeftRadius),this.borderTopRightRadius=lr(A,tt,e.borderTopRightRadius),this.borderBottomRightRadius=lr(A,rt,e.borderBottomRightRadius),this.borderBottomLeftRadius=lr(A,Bt,e.borderBottomLeftRadius),this.borderTopStyle=lr(A,nt,e.borderTopStyle),this.borderRightStyle=lr(A,st,e.borderRightStyle),this.borderBottomStyle=lr(A,ot,e.borderBottomStyle),this.borderLeftStyle=lr(A,it,e.borderLeftStyle),this.borderTopWidth=lr(A,Qt,e.borderTopWidth),this.borderRightWidth=lr(A,ct,e.borderRightWidth),this.borderBottomWidth=lr(A,at,e.borderBottomWidth),this.borderLeftWidth=lr(A,gt,e.borderLeftWidth),this.boxShadow=lr(A,or,e.boxShadow),this.color=lr(A,wt,e.color),this.direction=lr(A,Ut,e.direction),this.display=lr(A,lt,e.display),this.float=lr(A,ut,e.cssFloat),this.fontFamily=lr(A,jt,e.fontFamily),this.fontSize=lr(A,zt,e.fontSize),this.fontStyle=lr(A,er,e.fontStyle),this.fontVariant=lr(A,Ar,e.fontVariant),this.fontWeight=lr(A,$t,e.fontWeight),this.letterSpacing=lr(A,
Ft,e.letterSpacing),this.lineBreak=lr(A,ht,e.lineBreak),this.lineHeight=lr(A,dt,e.lineHeight),this.listStyleImage=lr(A,ft,e.listStyleImage),this.listStylePosition=lr(A,Ht,e.listStylePosition),this.listStyleType=lr(A,pt,e.listStyleType),this.marginTop=lr(A,Et,e.marginTop),this.marginRight=lr(A,It,e.marginRight),this.marginBottom=lr(A,yt,e.marginBottom),this.marginLeft=lr(A,Kt,e.marginLeft),this.opacity=lr(A,Zt,e.opacity);var t=lr(A,mt,e.overflow);this.overflowX=t[0],this.overflowY=t[1<t.length?1:0],this.overflowWrap=lr(A,Lt,e.overflowWrap),this.paddingTop=lr(A,bt,e.paddingTop),this.paddingRight=lr(A,Dt,e.paddingRight),this.paddingBottom=lr(A,vt,e.paddingBottom),this.paddingLeft=lr(A,xt,e.paddingLeft),this.paintOrder=lr(A,ir,e.paintOrder),this.position=lr(A,St,e.position),this.textAlign=lr(A,Mt,e.textAlign),this.textDecorationColor=lr(A,_t,null!==(t=e.textDecorationColor)&&void 0!==t?t:e.color),this.textDecorationLine=lr(A,qt,null!==(t=e.textDecorationLine)&&void 0!==t?t:e.textDecoration),this.textShadow=lr(A,Tt,e.textShadow),this.textTransform=lr(A,Gt,e.textTransform),this.transform=lr(A,Ot,e.transform),this.transformOrigin=lr(A,Rt,e.transformOrigin),this.visibility=lr(A,Nt,e.visibility),this.webkitTextStrokeColor=lr(A,Qr,e.webkitTextStrokeColor),this.webkitTextStrokeWidth=lr(A,cr,e.webkitTextStrokeWidth),this.wordBreak=lr(A,Jt,e.wordBreak),this.zIndex=lr(A,Yt,e.zIndex)}for(var wr=function(A,
e){this.content=lr(A,tr,e.content),this.quotes=lr(A,sr,e.quotes)},Ur=function(A,e){this.counterIncrement=lr(A,rr,e.counterIncrement),this.counterReset=lr(A,Br,e.counterReset)},lr=function(A,e,t){var r=new PA,t=null!=t?t.toString():e.initialValue;r.write(t);var B=new JA(r.read());switch(e.type){case 2:var n=B.parseComponentValue();return e.parse(A,_A(n)?n.value:e.initialValue);case 0:return e.parse(A,B.parseComponentValue());case 1:return e.parse(A,B.parseComponentValues());case 4:return B.parseComponentValue();case 3:switch(e.format){case"angle":return le(A,B.parseComponentValue());case"color":return ue(A,B.parseComponentValue());case"image":return Oe(A,B.parseComponentValue());case"length":var s=B.parseComponentValue();return ee(s)?s:ae;case"length-percentage":s=B.parseComponentValue();return te(s)?s:ae;case"time":return Wt(A,B.parseComponentValue())}}},Cr=function(A,e){A=function(A){switch(A.getAttribute("data-html2canvas-debug")){case"all":return 1;case"clone":return 2;case"parse":return 3;case"render":return 4;default:return 0}}(A);return 1===A||e===A},ur=function(A,e){this.context=A,this.textNodes=[],this.elements=[],this.flags=0,Cr(e,3),this.styles=new ar(A,window.getComputedStyle(e,null)),JB(e)&&(this.styles.animationDuration.some(function(A){return 0<A})&&(e.style.animationDuration="0s"),null!==this.styles.transform&&(e.style.transform="none")),this.bounds=f(this.context,
e),Cr(e,4)&&(this.flags|=16)},Fr="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",hr="undefined"==typeof Uint8Array?[]:new Uint8Array(256),dr=0;dr<Fr.length;dr++)hr[Fr.charCodeAt(dr)]=dr;function fr(A,e,t){return A.slice?A.slice(e,t):new Uint16Array(Array.prototype.slice.call(A,e,t))}var Hr=(pr.prototype.get=function(A){var e;if(0<=A){if(A<55296||56319<A&&A<=65535)return e=this.index[A>>5],this.data[e=(e<<2)+(31&A)];if(A<=65535)return e=this.index[2048+(A-55296>>5)],this.data[e=(e<<2)+(31&A)];if(A<this.highStart)return e=this.index[e=2080+(A>>11)],e=this.index[e+=A>>5&63],this.data[e=(e<<2)+(31&A)];if(A<=1114111)return this.data[this.highValueIndex]}return this.errorValue},pr);function pr(A,e,t,r,B,n){this.initialValue=A,this.errorValue=e,this.highStart=t,this.highValueIndex=r,this.index=B,this.data=n}for(var Er="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",Ir="undefined"==typeof Uint8Array?[]:new Uint8Array(256),yr=0;yr<Er.length;yr++)Ir[Er.charCodeAt(yr)]=yr;function Kr(A){return kr.get(A)}function mr(A){var t=function(A){for(var e=[],t=0,r=A.length;t<r;){var B,n=A.charCodeAt(t++);55296<=n&&n<=56319&&t<r?56320==(64512&(B=A.charCodeAt(t++)))?e.push(((1023&n)<<10)+(1023&B)+65536):(e.push(n),t--):e.push(n)}return e}(A),r=t.length,B=0,n=0,s=t.map(Kr);return{next:function(){if(r<=B)return{done:!0,value:null};for(var A=Rr;B<r&&(A=function(A,e){var t=e-2,
r=A[t],B=A[e-1],e=A[e];if(2===B&&3===e)return Rr;if(2===B||3===B||4===B)return"÷";if(2===e||3===e||4===e)return"÷";if(B===Tr&&-1!==[Tr,Gr,Or,Vr].indexOf(e))return Rr;if(!(B!==Or&&B!==Gr||e!==Gr&&10!==e))return Rr;if((B===Vr||10===B)&&10===e)return Rr;if(13===e||5===e)return Rr;if(7===e)return Rr;if(1===B)return Rr;if(13===B&&14===e){for(;5===r;)r=A[--t];if(14===r)return Rr}if(15===B&&15===e){for(var n=0;15===r;)n++,r=A[--t];if(n%2==0)return Rr}return"÷"}(s,++B))===Rr;);if(A===Rr&&B!==r)return{done:!0,value:null};var e=function(){for(var A=[],e=0;e<arguments.length;e++)A[e]=arguments[e];if(String.fromCodePoint)return String.fromCodePoint.apply(String,A);var t=A.length;if(!t)return"";for(var r=[],B=-1,n="";++B<t;){var s=A[B];s<=65535?r.push(s):(s-=65536,r.push(55296+(s>>10),s%1024+56320)),(B+1===t||16384<r.length)&&(n+=String.fromCharCode.apply(String,r),r.length=0)}return n}.apply(null,t.slice(n,B));return n=B,{value:e,done:!1}}}}function Lr(A){return 0===A[0]&&255===A[1]&&0===A[2]&&255===A[3]}var br,Dr,vr,xr,Mr,Sr,Tr=8,Gr=9,Or=11,Vr=12,kr=(vr=function(A){var e,t,r,B,n=.75*A.length,s=A.length,o=0;"="===A[A.length-1]&&(n--,"="===A[A.length-2]&&n--);for(var n=new("undefined"!=typeof ArrayBuffer&&"undefined"!=typeof Uint8Array&&void 0!==Uint8Array.prototype.slice?ArrayBuffer:Array)(n),i=Array.isArray(n)?n:new Uint8Array(n),Q=0;Q<s;Q+=4)e=hr[A.charCodeAt(Q)],t=hr[A.charCodeAt(Q+1)],r=hr[A.charCodeAt(Q+2)],
B=hr[A.charCodeAt(Q+3)],i[o++]=e<<2|t>>4,i[o++]=(15&t)<<4|r>>2,i[o++]=(3&r)<<6|63&B;return n}(br=("AAAAAAAAAAAAEA4AGBkAAFAaAAACAAAAAAAIABAAGAAwADgACAAQAAgAEAAIABAACAAQAAgAEAAIABAACAAQAAgAEAAIABAAQABIAEQATAAIABAACAAQAAgAEAAIABAAVABcAAgAEAAIABAACAAQAGAAaABwAHgAgACIAI4AlgAIABAAmwCjAKgAsAC2AL4AvQDFAMoA0gBPAVYBWgEIAAgACACMANoAYgFkAWwBdAF8AX0BhQGNAZUBlgGeAaMBlQGWAasBswF8AbsBwwF0AcsBYwHTAQgA2wG/AOMBdAF8AekB8QF0AfkB+wHiAHQBfAEIAAMC5gQIAAsCEgIIAAgAFgIeAggAIgIpAggAMQI5AkACygEIAAgASAJQAlgCYAIIAAgACAAKBQoFCgUTBRMFGQUrBSsFCAAIAAgACAAIAAgACAAIAAgACABdAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACABoAmgCrwGvAQgAbgJ2AggAHgEIAAgACADnAXsCCAAIAAgAgwIIAAgACAAIAAgACACKAggAkQKZAggAPADJAAgAoQKkAqwCsgK6AsICCADJAggA0AIIAAgACAAIANYC3gIIAAgACAAIAAgACABAAOYCCAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAkASoB+QIEAAgACAA8AEMCCABCBQgACABJBVAFCAAIAAgACAAIAAgACAAIAAgACABTBVoFCAAIAFoFCABfBWUFCAAIAAgACAAIAAgAbQUIAAgACAAIAAgACABzBXsFfQWFBYoFigWKBZEFigWKBYoFmAWfBaYFrgWxBbkFCAAIAAgACAAIAAgACAAIAAgACAAIAMEFCAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAMgFCADQBQgACAAIAAgACAAIAAgACAAIAAgACAAIAO4CCAAIAAgAiQAIAAgACABAAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAD0AggACAD8AggACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIANYFCAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgA" +
"CAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgA" +
"CAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAMDvwAIAAgAJAIIAAgA" +
"CAAIAAgACAAIAAgACwMTAwgACAB9BOsEGwMjAwgAKwMyAwsFYgE3A/MEPwMIAEUDTQNRAwgAWQOsAGEDCAAIAAgACAAIAAgACABpAzQFNQU2BTcFOAU5BToFNAU1BTYFNwU4BTkFOgU0BTUFNgU3BTgFOQU6BTQFNQU2BTcFOAU5BToFNAU1BTYFNwU4BTkFOgU0BTUFNgU3BTgFOQU6BTQFNQU2BTcFOAU5BToFNAU1BTYFNwU4BTkFOgU0BTUFNgU3BTgFOQU6BTQFNQU2BTcFOAU5BToFNAU1BTYFNwU4BTkFOgU0BTUFNgU3BTgFOQU6BTQFNQU2BTcFOAU5BToFNAU1BTYFNwU4BTkFOgU0BTUFNgU3BTgFOQU6BTQFNQU2BTcFOAU5BToFNAU1BTYFNwU4BTkFOgU0BTUFNgU3BTgFOQU6BTQFNQU2BTcFOAU5BToFNAU1BTYFNwU4BTkFOgU0BTUFNgU3BTgFOQU6BTQFNQU2BTcFOAU5BToFNAU1BTYFNwU4BTkFOgU0BTUFNgU3BTgFOQU6BTQFNQU2BTcFOAU5BToFNAU1BTYFNwU4BTkFOgU0BTUFNgU3BTgFOQU6BTQFNQU2BTcFOAU5BToFNAU1BTYFNwU4BTkFOgU0BTUFNgU3BTgFOQU6BTQFNQU2BTcFOAU5BToFNAU1BTYFNwU4BTkFOgU0BTUFNgU3BTgFOQU6BTQFNQU2BTcFOAU5BToFNAU1BTYFNwU4BTkFOgU0BTUFNgU3BTgFOQU6BTQFNQU2BTcFOAU5BToFNAU1BTYFNwU4BTkFOgU0BTUFNgU3BTgFOQU6BTQFNQU2BTcFOAU5BToFNAU1BTYFNwU4BTkFOgU0BTUFNgU3BTgFOQU6BTQFNQU2BTcFOAU5BToFNAU1BTYFNwU4BTkFOgU0BTUFNgU3BTgFOQU6BTQFNQU2BTcFOAU5BToFNAU1BTYFNwU4BTkFOgU0BTUFNgU3BTgFOQU6BTQFNQU2BTcFOAU5BToFNAU1BTYFNwU4BTkFIQUoBSwFCAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgA" +
"CAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACABtAwgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACABMAEwACAAIAAgACAAIABgACAAIAAgACAC/AAgACAAyAQgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACACAAIAAwAAgACAAIAAgACAAIAAgACAAIAAAARABIAAgACAAIABQASAAIAAgAIABwAEAAjgCIABsAqAC2AL0AigDQAtwC+IJIQqVAZUBWQqVAZUBlQGVAZUBlQGrC5UBlQGVAZUBlQGVAZUBlQGVAXsKlQGVAbAK6wsrDGUMpQzlDJUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUB" +
"lQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAfAKAAuZA64AtwCJALoC6ADwAAgAuACgA/oEpgO6AqsD+AAIAAgAswMIAAgACAAIAIkAuwP5AfsBwwPLAwgACAAIAAgACADRA9kDCAAIAOED6QMIAAgACAAIAAgACADuA/YDCAAIAP4DyQAIAAgABgQIAAgAXQAOBAgACAAIAAgACAAIABMECAAIAAgACAAIAAgACAD8AAQBCAAIAAgAGgQiBCoECAExBAgAEAEIAAgACAAIAAgACAAIAAgACAAIAAgACAA4BAgACABABEYECAAIAAgATAQYAQgAVAQIAAgACAAIAAgACAAIAAgACAAIAFoECAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgAOQEIAAgACAAIAAgA" +
"CAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAB+BAcACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAEABhgSMBAgACAAIAAgAlAQIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAwAEAAQABAADAAMAAwADAAQABAAEAAQABAAEAAQABHATAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgAdQMIAAgACAAIAAgACAAIAMkACAAIAAgAfQMIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACACFA4kDCAAIAAgACAAIAOcBCAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAIcDCAAIAAgACAAIAAgACAAIAAgACAAIAJEDCAAIAAgACADFAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACABgBAgAZgQIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgAbAQCBXIECAAIAHkECAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACABAAJwEQACjBKoEsgQIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAC6BMIECAAIAAgACAAIAAgACABmBAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgA" +
"xwQIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAGYECAAIAAgAzgQIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgAigWKBYoFigWKBYoFigWKBd0FXwUIAOIF6gXxBYoF3gT5BQAGCAaKBYoFigWKBYoFigWKBYoFigWKBYoFigXWBIoFigWKBYoFigWKBYoFigWKBYsFEAaKBYoFigWKBYoFigWKBRQGCACKBYoFigWKBQgACAAIANEECAAIABgGigUgBggAJgYIAC4GMwaKBYoF0wQ3Bj4GigWKBYoFigWKBYoFigWKBYoFigWKBYoFigUIAAgACAAIAAgACAAIAAgAigWKBYoFigWKBYoFigWKBYoFigWKBYoFigWKBYoFigWKBYoFigWKBYoFigWKBYoFigWKBYoFigWKBYoFigWLBf///////wQABAAEAAQABAAEAAQABAAEAAQAAwAEAAQAAgAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQA" +
"BAAEAAQABAAAAAAAAAAAAAAAAAAAAAAAAAAOAAAAAAAAAAQADgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABQAFAAUABQAFAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAAAAUAAAAFAAUAAAAFAAUAAAAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAEAAQABAAEAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABQAFAAUABQAFAAUABQAFAAUABQAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABQAFAAUABQAFAAUAAQAAAAUABQAFAAUABQAFAAAAAAAFAAUAAAAFAAUABQAFAAAAAAAAAAAA" +
"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAUABQAFAAUABQAFAAUABQAFAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAUABQAFAAUABQAFAAUABQAAAAAAAAAAAAAAAAAAAAAAAAAFAAAAAAAFAAUAAQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABwAFAAUABQAFAAAABwAHAAcAAAAHAAcABwAFAAEAAAAAAAAAAAAAAAAAAAAAAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHAAcABwAFAAUABQAFAAcABwAFAAUAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHAAAAAQABAAAAAAAAAAAAAAAFAAUABQAFAAAABwAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAHAAcABwAHAAcAAAAHAAcAAAAAAAUABQAHAAUAAQAHAAEABwAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAFAAUABQAFAAUABwABAAUABQAFAAUAAAAAAAAAAAAAAAEAAQABAAEAAQABAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABwAFAAUAAAAAAAAAAAAAAAAA" +
"BQAFAAUABQAFAAUAAQAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABQAFAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQABQANAAQABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQABAAEAAQABAAEAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAEAAQABAAEAAQABAAEAAQABAAEAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAQABAAEAAQABAAEAAQABAAAAAAAAAAAAAAAAAAAAAAABQAHAAUABQAFAAAAAAAAAAcABQAFAAUABQAFAAQABAAEAAQABAAEAAQABAAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABQAFAAUAAAAFAAUABQAFAAUAAAAFAAUABQAAAAUABQAFAAUABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAUABQAAAAAAAAAAAAUABQAFAAcAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAHAAUAAAAHAAcABwAFAAUABQAFAAUABQAFAAUABwAHAAcABwAFAAcABwAAAAUABQAFAAUABQAFAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABwAHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAAAAUABwAHAAUABQAFAAUAAAAAAAcABwAAAAAABwAHAAUA" +
"AAAAAAAAAAAAAAAAAAAAAAAABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAAAAAABQAFAAcAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAAABwAHAAcABQAFAAAAAAAAAAAABQAFAAAAAAAFAAUABQAAAAAAAAAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABQAAAAAAAAAFAAAAAAAAAAAAAAAAAAAAAAAAAAAABwAFAAUABQAFAAUAAAAFAAUABwAAAAcABwAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAUABQAFAAUABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUAAAAFAAUABwAFAAUABQAFAAAAAAAHAAcAAAAAAAcABwAFAAAAAAAAAAAAAAAAAAAABQAFAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAcABwAAAAAAAAAHAAcABwAAAAcABwAHAAUAAAAAAAAAAAAAAAAAAAAAAAAABQAAAAAAAAAAAAAAAAAAAAAABQAHAAcABwAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABwAHAAcABwAAAAUABQAFAAAABQAFAAUABQAAAAAAAAAAAAAAAAAAAAUABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAAAAcABQAHAAcABQAHAAcAAAAFAAcABwAAAAcABwAFAAUAAAAAAAAAAAAAAAAAAAAFAAUAAAAAAAAAAAAAAAAAAAAAAAAA" +
"BQAFAAcABwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABQAAAAUABwAAAAAAAAAAAAAAAAAAAAAAAAAAAAUAAAAAAAAAAAAFAAcABwAFAAUABQAAAAUAAAAHAAcABwAHAAcABwAHAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUAAAAHAAUABQAFAAUABQAFAAUAAAAAAAAAAAAAAAAAAAAAAAUABQAFAAUABQAFAAUABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAAABwAFAAUABQAFAAUABQAFAAUABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAFAAUABQAFAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAAAAUAAAAFAAAAAAAAAAAABwAHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABwAFAAUABQAFAAUAAAAFAAUAAAAAAAAAAAAAAAUABQAFAAUABQAFAAUABQAFAAUABQAAAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABQAFAAUABwAFAAUABQAFAAUABQAAAAUABQAHAAcABQAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHAAcABQAFAAAAAAAAAAAABQAFAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAUABQAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAAAAcABQAFAAAAAAAAAAAAAAAAAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAAAAAAAAAAAAAAAAAAAAAA" +
"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAFAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABQAHAAUABQAFAAUABQAFAAUABwAHAAcABwAHAAcABwAHAAUABwAHAAUABQAFAAUABQAFAAUABQAFAAUABQAAAAAAAAAAAAAAAAAAAAAAAAAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAFAAUABwAHAAcABwAFAAUABwAHAAcAAAAAAAAAAAAHAAcABQAHAAcABwAHAAcABwAFAAUABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAFAAcABwAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcABQAHAAUABQAFAAUABQAFAAUAAAAFAAAABQAAAAAABQAFAAUABQAFAAUABQAFAAcABwAHAAcABwAHAAUABQAFAAUABQAFAAUABQAFAAUAAAAAAAUABQAFAAUABQAHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABQAFAAUABQAFAAUABwAFAAcABwAHAAcABwAFAAcABwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAUABQAFAAUABQAFAAUABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAUABwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHAAUABQAFAAUABwAHAAUABQAHAAUABQAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAcABQAFAAcABwAHAAUABwAFAAUABQAHAAcAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABwAHAAcABwAHAAcABwAHAAUABQAFAAUABQAFAAUABQAHAAcABQAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
"BQAFAAUAAAAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAcABQAFAAUABQAFAAUABQAAAAAAAAAAAAUAAAAAAAAAAAAAAAAABQAAAAAABwAFAAUAAAAAAAAAAAAAAAAABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAAABQAFAAUABQAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABQAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAFAAUABQAFAAUADgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABQAFAAUAAAAFAAUABQAFAAUABQAFAAUABQAFAAAAAAAAAAAABQAAAAAAAAAFAAAAAAAAAAAABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABwAHAAUABQAHAAAAAAAAAAAABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcABwAHAAcABQAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUAAAAAAAAAAAAAAAAABQAFAAUABQAFAAUABQAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABQAFAAUABQAFAAUABQAFAAUABQAHAAcAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAcABwAFAAUABQAFAAcABwAFAAUABwAHAAAAAAAAAAAAAAAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABQAFAAUABQAFAAcABwAFAAUABwAHAAUA" +
"BQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAAAAAAAAAAAAAAAAAAAAAAFAAcAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUAAAAFAAUABQAAAAAABQAFAAAAAAAAAAAAAAAFAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcABQAFAAcABwAAAAAAAAAAAAAABwAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcABwAFAAcABwAFAAcABwAAAAcABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABQAFAAUABQAAAAAAAAAAAAAAAAAFAAUABQAAAAUABQAAAAAAAAAAAAAABQAFAAUABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAUABQAAAAAAAAAAAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcABQAHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAUABQAFAAUABwAFAAUABQAFAAUABQAFAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABwAHAAcABQAFAAUABQAFAAUABQAFAAUABwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHAAcABwAFAAUABQAHAAcABQAHAAUABQAAAAAAAAAAAAAAAAAFAAAA" +
"BwAHAAcABQAFAAUABQAFAAUABQAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABwAHAAcABwAAAAAABwAHAAAAAAAHAAcABwAAAAAAAAAAAAAAAAAAAAAAAAAFAAAAAAAAAAAAAAAAAAAAAAAAAAAABwAHAAAAAAAFAAUABQAFAAUABQAFAAAAAAAAAAUABQAFAAUABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHAAcABwAFAAUABQAFAAUABQAFAAUABwAHAAUABQAFAAcABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAHAAcABQAFAAUABQAFAAUABwAFAAcABwAFAAcABQAFAAcABQAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAHAAcABQAFAAUABQAAAAAABwAHAAcABwAFAAUABwAFAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcABwAHAAUABQAFAAUABQAFAAUABQAHAAcABQAHAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABwAFAAcABwAFAAUABQAFAAUABQAHAAUAAAAAAAAAAAAAAAAAAAAAAAcABwAFAAUABQAFAAcABQAFAAUABQAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHAAcABwAFAAUABQAFAAUABQAFAAUABQAHAAUABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHAAcABwAFAAUABQAFAAAAAAAFAAUABwAHAAcABwAFAAAAAAAAAAcAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAUABQAFAAUA" +
"BQAFAAUABQAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUAAAAAAAAAAAAAAAAAAAAAAAAABQAFAAUABQAFAAUABwAHAAUABQAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcABQAFAAUABQAFAAUABQAAAAUABQAFAAUABQAFAAcABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAAAAHAAUABQAFAAUABQAFAAUABwAFAAUABwAFAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAFAAUABQAFAAUAAAAAAAAABQAAAAUABQAAAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAHAAcABwAHAAcAAAAFAAUAAAAHAAcABQAHAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAUABwAHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAUABQAFAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAUABQAFAAUABQAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAAAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAAAAAAAAAAAAAAAAAAABQAFAAUABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcABwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABQAAAAUABQAFAAAAAAAFAAUABQAFAAUABQAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAFAAUABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAFAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
"BQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAAAAAAAAAAABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAAAAAAAAAAAAAAAAAAAAAAFAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABQAFAAUABQAAAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAFAAUABQAFAAUABQAAAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAAAAAABQAFAAUABQAFAAUABQAAAAUABQAAAAUABQAFAAUABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAUABQAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAFAAUABQAFAAUABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAFAAUABQAFAAUADgAOAA4ADgAOAA4ADwAPAA8ADwAPAA8ADwAPAA8ADwAPAA8ADwAPAA8ADwAPAA8ADwAPAA8ADwAPAA8ADwAPAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcABwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABwAHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAgACAAIAAgACAAIAAgACAAIAAgA" +
"CAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAAAAAAAAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAKAAoACgAKAAoACgAKAAoACgAKAAoACgAKAAoACgAKAAoACgAKAAoACgAKAAoACgAMAAwADAAMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkAAAAAAAAAAAAKAAoACgAKAAoACgAKAAoACgAKAAoACgAKAAoACgAKAAoACgAKAAoACgAKAAoACgAKAAoACgAKAAoACgAKAAoACgAAAAAAAAAAAAsADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwACwAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAAAAAADgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOAA4ADgAOAA4ADgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADgAOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA4ADgAAAAAAAAAAAAAAAAAAAAAADgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADgAOAA4ADgAOAA4ADgAOAA4ADgAOAAAAAAAAAAAADgAOAA4AAAAAAAAAAAAAAAAAAAAOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADgAOAAAAAAAAAAAAAAAAAAAAAAAAAAAADgAAAAAAAAAAAAAAAAAAAAAAAAAOAAAAAAAAAAAAAAAAAAAA" +
"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADgAOAA4ADgAAAA4ADgAOAA4ADgAOAAAADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4AAAAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAAAAAAAAAAAAAAAAAAAAAAAAAAAADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4AAAAAAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAAAA4AAAAOAAAAAAAAAAAAAAAAAA4AAAAAAAAAAAAAAAAADgAAAAAAAAAAAAAAAAAAAAAAAAAAAA4ADgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADgAAAAAADgAAAAAAAAAAAA4AAAAOAAAAAAAAAAAADgAOAA4AAAAOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOAA4ADgAOAA4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOAA4ADgAAAAAAAAAAAAAAAAAAAAAAAAAOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOAA4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA4ADgAOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADgAOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADgAAAAAAAAAAAA4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOAAAADgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOAA4ADgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA4ADgAOAA4ADgAOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA4ADgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
"DgAAAAAADgAOAA4ADgAOAA4ADgAOAA4ADgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAAAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAAAAAAAAAAAAAAAAAAAAAAAAAAAADgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA4AAAAAAA4ADgAOAA4ADgAOAA4ADgAOAAAADgAOAA4ADgAAAAAAAAAAAAAAAAAAAAAAAAAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4AAAAAAAAAAAAAAAAADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOAA4ADgAOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADgAOAA4ADgAOAA4ADgAOAAAAAAAAAAAAAAAAAAAAAAAAAAAADgAOAA4ADgAOAA4AAAAAAAAAAAAAAAAAAAAAAA4ADgAOAA4ADgAOAA4ADgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4AAAAOAA4ADgAOAA4ADgAAAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4AAAAAAAAAAAA=")),xr=Array.isArray(vr)?function(A){for(var e=A.length,t=[],r=0;r<e;r+=4)t.push(A[r+3]<<24|A[r+2]<<16|A[r+1]<<8|A[r]);return t}(vr):new Uint32Array(vr),Mr=Array.isArray(vr)?function(A){for(var e=A.length,t=[],r=0;r<e;r+=2)t.push(A[r+1]<<8|A[r]);return t}(vr):new Uint16Array(vr),br=fr(Mr,12,xr[4]/2),Dr=2===xr[5]?fr(Mr,(24+xr[4])/2):(vr=xr,Mr=Math.ceil((24+xr[4])/4),vr.slice?vr.slice(Mr,Dr):new Uint32Array(Array.prototype.slice.call(vr,Mr,Dr))),
new Hr(xr[0],xr[1],xr[2],xr[3],br,Dr)),Rr="×",Nr=function(A,e,t,r,B){var n="http://www.w3.org/2000/svg",s=document.createElementNS(n,"svg"),n=document.createElementNS(n,"foreignObject");return s.setAttributeNS(null,"width",A.toString()),s.setAttributeNS(null,"height",e.toString()),n.setAttributeNS(null,"width","100%"),n.setAttributeNS(null,"height","100%"),n.setAttributeNS(null,"x",t.toString()),n.setAttributeNS(null,"y",r.toString()),n.setAttributeNS(null,"externalResourcesRequired","true"),s.appendChild(n),n.appendChild(B),s},Pr=function(r){return new Promise(function(A,e){var t=new Image;t.onload=function(){return A(t)},t.onerror=e,t.src="data:image/svg+xml;charset=utf-8,"+encodeURIComponent((new XMLSerializer).serializeToString(r))})},Xr={get SUPPORT_RANGE_BOUNDS(){var A=function(A){if(A.createRange){var e=A.createRange();if(e.getBoundingClientRect){var t=A.createElement("boundtest");t.style.height="123px",t.style.display="block",A.body.appendChild(t),e.selectNode(t);e=e.getBoundingClientRect(),e=Math.round(e.height);if(A.body.removeChild(t),123===e)return!0}}return!1}(document);return Object.defineProperty(Xr,"SUPPORT_RANGE_BOUNDS",{value:A}),A},get SUPPORT_WORD_BREAKING(){var A=Xr.SUPPORT_RANGE_BOUNDS&&function(A){var e=A.createElement("boundtest");e.style.width="50px",e.style.display="block",e.style.fontSize="12px",e.style.letterSpacing="0px",e.style.wordSpacing="0px",A.body.appendChild(e);
var r=A.createRange();e.innerHTML="function"==typeof"".repeat?"&#128104;".repeat(10):"";var B=e.firstChild,t=Q(B.data).map(function(A){return g(A)}),n=0,s={},t=t.every(function(A,e){r.setStart(B,n),r.setEnd(B,n+A.length);var t=r.getBoundingClientRect();n+=A.length;A=t.x>s.x||t.y>s.y;return s=t,0===e||A});return A.body.removeChild(e),t}(document);return Object.defineProperty(Xr,"SUPPORT_WORD_BREAKING",{value:A}),A},get SUPPORT_SVG_DRAWING(){var A=function(A){var e=new Image,t=A.createElement("canvas"),A=t.getContext("2d");if(!A)return!1;e.src="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'></svg>";try{A.drawImage(e,0,0),t.toDataURL()}catch(A){return!1}return!0}(document);return Object.defineProperty(Xr,"SUPPORT_SVG_DRAWING",{value:A}),A},get SUPPORT_FOREIGNOBJECT_DRAWING(){var A="function"==typeof Array.from&&"function"==typeof window.fetch?function(t){var A=t.createElement("canvas"),r=100;A.width=r,A.height=r;var B=A.getContext("2d");if(!B)return Promise.reject(!1);B.fillStyle="rgb(0, 255, 0)",B.fillRect(0,0,r,r);var e=new Image,n=A.toDataURL();e.src=n;e=Nr(r,r,0,0,e);return B.fillStyle="red",B.fillRect(0,0,r,r),Pr(e).then(function(A){B.drawImage(A,0,0);var e=B.getImageData(0,0,r,r).data;B.fillStyle="red",B.fillRect(0,0,r,r);A=t.createElement("div");return A.style.backgroundImage="url("+n+")",A.style.height="100px",Lr(e)?Pr(Nr(r,r,0,0,A)):Promise.reject(!1)}).then(function(A){return B.drawImage(A,
0,0),Lr(B.getImageData(0,0,r,r).data)}).catch(function(){return!1})}(document):Promise.resolve(!1);return Object.defineProperty(Xr,"SUPPORT_FOREIGNOBJECT_DRAWING",{value:A}),A},get SUPPORT_CORS_IMAGES(){var A=void 0!==(new Image).crossOrigin;return Object.defineProperty(Xr,"SUPPORT_CORS_IMAGES",{value:A}),A},get SUPPORT_RESPONSE_TYPE(){var A="string"==typeof(new XMLHttpRequest).responseType;return Object.defineProperty(Xr,"SUPPORT_RESPONSE_TYPE",{value:A}),A},get SUPPORT_CORS_XHR(){var A="withCredentials"in new XMLHttpRequest;return Object.defineProperty(Xr,"SUPPORT_CORS_XHR",{value:A}),A},get SUPPORT_NATIVE_TEXT_SEGMENTATION(){var A=!("undefined"==typeof Intl||!Intl.Segmenter);return Object.defineProperty(Xr,"SUPPORT_NATIVE_TEXT_SEGMENTATION",{value:A}),A}},Jr=function(A,e){this.text=A,this.bounds=e},Yr=function(A,e){var t=e.ownerDocument;if(t){var r=t.createElement("html2canvaswrapper");r.appendChild(e.cloneNode(!0));t=e.parentNode;if(t){t.replaceChild(r,e);A=f(A,r);return r.firstChild&&t.replaceChild(r.firstChild,r),A}}return d.EMPTY},Wr=function(A,e,t){var r=A.ownerDocument;if(!r)throw new Error("Node has no owner document");r=r.createRange();return r.setStart(A,e),r.setEnd(A,e+t),r},Zr=function(A){if(Xr.SUPPORT_NATIVE_TEXT_SEGMENTATION){var e=new Intl.Segmenter(void 0,{granularity:"grapheme"});return Array.from(e.segment(A)).map(function(A){return A.segment})}return function(A){for(var e,
t=mr(A),r=[];!(e=t.next()).done;)e.value&&r.push(e.value.slice());return r}(A)},_r=function(A,e){return 0!==e.letterSpacing?Zr(A):function(A,e){if(Xr.SUPPORT_NATIVE_TEXT_SEGMENTATION){var t=new Intl.Segmenter(void 0,{granularity:"word"});return Array.from(t.segment(A)).map(function(A){return A.segment})}return jr(A,e)}(A,e)},qr=[32,160,4961,65792,65793,4153,4241],jr=function(A,e){for(var t,r=wA(A,{lineBreak:e.lineBreak,wordBreak:"break-word"===e.overflowWrap?"break-word":e.wordBreak}),B=[];!(t=r.next()).done;)!function(){var A,e;t.value&&(A=t.value.slice(),A=Q(A),e="",A.forEach(function(A){-1===qr.indexOf(A)?e+=g(A):(e.length&&B.push(e),B.push(g(A)),e="")}),e.length&&B.push(e))}();return B},zr=function(A,e,t){var B,n,s,o,i;this.text=$r(e.data,t.textTransform),this.textBounds=(B=A,A=this.text,s=e,A=_r(A,n=t),o=[],i=0,A.forEach(function(A){var e,t,r;n.textDecorationLine.length||0<A.trim().length?Xr.SUPPORT_RANGE_BOUNDS?1<(r=Wr(s,i,A.length).getClientRects()).length?(e=Zr(A),t=0,e.forEach(function(A){o.push(new Jr(A,d.fromDOMRectList(B,Wr(s,t+i,A.length).getClientRects()))),t+=A.length})):o.push(new Jr(A,d.fromDOMRectList(B,r))):(r=s.splitText(A.length),o.push(new Jr(A,Yr(B,s))),s=r):Xr.SUPPORT_RANGE_BOUNDS||(s=s.splitText(A.length)),i+=A.length}),o)},$r=function(A,e){switch(e){case 1:return A.toLowerCase();case 3:return A.replace(AB,eB);case 2:return A.toUpperCase();default:return A}},
AB=/(^|\s|:|-|\(|\))([a-z])/g,eB=function(A,e,t){return 0<A.length?e+t.toUpperCase():A},tB=(A(rB,Sr=ur),rB);function rB(A,e){A=Sr.call(this,A,e)||this;return A.src=e.currentSrc||e.src,A.intrinsicWidth=e.naturalWidth,A.intrinsicHeight=e.naturalHeight,A.context.cache.addImage(A.src),A}var BB,nB=(A(sB,BB=ur),sB);function sB(A,e){A=BB.call(this,A,e)||this;return A.canvas=e,A.intrinsicWidth=e.width,A.intrinsicHeight=e.height,A}var oB,iB=(A(QB,oB=ur),QB);function QB(A,e){var t=oB.call(this,A,e)||this,r=new XMLSerializer,A=f(A,e);return e.setAttribute("width",A.width+"px"),e.setAttribute("height",A.height+"px"),t.svg="data:image/svg+xml,"+encodeURIComponent(r.serializeToString(e)),t.intrinsicWidth=e.width.baseVal.value,t.intrinsicHeight=e.height.baseVal.value,t.context.cache.addImage(t.svg),t}var cB,aB=(A(gB,cB=ur),gB);function gB(A,e){A=cB.call(this,A,e)||this;return A.value=e.value,A}var wB,UB=(A(lB,wB=ur),lB);function lB(A,e){A=wB.call(this,A,e)||this;return A.start=e.start,A.reversed="boolean"==typeof e.reversed&&!0===e.reversed,A}var CB,uB=[{type:15,flags:0,unit:"px",number:3}],FB=[{type:16,flags:0,number:50}],hB="checkbox",dB="radio",fB="password",HB=707406591,pB=(A(EB,CB=ur),EB);function EB(A,e){var t=CB.call(this,A,e)||this;switch(t.type=e.type.toLowerCase(),t.checked=e.checked,t.value=0===(e=(A=e).type===fB?new Array(A.value.length+1).join("•"):A.value).length?A.placeholder||"":e,
t.type!==hB&&t.type!==dB||(t.styles.backgroundColor=3739148031,t.styles.borderTopColor=t.styles.borderRightColor=t.styles.borderBottomColor=t.styles.borderLeftColor=2779096575,t.styles.borderTopWidth=t.styles.borderRightWidth=t.styles.borderBottomWidth=t.styles.borderLeftWidth=1,t.styles.borderTopStyle=t.styles.borderRightStyle=t.styles.borderBottomStyle=t.styles.borderLeftStyle=1,t.styles.backgroundClip=[0],t.styles.backgroundOrigin=[0],t.bounds=(e=t.bounds).width>e.height?new d(e.left+(e.width-e.height)/2,e.top,e.height,e.height):e.width<e.height?new d(e.left,e.top+(e.height-e.width)/2,e.width,e.width):e),t.type){case hB:t.styles.borderTopRightRadius=t.styles.borderTopLeftRadius=t.styles.borderBottomRightRadius=t.styles.borderBottomLeftRadius=uB;break;case dB:t.styles.borderTopRightRadius=t.styles.borderTopLeftRadius=t.styles.borderBottomRightRadius=t.styles.borderBottomLeftRadius=FB}return t}var IB,yB=(A(KB,IB=ur),KB);function KB(A,e){A=IB.call(this,A,e)||this,e=e.options[e.selectedIndex||0];return A.value=e&&e.text||"",A}var mB,LB=(A(bB,mB=ur),bB);function bB(A,e){A=mB.call(this,A,e)||this;return A.value=e.value,A}var DB,vB=(A(xB,DB=ur),xB);function xB(A,e){var t,r,B=DB.call(this,A,e)||this;B.src=e.src,B.width=parseInt(e.width,10)||0,B.height=parseInt(e.height,10)||0,B.backgroundColor=B.styles.backgroundColor;try{e.contentWindow&&e.contentWindow.document&&e.contentWindow.document.documentElement&&(B.tree=kB(A,
e.contentWindow.document.documentElement),t=e.contentWindow.document.documentElement?fe(A,getComputedStyle(e.contentWindow.document.documentElement).backgroundColor):Le.TRANSPARENT,r=e.contentWindow.document.body?fe(A,getComputedStyle(e.contentWindow.document.body).backgroundColor):Le.TRANSPARENT,B.backgroundColor=oe(t)?oe(r)?B.styles.backgroundColor:r:t)}catch(A){}return B}function MB(A){return"VIDEO"===A.tagName}function SB(A){return"STYLE"===A.tagName}function TB(A){return 0<A.tagName.indexOf("-")}var GB=["OL","UL","MENU"],OB=function(e,A,t,r){for(var B=A.firstChild;B;B=s){var n,s=B.nextSibling;PB(B)&&0<B.data.trim().length?t.textNodes.push(new zr(e,B,t.styles)):XB(B)&&(rn(B)&&B.assignedNodes?B.assignedNodes().forEach(function(A){return OB(e,A,t,r)}):(n=VB(e,B)).styles.isVisible()&&(RB(B,n,r)?n.flags|=4:NB(n.styles)&&(n.flags|=2),-1!==GB.indexOf(B.tagName)&&(n.flags|=8),t.elements.push(n),B.slot,B.shadowRoot?OB(e,B.shadowRoot,n,r):en(B)||qB(B)||tn(B)||OB(e,B,n,r)))}},VB=function(A,e){return new($B(e)?tB:zB(e)?nB:qB(e)?iB:WB(e)?aB:ZB(e)?UB:_B(e)?pB:tn(e)?yB:en(e)?LB:An(e)?vB:ur)(A,e)},kB=function(A,e){var t=VB(A,e);return t.flags|=4,OB(A,e,t,t),t},RB=function(A,e,t){return e.styles.isPositionedWithZIndex()||e.styles.opacity<1||e.styles.isTransformed()||jB(A)&&t.styles.isTransparent()},NB=function(A){return A.isPositioned()||A.isFloating()},PB=function(A){return A.nodeType===Node.TEXT_NODE},
XB=function(A){return A.nodeType===Node.ELEMENT_NODE},JB=function(A){return XB(A)&&void 0!==A.style&&!YB(A)},YB=function(A){return"object"==typeof A.className},WB=function(A){return"LI"===A.tagName},ZB=function(A){return"OL"===A.tagName},_B=function(A){return"INPUT"===A.tagName},qB=function(A){return"svg"===A.tagName},jB=function(A){return"BODY"===A.tagName},zB=function(A){return"CANVAS"===A.tagName},$B=function(A){return"IMG"===A.tagName},An=function(A){return"IFRAME"===A.tagName},en=function(A){return"TEXTAREA"===A.tagName},tn=function(A){return"SELECT"===A.tagName},rn=function(A){return"SLOT"===A.tagName},Bn=(nn.prototype.getCounterValue=function(A){A=this.counters[A];return A&&A.length?A[A.length-1]:1},nn.prototype.getCounterValues=function(A){A=this.counters[A];return A||[]},nn.prototype.pop=function(A){var e=this;A.forEach(function(A){return e.counters[A].pop()})},nn.prototype.parse=function(A){var t=this,e=A.counterIncrement,A=A.counterReset,r=!0;null!==e&&e.forEach(function(A){var e=t.counters[A.counter];e&&0!==A.increment&&(r=!1,e.length||e.push(1),e[Math.max(0,e.length-1)]+=A.increment)});var B=[];return r&&A.forEach(function(A){var e=t.counters[A.counter];B.push(A.counter),(e=e||(t.counters[A.counter]=[])).push(A.reset)}),B},nn);function nn(){this.counters={}}function sn(r,A,e,B,t,n){return r<A||e<r?Fn(r,t,0<n.length):B.integers.reduce(function(A,e,t){for(;e<=r;)r-=e,
A+=B.values[t];return A},"")+n}function on(A,e,t,r){for(var B="";t||A--,B=r(A)+B,e<=(A/=e)*e;);return B}function Qn(A,e,t,r,B){var n=t-e+1;return(A<0?"-":"")+(on(Math.abs(A),n,r,function(A){return g(Math.floor(A%n)+e)})+B)}function cn(A,e,t){void 0===t&&(t=". ");var r=e.length;return on(Math.abs(A),r,!1,function(A){return e[Math.floor(A%r)]})+t}function an(A,e,t,r,B,n){if(A<-9999||9999<A)return Fn(A,4,0<B.length);var s=Math.abs(A),o=B;if(0===s)return e[0]+o;for(var i=0;0<s&&i<=4;i++){var Q=s%10;0==Q&&Pt(n,1)&&""!==o?o=e[Q]+o:1<Q||1==Q&&0===i||1==Q&&1===i&&Pt(n,2)||1==Q&&1===i&&Pt(n,4)&&100<A||1==Q&&1<i&&Pt(n,8)?o=e[Q]+(0<i?t[i-1]:"")+o:1==Q&&0<i&&(o=t[i-1]+o),s=Math.floor(s/10)}return(A<0?r:"")+o}var gn,wn={integers:[1e3,900,500,400,100,90,50,40,10,9,5,4,1],values:["M","CM","D","CD","C","XC","L","XL","X","IX","V","IV","I"]},Un={integers:[9e3,8e3,7e3,6e3,5e3,4e3,3e3,2e3,1e3,900,800,700,600,500,400,300,200,100,90,80,70,60,50,40,30,20,10,9,8,7,6,5,4,3,2,1],values:["Ք","Փ","Ւ","Ց","Ր","Տ","Վ","Ս","Ռ","Ջ","Պ","Չ","Ո","Շ","Ն","Յ","Մ","Ճ","Ղ","Ձ","Հ","Կ","Ծ","Խ","Լ","Ի","Ժ","Թ","Ը","Է","Զ","Ե","Դ","Գ","Բ","Ա"]},ln={integers:[1e4,9e3,8e3,7e3,6e3,5e3,4e3,3e3,2e3,1e3,400,300,200,100,90,80,70,60,50,40,30,20,19,18,17,16,15,10,9,8,7,6,5,4,3,2,1],values:["י׳","ט׳","ח׳","ז׳","ו׳","ה׳","ד׳","ג׳","ב׳","א׳","ת","ש","ר","ק","צ","פ","ע","ס","נ","מ","ל","כ","יט","יח","יז","טז","טו","י","ט","ח","ז","ו",
"ה","ד","ג","ב","א"]},Cn={integers:[1e4,9e3,8e3,7e3,6e3,5e3,4e3,3e3,2e3,1e3,900,800,700,600,500,400,300,200,100,90,80,70,60,50,40,30,20,10,9,8,7,6,5,4,3,2,1],values:["ჵ","ჰ","ჯ","ჴ","ხ","ჭ","წ","ძ","ც","ჩ","შ","ყ","ღ","ქ","ფ","ჳ","ტ","ს","რ","ჟ","პ","ო","ჲ","ნ","მ","ლ","კ","ი","თ","ჱ","ზ","ვ","ე","დ","გ","ბ","ა"]},un="마이너스",Fn=function(A,e,t){var r=t?". ":"",B=t?"、":"",n=t?", ":"",s=t?" ":"";switch(e){case 0:return"•"+s;case 1:return"◦"+s;case 2:return"◾"+s;case 5:var o=Qn(A,48,57,!0,r);return o.length<4?"0"+o:o;case 4:return cn(A,"〇一二三四五六七八九",B);case 6:return sn(A,1,3999,wn,3,r).toLowerCase();case 7:return sn(A,1,3999,wn,3,r);case 8:return Qn(A,945,969,!1,r);case 9:return Qn(A,97,122,!1,r);case 10:return Qn(A,65,90,!1,r);case 11:return Qn(A,1632,1641,!0,r);case 12:case 49:return sn(A,1,9999,Un,3,r);case 35:return sn(A,1,9999,Un,3,r).toLowerCase();case 13:return Qn(A,2534,2543,!0,r);case 14:case 30:return Qn(A,6112,6121,!0,r);case 15:return cn(A,"子丑寅卯辰巳午未申酉戌亥",B);case 16:return cn(A,"甲乙丙丁戊己庚辛壬癸",B);case 17:case 48:return an(A,"零一二三四五六七八九","十百千萬","負",B,14);case 47:return an(A,"零壹貳參肆伍陸柒捌玖","拾佰仟萬","負",B,15);case 42:return an(A,"零一二三四五六七八九","十百千萬","负",B,14);case 41:return an(A,"零壹贰叁肆伍陆柒捌玖","拾佰仟萬","负",B,15);case 26:return an(A,"〇一二三四五六七八九","十百千万","マイナス",B,0);case 25:return an(A,"零壱弐参四伍六七八九","拾百千万","マイナス",B,7);case 31:return an(A,"영일이삼사오육칠팔구","십백천만",un,n,7);case 33:return an(A,"零一二三四五六七八九",
"十百千萬",un,n,0);case 32:return an(A,"零壹貳參四五六七八九","拾百千",un,n,7);case 18:return Qn(A,2406,2415,!0,r);case 20:return sn(A,1,19999,Cn,3,r);case 21:return Qn(A,2790,2799,!0,r);case 22:return Qn(A,2662,2671,!0,r);case 22:return sn(A,1,10999,ln,3,r);case 23:return cn(A,"あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわゐゑをん");case 24:return cn(A,"いろはにほへとちりぬるをわかよたれそつねならむうゐのおくやまけふこえてあさきゆめみしゑひもせす");case 27:return Qn(A,3302,3311,!0,r);case 28:return cn(A,"アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヰヱヲン",B);case 29:return cn(A,"イロハニホヘトチリヌルヲワカヨタレソツネナラムウヰノオクヤマケフコエテアサキユメミシヱヒモセス",B);case 34:return Qn(A,3792,3801,!0,r);case 37:return Qn(A,6160,6169,!0,r);case 38:return Qn(A,4160,4169,!0,r);case 39:return Qn(A,2918,2927,!0,r);case 40:return Qn(A,1776,1785,!0,r);case 43:return Qn(A,3046,3055,!0,r);case 44:return Qn(A,3174,3183,!0,r);case 45:return Qn(A,3664,3673,!0,r);case 46:return Qn(A,3872,3881,!0,r);default:return Qn(A,48,57,!0,r)}},hn="data-html2canvas-ignore",dn=(fn.prototype.toIFrame=function(A,r){var e=this,B=pn(A,r);if(!B.contentWindow)return Promise.reject("Unable to find iframe window");var t=A.defaultView.pageXOffset,n=A.defaultView.pageYOffset,s=B.contentWindow,o=s.document,A=In(B).then(function(){return a(e,void 0,void 0,function(){var e,t;return H(this,function(A){switch(A.label){case 0:return this.scrolledElements.forEach(bn),s&&(s.scrollTo(r.left,r.top),!/(iPad|iPhone|iPod)/g.test(navigator.userAgent)||s.scrollY===r.top&&s.scrollX===r.left||(this.context.logger.warn("Unable to restore scroll position for cloned document"),
this.context.windowBounds=this.context.windowBounds.add(s.scrollX-r.left,s.scrollY-r.top,0,0))),e=this.options.onclone,void 0===(t=this.clonedReferenceElement)?[2,Promise.reject("Error finding the "+this.referenceElement.nodeName+" in the cloned document")]:o.fonts&&o.fonts.ready?[4,o.fonts.ready]:[3,2];case 1:A.sent(),A.label=2;case 2:return/(AppleWebKit)/g.test(navigator.userAgent)?[4,En(o)]:[3,4];case 3:A.sent(),A.label=4;case 4:return"function"==typeof e?[2,Promise.resolve().then(function(){return e(o,t)}).then(function(){return B})]:[2,B]}})})});return o.open(),o.write(mn(document.doctype)+"<html></html>"),Ln(this.referenceElement.ownerDocument,t,n),o.replaceChild(o.adoptNode(this.documentElement),o.documentElement),o.close(),A},fn.prototype.createElementClone=function(A){if(Cr(A,2),zB(A))return this.createCanvasClone(A);if(MB(A))return this.createVideoClone(A);if(SB(A))return this.createStyleClone(A);var e=A.cloneNode(!1);return $B(e)&&($B(A)&&A.currentSrc&&A.currentSrc!==A.src&&(e.src=A.currentSrc,e.srcset=""),"lazy"===e.loading&&(e.loading="eager")),TB(e)?this.createCustomElementClone(e):e},fn.prototype.createCustomElementClone=function(A){var e=document.createElement("html2canvascustomelement");return Kn(A.style,e),e},fn.prototype.createStyleClone=function(A){try{var e=A.sheet;if(e&&e.cssRules){var t=[].slice.call(e.cssRules,0).reduce(function(A,e){return e&&"string"==typeof e.cssText?A+e.cssText:A},
""),r=A.cloneNode(!1);return r.textContent=t,r}}catch(A){if(this.context.logger.error("Unable to access cssRules property",A),"SecurityError"!==A.name)throw A}return A.cloneNode(!1)},fn.prototype.createCanvasClone=function(e){var A;if(this.options.inlineImages&&e.ownerDocument){var t=e.ownerDocument.createElement("img");try{return t.src=e.toDataURL(),t}catch(A){this.context.logger.info("Unable to inline canvas contents, canvas is tainted",e)}}t=e.cloneNode(!1);try{t.width=e.width,t.height=e.height;var r,B,n=e.getContext("2d"),s=t.getContext("2d");return s&&(!this.options.allowTaint&&n?s.putImageData(n.getImageData(0,0,e.width,e.height),0,0):(!(r=null!==(A=e.getContext("webgl2"))&&void 0!==A?A:e.getContext("webgl"))||!1===(null==(B=r.getContextAttributes())?void 0:B.preserveDrawingBuffer)&&this.context.logger.warn("Unable to clone WebGL context as it has preserveDrawingBuffer=false",e),s.drawImage(e,0,0))),t}catch(A){this.context.logger.info("Unable to clone canvas as it is tainted",e)}return t},fn.prototype.createVideoClone=function(e){var A=e.ownerDocument.createElement("canvas");A.width=e.offsetWidth,A.height=e.offsetHeight;var t=A.getContext("2d");try{return t&&(t.drawImage(e,0,0,A.width,A.height),this.options.allowTaint||t.getImageData(0,0,A.width,A.height)),A}catch(A){this.context.logger.info("Unable to clone video as it is tainted",e)}A=e.ownerDocument.createElement("canvas");
return A.width=e.offsetWidth,A.height=e.offsetHeight,A},fn.prototype.appendChildNode=function(A,e,t){XB(e)&&("SCRIPT"===e.tagName||e.hasAttribute(hn)||"function"==typeof this.options.ignoreElements&&this.options.ignoreElements(e))||this.options.copyStyles&&XB(e)&&SB(e)||A.appendChild(this.cloneNode(e,t))},fn.prototype.cloneChildNodes=function(A,e,t){for(var r,B=this,n=(A.shadowRoot||A).firstChild;n;n=n.nextSibling)XB(n)&&rn(n)&&"function"==typeof n.assignedNodes?(r=n.assignedNodes()).length&&r.forEach(function(A){return B.appendChildNode(e,A,t)}):this.appendChildNode(e,n,t)},fn.prototype.cloneNode=function(A,e){if(PB(A))return document.createTextNode(A.data);if(!A.ownerDocument)return A.cloneNode(!1);var t=A.ownerDocument.defaultView;if(t&&XB(A)&&(JB(A)||YB(A))){var r=this.createElementClone(A);r.style.transitionProperty="none";var B=t.getComputedStyle(A),n=t.getComputedStyle(A,":before"),s=t.getComputedStyle(A,":after");this.referenceElement===A&&JB(r)&&(this.clonedReferenceElement=r),jB(r)&&Mn(r);t=this.counters.parse(new Ur(this.context,B)),n=this.resolvePseudoContent(A,r,n,gn.BEFORE);TB(A)&&(e=!0),MB(A)||this.cloneChildNodes(A,r,e),n&&r.insertBefore(n,r.firstChild);s=this.resolvePseudoContent(A,r,s,gn.AFTER);return s&&r.appendChild(s),this.counters.pop(t),(B&&(this.options.copyStyles||YB(A))&&!An(A)||e)&&Kn(B,r),0===A.scrollTop&&0===A.scrollLeft||this.scrolledElements.push([r,
A.scrollLeft,A.scrollTop]),(en(A)||tn(A))&&(en(r)||tn(r))&&(r.value=A.value),r}return A.cloneNode(!1)},fn.prototype.resolvePseudoContent=function(o,A,e,t){var i=this;if(e){var r=e.content,Q=A.ownerDocument;if(Q&&r&&"none"!==r&&"-moz-alt-content"!==r&&"none"!==e.display){this.counters.parse(new Ur(this.context,e));var c=new wr(this.context,e),a=Q.createElement("html2canvaspseudoelement");Kn(e,a),c.content.forEach(function(A){if(0===A.type)a.appendChild(Q.createTextNode(A.value));else if(22===A.type){var e=Q.createElement("img");e.src=A.value,e.style.opacity="1",a.appendChild(e)}else if(18===A.type){var t,r,B,n,s;"attr"===A.name?(e=A.values.filter(_A)).length&&a.appendChild(Q.createTextNode(o.getAttribute(e[0].value)||"")):"counter"===A.name?(B=(r=A.values.filter($A))[0],r=r[1],B&&_A(B)&&(t=i.counters.getCounterValue(B.value),s=r&&_A(r)?pt.parse(i.context,r.value):3,a.appendChild(Q.createTextNode(Fn(t,s,!1))))):"counters"===A.name&&(B=(t=A.values.filter($A))[0],s=t[1],r=t[2],B&&_A(B)&&(B=i.counters.getCounterValues(B.value),n=r&&_A(r)?pt.parse(i.context,r.value):3,s=s&&0===s.type?s.value:"",s=B.map(function(A){return Fn(A,n,!1)}).join(s),a.appendChild(Q.createTextNode(s))))}else if(20===A.type)switch(A.value){case"open-quote":a.appendChild(Q.createTextNode(Xt(c.quotes,i.quoteDepth++,!0)));break;case"close-quote":a.appendChild(Q.createTextNode(Xt(c.quotes,--i.quoteDepth,!1)));break;
default:a.appendChild(Q.createTextNode(A.value))}}),a.className=Dn+" "+vn;t=t===gn.BEFORE?" "+Dn:" "+vn;return YB(A)?A.className.baseValue+=t:A.className+=t,a}}},fn.destroy=function(A){return!!A.parentNode&&(A.parentNode.removeChild(A),!0)},fn);function fn(A,e,t){if(this.context=A,this.options=t,this.scrolledElements=[],this.referenceElement=e,this.counters=new Bn,this.quoteDepth=0,!e.ownerDocument)throw new Error("Cloned element does not have an owner document");this.documentElement=this.cloneNode(e.ownerDocument.documentElement,!1)}(he=gn=gn||{})[he.BEFORE=0]="BEFORE",he[he.AFTER=1]="AFTER";function Hn(e){return new Promise(function(A){!e.complete&&e.src?(e.onload=A,e.onerror=A):A()})}var pn=function(A,e){var t=A.createElement("iframe");return t.className="html2canvas-container",t.style.visibility="hidden",t.style.position="fixed",t.style.left="-10000px",t.style.top="0px",t.style.border="0",t.width=e.width.toString(),t.height=e.height.toString(),t.scrolling="no",t.setAttribute(hn,"true"),A.body.appendChild(t),t},En=function(A){return Promise.all([].slice.call(A.images,0).map(Hn))},In=function(B){return new Promise(function(e,A){var t=B.contentWindow;if(!t)return A("No window assigned for iframe");var r=t.document;t.onload=B.onload=function(){t.onload=B.onload=null;var A=setInterval(function(){0<r.body.childNodes.length&&"complete"===r.readyState&&(clearInterval(A),e(B))},50)}})},
yn=["all","d","content"],Kn=function(A,e){for(var t=A.length-1;0<=t;t--){var r=A.item(t);-1===yn.indexOf(r)&&e.style.setProperty(r,A.getPropertyValue(r))}return e},mn=function(A){var e="";return A&&(e+="<!DOCTYPE ",A.name&&(e+=A.name),A.internalSubset&&(e+=A.internalSubset),A.publicId&&(e+='"'+A.publicId+'"'),A.systemId&&(e+='"'+A.systemId+'"'),e+=">"),e},Ln=function(A,e,t){A&&A.defaultView&&(e!==A.defaultView.pageXOffset||t!==A.defaultView.pageYOffset)&&A.defaultView.scrollTo(e,t)},bn=function(A){var e=A[0],t=A[1],A=A[2];e.scrollLeft=t,e.scrollTop=A},Dn="___html2canvas___pseudoelement_before",vn="___html2canvas___pseudoelement_after",xn='{\n    content: "" !important;\n    display: none !important;\n}',Mn=function(A){Sn(A,"."+Dn+":before"+xn+"\n         ."+vn+":after"+xn)},Sn=function(A,e){var t=A.ownerDocument;t&&((t=t.createElement("style")).textContent=e,A.appendChild(t))},Tn=(Gn.getOrigin=function(A){var e=Gn._link;return e?(e.href=A,e.href=e.href,e.protocol+e.hostname+e.port):"about:blank"},Gn.isSameOrigin=function(A){return Gn.getOrigin(A)===Gn._origin},Gn.setContext=function(A){Gn._link=A.document.createElement("a"),Gn._origin=Gn.getOrigin(A.location.href)},Gn._origin="about:blank",Gn);function Gn(){}var On=(Vn.prototype.addImage=function(A){var e=Promise.resolve();return this.has(A)||(Yn(A)||Pn(A))&&(this._cache[A]=this.loadImage(A)).catch(function(){}),e},Vn.prototype.match=function(A){return this._cache[A]},
Vn.prototype.loadImage=function(s){return a(this,void 0,void 0,function(){var e,r,t,B,n=this;return H(this,function(A){switch(A.label){case 0:return(e=Tn.isSameOrigin(s),r=!Xn(s)&&!0===this._options.useCORS&&Xr.SUPPORT_CORS_IMAGES&&!e,t=!Xn(s)&&!e&&!Yn(s)&&"string"==typeof this._options.proxy&&Xr.SUPPORT_CORS_XHR&&!r,e||!1!==this._options.allowTaint||Xn(s)||Yn(s)||t||r)?(B=s,t?[4,this.proxy(B)]:[3,2]):[2];case 1:B=A.sent(),A.label=2;case 2:return this.context.logger.debug("Added image "+s.substring(0,256)),[4,new Promise(function(A,e){var t=new Image;t.onload=function(){return A(t)},t.onerror=e,(Jn(B)||r)&&(t.crossOrigin="anonymous"),t.src=B,!0===t.complete&&setTimeout(function(){return A(t)},500),0<n._options.imageTimeout&&setTimeout(function(){return e("Timed out ("+n._options.imageTimeout+"ms) loading image")},n._options.imageTimeout)})];case 3:return[2,A.sent()]}})})},Vn.prototype.has=function(A){return void 0!==this._cache[A]},Vn.prototype.keys=function(){return Promise.resolve(Object.keys(this._cache))},Vn.prototype.proxy=function(s){var o=this,i=this._options.proxy;if(!i)throw new Error("No proxy defined");var Q=s.substring(0,256);return new Promise(function(e,t){var r=Xr.SUPPORT_RESPONSE_TYPE?"blob":"text",B=new XMLHttpRequest;B.onload=function(){var A;200===B.status?"text"==r?e(B.response):((A=new FileReader).addEventListener("load",function(){return e(A.result)},!1),A.addEventListener("error",
function(A){return t(A)},!1),A.readAsDataURL(B.response)):t("Failed to proxy resource "+Q+" with status code "+B.status)},B.onerror=t;var A,n=-1<i.indexOf("?")?"&":"?";B.open("GET",i+n+"url="+encodeURIComponent(s)+"&responseType="+r),"text"!=r&&B instanceof XMLHttpRequest&&(B.responseType=r),o._options.imageTimeout&&(A=o._options.imageTimeout,B.timeout=A,B.ontimeout=function(){return t("Timed out ("+A+"ms) proxying "+Q)}),B.send()})},Vn);function Vn(A,e){this.context=A,this._options=e,this._cache={}}var kn=/^data:image\/svg\+xml/i,Rn=/^data:image\/.*;base64,/i,Nn=/^data:image\/.*/i,Pn=function(A){return Xr.SUPPORT_SVG_DRAWING||!Wn(A)},Xn=function(A){return Nn.test(A)},Jn=function(A){return Rn.test(A)},Yn=function(A){return"blob"===A.substr(0,4)},Wn=function(A){return"svg"===A.substr(-3).toLowerCase()||kn.test(A)},Zn=(_n.prototype.add=function(A,e){return new _n(this.x+A,this.y+e)},_n);function _n(A,e){this.type=0,this.x=A,this.y=e}function qn(A,e,t){return new Zn(A.x+(e.x-A.x)*t,A.y+(e.y-A.y)*t)}var jn=(zn.prototype.subdivide=function(A,e){var t=qn(this.start,this.startControl,A),r=qn(this.startControl,this.endControl,A),B=qn(this.endControl,this.end,A),n=qn(t,r,A),r=qn(r,B,A),A=qn(n,r,A);return e?new zn(this.start,t,n,A):new zn(A,r,B,this.end)},zn.prototype.add=function(A,e){return new zn(this.start.add(A,e),this.startControl.add(A,e),this.endControl.add(A,e),this.end.add(A,e))},
zn.prototype.reverse=function(){return new zn(this.end,this.endControl,this.startControl,this.start)},zn);function zn(A,e,t,r){this.type=1,this.start=A,this.startControl=e,this.endControl=t,this.end=r}function $n(A){return 1===A.type}var As,es=function(A){var e=A.styles,t=A.bounds,r=(C=Be(e.borderTopLeftRadius,t.width,t.height))[0],B=C[1],n=(u=Be(e.borderTopRightRadius,t.width,t.height))[0],s=u[1],o=(F=Be(e.borderBottomRightRadius,t.width,t.height))[0],i=F[1],Q=(h=Be(e.borderBottomLeftRadius,t.width,t.height))[0],c=h[1];(d=[]).push((r+n)/t.width),d.push((Q+o)/t.width),d.push((B+c)/t.height),d.push((s+i)/t.height),1<(f=Math.max.apply(Math,d))&&(r/=f,B/=f,n/=f,s/=f,o/=f,i/=f,Q/=f,c/=f);var a=t.width-n,g=t.height-i,w=t.width-o,U=t.height-c,l=e.borderTopWidth,C=e.borderRightWidth,u=e.borderBottomWidth,F=e.borderLeftWidth,h=Ue(e.paddingTop,A.bounds.width),d=Ue(e.paddingRight,A.bounds.width),f=Ue(e.paddingBottom,A.bounds.width),A=Ue(e.paddingLeft,A.bounds.width);this.topLeftBorderDoubleOuterBox=0<r||0<B?ss(t.left+F/3,t.top+l/3,r-F/3,B-l/3,As.TOP_LEFT):new Zn(t.left+F/3,t.top+l/3),this.topRightBorderDoubleOuterBox=0<r||0<B?ss(t.left+a,t.top+l/3,n-C/3,s-l/3,As.TOP_RIGHT):new Zn(t.left+t.width-C/3,t.top+l/3),this.bottomRightBorderDoubleOuterBox=0<o||0<i?ss(t.left+w,t.top+g,o-C/3,i-u/3,As.BOTTOM_RIGHT):new Zn(t.left+t.width-C/3,t.top+t.height-u/3),this.bottomLeftBorderDoubleOuterBox=0<Q||0<c?ss(t.left+F/3,
t.top+U,Q-F/3,c-u/3,As.BOTTOM_LEFT):new Zn(t.left+F/3,t.top+t.height-u/3),this.topLeftBorderDoubleInnerBox=0<r||0<B?ss(t.left+2*F/3,t.top+2*l/3,r-2*F/3,B-2*l/3,As.TOP_LEFT):new Zn(t.left+2*F/3,t.top+2*l/3),this.topRightBorderDoubleInnerBox=0<r||0<B?ss(t.left+a,t.top+2*l/3,n-2*C/3,s-2*l/3,As.TOP_RIGHT):new Zn(t.left+t.width-2*C/3,t.top+2*l/3),this.bottomRightBorderDoubleInnerBox=0<o||0<i?ss(t.left+w,t.top+g,o-2*C/3,i-2*u/3,As.BOTTOM_RIGHT):new Zn(t.left+t.width-2*C/3,t.top+t.height-2*u/3),this.bottomLeftBorderDoubleInnerBox=0<Q||0<c?ss(t.left+2*F/3,t.top+U,Q-2*F/3,c-2*u/3,As.BOTTOM_LEFT):new Zn(t.left+2*F/3,t.top+t.height-2*u/3),this.topLeftBorderStroke=0<r||0<B?ss(t.left+F/2,t.top+l/2,r-F/2,B-l/2,As.TOP_LEFT):new Zn(t.left+F/2,t.top+l/2),this.topRightBorderStroke=0<r||0<B?ss(t.left+a,t.top+l/2,n-C/2,s-l/2,As.TOP_RIGHT):new Zn(t.left+t.width-C/2,t.top+l/2),this.bottomRightBorderStroke=0<o||0<i?ss(t.left+w,t.top+g,o-C/2,i-u/2,As.BOTTOM_RIGHT):new Zn(t.left+t.width-C/2,t.top+t.height-u/2),this.bottomLeftBorderStroke=0<Q||0<c?ss(t.left+F/2,t.top+U,Q-F/2,c-u/2,As.BOTTOM_LEFT):new Zn(t.left+F/2,t.top+t.height-u/2),this.topLeftBorderBox=0<r||0<B?ss(t.left,t.top,r,B,As.TOP_LEFT):new Zn(t.left,t.top),this.topRightBorderBox=0<n||0<s?ss(t.left+a,t.top,n,s,As.TOP_RIGHT):new Zn(t.left+t.width,t.top),this.bottomRightBorderBox=0<o||0<i?ss(t.left+w,t.top+g,o,i,As.BOTTOM_RIGHT):new Zn(t.left+t.width,
t.top+t.height),this.bottomLeftBorderBox=0<Q||0<c?ss(t.left,t.top+U,Q,c,As.BOTTOM_LEFT):new Zn(t.left,t.top+t.height),this.topLeftPaddingBox=0<r||0<B?ss(t.left+F,t.top+l,Math.max(0,r-F),Math.max(0,B-l),As.TOP_LEFT):new Zn(t.left+F,t.top+l),this.topRightPaddingBox=0<n||0<s?ss(t.left+Math.min(a,t.width-C),t.top+l,a>t.width+C?0:Math.max(0,n-C),Math.max(0,s-l),As.TOP_RIGHT):new Zn(t.left+t.width-C,t.top+l),this.bottomRightPaddingBox=0<o||0<i?ss(t.left+Math.min(w,t.width-F),t.top+Math.min(g,t.height-u),Math.max(0,o-C),Math.max(0,i-u),As.BOTTOM_RIGHT):new Zn(t.left+t.width-C,t.top+t.height-u),this.bottomLeftPaddingBox=0<Q||0<c?ss(t.left+F,t.top+Math.min(U,t.height-u),Math.max(0,Q-F),Math.max(0,c-u),As.BOTTOM_LEFT):new Zn(t.left+F,t.top+t.height-u),this.topLeftContentBox=0<r||0<B?ss(t.left+F+A,t.top+l+h,Math.max(0,r-(F+A)),Math.max(0,B-(l+h)),As.TOP_LEFT):new Zn(t.left+F+A,t.top+l+h),this.topRightContentBox=0<n||0<s?ss(t.left+Math.min(a,t.width+F+A),t.top+l+h,a>t.width+F+A?0:n-F+A,s-(l+h),As.TOP_RIGHT):new Zn(t.left+t.width-(C+d),t.top+l+h),this.bottomRightContentBox=0<o||0<i?ss(t.left+Math.min(w,t.width-(F+A)),t.top+Math.min(g,t.height+l+h),Math.max(0,o-(C+d)),i-(u+f),As.BOTTOM_RIGHT):new Zn(t.left+t.width-(C+d),t.top+t.height-(u+f)),this.bottomLeftContentBox=0<Q||0<c?ss(t.left+F+A,t.top+U,Math.max(0,Q-(F+A)),c-(u+f),As.BOTTOM_LEFT):new Zn(t.left+F+A,t.top+t.height-(u+f))};(he=As=As||{})[he.TOP_LEFT=0]="TOP_LEFT",
he[he.TOP_RIGHT=1]="TOP_RIGHT",he[he.BOTTOM_RIGHT=2]="BOTTOM_RIGHT",he[he.BOTTOM_LEFT=3]="BOTTOM_LEFT";function ts(A){return[A.topLeftBorderBox,A.topRightBorderBox,A.bottomRightBorderBox,A.bottomLeftBorderBox]}function rs(A){return[A.topLeftPaddingBox,A.topRightPaddingBox,A.bottomRightPaddingBox,A.bottomLeftPaddingBox]}function Bs(A){return 1===A.type}function ns(A,t){return A.length===t.length&&A.some(function(A,e){return A===t[e]})}var ss=function(A,e,t,r,B){var n=(Math.sqrt(2)-1)/3*4,s=t*n,o=r*n,i=A+t,Q=e+r;switch(B){case As.TOP_LEFT:return new jn(new Zn(A,Q),new Zn(A,Q-o),new Zn(i-s,e),new Zn(i,e));case As.TOP_RIGHT:return new jn(new Zn(A,e),new Zn(A+s,e),new Zn(i,Q-o),new Zn(i,Q));case As.BOTTOM_RIGHT:return new jn(new Zn(i,e),new Zn(i,e+o),new Zn(A+s,Q),new Zn(A,Q));default:As.BOTTOM_LEFT;return new jn(new Zn(i,Q),new Zn(i-s,Q),new Zn(A,e+o),new Zn(A,e))}},os=function(A,e,t){this.offsetX=A,this.offsetY=e,this.matrix=t,this.type=0,this.target=6},is=function(A,e){this.path=A,this.target=e,this.type=1},Qs=function(A){this.opacity=A,this.type=2,this.target=6},cs=function(A){this.element=A,this.inlineLevel=[],this.nonInlineLevel=[],this.negativeZIndex=[],this.zeroOrAutoZIndexOrTransformedOrOpacity=[],this.positiveZIndex=[],this.nonPositionedFloats=[],this.nonPositionedInlineLevel=[]},as=(gs.prototype.getEffects=function(e){for(var A=-1===[2,3].indexOf(this.container.styles.position),
t=this.parent,r=this.effects.slice(0);t;){var B,n,s=t.effects.filter(function(A){return!Bs(A)});A||0!==t.container.styles.position||!t.parent?(r.unshift.apply(r,s),A=-1===[2,3].indexOf(t.container.styles.position),0!==t.container.styles.overflowX&&(B=ts(t.curves),n=rs(t.curves),ns(B,n)||r.unshift(new is(n,6)))):r.unshift.apply(r,s),t=t.parent}return r.filter(function(A){return Pt(A.target,e)})},gs);function gs(A,e){var t,r;this.container=A,this.parent=e,this.effects=[],this.curves=new es(this.container),this.container.styles.opacity<1&&this.effects.push(new Qs(this.container.styles.opacity)),null!==this.container.styles.transform&&(e=this.container.bounds.left+this.container.styles.transformOrigin[0].number,t=this.container.bounds.top+this.container.styles.transformOrigin[1].number,r=this.container.styles.transform,this.effects.push(new os(e,t,r))),0!==this.container.styles.overflowX&&(t=ts(this.curves),r=rs(this.curves),ns(t,r)?this.effects.push(new is(t,6)):(this.effects.push(new is(t,2)),this.effects.push(new is(r,4))))}function ws(A,e){switch(e){case 0:return Hs(A.topLeftBorderBox,A.topLeftPaddingBox,A.topRightBorderBox,A.topRightPaddingBox);case 1:return Hs(A.topRightBorderBox,A.topRightPaddingBox,A.bottomRightBorderBox,A.bottomRightPaddingBox);case 2:return Hs(A.bottomRightBorderBox,A.bottomRightPaddingBox,A.bottomLeftBorderBox,A.bottomLeftPaddingBox);default:return Hs(A.bottomLeftBorderBox,
A.bottomLeftPaddingBox,A.topLeftBorderBox,A.topLeftPaddingBox)}}function Us(A){var e=A.bounds,A=A.styles;return e.add(A.borderLeftWidth,A.borderTopWidth,-(A.borderRightWidth+A.borderLeftWidth),-(A.borderTopWidth+A.borderBottomWidth))}function ls(A){var e=A.styles,t=A.bounds,r=Ue(e.paddingLeft,t.width),B=Ue(e.paddingRight,t.width),n=Ue(e.paddingTop,t.width),A=Ue(e.paddingBottom,t.width);return t.add(r+e.borderLeftWidth,n+e.borderTopWidth,-(e.borderRightWidth+e.borderLeftWidth+r+B),-(e.borderTopWidth+e.borderBottomWidth+n+A))}function Cs(A,e,t){var r=(B=Es(A.styles.backgroundOrigin,e),n=A,0===B?n.bounds:(2===B?ls:Us)(n)),B=(s=Es(A.styles.backgroundClip,e),o=A,0===s?o.bounds:(2===s?ls:Us)(o)),n=ps(Es(A.styles.backgroundSize,e),t,r),s=n[0],o=n[1],t=Be(Es(A.styles.backgroundPosition,e),r.width-s,r.height-o);return[Is(Es(A.styles.backgroundRepeat,e),t,n,r,B),Math.round(r.left+t[0]),Math.round(r.top+t[1]),s,o]}function us(A){return _A(A)&&A.value===Ve.AUTO}function Fs(A){return"number"==typeof A}var hs=function(Q,c,a,g){Q.container.elements.forEach(function(A){var e=Pt(A.flags,4),t=Pt(A.flags,2),r=new as(A,Q);Pt(A.styles.display,2048)&&g.push(r);var B,n,s,o,i=Pt(A.flags,8)?[]:g;e||t?(B=e||A.styles.isPositioned()?a:c,t=new cs(r),A.styles.isPositioned()||A.styles.opacity<1||A.styles.isTransformed()?(n=A.styles.zIndex.order)<0?(s=0,B.negativeZIndex.some(function(A,e){return n>A.element.container.styles.zIndex.order?(s=e,
!1):0<s}),B.negativeZIndex.splice(s,0,t)):0<n?(o=0,B.positiveZIndex.some(function(A,e){return n>=A.element.container.styles.zIndex.order?(o=e+1,!1):0<o}),B.positiveZIndex.splice(o,0,t)):B.zeroOrAutoZIndexOrTransformedOrOpacity.push(t):(A.styles.isFloating()?B.nonPositionedFloats:B.nonPositionedInlineLevel).push(t),hs(r,t,e?t:a,i)):((A.styles.isInlineLevel()?c.inlineLevel:c.nonInlineLevel).push(r),hs(r,c,a,i)),Pt(A.flags,8)&&ds(A,i)})},ds=function(A,e){for(var t=A instanceof UB?A.start:1,r=A instanceof UB&&A.reversed,B=0;B<e.length;B++){var n=e[B];n.container instanceof aB&&"number"==typeof n.container.value&&0!==n.container.value&&(t=n.container.value),n.listValue=Fn(t,n.container.styles.listStyleType,!0),t+=r?-1:1}},fs=function(A,e){var t=[];return $n(A)?t.push(A.subdivide(.5,!1)):t.push(A),$n(e)?t.push(e.subdivide(.5,!0)):t.push(e),t},Hs=function(A,e,t,r){var B=[];return $n(A)?B.push(A.subdivide(.5,!1)):B.push(A),$n(t)?B.push(t.subdivide(.5,!0)):B.push(t),$n(r)?B.push(r.subdivide(.5,!0).reverse()):B.push(r),$n(e)?B.push(e.subdivide(.5,!1).reverse()):B.push(e),B},ps=function(A,e,t){var r=e[0],B=e[1],n=e[2],s=A[0],o=A[1];if(!s)return[0,0];if(te(s)&&o&&te(o))return[Ue(s,t.width),Ue(o,t.height)];var i=Fs(n);if(_A(s)&&(s.value===Ve.CONTAIN||s.value===Ve.COVER))return Fs(n)?t.width/t.height<n!=(s.value===Ve.COVER)?[t.width,t.width/n]:[t.height*n,t.height]:[t.width,t.height];var Q=Fs(r),
e=Fs(B),A=Q||e;if(us(s)&&(!o||us(o)))return Q&&e?[r,B]:i||A?A&&i?[Q?r:B*n,e?B:r/n]:[Q?r:t.width,e?B:t.height]:[t.width,t.height];if(i){var c=0,a=0;return te(s)?c=Ue(s,t.width):te(o)&&(a=Ue(o,t.height)),us(s)?c=a*n:o&&!us(o)||(a=c/n),[c,a]}c=null,a=null;if(te(s)?c=Ue(s,t.width):o&&te(o)&&(a=Ue(o,t.height)),null!==(c=null!==(a=null!==c&&(!o||us(o))?Q&&e?c/r*B:t.height:a)&&us(s)?Q&&e?a/B*r:t.width:c)&&null!==a)return[c,a];throw new Error("Unable to calculate background-size for element")},Es=function(A,e){e=A[e];return void 0===e?A[0]:e},Is=function(A,e,t,r,B){var n=e[0],s=e[1],o=t[0],i=t[1];switch(A){case 2:return[new Zn(Math.round(r.left),Math.round(r.top+s)),new Zn(Math.round(r.left+r.width),Math.round(r.top+s)),new Zn(Math.round(r.left+r.width),Math.round(i+r.top+s)),new Zn(Math.round(r.left),Math.round(i+r.top+s))];case 3:return[new Zn(Math.round(r.left+n),Math.round(r.top)),new Zn(Math.round(r.left+n+o),Math.round(r.top)),new Zn(Math.round(r.left+n+o),Math.round(r.height+r.top)),new Zn(Math.round(r.left+n),Math.round(r.height+r.top))];case 1:return[new Zn(Math.round(r.left+n),Math.round(r.top+s)),new Zn(Math.round(r.left+n+o),Math.round(r.top+s)),new Zn(Math.round(r.left+n+o),Math.round(r.top+s+i)),new Zn(Math.round(r.left+n),Math.round(r.top+s+i))];default:return[new Zn(Math.round(B.left),Math.round(B.top)),new Zn(Math.round(B.left+B.width),Math.round(B.top)),new Zn(Math.round(B.left+B.width),
Math.round(B.height+B.top)),new Zn(Math.round(B.left),Math.round(B.height+B.top))]}},ys="Hidden Text",Ks=(ms.prototype.parseMetrics=function(A,e){var t=this._document.createElement("div"),r=this._document.createElement("img"),B=this._document.createElement("span"),n=this._document.body;t.style.visibility="hidden",t.style.fontFamily=A,t.style.fontSize=e,t.style.margin="0",t.style.padding="0",t.style.whiteSpace="nowrap",n.appendChild(t),r.src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",r.width=1,r.height=1,r.style.margin="0",r.style.padding="0",r.style.verticalAlign="baseline",B.style.fontFamily=A,B.style.fontSize=e,B.style.margin="0",B.style.padding="0",B.appendChild(this._document.createTextNode(ys)),t.appendChild(B),t.appendChild(r);e=r.offsetTop-B.offsetTop+2;t.removeChild(B),t.appendChild(this._document.createTextNode(ys)),t.style.lineHeight="normal",r.style.verticalAlign="super";r=r.offsetTop-t.offsetTop+2;return n.removeChild(t),{baseline:e,middle:r}},ms.prototype.getMetrics=function(A,e){var t=A+" "+e;return void 0===this._data[t]&&(this._data[t]=this.parseMetrics(A,e)),this._data[t]},ms);function ms(A){this._data={},this._document=A}var Ls,he=function(A,e){this.context=A,this.options=e},bs=(A(Ds,Ls=he),Ds.prototype.applyEffects=function(A){for(var e=this;this._activeEffects.length;)this.popEffect();A.forEach(function(A){return e.applyEffect(A)})},
Ds.prototype.applyEffect=function(A){this.ctx.save(),2===A.type&&(this.ctx.globalAlpha=A.opacity),0===A.type&&(this.ctx.translate(A.offsetX,A.offsetY),this.ctx.transform(A.matrix[0],A.matrix[1],A.matrix[2],A.matrix[3],A.matrix[4],A.matrix[5]),this.ctx.translate(-A.offsetX,-A.offsetY)),Bs(A)&&(this.path(A.path),this.ctx.clip()),this._activeEffects.push(A)},Ds.prototype.popEffect=function(){this._activeEffects.pop(),this.ctx.restore()},Ds.prototype.renderStack=function(e){return a(this,void 0,void 0,function(){return H(this,function(A){switch(A.label){case 0:return e.element.container.styles.isVisible()?[4,this.renderStackContent(e)]:[3,2];case 1:A.sent(),A.label=2;case 2:return[2]}})})},Ds.prototype.renderNode=function(e){return a(this,void 0,void 0,function(){return H(this,function(A){switch(A.label){case 0:return Pt(e.container.flags,16),e.container.styles.isVisible()?[4,this.renderNodeBackgroundAndBorders(e)]:[3,3];case 1:return A.sent(),[4,this.renderNodeContent(e)];case 2:A.sent(),A.label=3;case 3:return[2]}})})},Ds.prototype.renderTextWithLetterSpacing=function(t,A,r){var B=this;0===A?this.ctx.fillText(t.text,t.bounds.left,t.bounds.top+r):Zr(t.text).reduce(function(A,e){return B.ctx.fillText(e,A,t.bounds.top+r),A+B.ctx.measureText(e).width},t.bounds.left)},Ds.prototype.createFontStyle=function(A){var e=A.fontVariant.filter(function(A){return"normal"===A||"small-caps"===A}).join(""),
t=Gs(A.fontFamily).join(", "),r=WA(A.fontSize)?""+A.fontSize.number+A.fontSize.unit:A.fontSize.number+"px";return[[A.fontStyle,e,A.fontWeight,r,t].join(" "),t,r]},Ds.prototype.renderTextNode=function(i,Q){return a(this,void 0,void 0,function(){var e,t,r,B,n,s,o=this;return H(this,function(A){return r=this.createFontStyle(Q),e=r[0],t=r[1],r=r[2],this.ctx.font=e,this.ctx.direction=1===Q.direction?"rtl":"ltr",this.ctx.textAlign="left",this.ctx.textBaseline="alphabetic",r=this.fontMetrics.getMetrics(t,r),B=r.baseline,n=r.middle,s=Q.paintOrder,i.textBounds.forEach(function(t){s.forEach(function(A){switch(A){case 0:o.ctx.fillStyle=ie(Q.color),o.renderTextWithLetterSpacing(t,Q.letterSpacing,B);var e=Q.textShadow;e.length&&t.text.trim().length&&(e.slice(0).reverse().forEach(function(A){o.ctx.shadowColor=ie(A.color),o.ctx.shadowOffsetX=A.offsetX.number*o.options.scale,o.ctx.shadowOffsetY=A.offsetY.number*o.options.scale,o.ctx.shadowBlur=A.blur.number,o.renderTextWithLetterSpacing(t,Q.letterSpacing,B)}),o.ctx.shadowColor="",o.ctx.shadowOffsetX=0,o.ctx.shadowOffsetY=0,o.ctx.shadowBlur=0),Q.textDecorationLine.length&&(o.ctx.fillStyle=ie(Q.textDecorationColor||Q.color),Q.textDecorationLine.forEach(function(A){switch(A){case 1:o.ctx.fillRect(t.bounds.left,Math.round(t.bounds.top+B),t.bounds.width,1);break;case 2:o.ctx.fillRect(t.bounds.left,Math.round(t.bounds.top),t.bounds.width,1);break;case 3:o.ctx.fillRect(t.bounds.left,
Math.ceil(t.bounds.top+n),t.bounds.width,1)}}));break;case 1:Q.webkitTextStrokeWidth&&t.text.trim().length&&(o.ctx.strokeStyle=ie(Q.webkitTextStrokeColor),o.ctx.lineWidth=Q.webkitTextStrokeWidth,o.ctx.lineJoin=window.chrome?"miter":"round",o.ctx.strokeText(t.text,t.bounds.left,t.bounds.top+B)),o.ctx.strokeStyle="",o.ctx.lineWidth=0,o.ctx.lineJoin="miter"}})}),[2]})})},Ds.prototype.renderReplacedElement=function(A,e,t){var r;t&&0<A.intrinsicWidth&&0<A.intrinsicHeight&&(r=ls(A),e=rs(e),this.path(e),this.ctx.save(),this.ctx.clip(),this.ctx.drawImage(t,0,0,A.intrinsicWidth,A.intrinsicHeight,r.left,r.top,r.width,r.height),this.ctx.restore())},Ds.prototype.renderNodeContent=function(w){return a(this,void 0,void 0,function(){var e,t,r,B,n,s,o,i,Q,c,a,g;return H(this,function(A){switch(A.label){case 0:this.applyEffects(w.getEffects(4)),e=w.container,t=w.curves,r=e.styles,B=0,n=e.textNodes,A.label=1;case 1:return B<n.length?(s=n[B],[4,this.renderTextNode(s,r)]):[3,4];case 2:A.sent(),A.label=3;case 3:return B++,[3,1];case 4:if(!(e instanceof tB))return[3,8];A.label=5;case 5:return A.trys.push([5,7,,8]),[4,this.context.cache.match(e.src)];case 6:return Q=A.sent(),this.renderReplacedElement(e,t,Q),[3,8];case 7:return A.sent(),this.context.logger.error("Error loading image "+e.src),[3,8];case 8:if(e instanceof nB&&this.renderReplacedElement(e,t,e.canvas),!(e instanceof iB))return[3,12];A.label=9;
case 9:return A.trys.push([9,11,,12]),[4,this.context.cache.match(e.svg)];case 10:return Q=A.sent(),this.renderReplacedElement(e,t,Q),[3,12];case 11:return A.sent(),this.context.logger.error("Error loading svg "+e.svg.substring(0,255)),[3,12];case 12:return e instanceof vB&&e.tree?[4,new Ds(this.context,{scale:this.options.scale,backgroundColor:e.backgroundColor,x:0,y:0,width:e.width,height:e.height}).render(e.tree)]:[3,14];case 13:s=A.sent(),e.width&&e.height&&this.ctx.drawImage(s,0,0,e.width,e.height,e.bounds.left,e.bounds.top,e.bounds.width,e.bounds.height),A.label=14;case 14:if(e instanceof pB&&(i=Math.min(e.bounds.width,e.bounds.height),e.type===hB?e.checked&&(this.ctx.save(),this.path([new Zn(e.bounds.left+.39363*i,e.bounds.top+.79*i),new Zn(e.bounds.left+.16*i,e.bounds.top+.5549*i),new Zn(e.bounds.left+.27347*i,e.bounds.top+.44071*i),new Zn(e.bounds.left+.39694*i,e.bounds.top+.5649*i),new Zn(e.bounds.left+.72983*i,e.bounds.top+.23*i),new Zn(e.bounds.left+.84*i,e.bounds.top+.34085*i),new Zn(e.bounds.left+.39363*i,e.bounds.top+.79*i)]),this.ctx.fillStyle=ie(HB),this.ctx.fill(),this.ctx.restore()):e.type===dB&&e.checked&&(this.ctx.save(),this.ctx.beginPath(),this.ctx.arc(e.bounds.left+i/2,e.bounds.top+i/2,i/4,0,2*Math.PI,!0),this.ctx.fillStyle=ie(HB),this.ctx.fill(),this.ctx.restore())),xs(e)&&e.value.length){switch(c=this.createFontStyle(r),a=c[0],i=c[1],c=this.fontMetrics.getMetrics(a,
i).baseline,this.ctx.font=a,this.ctx.fillStyle=ie(r.color),this.ctx.textBaseline="alphabetic",this.ctx.textAlign=Ss(e.styles.textAlign),g=ls(e),o=0,e.styles.textAlign){case 1:o+=g.width/2;break;case 2:o+=g.width}i=g.add(o,0,0,-g.height/2+1),this.ctx.save(),this.path([new Zn(g.left,g.top),new Zn(g.left+g.width,g.top),new Zn(g.left+g.width,g.top+g.height),new Zn(g.left,g.top+g.height)]),this.ctx.clip(),this.renderTextWithLetterSpacing(new Jr(e.value,i),r.letterSpacing,c),this.ctx.restore(),this.ctx.textBaseline="alphabetic",this.ctx.textAlign="left"}if(!Pt(e.styles.display,2048))return[3,20];if(null===e.styles.listStyleImage)return[3,19];if(0!==(c=e.styles.listStyleImage).type)return[3,18];Q=void 0,c=c.url,A.label=15;case 15:return A.trys.push([15,17,,18]),[4,this.context.cache.match(c)];case 16:return Q=A.sent(),this.ctx.drawImage(Q,e.bounds.left-(Q.width+10),e.bounds.top),[3,18];case 17:return A.sent(),this.context.logger.error("Error loading list-style-image "+c),[3,18];case 18:return[3,20];case 19:w.listValue&&-1!==e.styles.listStyleType&&(a=this.createFontStyle(r)[0],this.ctx.font=a,this.ctx.fillStyle=ie(r.color),this.ctx.textBaseline="middle",this.ctx.textAlign="right",g=new d(e.bounds.left,e.bounds.top+Ue(e.styles.paddingTop,e.bounds.width),e.bounds.width,Ye(r.lineHeight,r.fontSize.number)/2+1),this.renderTextWithLetterSpacing(new Jr(w.listValue,g),r.letterSpacing,Ye(r.lineHeight,
r.fontSize.number)/2+2),this.ctx.textBaseline="bottom",this.ctx.textAlign="left"),A.label=20;case 20:return[2]}})})},Ds.prototype.renderStackContent=function(C){return a(this,void 0,void 0,function(){var e,t,r,B,n,s,o,i,Q,c,a,g,w,U,l;return H(this,function(A){switch(A.label){case 0:return Pt(C.element.container.flags,16),[4,this.renderNodeBackgroundAndBorders(C.element)];case 1:A.sent(),e=0,t=C.negativeZIndex,A.label=2;case 2:return e<t.length?(l=t[e],[4,this.renderStack(l)]):[3,5];case 3:A.sent(),A.label=4;case 4:return e++,[3,2];case 5:return[4,this.renderNodeContent(C.element)];case 6:A.sent(),r=0,B=C.nonInlineLevel,A.label=7;case 7:return r<B.length?(l=B[r],[4,this.renderNode(l)]):[3,10];case 8:A.sent(),A.label=9;case 9:return r++,[3,7];case 10:n=0,s=C.nonPositionedFloats,A.label=11;case 11:return n<s.length?(l=s[n],[4,this.renderStack(l)]):[3,14];case 12:A.sent(),A.label=13;case 13:return n++,[3,11];case 14:o=0,i=C.nonPositionedInlineLevel,A.label=15;case 15:return o<i.length?(l=i[o],[4,this.renderStack(l)]):[3,18];case 16:A.sent(),A.label=17;case 17:return o++,[3,15];case 18:Q=0,c=C.inlineLevel,A.label=19;case 19:return Q<c.length?(l=c[Q],[4,this.renderNode(l)]):[3,22];case 20:A.sent(),A.label=21;case 21:return Q++,[3,19];case 22:a=0,g=C.zeroOrAutoZIndexOrTransformedOrOpacity,A.label=23;case 23:return a<g.length?(l=g[a],[4,this.renderStack(l)]):[3,26];case 24:A.sent(),A.label=25;
case 25:return a++,[3,23];case 26:w=0,U=C.positiveZIndex,A.label=27;case 27:return w<U.length?(l=U[w],[4,this.renderStack(l)]):[3,30];case 28:A.sent(),A.label=29;case 29:return w++,[3,27];case 30:return[2]}})})},Ds.prototype.mask=function(A){this.ctx.beginPath(),this.ctx.moveTo(0,0),this.ctx.lineTo(this.canvas.width,0),this.ctx.lineTo(this.canvas.width,this.canvas.height),this.ctx.lineTo(0,this.canvas.height),this.ctx.lineTo(0,0),this.formatPath(A.slice(0).reverse()),this.ctx.closePath()},Ds.prototype.path=function(A){this.ctx.beginPath(),this.formatPath(A),this.ctx.closePath()},Ds.prototype.formatPath=function(A){var r=this;A.forEach(function(A,e){var t=$n(A)?A.start:A;0===e?r.ctx.moveTo(t.x,t.y):r.ctx.lineTo(t.x,t.y),$n(A)&&r.ctx.bezierCurveTo(A.startControl.x,A.startControl.y,A.endControl.x,A.endControl.y,A.end.x,A.end.y)})},Ds.prototype.renderRepeat=function(A,e,t,r){this.path(A),this.ctx.fillStyle=e,this.ctx.translate(t,r),this.ctx.fill(),this.ctx.translate(-t,-r)},Ds.prototype.resizeImage=function(A,e,t){if(A.width===e&&A.height===t)return A;var r=(null!==(r=this.canvas.ownerDocument)&&void 0!==r?r:document).createElement("canvas");return r.width=Math.max(1,e),r.height=Math.max(1,t),r.getContext("2d").drawImage(A,0,0,A.width,A.height,0,0,e,t),r},Ds.prototype.renderBackgroundImage=function(f){return a(this,void 0,void 0,function(){var h,e,d,t,r,B;return H(this,function(A){switch(A.label){case 0:h=f.styles.backgroundImage.length-1,
e=function(e){var t,r,B,n,s,o,i,Q,c,a,g,w,U,l,C,u,F;return H(this,function(A){switch(A.label){case 0:if(0!==e.type)return[3,5];t=void 0,r=e.url,A.label=1;case 1:return A.trys.push([1,3,,4]),[4,d.context.cache.match(r)];case 2:return t=A.sent(),[3,4];case 3:return A.sent(),d.context.logger.error("Error loading background-image "+r),[3,4];case 4:return t&&(B=Cs(f,h,[t.width,t.height,t.width/t.height]),o=B[0],g=B[1],w=B[2],c=B[3],a=B[4],s=d.ctx.createPattern(d.resizeImage(t,c,a),"repeat"),d.renderRepeat(o,s,g,w)),[3,6];case 5:1===e.type?(F=Cs(f,h,[null,null,null]),o=F[0],g=F[1],w=F[2],c=F[3],a=F[4],C=Ee(e.angle,c,a),l=C[0],B=C[1],i=C[2],u=C[3],Q=C[4],(F=document.createElement("canvas")).width=c,F.height=a,C=F.getContext("2d"),n=C.createLinearGradient(B,u,i,Q),pe(e.stops,l).forEach(function(A){return n.addColorStop(A.stop,ie(A.color))}),C.fillStyle=n,C.fillRect(0,0,c,a),0<c&&0<a&&(s=d.ctx.createPattern(F,"repeat"),d.renderRepeat(o,s,g,w))):2===e.type&&(u=Cs(f,h,[null,null,null]),o=u[0],i=u[1],Q=u[2],c=u[3],a=u[4],l=0===e.position.length?[ge]:e.position,g=Ue(l[0],c),w=Ue(l[l.length-1],a),C=function(A,e,t,r,B){var n,s,o,i,Q=0,c=0;switch(A.size){case 0:0===A.shape?Q=c=Math.min(Math.abs(e),Math.abs(e-r),Math.abs(t),Math.abs(t-B)):1===A.shape&&(Q=Math.min(Math.abs(e),Math.abs(e-r)),c=Math.min(Math.abs(t),Math.abs(t-B)));break;case 2:0===A.shape?Q=c=Math.min(Ie(e,t),Ie(e,t-B),Ie(e-r,t),Ie(e-r,
t-B)):1===A.shape&&(n=Math.min(Math.abs(t),Math.abs(t-B))/Math.min(Math.abs(e),Math.abs(e-r)),o=(s=ye(r,B,e,t,!0))[0],i=s[1],c=n*(Q=Ie(o-e,(i-t)/n)));break;case 1:0===A.shape?Q=c=Math.max(Math.abs(e),Math.abs(e-r),Math.abs(t),Math.abs(t-B)):1===A.shape&&(Q=Math.max(Math.abs(e),Math.abs(e-r)),c=Math.max(Math.abs(t),Math.abs(t-B)));break;case 3:0===A.shape?Q=c=Math.max(Ie(e,t),Ie(e,t-B),Ie(e-r,t),Ie(e-r,t-B)):1===A.shape&&(n=Math.max(Math.abs(t),Math.abs(t-B))/Math.max(Math.abs(e),Math.abs(e-r)),o=(s=ye(r,B,e,t,!1))[0],i=s[1],c=n*(Q=Ie(o-e,(i-t)/n)))}return Array.isArray(A.size)&&(Q=Ue(A.size[0],r),c=2===A.size.length?Ue(A.size[1],B):Q),[Q,c]}(e,g,w,c,a),F=C[0],u=C[1],0<F&&0<u&&(U=d.ctx.createRadialGradient(i+g,Q+w,0,i+g,Q+w,F),pe(e.stops,2*F).forEach(function(A){return U.addColorStop(A.stop,ie(A.color))}),d.path(o),d.ctx.fillStyle=U,F!==u?(l=f.bounds.left+.5*f.bounds.width,C=f.bounds.top+.5*f.bounds.height,F=1/(u=u/F),d.ctx.save(),d.ctx.translate(l,C),d.ctx.transform(1,0,0,u,0,0),d.ctx.translate(-l,-C),d.ctx.fillRect(i,F*(Q-C)+C,c,a*F),d.ctx.restore()):d.ctx.fill())),A.label=6;case 6:return h--,[2]}})},d=this,t=0,r=f.styles.backgroundImage.slice(0).reverse(),A.label=1;case 1:return t<r.length?(B=r[t],[5,e(B)]):[3,4];case 2:A.sent(),A.label=3;case 3:return t++,[3,1];case 4:return[2]}})})},Ds.prototype.renderSolidBorder=function(e,t,r){return a(this,void 0,void 0,function(){return H(this,
function(A){return this.path(ws(r,t)),this.ctx.fillStyle=ie(e),this.ctx.fill(),[2]})})},Ds.prototype.renderDoubleBorder=function(t,r,B,n){return a(this,void 0,void 0,function(){var e;return H(this,function(A){switch(A.label){case 0:return r<3?[4,this.renderSolidBorder(t,B,n)]:[3,2];case 1:return A.sent(),[2];case 2:return e=function(A,e){switch(e){case 0:return Hs(A.topLeftBorderBox,A.topLeftBorderDoubleOuterBox,A.topRightBorderBox,A.topRightBorderDoubleOuterBox);case 1:return Hs(A.topRightBorderBox,A.topRightBorderDoubleOuterBox,A.bottomRightBorderBox,A.bottomRightBorderDoubleOuterBox);case 2:return Hs(A.bottomRightBorderBox,A.bottomRightBorderDoubleOuterBox,A.bottomLeftBorderBox,A.bottomLeftBorderDoubleOuterBox);default:return Hs(A.bottomLeftBorderBox,A.bottomLeftBorderDoubleOuterBox,A.topLeftBorderBox,A.topLeftBorderDoubleOuterBox)}}(n,B),this.path(e),this.ctx.fillStyle=ie(t),this.ctx.fill(),e=function(A,e){switch(e){case 0:return Hs(A.topLeftBorderDoubleInnerBox,A.topLeftPaddingBox,A.topRightBorderDoubleInnerBox,A.topRightPaddingBox);case 1:return Hs(A.topRightBorderDoubleInnerBox,A.topRightPaddingBox,A.bottomRightBorderDoubleInnerBox,A.bottomRightPaddingBox);case 2:return Hs(A.bottomRightBorderDoubleInnerBox,A.bottomRightPaddingBox,A.bottomLeftBorderDoubleInnerBox,A.bottomLeftPaddingBox);default:return Hs(A.bottomLeftBorderDoubleInnerBox,A.bottomLeftPaddingBox,A.topLeftBorderDoubleInnerBox,
A.topLeftPaddingBox)}}(n,B),this.path(e),this.ctx.fill(),[2]}})})},Ds.prototype.renderNodeBackgroundAndBorders=function(c){return a(this,void 0,void 0,function(){var e,t,r,B,n,s,o,i,Q=this;return H(this,function(A){switch(A.label){case 0:return(this.applyEffects(c.getEffects(2)),e=c.container.styles,t=!oe(e.backgroundColor)||e.backgroundImage.length,r=[{style:e.borderTopStyle,color:e.borderTopColor,width:e.borderTopWidth},{style:e.borderRightStyle,color:e.borderRightColor,width:e.borderRightWidth},{style:e.borderBottomStyle,color:e.borderBottomColor,width:e.borderBottomWidth},{style:e.borderLeftStyle,color:e.borderLeftColor,width:e.borderLeftWidth}],B=Ms(Es(e.backgroundClip,0),c.curves),t||e.boxShadow.length)?(this.ctx.save(),this.path(B),this.ctx.clip(),oe(e.backgroundColor)||(this.ctx.fillStyle=ie(e.backgroundColor),this.ctx.fill()),[4,this.renderBackgroundImage(c.container)]):[3,2];case 1:A.sent(),this.ctx.restore(),e.boxShadow.slice(0).reverse().forEach(function(A){Q.ctx.save();var t,r,B,n,e=ts(c.curves),s=A.inset?0:1e4,o=(t=-s+(A.inset?1:-1)*A.spread.number,r=(A.inset?1:-1)*A.spread.number,B=A.spread.number*(A.inset?-2:2),n=A.spread.number*(A.inset?-2:2),e.map(function(A,e){switch(e){case 0:return A.add(t,r);case 1:return A.add(t+B,r);case 2:return A.add(t+B,r+n);case 3:return A.add(t,r+n)}return A}));A.inset?(Q.path(e),Q.ctx.clip(),Q.mask(o)):(Q.mask(e),Q.ctx.clip(),Q.path(o)),
Q.ctx.shadowOffsetX=A.offsetX.number+s,Q.ctx.shadowOffsetY=A.offsetY.number,Q.ctx.shadowColor=ie(A.color),Q.ctx.shadowBlur=A.blur.number,Q.ctx.fillStyle=A.inset?ie(A.color):"rgba(0,0,0,1)",Q.ctx.fill(),Q.ctx.restore()}),A.label=2;case 2:s=n=0,o=r,A.label=3;case 3:return s<o.length?0!==(i=o[s]).style&&!oe(i.color)&&0<i.width?2!==i.style?[3,5]:[4,this.renderDashedDottedBorder(i.color,i.width,n,c.curves,2)]:[3,11]:[3,13];case 4:return A.sent(),[3,11];case 5:return 3!==i.style?[3,7]:[4,this.renderDashedDottedBorder(i.color,i.width,n,c.curves,3)];case 6:return A.sent(),[3,11];case 7:return 4!==i.style?[3,9]:[4,this.renderDoubleBorder(i.color,i.width,n,c.curves)];case 8:return A.sent(),[3,11];case 9:return[4,this.renderSolidBorder(i.color,n,c.curves)];case 10:A.sent(),A.label=11;case 11:n++,A.label=12;case 12:return s++,[3,3];case 13:return[2]}})})},Ds.prototype.renderDashedDottedBorder=function(g,w,U,l,C){return a(this,void 0,void 0,function(){var e,t,r,B,n,s,o,i,Q,c,a;return H(this,function(A){return this.ctx.save(),Q=function(A,e){switch(e){case 0:return fs(A.topLeftBorderStroke,A.topRightBorderStroke);case 1:return fs(A.topRightBorderStroke,A.bottomRightBorderStroke);case 2:return fs(A.bottomRightBorderStroke,A.bottomLeftBorderStroke);default:return fs(A.bottomLeftBorderStroke,A.topLeftBorderStroke)}}(l,U),e=ws(l,U),2===C&&(this.path(e),this.ctx.clip()),s=$n(e[0])?(t=e[0].start.x,
e[0].start.y):(t=e[0].x,e[0].y),o=$n(e[1])?(r=e[1].end.x,e[1].end.y):(r=e[1].x,e[1].y),B=0===U||2===U?Math.abs(t-r):Math.abs(s-o),this.ctx.beginPath(),3===C?this.formatPath(Q):this.formatPath(e.slice(0,2)),n=w<3?3*w:2*w,s=w<3?2*w:w,3===C&&(s=n=w),o=!0,B<=2*n?o=!1:B<=2*n+s?(n*=i=B/(2*n+s),s*=i):(Q=Math.floor((B+s)/(n+s)),i=(B-Q*n)/(Q-1),s=(Q=(B-(Q+1)*n)/Q)<=0||Math.abs(s-i)<Math.abs(s-Q)?i:Q),o&&(3===C?this.ctx.setLineDash([0,n+s]):this.ctx.setLineDash([n,s])),3===C?(this.ctx.lineCap="round",this.ctx.lineWidth=w):this.ctx.lineWidth=2*w+1.1,this.ctx.strokeStyle=ie(g),this.ctx.stroke(),this.ctx.setLineDash([]),2===C&&($n(e[0])&&(c=e[3],a=e[0],this.ctx.beginPath(),this.formatPath([new Zn(c.end.x,c.end.y),new Zn(a.start.x,a.start.y)]),this.ctx.stroke()),$n(e[1])&&(c=e[1],a=e[2],this.ctx.beginPath(),this.formatPath([new Zn(c.end.x,c.end.y),new Zn(a.start.x,a.start.y)]),this.ctx.stroke())),this.ctx.restore(),[2]})})},Ds.prototype.render=function(B){return a(this,void 0,void 0,function(){return H(this,function(A){switch(A.label){case 0:return this.options.backgroundColor&&(this.ctx.fillStyle=ie(this.options.backgroundColor),this.ctx.fillRect(this.options.x,this.options.y,this.options.width,this.options.height)),t=new as(e=B,null),r=new cs(t),hs(t,r,r,e=[]),ds(t.container,e),[4,this.renderStack(r)];case 1:return A.sent(),this.applyEffects([]),[2,this.canvas]}var e,t,r})})},Ds);function Ds(A,
e){A=Ls.call(this,A,e)||this;return A._activeEffects=[],A.canvas=e.canvas||document.createElement("canvas"),A.ctx=A.canvas.getContext("2d"),e.canvas||(A.canvas.width=Math.floor(e.width*e.scale),A.canvas.height=Math.floor(e.height*e.scale),A.canvas.style.width=e.width+"px",A.canvas.style.height=e.height+"px"),A.fontMetrics=new Ks(document),A.ctx.scale(A.options.scale,A.options.scale),A.ctx.translate(-e.x,-e.y),A.ctx.textBaseline="bottom",A._activeEffects=[],A.context.logger.debug("Canvas renderer initialized ("+e.width+"x"+e.height+") with scale "+e.scale),A}var vs,xs=function(A){return A instanceof LB||(A instanceof yB||A instanceof pB&&A.type!==dB&&A.type!==hB)},Ms=function(A,e){switch(A){case 0:return ts(e);case 2:return[e.topLeftContentBox,e.topRightContentBox,e.bottomRightContentBox,e.bottomLeftContentBox];default:return rs(e)}},Ss=function(A){switch(A){case 1:return"center";case 2:return"right";default:return"left"}},Ts=["-apple-system","system-ui"],Gs=function(A){return/iPhone OS 15_(0|1)/.test(window.navigator.userAgent)?A.filter(function(A){return-1===Ts.indexOf(A)}):A},Os=(A(Vs,vs=he),Vs.prototype.render=function(t){return a(this,void 0,void 0,function(){var e;return H(this,function(A){switch(A.label){case 0:return e=Nr(this.options.width*this.options.scale,this.options.height*this.options.scale,this.options.scale,this.options.scale,t),[4,ks(e)];case 1:return e=A.sent(),
this.options.backgroundColor&&(this.ctx.fillStyle=ie(this.options.backgroundColor),this.ctx.fillRect(0,0,this.options.width*this.options.scale,this.options.height*this.options.scale)),this.ctx.drawImage(e,-this.options.x*this.options.scale,-this.options.y*this.options.scale),[2,this.canvas]}})})},Vs);function Vs(A,e){A=vs.call(this,A,e)||this;return A.canvas=e.canvas||document.createElement("canvas"),A.ctx=A.canvas.getContext("2d"),A.options=e,A.canvas.width=Math.floor(e.width*e.scale),A.canvas.height=Math.floor(e.height*e.scale),A.canvas.style.width=e.width+"px",A.canvas.style.height=e.height+"px",A.ctx.scale(A.options.scale,A.options.scale),A.ctx.translate(-e.x,-e.y),A.context.logger.debug("EXPERIMENTAL ForeignObject renderer initialized ("+e.width+"x"+e.height+" at "+e.x+","+e.y+") with scale "+e.scale),A}var ks=function(r){return new Promise(function(A,e){var t=new Image;t.onload=function(){A(t)},t.onerror=e,t.src="data:image/svg+xml;charset=utf-8,"+encodeURIComponent((new XMLSerializer).serializeToString(r))})},Rs=(Ns.prototype.debug=function(){for(var A=[],e=0;e<arguments.length;e++)A[e]=arguments[e];this.enabled&&("undefined"!=typeof window&&window.console&&"function"==typeof console.debug?console.debug.apply(console,t([this.id,this.getTime()+"ms"],A)):this.info.apply(this,A))},Ns.prototype.getTime=function(){return Date.now()-this.start},Ns.prototype.info=function(){for(var A=[],
e=0;e<arguments.length;e++)A[e]=arguments[e];this.enabled&&"undefined"!=typeof window&&window.console&&"function"==typeof console.info&&console.info.apply(console,t([this.id,this.getTime()+"ms"],A))},Ns.prototype.warn=function(){for(var A=[],e=0;e<arguments.length;e++)A[e]=arguments[e];this.enabled&&("undefined"!=typeof window&&window.console&&"function"==typeof console.warn?console.warn.apply(console,t([this.id,this.getTime()+"ms"],A)):this.info.apply(this,A))},Ns.prototype.error=function(){for(var A=[],e=0;e<arguments.length;e++)A[e]=arguments[e];this.enabled&&("undefined"!=typeof window&&window.console&&"function"==typeof console.error?console.error.apply(console,t([this.id,this.getTime()+"ms"],A)):this.info.apply(this,A))},Ns.instances={},Ns);function Ns(A){var e=A.id,A=A.enabled;this.id=e,this.enabled=A,this.start=Date.now()}var Ps=(Xs.instanceCount=1,Xs);function Xs(A,e){this.windowBounds=e,this.instanceName="#"+Xs.instanceCount++,this.logger=new Rs({id:this.instanceName,enabled:A.logging}),this.cache=null!==(e=A.cache)&&void 0!==e?e:new On(this,A)}"undefined"!=typeof window&&Tn.setContext(window);var Js=function(u,F){return a(void 0,void 0,void 0,function(){var e,t,r,B,n,s,o,i,Q,c,a,g,w,U,l,C;return H(this,function(A){switch(A.label){case 0:if(!u||"object"!=typeof u)return[2,Promise.reject("Invalid element provided as first argument")];if(!(e=u.ownerDocument))throw new Error("Element is not attached to a Document");
if(!(t=e.defaultView))throw new Error("Document is not attached to a Window");return w={allowTaint:null!==(U=F.allowTaint)&&void 0!==U&&U,imageTimeout:null!==(c=F.imageTimeout)&&void 0!==c?c:15e3,proxy:F.proxy,useCORS:null!==(a=F.useCORS)&&void 0!==a&&a},U=h({logging:null===(g=F.logging)||void 0===g||g,cache:F.cache},w),c={windowWidth:null!==(c=F.windowWidth)&&void 0!==c?c:t.innerWidth,windowHeight:null!==(a=F.windowHeight)&&void 0!==a?a:t.innerHeight,scrollX:null!==(g=F.scrollX)&&void 0!==g?g:t.pageXOffset,scrollY:null!==(w=F.scrollY)&&void 0!==w?w:t.pageYOffset},a=new d(c.scrollX,c.scrollY,c.windowWidth,c.windowHeight),g=new Ps(U,a),c=null!==(w=F.foreignObjectRendering)&&void 0!==w&&w,w={allowTaint:null!==(U=F.allowTaint)&&void 0!==U&&U,onclone:F.onclone,ignoreElements:F.ignoreElements,inlineImages:c,copyStyles:c},g.logger.debug("Starting document clone with size "+a.width+"x"+a.height+" scrolled to "+-a.left+","+-a.top),U=new dn(g,u,w),(w=U.clonedReferenceElement)?[4,U.toIFrame(e,a)]:[2,Promise.reject("Unable to find element in cloned iframe")];case 1:return(r=A.sent(),l=jB(w)||"HTML"===w.tagName?function(A){var e=A.body,t=A.documentElement;if(!e||!t)throw new Error("Unable to get document size");A=Math.max(Math.max(e.scrollWidth,t.scrollWidth),Math.max(e.offsetWidth,t.offsetWidth),Math.max(e.clientWidth,t.clientWidth)),t=Math.max(Math.max(e.scrollHeight,t.scrollHeight),Math.max(e.offsetHeight,
t.offsetHeight),Math.max(e.clientHeight,t.clientHeight));return new d(0,0,A,t)}(w.ownerDocument):f(g,w),B=l.width,n=l.height,s=l.left,o=l.top,i=Ys(g,w,F.backgroundColor),l={canvas:F.canvas,backgroundColor:i,scale:null!==(l=null!==(l=F.scale)&&void 0!==l?l:t.devicePixelRatio)&&void 0!==l?l:1,x:(null!==(l=F.x)&&void 0!==l?l:0)+s,y:(null!==(l=F.y)&&void 0!==l?l:0)+o,width:null!==(l=F.width)&&void 0!==l?l:Math.ceil(B),height:null!==(l=F.height)&&void 0!==l?l:Math.ceil(n)},c)?(g.logger.debug("Document cloned, using foreign object rendering"),[4,new Os(g,l).render(w)]):[3,3];case 2:return Q=A.sent(),[3,5];case 3:return g.logger.debug("Document cloned, element located at "+s+","+o+" with size "+B+"x"+n+" using computed rendering"),g.logger.debug("Starting DOM parsing"),C=kB(g,w),i===C.styles.backgroundColor&&(C.styles.backgroundColor=Le.TRANSPARENT),g.logger.debug("Starting renderer for element at "+l.x+","+l.y+" with size "+l.width+"x"+l.height),[4,new bs(g,l).render(C)];case 4:Q=A.sent(),A.label=5;case 5:return null!==(C=F.removeContainer)&&void 0!==C&&!C||dn.destroy(r)||g.logger.error("Cannot detach cloned iframe as it is not in the DOM anymore"),g.logger.debug("Finished rendering"),[2,Q]}})})},Ys=function(A,e,t){var r=e.ownerDocument,B=r.documentElement?fe(A,getComputedStyle(r.documentElement).backgroundColor):Le.TRANSPARENT,n=r.body?fe(A,getComputedStyle(r.body).backgroundColor):Le.TRANSPARENT,
t="string"==typeof t?fe(A,t):null===t?Le.TRANSPARENT:4294967295;return e===r.documentElement?oe(B)?oe(n)?t:n:B:t};return function(A,e){return Js(A,e=void 0===e?{}:e)}});

function createExporters(options) {
  const circledDigits = ['⓪', '①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩', '⑪', '⑫'];

  function formatBullet(number) {
    return circledDigits[number] || `${number}.`;
  }

  function buildMarkdown(context) {
    const {
      language,
      i18n,
      annotations,
      businessNote = context.globalNote
    } = context;
    const lines = [];

    lines.push(`${i18n.t(language, 'pageTitle')}：${document.title}`);
    lines.push(`${i18n.t(language, 'pageUrl')}：${window.location.href}`);
    lines.push(i18n.t(language, 'viewportMode'));
    lines.push('');
    lines.push(`${i18n.t(language, 'changeDetails')}：`);
    lines.push('');

    annotations.forEach((annotation) => {
      lines.push(`${formatBullet(annotation.number)}：`);
      lines.push(annotation.note ? annotation.note.trim() : '-');
      lines.push('');
    });

    lines.push(`${i18n.t(language, 'businessNote')}：`);
    lines.push(businessNote ? businessNote.trim() : '-');
    lines.push('');
    lines.push(`${i18n.t(language, 'extraInfo')}：`);
    lines.push(`- ${i18n.t(language, 'viewportInfo')}：${window.innerWidth} x ${window.innerHeight}`);
    lines.push(`- ${i18n.t(language, 'countInfo')}：${annotations.length}`);

    return lines.join('\n');
  }

  async function copyNotes(context) {
    const markdown = buildMarkdown(context);
    await copyTextWithFallback(markdown);
    return markdown;
  }

  async function copyTextWithFallback(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', 'readonly');
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      textarea.style.top = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();

      const copied = document.execCommand('copy');
      textarea.remove();

      if (!copied) {
        throw error;
      }

      return true;
    }
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function canvasToPngBlob(canvas) {
    return new Promise((resolve) => {
      canvas.toBlob(resolve, 'image/png');
    });
  }

  async function tryCopyBlob(blob) {
    if (!window.ClipboardItem || !navigator.clipboard || !navigator.clipboard.write) {
      return false;
    }

    if (!blob) {
      return false;
    }

    await navigator.clipboard.write([
      new ClipboardItem({
        'image/png': blob
      })
    ]);

    return true;
  }

  async function exportViewportImage(context) {
    if (typeof html2canvas !== 'function') {
      throw new Error('html2canvas is not available');
    }

    await options.beforeCapture();
    await sleep(60);

    try {
      const canvas = await html2canvas(document.documentElement, {
        backgroundColor: null,
        logging: false,
        useCORS: true,
        scale: Math.min(window.devicePixelRatio || 1, 2),
        width: window.innerWidth,
        height: window.innerHeight,
        x: window.scrollX,
        y: window.scrollY,
        scrollX: window.scrollX,
        scrollY: window.scrollY,
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight
      });

      const blob = await canvasToPngBlob(canvas);
      if (!blob) {
        throw new Error('Failed to create PNG blob');
      }

      let copied = false;
      if (context.preferClipboard) {
        try {
          copied = await tryCopyBlob(blob);
        } catch (error) {
          copied = false;
        }
      }

      let downloaded = false;
      if (!copied) {
        downloadBlob(blob, `pinfix-${Date.now()}.png`);
        downloaded = true;
      }

      return { copied, downloaded, canvas, blob };
    } finally {
      await options.afterCapture();
    }
  }

  return {
    buildMarkdown,
    copyNotes,
    downloadBlob,
    exportViewportImage
  };
}

function getPinFixStyles() {
  return `
#pinfix-root {
  position: absolute;
  left: 0;
  top: 0;
  width: 1px;
  height: 1px;
  z-index: ${PINFIX_Z_INDEX};
  pointer-events: none;
  font-family: "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  color: #102a2a;
}

#pinfix-root * {
  box-sizing: border-box;
}

.pinfix-chrome {
  position: fixed;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 40;
  pointer-events: auto;
}

.pinfix-overlay-layer {
  position: absolute;
  inset: 0;
  z-index: 10;
  pointer-events: none;
}

.pinfix-note-layer {
  position: absolute;
  inset: 0;
  z-index: 20;
  pointer-events: none;
}

.pinfix-tool-button {
  border: 1px solid rgba(15, 118, 110, 0.18);
  background: rgba(255, 255, 255, 0.92);
  color: #0f766e;
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.16);
  backdrop-filter: blur(14px);
}

.pinfix-launcher {
  width: 36px;
  height: 36px;
  border: 0;
  background: transparent;
  box-shadow: none;
  border-radius: 999px;
  display: grid;
  place-items: center;
  cursor: pointer;
  position: relative;
  transition: transform 160ms ease;
}

.pinfix-launcher::before {
  content: "";
  position: absolute;
  left: 50%;
  top: 50%;
  width: 28px;
  height: 28px;
  transform: translate(-50%, -50%);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid rgba(15, 118, 110, 0.16);
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.14);
  backdrop-filter: blur(14px);
}

.pinfix-launcher::after {
  content: "";
  position: absolute;
  left: 50%;
  top: 50%;
  width: 12px;
  height: 12px;
  transform: translate(-50%, -50%);
  border-radius: 999px;
  background: #0f766e;
}

.pinfix-toolbar {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 8px 8px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(15, 118, 110, 0.18);
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.16);
  backdrop-filter: blur(14px);
}

.pinfix-tool-button {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  cursor: pointer;
  font-size: 18px;
  transition: transform 160ms ease, background 160ms ease, color 160ms ease;
}

.pinfix-toolbar-close {
  position: absolute;
  right: -7px;
  top: -7px;
  width: 22px;
  height: 22px;
  padding: 0;
  border: 1px solid rgba(15, 118, 110, 0.2);
  border-radius: 999px;
  background: #ffffff;
  color: #0f766e;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.18);
  cursor: pointer;
  display: grid;
  place-items: center;
  opacity: 0;
  visibility: hidden;
  transform: scale(0.92);
  transition: opacity 140ms ease, transform 140ms ease, visibility 140ms ease;
  z-index: 2;
}

.pinfix-icon {
  width: 19px;
  height: 19px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.pinfix-icon circle {
  fill: currentColor;
  stroke: none;
}

.pinfix-toolbar-close .pinfix-icon {
  width: 12px;
  height: 12px;
}

.pinfix-toolbar:hover .pinfix-toolbar-close,
.pinfix-toolbar:focus-within .pinfix-toolbar-close {
  opacity: 1;
  visibility: visible;
  transform: scale(1);
}

.pinfix-launcher:hover {
  transform: translateY(-1px);
}

.pinfix-launcher:hover::before {
  background: rgba(222, 247, 244, 0.96);
}

.pinfix-tool-button:hover {
  transform: translateY(-1px);
  background: rgba(222, 247, 244, 0.96);
}

.pinfix-tool-button.is-active {
  background: #0f766e;
  color: #ffffff;
}

.pinfix-popover {
  position: fixed;
  width: 248px;
  max-width: calc(100vw - 24px);
  box-sizing: border-box;
  z-index: 50;
  max-height: calc(100vh - 24px);
  overflow: auto;
  border-radius: 16px;
  border: 1px solid rgba(15, 118, 110, 0.18);
  background: rgba(255, 255, 255, 0.96);
  color: #102a2a;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.18);
  backdrop-filter: blur(14px);
  padding: 14px;
  pointer-events: auto;
}

.pinfix-popover[data-panel="more"] {
  width: 320px;
}

.pinfix-sidecar {
  position: fixed;
  z-index: 55;
  width: min(300px, calc(100vw - 24px));
  max-height: calc(100vh - 24px);
  overflow: auto;
  box-sizing: border-box;
  border: 1px solid rgba(15, 118, 110, 0.18);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.97);
  color: #102a2a;
  box-shadow: 0 18px 42px rgba(15, 23, 42, 0.2);
  backdrop-filter: blur(14px);
  padding: 12px;
  pointer-events: auto;
}

.pinfix-sidecar-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
  color: #0f3f3b;
  font-size: 13px;
  font-weight: 800;
}

.pinfix-popover h3 {
  margin: 0 0 10px;
  font-size: 14px;
}

.pinfix-section {
  margin-top: 10px;
}

.pinfix-section-title {
  font-size: 12px;
  color: #64748b;
  margin-bottom: 8px;
}

.pinfix-section-toggle {
  width: 100%;
  min-height: 34px;
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 10px;
  background: rgba(248, 250, 252, 0.92);
  color: #334155;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px;
  font-size: 12px;
  cursor: pointer;
}

.pinfix-chip-row,
.pinfix-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.pinfix-chip,
.pinfix-list button {
  min-height: 34px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 10px;
  background: #ffffff;
  color: #102a2a;
  padding: 8px 10px;
  cursor: pointer;
  font-size: 12px;
}

.pinfix-list button {
  flex: 1 1 calc(50% - 4px);
}

.pinfix-list-stack button {
  flex-basis: 100%;
  text-align: left;
}

.pinfix-annotation-sidecar-trigger {
  width: 100%;
  min-height: 38px;
  border: 1px solid rgba(15, 118, 110, 0.24);
  border-radius: 12px;
  background: rgba(240, 253, 250, 0.9);
  color: #0f766e;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 9px 11px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.pinfix-sidecar-list {
  display: grid;
  gap: 8px;
}

.pinfix-sidecar-item {
  width: 100%;
  border: 1px solid rgba(148, 163, 184, 0.28);
  border-radius: 12px;
  background: rgba(248, 250, 252, 0.94);
  color: #102a2a;
  display: grid;
  grid-template-columns: 30px 1fr;
  gap: 10px;
  padding: 9px;
  text-align: left;
  cursor: pointer;
}

.pinfix-sidecar-item.is-missing {
  border-color: rgba(225, 29, 46, 0.22);
  background: rgba(255, 241, 242, 0.72);
}

.pinfix-sidecar-number {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  background: #e11d2e;
  color: #ffffff;
  display: grid;
  place-items: center;
  font-size: 13px;
  font-weight: 800;
}

.pinfix-sidecar-body {
  min-width: 0;
  display: grid;
  gap: 3px;
}

.pinfix-sidecar-body strong {
  color: #102a2a;
  font-size: 12px;
  line-height: 1.35;
  word-break: break-word;
}

.pinfix-sidecar-body small,
.pinfix-sidecar-empty {
  color: #64748b;
  font-size: 11px;
  line-height: 1.35;
}

.pinfix-list button.pinfix-danger-action {
  flex-basis: 100%;
  border-color: rgba(225, 29, 46, 0.28);
  background: rgba(225, 29, 46, 0.07);
  color: #b91c1c;
  font-weight: 700;
}

.pinfix-list button.pinfix-danger-action:hover {
  border-color: rgba(225, 29, 46, 0.42);
  background: rgba(225, 29, 46, 0.11);
}

.pinfix-danger-hint {
  margin-top: 8px;
  padding: 8px 10px;
  border: 1px solid rgba(225, 29, 46, 0.18);
  border-radius: 10px;
  color: #9f1239;
  background: rgba(255, 241, 242, 0.72);
}

.pinfix-chip.is-active,
.pinfix-list button.is-active {
  background: rgba(15, 118, 110, 0.12);
  border-color: rgba(15, 118, 110, 0.45);
  color: #0f766e;
}

.pinfix-color-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  display: inline-block;
  border: 2px solid rgba(255, 255, 255, 0.85);
  box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.18);
}

.pinfix-candidate {
  position: absolute;
  border: 2px dashed rgba(15, 118, 110, 0.95);
  border-radius: 12px;
  background: rgba(15, 118, 110, 0.08);
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.55) inset;
  pointer-events: none;
}

.pinfix-candidate-tools {
  position: absolute;
  left: 0;
  top: 0;
  display: flex;
  gap: 3px;
  pointer-events: auto;
  z-index: 8;
  padding: 2px;
  border-radius: 999px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  background: rgba(248, 250, 252, 0.88);
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.14);
  backdrop-filter: blur(10px);
}

.pinfix-annotation-box {
  position: absolute;
  z-index: 2;
  border-radius: 14px;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.55) inset;
  pointer-events: none;
}

.pinfix-annotation-box.is-interactive {
  cursor: pointer;
  pointer-events: auto;
}

.pinfix-annotation-box.is-active {
  box-shadow: 0 0 0 2px rgba(15, 118, 110, 0.62), 0 0 22px rgba(15, 118, 110, 0.28);
}

.pinfix-annotation-box.is-focused {
  box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.9), 0 0 22px rgba(245, 158, 11, 0.38);
}

.pinfix-label {
  position: absolute;
  z-index: 5;
  display: grid;
  place-items: center;
  font-weight: 700;
  color: #ffffff;
  box-shadow: 0 10px 22px rgba(15, 23, 42, 0.24);
  text-shadow: 0 1px 2px rgba(15, 23, 42, 0.25);
  pointer-events: none;
  transition: transform 140ms ease, box-shadow 140ms ease;
}

.pinfix-label.is-interactive {
  cursor: pointer;
  pointer-events: auto;
}

.pinfix-label.is-focused,
.pinfix-label.is-active {
  transform: scale(1.08);
}

.pinfix-label.is-inside {
  border-width: 2px !important;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.52) inset;
  text-shadow: 0 1px 2px rgba(15, 23, 42, 0.32);
}

.pinfix-label.has-missing-note::after {
  content: "";
  position: absolute;
  right: -1px;
  top: -1px;
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: #ef233c;
  border: 2px solid #ffffff;
  box-shadow: 0 2px 7px rgba(15, 23, 42, 0.24);
}

.pinfix-mask {
  position: absolute;
  z-index: 2;
  border-radius: 12px;
  background:
    repeating-linear-gradient(
      -45deg,
      rgba(255, 255, 255, 0.06) 0 8px,
      rgba(255, 255, 255, 0.12) 8px 16px
    ),
    rgba(15, 23, 42, 0.94);
  border: 2px solid rgba(255, 255, 255, 0.4);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.24);
  pointer-events: none;
}

.pinfix-inline-tools {
  position: absolute;
  z-index: 6;
  display: flex;
  gap: 3px;
  pointer-events: auto;
  padding: 2px;
  border-radius: 999px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  background: rgba(248, 250, 252, 0.88);
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.14);
  backdrop-filter: blur(10px);
}

.pinfix-candidate-tools button,
.pinfix-inline-tools button {
  width: 22px;
  height: 22px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: rgba(30, 41, 59, 0.82);
  color: #ffffff;
  box-shadow: 0 4px 10px rgba(15, 23, 42, 0.16);
  cursor: pointer;
  display: grid;
  place-items: center;
  font-size: 11px;
  line-height: 1;
  transition: transform 120ms ease, background 120ms ease, box-shadow 120ms ease;
}

.pinfix-candidate-tools button {
  background: rgba(30, 41, 59, 0.84);
}

.pinfix-annotation-tools {
  z-index: 7;
  opacity: 0;
  visibility: hidden;
  transform: scale(0.96);
  transition: opacity 140ms ease, transform 140ms ease, visibility 140ms ease;
}

.pinfix-annotation-box:hover + .pinfix-annotation-tools,
.pinfix-annotation-tools:hover,
.pinfix-annotation-tools.is-active {
  opacity: 1;
  visibility: visible;
  transform: scale(1);
}

.pinfix-candidate-tools .pinfix-icon,
.pinfix-inline-tools .pinfix-icon {
  width: 12px;
  height: 12px;
}

.pinfix-candidate-tools button:hover,
.pinfix-inline-tools button:hover {
  background: #0f766e;
  box-shadow: 0 6px 12px rgba(15, 118, 110, 0.22);
  transform: translateY(-0.5px);
}

.pinfix-candidate-tools button:active,
.pinfix-inline-tools button:active {
  transform: translateY(0) scale(0.97);
}

.pinfix-inline-tools button[data-action="delete-annotation"],
.pinfix-inline-tools button[data-action="delete-mask"] {
  background: rgba(71, 85, 105, 0.82);
}

.pinfix-mask-tools button {
  background: rgba(255, 255, 255, 0.18);
}

.pinfix-mask-label {
  position: absolute;
  left: 10px;
  top: 8px;
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
  color: #f8fafc;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.pinfix-note-card,
.pinfix-global-panel,
.pinfix-global-strip,
.pinfix-countdown,
.pinfix-toast {
  position: fixed;
  pointer-events: auto;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.16);
  backdrop-filter: blur(14px);
}

.pinfix-tooltip {
  position: fixed;
  z-index: 80;
  max-width: min(220px, calc(100vw - 24px));
  padding: 7px 9px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.92);
  color: #ffffff;
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.22);
  pointer-events: none;
  white-space: nowrap;
}

.pinfix-note-card {
  position: absolute;
  z-index: 25;
  width: min(320px, calc(100vw - 24px));
  min-height: 104px;
  border-radius: 16px;
  padding: 9px;
  border-top-width: 2px;
}

.pinfix-note-card.is-focused {
  box-shadow: 0 0 0 1px rgba(15, 118, 110, 0.22), 0 14px 30px rgba(15, 23, 42, 0.14);
}

.pinfix-note-card.is-dark,
.pinfix-global-panel.is-dark,
.pinfix-global-strip.is-dark,
.pinfix-countdown.is-dark,
.pinfix-toast.is-dark {
  background: rgba(15, 23, 42, 0.88);
  color: #f8fafc;
  border-color: rgba(148, 163, 184, 0.28);
}

.pinfix-note-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 7px;
  margin-bottom: 6px;
}

.pinfix-note-badge {
  min-width: 24px;
  height: 24px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  color: #ffffff;
  font-size: 12px;
  font-weight: 700;
}

.pinfix-note-title {
  flex: 1;
  min-width: 0;
  font-size: 12.5px;
  font-weight: 800;
  letter-spacing: 0.01em;
  color: inherit;
  opacity: 0.74;
}

.pinfix-note-delete {
  border: 0;
  background: transparent;
  color: inherit;
  font-size: 16px;
  cursor: pointer;
  width: 24px;
  height: 24px;
  padding: 0;
  display: grid;
  place-items: center;
  line-height: 1;
  border-radius: 999px;
  opacity: 0.82;
  transition: background 140ms ease, opacity 140ms ease, transform 140ms ease;
}

.pinfix-note-delete:hover {
  background: rgba(15, 23, 42, 0.08);
  opacity: 1;
}

.pinfix-note-card.is-dark .pinfix-note-delete:hover {
  background: rgba(255, 255, 255, 0.12);
}

.pinfix-note-delete:active {
  transform: scale(0.94);
}

.pinfix-note-input,
.pinfix-global-input,
.pinfix-global-template-title {
  width: 100%;
  border: 0;
  outline: none;
  background: transparent;
  color: inherit;
  font-size: 14px;
  line-height: 1.45;
}

.pinfix-note-input,
.pinfix-global-input {
  resize: none;
}

.pinfix-note-input {
  min-height: 68px;
  max-height: 190px;
}

.pinfix-note-summary {
  display: block;
  width: 100%;
  border: 0;
  background: transparent;
  padding: 2px 0 4px;
  text-align: left;
  font-size: 13px;
  line-height: 1.4;
  color: inherit;
  opacity: 0.88;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: text;
}

.pinfix-global-strip {
  z-index: 45;
  left: 50%;
  bottom: 12px;
  transform: translateX(-50%);
  min-width: 180px;
  max-width: calc(100vw - 32px);
  border-radius: 14px;
  padding: 10px 14px;
  cursor: pointer;
}

.pinfix-global-panel {
  z-index: 45;
  left: 50%;
  bottom: 12px;
  transform: translateX(-50%);
  width: min(760px, calc(100vw - 32px));
  max-height: calc(100vh - 32px);
  border-radius: 18px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow: hidden;
}

.pinfix-global-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.pinfix-global-template-bar {
  display: flex;
  align-items: center;
  gap: 10px;
}

.pinfix-global-template-scroll {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  min-width: 0;
}

.pinfix-global-template-chip,
.pinfix-global-template-add,
.pinfix-global-template-option,
.pinfix-global-template-danger {
  border: 1px solid rgba(148, 163, 184, 0.28);
  background: rgba(248, 250, 252, 0.92);
  color: inherit;
}

.pinfix-global-template-chip,
.pinfix-global-template-add {
  flex: 0 0 auto;
  min-height: 34px;
  border-radius: 999px;
  padding: 0 12px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  transition: transform 160ms ease, background 160ms ease, border-color 160ms ease, color 160ms ease;
}

.pinfix-global-template-chip.is-active,
.pinfix-global-template-add.is-active {
  border-color: rgba(15, 118, 110, 0.38);
  background: rgba(222, 247, 244, 0.96);
  color: #0f766e;
}

.pinfix-global-content {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 2px;
}

.pinfix-global-note-body,
.pinfix-global-picker,
.pinfix-global-editor {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.pinfix-global-helper {
  font-size: 12px;
  line-height: 1.5;
  color: #64748b;
}

.pinfix-global-picker {
  margin-top: 4px;
  padding-top: 10px;
  border-top: 1px solid rgba(148, 163, 184, 0.22);
}

.pinfix-global-field-label {
  font-size: 12px;
  font-weight: 700;
  color: #64748b;
}

.pinfix-global-resize {
  width: 88px;
  height: 12px;
  margin-top: auto;
  align-self: center;
  cursor: ns-resize;
  border-radius: 999px;
  background:
    linear-gradient(90deg, rgba(15, 118, 110, 0.14), rgba(15, 118, 110, 0.32)),
    repeating-linear-gradient(
      90deg,
      rgba(15, 118, 110, 0.52) 0 8px,
      transparent 8px 14px
    );
}

.pinfix-global-input {
  min-height: 160px;
}

.pinfix-global-note-input {
  min-height: 124px;
}

.pinfix-global-template-title {
  min-height: 40px;
  border: 1px solid rgba(148, 163, 184, 0.28);
  border-radius: 12px;
  padding: 9px 12px;
  background: rgba(248, 250, 252, 0.82);
  font-size: 13px;
}

.pinfix-global-template-options {
  display: grid;
  gap: 8px;
}

.pinfix-global-template-option {
  width: 100%;
  border-radius: 12px;
  padding: 9px 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  text-align: left;
  transition: transform 160ms ease, background 160ms ease, border-color 160ms ease;
}

.pinfix-global-template-option.is-selected {
  border-color: rgba(15, 118, 110, 0.4);
  background: rgba(222, 247, 244, 0.92);
}

.pinfix-global-template-option-check {
  width: 18px;
  height: 18px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.5);
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 800;
  flex: 0 0 auto;
}

.pinfix-global-template-option.is-selected .pinfix-global-template-option-check {
  border-color: rgba(15, 118, 110, 0.46);
  background: #0f766e;
  color: #ffffff;
}

.pinfix-global-template-option-name {
  font-size: 13px;
  font-weight: 700;
}

.pinfix-global-template-option-body {
  flex: 1;
  min-width: 0;
  display: grid;
  gap: 3px;
}

.pinfix-global-template-option-preview {
  font-size: 12px;
  line-height: 1.4;
  color: #64748b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pinfix-global-template-content {
  min-height: 220px;
}

.pinfix-global-template-actions {
  display: flex;
  justify-content: flex-end;
}

.pinfix-global-template-danger {
  min-height: 34px;
  border-radius: 999px;
  padding: 0 12px;
  cursor: pointer;
  color: #b91c1c;
  transition: transform 160ms ease, background 160ms ease, border-color 160ms ease;
}

.pinfix-global-empty {
  border: 1px dashed rgba(148, 163, 184, 0.35);
  border-radius: 12px;
  padding: 14px 12px;
  font-size: 12px;
  color: #64748b;
}

.pinfix-global-panel.is-dark .pinfix-global-field-label,
.pinfix-global-panel.is-dark .pinfix-global-empty,
.pinfix-global-panel.is-dark .pinfix-global-helper,
.pinfix-global-panel.is-dark .pinfix-global-template-option-preview {
  color: rgba(226, 232, 240, 0.82);
}

.pinfix-global-panel.is-dark .pinfix-global-picker {
  border-top-color: rgba(148, 163, 184, 0.2);
}

.pinfix-global-panel.is-dark .pinfix-global-template-chip,
.pinfix-global-panel.is-dark .pinfix-global-template-add,
.pinfix-global-panel.is-dark .pinfix-global-template-option,
.pinfix-global-panel.is-dark .pinfix-global-template-title,
.pinfix-global-panel.is-dark .pinfix-global-template-danger {
  background: rgba(30, 41, 59, 0.78);
  border-color: rgba(148, 163, 184, 0.24);
  color: #f8fafc;
}

.pinfix-global-panel.is-dark .pinfix-global-template-chip.is-active,
.pinfix-global-panel.is-dark .pinfix-global-template-add.is-active,
.pinfix-global-panel.is-dark .pinfix-global-template-option.is-selected {
  background: rgba(15, 118, 110, 0.28);
  border-color: rgba(45, 212, 191, 0.42);
  color: #ccfbf1;
}

.pinfix-toast {
  z-index: 70;
  right: 16px;
  top: 16px;
  border-radius: 14px;
  padding: 12px 14px;
  max-width: min(360px, calc(100vw - 32px));
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.pinfix-toast.is-success {
  border-color: rgba(15, 118, 110, 0.26);
  background: rgba(240, 253, 250, 0.96);
  color: #0f3f3b;
}

.pinfix-toast button {
  border: 0;
  border-radius: 999px;
  background: #0f766e;
  color: #ffffff;
  padding: 7px 10px;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  white-space: nowrap;
}

.pinfix-countdown {
  z-index: 65;
  right: 16px;
  bottom: 16px;
  border-radius: 999px;
  padding: 10px 14px;
  font-size: 13px;
}

.pinfix-countdown strong {
  font-size: 18px;
  margin-left: 8px;
}

.pinfix-hidden {
  display: none !important;
}

.pinfix-hidden-for-capture .pinfix-chrome,
.pinfix-hidden-for-capture .pinfix-popover,
.pinfix-hidden-for-capture .pinfix-sidecar,
.pinfix-hidden-for-capture .pinfix-note-card,
.pinfix-hidden-for-capture .pinfix-global-strip,
.pinfix-hidden-for-capture .pinfix-global-panel,
.pinfix-hidden-for-capture .pinfix-candidate,
.pinfix-hidden-for-capture .pinfix-toast,
.pinfix-hidden-for-capture .pinfix-tooltip,
.pinfix-hidden-for-capture .pinfix-inline-tools {
  display: none !important;
}

.pinfix-note-card textarea::placeholder,
.pinfix-global-panel textarea::placeholder,
.pinfix-global-panel input::placeholder {
  color: currentColor;
  opacity: 0.48;
}

.pinfix-divider {
  height: 1px;
  background: rgba(148, 163, 184, 0.25);
  margin: 10px 0;
}

.pinfix-meta-copy {
  display: grid;
  gap: 6px;
  font-size: 12px;
  color: #64748b;
  line-height: 1.45;
}

.pinfix-status-good {
  color: #15803d;
}

.pinfix-status-warn {
  color: #b45309;
}

@media (prefers-reduced-motion: reduce) {
  .pinfix-launcher,
  .pinfix-tool-button,
  .pinfix-popover,
  .pinfix-sidecar,
  .pinfix-tooltip,
  .pinfix-note-card,
  .pinfix-global-panel,
  .pinfix-toast {
    transition: none !important;
  }
}
`;
}

function createUI(options) {
  let root = null;
  let chrome = null;
  let overlayLayer = null;
  let noteLayer = null;
  let popover = null;
  let globalStrip = null;
  let globalPanel = null;
  let toast = null;
  let countdown = null;
  let tooltip = null;
  let sidecar = null;
  let candidate = null;
  let resizeCleanup = null;
  let toolClickTimer = null;
  let lastCaptureClickAt = 0;
  let lastQuickScreenshotAt = 0;
  let tooltipTarget = null;
  let sidecarOpen = false;
  let sidecarLocked = false;
  let sidecarCloseTimer = null;
  let latestState = null;
  let pendingTextSelection = null;
  let isResizingGlobalPanel = false;
  let liveGlobalPanelHeight = 0;
  const viewportMargin = 12;

  function getLanguage() {
    return options.getLanguage();
  }

  function t(key) {
    return options.t(getLanguage(), key);
  }

  function iconSvg(name) {
    const icons = {
      select: '<path d="M5 4l7 16 2-7 7-2L5 4z"></path>',
      style: '<path d="M4 14l6-6 6 6-6 6-6-6z"></path><path d="M14 4l6 6"></path>',
      capture: '<rect x="4" y="7" width="16" height="12" rx="3"></rect><path d="M8 7l1.5-2h5L16 7"></path><circle cx="12" cy="13" r="3"></circle>',
      copy: '<rect x="8" y="8" width="11" height="11" rx="2"></rect><path d="M5 15V7a2 2 0 0 1 2-2h8"></path>',
      more: '<circle cx="6" cy="12" r="1.7"></circle><circle cx="12" cy="12" r="1.7"></circle><circle cx="18" cy="12" r="1.7"></circle>',
      edit: '<path d="M4 20h4l10-10a2.8 2.8 0 0 0-4-4L4 16v4z"></path><path d="M13 7l4 4"></path>',
      mask: '<rect x="5" y="5" width="14" height="14" rx="2"></rect><path d="M8 18L18 8"></path><path d="M6 12l6-6"></path><path d="M12 18l6-6"></path>',
      minus: '<path d="M6 12h12"></path>',
      plus: '<path d="M12 5v14"></path><path d="M5 12h14"></path>',
      close: '<path d="M6 6l12 12"></path><path d="M18 6L6 18"></path>'
    };

    return `<svg class="pinfix-icon" viewBox="0 0 24 24" aria-hidden="true">${icons[name] || ''}</svg>`;
  }

  function injectPinFixStyles() {
    if (document.getElementById('pinfix-style')) {
      return;
    }

    if (typeof GM_addStyle === 'function') {
      GM_addStyle(getPinFixStyles());
      return;
    }

    const style = document.createElement('style');
    style.id = 'pinfix-style';
    style.textContent = getPinFixStyles();
    document.head.appendChild(style);
  }

  function mount() {
    if (root) {
      return;
    }

    injectPinFixStyles();

    root = document.createElement('div');
    root.id = 'pinfix-root';
    root.dataset.pinfixIgnore = 'true';
    root.innerHTML = `
      <div class="pinfix-chrome" data-html2canvas-ignore="true">
        <button class="pinfix-launcher" type="button" data-action="toggle-open"></button>
        <div class="pinfix-toolbar pinfix-hidden"></div>
      </div>
      <div class="pinfix-overlay-layer"></div>
      <div class="pinfix-note-layer"></div>
      <div class="pinfix-popover pinfix-hidden" data-html2canvas-ignore="true"></div>
      <div class="pinfix-sidecar pinfix-hidden" data-html2canvas-ignore="true"></div>
      <button class="pinfix-global-strip" type="button" data-action="toggle-global"></button>
      <div class="pinfix-global-panel pinfix-hidden" data-html2canvas-ignore="true"></div>
      <div class="pinfix-toast pinfix-hidden" data-html2canvas-ignore="true"></div>
      <div class="pinfix-tooltip pinfix-hidden" data-html2canvas-ignore="true"></div>
      <div class="pinfix-countdown pinfix-hidden"></div>
    `;

    document.body.appendChild(root);

    chrome = root.querySelector('.pinfix-chrome');
    overlayLayer = root.querySelector('.pinfix-overlay-layer');
    noteLayer = root.querySelector('.pinfix-note-layer');
    popover = root.querySelector('.pinfix-popover');
    sidecar = root.querySelector('.pinfix-sidecar');
    globalStrip = root.querySelector('.pinfix-global-strip');
    globalPanel = root.querySelector('.pinfix-global-panel');
    toast = root.querySelector('.pinfix-toast');
    tooltip = root.querySelector('.pinfix-tooltip');
    countdown = root.querySelector('.pinfix-countdown');
    candidate = document.createElement('div');
    candidate.className = 'pinfix-candidate pinfix-hidden';
    overlayLayer.appendChild(candidate);

    root.addEventListener('click', handleClick);
    root.addEventListener('dblclick', handleDoubleClick);
    root.addEventListener('input', handleInput);
    root.addEventListener('focusin', handleFocusIn);
    root.addEventListener('focusout', handleFocusOut);
    root.addEventListener('pointerover', handlePointerOver);
    root.addEventListener('pointerout', handlePointerOut);

    document.addEventListener('pointerdown', handleDocumentPointerDown, true);
    document.addEventListener('dblclick', handleDocumentDoubleClick, true);
  }

  function unmount() {
    if (!root) {
      return;
    }

    if (resizeCleanup) {
      resizeCleanup();
      resizeCleanup = null;
    }
    window.clearTimeout(toolClickTimer);
    cancelSidecarClose();

    document.removeEventListener('pointerdown', handleDocumentPointerDown, true);
    document.removeEventListener('dblclick', handleDocumentDoubleClick, true);
    root.remove();
    root = null;
  }

  function handleDocumentPointerDown(event) {
    if (!root) {
      return;
    }

    if (!root.contains(event.target)) {
      closeAnnotationSidecar();
      hideTooltip();
      options.onClosePopover();
      return;
    }

    if (sidecarLocked && !event.target.closest('.pinfix-sidecar, .pinfix-annotation-sidecar-trigger')) {
      closeAnnotationSidecar();
    }
  }

  function handleDocumentDoubleClick(event) {
    if (!root || !latestState || !latestState.open) {
      return;
    }

    if (root.contains(event.target)) {
      return;
    }

    options.onHideNotes();
  }

  function handleClick(event) {
    const actionTarget = event.target.closest('[data-action]');
    if (!actionTarget) {
      const noteCard = event.target.closest('.pinfix-note-card');
      if (noteCard && !event.target.closest('textarea')) {
        setCardExpanded(noteCard, true);
        const input = noteCard.querySelector('.pinfix-note-input');
        if (input) {
          input.classList.remove('pinfix-hidden');
          input.focus();
        }
      }
      return;
    }

    const { action } = actionTarget.dataset;
    if (action === 'toggle-open') {
      options.onToggleOpen();
    }
    if (action === 'toggle-global') {
      options.onToggleGlobal();
    }
    if (action === 'close-global') {
      options.onToggleGlobal(false);
    }
    if (action === 'show-global-note') {
      options.onShowGlobalNoteView();
    }
    if (action === 'show-global-template') {
      options.onShowGlobalTemplate(actionTarget.dataset.id);
    }
    if (action === 'create-global-template') {
      options.onCreateGlobalTemplate();
    }
    if (action === 'delete-global-template') {
      options.onDeleteGlobalTemplate(actionTarget.dataset.id);
    }
    if (action === 'toggle-global-template-selection') {
      options.onToggleGlobalTemplateSelection(actionTarget.dataset.id);
    }
    if (action === 'tool') {
      if (actionTarget.dataset.tool === 'capture') {
        const now = Date.now();
        const isFastSecondClick = now - lastCaptureClickAt < 420;
        lastCaptureClickAt = now;
        window.clearTimeout(toolClickTimer);
        toolClickTimer = null;
        if (event.detail >= 2 || isFastSecondClick) {
          runQuickScreenshotShortcut();
          return;
        }
        toolClickTimer = window.setTimeout(() => {
          toolClickTimer = null;
          options.onTool(actionTarget.dataset.tool);
        }, 300);
      } else {
        window.clearTimeout(toolClickTimer);
        toolClickTimer = null;
        options.onTool(actionTarget.dataset.tool);
      }
    }
    if (action === 'set-setting') {
      options.onSetSetting(actionTarget.dataset.key, actionTarget.dataset.value);
    }
    if (action === 'run') {
      options.onRun(actionTarget.dataset.name, actionTarget.dataset.arg || '');
    }
    if (action === 'toggle-section') {
      options.onToggleSection(actionTarget.dataset.section);
    }
    if (action === 'delete-annotation') {
      options.onDeleteAnnotation(actionTarget.dataset.id);
    }
    if (action === 'delete-mask') {
      options.onDeleteMask(actionTarget.dataset.id);
    }
    if (action === 'adjust-mask') {
      options.onAdjustMask(actionTarget.dataset.id, actionTarget.dataset.delta);
    }
    if (action === 'candidate-adjust') {
      options.onCandidateAdjust(actionTarget.dataset.direction);
    }
    if (action === 'candidate-pick') {
      options.onCandidatePick(actionTarget.dataset.kind);
    }
    if (action === 'activate-annotation') {
      options.onActivateAnnotation(actionTarget.dataset.id);
    }
    if (action === 'focus-annotation') {
      options.onFocusAnnotation(actionTarget.dataset.id);
    }
    if (action === 'mask-annotation') {
      options.onMaskAnnotation(actionTarget.dataset.id);
    }
    if (action === 'edit-annotation') {
      options.onEditAnnotation(actionTarget.dataset.id);
    }
    if (action === 'toggle-annotation-sidecar') {
      toggleAnnotationSidecar(true);
    }
  }

  function handleDoubleClick(event) {
    const actionTarget = event.target.closest('[data-action="tool"][data-tool="capture"]');
    if (actionTarget) {
      event.preventDefault();
      window.clearTimeout(toolClickTimer);
      toolClickTimer = null;
      if (Date.now() - lastQuickScreenshotAt < 500) {
        return;
      }
      runQuickScreenshotShortcut();
      return;
    }

    if (event.target.closest('#pinfix-root')) {
      return;
    }

    options.onHideNotes();
  }

  function runQuickScreenshotShortcut() {
    lastQuickScreenshotAt = Date.now();
    hideTooltip();
    closeAnnotationSidecar();
    options.onQuickScreenshot();
  }

  function isGlobalTemplateField(target) {
    return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
      ? target.dataset.templateField === 'title' || target.dataset.templateField === 'content'
      : false;
  }

  function handleInput(event) {
    const field = event.target;
    if (!(field instanceof HTMLTextAreaElement) && !(field instanceof HTMLInputElement)) {
      return;
    }

    if (field.dataset.noteId) {
      autoGrow(field, 220);
      options.onChangeNote(field.dataset.noteId, field.value, false);
      syncSummary(field);
      syncMissingNoteState(field);
    }

    if (field.dataset.globalNote === 'true') {
      autoGrow(field, Number(field.dataset.maxHeight || 320));
      options.onChangeGlobalNote(field.value);
    }

    if (isGlobalTemplateField(field)) {
      if (field instanceof HTMLTextAreaElement) {
        autoGrow(field, Number(field.dataset.maxHeight || 240));
      }
      options.onChangeGlobalTemplateDraft(field.dataset.templateField, field.value);
    }
  }

  function handleFocusIn(event) {
    const nextTooltipTarget = getTooltipTarget(event.target);
    if (nextTooltipTarget) {
      showTooltip(nextTooltipTarget);
    }

    if (event.target.closest && event.target.closest('.pinfix-annotation-sidecar-trigger')) {
      openAnnotationSidecar(false);
    }

    const field = event.target;
    if (field instanceof HTMLTextAreaElement && field.dataset.noteId) {
      setCardExpanded(field.closest('.pinfix-note-card'), true);
    }
  }

  function handleFocusOut(event) {
    const nextFocus = event.relatedTarget;
    if (!nextFocus || !root.contains(nextFocus) || !nextFocus.closest('[data-tooltip]')) {
      hideTooltip();
    }

    if (!sidecarLocked && (!nextFocus || !nextFocus.closest('.pinfix-sidecar, .pinfix-annotation-sidecar-trigger'))) {
      scheduleSidecarClose();
    }

    const field = event.target;
    if (!(field instanceof HTMLTextAreaElement) && !(field instanceof HTMLInputElement)) {
      return;
    }

    if (field.dataset.noteId) {
      options.onChangeNote(field.dataset.noteId, field.value, true);
      return;
    }

    if (isGlobalTemplateField(field)) {
      const currentEditor = field.closest('[data-template-editor="true"]');
      if (nextFocus && currentEditor && currentEditor.contains(nextFocus)) {
        return;
      }
      options.onCommitGlobalTemplate(!nextFocus || !root.contains(nextFocus));
    }
  }

  function handlePointerOver(event) {
    const nextTooltipTarget = getTooltipTarget(event.target);
    if (nextTooltipTarget && !nextTooltipTarget.contains(event.relatedTarget)) {
      showTooltip(nextTooltipTarget);
    }

    if (event.target.closest && event.target.closest('.pinfix-annotation-sidecar-trigger')) {
      openAnnotationSidecar(false);
    }

    if (event.target.closest && event.target.closest('.pinfix-sidecar')) {
      cancelSidecarClose();
    }
  }

  function handlePointerOut(event) {
    const currentTooltipTarget = getTooltipTarget(event.target);
    if (currentTooltipTarget && !currentTooltipTarget.contains(event.relatedTarget)) {
      hideTooltip();
    }

    const leavingSidecarArea = event.target.closest
      && event.target.closest('.pinfix-sidecar, .pinfix-annotation-sidecar-trigger');
    if (leavingSidecarArea && !leavingSidecarArea.contains(event.relatedTarget)) {
      scheduleSidecarClose();
    }
  }

  function autoGrow(textarea, maxHeight) {
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
  }

  function syncSummary(textarea) {
    const card = textarea.closest('.pinfix-note-card');
    const summary = card ? card.querySelector('.pinfix-note-summary') : null;
    if (summary) {
      summary.textContent = summariseNote(textarea.value) || textarea.placeholder;
    }
  }

  function syncMissingNoteState(textarea) {
    const label = Array.from(root.querySelectorAll('.pinfix-label'))
      .find((node) => node.dataset.id === textarea.dataset.noteId);
    if (label) {
      label.classList.toggle('has-missing-note', !textarea.value.trim());
    }
  }

  function setCardExpanded(card, expanded) {
    if (!card || card.dataset.notesVisible === 'false') {
      return;
    }

    const input = card.querySelector('.pinfix-note-input');
    const summary = card.querySelector('.pinfix-note-summary');
    if (!input || !summary) {
      return;
    }

    input.classList.toggle('pinfix-hidden', !expanded);
    summary.classList.toggle('pinfix-hidden', expanded);
  }

  function getTooltipTarget(target) {
    if (!(target instanceof Element)) {
      return null;
    }

    return target.closest('[data-tooltip]');
  }

  function showTooltip(target) {
    if (!tooltip || !target || !target.dataset.tooltip) {
      return;
    }

    tooltipTarget = target;
    tooltip.textContent = target.dataset.tooltip;
    tooltip.classList.remove('pinfix-hidden');
    positionTooltip();
  }

  function positionTooltip() {
    if (!tooltip || !tooltipTarget || !document.body.contains(tooltipTarget)) {
      hideTooltip();
      return;
    }

    const targetBox = tooltipTarget.getBoundingClientRect();
    const tooltipBox = tooltip.getBoundingClientRect();
    const left = clamp(targetBox.right + 10, viewportMargin, window.innerWidth - tooltipBox.width - viewportMargin);
    const top = clamp(
      targetBox.top + targetBox.height / 2 - tooltipBox.height / 2,
      viewportMargin,
      window.innerHeight - tooltipBox.height - viewportMargin
    );
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  }

  function hideTooltip() {
    tooltipTarget = null;
    if (!tooltip) {
      return;
    }

    tooltip.classList.add('pinfix-hidden');
    tooltip.textContent = '';
  }

  function cancelSidecarClose() {
    if (sidecarCloseTimer) {
      window.clearTimeout(sidecarCloseTimer);
      sidecarCloseTimer = null;
    }
  }

  function scheduleSidecarClose() {
    if (sidecarLocked) {
      return;
    }

    cancelSidecarClose();
    sidecarCloseTimer = window.setTimeout(() => {
      const trigger = root.querySelector('.pinfix-annotation-sidecar-trigger');
      const keepOpen = (trigger && trigger.matches(':hover')) || (sidecar && sidecar.matches(':hover'));
      if (!keepOpen) {
        closeAnnotationSidecar();
      }
    }, 120);
  }

  function openAnnotationSidecar(locked) {
    cancelSidecarClose();
    sidecarOpen = true;
    sidecarLocked = Boolean(locked) || sidecarLocked;
    renderAnnotationSidecar(latestState);
  }

  function closeAnnotationSidecar() {
    cancelSidecarClose();
    sidecarOpen = false;
    sidecarLocked = false;
    if (sidecar) {
      sidecar.classList.add('pinfix-hidden');
      sidecar.innerHTML = '';
    }
  }

  function toggleAnnotationSidecar(locked) {
    if (sidecarOpen && sidecarLocked) {
      closeAnnotationSidecar();
      return;
    }

    openAnnotationSidecar(locked);
  }

  function setRootSize() {
    const size = getDocumentSize();
    root.style.width = `${size.width}px`;
    root.style.height = `${size.height}px`;
  }

  function render(state) {
    mount();
    captureTextSelection();
    latestState = state;
    setRootSize();
    root.classList.toggle('pinfix-hidden-for-capture', Boolean(state.captureHidden));
    renderChrome(state);
    if (!state.open) {
      renderClosedState();
      return;
    }
    renderPopover(state);
    renderAnnotationSidecar(state);
    renderAnnotations(state);
    renderGlobalNotes(state);
    renderToast(state);
    renderCountdown(state);
    positionTooltip();
    focusEditingNote(state);
    restoreTextSelection();
  }

  function renderClosedState() {
    closeAnnotationSidecar();
    hideTooltip();
    isResizingGlobalPanel = false;
    liveGlobalPanelHeight = 0;
    if (overlayLayer) {
      overlayLayer.querySelectorAll('.pinfix-annotation-box, .pinfix-annotation-tools, .pinfix-label, .pinfix-mask').forEach((node) => node.remove());
    }
    if (candidate) {
      candidate.classList.add('pinfix-hidden');
      candidate.innerHTML = '';
    }
    if (noteLayer) {
      noteLayer.innerHTML = '';
    }
    if (popover) {
      popover.classList.add('pinfix-hidden');
      popover.innerHTML = '';
      delete popover.dataset.panel;
    }
    if (globalStrip) {
      globalStrip.classList.add('pinfix-hidden');
    }
    if (globalPanel) {
      globalPanel.classList.add('pinfix-hidden');
      globalPanel.innerHTML = '';
    }
    if (toast) {
      toast.classList.add('pinfix-hidden');
      toast.innerHTML = '';
    }
    if (countdown) {
      countdown.classList.add('pinfix-hidden');
      countdown.textContent = '';
    }
  }

  function captureTextSelection() {
    const active = document.activeElement;
    if (!(active instanceof HTMLTextAreaElement)) {
      pendingTextSelection = null;
      return;
    }

    if (!active.dataset.noteId && active.dataset.globalNote !== 'true') {
      pendingTextSelection = null;
      return;
    }

    pendingTextSelection = {
      noteId: active.dataset.noteId || '',
      globalNote: active.dataset.globalNote === 'true',
      start: active.selectionStart,
      end: active.selectionEnd,
      scrollTop: active.scrollTop
    };
  }

  function restoreTextSelection() {
    if (!pendingTextSelection) {
      return;
    }

    const snapshot = pendingTextSelection;
    pendingTextSelection = null;
    window.requestAnimationFrame(() => {
      const input = snapshot.globalNote
        ? root.querySelector('[data-global-note="true"]')
        : Array.from(root.querySelectorAll('[data-note-id]')).find((node) => node.dataset.noteId === snapshot.noteId);

      if (!(input instanceof HTMLTextAreaElement)) {
        return;
      }

      const start = clamp(snapshot.start, 0, input.value.length);
      const end = clamp(snapshot.end, 0, input.value.length);
      input.focus();
      input.setSelectionRange(start, end);
      input.scrollTop = snapshot.scrollTop;
      autoGrow(input, snapshot.globalNote ? Number(input.dataset.maxHeight || 320) : 220);
    });
  }

  function focusEditingNote(state) {
    if (!state.editingAnnotationId) {
      return;
    }

    if (document.activeElement && document.activeElement.dataset
      && document.activeElement.dataset.noteId === state.editingAnnotationId) {
      return;
    }

    window.requestAnimationFrame(() => {
      const input = Array.from(root.querySelectorAll('[data-note-id]'))
        .find((node) => node.dataset.noteId === state.editingAnnotationId);
      if (input) {
        input.focus();
        autoGrow(input, 220);
        const end = input.value.length;
        input.setSelectionRange(end, end);
      }
    });
  }

  function renderChrome(state) {
    const launcher = root.querySelector('.pinfix-launcher');
    const toolbar = root.querySelector('.pinfix-toolbar');
    const buttons = [
      { tool: 'select', label: t('select'), icon: iconSvg('select') },
      { tool: 'style', label: t('style'), icon: iconSvg('style') },
      { tool: 'capture', label: t('capture'), icon: iconSvg('capture') },
      { tool: 'copy', label: t('copy'), icon: iconSvg('copy') },
      { tool: 'more', label: t('more'), icon: iconSvg('more') }
    ];

    launcher.classList.toggle('pinfix-hidden', state.open);
    launcher.removeAttribute('title');
    launcher.setAttribute('aria-label', t('launcherOpen'));
    launcher.dataset.tooltip = t('launcherOpen');
    launcher.textContent = '';

    toolbar.classList.toggle('pinfix-hidden', !state.open);
    toolbar.innerHTML = `
      <button
        class="pinfix-toolbar-close"
        type="button"
        aria-label="${escapeHtml(t('launcherClose'))}"
        data-tooltip="${escapeHtml(t('launcherClose'))}"
        data-action="run"
        data-name="close-pinfix"
      >${iconSvg('close')}</button>
      ${buttons
      .map((button) => {
        const active = button.tool === 'select'
          ? state.tool === 'select' && state.selectionActive
          : button.tool === state.tool || button.tool === state.activePopover;
        return `
          <button
            class="pinfix-tool-button ${active ? 'is-active' : ''}"
            type="button"
            aria-label="${escapeHtml(button.label)}"
            data-tooltip="${escapeHtml(button.label)}"
            data-action="tool"
            data-tool="${button.tool}"
          >${button.icon}</button>
        `;
      })
      .join('')}
    `;
  }

  function renderPopover(state) {
    if (!state.open || !state.activePopover) {
      popover.classList.add('pinfix-hidden');
      popover.innerHTML = '';
      delete popover.dataset.panel;
      closeAnnotationSidecar();
      return;
    }

    const toolbarBox = root.querySelector('.pinfix-toolbar').getBoundingClientRect();
    popover.classList.remove('pinfix-hidden');
    popover.dataset.panel = state.activePopover;
    popover.innerHTML = buildPopoverContent(state);
    const maxLeft = Math.max(12, window.innerWidth - popover.offsetWidth - 12);
    const nextLeft = clamp(toolbarBox.right + 12, 12, maxLeft);
    popover.style.left = `${nextLeft}px`;
    const maxTop = Math.max(12, window.innerHeight - popover.offsetHeight - 12);
    const nextTop = clamp(toolbarBox.top, 12, maxTop);
    popover.style.top = `${nextTop}px`;
  }

  function renderAnnotationSidecar(state) {
    if (!sidecar || !state || !state.open || state.activePopover !== 'more' || !sidecarOpen) {
      if (!state || state.activePopover !== 'more') {
        sidecarOpen = false;
        sidecarLocked = false;
      }
      if (sidecar) {
        sidecar.classList.add('pinfix-hidden');
        sidecar.innerHTML = '';
      }
      return;
    }

    sidecar.innerHTML = buildAnnotationSidecarContent(state);
    sidecar.classList.remove('pinfix-hidden');

    const popoverBox = popover.getBoundingClientRect();
    const trigger = root.querySelector('.pinfix-annotation-sidecar-trigger');
    const triggerBox = trigger ? trigger.getBoundingClientRect() : popoverBox;
    const sidecarBox = sidecar.getBoundingClientRect();
    const maxLeft = Math.max(viewportMargin, window.innerWidth - sidecarBox.width - viewportMargin);
    let left = popoverBox.right + 10;
    let top = triggerBox.top;

    if (left + sidecarBox.width > window.innerWidth - viewportMargin) {
      left = popoverBox.left - sidecarBox.width - 10;
      sidecar.dataset.placement = 'left';
    } else {
      sidecar.dataset.placement = 'right';
    }

    if (left < viewportMargin) {
      left = clamp(popoverBox.left, viewportMargin, maxLeft);
      top = popoverBox.bottom + 10;
      sidecar.dataset.placement = 'bottom';
    }

    const maxTop = Math.max(viewportMargin, window.innerHeight - sidecarBox.height - viewportMargin);
    sidecar.style.left = `${clamp(left, viewportMargin, maxLeft)}px`;
    sidecar.style.top = `${clamp(top, viewportMargin, maxTop)}px`;
  }

  function getSafeViewportBounds() {
    return {
      left: window.scrollX + viewportMargin,
      top: window.scrollY + viewportMargin,
      right: window.scrollX + window.innerWidth - viewportMargin,
      bottom: window.scrollY + window.innerHeight - viewportMargin
    };
  }

  function getOperationBounds() {
    const bounds = { ...getSafeViewportBounds() };
    const chromeBox = chrome ? chrome.getBoundingClientRect() : null;
    if (chromeBox && chromeBox.width > 0 && chromeBox.height > 0) {
      bounds.left = Math.max(bounds.left, window.scrollX + chromeBox.right + 12);
    }

    if (globalPanel && !globalPanel.classList.contains('pinfix-hidden')) {
      bounds.bottom = Math.min(bounds.bottom, window.scrollY + globalPanel.getBoundingClientRect().top - 12);
    } else if (globalStrip && !globalStrip.classList.contains('pinfix-hidden')) {
      bounds.bottom = Math.min(bounds.bottom, window.scrollY + globalStrip.getBoundingClientRect().top - 12);
    }

    return bounds;
  }

  function overlapsViewport(rect, bounds) {
    return (
      rect.pageLeft + rect.width > bounds.left &&
      rect.pageLeft < bounds.right &&
      rect.pageTop + rect.height > bounds.top &&
      rect.pageTop < bounds.bottom
    );
  }

  function clampBoxRect(rect, minWidth = 12, minHeight = 12) {
    const bounds = getSafeViewportBounds();
    if (!overlapsViewport(rect, bounds)) {
      return rect;
    }

    const left = clamp(rect.pageLeft, bounds.left, Math.max(bounds.left, bounds.right - minWidth));
    const top = clamp(rect.pageTop, bounds.top, Math.max(bounds.top, bounds.bottom - minHeight));
    const right = clamp(rect.pageLeft + rect.width, left + minWidth, bounds.right);
    const bottom = clamp(rect.pageTop + rect.height, top + minHeight, bounds.bottom);

    return {
      pageLeft: left,
      pageTop: top,
      width: Math.max(right - left, minWidth),
      height: Math.max(bottom - top, minHeight)
    };
  }

  function clampWithin(value, min, max) {
    if (max < min) {
      return min;
    }

    return clamp(value, min, max);
  }

  function getVisibleRect(rect) {
    const bounds = getSafeViewportBounds();
    const left = Math.max(rect.pageLeft, bounds.left);
    const top = Math.max(rect.pageTop, bounds.top);
    const right = Math.min(rect.pageLeft + rect.width, bounds.right);
    const bottom = Math.min(rect.pageTop + rect.height, bounds.bottom);

    if (right <= left || bottom <= top) {
      return null;
    }

    return {
      pageLeft: left,
      pageTop: top,
      width: right - left,
      height: bottom - top
    };
  }

  function getAnnotationRenderInfo(rect) {
    const visibleRect = getVisibleRect(rect);
    if (!visibleRect) {
      return null;
    }

    // Saved annotations should scroll away naturally. This threshold hides
    // tiny edge slivers instead of pulling their labels back into the viewport.
    const minVisibleWidth = Math.min(24, Math.max(8, rect.width * 0.25));
    const minVisibleHeight = Math.min(24, Math.max(8, rect.height * 0.25));
    const visibleArea = visibleRect.width * visibleRect.height;
    const totalArea = Math.max(rect.width * rect.height, 1);

    if (
      visibleRect.width < minVisibleWidth ||
      visibleRect.height < minVisibleHeight ||
      (visibleArea < 360 && visibleArea / totalArea < 0.08)
    ) {
      return null;
    }

    return {
      originalRect: rect,
      visibleRect,
      frameRect: visibleRect
    };
  }

  function getFloatingPosition(preferredLeft, preferredTop, width, height) {
    const bounds = getSafeViewportBounds();
    return getFloatingPositionInBounds(preferredLeft, preferredTop, width, height, bounds);
  }

  function getFloatingPositionInBounds(preferredLeft, preferredTop, width, height, bounds) {
    return {
      pageLeft: clampWithin(preferredLeft, bounds.left, Math.max(bounds.left, bounds.right - width)),
      pageTop: clampWithin(preferredTop, bounds.top, Math.max(bounds.top, bounds.bottom - height))
    };
  }

  function rectsOverlap(leftRect, rightRect) {
    return (
      leftRect.pageLeft < rightRect.pageLeft + rightRect.width &&
      leftRect.pageLeft + leftRect.width > rightRect.pageLeft &&
      leftRect.pageTop < rightRect.pageTop + rightRect.height &&
      leftRect.pageTop + leftRect.height > rightRect.pageTop
    );
  }

  function getLabelLayout(frameRect, labelSize) {
    const bounds = getSafeViewportBounds();
    const outsideTop = frameRect.pageTop - labelSize * 0.55;
    const outsideLeft = frameRect.pageLeft + frameRect.width - labelSize - 18;
    const outsideFits = (
      outsideTop >= bounds.top &&
      outsideLeft >= bounds.left &&
      outsideLeft + labelSize <= bounds.right
    );

    if (outsideFits) {
      return {
        mode: 'outside',
        size: labelSize,
        rect: {
          pageLeft: outsideLeft,
          pageTop: outsideTop,
          width: labelSize,
          height: labelSize
        }
      };
    }

    const innerGap = 8;
    const innerSize = Math.max(28, Math.min(labelSize, Math.min(frameRect.width, frameRect.height) - innerGap * 2));
    return {
      mode: 'inside',
      size: innerSize,
      rect: {
        pageLeft: clampWithin(
          frameRect.pageLeft + frameRect.width - innerSize - innerGap,
          bounds.left,
          Math.min(bounds.right - innerSize, frameRect.pageLeft + frameRect.width - innerSize - innerGap)
        ),
        pageTop: clampWithin(
          frameRect.pageTop + innerGap,
          bounds.top,
          Math.min(bounds.bottom - innerSize, frameRect.pageTop + frameRect.height - innerSize - innerGap)
        ),
        width: innerSize,
        height: innerSize
      }
    };
  }

  function getCompactToolRailLayout(frameRect, labelRect, group, reserveBothGroups = false) {
    const bounds = getOperationBounds();
    const gap = 6;
    const inset = 6;
    const annotationWidth = 78;
    const candidateWidth = 103;
    const toolHeight = 28;
    const groupWidth = group === 'candidate' ? candidateWidth : annotationWidth;
    const totalWidth = reserveBothGroups ? annotationWidth + gap + candidateWidth : groupWidth;
    const groupOffset = reserveBothGroups && group === 'candidate' ? annotationWidth + gap : 0;
    let railLeft = frameRect.pageLeft + inset;
    let railTop = frameRect.pageTop + inset;

    if (labelRect) {
      const labelPad = 4;
      const railRect = {
        pageLeft: railLeft,
        pageTop: railTop,
        width: totalWidth,
        height: toolHeight
      };
      const paddedLabelRect = {
        pageLeft: labelRect.pageLeft - labelPad,
        pageTop: labelRect.pageTop - labelPad,
        width: labelRect.width + labelPad * 2,
        height: labelRect.height + labelPad * 2
      };

      if (rectsOverlap(railRect, paddedLabelRect)) {
        const lowerTop = labelRect.pageTop + labelRect.height + gap;
        const maxInsideTop = frameRect.pageTop + frameRect.height - toolHeight - inset;
        railTop = maxInsideTop >= frameRect.pageTop + inset ? Math.min(maxInsideTop, lowerTop) : lowerTop;
      }
    }

    railLeft = clampWithin(railLeft, bounds.left, Math.max(bounds.left, bounds.right - totalWidth));
    railTop = clampWithin(railTop, bounds.top, Math.max(bounds.top, bounds.bottom - toolHeight));

    return {
      pageLeft: railLeft + groupOffset,
      pageTop: railTop,
      width: groupWidth,
      height: toolHeight
    };
  }

  function positionCandidateTools(displayRect, activeRenderInfo) {
    const tools = candidate.querySelector('.pinfix-candidate-tools');
    if (!tools) {
      return;
    }

    const pairedWithAnnotation = Boolean(activeRenderInfo);
    const railFrameRect = pairedWithAnnotation ? activeRenderInfo.frameRect : displayRect;
    const toolsPosition = getCompactToolRailLayout(
      railFrameRect,
      pairedWithAnnotation ? activeRenderInfo.labelRect : null,
      'candidate',
      pairedWithAnnotation
    );

    tools.style.left = `${toolsPosition.pageLeft - displayRect.pageLeft}px`;
    tools.style.top = `${toolsPosition.pageTop - displayRect.pageTop}px`;
    tools.style.right = 'auto';
  }

  function shouldShareToolRail(leftRect, rightRect) {
    if (!leftRect || !rightRect) {
      return false;
    }

    const paddedLeftRect = {
      pageLeft: leftRect.pageLeft - 12,
      pageTop: leftRect.pageTop - 12,
      width: leftRect.width + 24,
      height: leftRect.height + 24
    };

    return rectsOverlap(paddedLeftRect, rightRect);
  }

  function shouldShowToolRail(rect) {
    if (!rect) {
      return false;
    }

    return rect.width >= PINFIX_MIN_TOOL_TARGET_WIDTH && rect.height >= PINFIX_MIN_TOOL_TARGET_HEIGHT;
  }

  function renderAnnotations(state) {
    const candidatePadding = PINFIX_BOX_PADDING_OPTIONS[state.settings.boxPadding] || 0;
    let candidateDisplayRect = null;
    let candidateShowsTools = false;
    let activeRenderInfo = null;
    candidate.innerHTML = '';

    const currentCandidate = state.candidate;
    if (!currentCandidate || !state.open || state.tool !== 'select' || !state.selectionActive || state.captureHidden || state.globalNoteOpen) {
      candidate.classList.add('pinfix-hidden');
    } else {
      const displayRect = clampBoxRect(expandRect(currentCandidate, candidatePadding));
      candidateShowsTools = shouldShowToolRail(displayRect);
      candidate.classList.remove('pinfix-hidden');
      candidate.style.left = `${displayRect.pageLeft}px`;
      candidate.style.top = `${displayRect.pageTop}px`;
      candidate.style.width = `${Math.max(displayRect.width, 12)}px`;
      candidate.style.height = `${Math.max(displayRect.height, 12)}px`;
      candidateDisplayRect = displayRect;
      candidate.innerHTML = candidateShowsTools ? `
        <div class="pinfix-candidate-tools">
          <button type="button" data-action="candidate-adjust" data-direction="-1" title="${escapeHtml(t('tipShrink'))}" aria-label="${escapeHtml(t('tipShrink'))}">${iconSvg('minus')}</button>
          <button type="button" data-action="candidate-adjust" data-direction="1" title="${escapeHtml(t('tipExpand'))}" aria-label="${escapeHtml(t('tipExpand'))}">${iconSvg('plus')}</button>
          <button type="button" data-action="candidate-pick" data-kind="annotate" title="${escapeHtml(t('tipSelectMode'))}" aria-label="${escapeHtml(t('tipSelectMode'))}">${iconSvg('edit')}</button>
          <button type="button" data-action="candidate-pick" data-kind="mask" title="${escapeHtml(t('actionMaskArea'))}" aria-label="${escapeHtml(t('actionMaskArea'))}">${iconSvg('mask')}</button>
        </div>
      ` : '';
    }

    overlayLayer.querySelectorAll('.pinfix-annotation-box, .pinfix-annotation-tools, .pinfix-label, .pinfix-mask').forEach((node) => node.remove());
    noteLayer.innerHTML = '';

    state.masks.forEach((mask) => {
      renderMask(mask);
    });

    state.annotations.forEach((annotation) => {
      const renderInfo = renderAnnotationBox(annotation, state, candidateDisplayRect);
      if (renderInfo && annotation.id === state.activeAnnotationId) {
        activeRenderInfo = renderInfo;
      }
      if (renderInfo && state.settings.notesVisible && state.activeAnnotationId === annotation.id) {
        renderAnnotationNote(annotation, state, renderInfo);
      }
    });

    if (candidateDisplayRect && candidateShowsTools) {
      const pairedRenderInfo = activeRenderInfo && activeRenderInfo.showsTools && shouldShareToolRail(activeRenderInfo.frameRect, candidateDisplayRect)
        ? activeRenderInfo
        : null;
      positionCandidateTools(candidateDisplayRect, pairedRenderInfo);
    }
  }

  function renderAnnotationBox(annotation, state, candidateDisplayRect) {
    const color = PINFIX_COLOR_PRESETS[annotation.style.colorPreset].color;
    const lineWidth = PINFIX_LINE_WIDTHS[annotation.style.lineWidth];
    const labelSize = PINFIX_LABEL_SIZES[annotation.style.labelSize];
    const padding = PINFIX_BOX_PADDING_OPTIONS[annotation.style.boxPadding] || 0;
    const stroke = annotation.surfaceTone === 'dark' ? 'rgba(255,255,255,0.95)' : 'rgba(15,23,42,0.88)';
    const isActive = annotation.id === state.activeAnnotationId;
    const isFocused = annotation.id === state.highlightedAnnotationId;
    const canActivate = state.open && !state.captureHidden;
    const boxInteractive = canActivate && state.tool !== 'select';
    const boxRect = expandRect(annotation.rect, padding);
    const renderInfo = getAnnotationRenderInfo(boxRect);
    if (!renderInfo) {
      return null;
    }
    const frameRect = renderInfo.frameRect;
    const labelLayout = getLabelLayout(frameRect, labelSize);
    const showsTools = shouldShowToolRail(frameRect);

    const box = document.createElement('div');
    box.className = `pinfix-annotation-box ${isFocused ? 'is-focused' : ''} ${isActive ? 'is-active' : ''} ${boxInteractive ? 'is-interactive' : ''}`;
    box.dataset.action = 'activate-annotation';
    box.dataset.id = annotation.id;
    box.style.left = `${frameRect.pageLeft}px`;
    box.style.top = `${frameRect.pageTop}px`;
    box.style.width = `${Math.max(frameRect.width, 8)}px`;
    box.style.height = `${Math.max(frameRect.height, 8)}px`;
    box.style.border = `${lineWidth}px solid ${color}`;
    box.style.boxShadow = isFocused
      ? `0 0 0 2px rgba(245, 158, 11, 0.86), 0 12px 28px rgba(245, 158, 11, 0.26), 0 0 0 1px ${stroke} inset`
      : `0 0 0 1px ${stroke} inset, 0 10px 26px ${isActive ? `${color}3f` : `${color}24`}, 0 0 0 4px ${isActive ? `${color}18` : `${color}10`}`;
    overlayLayer.appendChild(box);

    const shareCandidateRail = showsTools && isActive && candidateDisplayRect && shouldShareToolRail(frameRect, candidateDisplayRect);
    renderInfo.labelRect = labelLayout.rect;
    renderInfo.showsTools = showsTools;
    if (showsTools) {
      renderAnnotationTools(annotation, renderInfo, labelLayout.rect, isActive, shareCandidateRail);
    }

    const label = document.createElement('div');
    const missingNote = !String(annotation.note || '').trim();
    label.className = `pinfix-label ${labelLayout.mode === 'inside' ? 'is-inside' : ''} ${isFocused ? 'is-focused' : ''} ${isActive ? 'is-active' : ''} ${canActivate ? 'is-interactive' : ''} ${missingNote ? 'has-missing-note' : ''}`;
    label.dataset.action = 'activate-annotation';
    label.dataset.id = annotation.id;
    label.title = t('changeRequest');
    label.textContent = String(annotation.number);
    label.style.left = `${labelLayout.rect.pageLeft}px`;
    label.style.top = `${labelLayout.rect.pageTop}px`;
    label.style.width = `${labelLayout.size}px`;
    label.style.height = `${labelLayout.size}px`;
    label.style.fontSize = `${Math.round(labelLayout.size * 0.52)}px`;
    label.style.background = annotation.style.labelStyle === 'ring' ? '#ffffff' : color;
    label.style.color = annotation.style.labelStyle === 'ring' ? color : '#ffffff';
    label.style.border = `3px solid ${stroke}`;
    label.style.borderRadius = '999px';
    if (annotation.style.labelStyle === 'ring') {
      label.style.boxShadow = `0 0 0 3px ${color} inset, 0 10px 22px rgba(15,23,42,0.22)`;
    }
    overlayLayer.appendChild(label);
    return renderInfo;
  }

  function renderAnnotationTools(annotation, renderInfo, labelRect, isActive, reserveCandidateSlot) {
    const frameRect = renderInfo.frameRect;
    const position = getCompactToolRailLayout(frameRect, labelRect, 'annotation', reserveCandidateSlot);
    const tools = document.createElement('div');
    tools.className = `pinfix-inline-tools pinfix-annotation-tools ${isActive ? 'is-active' : ''}`;
    tools.style.left = `${position.pageLeft}px`;
    tools.style.top = `${position.pageTop}px`;
    tools.innerHTML = `
      <button type="button" data-action="edit-annotation" data-id="${annotation.id}" title="${escapeHtml(t('actionEditNote'))}" aria-label="${escapeHtml(t('actionEditNote'))}">${iconSvg('edit')}</button>
      <button type="button" data-action="mask-annotation" data-id="${annotation.id}" title="${escapeHtml(t('actionMaskArea'))}" aria-label="${escapeHtml(t('actionMaskArea'))}">${iconSvg('mask')}</button>
      <button type="button" data-action="delete-annotation" data-id="${annotation.id}" title="${escapeHtml(t('actionDelete'))}" aria-label="${escapeHtml(t('actionDelete'))}">${iconSvg('close')}</button>
    `;
    overlayLayer.appendChild(tools);
  }

  function renderMask(mask) {
    const element = document.createElement('div');
    element.className = 'pinfix-mask';
    element.style.left = `${mask.rect.pageLeft}px`;
    element.style.top = `${mask.rect.pageTop}px`;
    element.style.width = `${Math.max(mask.rect.width, 12)}px`;
    element.style.height = `${Math.max(mask.rect.height, 12)}px`;
    element.innerHTML = `
      <div class="pinfix-mask-label">${escapeHtml(t('maskLabel'))}</div>
      <div class="pinfix-inline-tools pinfix-mask-tools">
        <button type="button" data-action="adjust-mask" data-id="${mask.id}" data-delta="-8" title="${escapeHtml(t('actionShrinkMask'))}" aria-label="${escapeHtml(t('actionShrinkMask'))}">${iconSvg('minus')}</button>
        <button type="button" data-action="adjust-mask" data-id="${mask.id}" data-delta="8" title="${escapeHtml(t('actionExpandMask'))}" aria-label="${escapeHtml(t('actionExpandMask'))}">${iconSvg('plus')}</button>
        <button type="button" data-action="delete-mask" data-id="${mask.id}" title="${escapeHtml(t('actionDeleteMask'))}" aria-label="${escapeHtml(t('actionDeleteMask'))}">${iconSvg('close')}</button>
      </div>
    `;
    overlayLayer.appendChild(element);
  }

  function getNotePosition(renderInfo) {
    const estimatedHeight = 122;
    const bounds = getOperationBounds();
    const cardWidth = Math.max(220, Math.min(320, bounds.right - bounds.left));
    const boxRect = renderInfo.frameRect;
    const defaultTop = boxRect.pageTop + boxRect.height;
    const shouldFlip = defaultTop + estimatedHeight > bounds.bottom && boxRect.pageTop - estimatedHeight >= bounds.top;
    const rightAlignedLeft = boxRect.pageLeft + boxRect.width - cardWidth;
    const preferredTop = shouldFlip ? boxRect.pageTop - estimatedHeight : defaultTop;

    return {
      left: clampWithin(rightAlignedLeft, bounds.left, Math.max(bounds.left, bounds.right - cardWidth)),
      top: clampWithin(preferredTop, bounds.top, Math.max(bounds.top, bounds.bottom - estimatedHeight)),
      width: cardWidth
    };
  }

  function renderAnnotationNote(annotation, state, renderInfo) {
    const color = PINFIX_COLOR_PRESETS[annotation.style.colorPreset].color;
    const position = getNotePosition(renderInfo);
    const summaryText = summariseNote(annotation.note) || t('noteMissingShort');
    const isEditing = annotation.id === state.editingAnnotationId;
    const card = document.createElement('div');
    card.className = `pinfix-note-card ${annotation.surfaceTone === 'dark' ? 'is-dark' : ''} ${annotation.id === state.highlightedAnnotationId ? 'is-focused' : ''}`;
    card.dataset.notesVisible = String(state.settings.notesVisible);
    card.style.left = `${position.left}px`;
    card.style.top = `${position.top}px`;
    card.style.width = `${position.width}px`;
    card.style.borderColor = `${color}66`;
    card.innerHTML = `
      <div class="pinfix-note-head">
        <div class="pinfix-note-badge" style="background:${color}">${annotation.number}</div>
        <strong class="pinfix-note-title">${escapeHtml(t('changeRequest'))}</strong>
        <button class="pinfix-note-delete" type="button" data-action="delete-annotation" data-id="${annotation.id}" title="${escapeHtml(t('actionDelete'))}" aria-label="${escapeHtml(t('actionDelete'))}">&times;</button>
      </div>
      <button class="pinfix-note-summary ${isEditing ? 'pinfix-hidden' : ''}" type="button" data-action="edit-annotation" data-id="${annotation.id}">${escapeHtml(summaryText)}</button>
      <textarea
        class="pinfix-note-input ${isEditing ? '' : 'pinfix-hidden'}"
        data-note-id="${annotation.id}"
        placeholder="${escapeHtml(t('notePlaceholder'))}"
      >${escapeHtml(annotation.note || '')}</textarea>
    `;
    noteLayer.appendChild(card);

    const input = card.querySelector('.pinfix-note-input');
    if (input) {
      autoGrow(input, 220);
    }
  }

  function getTemplateDisplayName(template) {
    const title = String(template && template.title ? template.title : '').trim();
    return title || t('templateUntitled');
  }

  function renderGlobalTemplateTabs(state) {
    const draftActive = state.globalNoteView === 'template' && !state.activeTemplateId && state.draftTemplate;
    return `
      <div class="pinfix-global-template-bar">
        <div class="pinfix-global-template-scroll">
          <button
            type="button"
            class="pinfix-global-template-chip ${state.globalNoteView === 'note' ? 'is-active' : ''}"
            data-action="show-global-note"
          >${escapeHtml(t('globalNoteTab'))}</button>
          ${state.templates.map((template) => `
            <button
              type="button"
              class="pinfix-global-template-chip ${state.globalNoteView === 'template' && state.activeTemplateId === template.id ? 'is-active' : ''}"
              data-action="show-global-template"
              data-id="${template.id}"
            >${escapeHtml(getTemplateDisplayName(template))}</button>
          `).join('')}
        </div>
        <button
          type="button"
          class="pinfix-global-template-add ${draftActive ? 'is-active' : ''}"
          data-action="create-global-template"
          aria-label="${escapeHtml(t('templateAdd'))}"
          title="${escapeHtml(t('templateAdd'))}"
        >+</button>
      </div>
    `;
  }

  function renderGlobalTemplateOptions(state) {
    if (!state.templates.length) {
      return `<div class="pinfix-global-empty">${escapeHtml(t('templateEmptyHint'))}</div>`;
    }

    const selectedIds = new Set(state.selectedTemplateIds || []);
    return `
      <div class="pinfix-global-template-options">
        ${state.templates.map((template) => {
          const selected = selectedIds.has(template.id);
          const preview = summariseNote(template.content) || t('templatePreviewEmpty');
          return `
            <button
              type="button"
              class="pinfix-global-template-option ${selected ? 'is-selected' : ''}"
              data-action="toggle-global-template-selection"
              data-id="${template.id}"
            >
              <span class="pinfix-global-template-option-check">${selected ? '&#10003;' : ''}</span>
              <span class="pinfix-global-template-option-body">
                <span class="pinfix-global-template-option-name">${escapeHtml(getTemplateDisplayName(template))}</span>
                <span class="pinfix-global-template-option-preview">${escapeHtml(preview)}</span>
              </span>
            </button>
          `;
        }).join('')}
      </div>
    `;
  }

  function renderGlobalTemplateEditor(state, panelHeight) {
    const draft = state.draftTemplate || { title: '', content: '' };
    return `
      <div class="pinfix-global-editor" data-template-editor="true">
        <div class="pinfix-global-helper">${escapeHtml(t('templateAutoSaveHint'))}</div>
        <div class="pinfix-global-field-label">${escapeHtml(t('templateTitleLabel'))}</div>
        <input
          class="pinfix-global-template-title"
          type="text"
          data-template-field="title"
          value="${escapeHtml(draft.title || '')}"
          placeholder="${escapeHtml(t('templateTitlePlaceholder'))}"
        />
        <div class="pinfix-global-field-label">${escapeHtml(t('templateContentLabel'))}</div>
        <textarea
          class="pinfix-global-input pinfix-global-template-content"
          data-template-field="content"
          data-max-height="${Math.max(280, window.innerHeight - 280)}"
          placeholder="${escapeHtml(t('templateContentPlaceholder'))}"
        >${escapeHtml(draft.content || '')}</textarea>
        ${state.activeTemplateId ? `
          <div class="pinfix-global-template-actions">
            <button
              type="button"
              class="pinfix-global-template-danger"
              data-action="delete-global-template"
              data-id="${state.activeTemplateId}"
            >${escapeHtml(t('templateDelete'))}</button>
          </div>
        ` : ''}
      </div>
    `;
  }

  function renderGlobalNoteBody(state, panelHeight) {
    return `
      <div class="pinfix-global-note-body">
        <div class="pinfix-global-helper">${escapeHtml(t('globalNoteMergeHint'))}</div>
        <textarea
          class="pinfix-global-input pinfix-global-note-input"
          data-global-note="true"
          data-max-height="${Math.max(140, Math.floor(panelHeight * 0.34))}"
          placeholder="${escapeHtml(t('globalNotesHint'))}"
        >${escapeHtml(state.globalNote || '')}</textarea>
      </div>
      <div class="pinfix-global-picker">
        <div class="pinfix-global-field-label">${escapeHtml(t('templateSelectionTitle'))}</div>
        ${renderGlobalTemplateOptions(state)}
      </div>
    `;
  }

  function renderGlobalNotes(state) {
    globalStrip.classList.toggle('pinfix-hidden', state.globalNoteOpen);
    globalPanel.classList.toggle('pinfix-hidden', !state.globalNoteOpen);
    globalStrip.textContent = t('globalNotes');
    globalStrip.classList.toggle('is-dark', state.pageTone === 'dark');
    globalPanel.classList.toggle('is-dark', state.pageTone === 'dark');

    if (!state.globalNoteOpen) {
      isResizingGlobalPanel = false;
      liveGlobalPanelHeight = 0;
      return;
    }

    const panelHeight = isResizingGlobalPanel && liveGlobalPanelHeight
      ? liveGlobalPanelHeight
      : state.globalNoteHeight;

    globalPanel.innerHTML = `
      <div class="pinfix-global-head">
        <strong>${escapeHtml(t('globalNotes'))}</strong>
        <button type="button" class="pinfix-note-delete" data-action="close-global">&times;</button>
      </div>
      ${renderGlobalTemplateTabs(state)}
      <div class="pinfix-global-content">
        ${state.globalNoteView === 'template'
          ? renderGlobalTemplateEditor(state, panelHeight)
          : renderGlobalNoteBody(state, panelHeight)}
      </div>
      <div class="pinfix-global-resize" data-role="resize-global"></div>
    `;
    globalPanel.style.height = `${panelHeight}px`;

    const noteTextarea = globalPanel.querySelector('[data-global-note="true"]');
    if (noteTextarea) {
      autoGrow(noteTextarea, Number(noteTextarea.dataset.maxHeight || 320));
    }

    const templateTextarea = globalPanel.querySelector('[data-template-field="content"]');
    if (templateTextarea) {
      autoGrow(templateTextarea, Number(templateTextarea.dataset.maxHeight || 240));
    }

    bindGlobalResize(panelHeight);
  }

  function bindGlobalResize(panelHeight) {
    if (resizeCleanup) {
      resizeCleanup();
      resizeCleanup = null;
    }

    const handle = globalPanel.querySelector('[data-role="resize-global"]');
    if (!handle) {
      return;
    }

    let startY = 0;
    let startHeight = panelHeight;

    const pointerMove = (event) => {
      const nextHeight = clamp(startHeight - (event.clientY - startY), 360, 680);
      liveGlobalPanelHeight = nextHeight;
      globalPanel.style.height = `${nextHeight}px`;
    };

    const pointerUp = () => {
      window.removeEventListener('pointermove', pointerMove, true);
      window.removeEventListener('pointerup', pointerUp, true);
      if (!isResizingGlobalPanel) {
        return;
      }

      isResizingGlobalPanel = false;
      if (liveGlobalPanelHeight) {
        options.onResizeGlobalNote(liveGlobalPanelHeight);
      }
      liveGlobalPanelHeight = 0;
    };

    handle.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      isResizingGlobalPanel = true;
      startY = event.clientY;
      startHeight = globalPanel.getBoundingClientRect().height;
      liveGlobalPanelHeight = startHeight;
      window.addEventListener('pointermove', pointerMove, true);
      window.addEventListener('pointerup', pointerUp, true);
    });

    resizeCleanup = pointerUp;
  }

  function renderToast(state) {
    if (!state.toast) {
      toast.classList.add('pinfix-hidden');
      toast.innerHTML = '';
      return;
    }

    const toastPayload = typeof state.toast === 'string'
      ? { message: state.toast }
      : state.toast;
    toast.classList.remove('pinfix-hidden');
    toast.classList.toggle('is-dark', state.pageTone === 'dark');
    toast.classList.toggle('is-success', toastPayload.tone === 'success');
    toast.innerHTML = `
      <span>${escapeHtml(toastPayload.message || '')}</span>
      ${toastPayload.actionName && toastPayload.actionLabel ? `
        <button type="button" data-action="run" data-name="${escapeHtml(toastPayload.actionName)}">
          ${escapeHtml(toastPayload.actionLabel)}
        </button>
      ` : ''}
    `;
  }

  function renderCountdown(state) {
    if (!state.captureMode) {
      countdown.classList.add('pinfix-hidden');
      countdown.textContent = '';
      return;
    }

    countdown.classList.remove('pinfix-hidden');
    countdown.classList.toggle('is-dark', state.pageTone === 'dark');
    countdown.innerHTML = `${escapeHtml(t('screenshotMode'))}<strong>${state.countdownRemaining}</strong>`;
  }

  function buildChipRow(settingKey, values, activeValue, formatter) {
    return `
      <div class="pinfix-chip-row">
        ${values
          .map((value) => {
            const result = formatter(value);
            return `
              <button
                class="pinfix-chip ${value === activeValue ? 'is-active' : ''}"
                type="button"
                data-action="set-setting"
                data-key="${settingKey}"
                data-value="${value}"
              >${result}</button>
            `;
          })
          .join('')}
      </div>
    `;
  }

  function buildAnnotationSidecarContent(state) {
    const items = state.annotations.length
      ? state.annotations.map((annotation) => {
        const noteText = String(annotation.note || '').trim();
        const hasNote = Boolean(noteText);
        const summary = noteText || t('noteMissingShort');
        return `
          <button
            class="pinfix-sidecar-item ${hasNote ? '' : 'is-missing'}"
            type="button"
            data-action="focus-annotation"
            data-id="${annotation.id}"
          >
            <span class="pinfix-sidecar-number">${annotation.number}</span>
            <span class="pinfix-sidecar-body">
              <strong>${escapeHtml(summary)}</strong>
              <small>${escapeHtml(t(hasNote ? 'noteReadyShort' : 'noteMissingStatus'))}</small>
            </span>
          </button>
        `;
      }).join('')
      : `<div class="pinfix-sidecar-empty">${escapeHtml(t('emptyState'))}</div>`;

    return `
      <div class="pinfix-sidecar-title">
        <span>${escapeHtml(t('annotationList'))}</span>
        <span>${state.annotations.length}</span>
      </div>
      <div class="pinfix-sidecar-list">${items}</div>
    `;
  }

  function buildPopoverContent(state) {
    if (state.activePopover === 'style') {
      return `
        <h3>${escapeHtml(t('style'))}</h3>
        <div class="pinfix-section">
          <div class="pinfix-section-title">${escapeHtml(t('styleColor'))}</div>
          ${buildChipRow('colorPreset', Object.keys(PINFIX_COLOR_PRESETS), state.settings.colorPreset, (key) => {
            const item = PINFIX_COLOR_PRESETS[key];
            const labelKey = `color${key.charAt(0).toUpperCase()}${key.slice(1)}`;
            return `<span class="pinfix-color-dot" style="background:${item.color}"></span> ${escapeHtml(t(labelKey))}`;
          })}
        </div>
        <div class="pinfix-section">
          <div class="pinfix-section-title">${escapeHtml(t('styleWidth'))}</div>
          ${buildChipRow('lineWidth', Object.keys(PINFIX_LINE_WIDTHS), state.settings.lineWidth, (key) => escapeHtml(t(`width${key.charAt(0).toUpperCase()}${key.slice(1)}`)))}
        </div>
        <div class="pinfix-section">
          <div class="pinfix-section-title">${escapeHtml(t('styleLabelSize'))}</div>
          ${buildChipRow('labelSize', Object.keys(PINFIX_LABEL_SIZES), state.settings.labelSize, (key) => escapeHtml(t(`size${key.charAt(0).toUpperCase()}${key.slice(1)}`)))}
        </div>
        <div class="pinfix-section">
          <div class="pinfix-section-title">${escapeHtml(t('styleLabelStyle'))}</div>
          ${buildChipRow('labelStyle', Object.keys(PINFIX_LABEL_STYLES), state.settings.labelStyle, (key) => t(key === 'solid' ? 'styleSolid' : 'styleRing'))}
        </div>
        <div class="pinfix-section">
          <div class="pinfix-section-title">${escapeHtml(t('styleBoxPadding'))}</div>
          ${buildChipRow('boxPadding', Object.keys(PINFIX_BOX_PADDING_OPTIONS), state.settings.boxPadding, (key) => escapeHtml(t(`padding${key.charAt(0).toUpperCase()}${key.slice(1)}`)))}
        </div>
        <div class="pinfix-section">
          <div class="pinfix-section-title">${escapeHtml(t('styleContrast'))}</div>
          ${buildChipRow('contrastMode', ['auto', 'light', 'dark'], state.settings.contrastMode, (key) => t(`contrast${key.charAt(0).toUpperCase()}${key.slice(1)}`))}
        </div>
      `;
    }

    if (state.activePopover === 'capture') {
      const reviewState = state.reviewSummary || { missingCount: 0, maskCount: 0, ready: true };
      const reviewMarkup = reviewState.ready
        ? `<div class="pinfix-meta-copy pinfix-status-good">${escapeHtml(t('reviewReady'))}</div>`
        : `
          <div class="pinfix-meta-copy pinfix-status-warn">
            <div>${escapeHtml(fillTemplate(t('reviewMissing'), { count: reviewState.missingCount }))}</div>
            <div>${escapeHtml(fillTemplate(t('reviewMissingList'), { numbers: reviewState.missingNumbers.join(', ') }))}</div>
          </div>
        `;
      return `
        <h3>${escapeHtml(t('capture'))}</h3>
        <div class="pinfix-list">
          <button type="button" data-action="run" data-name="screenshot-mode">${escapeHtml(t('screenshotMode'))}</button>
          <button type="button" data-action="run" data-name="export-image">${escapeHtml(t('saveLocally'))}</button>
          <button type="button" data-action="run" data-name="copy-image">${escapeHtml(t('copyImage'))}</button>
        </div>
        <div class="pinfix-divider"></div>
        <div class="pinfix-section-title">${escapeHtml(t('reviewStatus'))}</div>
        ${reviewMarkup}
        <div class="pinfix-divider"></div>
        <div class="pinfix-section-title">${escapeHtml(t('countdown'))}</div>
        ${buildChipRow('countdown', PINFIX_COUNTDOWN_OPTIONS, state.settings.countdown, (value) => `${value}s`)}
        <div class="pinfix-section" style="font-size:12px;color:#64748b;">
          ${escapeHtml(t('exportLimit'))}
        </div>
      `;
    }

    const noteToggleKey = state.settings.notesVisible ? 'notesOff' : 'notesOn';
    const reviewState = state.reviewSummary || { missingCount: 0, maskCount: 0, ready: true };
    const annotationListLabel = fillTemplate(t('viewAnnotationList'), {
      count: state.annotations.length
    });

    const reviewBlock = reviewState.ready
      ? `<div class="pinfix-meta-copy pinfix-status-good">${escapeHtml(t('reviewReady'))}</div>`
      : `
        <div class="pinfix-meta-copy pinfix-status-warn">
          <div>${escapeHtml(fillTemplate(t('reviewMissing'), { count: reviewState.missingCount }))}</div>
          <div>${escapeHtml(fillTemplate(t('reviewMissingList'), { numbers: reviewState.missingNumbers.join(', ') }))}</div>
        </div>
      `;

    const maskButtonKey = state.selectionMode === 'mask' ? 'privacyModeStop' : 'privacyModeStart';
    const hotkeysOpen = Boolean(state.expandedSections && state.expandedSections.hotkeys);

    return `
      <h3>${escapeHtml(t('more'))}</h3>
      <div class="pinfix-list">
        <button type="button" data-action="run" data-name="undo">${escapeHtml(t('undo'))}</button>
        <button type="button" data-action="run" data-name="toggle-notes">${escapeHtml(t(noteToggleKey))}</button>
      </div>
      <div class="pinfix-divider"></div>
      <div class="pinfix-section-title">${escapeHtml(t('dangerZone'))}</div>
      <div class="pinfix-list pinfix-list-stack">
        <button class="pinfix-danger-action" type="button" data-action="run" data-name="clear-page">${escapeHtml(t('clearAllPageData'))}</button>
      </div>
      <div class="pinfix-meta-copy pinfix-danger-hint">${escapeHtml(t('clearAllHint'))}</div>
      <div class="pinfix-divider"></div>
      <div class="pinfix-section-title">${escapeHtml(t('privacyMode'))}</div>
      <div class="pinfix-list">
        <button type="button" data-action="run" data-name="toggle-mask-mode">${escapeHtml(t(maskButtonKey))}</button>
        <button type="button" data-action="run" data-name="clear-masks">${escapeHtml(t('clearMasks'))}</button>
      </div>
      <div class="pinfix-meta-copy">
        <div>${escapeHtml(t('privacyHint'))}</div>
        <div>${escapeHtml(fillTemplate(t('reviewMasks'), { count: reviewState.maskCount }))}</div>
      </div>
      <div class="pinfix-divider"></div>
      <div class="pinfix-section-title">${escapeHtml(t('reviewStatus'))}</div>
      ${reviewBlock}
      <div class="pinfix-divider"></div>
      <div class="pinfix-section-title">${escapeHtml(t('language'))}</div>
      ${buildChipRow('language', ['auto', 'zh-CN', 'en'], state.settings.language, (value) => {
        if (value === 'auto') return t('languageAuto');
        if (value === 'zh-CN') return t('languageZh');
        return t('languageEn');
      })}
      <div class="pinfix-divider"></div>
      <button
        class="pinfix-section-toggle"
        type="button"
        data-action="toggle-section"
        data-section="hotkeys"
      >
        <span>${escapeHtml(t('hotkeys'))}</span>
        <span>${escapeHtml(t(hotkeysOpen ? 'collapse' : 'expand'))}</span>
      </button>
      <div class="pinfix-meta-copy ${hotkeysOpen ? '' : 'pinfix-hidden'}">
        <div>${escapeHtml(t('hotkeyCopy'))}</div>
        <div>${escapeHtml(t('hotkeyScreenshot'))}</div>
        <div>${escapeHtml(t('hotkeyExport'))}</div>
        <div>${escapeHtml(t('hotkeyUndo'))}</div>
        <div>${escapeHtml(t('hotkeyNotes'))}</div>
      </div>
      <div class="pinfix-divider"></div>
      <div class="pinfix-section-title">${escapeHtml(t('annotationList'))}</div>
      <button
        class="pinfix-annotation-sidecar-trigger"
        type="button"
        data-action="toggle-annotation-sidecar"
        aria-expanded="${sidecarOpen && sidecarLocked ? 'true' : 'false'}"
      >
        <span>${escapeHtml(annotationListLabel)}</span>
        <span>${escapeHtml(t(sidecarOpen ? 'collapse' : 'expand'))}</span>
      </button>
      <div class="pinfix-meta-copy">${escapeHtml(t('annotationListHint'))}</div>
    `;
  }

  return {
    mount,
    unmount,
    render
  };
}

function createPinFixApp() {
  const i18n = createI18n();
  const storage = createStorage();
  let toastTimer = null;
  let countdownTimer = null;
  let focusTimer = null;
  let refreshScheduled = false;
  let lastScreenshotBlob = null;
  let lastUrl = storage.normaliseUrl(window.location.href);
  let routeWatcherAttached = false;

  const state = {
    open: false,
    tool: 'select',
    selectionMode: 'annotate',
    selectionActive: true,
    activePopover: null,
    captureMode: false,
    captureHidden: false,
    countdownRemaining: 0,
    candidate: null,
    candidateElement: null,
    annotations: [],
    masks: [],
    templates: storage.loadTemplates().map((template) => hydrateTemplate(template)),
    selectedTemplateIds: [],
    globalNote: '',
    globalNoteOpen: false,
    globalNoteHeight: 380,
    globalNoteView: 'note',
    activeTemplateId: '',
    draftTemplate: null,
    toast: '',
    history: [],
    highlightedAnnotationId: '',
    activeAnnotationId: '',
    editingAnnotationId: '',
    expandedSections: {
      hotkeys: false
    },
    pendingActionConfirm: null,
    pageTone: 'light',
    settings: storage.loadGlobalSettings()
  };

  const ui = createUI({
    getLanguage: () => i18n.resolveLanguage(state.settings.language),
    t: (language, key) => i18n.t(language, key),
    onToggleOpen: () => toggleOpen(),
    onClosePopover: () => {
      state.activePopover = null;
      render();
    },
    onToggleGlobal: (next) => toggleGlobalPanel(next),
    onHideNotes: () => hideAnnotationNotes(),
    onTool: (tool) => handleTool(tool),
    onQuickScreenshot: () => quickScreenshot(),
    onSetSetting: (key, value) => updateSetting(key, value),
    onRun: (name) => runNamedAction(name),
    onDeleteAnnotation: (id) => deleteAnnotation(id),
    onDeleteMask: (id) => deleteMask(id),
    onActivateAnnotation: (id) => activateAnnotation(id, true),
    onFocusAnnotation: (id) => focusAnnotation(id),
    onEditAnnotation: (id) => editAnnotation(id),
    onMaskAnnotation: (id) => maskAnnotation(id),
    onAdjustMask: (id, delta) => adjustMask(id, delta),
    onToggleSection: (section) => toggleSection(section),
    onCandidateAdjust: (direction) => adjustCandidate(direction),
    onCandidatePick: (kind) => addCandidateSelection(kind),
    onChangeNote: (id, value, saveNow) => updateNote(id, value, saveNow),
    onChangeGlobalNote: (value) => updateGlobalNote(value),
    onShowGlobalNoteView: () => showGlobalNoteView(),
    onShowGlobalTemplate: (id) => showGlobalTemplate(id),
    onCreateGlobalTemplate: () => createGlobalTemplateDraft(),
    onChangeGlobalTemplateDraft: (field, value) => updateGlobalTemplateDraft(field, value),
    onCommitGlobalTemplate: (shouldRender) => commitGlobalTemplateDraft(shouldRender),
    onDeleteGlobalTemplate: (id) => deleteGlobalTemplate(id),
    onToggleGlobalTemplateSelection: (id) => toggleGlobalTemplateSelection(id),
    onResizeGlobalNote: (height) => {
      state.globalNoteHeight = height;
      savePageData();
    }
  });

  const selector = createSelectorManager({
    isIgnored: (element) => Boolean(element.closest('#pinfix-root, [data-pinfix-ignore="true"]')),
    getSelectionMode: () => state.selectionMode,
    isSelectionActive: () => state.selectionActive,
    onCandidateChange: ({ element }) => {
      state.candidateElement = element || null;
      state.candidate = element ? captureElementRect(element) : null;
      render();
    },
    onSelect: (element) => addSelectionItem(element)
  });

  function setSelectionActive(active) {
    state.selectionActive = Boolean(active);
    if (!state.selectionActive) {
      clearCandidate();
    } else if (selector.isEnabled()) {
      selector.refresh();
    }
  }

  const exporters = createExporters({
    beforeCapture: async () => {
      savePageData();
      state.captureHidden = true;
      state.activePopover = null;
      render();
    },
    afterCapture: async () => {
      state.captureHidden = state.captureMode;
      render();
    }
  });

  function getLanguage() {
    return i18n.resolveLanguage(state.settings.language);
  }

  function t(key, values) {
    const template = i18n.t(getLanguage(), key);
    return values ? fillTemplate(template, values) : template;
  }

  function getReviewSummary() {
    return getAnnotationReviewSummary(state.annotations, state.masks);
  }

  function hydrateTemplate(template) {
    const now = Date.now();
    return {
      id: template && template.id ? template.id : createId('template'),
      title: template && typeof template.title === 'string' ? template.title : '',
      content: template && typeof template.content === 'string' ? template.content : '',
      createdAt: template && Number.isFinite(Number(template.createdAt)) ? Number(template.createdAt) : now,
      updatedAt: template && Number.isFinite(Number(template.updatedAt)) ? Number(template.updatedAt) : now
    };
  }

  function saveTemplates() {
    storage.saveTemplates(state.templates);
  }

  function hasTemplateDraftContent(template) {
    if (!template) {
      return false;
    }

    return Boolean(String(template.title || '').trim() || String(template.content || '').trim());
  }

  function getValidSelectedTemplateIds(templateIds) {
    const validIds = new Set(state.templates.map((template) => template.id));
    const result = [];
    (Array.isArray(templateIds) ? templateIds : []).forEach((templateId) => {
      if (!validIds.has(templateId) || result.includes(templateId)) {
        return;
      }
      result.push(templateId);
    });
    return result;
  }

  function getCombinedBusinessNote() {
    const parts = [];
    const noteText = String(state.globalNote || '').trim();
    if (noteText) {
      parts.push(noteText);
    }

    state.templates.forEach((template) => {
      if (!state.selectedTemplateIds.includes(template.id)) {
        return;
      }
      const content = String(template.content || '').trim();
      if (content) {
        parts.push(content);
      }
    });

    return parts.join('\n');
  }

  function loadPageData() {
    const pageData = storage.loadPageData(window.location.href);
    state.settings = {
      ...state.settings,
      ...pageData.pageSettings
    };
    state.annotations = (pageData.annotations || []).map((annotation) => hydrateAnnotation(annotation));
    state.masks = (pageData.masks || []).map((mask) => hydrateMask(mask));
    state.globalNote = pageData.globalNote || '';
    state.selectedTemplateIds = getValidSelectedTemplateIds(pageData.selectedTemplateIds);
    state.activeAnnotationId = '';
    state.editingAnnotationId = '';
    state.globalNoteView = 'note';
    state.activeTemplateId = '';
    state.draftTemplate = null;
    state.globalNoteHeight = pageData.pageSettings && pageData.pageSettings.globalNoteHeight
      ? Math.max(pageData.pageSettings.globalNoteHeight, 360)
      : state.globalNoteHeight;
    state.pageTone = detectSurfaceTone(document.body, state.settings.contrastMode);
  }

  function hydrateAnnotation(annotation) {
    const filled = {
      id: annotation.id || createId('annotation'),
      number: annotation.number || 1,
      note: annotation.note || '',
      anchor: annotation.anchor || null,
      rect: annotation.rect || (annotation.anchor ? annotation.anchor.rect : null),
      style: {
        colorPreset: annotation.style && annotation.style.colorPreset ? annotation.style.colorPreset : state.settings.colorPreset,
        lineWidth: annotation.style && annotation.style.lineWidth ? annotation.style.lineWidth : state.settings.lineWidth,
        labelSize: annotation.style && annotation.style.labelSize ? annotation.style.labelSize : state.settings.labelSize,
        labelStyle: annotation.style && annotation.style.labelStyle ? annotation.style.labelStyle : state.settings.labelStyle,
        boxPadding: annotation.style && annotation.style.boxPadding ? annotation.style.boxPadding : state.settings.boxPadding
      },
      surfaceTone: annotation.surfaceTone || 'light'
    };

    const resolved = resolveAnnotationRect(filled);
    if (resolved.rect) {
      filled.rect = resolved.rect;
    }
    if (resolved.element) {
      filled.surfaceTone = detectSurfaceTone(resolved.element, state.settings.contrastMode);
    }

    return filled;
  }

  function hydrateMask(mask) {
    const filled = {
      id: mask.id || createId('mask'),
      anchor: mask.anchor || null,
      rect: mask.rect || (mask.anchor ? mask.anchor.rect : null)
    };

    const resolved = resolveAnnotationRect(filled);
    if (resolved.rect) {
      filled.rect = resolved.rect;
    }

    return filled;
  }

  function saveGlobalSettings() {
    storage.saveGlobalSettings(state.settings);
  }

  function savePageData() {
    storage.savePageData(window.location.href, {
      annotations: state.annotations,
      masks: state.masks,
      globalNote: state.globalNote,
      selectedTemplateIds: state.selectedTemplateIds,
      pageSettings: {
        colorPreset: state.settings.colorPreset,
        lineWidth: state.settings.lineWidth,
        labelSize: state.settings.labelSize,
        labelStyle: state.settings.labelStyle,
        boxPadding: state.settings.boxPadding,
        contrastMode: state.settings.contrastMode,
        countdown: state.settings.countdown,
        notesVisible: state.settings.notesVisible,
        globalNoteHeight: state.globalNoteHeight
      }
    });
  }

  function render() {
    state.reviewSummary = getReviewSummary();
    ui.render(state);
  }

  function showToast(keyOrText, toastOptions = {}) {
    const translated = i18n.t(getLanguage(), keyOrText);
    state.toast = {
      message: translated === keyOrText ? keyOrText : translated,
      actionName: toastOptions.actionName || '',
      actionLabel: toastOptions.actionLabelKey ? i18n.t(getLanguage(), toastOptions.actionLabelKey) : '',
      tone: toastOptions.tone || ''
    };
    render();

    if (toastTimer) {
      window.clearTimeout(toastTimer);
    }

    toastTimer = window.setTimeout(() => {
      state.toast = '';
      render();
    }, toastOptions.duration || 1800);
  }

  function takeHistorySnapshot() {
    state.history.push({
      annotations: JSON.parse(JSON.stringify(state.annotations)),
      masks: JSON.parse(JSON.stringify(state.masks)),
      globalNote: state.globalNote,
      selectedTemplateIds: [...state.selectedTemplateIds]
    });

    if (state.history.length > 30) {
      state.history.shift();
    }
  }

  function renumberAnnotations() {
    state.annotations.forEach((annotation, index) => {
      annotation.number = index + 1;
    });
  }

  function refreshAnnotations() {
    state.pageTone = detectSurfaceTone(document.body, state.settings.contrastMode);
    state.annotations = state.annotations.map((annotation) => hydrateAnnotation(annotation));
    state.masks = state.masks.map((mask) => hydrateMask(mask));
    if (selector.isEnabled()) {
      selector.refresh();
    }
    render();
  }

  function scheduleRefreshAnnotations() {
    if (refreshScheduled) {
      return;
    }

    refreshScheduled = true;
    window.requestAnimationFrame(() => {
      refreshScheduled = false;
      refreshAnnotations();
    });
  }

  function clearPendingActionConfirm() {
    state.pendingActionConfirm = null;
  }

  function clearCandidate() {
    state.candidate = null;
    state.candidateElement = null;
  }

  function hideAnnotationNotes() {
    if (!state.activeAnnotationId && !state.editingAnnotationId) {
      return;
    }

    state.activeAnnotationId = '';
    state.editingAnnotationId = '';
    savePageData();
    render();
  }

  function markAnnotationFocused(id) {
    state.highlightedAnnotationId = id;

    if (focusTimer) {
      window.clearTimeout(focusTimer);
    }

    focusTimer = window.setTimeout(() => {
      state.highlightedAnnotationId = '';
      if (state.editingAnnotationId !== id) {
        render();
      }
    }, 1800);
  }

  function addSelectionItem(element) {
    if (state.selectionMode === 'mask') {
      addMask(element);
      return;
    }

    addAnnotation(element);
  }

  function adjustCandidate(direction) {
    if (Number(direction) < 0) {
      selector.shrink();
      return;
    }

    selector.expand();
  }

  function addCandidateSelection(kind) {
    if (!state.candidateElement) {
      return;
    }

    if (kind === 'mask') {
      addMask(state.candidateElement);
      return;
    }

    addAnnotation(state.candidateElement);
  }

  function findExistingAnnotation(anchor, rect) {
    return state.annotations.find((annotation) => {
      const sameSelector = anchor.selector && annotation.anchor && annotation.anchor.selector === anchor.selector;
      return sameSelector || rectsRoughlyMatch(annotation.rect, rect);
    }) || null;
  }

  function hasExistingMask(anchor, rect) {
    return state.masks.some((mask) => {
      const sameSelector = anchor.selector && mask.anchor && mask.anchor.selector === anchor.selector;
      return sameSelector || rectsRoughlyMatch(mask.rect, rect);
    });
  }

  function addAnnotation(element) {
    const anchor = buildElementAnchor(element);
    const existing = findExistingAnnotation(anchor, anchor.rect);
    if (existing) {
      focusAnnotation(existing.id);
      showToast('annotationExists');
      return;
    }

    takeHistorySnapshot();
    clearPendingActionConfirm();

    const annotation = {
      id: createId('annotation'),
      number: state.annotations.length + 1,
      note: '',
      anchor,
      rect: anchor.rect,
      surfaceTone: detectSurfaceTone(element, state.settings.contrastMode),
      style: {
        colorPreset: state.settings.colorPreset,
        lineWidth: state.settings.lineWidth,
        labelSize: state.settings.labelSize,
        labelStyle: state.settings.labelStyle,
        boxPadding: state.settings.boxPadding
      }
    };

    state.annotations.push(annotation);
    state.activeAnnotationId = annotation.id;
    state.editingAnnotationId = annotation.id;
    state.settings.notesVisible = true;
    clearCandidate();
    saveGlobalSettings();
    savePageData();
    render();
  }

  function addMask(element) {
    const anchor = buildElementAnchor(element);
    if (hasExistingMask(anchor, anchor.rect)) {
      showToast('maskExists');
      return;
    }

    takeHistorySnapshot();
    clearPendingActionConfirm();
    state.masks.push({
      id: createId('mask'),
      anchor,
      rect: anchor.rect
    });
    state.selectionMode = 'annotate';
    state.activePopover = null;
    clearCandidate();

    savePageData();
    render();
    showToast('privacyMaskAdded');
  }

  function updateNote(id, value, saveNow) {
    const annotation = state.annotations.find((item) => item.id === id);
    if (!annotation) {
      return;
    }

    annotation.note = value;
    clearPendingActionConfirm();
    if (saveNow) {
      savePageData();
    }
  }

  function activateAnnotation(id, editNow) {
    const annotation = state.annotations.find((item) => item.id === id);
    if (!annotation) {
      return;
    }

    // Only one note panel should be open at a time, so dense annotations do not cover the page.
    state.activeAnnotationId = id;
    state.editingAnnotationId = editNow ? id : '';
    state.settings.notesVisible = true;
    state.activePopover = null;
    markAnnotationFocused(id);
    saveGlobalSettings();
    savePageData();
    render();
  }

  function editAnnotation(id) {
    activateAnnotation(id, true);
  }

  function maskAnnotation(id) {
    const annotation = state.annotations.find((item) => item.id === id);
    if (!annotation) {
      return;
    }

    if (hasExistingMask(annotation.anchor || {}, annotation.rect)) {
      showToast('maskExists');
      return;
    }

    takeHistorySnapshot();
    state.masks.push({
      id: createId('mask'),
      anchor: annotation.anchor,
      rect: { ...annotation.rect }
    });
    clearPendingActionConfirm();
    savePageData();
    render();
    showToast('privacyMaskAdded');
  }

  function adjustMask(id, delta) {
    const mask = state.masks.find((item) => item.id === id);
    if (!mask || !mask.rect) {
      return;
    }

    const amount = Number(delta);
    const nextWidth = mask.rect.width + amount * 2;
    const nextHeight = mask.rect.height + amount * 2;
    if (nextWidth < 16 || nextHeight < 16) {
      return;
    }

    takeHistorySnapshot();
    mask.rect = {
      ...mask.rect,
      pageLeft: Math.max(0, mask.rect.pageLeft - amount),
      pageTop: Math.max(0, mask.rect.pageTop - amount),
      width: nextWidth,
      height: nextHeight
    };
    mask.anchor = null;
    clearPendingActionConfirm();
    savePageData();
    render();
  }

  function updateGlobalNote(value) {
    state.globalNote = value;
    clearPendingActionConfirm();
    savePageData();
  }

  function toggleGlobalPanel(next) {
    const nextOpen = typeof next === 'boolean' ? next : !state.globalNoteOpen;
    state.globalNoteOpen = nextOpen;
    if (nextOpen) {
      state.globalNoteView = 'note';
      state.activeTemplateId = '';
      state.draftTemplate = null;
    }
    render();
  }

  function showGlobalNoteView() {
    state.globalNoteView = 'note';
    state.activeTemplateId = '';
    state.draftTemplate = null;
    render();
  }

  function showGlobalTemplate(id) {
    const template = state.templates.find((item) => item.id === id);
    if (!template) {
      return;
    }

    state.globalNoteView = 'template';
    state.activeTemplateId = id;
    state.draftTemplate = {
      title: template.title,
      content: template.content
    };
    render();
  }

  function createGlobalTemplateDraft() {
    state.globalNoteView = 'template';
    state.activeTemplateId = '';
    state.draftTemplate = {
      title: '',
      content: ''
    };
    render();
  }

  function updateGlobalTemplateDraft(field, value) {
    if (!state.draftTemplate) {
      state.draftTemplate = {
        title: '',
        content: ''
      };
    }

    state.draftTemplate[field] = value;
    clearPendingActionConfirm();
  }

  function commitGlobalTemplateDraft(shouldRender = true) {
    if (!state.draftTemplate) {
      return;
    }

    const draft = {
      title: typeof state.draftTemplate.title === 'string' ? state.draftTemplate.title : '',
      content: typeof state.draftTemplate.content === 'string' ? state.draftTemplate.content : ''
    };

    if (!state.activeTemplateId) {
      if (!hasTemplateDraftContent(draft)) {
        state.draftTemplate = null;
        state.globalNoteView = 'note';
        if (shouldRender) {
          render();
        }
        return;
      }

      const now = Date.now();
      const template = hydrateTemplate({
        id: createId('template'),
        title: draft.title,
        content: draft.content,
        createdAt: now,
        updatedAt: now
      });
      state.templates.push(template);
      state.activeTemplateId = template.id;
      state.draftTemplate = {
        title: template.title,
        content: template.content
      };
      saveTemplates();
      if (shouldRender) {
        render();
      }
      return;
    }

    const template = state.templates.find((item) => item.id === state.activeTemplateId);
    if (!template) {
      state.draftTemplate = null;
      state.globalNoteView = 'note';
      state.activeTemplateId = '';
      if (shouldRender) {
        render();
      }
      return;
    }

    if (template.title === draft.title && template.content === draft.content) {
      return;
    }

    template.title = draft.title;
    template.content = draft.content;
    template.updatedAt = Date.now();
    saveTemplates();
    if (shouldRender) {
      render();
    }
  }

  function deleteGlobalTemplate(id) {
    const template = state.templates.find((item) => item.id === id);
    if (!template) {
      return;
    }

    if (!window.confirm(i18n.t(getLanguage(), 'templateDeleteConfirm'))) {
      return;
    }

    state.templates = state.templates.filter((item) => item.id !== id);
    state.selectedTemplateIds = state.selectedTemplateIds.filter((templateId) => templateId !== id);
    state.activeTemplateId = '';
    state.draftTemplate = null;
    state.globalNoteView = 'note';
    saveTemplates();
    savePageData();
    render();
  }

  function toggleGlobalTemplateSelection(id) {
    if (!state.templates.some((template) => template.id === id)) {
      return;
    }

    if (state.selectedTemplateIds.includes(id)) {
      state.selectedTemplateIds = state.selectedTemplateIds.filter((templateId) => templateId !== id);
    } else {
      state.selectedTemplateIds = [...state.selectedTemplateIds, id];
    }

    state.selectedTemplateIds = getValidSelectedTemplateIds(state.selectedTemplateIds);
    clearPendingActionConfirm();
    savePageData();
    render();
  }

  function deleteAnnotation(id) {
    takeHistorySnapshot();
    state.annotations = state.annotations.filter((item) => item.id !== id);
    if (state.activeAnnotationId === id) {
      state.activeAnnotationId = '';
    }
    if (state.editingAnnotationId === id) {
      state.editingAnnotationId = '';
    }
    renumberAnnotations();
    clearPendingActionConfirm();
    savePageData();
    render();
    showToast('deleted');
  }

  function deleteMask(id) {
    takeHistorySnapshot();
    state.masks = state.masks.filter((item) => item.id !== id);
    clearPendingActionConfirm();
    savePageData();
    render();
  }

  function clearPage() {
    if (!window.confirm(i18n.t(getLanguage(), 'clearConfirm'))) {
      return;
    }

    takeHistorySnapshot();
    state.annotations = [];
    state.masks = [];
    state.globalNote = '';
    state.selectedTemplateIds = [];
    state.activeAnnotationId = '';
    state.editingAnnotationId = '';
    clearPendingActionConfirm();
    savePageData();
    render();
    showToast('pageCleared');
  }

  function clearMasks() {
    if (!state.masks.length) {
      return;
    }

    if (!window.confirm(i18n.t(getLanguage(), 'clearMasksConfirm'))) {
      return;
    }

    takeHistorySnapshot();
    state.masks = [];
    clearPendingActionConfirm();
    savePageData();
    render();
    showToast('privacyMasksCleared');
  }

  function undo() {
    const snapshot = state.history.pop();
    if (!snapshot) {
      return;
    }

    state.annotations = snapshot.annotations.map((annotation) => hydrateAnnotation(annotation));
    state.masks = (snapshot.masks || []).map((mask) => hydrateMask(mask));
    state.globalNote = snapshot.globalNote;
    state.selectedTemplateIds = getValidSelectedTemplateIds(snapshot.selectedTemplateIds);
    state.activeAnnotationId = '';
    state.editingAnnotationId = '';
    clearPendingActionConfirm();
    savePageData();
    render();
    showToast('restored');
  }

  function focusAnnotation(id) {
    const annotation = state.annotations.find((item) => item.id === id);
    if (!annotation) {
      return;
    }

    const top = Math.max(annotation.rect.pageTop - 120, 0);
    window.scrollTo({ top, behavior: 'smooth' });
    state.activeAnnotationId = id;
    state.settings.notesVisible = true;
    state.activePopover = null;
    markAnnotationFocused(id);
    saveGlobalSettings();
    savePageData();
    render();
    showToast('focusDone');
  }

  function toggleOpen(forceValue) {
    const nextOpen = typeof forceValue === 'boolean' ? forceValue : !state.open;
    if (!nextOpen) {
      savePageData();
    }
    state.open = nextOpen;
    state.activePopover = null;
    state.tool = state.settings.lastTool || 'select';
    setSelectionActive(true);

    if (nextOpen && state.tool === 'select') {
      selector.enable();
    } else {
      selector.disable();
      state.selectionMode = 'annotate';
      if (!nextOpen) {
        if (countdownTimer) {
          window.clearInterval(countdownTimer);
          countdownTimer = null;
        }
        state.activeAnnotationId = '';
        state.editingAnnotationId = '';
        state.globalNoteOpen = false;
        state.captureMode = false;
        state.captureHidden = false;
        state.countdownRemaining = 0;
        state.toast = '';
        setSelectionActive(false);
        clearCandidate();
      }
    }

    render();
  }

  function handleTool(tool) {
    if (!state.open) {
      state.open = true;
    }

    if (tool === 'copy') {
      copyNotes();
      return;
    }

    if (tool === 'select') {
      state.tool = 'select';
      state.settings.lastTool = 'select';
      state.activePopover = null;
      state.selectionMode = 'annotate';
      setSelectionActive(selector.isEnabled() ? !state.selectionActive : true);
      if (state.selectionActive) {
        selector.enable();
        selector.refresh();
      } else {
        setSelectionActive(false);
      }
      saveGlobalSettings();
      render();
      return;
    }

    selector.disable();
    setSelectionActive(false);
    state.tool = tool;
    state.settings.lastTool = tool;
    state.activePopover = state.activePopover === tool ? null : tool;
    saveGlobalSettings();
    render();
  }

  function updateSetting(key, value) {
    const nextValue = key === 'countdown' ? Number(value) : value;
    state.settings[key] = nextValue;
    saveGlobalSettings();
    savePageData();

    if (key === 'contrastMode') {
      refreshAnnotations();
      return;
    }

    render();
  }

  function confirmProceedWithIncompleteNotes(actionName) {
    const summary = getReviewSummary();
    if (!summary.missingCount) {
      clearPendingActionConfirm();
      return true;
    }

    const now = Date.now();
    const confirmed = state.pendingActionConfirm
      && state.pendingActionConfirm.actionName === actionName
      && state.pendingActionConfirm.expiresAt > now;

    if (confirmed) {
      clearPendingActionConfirm();
      return true;
    }

    state.pendingActionConfirm = {
      actionName,
      expiresAt: now + 5000
    };
    showToast(t('reviewContinue', { count: summary.missingCount }));
    return false;
  }

  function setSelectionMode(mode) {
    state.selectionMode = mode;
    setSelectionActive(true);
    state.tool = 'select';
    state.settings.lastTool = 'select';
    state.activePopover = null;
    state.open = true;
    selector.enable();
    saveGlobalSettings();
    render();
  }

  function toggleSection(section) {
    state.expandedSections[section] = !state.expandedSections[section];
    render();
  }

  function togglePrivacyMode() {
    if (state.selectionMode === 'mask') {
      state.selectionMode = 'annotate';
      setSelectionActive(true);
      render();
      showToast('privacyModeOff');
      return;
    }

    setSelectionMode('mask');
    showToast('privacyModeOn');
  }

  async function copyNotes() {
    const businessNote = getCombinedBusinessNote();
    if (!state.annotations.length && !businessNote) {
      showToast('nothingToCopy');
      return;
    }

    if (!confirmProceedWithIncompleteNotes('copy-notes')) {
      return;
    }

    try {
      savePageData();
      await exporters.copyNotes({
        language: getLanguage(),
        i18n,
        annotations: state.annotations,
        businessNote
      });
      showToast('copiedNotes');
    } catch (error) {
      showToast('copyFailed');
    }
  }

  async function exportImage(preferClipboard) {
    if (!confirmProceedWithIncompleteNotes(preferClipboard ? 'copy-image' : 'export-image')) {
      return;
    }

    try {
      const result = await exporters.exportViewportImage({
        preferClipboard
      });
      lastScreenshotBlob = result.blob || null;
      if (preferClipboard) {
        showToast(result.copied ? 'copiedImage' : 'screenshotDownloadedFallback', {
          duration: result.copied ? 1800 : 6500,
          tone: result.copied ? '' : 'success'
        });
        return;
      }

      showToast('downloadedImage');
    } catch (error) {
      showToast(i18n.t(getLanguage(), 'exportLimit'));
    }
  }

  async function quickScreenshot() {
    try {
      state.activePopover = null;
      render();
      const result = await exporters.exportViewportImage({
        preferClipboard: true
      });
      lastScreenshotBlob = result.blob || null;

      if (result.copied) {
        showToast('screenshotCopiedPaste', {
          actionName: 'save-last-screenshot',
          actionLabelKey: 'saveLocally',
          duration: 6500,
          tone: 'success'
        });
        return;
      }

      showToast('screenshotDownloadedFallback', {
        duration: 6500,
        tone: 'success'
      });
    } catch (error) {
      showToast(i18n.t(getLanguage(), 'exportLimit'), { duration: 3600 });
    }
  }

  function saveLastScreenshot() {
    if (!lastScreenshotBlob) {
      showToast('noRecentScreenshot');
      return;
    }

    exporters.downloadBlob(lastScreenshotBlob, `pinfix-${Date.now()}.png`);
    showToast('downloadedImage');
  }

  function stopScreenshotMode(notify) {
    if (countdownTimer) {
      window.clearInterval(countdownTimer);
      countdownTimer = null;
    }

    state.captureMode = false;
    state.captureHidden = false;
    state.countdownRemaining = 0;
    render();

    if (notify) {
      showToast('screenshotDone');
    }
  }

  function startScreenshotMode() {
    if (countdownTimer) {
      window.clearInterval(countdownTimer);
    }

    if (!confirmProceedWithIncompleteNotes('screenshot-mode')) {
      return;
    }

    state.activePopover = null;
    state.captureMode = true;
    state.captureHidden = true;
    state.countdownRemaining = state.settings.countdown;
    render();
    showToast('screenshotReady');

    countdownTimer = window.setInterval(() => {
      state.countdownRemaining -= 1;
      if (state.countdownRemaining <= 0) {
        stopScreenshotMode(true);
        return;
      }
      render();
    }, 1000);
  }

  function runNamedAction(name) {
    if (name === 'close-pinfix') {
      toggleOpen(false);
      return;
    }
    if (name === 'undo') {
      undo();
      return;
    }
    if (name === 'toggle-notes') {
      state.settings.notesVisible = !state.settings.notesVisible;
      if (!state.settings.notesVisible) {
        state.editingAnnotationId = '';
      }
      saveGlobalSettings();
      savePageData();
      render();
      return;
    }
    if (name === 'clear-page') {
      clearPage();
      return;
    }
    if (name === 'toggle-mask-mode') {
      togglePrivacyMode();
      return;
    }
    if (name === 'clear-masks') {
      clearMasks();
      return;
    }
    if (name === 'screenshot-mode') {
      startScreenshotMode();
      return;
    }
    if (name === 'export-image') {
      exportImage(false);
      return;
    }
    if (name === 'copy-image') {
      exportImage(true);
      return;
    }
    if (name === 'save-last-screenshot') {
      saveLastScreenshot();
    }
  }

  function handleWindowKeydown(event) {
    if (isEditableTarget(event.target)) {
      return;
    }

    if (!state.open) {
      return;
    }

    const withCommand = event.ctrlKey || event.metaKey;
    const withShift = event.shiftKey;

    if (withCommand && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      undo();
      return;
    }

    if (withCommand && withShift && event.key.toLowerCase() === 'c') {
      event.preventDefault();
      copyNotes();
      return;
    }

    if (withCommand && withShift && event.key.toLowerCase() === 's') {
      event.preventDefault();
      startScreenshotMode();
      return;
    }

    if (withCommand && withShift && event.key.toLowerCase() === 'e') {
      event.preventDefault();
      exportImage(false);
      return;
    }

    if (withCommand && withShift && event.key.toLowerCase() === 'h') {
      event.preventDefault();
      state.settings.notesVisible = !state.settings.notesVisible;
      if (!state.settings.notesVisible) {
        state.editingAnnotationId = '';
      }
      saveGlobalSettings();
      savePageData();
      render();
      return;
    }

    if (event.key === 'Escape') {
      if (state.captureMode) {
        stopScreenshotMode(false);
        return;
      }

      if (state.activePopover) {
        state.activePopover = null;
        render();
        return;
      }

      toggleOpen(false);
    }
  }

  function handleRouteChange() {
    const nextUrl = storage.normaliseUrl(window.location.href);
    if (nextUrl === lastUrl) {
      return;
    }

    commitGlobalTemplateDraft(false);
    savePageData();
    lastUrl = nextUrl;
    loadPageData();
    clearPendingActionConfirm();
    render();
  }

  function handleBeforeUnload() {
    commitGlobalTemplateDraft(false);
    savePageData();
  }

  function attachRouteWatcher() {
    if (routeWatcherAttached) {
      return;
    }

    routeWatcherAttached = true;
    const wrapHistory = (methodName) => {
      const original = window.history[methodName];
      window.history[methodName] = function wrappedHistoryMethod() {
        const result = original.apply(this, arguments);
        window.setTimeout(handleRouteChange, 0);
        return result;
      };
    };

    wrapHistory('pushState');
    wrapHistory('replaceState');
    window.addEventListener('popstate', handleRouteChange);
    window.addEventListener('hashchange', handleRouteChange);
  }

  function init() {
    loadPageData();
    ui.mount();
    render();
    attachRouteWatcher();

    window.addEventListener('resize', scheduleRefreshAnnotations);
    window.addEventListener('scroll', scheduleRefreshAnnotations, { passive: true });
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('keydown', handleWindowKeydown, true);
  }

  return {
    init
  };
}

(function bootstrapPinFix() {
  if (window.__pinfixInitialized__ || window.__pinfixBootstrapping__) {
    return;
  }

  window.__pinfixBootstrapping__ = true;

  const start = () => {
    if (window.__pinfixInitialized__) {
      return;
    }

    if (!document.documentElement || !document.head || !document.body) {
      window.setTimeout(start, 50);
      return;
    }

    window.__pinfixInitialized__ = true;
    window.__pinfixBootstrapping__ = false;
    const app = createPinFixApp();
    app.init();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
