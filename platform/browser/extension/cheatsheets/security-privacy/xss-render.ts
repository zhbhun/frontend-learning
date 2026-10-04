/**
 * 范例介绍：演示同一段来自网页的不可信数据，经 innerHTML 与
 * createElement + innerText 两条渲染路径进入扩展页面时的真实差别。
 * 前置状态：待渲染字符串视同来自网页（页面标题、搜索结果等），不假设它
 * 安全；容器模拟扩展 popup 里的一块内容区。
 * 主要操作：切换「渲染方式」与「数据载荷」两组参数，观察容器文本与
 * 「onerror 载荷」读数。
 * 预期结果：innerHTML 路径下事件属性载荷会真实触发 onerror（注入的标记
 * 变成了可执行脚本），script 标签载荷不执行（innerHTML 插入的 script
 * 本来就不运行）但同样不可见；DOM API 路径下所有载荷都只以文本呈现，
 * 任何脚本都不执行。
 * 阅读主线：上方是来源字符串与其原文，中部是容器实际渲染结果，下方读数列出
 * 渲染方式、容器文本与载荷执行结论。
 */

export type RenderMode = 'innerHTML' | 'dom-api';

export type PayloadKind = 'text' | 'event-attr' | 'script-tag';

export interface XssRenderOptions {
  renderMode: RenderMode;
  payload: PayloadKind;
}

export interface XssRenderInstance {
  element: HTMLElement;
  update(options: XssRenderOptions): void;
  dispose(): void;
}

interface PayloadDefinition {
  label: string;
  value: string;
}

const PAYLOADS: Record<PayloadKind, PayloadDefinition> = {
  text: {
    label: '纯文本',
    value: '搜索关键词：chrome 扩展安全',
  },
  'event-attr': {
    label: '事件属性载荷',
    value: '<img src="x" onerror="window.__xssFired = true">',
  },
  'script-tag': {
    label: 'script 标签载荷',
    value: '<script>window.__xssFired = true<\/script>',
  },
};

// onerror 载荷的「已执行」判定：注入的处理函数跑起来时会置上这个全局标记。
// 演示只用它判断事件是否触发，不做任何越权操作。
const FIRED_WINDOW_KEY = '__xssFired';

function scope(): Record<string, unknown> {
  return window as unknown as Record<string, unknown>;
}

function hasPayloadFired(): boolean {
  return scope()[FIRED_WINDOW_KEY] === true;
}

function resetPayloadFlag(): void {
  delete scope()[FIRED_WINDOW_KEY];
}

type Emit = (entries: Array<[string, string]>) => void;

// 共享样式（assets/story-canvas.css）只提供 .cs-stage 外壳，本课范例的
// .xr-* 样式随范例文件注入，不修改共享基础设施
const STYLE_ID = 'xss-render-style';

