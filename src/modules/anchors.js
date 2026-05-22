function cssEscapeValue(value) {
  if (window.CSS && typeof window.CSS.escape === 'function') {
    return window.CSS.escape(value);
  }

  return String(value).replace(/[^a-zA-Z0-9_-]/g, '\\$&');
}

function captureElementRect(element) {
  const rect = element.getBoundingClientRect();

  return {
    pageLeft: rect.left + window.scrollX,
    pageTop: rect.top + window.scrollY,
    width: rect.width,
    height: rect.height,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight
  };
}

// Store both a CSS selector and a short text hint. The selector restores
// cleanly on most pages, while the text hint helps when the structure moves.
function buildElementAnchor(element) {
  return {
    selector: buildElementSelector(element),
    tagName: element.tagName,
    text: String(element.innerText || element.textContent || '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 120),
    rect: captureElementRect(element)
  };
}

function buildElementSelector(element) {
  if (element.id) {
    return `#${cssEscapeValue(element.id)}`;
  }

  const parts = [];
  let current = element;

  while (current && current instanceof HTMLElement && current !== document.body) {
    const tag = current.tagName.toLowerCase();
    const parent = current.parentElement;
    const className = Array.from(current.classList || [])
      .filter((item) => item && item.length < 28)
      .slice(0, 2)
      .map((item) => `.${cssEscapeValue(item)}`)
      .join('');

    if (!parent) {
      parts.unshift(tag);
      break;
    }

    const siblings = Array.from(parent.children).filter(
      (child) => child.tagName === current.tagName
    );
    const index = siblings.indexOf(current) + 1;
    parts.unshift(`${tag}${className}:nth-of-type(${index})`);
    current = parent;
  }

  return parts.join(' > ');
}

function findElementFromAnchor(anchor) {
  if (!anchor) {
    return null;
  }

  if (anchor.selector) {
    try {
      const direct = document.querySelector(anchor.selector);
      if (direct) {
        return direct;
      }
    } catch (error) {
      // Ignore invalid selectors from older saved data.
    }
  }

  if (anchor.tagName && anchor.text) {
    const candidates = Array.from(document.getElementsByTagName(anchor.tagName));
    const match = candidates.find((element) => {
      const text = String(element.innerText || element.textContent || '')
        .replace(/\s+/g, ' ')
        .trim();
      return text && anchor.text && text.includes(anchor.text.slice(0, 24));
    });

    if (match) {
      return match;
    }
  }

  return null;
}

function resolveAnnotationRect(annotation) {
  const anchorElement = findElementFromAnchor(annotation.anchor);
  if (anchorElement) {
    return {
      rect: captureElementRect(anchorElement),
      element: anchorElement
    };
  }

  return {
    rect: annotation.anchor ? annotation.anchor.rect : annotation.rect,
    element: null
  };
}

function parseRgbColor(colorValue) {
  const value = String(colorValue || '').trim();
  const rgbMatch = value.match(/rgba?\(([^)]+)\)/i);

  if (!rgbMatch) {
    return null;
  }

  const parts = rgbMatch[1].split(',').map((item) => Number(item.trim()));
  if (parts.length < 3) {
    return null;
  }

  return {
    r: parts[0],
    g: parts[1],
    b: parts[2],
    a: parts[3] == null ? 1 : parts[3]
  };
}

function luminanceFromRgb(rgb) {
  const channels = [rgb.r, rgb.g, rgb.b].map((value) => {
    const normalised = value / 255;
    return normalised <= 0.03928
      ? normalised / 12.92
      : ((normalised + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function detectSurfaceTone(element, contrastMode) {
  if (contrastMode === 'light') {
    return 'light';
  }

  if (contrastMode === 'dark') {
    return 'dark';
  }

  let current = element;
  while (current && current instanceof HTMLElement) {
    const computedStyle = window.getComputedStyle(current);
    const rgb = parseRgbColor(computedStyle.backgroundColor);
    if (rgb && rgb.a > 0.05) {
      return luminanceFromRgb(rgb) > 0.45 ? 'light' : 'dark';
    }
    current = current.parentElement;
  }

  const textRgb = parseRgbColor(window.getComputedStyle(element).color);
  if (textRgb) {
    return luminanceFromRgb(textRgb) > 0.55 ? 'dark' : 'light';
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
