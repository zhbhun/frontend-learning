// 本示例演示：覆盖页是普通扩展页面——直接读写 chrome.storage.sync，
// 与选项页、popup 共享同一份设置，主题类名由选项页写入的主题决定。
const titleEl = document.querySelector('#title');
const DEFAULT_SETTINGS = { title: '我的新标签页', theme: 'blue' };

function apply(settings) {
  titleEl.textContent = settings.title || DEFAULT_SETTINGS.title;
  document.body.className = `theme-${settings.theme || DEFAULT_SETTINGS.theme}`;
}

chrome.storage.sync.get(DEFAULT_SETTINGS).then(apply);

// 选项页保存后这里不需要刷新页面：chrome.storage.onChanged 会把变更
// 广播到所有上下文；保存设置只应发生在本分区（sync）上时才响应。
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'sync') return;
  if (!changes.title && !changes.theme) return;
  chrome.storage.sync.get(DEFAULT_SETTINGS).then(apply);
});

// 覆盖页同样可以调用 chrome.runtime.openOptionsPage 打开选项页。
document.querySelector('#open-options').addEventListener('click', () => {
  chrome.runtime.openOptionsPage().catch((error) => {
    console.error('openOptionsPage 失败', error);
  });
});
