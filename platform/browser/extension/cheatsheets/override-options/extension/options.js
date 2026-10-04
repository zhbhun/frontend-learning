// 本示例演示：选项页把设置写进 chrome.storage.sync，并用 runtime.sendMessage
// 通知扩展其余部分。设置是唯一事实来源，选项页本身随时可能被用户关掉；
// 其他上下文通过 chrome.storage.onChanged 跟随变化（见《存储》一课）。
const form = document.querySelector('#settings');
const titleInput = document.querySelector('#title');
const themeSelect = document.querySelector('#theme');
const statusEl = document.querySelector('#status');

const DEFAULT_SETTINGS = { title: '我的新标签页', theme: 'blue' };

// 打开选项页时读回已保存的值，把表单初始化成当前设置
chrome.storage.sync.get(DEFAULT_SETTINGS).then((settings) => {
  titleInput.value = settings.title;
  themeSelect.value = settings.theme;
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const settings = {
    title: titleInput.value.trim() || DEFAULT_SETTINGS.title,
    theme: themeSelect.value,
  };

  await chrome.storage.sync.set(settings);

  // 保存这类不需要响应的通知可以直接 sendMessage；内嵌选项页发送消息时
  // sender.tab 不会携带（内嵌代码不托管在标签页里），接收方别依赖它。
  const response = await chrome.runtime.sendMessage({
    type: 'options-saved',
    settings,
  });
  statusEl.textContent = response?.received
    ? '已保存，并已通知 service worker'
    : '已保存';
});

// 其他上下文（如在另一个设备上）修改设置时，表单跟着刷新
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'sync') return;
  if (changes.title) titleInput.value = changes.title.newValue;
  if (changes.theme) themeSelect.value = changes.theme.newValue;
});