const STYLE = `
.cs-stage.xr-stage {
  aspect-ratio: auto;
  min-height: 300px;
  padding: 38px 16px 96px;
  background: #f8fafc;
}
.xr-source {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 6px;
  color: #475569;
  font-size: 12px;
}
.xr-source-value {
  padding: 2px 6px;
  border: 1px solid #dbe3f0;
  border-radius: 4px;
  background: #ffffff;
  color: #b42318;
  font: 11px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace;
  word-break: break-all;
}
.xr-section-title {
  margin: 14px 0 6px;
  color: #64748b;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
}
.xr-target {
  min-height: 64px;
  padding: 12px;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  background: #ffffff;
  color: #172033;
  font-size: 13px;
}
.xr-target:empty::after,
.xr-target--empty::after {
  color: #94a3b8;
  content: '（容器是空的：载荷没有留下可见文本）';
  font-size: 12px;
}
.xr-literal {
  color: #1e293b;
  font: 12px/1.6 ui-monospace, SFMono-Regular, Menlo, monospace;
  word-break: break-all;
}
.xr-verdict {
  margin-top: 12px;
  padding: 8px 10px;
  border: 1px solid #dbe3f0;
  border-radius: 7px;
  background: #ffffff;
  font-size: 12px;
  line-height: 1.6;
}
.xr-verdict--danger { border-color: #d92d20; color: #b42318; }
.xr-verdict--safe { border-color: #a6f4c5; color: #067647; }
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

export function createXssRender(emit: Emit): XssRenderInstance {
  ensureStyles();
  const root = el('div', 'cs-stage xr-stage');

  const source = el('div', 'xr-source');
  const sourceValue = el('code', 'xr-source-value');
  source.append(
    el('span', undefined, '来自网页的字符串（视同不可信）：'),
    sourceValue,
  );

  const targetTitle = el('div', 'xr-section-title', '扩展 popup 里的容器');
  const target = el('div', 'xr-target');

  const verdict = el('div', 'xr-verdict');

  root.append(source, targetTitle, target, verdict);

  let options: XssRenderOptions = {
    renderMode: 'innerHTML',
    payload: 'event-attr',
  };
  let timer = 0;
  let disposed = false;

  function containerText(): string {
    return target.innerText.trim();
  }

  function shortVerdict(): string {
    if (options.payload === 'text') {
      return '无载荷';
    }
    if (options.renderMode === 'dom-api') {
      return '未执行';
    }
    if (options.payload === 'script-tag') {
      // innerHTML 插入的 script 本就不运行
      return '未执行';
    }
    return hasPayloadFired() ? '已执行' : '判定中…';
  }

  function verdictText(): string {
    if (options.payload === 'text') {
      return '无脚本载荷：两条渲染路径的结果一致，安全输入不依赖渲染方式。';
    }
    if (options.payload === 'script-tag') {
      return options.renderMode === 'innerHTML'
        ? '未执行：innerHTML 插入的 script 标签本来就不会运行；这类载荷的真实威胁是事件属性，见「事件属性载荷」。'
        : '未执行：载荷被当作文本显示，script 标签没有解析机会。';
    }
    if (options.renderMode === 'dom-api') {
      return '未执行：载荷被当作文本显示，页面上下文没有拿到可执行的东西。';
    }
    return hasPayloadFired()
      ? '已执行：onerror 在页面上下文里被触发，注入的标记变成了真实脚本。'
      : '判定中…（图片加载失败是异步事件，稍候回读）';
  }

  function paint(): void {
    sourceValue.textContent = PAYLOADS[options.payload].value;
    // script 标签经 innerHTML 插入后仍是子节点，:empty 不生效，改用类标记
    target.className =
      containerText() === '' ? 'xr-target xr-target--empty' : 'xr-target';
    verdict.textContent = verdictText();
    verdict.className =
      shortVerdict() === '已执行'
        ? 'xr-verdict xr-verdict--danger'
        : 'xr-verdict xr-verdict--safe';
    emit([
      [
        '渲染方式',
        options.renderMode === 'innerHTML'
          ? 'container.innerHTML = payload'
          : 'createElement + innerText',
      ],
      ['容器文本', containerText() || '（空）'],
      ['onerror 载荷', shortVerdict()],
    ]);
  }

  return {
    element: root,
    update(next: XssRenderOptions) {
      options = next;
      resetPayloadFlag();
      target.replaceChildren();

      if (options.renderMode === 'innerHTML') {
        // 危险路径：字符串被解析成标记，事件属性成为真实处理函数
        target.innerHTML = PAYLOADS[options.payload].value;
      } else {
        // 安全路径：手动建节点，动态文本只作为文本进入 DOM
        const literal = el('div', 'xr-literal');
        literal.innerText = PAYLOADS[options.payload].value;
        target.append(literal);
      }

      paint();

      // onerror 在图片加载失败后才触发：等一个 macrotask 再回读结论
      window.clearTimeout(timer);
      if (options.renderMode === 'innerHTML' && options.payload === 'event-attr') {
        timer = window.setTimeout(() => {
          if (!disposed) {
            paint();
          }
        }, 400);
      }
    },
    dispose() {
      disposed = true;
      window.clearTimeout(timer);
    },
  };
}
