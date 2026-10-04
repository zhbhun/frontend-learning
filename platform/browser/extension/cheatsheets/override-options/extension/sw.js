// 本示例演示：选项页与扩展其余部分的通信就是普通扩展消息
// （用法见《消息通信》一课）。设置本身存在 chrome.storage.sync 里，
// 这里只负责收下保存通知并记录日志——内嵌选项页发送时 sender.tab 为
// undefined，sender.url 是选项页地址，接收方不要依赖 sender.tab。
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'options-saved') {
    console.log('选项页保存了设置：', message.settings);
    console.log('发送方：', sender.url, '，sender.tab =', sender.tab);
    sendResponse({ received: true });
  }
});
