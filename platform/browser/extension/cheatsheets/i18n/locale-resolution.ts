/**
 * 范例介绍：模拟 Chrome 按浏览器界面语言解析 _locales 的三步查找。
 * 输入 / 前置状态：「浏览器界面语言」对应 getUILanguage() 的接线格式（zh-TW 等）；
 * 「accept languages 列表」对应 getAcceptLanguages() 返回的偏好语言串；「已安装
 * locale」对应 _locales 下存在的目录；「default_locale」对应 manifest 的声明。
 * 主要操作：组合修改四个输入，观察解析轨迹与最终选中的 locale。
 * 预期结果：查找按「首选 locale 目录 → 剥地区补查 → default_locale 兜底」进行；
 * accept languages 只作显示、不参与解析；_locales 里多装的未命中语言被忽略；
 * default_locale 指向的目录必须存在。
 * 阅读主线：顶部是浏览器设置读数，中部是逐步查找轨迹，底部是选中的 locale 加载
 * messages.json 后渲染出的工具栏卡片（扩展名 + default_title）。
 */
export type UiLanguage = 'zh-TW' | 'zh-CN' | 'en-GB' | 'en-US' | 'fr-FR' | 'pt-BR';

// 可安装的 locale 目录名（_locales/<locale>），解析与展示都会引用
export type InstalledLocale = 'en' | 'zh' | 'zh_CN' | 'ja' | 'pt_BR';

export type DefaultLocale = 'en' | 'zh_CN';

export interface LocaleOptions {
  uiLanguage: UiLanguage;
  acceptLanguages: string;
  installedLocales: InstalledLocale[];
  defaultLocale: DefaultLocale;
}

export interface LocaleInstance {
  element: HTMLElement;
  update(options: LocaleOptions): void;
  snapshot(): Array<[string, string]>;
  dispose(): void;
}

// 每个已安装 locale 目录里的两条消息（等价于该目录的 messages.json）
const LOCALE_MESSAGES: Record<
  InstalledLocale,
  { extName: string; actionTitle: string }
> = {
  en: { extName: 'Course Cheatsheet', actionTitle: 'Organize bookmarks' },
  zh: { extName: '课程速查（zh 通用）', actionTitle: '整理收藏（zh 通用）' },
  zh_CN: { extName: '课程速查', actionTitle: '整理收藏' },
  ja: { extName: 'チートシート', actionTitle: 'ブックマークを整理' },
  pt_BR: { extName: 'Folha de consulta', actionTitle: 'Organizar favoritos' },
};

interface TraceStep {
  step: string;
  probe: string;
  hit: boolean;
}

interface Resolution {
  winner: InstalledLocale | null;
  source: string;
  steps: TraceStep[];
  defaultMissing: boolean;
}

const STYLE_ID = 'locale-resolution-style';

