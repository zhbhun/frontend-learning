// 本示例演示：manifest 默认值 + chrome.action 运行时设置怎样配合。
// 安装或更新扩展时点亮 badge；打开 popup 时由 popup.js 清除。
chrome.runtime.onInstalled.addListener(() => {
  chrome.action.setBadgeBackgroundColor({ color: '#b91c1c' });
  chrome.action.setBadgeText({ text: 'NEW' });
});

// 点击事件只在“没有 popup”时触发。想体验这条分支：
// 从 manifest.json 的 action 里删掉 "default_popup"，点「重新加载」，
// 再点击工具栏图标。
chrome.action.onClicked.addListener((tab) => {
  // 只给当前标签页加 badge：其他标签页保持全局状态
  chrome.action.setBadgeText({ tabId: tab.id, text: 'HI' });
});
