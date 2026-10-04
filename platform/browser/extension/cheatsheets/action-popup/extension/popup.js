// popup 是扩展上下文，可以直接调用 chrome.action。
// 空字符串 = 清空全局 badge，所有标签页的角标一起消失。
chrome.action.setBadgeText({ text: '' });
