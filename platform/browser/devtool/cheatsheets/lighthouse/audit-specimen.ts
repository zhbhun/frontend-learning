/**
 * 范例介绍：「可审计标本」——一个自带典型质量问题的迷你页面：低对比度文本、
 *   缺 alt 的图片、无可访问名称的图标按钮、跳跃的标题层级，以及一个节点密集
 *   的回顾网格。
 * 输入与前置：问题密度（集中 / 少量）由 Controls 提供，切换后只重建「页面」
 *   部分；无网络依赖，图片用内联 data URI。页面内所有未标记问题的文本、按钮、
 *   标题都是「正确示范」，对比度全部达标，避免污染计数。
 * 主要操作：读者对整个 Storybook 标签页运行 Lighthouse，把报告条目与标本
 *   readout 对照。Navigation 模式会重载页面并把密度复位为「集中」（默认）；
 *   要审计切换后的状态用 Snapshot 模式。
 * 预期结果：readout 由页面内 mini 检查器真实计算——按 WCAG 相对亮度与对比度
 *   公式逐元素算对比度（阈值 4.5:1，普通文本的 AA 要求）、alt 缺失计数、
 *   可访问名称缺失计数、标题层级跳跃计数、DOM 节点计数；「集中」6 项问题、
 *   「少量」2 项。
 * 阅读主线：update(density) → buildPageHTML() → runMiniAudit(page) →
 *   renderReadout()；审计安排在 requestAnimationFrame 中执行，确保舞台已
 *   挂载，computed style 的继承与可见性真实有效。
 */

export type Density = 'concentrated' | 'sparse';

export interface AuditSpecimenInstance {
  /** 按密度重建「页面」部分并重新运行 mini 检查器。 */
  update(density: Density): void;
  /** 无持久监听与循环任务，随舞台移除自动回收。 */
  dispose(): void;
}

/** WCAG AA 对普通文本要求的最低对比度；大号文本阈值为 3:1，标本只用普通文本。 */
const CONTRAST_THRESHOLD = 4.5;

/** 集中模式回顾网格的格子数：给 DOM 节点计数一个可感知的落差。 */
const CELL_COUNT = 80;

/** 事件缩略图用内联 data URI，离线可渲染；都不带 alt 属性（这正是问题所在）。 */
const PHOTOS = [
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 36'%3E%3Crect width='48' height='36' rx='4' fill='%23c7d2fe'/%3E%3C/svg%3E",
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 36'%3E%3Crect width='48' height='36' rx='4' fill='%23bbf7d0'/%3E%3C/svg%3E",
];

interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

interface MiniAudit {
  contrastFailures: number;
  minContrast: number | null;
  missingAlt: number;
  missingNames: number;
  headingJumps: number;
  domNodes: number;
}

/** readout 的行定义：key 与 data-cell 对应。 */
const READOUT_CELLS: Array<[key: string, label: string]> = [
  ['density', '检测模式'],
  ['contrast', '对比度不足'],
  ['minContrast', '最低对比度'],
  ['alt', '图片缺 alt'],
  ['names', '按钮缺名称'],
  ['jumps', '标题跳跃'],
  ['dom', 'DOM 节点'],
  ['total', '问题合计'],
];

function zeroAudit(): MiniAudit {
  return {
    contrastFailures: 0,
    minContrast: null,
    missingAlt: 0,
    missingNames: 0,
    headingJumps: 0,
    domNodes: 0,
  };
}

/**
 * 解析 computed style 返回的 rgb()/rgba() 字符串（Chrome 对 rgb 颜色一律返回
 * 逗号语法）；其余格式返回 null，由调用方跳过。
 */
function parseColor(value: string): Rgba | null {
  const match = value.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/);
  if (!match) {
    return null;
  }
  return {
    r: Number(match[1]),
    g: Number(match[2]),
    b: Number(match[3]),
    a: match[4] === undefined ? 1 : Number(match[4]),
  };
}

/** WCAG 2.x 相对亮度定义。 */
function relativeLuminance(color: Rgba): number {
  const channel = (value: number): number => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(color.r) + 0.7152 * channel(color.g) + 0.0722 * channel(color.b);
}

function contrastRatio(l1: number, l2: number): number {
  const [lighter, darker] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (lighter + 0.05) / (darker + 0.05);
}

