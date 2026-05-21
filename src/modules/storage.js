function createStorage() {
  const globalKey = 'pinfix:global';
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
    loadPageData(urlValue) {
      const key = `${pageKeyPrefix}:${normaliseUrl(urlValue)}`;
      const payload = loadJson(key, null);
      if (!payload || payload.version !== PINFIX_STORAGE_VERSION) {
        return {
          annotations: [],
          masks: [],
          globalNote: '',
          pageSettings: {}
        };
      }

      return {
        annotations: Array.isArray(payload.annotations) ? payload.annotations : [],
        masks: Array.isArray(payload.masks) ? payload.masks : [],
        globalNote: typeof payload.globalNote === 'string' ? payload.globalNote : '',
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
        pageSettings: payload.pageSettings || {}
      });
    },
    clearPageData(urlValue) {
      const key = `${pageKeyPrefix}:${normaliseUrl(urlValue)}`;
      window.localStorage.removeItem(key);
    }
  };
}
