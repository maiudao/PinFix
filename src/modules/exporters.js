function createExporters(options) {
  const circledDigits = ['⓪', '①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩', '⑪', '⑫'];

  function formatBullet(number) {
    return circledDigits[number] || `${number}.`;
  }

  function buildMarkdown(context) {
    const {
      language,
      i18n,
      annotations,
      businessNote = context.globalNote
    } = context;
    const lines = [];

    lines.push(`${i18n.t(language, 'pageTitle')}：${document.title}`);
    lines.push(`${i18n.t(language, 'pageUrl')}：${window.location.href}`);
    lines.push(i18n.t(language, 'viewportMode'));
    lines.push('');
    lines.push(`${i18n.t(language, 'changeDetails')}：`);
    lines.push('');

    annotations.forEach((annotation) => {
      lines.push(`${formatBullet(annotation.number)}：`);
      lines.push(annotation.note ? annotation.note.trim() : '-');
      lines.push('');
    });

    lines.push(`${i18n.t(language, 'businessNote')}：`);
    lines.push(businessNote ? businessNote.trim() : '-');
    lines.push('');
    lines.push(`${i18n.t(language, 'extraInfo')}：`);
    lines.push(`- ${i18n.t(language, 'viewportInfo')}：${window.innerWidth} x ${window.innerHeight}`);
    lines.push(`- ${i18n.t(language, 'countInfo')}：${annotations.length}`);

    return lines.join('\n');
  }

  async function copyNotes(context) {
    const markdown = buildMarkdown(context);
    await copyTextWithFallback(markdown);
    return markdown;
  }

  async function copyTextWithFallback(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', 'readonly');
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      textarea.style.top = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();

      const copied = document.execCommand('copy');
      textarea.remove();

      if (!copied) {
        throw error;
      }

      return true;
    }
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function canvasToPngBlob(canvas) {
    return new Promise((resolve) => {
      canvas.toBlob(resolve, 'image/png');
    });
  }

  function base64ToBlob(base64, mimeType) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }

    return new Blob([bytes], { type: mimeType || 'image/png' });
  }

  async function tryCopyBlob(blob) {
    if (!window.ClipboardItem || !navigator.clipboard || !navigator.clipboard.write) {
      return false;
    }

    if (!blob) {
      return false;
    }

    await navigator.clipboard.write([
      new ClipboardItem({
        'image/png': blob
      })
    ]);

    return true;
  }

  function createDeferredPngClipboardItem() {
    if (!window.ClipboardItem || !navigator.clipboard || !navigator.clipboard.write) {
      return null;
    }

    let resolveBlob;
    let rejectBlob;
    const blobPromise = new Promise((resolve, reject) => {
      resolveBlob = resolve;
      rejectBlob = reject;
    });

    const copyPromise = navigator.clipboard.write([
      new ClipboardItem({
        'image/png': blobPromise
      })
    ]);
    copyPromise.catch(() => false);

    return {
      copyPromise,
      resolveBlob,
      rejectBlob
    };
  }

  async function captureWithChromeVisibleTab(context) {
    if (
      !window.__pinfixExtensionMode__ ||
      typeof chrome === 'undefined' ||
      !chrome.runtime ||
      !chrome.runtime.sendMessage ||
      context.rect
    ) {
      return null;
    }

    await options.beforeCapture();
    await sleep(80);

    try {
      const response = await chrome.runtime.sendMessage({ type: 'PINFIX_CAPTURE_VISIBLE_TAB' });
      if (!response || !response.ok || !response.base64) {
        throw new Error(response && response.reason ? response.reason : 'Chrome screenshot failed');
      }

      const blob = base64ToBlob(response.base64, response.mimeType);
      let copied = false;
      if (context.preferClipboard) {
        try {
          copied = await tryCopyBlob(blob);
        } catch (error) {
          copied = false;
        }
      }

      let downloaded = false;
      if (!copied) {
        downloadBlob(blob, `pinfix-${Date.now()}.png`);
        downloaded = true;
      }

      return { copied, downloaded, canvas: null, blob, nativeCapture: true };
    } finally {
      await options.afterCapture();
    }
  }

  async function exportViewportImage(context) {
    const nativeResult = await captureWithChromeVisibleTab(context || {});
    if (nativeResult) {
      return nativeResult;
    }

    if (typeof html2canvas !== 'function') {
      throw new Error('html2canvas is not available');
    }

    await options.beforeCapture();
    await sleep(60);

    try {
      const sourceRect = context && context.rect ? context.rect : null;
      const captureRect = sourceRect
        ? {
          x: Math.max(0, Math.min(window.innerWidth, Number(sourceRect.x) || 0)),
          y: Math.max(0, Math.min(window.innerHeight, Number(sourceRect.y) || 0)),
          width: Math.max(1, Math.min(window.innerWidth, Number(sourceRect.width) || 0)),
          height: Math.max(1, Math.min(window.innerHeight, Number(sourceRect.height) || 0))
        }
        : {
          x: 0,
          y: 0,
          width: window.innerWidth,
          height: window.innerHeight
        };
      captureRect.width = Math.max(1, Math.min(captureRect.width, window.innerWidth - captureRect.x));
      captureRect.height = Math.max(1, Math.min(captureRect.height, window.innerHeight - captureRect.y));

      const canvas = await html2canvas(document.documentElement, {
        backgroundColor: null,
        logging: false,
        useCORS: true,
        scale: Math.min(window.devicePixelRatio || 1, 2),
        width: captureRect.width,
        height: captureRect.height,
        x: window.scrollX + captureRect.x,
        y: window.scrollY + captureRect.y,
        scrollX: window.scrollX,
        scrollY: window.scrollY,
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight
      });

      const blob = await canvasToPngBlob(canvas);
      if (!blob) {
        throw new Error('Failed to create PNG blob');
      }

      let copied = false;
      if (context.preferClipboard) {
        if (context.deferredClipboard && context.deferredClipboard.resolveBlob) {
          try {
            context.deferredClipboard.resolveBlob(blob);
            await context.deferredClipboard.copyPromise;
            copied = true;
          } catch (error) {
            copied = false;
          }
        }

        if (!copied) {
          try {
            copied = await tryCopyBlob(blob);
          } catch (error) {
            copied = false;
          }
        }
      }

      let downloaded = false;
      if (!copied) {
        downloadBlob(blob, `pinfix-${Date.now()}.png`);
        downloaded = true;
      }

      return { copied, downloaded, canvas, blob };
    } finally {
      await options.afterCapture();
    }
  }

  return {
    buildMarkdown,
    copyNotes,
    createDeferredPngClipboardItem,
    downloadBlob,
    exportViewportImage
  };
}