/** top 以 bottom 为底做 alpha 合成（top 在上层）。 */
function over(top: Rgba, bottom: Rgba): Rgba {
  const a = top.a + bottom.a * (1 - top.a);
  if (a === 0) {
    return { r: 0, g: 0, b: 0, a: 0 };
  }
  return {
    r: Math.round((top.r * top.a + bottom.r * bottom.a * (1 - top.a)) / a),
    g: Math.round((top.g * top.a + bottom.g * bottom.a * (1 - top.a)) / a),
    b: Math.round((top.b * top.a + bottom.b * bottom.a * (1 - top.a)) / a),
    a,
  };
}

/**
 * 沿祖先链收集非透明 background-color 并逐层合成，直到遇到不透明层；整条链
 * 都透明时按白底处理。半透明层必须参与合成，否则对比度会被低估。
 */
function effectiveBackground(element: Element): Rgba {
  const layers: Rgba[] = [];
  for (let node: Element | null = element; node; node = node.parentElement) {
    const bg = parseColor(getComputedStyle(node).backgroundColor);
    if (bg && bg.a > 0) {
      layers.push(bg);
      if (bg.a === 1) {
        break;
      }
    }
  }
  let result: Rgba =
    layers.length > 0 ? layers[layers.length - 1] : { r: 255, g: 255, b: 255, a: 1 };
  if (result.a < 1) {
    result = over(result, { r: 255, g: 255, b: 255, a: 1 });
  }
  for (let i = layers.length - 2; i >= 0; i--) {
    result = over(layers[i], result);
  }
  return result;
}

/**
 * 简化版「可访问名称」判断，对齐 axe 的 button-name 规则：文本内容、
 * aria-label / aria-labelledby、title、内部图片 alt 或 svg title 任一存在即可。
 */
function hasAccessibleName(button: HTMLButtonElement): boolean {
  if ((button.textContent ?? '').trim() !== '') {
    return true;
  }
  if ((button.getAttribute('aria-label') ?? '').trim() !== '') {
    return true;
  }
  if (button.hasAttribute('aria-labelledby')) {
    return true;
  }
  if ((button.getAttribute('title') ?? '').trim() !== '') {
    return true;
  }
  if (button.querySelector('img[alt], svg title')) {
    return true;
  }
  return false;
}

/** 只统计直接持有文本节点的元素（文本在子元素里的容器由子元素自己计入）。 */
function hasDirectText(element: Element): boolean {
  return Array.from(element.childNodes).some(
    (node) => node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim() !== '',
  );
}

function runMiniAudit(scope: HTMLElement): MiniAudit {
  const missingAlt = Array.from(scope.querySelectorAll('img')).filter(
    (img) => !img.hasAttribute('alt'),
  ).length;

  const missingNames = Array.from(scope.querySelectorAll('button')).filter(
    (button) => !hasAccessibleName(button),
  ).length;

  const levels = Array.from(scope.querySelectorAll('h1,h2,h3,h4,h5,h6')).map((heading) =>
    Number(heading.tagName.charAt(1)),
  );
  let headingJumps = 0;
  for (let i = 1; i < levels.length; i++) {
    if (levels[i] > levels[i - 1] + 1) {
      headingJumps++;
    }
  }

  const domNodes = scope.querySelectorAll('*').length + 1;

  let contrastFailures = 0;
  let minContrast: number | null = null;
  for (const element of Array.from(scope.querySelectorAll('*'))) {
    if (!hasDirectText(element) || element.getClientRects().length === 0) {
      continue;
    }
    const fg = parseColor(getComputedStyle(element).color);
    if (!fg) {
      continue;
    }
    const background = effectiveBackground(element);
    const ink = fg.a < 1 ? over(fg, background) : fg;
    const ratio = contrastRatio(relativeLuminance(ink), relativeLuminance(background));
    if (minContrast === null || ratio < minContrast) {
      minContrast = ratio;
    }
    if (ratio < CONTRAST_THRESHOLD) {
      contrastFailures++;
    }
  }

  return { contrastFailures, minContrast, missingAlt, missingNames, headingJumps, domNodes };
}

