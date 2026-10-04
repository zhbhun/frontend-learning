// 本示例演示：chrome.omnibox 关键词会话的完整事件序列。
// 交互方式：地址栏输入 "docs "（keyword + 空格）进入会话，
// 继续输入过滤文档建议；回车或点选建议打开对应页面，Esc 取消会话。
// 调试入口：chrome://extensions 卡片上的 Service Worker 链接打开 DevTools 看日志。

// 演示词典。content 是选中后回传给扩展的文本（不进地址栏下拉），
// url 是最终打开的地址；title 与 dim 只用于拼 description。
const DOCS = [
  {
    content: 'omnibox',
    title: 'chrome.omnibox API 参考',
    dim: '关键词建议',
    url: 'https://developer.chrome.com/docs/extensions/reference/api/omnibox',
  },
  {
    content: 'messaging',
    title: '消息通信',
    dim: 'sendMessage 与 Port',
    url: 'https://developer.chrome.com/docs/extensions/develop/concepts/messaging',
  },
  {
    content: 'storage',
    title: '存储',
    dim: 'local · sync · session',
    url: 'https://developer.chrome.com/docs/extensions/reference/api/storage',
  },
  {
    content: 'alarms',
    title: '定时任务',
    dim: '周期与一次性闹钟',
    url: 'https://developer.chrome.com/docs/extensions/reference/api/alarms',
  },
];

// 地址栏下拉高度有限，取匹配结果的前几条即可
const MAX_SUGGESTIONS = 5;

// description 支持 <match> <url> <dim> 三种 XML 风格标记；
// 拼装用户输入前必须转义五个预定义实体，否则标记会被输入内容破坏
const ENTITIES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
};

function escapeXml(text) {
  return text.replace(/[&<>"']/g, (ch) => ENTITIES[ch]);
}

// 命中用户输入的片段包进 <match>，其余按字面文本转义后拼装
function buildDescription(entry, query) {
  const index = entry.content.indexOf(query);
  const head =
    index >= 0
      ? `${escapeXml(entry.content.slice(0, index))}<match>${escapeXml(
          query,
        )}</match>${escapeXml(entry.content.slice(index + query.length))}`
      : escapeXml(entry.content);
  return `${head} · ${escapeXml(entry.title)} <dim>${escapeXml(entry.dim)}</dim>`;
}

// 会话开始：每次关键词会话恰好触发一次，先于任何 onInputChanged
chrome.omnibox.onInputStarted.addListener(() => {
  chrome.omnibox.setDefaultSuggestion({
    description: '<match>docs</match> 文档命令 <dim>回车发送原样输入</dim>',
  });
});

// 每次按键都会触发；text 只是 keyword + 空格之后的输入，不含 keyword
chrome.omnibox.onInputChanged.addListener((text, suggest) => {
  const results = DOCS.filter(
    (entry) => entry.content.includes(text) || entry.title.includes(text),
  )
    .slice(0, MAX_SUGGESTIONS)
    .map((entry) => ({
      content: entry.content,
      description: buildDescription(entry, text),
      deletable: true,
    }));
  console.log(`onInputChanged(text="${text}") -> suggest(${results.length} 条)`);
  suggest(results);
});

// 用户回车或点选建议时触发。disposition 反映激活方式，决定在哪里打开
chrome.omnibox.onInputEntered.addListener((text, disposition) => {
  const entry = DOCS.find((item) => item.content === text);
  if (!entry) {
    // 未选建议直接回车：text 是原样输入，本示例只记录
    console.log(`onInputEntered(text="${text}", 原样输入，未匹配文档)`);
    return;
  }
  if (disposition === 'currentTab') {
    chrome.tabs.update({ url: entry.url });
  } else {
    chrome.tabs.create({
      url: entry.url,
      active: disposition === 'newForegroundTab',
    });
  }
});

// 用户放弃会话（Esc、删掉 keyword、点掉地址栏焦点）时触发
chrome.omnibox.onInputCancelled.addListener(() => {
  console.log('onInputCancelled()');
});

// 用户点击可删除建议右侧的 × 时触发，text 是该建议的 content
chrome.omnibox.onDeleteSuggestion.addListener((text) => {
  console.log(`onDeleteSuggestion(text="${text}")`);
});
