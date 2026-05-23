function cssEscapeValue(value) {
  if (window.CSS && typeof window.CSS.escape === 'function') {
    return window.CSS.escape(value);
  }

  return String(value).replace(/[^a-zA-Z0-9_-]/g, '\\$&');
}

function captureElementRect(element) {
  const rect = element.getBoundingClientRect();
  const documentSize = getDocumentSize();

  return {
    pageLeft: rect.left + window.scrollX,
    pageTop: rect.top + window.scrollY,
    width: rect.width,
    height: rect.height,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    documentWidth: documentSize.width,
    documentHeight: documentSize.height
  };
}

function normaliseAnnotationRect(rect, minSize = 1) {
  const documentSize = getDocumentSize();
  const width = clamp(
    Number(rect && rect.width) || minSize,
    minSize,
    Math.max(minSize, documentSize.width)
  );
  const height = clamp(
    Number(rect && rect.height) || minSize,
    minSize,
    Math.max(minSize, documentSize.height)
  );
  const maxLeft = Math.max(0, documentSize.width - width);
  const maxTop = Math.max(0, documentSize.height - height);

  return {
    pageLeft: clamp(Number(rect && rect.pageLeft) || 0, 0, maxLeft),
    pageTop: clamp(Number(rect && rect.pageTop) || 0, 0, maxTop),
    width,
    height,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    documentWidth: documentSize.width,
    documentHeight: documentSize.height
  };
}

function createRelativeAnnotationRect(rect) {
  if (!rect) {
    return null;
  }

  const documentSize = getDocumentSize();
  const baseWidth = Math.max(1, Number(rect.documentWidth) || documentSize.width || Number(rect.viewportWidth) || window.innerWidth || 1);
  const baseHeight = Math.max(1, Number(rect.documentHeight) || documentSize.height || Number(rect.viewportHeight) || window.innerHeight || 1);

  return {
    leftRatio: clamp((Number(rect.pageLeft) || 0) / baseWidth, 0, 1),
    topRatio: clamp((Number(rect.pageTop) || 0) / baseHeight, 0, 1),
    widthRatio: clamp((Number(rect.width) || 0) / baseWidth, 0, 1),
    heightRatio: clamp((Number(rect.height) || 0) / baseHeight, 0, 1),
    documentWidth: baseWidth,
    documentHeight: baseHeight
  };
}

function resolveRelativeAnnotationRect(relativeRect, fallbackRect) {
  if (!relativeRect) {
    return fallbackRect ? normaliseAnnotationRect(fallbackRect) : null;
  }

  const documentSize = getDocumentSize();
  const width = Math.max(1, documentSize.width);
  const height = Math.max(1, documentSize.height);
  const resolvedWidth = Math.max(1, Number(relativeRect.widthRatio) * width);
  const resolvedHeight = Math.max(1, Number(relativeRect.heightRatio) * height);

  return normaliseAnnotationRect({
    pageLeft: Number(relativeRect.leftRatio) * width,
    pageTop: Number(relativeRect.topRatio) * height,
    width: resolvedWidth,
    height: resolvedHeight
  });
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

  if (!annotation.anchor) {
    const relativeRect = annotation.relativeRect || createRelativeAnnotationRect(annotation.rect);
    return {
      rect: resolveRelativeAnnotationRect(relativeRect, annotation.rect),
      relativeRect,
      element: null
    };
  }

  return {
    rect: annotation.anchor ? annotation.anchor.rect : normaliseAnnotationRect(annotation.rect),
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
