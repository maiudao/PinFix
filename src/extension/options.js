const PINFIX_STORAGE_VERSION = 1;
const GLOBAL_KEY = 'pinfix:global';
const DEFAULT_SETTINGS = {
  language: 'auto',
  colorPreset: 'red',
  lineWidth: 'medium',
  labelSize: 'medium',
  launcherPosition: 'left-center',
  autoShowEnabled: false,
  autoShowOrigins: []
};

const COLOR_PRESETS = [
  ['red', '#E11D2E', '红色'],
  ['orange', '#EA580C', '橙色'],
  ['amber', '#D97706', '琥珀'],
  ['blue', '#2563EB', '蓝色'],
  ['teal', '#0F766E', '青绿色'],
  ['green', '#16A34A', '绿色'],
  ['neutral', '#111827', '黑白']
];

const form = document.getElementById('settingsForm');
const colorGroup = document.getElementById('colorPresetGroup');
const siteList = document.getElementById('siteList');
const currentSiteText = document.getElementById('currentSiteText');
const statusText = document.getElementById('statusText');
let settings = { ...DEFAULT_SETTINGS };
let statusTimer = null;

function showStatus(message) {
  statusText.textContent = message;
  statusText.classList.add('is-visible');
  window.clearTimeout(statusTimer);
  statusTimer = window.setTimeout(() => {
    statusText.classList.remove('is-visible');
  }, 2400);
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normaliseSettings(payload) {
  return {
    ...DEFAULT_SETTINGS,
    ...(payload && payload.settings ? payload.settings : {})
  };
}

async function loadSettings() {
  const items = await chrome.storage.local.get(GLOBAL_KEY);
  settings = normaliseSettings(items[GLOBAL_KEY]);
}

async function saveSettings(message = '设置已保存') {
  await chrome.runtime.sendMessage({
    type: 'PINFIX_SAVE_GLOBAL_SETTINGS',
    settings
  });
  render();
  showStatus(message);
}

async function getCurrentOrigin() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'PINFIX_GET_TARGET_PAGE_INFO' });
    return response && response.ok && /^https?:\/\//.test(response.origin || '') ? response.origin : '';
  } catch (error) {
    return '';
  }
}

async function requestAutoShowPermission(origin) {
  const url = new URL(origin);
  const pattern = `${url.protocol}//${url.hostname}/*`;
  return chrome.permissions.request({ origins: [pattern] });
}

function originToPermissionPattern(origin) {
  try {
    const url = new URL(origin);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return '';
    }
    return `${url.protocol}//${url.hostname}/*`;
  } catch (error) {
    return '';
  }
}

async function revokeUnusedAutoShowPermission(removedOrigin) {
  const pattern = originToPermissionPattern(removedOrigin);
  if (!pattern) {
    return true;
  }

  const stillUsed = (settings.autoShowOrigins || []).some((origin) => originToPermissionPattern(origin) === pattern);
  if (!stillUsed) {
    try {
      await chrome.permissions.remove({ origins: [pattern] });
    } catch (error) {
      return false;
    }
  }
  return true;
}

async function revokeAllAutoShowPermissions() {
  const patterns = Array.from(new Set((settings.autoShowOrigins || [])
    .map(originToPermissionPattern)
    .filter(Boolean)));
  if (patterns.length) {
    try {
      await chrome.permissions.remove({ origins: patterns });
    } catch (error) {
      return false;
    }
  }
  return true;
}

async function requestSavedAutoShowPermissions() {
  const patterns = Array.from(new Set((settings.autoShowOrigins || [])
    .map(originToPermissionPattern)
    .filter(Boolean)));
  if (!patterns.length) {
    return true;
  }
  return chrome.permissions.request({ origins: patterns });
}

function renderColorButtons() {
  colorGroup.innerHTML = COLOR_PRESETS.map(([key, color, label]) => `
    <button
      class="swatch-button"
      type="button"
      data-color="${key}"
      aria-pressed="${settings.colorPreset === key ? 'true' : 'false'}"
    >
      <span class="swatch-dot" style="background:${color}"></span>
      <span>${label}</span>
    </button>
  `).join('');
}

