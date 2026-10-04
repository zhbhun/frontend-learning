// 面板页面：与 popup、options 同属扩展页面，可以调用 chrome.* API。
// 这里演示两件事：inspectedWindow.eval 在被检查页面里执行；把 inspectedWindow.tabId
// 发给 service worker，由它调用 chrome.debugger（attach/detach）。
const output = document.querySelector('#output');

function log(text) {
  output.textContent = `${new Date().toLocaleTimeString()}  ${text}`;
}

// 1. 在被检查页面的主框架里求值；返回值必须是可 JSON 化的对象，否则结果为异常。
//    inspectedWindow.eval 自 Chrome 151 起原生返回 Promise；旧版 Chrome 用第三参
//    (result, isException) 回调，这里用兼容两种形式的写法。
document.querySelector('#title').addEventListener('click', () => {
  const done = (result, isException) => {
    log(
      isException
        ? `eval 异常：${JSON.stringify(result)}`
        : `页面标题：${JSON.stringify(result)}`,
    );
  };
  const maybe = chrome.devtools.inspectedWindow.eval('document.title', done);
  if (maybe && typeof maybe.then === 'function') {
    maybe.catch((error) => log(`eval 异常：${error.message}`));
  }
});

// 2. 调试器动作交给 service worker——面板页面拿 tabId，SW 负责 attach/detach。
// 也可改成 chrome.debugger 直接在 SW 里监听 action.onClicked 的方式，二者等价。
document.querySelector('#attach').addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'debugger-attach', tabId: chrome.devtools.inspectedWindow.tabId });
});

document.querySelector('#detach').addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'debugger-detach', tabId: chrome.devtools.inspectedWindow.tabId });
});

// 面板页面每次显示都会重建，onShown 时重新同步一次状态是个稳妥习惯。
// 这里简单地在控制台留痕，真实面板可以把 DevTools 主题名 chrome.devtools.panels.themeName
// 读出来决定配色。
console.log('panel.html 加载完成，themeName =', chrome.devtools.panels.themeName);

// 面板页切走即销毁、切回重建：把这行时间戳显示出来，来回切面板就能看到它每次刷新。
log(`panel.html 创建于 ${new Date().toLocaleTimeString()}`);
