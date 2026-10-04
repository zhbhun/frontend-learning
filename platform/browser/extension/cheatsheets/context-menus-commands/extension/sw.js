// 本示例演示：contextMenus.create 注册菜单项、onClicked 处理点击，
// commands 的 _execute_action 与自定义快捷键经 onCommand 处理。
const TOGGLE_ID = 'toggle-highlight';
const SEARCH_ID = 'search-selection';

// 菜单项创建后由浏览器保存，id 在扩展内唯一；
// service worker 顶层代码每次启动都会执行，所以放在 onInstalled 里只建一次，
// 更新扩展时先 removeAll 再重建，避免同 id 重复注册。
chrome.runtime.onInstalled.addListener((details) => {
  chrome.contextMenus.removeAll().then(() => {
    // 父项：菜单项多了以后 Chrome 仍可能折叠进同一父菜单，这里显式建一个
    chrome.contextMenus.create({
      id: 'tools',
      title: '高亮工具',
      contexts: ['page', 'selection'],
    });
    chrome.contextMenus.create({
      id: TOGGLE_ID,
      parentId: 'tools',
      title: '开启高亮',
      type: 'checkbox',
      checked: false,
    });
    chrome.contextMenus.create({ type: 'separator', parentId: 'tools' });
    chrome.contextMenus.create({
      id: SEARCH_ID,
      parentId: 'tools',
      title: '搜索「%s」',
      contexts: ['selection'],
    });
  });

  // 官方建议：安装时检查快捷键是否注册成功（被其他扩展占用时 shortcut 为空字符串）
  if (details.reason === 'install') {
    checkCommandShortcuts();
  }
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === TOGGLE_ID) {
    // 复选项的勾选状态由浏览器自动切换，info.checked 是新状态
    setHighlight(tab.id, info.checked);
  } else if (info.menuItemId === SEARCH_ID) {
    // %s 已经替换为选中文字，直接拿来拼搜索 URL
    chrome.tabs.create({
      url: `https://www.google.com/search?q=${encodeURIComponent(
        info.selectionText,
      )}`,
    });
  }
});

// 自定义快捷键：命令名就是 manifest 里 commands 的属性键
chrome.commands.onCommand.addListener((command, tab) => {
  if (command === 'toggle-highlight') {
    toggleHighlight(tab.id);
  }
});

// _execute_action 触发的是 action 点击：本示例设置了 popup，按键会弹出窗口；
// 没有 popup 时应改听 chrome.action.onClicked（见《Action 与弹窗》）。

async function toggleHighlight(tabId) {
  const { highlighting = false } = await chrome.storage.local.get('highlighting');
  setHighlight(tabId, !highlighting);
}

async function setHighlight(tabId, on) {
  await chrome.storage.local.set({ highlighting: on });
  await chrome.action.setBadgeText({ tabId, text: on ? 'ON' : '' });
}

async function checkCommandShortcuts() {
  const unassigned = (await chrome.commands.getAll())
    .filter((command) => command.shortcut === '')
    .map((command) => command.name);
  if (unassigned.length > 0) {
    // 让用户到 chrome://extensions/shortcuts 自行绑定
    console.warn('以下命令未注册到快捷键：', unassigned);
  }
}
