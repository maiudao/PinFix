const PINFIX_CONTENT_SCRIPT = 'pinfix-content.js';
const PINFIX_STORAGE_VERSION = 1;
const PINFIX_GLOBAL_KEY = 'pinfix:global';
const PINFIX_PAGE_KEY_PREFIX = 'pinfix:page';
const PINFIX_LAST_TAB_KEY = 'pinfix:runtime:lastAnnotatableTab';
const captureLocks = new Map();
let lastAnnotatableTab = null;

function isUnsupportedUrl(urlValue) {
  if (!urlValue) {
    return true;
  }

  try {
    const url = new URL(urlValue);
    return !['http:', 'https:', 'file:'].includes(url.protocol);
  } catch (error) {
    return true;
  }
}

function getUnsupportedReason(urlValue) {
  if (!urlValue) {
    return 'PinFix cannot read the current tab. Please try a normal web page.';
  }

  try {
    const url = new URL(urlValue);
    if (url.protocol === 'file:') {
      return 'Local file pages need file access permission in Chrome extension settings.';
    }
    if (!['http:', 'https:'].includes(url.protocol)) {
      return 'This browser page does not allow PinFix annotation. Please use a normal web page.';
    }
  } catch (error) {
    return 'This page does not allow PinFix annotation. Please use a normal web page.';
  }

  return 'This page does not allow PinFix annotation. Please use a normal web page.';
}

function normalisePageUrl(urlValue) {
  const url = new URL(urlValue);
  const keepHash = url.hash && url.hash !== '#' ? url.hash : '';
  return `${url.origin}${url.pathname}${keepHash}`;
}

function getPageStorageKey(urlValue) {
  return `${PINFIX_PAGE_KEY_PREFIX}:${normalisePageUrl(urlValue)}`;
}

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0] || null;
}

async function rememberAnnotatableTab(tab) {
  if (!tab || !tab.id || !tab.url || isUnsupportedUrl(tab.url)) {
    return;
  }

  lastAnnotatableTab = {
    id: tab.id,
    windowId: tab.windowId,
    url: tab.url
  };
  await saveRememberedAnnotatableTab(lastAnnotatableTab);
}

async function saveRememberedAnnotatableTab(tabInfo) {
  if (!chrome.storage || !chrome.storage.session) {
    return;
  }

  try {
    await chrome.storage.session.set({ [PINFIX_LAST_TAB_KEY]: tabInfo });
  } catch (error) {
    // Session storage is a convenience. If Chrome refuses it, in-memory state is enough for the current wake cycle.
  }
}

async function loadRememberedAnnotatableTab() {
  if (lastAnnotatableTab && lastAnnotatableTab.id) {
    return lastAnnotatableTab;
  }

  if (!chrome.storage || !chrome.storage.session) {
    return null;
  }

  try {
    const items = await chrome.storage.session.get(PINFIX_LAST_TAB_KEY);
    const tabInfo = items && items[PINFIX_LAST_TAB_KEY];
    if (tabInfo && tabInfo.id && tabInfo.url && !isUnsupportedUrl(tabInfo.url)) {
      lastAnnotatableTab = tabInfo;
      return tabInfo;
    }
  } catch (error) {
    return null;
  }

  return null;
}

async function clearRememberedAnnotatableTab(tabId) {
  let shouldClearSession = !tabId;

  if (!chrome.storage || !chrome.storage.session) {
    if (lastAnnotatableTab && (!tabId || lastAnnotatableTab.id === tabId)) {
      lastAnnotatableTab = null;
    }
    return;
  }

  try {
    if (tabId) {
      const items = await chrome.storage.session.get(PINFIX_LAST_TAB_KEY);
      const tabInfo = items && items[PINFIX_LAST_TAB_KEY];
      shouldClearSession = Boolean(tabInfo && tabInfo.id === tabId);
    }

    if (shouldClearSession) {
      await chrome.storage.session.remove(PINFIX_LAST_TAB_KEY);
    }
  } catch (error) {
    // Ignore cleanup failures.
  }

  if (lastAnnotatableTab && (!tabId || lastAnnotatableTab.id === tabId)) {
    lastAnnotatableTab = null;
  }
}