const STYLE = `
.cs-stage.lr-stage {
  aspect-ratio: auto;
  min-height: 520px;
  padding: 38px 14px 104px;
  background: #f8fafc;
}
.lr-settings {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
  color: #475569;
  font-size: 12px;
}
.lr-settings b { color: #1d4ed8; }
.lr-settings code {
  padding: 1px 5px;
  border-radius: 5px;
  background: #eef2ff;
  font: 11px ui-monospace, SFMono-Regular, Menlo, monospace;
}
.lr-section-title {
  margin: 10px 0 6px;
  color: #64748b;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
}
.lr-step {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 10px;
  margin-bottom: 4px;
  border: 1px solid #dbe3f0;
  border-radius: 8px;
  background: #ffffff;
  font: 11.5px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace;
}
.lr-step--hit { border-color: #86efac; background: #f0fdf4; }
.lr-step--miss { color: #64748b; }
.lr-step-dot { font-weight: 700; }
.lr-step--hit .lr-step-dot { color: #166534; }
.lr-step--miss .lr-step-dot { color: #b91c1c; }
.lr-winner {
  margin-top: 8px;
  padding: 8px 10px;
  border: 1px solid #86efac;
  border-radius: 8px;
  background: #f0fdf4;
  color: #166534;
  font: 12px/1.6 ui-monospace, SFMono-Regular, Menlo, monospace;
}
.lr-error {
  margin-top: 8px;
  padding: 8px 10px;
  border: 1px solid #fca5a5;
  border-radius: 8px;
  background: #fef2f2;
  color: #b91c1c;
  font: 12px/1.6 ui-monospace, SFMono-Regular, Menlo, monospace;
}
.lr-bottom {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: flex-start;
  margin-top: 10px;
}
.lr-toolbar {
  width: 260px;
  max-width: 100%;
  border: 1px solid #dbe3f0;
  border-radius: 10px;
  background: #ffffff;
}
.lr-toolbar-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
}
.lr-toolbar-icon {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  background: #4f7cff;
  color: #ffffff;
  font-size: 11px;
  line-height: 22px;
  text-align: center;
}
.lr-toolbar-name { font-size: 12px; font-weight: 700; }
.lr-toolbar-title { padding: 0 10px 8px; color: #475569; font-size: 11px; }
.lr-ignored { flex: 1; min-width: 200px; color: #64748b; font-size: 11px; }
.lr-chip {
  display: inline-block;
  margin: 2px 4px 2px 0;
  padding: 2px 8px;
  border: 1px dashed #cbd5e1;
  border-radius: 999px;
  color: #94a3b8;
  text-decoration: line-through;
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

// zh-TW → zh_TW；查找用的目录连接字符是下划线
function toDirCode(tag: string): string {
  return tag.replace(/-/g, '_');
}

// zh_TW → zh：剥掉地区码
function stripRegion(code: string): string {
  const index = code.indexOf('_');
  return index > 0 ? code.slice(0, index) : code;
}

function resolve(options: LocaleOptions): Resolution {
  const installed = options.installedLocales;
  const steps: TraceStep[] = [];

  const preferred = toDirCode(options.uiLanguage);
  const preferredHit = installed.includes(preferred as InstalledLocale);
  steps.push({ step: '① 首选 locale 目录', probe: preferred, hit: preferredHit });
  if (preferredHit) {
    return {
      winner: preferred as InstalledLocale,
      source: '首选 locale 直接命中',
      steps,
      defaultMissing: false,
    };
  }

  const stripped = stripRegion(preferred);
  if (stripped !== preferred) {
    const strippedHit = installed.includes(stripped as InstalledLocale);
    steps.push({ step: '② 剥地区补查', probe: stripped, hit: strippedHit });
    if (strippedHit) {
      return {
        winner: stripped as InstalledLocale,
        source: '剥地区命中',
        steps,
        defaultMissing: false,
      };
    }
  }

  const defaultMissing = !installed.includes(options.defaultLocale);
  steps.push({
    step: '③ default_locale 兜底',
    probe: options.defaultLocale,
    hit: !defaultMissing,
  });
  return {
    winner: defaultMissing ? null : options.defaultLocale,
    source: defaultMissing ? '—' : 'default_locale 兜底',
    steps,
    defaultMissing,
  };
}

export function createLocaleResolution(): LocaleInstance {
  ensureStyles();
  const root = el('div', 'cs-stage lr-stage');

  const settings = el('div', 'lr-settings');
  root.append(settings);

  const traceTitle = el('div', 'lr-section-title', '解析轨迹 _locales 查找');
  const traceBox = el('div');
  root.append(traceTitle, traceBox);

  const outcomeBox = el('div');
  root.append(outcomeBox);

  const bottom = el('div', 'lr-bottom');
  const toolbar = el('div', 'lr-toolbar');
  const ignored = el('div', 'lr-ignored');
  bottom.append(toolbar, ignored);
  root.append(bottom);

  let options: LocaleOptions = {
    uiLanguage: 'zh-TW',
    acceptLanguages: 'zh-CN,en-US,zh',
    installedLocales: ['en', 'zh_CN', 'ja'],
    defaultLocale: 'zh_CN',
  };

  function render(): void {
    settings.replaceChildren(
      el('span', undefined, 'getUILanguage() → '),
      el('b', undefined, options.uiLanguage),
      document.createTextNode('　·　'),
      el('span', undefined, 'getAcceptLanguages() → '),
      el('code', undefined, options.acceptLanguages),
      document.createTextNode('（只作展示，不参与解析）'),
    );

    const resolution = resolve(options);

    traceBox.replaceChildren();
    resolution.steps.forEach((step) => {
      const row = el(
        'div',
        `lr-step ${step.hit ? 'lr-step--hit' : 'lr-step--miss'}`,
      );
      row.append(
        el('span', 'lr-step-dot', step.hit ? '✓' : '✗'),
        el('span', undefined, step.step),
        el('span', undefined, `_locales/${step.probe}`),
        el('span', undefined, step.hit ? '命中' : '未找到'),
      );
      traceBox.append(row);
    });

    outcomeBox.replaceChildren();
    if (resolution.defaultMissing) {
      outcomeBox.append(
        el(
          'div',
          'lr-error',
          `manifest 加载会失败：_locales/ 下没有 default_locale 声明的 ${options.defaultLocale} 目录，默认语言目录必须存在`,
        ),
      );
    } else if (resolution.winner) {
      outcomeBox.append(
        el(
          'div',
          'lr-winner',
          `选中 ${resolution.winner}（${resolution.source}）→ 加载 _locales/${resolution.winner}/messages.json`,
        ),
      );
    }

    const messages = resolution.winner
      ? LOCALE_MESSAGES[resolution.winner]
      : undefined;
    toolbar.replaceChildren();
    const toolbarRow = el('div', 'lr-toolbar-row');
    toolbarRow.append(el('span', 'lr-toolbar-icon', 'E'), el('span', 'lr-toolbar-name', messages ? messages.extName : '（无可用文案）'));
    toolbar.append(toolbarRow);
    if (messages) {
      toolbar.append(el('div', 'lr-toolbar-title', `default_title：${messages.actionTitle}`));
    }

    const unused = options.installedLocales.filter((locale) => locale !== resolution.winner);
    ignored.replaceChildren(
      el('div', undefined, '已安装但未被选中的 locale（Chrome 直接忽略）：'),
    );
    if (unused.length === 0) {
      ignored.append(el('span', undefined, '无'));
    } else {
      unused.forEach((locale) => {
        ignored.append(el('span', 'lr-chip', locale));
      });
    }
  }

  render();

  return {
    element: root,
    update(next: LocaleOptions) {
      options = next;
      render();
    },
    snapshot(): Array<[string, string]> {
      const resolution = resolve(options);
      return [
        ['getUILanguage()', options.uiLanguage],
        ['getAcceptLanguages()', options.acceptLanguages],
        ['选中 locale', resolution.winner ?? '无（default_locale 缺失）'],
        ['命中来源', resolution.source],
        [
          '加载的 messages.json',
          resolution.winner ? `_locales/${resolution.winner}/messages.json` : '—',
        ],
      ];
    },
    dispose() {
      // 没有定时器或全局监听，节点移除后随 DOM 一起回收
    },
  };
}
