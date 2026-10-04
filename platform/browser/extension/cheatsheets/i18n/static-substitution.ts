/**
 * 范例介绍：演示 __MSG_key__ 记号在 manifest、HTML、CSS、JS 四个位置的替换差异。
 * 输入 / 前置状态：「当前语言」参数模拟浏览器界面语言加载的 messages.json；
 * 「消息名」选择 extName（已定义）、greeting（已定义）、typo（未定义）。
 * 主要操作：切换消息名与语言，对比四个位置的替换结果。
 * 预期结果：manifest、HTML 文本节点、CSS 里平台自动替换 __MSG_key__，消息未定义时
 * token 原样保留；JS 文件里的 __MSG_ 不会被替换，必须用 chrome.i18n.getMessage 取回，
 * 且消息缺失时返回空串而不是保留 token。CSS 行同时演示预定义消息 @@bidi_dir。
 * 阅读主线：四行各对应一种文件位置，左侧是替换前的 token 写法，箭头右侧是运行结果，
 * 行尾状态徽标说明该位置是否发生了替换。
 */
export type StaticLocale = 'zh_CN' | 'en';

export type StaticKey = 'extName' | 'greeting' | 'typo';

export interface StaticOptions {
  locale: StaticLocale;
  key: StaticKey;
}

export interface StaticInstance {
  element: HTMLElement;
  update(options: StaticOptions): void;
  snapshot(): Array<[string, string]>;
  dispose(): void;
}

// 各语言下已定义的消息（typo 故意不定义，用于演示未定义行为）
const MESSAGES: Record<StaticLocale, Record<string, string>> = {
  zh_CN: {
    extName: '课程速查',
    actionTitle: '整理收藏',
    greeting: '欢迎回来',
  },
  en: {
    extName: 'Course Cheatsheet',
    actionTitle: 'Organize bookmarks',
    greeting: 'Welcome back',
  },
};

// 每个 key 在 manifest / HTML / JS 三处对应的引用位置
const USAGE: Record<
  Exclude<StaticKey, 'typo'>,
  { manifestField: string; htmlTag: string }
> = {
  extName: { manifestField: 'name', htmlTag: 'h1' },
  greeting: { manifestField: 'description', htmlTag: 'p' },
};

const STYLE_ID = 'static-substitution-style';

const STYLE = `
.cs-stage.st-stage {
  aspect-ratio: auto;
  min-height: 500px;
  padding: 38px 14px 104px;
  background: #f8fafc;
}
.st-row {
  display: grid;
  grid-template-columns: 92px 1fr 1fr;
  gap: 8px;
  align-items: stretch;
  margin-bottom: 8px;
}
.st-where {
  display: flex;
  align-items: center;
  color: #64748b;
  font-size: 11px;
  font-weight: 700;
}
.st-before,
.st-after {
  padding: 8px 10px;
  border: 1px solid #dbe3f0;
  border-radius: 8px;
  background: #ffffff;
  color: #172033;
  font: 11.5px/1.7 ui-monospace, SFMono-Regular, Menlo, monospace;
  overflow-x: auto;
  white-space: pre;
}
.st-after { position: relative; }
.st-flag {
  display: inline-block;
  margin-left: 6px;
  padding: 1px 6px;
  border-radius: 999px;
  font: 10px/1.6 ui-sans-serif, system-ui, sans-serif;
}
.st-flag--ok { background: #dcfce7; color: #166534; }
.st-flag--miss { background: #fee2e2; color: #b91c1c; }
.st-flag--js { background: #dbeafe; color: #1d4ed8; }
.st-after mark {
  border-radius: 3px;
  padding: 0 2px;
  background: #dbeafe;
  color: #1d4ed8;
  font-weight: 600;
}
.st-after .st-raw {
  color: #b91c1c;
  font-weight: 600;
}
.st-popup {
  width: 260px;
  max-width: 100%;
  border: 1px solid #dbe3f0;
  border-radius: 10px;
  background: #ffffff;
}
.st-popup-title {
  margin: 0;
  padding: 10px 12px 2px;
  font-size: 14px;
  font-weight: 700;
}
.st-popup-text {
  margin: 0;
  padding: 0 12px 10px;
  color: #475569;
  font-size: 12px;
}
.st-popup .st-raw { display: block; }
.st-css-lines { margin: 0; }
.st-note {
  margin-top: 10px;
  color: #475569;
  font-size: 12px;
}
`;

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) {
    node.className = className;
  }
  if (text !== undefined) {
    node.textContent = text;
  }
  return node;
}

function ensureStyles(): void {
  if (document.getElementById(STYLE_ID)) {
    return;
  }
  const style = el('style', undefined, STYLE);
  style.id = STYLE_ID;
  document.head.append(style);
}

function token(key: StaticKey): string {
  return `__MSG_${key}__`;
}

// 某位置替换后的值：消息未定义时保留原样 token（在界面上留下字面文本）
function replaced(key: StaticKey, locale: StaticLocale): string {
  return MESSAGES[locale][key] ?? token(key);
}

function isDefined(key: StaticKey, locale: StaticLocale): boolean {
  return Object.prototype.hasOwnProperty.call(MESSAGES[locale], key);
}

