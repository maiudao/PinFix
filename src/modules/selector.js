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
