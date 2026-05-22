const activateButton = document.getElementById('activateButton');
const statusText = document.getElementById('statusText');
const optionsButton = document.getElementById('optionsButton');
const donationButton = document.getElementById('donationButton');

function setStatus(text, tone) {
  statusText.textContent = text;
  statusText.dataset.tone = tone || 'neutral';
}

async function refreshCurrentPageStatus() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'PINFIX_GET_CURRENT_TAB_STATUS' });
    if (!response || !response.ok) {
      activateButton.disabled = true;
      setStatus(response && response.reason ? response.reason : '这个页面不支持 PinFix 标注。', 'error');
      return;
    }

    if (response.active) {
      activateButton.textContent = '已开启当前页面标注';
      activateButton.disabled = false;
      setStatus('PinFix 已经在当前页面开启。', 'success');
      return;
    }

    activateButton.textContent = '开启当前页面标注';
    activateButton.disabled = false;
    setStatus('点击后，PinFix 只会在当前页面显示。', 'neutral');
  } catch (error) {
    setStatus('PinFix 暂时无法读取当前页面状态。', 'error');
  }
}

async function activateCurrentPage() {
  activateButton.disabled = true;
  setStatus('正在开启当前页面标注...', 'neutral');

  try {
    const response = await chrome.runtime.sendMessage({ type: 'PINFIX_ACTIVATE_CURRENT_TAB' });
    if (response && response.ok) {
      setStatus(
        response.alreadyActive ? 'PinFix 已经在当前页面开启。' : 'PinFix 已在当前页面开启。',
        'success'
      );
      activateButton.textContent = '已开启当前页面标注';
      return;
    }

    setStatus(response && response.reason ? response.reason : '这个页面不支持 PinFix 标注。', 'error');
  } catch (error) {
    setStatus(error && error.message ? error.message : 'PinFix 暂时无法开启当前页面。', 'error');
  } finally {
    activateButton.disabled = false;
  }
}

activateButton.addEventListener('click', activateCurrentPage);

optionsButton.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

donationButton.addEventListener('click', () => {
  chrome.tabs.create({
    url: chrome.runtime.getURL('donation.html')
  });
});

refreshCurrentPageStatus();