async function getLastAnnotatableTab() {
  const rememberedTab = await loadRememberedAnnotatableTab();
  if (!rememberedTab || !rememberedTab.id) {
    return null;
  }

  try {
    const tab = await chrome.tabs.get(rememberedTab.id);
    if (!tab || !tab.url || isUnsupportedUrl(tab.url)) {
      await clearRememberedAnnotatableTab(rememberedTab.id);
      return null;
    }
    await rememberAnnotatableTab(tab);
    return tab;
  } catch (error) {
    await clearRememberedAnnotatableTab(rememberedTab.id);
    return null;
  }
}

async function getTargetAnnotatableTab() {
  const activeTab = await getActiveTab();
  if (activeTab && activeTab.url && !isUnsupportedUrl(activeTab.url)) {
    await rememberAnnotatableTab(activeTab);
    return activeTab;
  }

  return getLastAnnotatableTab();
}

async function pingTab(tabId) {
  try {
    const response = await chrome.tabs.sendMessage(tabId, { type: 'PINFIX_PING' });
    return Boolean(response && response.ready);
  } catch (error) {
    return false;
  }
}

async function injectPinFix(tab) {
  if (!tab || !tab.id) {
    return {
      ok: false,
      reason: 'PinFix cannot find the current tab.'
    };
  }

  if (isUnsupportedUrl(tab.url)) {
    return {
      ok: false,
      reason: getUnsupportedReason(tab.url)
    };
  }

  if (await pingTab(tab.id)) {
    await rememberAnnotatableTab(tab);
    return {
      ok: true,
      alreadyActive: true
    };
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: [PINFIX_CONTENT_SCRIPT]
    });

    await rememberAnnotatableTab(tab);
    return {
      ok: true,
      alreadyActive: false
    };
  } catch (error) {
    return {
      ok: false,
      reason: error && error.message
        ? error.message
        : getUnsupportedReason(tab.url)
    };
  }
}

function dataUrlToPayload(dataUrl) {
  const match = String(dataUrl || '').match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    return null;
  }

  return {
    mimeType: match[1],
    base64: match[2]
  };
}

async function captureSenderTab(sender) {
  const tab = sender && sender.tab;
  if (!tab || !tab.id || !tab.windowId) {
    return {
      ok: false,
      reason: 'PinFix cannot find the page to capture.'
    };
  }

  if (captureLocks.get(tab.id)) {
    return {
      ok: false,
      reason: 'PinFix is already capturing this page.'
    };
  }

  captureLocks.set(tab.id, true);
  try {
    const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
      format: 'png'
    });
    const payload = dataUrlToPayload(dataUrl);
    if (!payload) {
      return {
        ok: false,
        reason: 'Chrome did not return a valid screenshot.'
      };
    }

    return {
      ok: true,
      ...payload
    };
  } catch (error) {
    return {
      ok: false,
      reason: error && error.message ? error.message : 'Chrome could not capture this page.'
    };
  } finally {
    captureLocks.delete(tab.id);
  }
}

async function notifyActiveTab(message) {
  const tab = await getTargetAnnotatableTab();
  if (!tab || !tab.id || isUnsupportedUrl(tab.url)) {
    return false;
  }

  try {
    await chrome.tabs.sendMessage(tab.id, message);
    return true;
  } catch (error) {
    return false;
  }
}