export function createStaticSubstitution(): StaticInstance {
  ensureStyles();
  const root = el('div', 'cs-stage st-stage');

  const manifestRow = el('div', 'st-row');
  manifestRow.append(el('div', 'st-where', 'manifest'));
  const manifestBefore = el('div', 'st-before');
  const manifestAfter = el('div', 'st-after');
  manifestRow.append(manifestBefore, manifestAfter);

  const htmlRow = el('div', 'st-row');
  htmlRow.append(el('div', 'st-where', 'popup.html'));
  const htmlBefore = el('div', 'st-before');
  const htmlAfter = el('div', 'st-after');
  htmlRow.append(htmlBefore, htmlAfter);

  const cssRow = el('div', 'st-row');
  cssRow.append(el('div', 'st-where', 'popup.css'));
  const cssBefore = el('div', 'st-before');
  const cssAfter = el('div', 'st-after');
  cssRow.append(cssBefore, cssAfter);

  const jsRow = el('div', 'st-row');
  jsRow.append(el('div', 'st-where', 'popup.js'));
  const jsBefore = el('div', 'st-before');
  const jsAfter = el('div', 'st-after');
  jsRow.append(jsBefore, jsAfter);

  root.append(manifestRow, htmlRow, cssRow, jsRow);

  const note = el(
    'div',
    'st-note',
    'CSS 行是预定义消息 @@bidi_dir：返回 ltr / rtl，任何语言可用；@@extension_id 不能写进 manifest。',
  );
  root.append(note);

  let options: StaticOptions = { locale: 'zh_CN', key: 'extName' };

  function flag(kind: 'ok' | 'miss' | 'js', text: string): HTMLElement {
    return el('span', `st-flag st-flag--${kind}`, text);
  }

  function render(): void {
    const { key, locale } = options;
    const defined = isDefined(key, locale);
    const value = replaced(key, locale);
    const field = key === 'typo' ? 'name' : (USAGE[key].manifestField as string);
    const tag = key === 'typo' ? 'h1' : USAGE[key].htmlTag;

    // manifest：字符串字段写 token，由平台替换
    manifestBefore.textContent = `{
  "${field}": "${token(key)}",
  ...
}`;
    manifestAfter.replaceChildren();
    manifestAfter.append(
      document.createTextNode(`"${field}": `),
    );
    if (defined) {
      manifestAfter.append(el('mark', undefined, `"${value}"`));
    } else {
      manifestAfter.append(el('span', 'st-raw', `"${token(key)}"`));
    }
    manifestAfter.append(
      flag(defined ? 'ok' : 'miss', defined ? '已替换' : '未替换 · 原样保留'),
    );

    // HTML：文本节点里的 token 被替换，未定义时原样显示在页面上
    htmlBefore.textContent = `<${tag}>${token(key)}</${tag}>`;
    htmlAfter.replaceChildren();
    const popup = el('div', 'st-popup');
    const popupTitle = el('div', 'st-popup-title');
    const popupText = el('div', 'st-popup-text');
    if (key === 'greeting') {
      popupTitle.textContent = replaced('extName', locale);
      if (defined) {
        popupText.append(el('mark', undefined, value));
      } else {
        popupText.append(el('span', 'st-raw', `__MSG_${key}__`));
      }
    } else {
      if (defined) {
        popupTitle.append(el('mark', undefined, value));
      } else {
        popupTitle.append(el('span', 'st-raw', `__MSG_${key}__`));
      }
      popupText.textContent = replaced('greeting', locale);
    }
    popup.append(popupTitle, popupText);
    htmlAfter.append(
      popup,
      document.createTextNode(`<${tag}> 是文本节点 → `),
      flag(defined ? 'ok' : 'miss', defined ? '已替换' : '未替换 · 原样保留'),
    );

    // CSS：预定义消息 @@bidi_dir 同样替换
    cssBefore.textContent = `body {
  direction: __MSG_@@bidi_dir__;
}`;
    cssAfter.replaceChildren();
    cssAfter.append(
      document.createTextNode('direction: '),
      el('mark', undefined, 'ltr'),
      flag('ok', '已替换（预定义消息）'),
    );

    // JS：__MSG_ 不被替换；getMessage 取同一份文案，缺失时返回空串
    jsBefore.textContent = `// popup.js 里写 token 不会生效
title.textContent = "${token(key)}"; // ✗ 原样字符串`;
    jsAfter.replaceChildren();
    if (defined) {
      jsAfter.append(
        flag('js', "getMessage 返回"),
        document.createTextNode(' '),
        el('mark', undefined, `"${value}"`),
      );
    } else {
      jsAfter.append(
        flag('js', "getMessage 返回"),
        document.createTextNode(' '),
        el('span', 'st-raw', '空串 \'\''),
      );
    }
  }

  render();

  return {
    element: root,
    update(next: StaticOptions) {
      options = next;
      render();
    },
    snapshot(): Array<[string, string]> {
      const { key, locale } = options;
      const defined = isDefined(key, locale);
      const value = replaced(key, locale);
      return [
        ['当前 locale', locale],
        ['消息名', `${key}（${defined ? '已定义' : '未定义'}）`],
        ['manifest 字段值', defined ? value : `${value}（token 保留）`],
        ['HTML 渲染文本', defined ? value : `${value}（token 保留）`],
        ['CSS @@bidi_dir', 'ltr'],
        [
          'JS getMessage',
          defined ? value : "''（空串，不是保留 token）",
        ],
      ];
    },
    dispose() {
      // 没有定时器或全局监听，节点移除后随 DOM 一起回收
    },
  };
}
