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
  let candidate = null;
  let resizeCleanup = null;

  function getLanguage() {
    return options.getLanguage();
  }

  function t(key) {
    return options.t(getLanguage(), key);
  }

  function mount() {
    if (root) {
      return;
    }

    const style = document.createElement('style');
    style.id = 'pinfix-style';
    style.textContent = getPinFixStyles();
    document.head.appendChild(style);

    root = document.createElement('div');
    root.id = 'pinfix-root';
    root.dataset.pinfixIgnore = 'true';
    root.innerHTML = `
      <div class="pinfix-chrome" data-html2canvas-ignore="true">
        <button class="pinfix-launcher" type="button" data-action="toggle-open">PF</button>
        <div class="pinfix-toolbar pinfix-hidden"></div>
      </div>
      <div class="pinfix-overlay-layer"></div>
      <div class="pinfix-note-layer"></div>
      <div class="pinfix-popover pinfix-hidden" data-html2canvas-ignore="true"></div>
      <button class="pinfix-global-strip" type="button" data-action="toggle-global"></button>
      <div class="pinfix-global-panel pinfix-hidden" data-html2canvas-ignore="true"></div>
      <div class="pinfix-toast pinfix-hidden" data-html2canvas-ignore="true"></div>
      <div class="pinfix-countdown pinfix-hidden"></div>
    `;

    document.body.appendChild(root);

    chrome = root.querySelector('.pinfix-chrome');
    overlayLayer = root.querySelector('.pinfix-overlay-layer');
    noteLayer = root.querySelector('.pinfix-note-layer');
    popover = root.querySelector('.pinfix-popover');
    globalStrip = root.querySelector('.pinfix-global-strip');
    globalPanel = root.querySelector('.pinfix-global-panel');
    toast = root.querySelector('.pinfix-toast');
    countdown = root.querySelector('.pinfix-countdown');
    candidate = document.createElement('div');
    candidate.className = 'pinfix-candidate pinfix-hidden';
    candidate.innerHTML = `
      <div class="pinfix-tip">
        <span>[ ${t('tipShrink')}</span>
        <span>] ${t('tipExpand')}</span>
      </div>
    `;
    overlayLayer.appendChild(candidate);

    root.addEventListener('click', handleClick);
    root.addEventListener('input', handleInput);
    root.addEventListener('focusin', handleFocusIn);
    root.addEventListener('focusout', handleFocusOut);
    root.addEventListener('mouseenter', handleMouseEnter, true);
    root.addEventListener('mouseleave', handleMouseLeave, true);

    document.addEventListener('pointerdown', handleDocumentPointerDown, true);
  }

  function unmount() {
    if (!root) {
      return;
    }

    if (resizeCleanup) {
      resizeCleanup();
      resizeCleanup = null;
    }

    document.removeEventListener('pointerdown', handleDocumentPointerDown, true);
    root.remove();
    root = null;
  }

  function handleDocumentPointerDown(event) {
    if (!root) {
      return;
    }

    if (!root.contains(event.target)) {
      options.onClosePopover();
    }
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
    if (action === 'tool') {
      options.onTool(actionTarget.dataset.tool);
    }
    if (action === 'set-setting') {
      options.onSetSetting(actionTarget.dataset.key, actionTarget.dataset.value);
    }
    if (action === 'run') {
      options.onRun(actionTarget.dataset.name, actionTarget.dataset.arg || '');
    }
    if (action === 'delete-annotation') {
      options.onDeleteAnnotation(actionTarget.dataset.id);
    }
    if (action === 'delete-mask') {
      options.onDeleteMask(actionTarget.dataset.id);
    }
    if (action === 'focus-annotation') {
      options.onFocusAnnotation(actionTarget.dataset.id);
    }
    if (action === 'edit-annotation') {
      const noteCard = actionTarget.closest('.pinfix-note-card');
      if (noteCard) {
        setCardExpanded(noteCard, true);
        const input = noteCard.querySelector('.pinfix-note-input');
        if (input) {
          input.classList.remove('pinfix-hidden');
          input.focus();
        }
      }
    }
  }

  function handleInput(event) {
    const textarea = event.target;
    if (!(textarea instanceof HTMLTextAreaElement)) {
      return;
    }

    if (textarea.dataset.noteId) {
      autoGrow(textarea, 220);
      options.onChangeNote(textarea.dataset.noteId, textarea.value, false);
      syncSummary(textarea);
    }

    if (textarea.dataset.globalNote === 'true') {
      autoGrow(textarea, Number(textarea.dataset.maxHeight || 320));
      options.onChangeGlobalNote(textarea.value);
    }
  }

  function handleFocusIn(event) {
    const textarea = event.target;
    if (textarea instanceof HTMLTextAreaElement && textarea.dataset.noteId) {
      setCardExpanded(textarea.closest('.pinfix-note-card'), true);
    }
  }

  function handleFocusOut(event) {
    const textarea = event.target;
    if (!(textarea instanceof HTMLTextAreaElement)) {
      return;
    }

    if (textarea.dataset.noteId) {
      options.onChangeNote(textarea.dataset.noteId, textarea.value, true);
      setCardExpanded(textarea.closest('.pinfix-note-card'), false);
    }
  }

  function handleMouseEnter(event) {
    const card = event.target.closest('.pinfix-note-card');
    if (card) {
      setCardExpanded(card, true);
    }
  }

  function handleMouseLeave(event) {
    const card = event.target.closest('.pinfix-note-card');
    if (card && !card.contains(document.activeElement)) {
      setCardExpanded(card, false);
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

  function setRootSize() {
    const size = getDocumentSize();
    root.style.width = `${size.width}px`;
    root.style.height = `${size.height}px`;
  }

  function render(state) {
    mount();
    setRootSize();
    root.classList.toggle('pinfix-hidden-for-capture', Boolean(state.captureHidden));
    renderChrome(state);
    renderPopover(state);
    renderAnnotations(state);
    renderGlobalNotes(state);
    renderToast(state);
    renderCountdown(state);
  }

  function renderChrome(state) {
    const launcher = root.querySelector('.pinfix-launcher');
    const toolbar = root.querySelector('.pinfix-toolbar');
    const buttons = [
      { tool: 'select', label: t('select'), icon: '◎' },
      { tool: 'style', label: t('style'), icon: '◧' },
      { tool: 'capture', label: t('capture'), icon: '▣' },
      { tool: 'copy', label: t('copy'), icon: '⎘' },
      { tool: 'more', label: t('more'), icon: '⋯' }
    ];

    launcher.classList.toggle('is-active', state.open);
    launcher.title = state.open ? t('launcherClose') : t('launcherOpen');
    launcher.textContent = 'PF';

    toolbar.classList.toggle('pinfix-hidden', !state.open);
    toolbar.innerHTML = buttons
      .map((button) => {
        const active = button.tool === state.tool || button.tool === state.activePopover;
        return `
          <button
            class="pinfix-tool-button ${active ? 'is-active' : ''}"
            type="button"
            title="${escapeHtml(button.label)}"
            data-action="tool"
            data-tool="${button.tool}"
          >${button.icon}</button>
        `;
      })
      .join('');
  }

  function renderPopover(state) {
    if (!state.open || !state.activePopover) {
      popover.classList.add('pinfix-hidden');
      popover.innerHTML = '';
      return;
    }

    const toolbarBox = root.querySelector('.pinfix-toolbar').getBoundingClientRect();
    popover.classList.remove('pinfix-hidden');
    const nextLeft = clamp(toolbarBox.right + 12, 12, window.innerWidth - 260);
    popover.style.left = `${nextLeft}px`;
    popover.innerHTML = buildPopoverContent(state);
    const maxTop = Math.max(12, window.innerHeight - popover.offsetHeight - 12);
    const nextTop = clamp(toolbarBox.top, 12, maxTop);
    popover.style.top = `${nextTop}px`;
  }

  function renderAnnotations(state) {
    const modeKey = state.selectionMode === 'mask' ? 'tipMaskMode' : 'tipSelectMode';
    const candidatePadding = PINFIX_BOX_PADDING_OPTIONS[state.settings.boxPadding] || 0;
    candidate.innerHTML = `
      <div class="pinfix-tip">
        <span>[ ${escapeHtml(t('tipShrink'))}</span>
        <span>] ${escapeHtml(t('tipExpand'))}</span>
        <span>${escapeHtml(t(modeKey))}</span>
      </div>
    `;

    const currentCandidate = state.candidate;
    if (!currentCandidate || !state.open || state.tool !== 'select' || state.captureHidden) {
      candidate.classList.add('pinfix-hidden');
    } else {
      const displayRect = expandRect(currentCandidate, candidatePadding);
      candidate.classList.remove('pinfix-hidden');
      candidate.style.left = `${displayRect.pageLeft}px`;
      candidate.style.top = `${displayRect.pageTop}px`;
      candidate.style.width = `${Math.max(displayRect.width, 12)}px`;
      candidate.style.height = `${Math.max(displayRect.height, 12)}px`;
    }

    overlayLayer.querySelectorAll('.pinfix-annotation-box, .pinfix-label, .pinfix-mask').forEach((node) => node.remove());
    noteLayer.innerHTML = '';

    state.masks.forEach((mask) => {
      renderMask(mask);
    });

    state.annotations.forEach((annotation) => {
      renderAnnotationBox(annotation, state);
      if (state.settings.notesVisible) {
        renderAnnotationNote(annotation, state);
      }
    });
  }

  function renderAnnotationBox(annotation, state) {
    const color = PINFIX_COLOR_PRESETS[annotation.style.colorPreset].color;
    const lineWidth = PINFIX_LINE_WIDTHS[annotation.style.lineWidth];
    const labelSize = PINFIX_LABEL_SIZES[annotation.style.labelSize];
    const padding = PINFIX_BOX_PADDING_OPTIONS[annotation.style.boxPadding] || 0;
    const stroke = annotation.surfaceTone === 'dark' ? 'rgba(255,255,255,0.95)' : 'rgba(15,23,42,0.88)';
    const isFocused = annotation.id === state.highlightedAnnotationId;
    const boxRect = expandRect(annotation.rect, padding);

    const box = document.createElement('div');
    box.className = `pinfix-annotation-box ${isFocused ? 'is-focused' : ''}`;
    box.style.left = `${boxRect.pageLeft}px`;
    box.style.top = `${boxRect.pageTop}px`;
    box.style.width = `${Math.max(boxRect.width, 8)}px`;
    box.style.height = `${Math.max(boxRect.height, 8)}px`;
    box.style.border = `${lineWidth}px solid ${color}`;
    box.style.boxShadow = `0 0 0 1px ${stroke} inset, 0 0 18px ${color}33`;
    overlayLayer.appendChild(box);

    const label = document.createElement('div');
    label.className = `pinfix-label ${isFocused ? 'is-focused' : ''}`;
    label.textContent = String(annotation.number);
    label.style.left = `${boxRect.pageLeft + boxRect.width - labelSize * 0.38}px`;
    label.style.top = `${boxRect.pageTop - labelSize * 0.38}px`;
    label.style.width = `${labelSize}px`;
    label.style.height = `${labelSize}px`;
    label.style.fontSize = `${Math.round(labelSize * 0.52)}px`;
    label.style.background = annotation.style.labelStyle === 'ring' ? '#ffffff' : color;
    label.style.color = annotation.style.labelStyle === 'ring' ? color : '#ffffff';
    label.style.border = `3px solid ${stroke}`;
    label.style.borderRadius = '999px';
    if (annotation.style.labelStyle === 'ring') {
      label.style.boxShadow = `0 0 0 3px ${color} inset, 0 10px 22px rgba(15,23,42,0.22)`;
    }
    overlayLayer.appendChild(label);
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
      <button class="pinfix-mask-delete" type="button" data-action="delete-mask" data-id="${mask.id}">&times;</button>
    `;
    overlayLayer.appendChild(element);
  }

  function getNotePosition(annotation) {
    const estimatedHeight = 128;
    const padding = PINFIX_BOX_PADDING_OPTIONS[annotation.style.boxPadding] || 0;
    const boxRect = expandRect(annotation.rect, padding);
    const defaultTop = boxRect.pageTop + boxRect.height + 10;
    const viewportBottom = window.scrollY + window.innerHeight;
    const shouldFlip = defaultTop + estimatedHeight > viewportBottom && boxRect.pageTop > window.scrollY + estimatedHeight;

    return {
      left: clamp(boxRect.pageLeft, 12, window.scrollX + window.innerWidth - 372),
      top: shouldFlip ? boxRect.pageTop - estimatedHeight - 10 : defaultTop
    };
  }

  function renderAnnotationNote(annotation, state) {
    const color = PINFIX_COLOR_PRESETS[annotation.style.colorPreset].color;
    const position = getNotePosition(annotation);
    const summaryText = summariseNote(annotation.note) || t('noteMissingShort');
    const card = document.createElement('div');
    card.className = `pinfix-note-card ${annotation.surfaceTone === 'dark' ? 'is-dark' : ''} ${annotation.id === state.highlightedAnnotationId ? 'is-focused' : ''}`;
    card.dataset.notesVisible = String(state.settings.notesVisible);
    card.style.left = `${position.left}px`;
    card.style.top = `${position.top}px`;
    card.style.borderColor = `${color}66`;
    card.innerHTML = `
      <div class="pinfix-note-head">
        <div class="pinfix-note-badge" style="background:${color}">${annotation.number}</div>
        <button class="pinfix-note-delete" type="button" data-action="delete-annotation" data-id="${annotation.id}">&times;</button>
      </div>
      <button class="pinfix-note-summary" type="button" data-action="edit-annotation">${escapeHtml(summaryText)}</button>
      <textarea
        class="pinfix-note-input pinfix-hidden"
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

  function renderGlobalNotes(state) {
    globalStrip.classList.toggle('pinfix-hidden', state.globalNoteOpen);
    globalPanel.classList.toggle('pinfix-hidden', !state.globalNoteOpen);
    globalStrip.textContent = t('globalNotes');
    globalStrip.classList.toggle('is-dark', state.pageTone === 'dark');
    globalPanel.classList.toggle('is-dark', state.pageTone === 'dark');

    if (!state.globalNoteOpen) {
      return;
    }

    globalPanel.innerHTML = `
      <div class="pinfix-global-head">
        <strong>${escapeHtml(t('globalNotes'))}</strong>
        <button type="button" class="pinfix-note-delete" data-action="close-global">&times;</button>
      </div>
      <textarea
        class="pinfix-global-input"
        data-global-note="true"
        data-max-height="${Math.max(state.globalNoteHeight - 80, 120)}"
        placeholder="${escapeHtml(t('globalNotesHint'))}"
      >${escapeHtml(state.globalNote || '')}</textarea>
      <div class="pinfix-global-resize" data-role="resize-global"></div>
    `;
    globalPanel.style.height = `${state.globalNoteHeight}px`;

    const textarea = globalPanel.querySelector('.pinfix-global-input');
    if (textarea) {
      autoGrow(textarea, Math.max(state.globalNoteHeight - 80, 120));
    }

    bindGlobalResize();
  }

  function bindGlobalResize() {
    if (resizeCleanup) {
      resizeCleanup();
      resizeCleanup = null;
    }

    const handle = globalPanel.querySelector('[data-role="resize-global"]');
    if (!handle) {
      return;
    }

    const pointerMove = (event) => {
      options.onResizeGlobalNote(clamp(window.innerHeight - event.clientY + 20, 180, 480));
    };

    const pointerUp = () => {
      window.removeEventListener('pointermove', pointerMove, true);
      window.removeEventListener('pointerup', pointerUp, true);
    };

    handle.addEventListener(
      'pointerdown',
      (event) => {
        event.preventDefault();
        window.addEventListener('pointermove', pointerMove, true);
        window.addEventListener('pointerup', pointerUp, true);
      },
      { once: true }
    );

    resizeCleanup = pointerUp;
  }

  function renderToast(state) {
    if (!state.toast) {
      toast.classList.add('pinfix-hidden');
      toast.textContent = '';
      return;
    }

    toast.classList.remove('pinfix-hidden');
    toast.classList.toggle('is-dark', state.pageTone === 'dark');
    toast.textContent = state.toast;
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
          <button type="button" data-action="run" data-name="export-image">${escapeHtml(t('exportImage'))}</button>
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
    const annotationItems = state.annotations.length
      ? state.annotations
          .map((annotation) => {
            const label = summariseNote(annotation.note) || t('noteMissingShort');
            return `
              <button type="button" data-action="focus-annotation" data-id="${annotation.id}">
                ${annotation.number}. ${escapeHtml(label)}
              </button>
            `;
          })
          .join('')
      : `<button type="button" disabled>${escapeHtml(t('emptyState'))}</button>`;

    const reviewBlock = reviewState.ready
      ? `<div class="pinfix-meta-copy pinfix-status-good">${escapeHtml(t('reviewReady'))}</div>`
      : `
        <div class="pinfix-meta-copy pinfix-status-warn">
          <div>${escapeHtml(fillTemplate(t('reviewMissing'), { count: reviewState.missingCount }))}</div>
          <div>${escapeHtml(fillTemplate(t('reviewMissingList'), { numbers: reviewState.missingNumbers.join(', ') }))}</div>
        </div>
      `;

    const maskButtonKey = state.selectionMode === 'mask' ? 'privacyModeStop' : 'privacyModeStart';

    return `
      <h3>${escapeHtml(t('more'))}</h3>
      <div class="pinfix-list">
        <button type="button" data-action="run" data-name="undo">${escapeHtml(t('undo'))}</button>
        <button type="button" data-action="run" data-name="toggle-notes">${escapeHtml(t(noteToggleKey))}</button>
        <button type="button" data-action="run" data-name="clear-page">${escapeHtml(t('clearPage'))}</button>
      </div>
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
      <div class="pinfix-section-title">${escapeHtml(t('hotkeys'))}</div>
      <div class="pinfix-meta-copy">
        <div>${escapeHtml(t('hotkeyCopy'))}</div>
        <div>${escapeHtml(t('hotkeyScreenshot'))}</div>
        <div>${escapeHtml(t('hotkeyExport'))}</div>
        <div>${escapeHtml(t('hotkeyUndo'))}</div>
        <div>${escapeHtml(t('hotkeyNotes'))}</div>
      </div>
      <div class="pinfix-divider"></div>
      <div class="pinfix-section-title">${escapeHtml(t('annotationList'))}</div>
      <div class="pinfix-list">${annotationItems}</div>
    `;
  }

  return {
    mount,
    unmount,
    render
  };
}
