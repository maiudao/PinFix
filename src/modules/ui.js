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
    if (!actionTarget) {
      return;
    }

    event.preventDefault();
    window.clearTimeout(toolClickTimer);
    toolClickTimer = null;
    if (Date.now() - lastQuickScreenshotAt < 500) {
      return;
    }
    runQuickScreenshotShortcut();
  }

  function runQuickScreenshotShortcut() {
    lastQuickScreenshotAt = Date.now();
    hideTooltip();
    closeAnnotationSidecar();
    options.onQuickScreenshot();
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
      syncMissingNoteState(textarea);
    }

    if (textarea.dataset.globalNote === 'true') {
      autoGrow(textarea, Number(textarea.dataset.maxHeight || 320));
      options.onChangeGlobalNote(textarea.value);
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

    const textarea = event.target;
    if (textarea instanceof HTMLTextAreaElement && textarea.dataset.noteId) {
      setCardExpanded(textarea.closest('.pinfix-note-card'), true);
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

    const textarea = event.target;
    if (!(textarea instanceof HTMLTextAreaElement)) {
      return;
    }

    if (textarea.dataset.noteId) {
      options.onChangeNote(textarea.dataset.noteId, textarea.value, true);
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
  }

  function renderClosedState() {
    closeAnnotationSidecar();
    hideTooltip();
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
        const active = button.tool === state.tool || button.tool === state.activePopover;
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

  function getToolsLayout(frameRect, labelRect, toolWidth, toolHeight) {
    const bounds = getOperationBounds();
    const candidates = [
      {
        pageLeft: frameRect.pageLeft + frameRect.width / 2 - toolWidth / 2,
        pageTop: frameRect.pageTop + frameRect.height / 2 - toolHeight / 2
      },
      {
        pageLeft: frameRect.pageLeft + 12,
        pageTop: frameRect.pageTop + frameRect.height / 2 - toolHeight / 2
      },
      {
        pageLeft: frameRect.pageLeft + frameRect.width - toolWidth - 12,
        pageTop: frameRect.pageTop + frameRect.height / 2 - toolHeight / 2
      },
      {
        pageLeft: frameRect.pageLeft + frameRect.width / 2 - toolWidth / 2,
        pageTop: frameRect.pageTop + frameRect.height + 8
      }
    ];

    const best = candidates
      .map((item) => getFloatingPositionInBounds(item.pageLeft, item.pageTop, toolWidth, toolHeight, bounds))
      .find((item) => !rectsOverlap({ ...item, width: toolWidth, height: toolHeight }, labelRect));

    return best || getFloatingPositionInBounds(
      frameRect.pageLeft + frameRect.width / 2 - toolWidth / 2,
      frameRect.pageTop + frameRect.height / 2 - toolHeight / 2,
      toolWidth,
      toolHeight,
      bounds
    );
  }

  function renderAnnotations(state) {
    const candidatePadding = PINFIX_BOX_PADDING_OPTIONS[state.settings.boxPadding] || 0;
    candidate.innerHTML = `
      <div class="pinfix-candidate-tools">
        <button type="button" data-action="candidate-adjust" data-direction="-1" title="${escapeHtml(t('tipShrink'))}" aria-label="${escapeHtml(t('tipShrink'))}">${iconSvg('minus')}</button>
        <button type="button" data-action="candidate-adjust" data-direction="1" title="${escapeHtml(t('tipExpand'))}" aria-label="${escapeHtml(t('tipExpand'))}">${iconSvg('plus')}</button>
        <button type="button" data-action="candidate-pick" data-kind="annotate" title="${escapeHtml(t('tipSelectMode'))}" aria-label="${escapeHtml(t('tipSelectMode'))}">${iconSvg('edit')}</button>
        <button type="button" data-action="candidate-pick" data-kind="mask" title="${escapeHtml(t('actionMaskArea'))}" aria-label="${escapeHtml(t('actionMaskArea'))}">${iconSvg('mask')}</button>
      </div>
    `;

    const currentCandidate = state.candidate;
    if (!currentCandidate || !state.open || state.tool !== 'select' || state.captureHidden) {
      candidate.classList.add('pinfix-hidden');
    } else {
      const displayRect = clampBoxRect(expandRect(currentCandidate, candidatePadding));
      candidate.classList.remove('pinfix-hidden');
      candidate.style.left = `${displayRect.pageLeft}px`;
      candidate.style.top = `${displayRect.pageTop}px`;
      candidate.style.width = `${Math.max(displayRect.width, 12)}px`;
      candidate.style.height = `${Math.max(displayRect.height, 12)}px`;
      const tools = candidate.querySelector('.pinfix-candidate-tools');
      const toolWidth = 150;
      const toolHeight = 36;
      const toolsPosition = getFloatingPosition(
        displayRect.pageLeft + displayRect.width / 2 - toolWidth / 2,
        displayRect.pageTop + displayRect.height / 2 - toolHeight / 2,
        toolWidth,
        toolHeight
      );
      tools.style.left = `${toolsPosition.pageLeft - displayRect.pageLeft}px`;
      tools.style.top = `${toolsPosition.pageTop - displayRect.pageTop}px`;
      tools.style.right = 'auto';
    }

    overlayLayer.querySelectorAll('.pinfix-annotation-box, .pinfix-annotation-tools, .pinfix-label, .pinfix-mask').forEach((node) => node.remove());
    noteLayer.innerHTML = '';

    state.masks.forEach((mask) => {
      renderMask(mask);
    });

    state.annotations.forEach((annotation) => {
      const renderInfo = renderAnnotationBox(annotation, state);
      if (renderInfo && state.settings.notesVisible && state.activeAnnotationId === annotation.id) {
        renderAnnotationNote(annotation, state, renderInfo);
      }
    });
  }

  function renderAnnotationBox(annotation, state) {
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

    renderAnnotationTools(annotation, renderInfo, labelLayout.rect, isActive);

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

  function renderAnnotationTools(annotation, renderInfo, labelRect, isActive) {
    const toolWidth = 116;
    const toolHeight = 36;
    const frameRect = renderInfo.frameRect;
    const position = getToolsLayout(
      frameRect,
      labelRect,
      toolWidth,
      toolHeight
    );
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
