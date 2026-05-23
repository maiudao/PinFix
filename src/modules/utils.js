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
  const pinfixRoot = document.getElementById('pinfix-root');
  const previousDisplay = pinfixRoot ? pinfixRoot.style.display : '';

  if (pinfixRoot) {
    pinfixRoot.style.display = 'none';
  }

  const width = Math.max(doc.scrollWidth, doc.clientWidth, body ? body.scrollWidth : 0);
  const height = Math.max(doc.scrollHeight, doc.clientHeight, body ? body.scrollHeight : 0);

  if (pinfixRoot) {
    pinfixRoot.style.display = previousDisplay;
  }

  return {
    width,
    height
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
