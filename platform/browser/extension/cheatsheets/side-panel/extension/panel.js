// 侧边栏页面就是普通扩展页面：chrome.sidePanel 的查询与控制方法可以直接调用。
const state = document.querySelector('#state');

chrome.sidePanel
  .getOptions()
  .then((options) => {
    state.textContent = `当前面板：${options.path}（enabled: ${options.enabled ?? true}）`;
  })
  .catch((error) => {
    state.textContent = `读取失败：${error.message}`;
  });

// close() 需要 Chrome 141+，且至少要带 tabId 或 windowId 之一；
// 这里是全局面板，传当前 windowId；站点级（tab 级）面板要传对应的 tabId。
document.querySelector('#close').addEventListener('click', async () => {
  const win = await chrome.windows.getCurrent();
  await chrome.sidePanel.close({ windowId: win.id });
});