function renderSiteList() {
  const origins = Array.isArray(settings.autoShowOrigins) ? settings.autoShowOrigins : [];
  siteList.innerHTML = origins.length
    ? origins.map((origin) => {
      const safeOrigin = escapeHtml(origin);
      return `
      <div class="site-item">
        <span>${safeOrigin}</span>
        <button type="button" data-remove-origin="${safeOrigin}">移除</button>
      </div>
    `;
    }).join('')
    : '<div class="muted-line">还没有加入网站。先打开一个网页，再点“加入当前网站”。</div>';
}

async function renderCurrentSite() {
  const origin = await getCurrentOrigin();
  currentSiteText.textContent = origin ? `当前网站：${origin}` : '当前页面不能加入自动显示列表。';
  document.getElementById('addCurrentSiteButton').disabled = !origin;
}

function render() {
  form.elements.language.value = settings.language;
  form.elements.launcherPosition.value = settings.launcherPosition;
  form.elements.lineWidth.value = settings.lineWidth;
  form.elements.labelSize.value = settings.labelSize;
  form.elements.autoShowEnabled.checked = Boolean(settings.autoShowEnabled);
  renderColorButtons();
  renderSiteList();
}

form.addEventListener('change', async (event) => {
  const target = event.target;
  if (!target.name) {
    return;
  }

  if (target.name === 'autoShowEnabled') {
    if (!target.checked) {
      const revoked = await revokeAllAutoShowPermissions();
      settings.autoShowEnabled = false;
      await saveSettings(revoked
        ? '已关闭自动显示，并撤销已授权网站'
        : '自动显示已关闭，但 Chrome 权限撤销失败，可在扩展详情页手动检查。');
      return;
    }

    if (!(await requestSavedAutoShowPermissions())) {
      settings.autoShowEnabled = false;
      render();
      showStatus('Chrome 没有授权这些网站，自动显示仍保持关闭');
      return;
    }
  }

  settings[target.name] = target.type === 'checkbox' ? target.checked : target.value;
  await saveSettings();
});

colorGroup.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-color]');
  if (!button) {
    return;
  }

  settings.colorPreset = button.dataset.color;
  await saveSettings();
});

siteList.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-remove-origin]');
  if (!button) {
    return;
  }

  const removedOrigin = button.dataset.removeOrigin;
  settings.autoShowOrigins = (settings.autoShowOrigins || []).filter((origin) => origin !== button.dataset.removeOrigin);
  const revoked = await revokeUnusedAutoShowPermission(removedOrigin);
  await saveSettings(revoked
    ? '已移除网站'
    : '网站已从列表移除，但 Chrome 权限撤销失败，可在扩展详情页手动检查。');
});

document.getElementById('addCurrentSiteButton').addEventListener('click', async () => {
  const origin = await getCurrentOrigin();
  if (!origin) {
    showStatus('当前页面不能加入自动显示列表');
    return;
  }

  if (!(await requestAutoShowPermission(origin))) {
    showStatus('Chrome 没有授权当前网站，暂不能自动显示');
    return;
  }

  settings.autoShowOrigins = Array.from(new Set([...(settings.autoShowOrigins || []), origin]));
  settings.autoShowEnabled = true;
  await saveSettings('已加入当前网站');
});

document.getElementById('clearCurrentPageButton').addEventListener('click', async () => {
  if (!window.confirm('确认清理当前页的 PinFix 标注、备注和遮挡吗？')) {
    return;
  }

  const response = await chrome.runtime.sendMessage({ type: 'PINFIX_CLEAR_CURRENT_PAGE_DATA' });
  showStatus(response && response.ok ? '当前页数据已清理' : (response && response.reason ? response.reason : '清理失败'));
});

document.getElementById('clearAllDataButton').addEventListener('click', async () => {
  if (!window.confirm('确认清理全部 PinFix 本地数据吗？这会清空设置、模板和页面标注。')) {
    return;
  }

  const revoked = await revokeAllAutoShowPermissions();
  const response = await chrome.runtime.sendMessage({ type: 'PINFIX_CLEAR_ALL_DATA' });
  settings = { ...DEFAULT_SETTINGS };
  render();
  if (response && response.ok && !revoked) {
    showStatus('本地数据已清理，但 Chrome 权限撤销失败，可在扩展详情页手动检查。');
    return;
  }
  showStatus(response && response.ok ? '全部本地数据已清理' : '清理失败');
});

loadSettings()
  .then(() => {
    render();
    return renderCurrentSite();
  })
  .catch(() => {
    render();
    showStatus('设置读取失败，请重新打开设置页');
  });
