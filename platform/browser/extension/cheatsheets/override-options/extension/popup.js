// 本示例演示：chrome.runtime.openOptionsPage() 从任意扩展上下文打开选项页，
// 打开到哪里由 manifest 声明决定——open_in_tab: false 时聚焦 chrome://extensions
// 详情页（选项页内嵌其中），open_in_tab: true 或 options_page 时开新标签页。
// 没有在 manifest 里声明选项页时 Promise 会 reject，所以这里 catch 一下。
document.querySelector('#open-options').addEventListener('click', () => {
  chrome.runtime.openOptionsPage().catch((error) => {
    console.error('openOptionsPage 失败：manifest 未声明选项页？', error);
  });
});
