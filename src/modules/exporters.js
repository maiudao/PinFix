function createExporters(options) {
  const circledDigits = ['⓪', '①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩', '⑪', '⑫'];

  function formatBullet(number) {
    return circledDigits[number] || `${number}.`;
  }

  function buildMarkdown(context) {
    const { language, i18n, annotations, globalNote } = context;
    const lines = [];

    lines.push(`${i18n.t(language, 'pageTitle')}：${document.title}`);
    lines.push(`${i18n.t(language, 'pageUrl')}：${window.location.href}`);
    lines.push(i18n.t(language, 'viewportMode'));
    lines.push('');
    lines.push(`${i18n.t(language, 'changeSummary')}：`);

    annotations.forEach((annotation) => {
      lines.push(`${formatBullet(annotation.number)}：${summariseNote(annotation.note) || '-'}`);
    });

    lines.push('');
    lines.push(`${i18n.t(language, 'changeDetails')}：`);
    lines.push('');

    annotations.forEach((annotation) => {
      lines.push(`${formatBullet(annotation.number)}：`);
      lines.push(annotation.note ? annotation.note.trim() : '-');
      lines.push('');
    });

    lines.push(`${i18n.t(language, 'businessNote')}：`);
    lines.push(globalNote ? globalNote.trim() : '-');
    lines.push('');
    lines.push(`${i18n.t(language, 'extraInfo')}：`);
    lines.push(`- ${i18n.t(language, 'viewportInfo')}：${window.innerWidth} x ${window.innerHeight}`);
    lines.push(`- ${i18n.t(language, 'countInfo')}：${annotations.length}`);
    lines.push(`- ${i18n.t(language, 'timeInfo')}：${formatTimestamp(new Date(), language)}`);

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

  async function exportViewportImage(context) {
    if (typeof html2canvas !== 'function') {
      throw new Error('html2canvas is not available');
    }

    await options.beforeCapture();
    await sleep(60);

    try {
      const canvas = await html2canvas(document.documentElement, {
        backgroundColor: null,
        logging: false,
        useCORS: true,
        scale: Math.min(window.devicePixelRatio || 1, 2),
        width: window.innerWidth,
        height: window.innerHeight,
        x: window.scrollX,
        y: window.scrollY,
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

      return { copied, downloaded, canvas, blob };
    } finally {
      await options.afterCapture();
    }
  }

  return {
    buildMarkdown,
    copyNotes,
    downloadBlob,
    exportViewportImage
  };
}
