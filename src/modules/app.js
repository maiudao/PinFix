function createPinFixApp() {
  const i18n = createI18n();
  const storage = createStorage();
  let toastTimer = null;
  let focusTimer = null;
  let refreshScheduled = false;
  let captureInProgress = false;
  let lastUrl = storage.normaliseUrl(window.location.href);
  let routeWatcherAttached = false;

  const state = {
    open: false,
    tool: 'select',
    selectionMode: 'annotate',
    selectionActive: true,
    activePopover: null,
    captureHidden: false,
    areaCaptureActive: false,
    candidate: null,
    candidateElement: null,
    annotations: [],
    masks: [],
    templates: storage.loadTemplates().map((template) => hydrateTemplate(template)),
    selectedTemplateIds: [],
    globalNote: '',
    globalNoteOpen: false,
    globalNoteHeight: 420,
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
    onStartAreaCapture: () => startAreaCapture(),
    onCancelAreaCapture: (messageKey) => cancelAreaCapture(messageKey),
    onCaptureAreaScreenshot: (rect) => captureAreaScreenshot(rect),
    onSetSetting: (key, value) => updateSetting(key, value),
    onRun: (name) => runNamedAction(name),
    onDeleteAnnotation: (id) => deleteAnnotation(id),
    onDeleteMask: (id) => deleteMask(id),
    onActivateAnnotation: (id) => activateAnnotation(id, true),
    onFocusAnnotation: (id) => focusAnnotation(id),
    onEditAnnotation: (id) => editAnnotation(id),
    onMaskAnnotation: (id) => maskAnnotation(id),
    onResizeAnnotation: (id, rect) => resizeAnnotation(id, rect),
    onAdjustMask: (id, delta) => adjustMask(id, delta),
    onToggleSection: (section) => toggleSection(section),
    onCandidateAdjust: (direction) => adjustCandidate(direction),
    onCandidatePick: (kind) => addCandidateSelection(kind),
    onChangeNote: (id, value, saveNow) => updateNote(id, value, saveNow),
    onChangeGlobalNote: (value) => updateGlobalNote(value),
    onMoveLauncher: (position) => moveLauncher(position),
    onShowGlobalNoteView: () => showGlobalNoteView(),
    onShowGlobalTemplate: (id) => showGlobalTemplate(id),
    onCreateGlobalTemplate: () => createGlobalTemplateDraft(),
    onChangeGlobalTemplateDraft: (field, value) => updateGlobalTemplateDraft(field, value),
    onCommitGlobalTemplate: (shouldRender, commitOptions) => commitGlobalTemplateDraft(shouldRender, commitOptions),
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
    isSelectionActive: () => state.selectionActive && !state.globalNoteOpen && !state.areaCaptureActive,
    shouldAvoidCandidate: (element) => hasExistingAnnotationForElement(element),
    onCandidateChange: ({ element }) => {
      if (state.globalNoteOpen || state.areaCaptureActive) {
        return;
      }
      state.candidateElement = element || null;
      state.candidate = element ? captureElementRect(element) : null;
      render();
    },
    onDragSelectChange: (rect) => {
      if (state.globalNoteOpen || state.areaCaptureActive) {
        return;
      }
      state.candidateElement = null;
      state.candidate = rect;
      render();
    },
    onAreaSelect: (rect) => addManualAnnotation(rect),
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
      state.captureHidden = false;
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
    return storage.saveTemplates(state.templates);
  }

  function getTemplateSignature(templates) {
    return (Array.isArray(templates) ? templates : [])
      .map((template) => {
        return [
          template.id,
          template.title,
          template.content,
          template.createdAt,
          template.updatedAt
        ].join('\u0001');
      })
      .join('\u0002');
  }

  function refreshTemplatesFromStorage() {
    const nextTemplates = storage.loadTemplates().map((template) => hydrateTemplate(template));
    if (getTemplateSignature(nextTemplates) === getTemplateSignature(state.templates)) {
      return;
    }

    state.templates = nextTemplates;
    state.selectedTemplateIds = getValidSelectedTemplateIds(state.selectedTemplateIds);
    if (state.activeTemplateId && !state.templates.some((template) => template.id === state.activeTemplateId)) {
      state.globalNoteView = 'note';
      state.activeTemplateId = '';
      state.draftTemplate = null;
    }
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
    refreshTemplatesFromStorage();
    const pageData = storage.loadPageData(window.location.href);
    const { launcherPosition, launcherCustomPosition, ...pageSettings } = pageData.pageSettings || {};
    state.settings = {
      ...storage.loadGlobalSettings(),
      ...pageSettings
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
    state.globalNoteHeight = pageSettings.globalNoteHeight
      ? Math.max(pageSettings.globalNoteHeight, 360)
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
      relativeRect: annotation.relativeRect || null,
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
    if (!filled.anchor && resolved.relativeRect) {
      filled.relativeRect = resolved.relativeRect;
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
      tone: toastOptions.tone || '',
      anchor: toastOptions.anchor || ''
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

  function refreshAnnotations(force = false) {
    if (state.globalNoteOpen && !force) {
      return;
    }

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
      return sameSelector || rectsRoughlyMatch(annotation.rect, rect) || rectsSubstantiallyMatch(annotation.rect, rect);
    }) || null;
  }

  function hasExistingAnnotation(anchor, rect) {
    return Boolean(findExistingAnnotation(anchor, rect));
  }

  function hasExistingAnnotationForElement(element) {
    if (!(element instanceof HTMLElement)) {
      return false;
    }

    const rect = captureElementRect(element);
    const selector = buildElementSelector(element);
    return state.annotations.some((annotation) => {
      const sameSelector = selector && annotation.anchor && annotation.anchor.selector === selector;
      return sameSelector || rectsRoughlyMatch(annotation.rect, rect) || rectsSubstantiallyMatch(annotation.rect, rect);
    });
  }

  function rectsSubstantiallyMatch(leftRect, rightRect) {
    if (!leftRect || !rightRect) {
      return false;
    }

    const leftArea = Math.max(1, leftRect.width * leftRect.height);
    const rightArea = Math.max(1, rightRect.width * rightRect.height);
    const sizeRatio = Math.min(leftArea, rightArea) / Math.max(leftArea, rightArea);
    if (sizeRatio < 0.68) {
      return false;
    }

    const overlapLeft = Math.max(leftRect.pageLeft, rightRect.pageLeft);
    const overlapTop = Math.max(leftRect.pageTop, rightRect.pageTop);
    const overlapRight = Math.min(leftRect.pageLeft + leftRect.width, rightRect.pageLeft + rightRect.width);
    const overlapBottom = Math.min(leftRect.pageTop + leftRect.height, rightRect.pageTop + rightRect.height);
    const overlapArea = Math.max(0, overlapRight - overlapLeft) * Math.max(0, overlapBottom - overlapTop);

    return overlapArea / Math.min(leftArea, rightArea) > 0.82;
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

  function getElementAtManualRectCenter(rect) {
    const clientX = clamp(rect.pageLeft + rect.width / 2 - window.scrollX, 0, window.innerWidth - 1);
    const clientY = clamp(rect.pageTop + rect.height / 2 - window.scrollY, 0, window.innerHeight - 1);
    const element = document.elementFromPoint(clientX, clientY);

    return element instanceof HTMLElement ? element : document.body;
  }

  function addManualAnnotation(rect) {
    if (!rect || rect.width < 24 || rect.height < 24) {
      clearCandidate();
      render();
      return;
    }

    const manualRect = {
      pageLeft: Math.max(0, rect.pageLeft),
      pageTop: Math.max(0, rect.pageTop),
      width: rect.width,
      height: rect.height,
      viewportWidth: rect.viewportWidth || window.innerWidth,
      viewportHeight: rect.viewportHeight || window.innerHeight,
      documentWidth: rect.documentWidth || getDocumentSize().width,
      documentHeight: rect.documentHeight || getDocumentSize().height
    };
    const existing = state.annotations.find((annotation) => rectsRoughlyMatch(annotation.rect, manualRect));
    if (existing) {
      clearCandidate();
      focusAnnotation(existing.id);
      showToast('annotationExists');
      return;
    }

    takeHistorySnapshot();
    clearPendingActionConfirm();

    const surfaceElement = getElementAtManualRectCenter(manualRect);
    const annotation = {
      id: createId('annotation'),
      number: state.annotations.length + 1,
      note: '',
      anchor: null,
      rect: manualRect,
      relativeRect: createRelativeAnnotationRect(manualRect),
      surfaceTone: detectSurfaceTone(surfaceElement, state.settings.contrastMode),
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

  function resizeAnnotation(id, rect) {
    const annotation = state.annotations.find((item) => item.id === id);
    if (!annotation || !rect) {
      return;
    }

    const nextRect = normaliseAnnotationRect(rect, 24);
    if (rectsRoughlyMatch(annotation.rect, nextRect)) {
      return;
    }

    takeHistorySnapshot();
    annotation.anchor = null;
    annotation.rect = nextRect;
    annotation.relativeRect = createRelativeAnnotationRect(nextRect);
    annotation.surfaceTone = detectSurfaceTone(getElementAtManualRectCenter(nextRect), state.settings.contrastMode);
    state.activeAnnotationId = id;
    if (state.editingAnnotationId && state.editingAnnotationId !== id) {
      state.editingAnnotationId = '';
    }
    clearPendingActionConfirm();
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
    if (!nextOpen) {
      commitGlobalTemplateDraft(false);
    } else {
      refreshTemplatesFromStorage();
    }
    state.globalNoteOpen = nextOpen;
    if (nextOpen) {
      clearCandidate();
      state.globalNoteView = 'note';
      state.activeTemplateId = '';
      state.draftTemplate = null;
    } else {
      refreshAnnotations(true);
      return;
    }
    render();
  }

  function showGlobalNoteView() {
    commitGlobalTemplateDraft(false);
    state.globalNoteView = 'note';
    state.activeTemplateId = '';
    state.draftTemplate = null;
    render();
  }

  function showGlobalTemplate(id) {
    commitGlobalTemplateDraft(false);
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
    commitGlobalTemplateDraft(false);
    state.globalNoteView = 'template';
    state.activeTemplateId = '';
    state.draftTemplate = {
      title: '',
      content: ''
    };
    render();
  }

  function updateGlobalTemplateDraft(field, value) {
    if (field !== 'title' && field !== 'content') {
      return;
    }

    if (!state.draftTemplate) {
      state.draftTemplate = {
        title: '',
        content: ''
      };
    }

    state.draftTemplate[field] = value;
    clearPendingActionConfirm();
  }

  function commitGlobalTemplateDraft(shouldRender = true, commitOptions = {}) {
    if (!state.draftTemplate) {
      return;
    }

    const draft = {
      title: typeof state.draftTemplate.title === 'string' ? state.draftTemplate.title : '',
      content: typeof state.draftTemplate.content === 'string' ? state.draftTemplate.content : ''
    };

    if (!state.activeTemplateId) {
      if (!hasTemplateDraftContent(draft)) {
        if (commitOptions.keepEmptyDraft) {
          return;
        }
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
    if (id === state.activeTemplateId) {
      commitGlobalTemplateDraft(false);
    }

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
    if (!state.annotations.length && !state.masks.length && !state.globalNote && !state.selectedTemplateIds.length) {
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
    showToast('pageClearedUndoHint', {
      anchor: 'clear-page',
      duration: 3600
    });
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
      commitGlobalTemplateDraft(false);
      savePageData();
      cancelAreaCapture();
    }
    state.open = nextOpen;
    state.activePopover = null;
    state.tool = getRestoredTool();
    setSelectionActive(true);

    if (nextOpen && state.tool === 'select') {
      selector.enable();
    } else {
      selector.disable();
      state.selectionMode = 'annotate';
      if (!nextOpen) {
        state.activeAnnotationId = '';
        state.editingAnnotationId = '';
        state.globalNoteOpen = false;
        state.captureHidden = false;
        state.areaCaptureActive = false;
        state.toast = '';
        setSelectionActive(false);
        clearCandidate();
      }
    }

    render();
  }

  function getRestoredTool() {
    if (state.settings.lastTool !== 'select') {
      state.settings.lastTool = 'select';
      saveGlobalSettings();
    }
    return 'select';
  }

  function handleTool(tool) {
    if (!state.open) {
      state.open = true;
    }

    if (!['select', 'capture', 'copy'].includes(tool)) {
      state.tool = 'select';
      state.settings.lastTool = 'select';
      state.activePopover = null;
      setSelectionActive(true);
      selector.enable();
      saveGlobalSettings();
      render();
      return;
    }

    if (tool === 'copy') {
      copyNotes();
      return;
    }

    if (tool === 'capture') {
      state.settings.lastTool = 'select';
      saveGlobalSettings();
      startAreaCapture();
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

  }

  function updateSetting(key, value) {
    state.settings[key] = value;
    if (key === 'launcherPosition' && value !== 'custom') {
      state.settings.launcherCustomPosition = null;
    }
    saveGlobalSettings();
    savePageData();

    if (key === 'contrastMode') {
      refreshAnnotations(true);
      return;
    }

    render();
  }

  function moveLauncher(position) {
    if (!position) {
      return;
    }

    state.settings.launcherPosition = 'custom';
    state.settings.launcherCustomPosition = position;
    saveGlobalSettings();
    render();
  }

  function confirmProceedWithIncompleteNotes(actionName) {
    const summary = getReviewSummary();
    if (!summary.missingCount) {
      clearPendingActionConfirm();
      return true;
    }
    clearPendingActionConfirm();
    showToast(t('reviewContinue', { count: summary.missingCount }), {
      duration: 3200,
      tone: 'warn'
    });
    return true;
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
    commitGlobalTemplateDraft(false);
    refreshTemplatesFromStorage();
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

  function startAreaCapture() {
    if (!state.open) {
      state.open = true;
    }

    if (document.activeElement && typeof document.activeElement.blur === 'function') {
      document.activeElement.blur();
    }

    if (state.globalNoteOpen) {
      commitGlobalTemplateDraft(false);
    }

    selector.disable();
    setSelectionActive(false);
    clearCandidate();
    state.tool = 'capture';
    state.settings.lastTool = 'select';
    state.activePopover = null;
    state.globalNoteOpen = false;
    state.areaCaptureActive = true;
    saveGlobalSettings();
    render();
    showToast('areaCaptureHint', {
      duration: 2200
    });
  }

  function cancelAreaCapture(messageKey) {
    if (!state.areaCaptureActive) {
      return;
    }

    state.areaCaptureActive = false;
    state.tool = 'select';
    state.settings.lastTool = 'select';
    saveGlobalSettings();
    if (state.tool === 'select' && state.open) {
      setSelectionActive(true);
      selector.enable();
      selector.refresh();
    }
    render();
    if (messageKey) {
      showToast(messageKey);
    }
  }

  async function captureAreaScreenshot(rect) {
    if (captureInProgress) {
      return;
    }

    const selectedRect = rect && {
      x: Math.max(0, Number(rect.x) || 0),
      y: Math.max(0, Number(rect.y) || 0),
      width: Math.max(0, Number(rect.width) || 0),
      height: Math.max(0, Number(rect.height) || 0)
    };

    if (!selectedRect || selectedRect.width < 8 || selectedRect.height < 8) {
      cancelAreaCapture('areaCaptureTooSmall');
      return;
    }

    const deferredClipboard = exporters.createDeferredPngClipboardItem();
    state.areaCaptureActive = false;
    state.tool = 'select';
    state.settings.lastTool = 'select';
    state.activePopover = null;
    saveGlobalSettings();
    if (state.tool === 'select' && state.open) {
      setSelectionActive(true);
      selector.enable();
      selector.refresh();
    }
    render();

    captureInProgress = true;
    try {
      const result = await exporters.exportViewportImage({
        preferClipboard: true,
        deferredClipboard,
        rect: selectedRect
      });

      if (result.copied) {
        showToast('screenshotCopiedPaste', { duration: 6500, tone: 'success' });
        return;
      }

      showToast('screenshotDownloadedFallback', {
        duration: 6500,
        tone: 'success'
      });
    } catch (error) {
      if (deferredClipboard && deferredClipboard.rejectBlob) {
        deferredClipboard.rejectBlob(error);
      }
      showToast(i18n.t(getLanguage(), 'exportLimit'), { duration: 3600 });
    } finally {
      captureInProgress = false;
    }
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
    }
  }

  function handleWindowKeydown(event) {
    if (state.areaCaptureActive && event.key === 'Escape') {
      event.preventDefault();
      cancelAreaCapture('areaCaptureCanceled');
      return;
    }

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

  function reloadGlobalSettings() {
    state.settings = {
      ...state.settings,
      ...storage.loadGlobalSettings()
    };
    if (state.settings.launcherPosition !== 'custom') {
      state.settings.launcherCustomPosition = null;
    }
    savePageData();
    refreshAnnotations(true);
  }

  function reloadPageData() {
    loadPageData();
    render();
  }

  return {
    init,
    reloadGlobalSettings,
    reloadPageData
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
    window.__pinfixApp__ = app;
    app.init();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
