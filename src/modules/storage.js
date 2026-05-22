function createStorage() {
  const globalKey = 'pinfix:global';
  const templateKey = 'pinfix:templates';
  const pageKeyPrefix = 'pinfix:page';

  function hasExtensionStorage() {
    return Boolean(
      window.__pinfixExtensionMode__ &&
      window.__pinfixExtensionStorageCache__ &&
      typeof chrome !== 'undefined' &&
      chrome.storage &&
      chrome.storage.local
    );
  }

  function getExtensionCache() {
    if (!window.__pinfixExtensionStorageCache__ || typeof window.__pinfixExtensionStorageCache__ !== 'object') {
      window.__pinfixExtensionStorageCache__ = {};
    }

    return window.__pinfixExtensionStorageCache__;
  }

  // Use a stable URL so dashboard pages with temporary query params
  // do not create a new save record every time a token changes.
  function normaliseUrl(urlValue) {
    const url = new URL(urlValue, window.location.href);
    const keepHash = url.hash && url.hash !== '#' ? url.hash : '';
    return `${url.origin}${url.pathname}${keepHash}`;
  }

  function loadJson(key, fallback) {
    if (hasExtensionStorage()) {
      const cache = getExtensionCache();
      if (Object.prototype.hasOwnProperty.call(cache, key)) {
        try {
          return parseStoredJson(cache[key], fallback);
        } catch (error) {
          return fallback;
        }
      }

      // Migrate old userscript page data when it is visible to the content script.
      // Keep the old localStorage copy so users can still go back to the userscript.
      const legacyPayload = loadLocalJson(key, null);
      if (legacyPayload) {
        saveJson(key, legacyPayload);
        return legacyPayload;
      }

      return fallback;
    }

    return loadLocalJson(key, fallback);
  }

  function loadLocalJson(key, fallback) {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function saveJson(key, value) {
    if (hasExtensionStorage()) {
      const cache = getExtensionCache();
      cache[key] = value;
      chrome.storage.local.set({ [key]: value }).catch(() => false);
      return true;
    }

    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      return false;
    }
  }

  function removeJson(key) {
    if (hasExtensionStorage()) {
      const cache = getExtensionCache();
      delete cache[key];
      chrome.storage.local.remove(key).catch(() => false);
      return;
    }

    window.localStorage.removeItem(key);
  }

  function parseStoredJson(raw, fallback) {
    if (!raw) {
      return fallback;
    }

    if (typeof raw === 'object') {
      return raw;
    }

    return JSON.parse(raw);
  }

  function hasScriptStorage() {
    return typeof GM_getValue === 'function' && typeof GM_setValue === 'function';
  }

  function loadScriptJson(key, fallback) {
    try {
      if (!hasScriptStorage()) {
        return loadJson(key, fallback);
      }

      const raw = GM_getValue(key, null);
      return parseStoredJson(raw, fallback);
    } catch (error) {
      return fallback;
    }
  }

  function saveScriptJson(key, value) {
    const raw = JSON.stringify(value);
    if (hasScriptStorage()) {
      try {
        GM_setValue(key, raw);
        return { saved: true, scope: 'script' };
      } catch (error) {
        return { saved: saveJson(key, value), scope: 'local' };
      }
    }

    return { saved: saveJson(key, value), scope: 'local' };
  }

  function loadLegacyTemplatePayload() {
    const payload = loadJson(templateKey, null);
    if (!payload || payload.version !== PINFIX_STORAGE_VERSION || !Array.isArray(payload.templates)) {
      return null;
    }

    return payload;
  }

  function clearLegacyTemplates() {
    if (hasScriptStorage()) {
      try {
        window.localStorage.removeItem(templateKey);
      } catch (error) {
        // Ignore cleanup failures. The shared script store remains authoritative.
      }
    }
  }

  function normaliseTemplates(templates) {
    const result = [];
    const existingIds = new Set();
    let changed = false;
    const now = Date.now();

    (Array.isArray(templates) ? templates : []).forEach((template) => {
      if (!template || typeof template !== 'object') {
        changed = true;
        return;
      }

      const title = typeof template.title === 'string' ? template.title : String(template.title || '');
      const content = typeof template.content === 'string' ? template.content : String(template.content || '');
      const createdAt = Number.isFinite(Number(template.createdAt)) ? Number(template.createdAt) : now;
      const updatedAt = Number.isFinite(Number(template.updatedAt)) ? Number(template.updatedAt) : createdAt;
      const templateId = template.id && !existingIds.has(template.id)
        ? template.id
        : createId('template');
      if (
        templateId !== template.id ||
        title !== template.title ||
        content !== template.content ||
        createdAt !== template.createdAt ||
        updatedAt !== template.updatedAt
      ) {
        changed = true;
      }
      result.push({
        ...template,
        id: templateId,
        title,
        content,
        createdAt,
        updatedAt
      });
      existingIds.add(templateId);
    });

    return { templates: result, changed };
  }

  function mergeTemplates(primaryTemplates, legacyTemplates) {
    const normalised = normaliseTemplates(primaryTemplates);
    const result = [...normalised.templates];
    const existingIds = new Set(result.map((template) => template.id));
    const existingById = new Map(result.map((template) => [template.id, template]));
    let changed = normalised.changed;

    (Array.isArray(legacyTemplates) ? legacyTemplates : []).forEach((template) => {
      if (!template || typeof template !== 'object') {
        return;
      }

      const title = typeof template.title === 'string' ? template.title : String(template.title || '');
      const content = typeof template.content === 'string' ? template.content : String(template.content || '');
      const createdAt = Number.isFinite(Number(template.createdAt)) ? Number(template.createdAt) : Date.now();
      const updatedAt = Number.isFinite(Number(template.updatedAt)) ? Number(template.updatedAt) : createdAt;
      const existingTemplate = template.id ? existingById.get(template.id) : null;
      if (existingTemplate && existingTemplate.title === title && existingTemplate.content === content) {
        return;
      }

      const templateId = template.id && !existingIds.has(template.id)
        ? template.id
        : createId('template');
      result.push({
        ...template,
        id: templateId,
        title,
        content,
        createdAt,
        updatedAt
      });
      existingIds.add(templateId);
      existingById.set(templateId, result[result.length - 1]);
      changed = true;
    });

    return { templates: result, changed };
  }

  function shouldMergeLegacyTemplates(scriptPayload, legacyPayload) {
    if (!hasScriptStorage() || !scriptPayload || !legacyPayload) {
      return true;
    }

    const scriptSavedAt = Number(scriptPayload.savedAt || 0);
    const legacySavedAt = Number(legacyPayload.savedAt || 0);
    if (!scriptSavedAt) {
      return true;
    }
    if (!legacySavedAt) {
      return false;
    }
    return legacySavedAt > scriptSavedAt;
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
      const legacyPayload = loadLegacyTemplatePayload();
      const legacyTemplates = legacyPayload ? legacyPayload.templates : [];
      const payload = loadScriptJson(templateKey, null);
      if (payload && payload.version === PINFIX_STORAGE_VERSION) {
        const currentTemplates = Array.isArray(payload.templates) ? payload.templates : [];
        if (!hasScriptStorage()) {
          const normalised = normaliseTemplates(currentTemplates);
          if (normalised.changed) {
            this.saveTemplates(normalised.templates);
          }
          return normalised.templates;
        }

        const templatesToMerge = shouldMergeLegacyTemplates(payload, legacyPayload) ? legacyTemplates : [];
        const merged = mergeTemplates(currentTemplates, templatesToMerge);
        if (merged.changed) {
          this.saveTemplates(merged.templates);
        } else if (legacyPayload && hasScriptStorage()) {
          clearLegacyTemplates();
        }
        return merged.templates;
      }

      if (legacyTemplates.length) {
        const normalised = normaliseTemplates(legacyTemplates);
        this.saveTemplates(normalised.templates);
        return normalised.templates;
      }
      return [];
    },
    saveTemplates(templates) {
      const result = saveScriptJson(templateKey, {
        version: PINFIX_STORAGE_VERSION,
        savedAt: Date.now(),
        templates: Array.isArray(templates) ? templates : []
      });
      if (result.saved && result.scope === 'script') {
        clearLegacyTemplates();
      }
      return result.saved;
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
      removeJson(key);
    }
  };
}
