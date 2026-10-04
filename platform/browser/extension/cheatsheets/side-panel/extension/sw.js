// 本示例演示：manifest 的 side_panel 全局默认 + setPanelBehavior 控制点击图标的行为。
// upsert 语义：只写给出的字段，重复执行同样安全，因此放 onInstalled 即可。
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error('setPanelBehavior 失败', error));
});

// 站点级面板实验：打开下面这段（并给 manifest 加 "tabs" 权限或声明 host 权限），
// 只有在 google.com 的标签页里，本扩展才会出现在侧边栏入口中。
// chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
//   if (tab.url?.startsWith('https://www.google.com')) {
//     await chrome.sidePanel.setOptions({
//       tabId,
//       path: 'panel.html',
//       enabled: true,
//     });
//   } else {
//     await chrome.sidePanel.setOptions({ tabId, enabled: false });
//   }
// });
