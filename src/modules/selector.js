function createSelectorManager(options) {
  let enabled = false;
  let currentChain = [];
  let currentIndex = 0;
  let lastPoint = null;

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
    const hasVisualBox = style.borderStyle !== 'none' || style.backgroundColor !== 'rgba(0, 0, 0, 0)';
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

  function findDefaultIndex(chain) {
    if (!chain.length) {
      return 0;
    }

    const viewportArea = window.innerWidth * window.innerHeight;

    for (let index = 0; index < chain.length; index += 1) {
      const rect = chain[index].getBoundingClientRect();
      const area = rect.width * rect.height;
      const goodArea = area > 1600 && area < viewportArea * 0.65;
      const balancedShape = rect.width > 24 && rect.height > 24;
      if (goodArea && balancedShape) {
        return index;
      }
    }

    return 0;
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
    if (!enabled || !point) {
      return;
    }

    const target = document.elementFromPoint(point.x, point.y);
    if (!target) {
      currentChain = [];
      currentIndex = 0;
      notifyCandidate();
      return;
    }

    if (isIgnoredElement(target)) {
      return;
    }

    const chain = collectChain(target);
    const currentElement = currentChain[currentIndex] || null;
    currentChain = chain;
    if (currentElement && chain.includes(currentElement)) {
      currentIndex = chain.indexOf(currentElement);
    } else {
      currentIndex = findDefaultIndex(chain);
    }
    notifyCandidate();
  }

  function handlePointerMove(event) {
    lastPoint = { x: event.clientX, y: event.clientY };
    refreshFromPoint(lastPoint);
  }

  function handleClick(event) {
    if (!enabled) {
      return;
    }

    const element = currentChain[currentIndex];
    if (!element || isIgnoredElement(event.target)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    options.onSelect(element);
  }

  function adjustSelection(direction) {
    if (!currentChain.length) {
      return;
    }

    currentIndex = clamp(currentIndex + direction, 0, currentChain.length - 1);
    notifyCandidate();
  }

  function handleKeydown(event) {
    if (!enabled || isEditableTarget(event.target)) {
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
      window.removeEventListener('pointermove', handlePointerMove, true);
      window.removeEventListener('click', handleClick, true);
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