function buildPageHTML(concentrated: boolean): string {
  const photos = concentrated
    ? PHOTOS.map(
        (src) => `<img class="audit-specimen__photo" width="48" height="36" src="${src}" />`,
      ).join('')
    : `<img class="audit-specimen__photo" width="48" height="36" src="${PHOTOS[0]}" />`;

  const cells = Array.from(
    { length: concentrated ? CELL_COUNT : 0 },
    (_, i) => `<div class="audit-specimen__cell"><span>${i + 1}</span></div>`,
  ).join('');

  return `
    <header class="audit-specimen__head">
      <h3 class="audit-specimen__title">城市活动周报</h3>
      <p class="audit-specimen__intro">本周共 6 场线下活动，覆盖讲座、导览与手作工坊，欢迎按街区就近报名。</p>
    </header>
    <section class="audit-specimen__section">
      <h4 class="audit-specimen__heading">活动速递</h4>
      <ul class="audit-specimen__list">
        <li>周六 10:00 · 城南图书馆 · 城市摄影讲座</li>
        <li>周日 14:00 · 老城博物馆 · 街区历史导览</li>
      </ul>
      <p class="audit-specimen__soft">部分场次余票紧张，请尽快确认出行安排。</p>
      ${concentrated ? '<p class="audit-specimen__faint">赞助商展示位招租中，详情见现场服务台。</p>' : ''}
      <div class="audit-specimen__photos" data-testid="photos">${photos}</div>
    </section>
    <section class="audit-specimen__section">
      <h4 class="audit-specimen__heading">报名入口</h4>
      <div class="audit-specimen__row">
        <label class="audit-specimen__label" for="audit-specimen-email">邮箱</label>
        <input class="audit-specimen__input" id="audit-specimen-email" type="text" placeholder="you@example.com" autocomplete="off" />
      </div>
      <div class="audit-specimen__row">
        <button class="audit-specimen__btn" type="button">提交订阅</button>
        ${concentrated ? `<button class="audit-specimen__icon-btn" type="button" data-testid="icon-button"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg></button>` : ''}
      </div>
    </section>
    ${concentrated ? `
    <section class="audit-specimen__section">
      <h6 class="audit-specimen__deep-title">往期回顾</h6>
      <div class="audit-specimen__grid">${cells}</div>
    </section>` : ''}
  `;
}

const SPECIMEN_STYLES = `
.audit-specimen {
  margin: 0 auto;
  padding: 14px;
  border: 1px solid #dbe3f0;
  border-radius: 8px;
  background: #f4f7fc;
  color: #334155;
  font: 13px/1.6 ui-sans-serif, system-ui, sans-serif;
}
.audit-specimen__body {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
}
.audit-specimen__page {
  flex: 1 1 360px;
  min-width: 0;
  display: grid;
  gap: 12px;
  align-content: start;
  padding: 12px;
  border: 1px solid #dbe3f0;
  border-radius: 6px;
  background: #ffffff;
}
.audit-specimen__head {
  display: grid;
  gap: 4px;
}
.audit-specimen__title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #172033;
}
.audit-specimen__intro {
  margin: 0;
  color: #475569;
}
.audit-specimen__section {
  display: grid;
  gap: 8px;
}
.audit-specimen__heading {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: #172033;
}
.audit-specimen__list {
  margin: 0;
  padding-left: 18px;
  color: #334155;
}
.audit-specimen__soft {
  margin: 0;
  color: #94a3b8;
}
.audit-specimen__faint {
  margin: 0;
  color: #cbd5e1;
}
.audit-specimen__photos {
  display: flex;
  gap: 8px;
}
.audit-specimen__photo {
  display: block;
  border-radius: 4px;
}
.audit-specimen__row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.audit-specimen__label {
  color: #475569;
}
.audit-specimen__input {
  flex: 1 1 160px;
  padding: 5px 8px;
  border: 1px solid #b9c6e0;
  border-radius: 6px;
  background: #f6f8fb;
  color: #172033;
  font: inherit;
}
.audit-specimen__input::placeholder {
  color: #5d6f8a;
}
.audit-specimen__btn {
  padding: 5px 14px;
  border: 1px solid #1d4ed8;
  border-radius: 6px;
  background: #1d4ed8;
  color: #ffffff;
  font: inherit;
  cursor: pointer;
}
.audit-specimen__icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  padding: 0;
  border: 1px solid #b9c6e0;
  border-radius: 6px;
  background: #f6f8fb;
  color: #334155;
  cursor: pointer;
}
.audit-specimen__deep-title {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  color: #475569;
}
.audit-specimen__grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 4px;
}
.audit-specimen__cell {
  display: grid;
  place-items: center;
  padding: 3px 0;
  border-radius: 4px;
  background: #eef2f9;
  color: #475569;
  font-size: 11px;
}
.audit-specimen__side {
  flex: 1 1 280px;
  display: grid;
  gap: 10px;
  align-content: start;
}
.audit-specimen__side-title {
  margin: 0;
  font-weight: 700;
  color: #172033;
}
.audit-specimen__readout {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 4px 10px;
  align-content: start;
  margin: 0;
  padding: 10px 12px;
  border: 1px dashed #b9c6e0;
  border-radius: 6px;
  background: rgb(255 255 255 / 85%);
  font: 12px/1.6 ui-monospace, SFMono-Regular, Menlo, monospace;
}
.audit-specimen__readout dt {
  color: #5d6f67;
  white-space: nowrap;
}
.audit-specimen__readout dd {
  margin: 0;
  color: #172033;
  text-align: right;
  word-break: break-all;
}
.audit-specimen__readout dd[data-warn='true'] {
  color: #b45309;
}
.audit-specimen__hint {
  margin: 0;
  color: #475569;
  font-size: 12px;
}
.audit-specimen__hint code {
  padding: 0 3px;
  border-radius: 3px;
  background: #e2e8f0;
  color: #334155;
  font: 12px ui-monospace, SFMono-Regular, Menlo, monospace;
}
`;

