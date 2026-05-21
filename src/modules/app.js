function createPinFixApp() {
  const i18n = createI18n();
  const storage = createStorage();
  let toastTimer = null;
  let countdownTimer = null;
  let focusTimer = null;
  let refreshScheduled = false;
  let lastUrl = storage.normaliseUrl(window.location.href);
  let routeWatcherAttached = false;

  const state = {
    open: false,
    tool: 'select',
    selectionMode: 'annotate',
    activePopover: null,
    captureMode: false,
    captureHidden: false,
    countdownRemaining: 0,
    candidate: null,
    annotations: [],
    masks: [],
    globalNote: '',
    globalNoteOpen: false,
    globalNoteHeight: 260,
    toast: '',
    history: [],
    highlightedAnnotationId: '',
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
    onToggleGlobal: (next) => {
      state.globalNoteOpen = typeof next === 'boolean' ? next : !state.globalNoteOpen;
      render();
    },
    onTool: (tool) => handleTool(tool),
    onSetSetting: (key, value) => updateSetting(key, value),
    onRun: (name) => runNamedAction(name),
    onDeleteAnnotation: (id) => deleteAnnotation(id),
    onDeleteMask: (id) => deleteMask(id),
    onFocusAnnotation: (id) => focusAnnotation(id),
    onChangeNote: (id, value, saveNow) => updateNote(id, value, saveNow),
    onChangeGlobalNote: (value) => updateGlobalNote(value),
    onResizeGlobalNote: (height) => {
      state.globalNoteHeight = height;
      savePageData();
      render();
    }
  });

  const selector = createSelectorManager({
    isIgnored: (element) => Boolean(element.closest('#pinfix-root, [data-pinfix-ignore="true"]')),
    onCandidateChange: ({ element }) => {
      state.candidate = element ? captureElementRect(element) : null;
      render();
    },
    onSelect: (element) => addSelectionItem(element)
  });

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

  function loadPageData() {
    const pageData = storage.loadPageData(window.location.href);
    state.settings = {
      ...state.settings,
      ...pageData.pageSettings
    };
    state.annotations = (pageData.annotations || []).map((annotation) => hydrateAnnotation(annotation));
    state.masks = (pageData.masks || []).map((mask) => hydrateMask(mask));
    state.globalNote = pageData.globalNote || '';
    state.globalNoteHeight = pageData.pageSettings && pageData.pageSettings.globalNoteHeight
      ? pageData.pageSettings.globalNoteHeight
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

  function showToast(keyOrText) {
    state.toast = keyOrText.includes(' ') || keyOrText.includes('已') ? keyOrText : i18n.t(getLanguage(), keyOrText);
    render();

    if (toastTimer) {
      window.clearTimeout(toastTimer);
    }

    toastTimer = window.setTimeout(() => {
      state.toast = '';
      render();
    }, 1800);
  }

  function takeHistorySnapshot() {
    state.history.push({
      annotations: JSON.parse(JSON.stringify(state.annotations)),
      masks: JSON.parse(JSON.stringify(state.masks)),
      globalNote: state.globalNote
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

  function markAnnotationFocused(id) {
    state.highlightedAnnotationId = id;

    if (focusTimer) {
      window.clearTimeout(focusTimer);
    }

    focusTimer = window.setTimeout(() => {
      state.highlightedAnnotationId = '';
      render();
    }, 1800);
  }

  function addSelectionItem(element) {
    if (state.selectionMode === 'mask') {
      addMask(element);
      return;
    }

    addAnnotation(element);
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

  function updateGlobalNote(value) {
    state.globalNote = value;
    clearPendingActionConfirm();
    savePageData();
  }

  function deleteAnnotation(id) {
    if (!window.confirm(i18n.t(getLanguage(), 'deleteConfirm'))) {
      return;
    }

    takeHistorySnapshot();
    state.annotations = state.annotations.filter((item) => item.id !== id);
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
    clearPendingActionConfirm();
    savePageData();
    render();
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
    state.activePopover = null;
    markAnnotationFocused(id);
    render();
    showToast('focusDone');
  }

  function toggleOpen(forceValue) {
    const nextOpen = typeof forceValue === 'boolean' ? forceValue : !state.open;
    state.open = nextOpen;
    state.activePopover = null;
    state.tool = state.settings.lastTool || 'select';

    if (nextOpen && state.tool === 'select') {
      selector.enable();
    } else {
      selector.disable();
      state.selectionMode = 'annotate';
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
      selector.enable();
      saveGlobalSettings();
      render();
      return;
    }

    selector.disable();
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
    state.tool = 'select';
    state.settings.lastTool = 'select';
    state.activePopover = null;
    state.open = true;
    selector.enable();
    saveGlobalSettings();
    render();
  }

  function togglePrivacyMode() {
    if (state.selectionMode === 'mask') {
      state.selectionMode = 'annotate';
      render();
      showToast('privacyModeOff');
      return;
    }

    setSelectionMode('mask');
    showToast('privacyModeOn');
  }

  async function copyNotes() {
    if (!state.annotations.length && !String(state.globalNote || '').trim()) {
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
        globalNote: state.globalNote
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
      showToast(result.copied ? 'copiedImage' : 'downloadedImage');
    } catch (error) {
      showToast(i18n.t(getLanguage(), 'exportLimit'));
    }
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
    if (name === 'undo') {
      undo();
      return;
    }
    if (name === 'toggle-notes') {
      state.settings.notesVisible = !state.settings.notesVisible;
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
      }
    }
  }

  function handleRouteChange() {
    const nextUrl = storage.normaliseUrl(window.location.href);
    if (nextUrl === lastUrl) {
      return;
    }

    savePageData();
    lastUrl = nextUrl;
    loadPageData();
    clearPendingActionConfirm();
    render();
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
    window.addEventListener('beforeunload', savePageData);
    window.addEventListener('keydown', handleWindowKeydown, true);
  }

  return {
    init
  };
}

(function bootstrapPinFix() {
  if (window.__pinfixInitialized__) {
    return;
  }

  window.__pinfixInitialized__ = true;
  const app = createPinFixApp();
  app.init();
})();
