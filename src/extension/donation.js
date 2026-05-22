const donationCodes = document.getElementById('donationCodes');
const donationIntro = document.getElementById('donationIntro');

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderCode(item) {
  if (!item || !item.enabled || !item.image) {
    return '';
  }

  const image = String(item.image || '');
  if (!image.startsWith('assets/donate/') || !/\.(png|jpe?g|webp)$/i.test(image)) {
    return '';
  }

  return `
    <article class="donation-card">
      <img src="${escapeHtml(image)}" alt="${escapeHtml(item.name)}收款码" width="260" height="260">
      <strong>${escapeHtml(item.name)}</strong>
      <span>${escapeHtml(item.hint || '扫码自愿支持')}</span>
    </article>
  `;
}

function renderEmpty() {
  donationCodes.innerHTML = `
    <div class="muted-line">
      还没有配置收款码。请按下方说明放入图片并编辑配置文件。
    </div>
  `;
}

fetch('donation.config.json')
  .then((response) => response.ok ? response.json() : null)
  .then((config) => {
    if (!config || config.enabled === false) {
      renderEmpty();
      return;
    }

    if (config.intro) {
      donationIntro.textContent = config.intro;
    }

    const html = (config.methods || []).map(renderCode).filter(Boolean).join('');
    if (!html) {
      renderEmpty();
      return;
    }

    donationCodes.innerHTML = html;
    donationCodes.querySelectorAll('img').forEach((image) => {
      image.addEventListener('error', () => {
        image.replaceWith(document.createTextNode('收款码图片未找到'));
      }, { once: true });
    });
  })
  .catch(renderEmpty);