export function createAuditSpecimen(root: HTMLElement): AuditSpecimenInstance {
  root.classList.add('audit-specimen');
  root.innerHTML = `
    <div class="audit-specimen__body">
      <div class="audit-specimen__page" data-testid="audit-page"></div>
      <aside class="audit-specimen__side">
        <p class="audit-specimen__side-title">mini 检查器 · 只统计标本页面内部</p>
        <dl class="audit-specimen__readout">
          ${READOUT_CELLS.map(
            ([key, label]) => `<dt>${label}</dt><dd data-cell="${key}">—</dd>`,
          ).join('')}
        </dl>
        <p class="audit-specimen__hint">
          对整个 Storybook 标签页运行 Lighthouse：DevTools → More tools → Lighthouse，
          勾选 Accessibility 后点 Analyze page load；报告里展开
          <code>color-contrast</code>、<code>button-name</code>、<code>image-alt</code>
          条目，与左侧计数对照。
        </p>
      </aside>
    </div>
  `;

  const styleEl = document.createElement('style');
  styleEl.textContent = SPECIMEN_STYLES;
  root.append(styleEl);

  const page = root.querySelector('[data-testid="audit-page"]') as HTMLElement;
  const cells = new Map<string, HTMLElement>();
  for (const [key] of READOUT_CELLS) {
    cells.set(key, root.querySelector(`[data-cell="${key}"]`) as HTMLElement);
  }

  let density: Density = 'concentrated';
  let audit: MiniAudit = zeroAudit();

  function renderReadout(): void {
    const total =
      audit.contrastFailures + audit.missingAlt + audit.missingNames + audit.headingJumps;
    const values: Record<string, string> = {
      density: density === 'concentrated' ? '集中问题' : '少量问题',
      contrast: `${audit.contrastFailures} 处`,
      minContrast: audit.minContrast === null ? '—' : `${audit.minContrast.toFixed(1)}:1`,
      alt: `${audit.missingAlt} 处`,
      names: `${audit.missingNames} 处`,
      jumps: `${audit.headingJumps} 处`,
      dom: `${audit.domNodes} 个`,
      total: `${total} 项`,
    };
    const warn: Record<string, boolean> = {
      density: false,
      dom: false,
      contrast: audit.contrastFailures > 0,
      minContrast: audit.minContrast !== null && audit.minContrast < CONTRAST_THRESHOLD,
      alt: audit.missingAlt > 0,
      names: audit.missingNames > 0,
      jumps: audit.headingJumps > 0,
      total: total > 0,
    };
    for (const [key, value] of Object.entries(values)) {
      const cell = cells.get(key);
      if (!cell) {
        continue;
      }
      if (cell.textContent !== value) {
        cell.textContent = value;
      }
      const nextWarn = warn[key] ? 'true' : 'false';
      if (cell.dataset.warn !== nextWarn) {
        cell.dataset.warn = nextWarn;
      }
    }
  }

  function auditAndRender(): void {
    requestAnimationFrame(() => {
      /* render 返回后 Storybook 才把舞台挂进文档；挂载后 computed style
         的继承链与可见性才真实，审计因此安排在下一帧。 */
      if (!page.isConnected) {
        return;
      }
      audit = runMiniAudit(page);
      renderReadout();
    });
  }

  return {
    update(next: Density) {
      density = next;
      page.innerHTML = buildPageHTML(density === 'concentrated');
      auditAndRender();
    },
    dispose() {
      /* 无持久监听与循环任务；舞台移除后随闭包一起回收。 */
    },
  };
}