function originToMatchPattern(origin) {
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

async function maybeAutoInject(tabId, urlValue) {
  if (!tabId || !urlValue || isUnsupportedUrl(urlValue)) {
    return;
  }

  const items = await chrome.storage.local.get(PINFIX_GLOBAL_KEY);
  const settings = items && items[PINFIX_GLOBAL_KEY] && items[PINFIX_GLOBAL_KEY].settings;
  if (!settings || !settings.autoShowEnabled || !Array.isArray(settings.autoShowOrigins)) {
    return;
  }

  const origin = new URL(urlValue).origin;
  if (!settings.autoShowOrigins.includes(origin)) {
    return;
  }

  const pattern = originToMatchPattern(origin);
  if (!pattern || !(await chrome.permissions.contains({ origins: [pattern] }))) {
    return;
  }

  await injectPinFix({ id: tabId, url: urlValue });
}

async function saveGlobalSettings(settings) {
  await chrome.storage.local.set({
    [PINFIX_GLOBAL_KEY]: {
      version: PINFIX_STORAGE_VERSION,
      savedAt: Date.now(),
      settings: settings || {}
    }
  });
  await notifyActiveTab({
    type: 'PINFIX_APPLY_GLOBAL_SETTINGS',
    settings: settings || {}
  });
  return { ok: true };
}

async function clearCurrentPageData() {
  const tab = await getTargetAnnotatableTab();
  if (!tab || !tab.url || isUnsupportedUrl(tab.url)) {
    return {
      ok: false,
      reason: getUnsupportedReason(tab && tab.url)
    };
  }

  const key = getPageStorageKey(tab.url);
  await chrome.storage.local.remove(key);
  await notifyActiveTab({ type: 'PINFIX_CURRENT_PAGE_DATA_CLEARED', key });
  return { ok: true, key };
}

async function clearAllPinFixData() {
  const items = await chrome.storage.local.get(null);
  const keys = Object.keys(items || {}).filter((key) => key.startsWith('pinfix:'));
  if (keys.length) {
    await chrome.storage.local.remove(keys);
  }
  await notifyActiveTab({ type: 'PINFIX_ALL_DATA_CLEARED' });
  return { ok: true, removed: keys.length };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message) {
    return false;
  }

  if (message.type === 'PINFIX_GET_CURRENT_TAB_STATUS') {
    getActiveTab()
      .then(async (tab) => {
        if (!tab || !tab.id) {
          return {
            ok: false,
            reason: 'PinFix cannot find the current tab.'
          };
        }

        if (isUnsupportedUrl(tab.url)) {
          return {
            ok: false,
            reason: getUnsupportedReason(tab.url)
          };
        }

        await rememberAnnotatableTab(tab);
        return {
          ok: true,
          active: await pingTab(tab.id),
          url: tab.url
        };
      })
      .then(sendResponse)
      .catch((error) => {
        sendResponse({
          ok: false,
          reason: error && error.message ? error.message : 'PinFix could not read this tab.'
        });
      });

    return true;
  }

  if (message.type === 'PINFIX_ACTIVATE_CURRENT_TAB') {
    getActiveTab()
      .then(async (tab) => {
        await rememberAnnotatableTab(tab);
        return injectPinFix(tab);
      })
      .then(sendResponse)
      .catch((error) => {
        sendResponse({
          ok: false,
          reason: error && error.message ? error.message : 'PinFix could not start on this page.'
        });
      });

    return true;
  }

  if (message.type === 'PINFIX_GET_TARGET_PAGE_INFO') {
    getTargetAnnotatableTab()
      .then((tab) => {
        if (!tab || !tab.url) {
          return {
            ok: false,
            reason: 'PinFix cannot find a normal web page.'
          };
        }

        return {
          ok: true,
          url: tab.url,
          origin: new URL(tab.url).origin
        };
      })
      .then(sendResponse)
      .catch((error) => {
        sendResponse({
          ok: false,
          reason: error && error.message ? error.message : 'PinFix could not read the target page.'
        });
      });

    return true;
  }

  if (message.type === 'PINFIX_CAPTURE_VISIBLE_TAB') {
    captureSenderTab(sender)
      .then(sendResponse)
      .catch((error) => {
        sendResponse({
          ok: false,
          reason: error && error.message ? error.message : 'PinFix could not capture this page.'
        });
      });

    return true;
  }

  if (message.type === 'PINFIX_SAVE_GLOBAL_SETTINGS') {
    saveGlobalSettings(message.settings)
      .then(sendResponse)
      .catch((error) => {
        sendResponse({
          ok: false,
          reason: error && error.message ? error.message : 'PinFix could not save settings.'
        });
      });

    return true;
  }

  if (message.type === 'PINFIX_CLEAR_CURRENT_PAGE_DATA') {
    clearCurrentPageData()
      .then(sendResponse)
      .catch((error) => {
        sendResponse({
          ok: false,
          reason: error && error.message ? error.message : 'PinFix could not clear this page.'
        });
      });

    return true;
  }

  if (message.type === 'PINFIX_CLEAR_ALL_DATA') {
    clearAllPinFixData()
      .then(sendResponse)
      .catch((error) => {
        sendResponse({
          ok: false,
          reason: error && error.message ? error.message : 'PinFix could not clear local data.'
        });
      });

    return true;
  }

  return false;
});

chrome.action.onClicked.addListener(async (tab) => {
  await injectPinFix(tab);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete' || !tab || !tab.url) {
    return;
  }

  maybeAutoInject(tabId, tab.url).catch(() => false);
});

chrome.tabs.onRemoved.addListener((tabId) => {
  clearRememberedAnnotatableTab(tabId).catch(() => false);
});
