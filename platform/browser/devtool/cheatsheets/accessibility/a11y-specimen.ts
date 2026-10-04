/**
 * 范例介绍：「无障碍标本」表单页——一页含五类典型无障碍问题的表单，以及修复后的版本。
 * 前置状态：无需环境；Controls 的「修复模式」在问题版与修复版之间切换。
 * 主要操作：读者用 Elements 的 Accessibility 标签页看无障碍树与 ARIA 属性，
 *   用 Styles 的 Color Picker 核对对比度，用 Rendering 的 Emulate vision deficiencies 对照体感。
 * 预期结果：问题版 readout 报 5 个问题（缺可访问名称 3、键盘不可达 1、低对比度文字 1），
 *   修复版全部归零。
 * 阅读主线：buildForm() 的两个分支分别渲染问题版与修复版；audit() 是页面内 mini 检查器，
 *   三条规则（缺名称 / 键盘不可达 / 低对比度）全部用真实 DOM 与 getComputedStyle 计算。
 */

export interface A11ySpecimenOptions {
  /** true = 修复版表单；false = 问题版表单。 */
  fixed: boolean;
}

export interface A11yInstance {
  update(options: A11ySpecimenOptions): void;
  dispose(): void;
}

/** 问题版表单：五类问题各占一处。 */
const BROKEN_FORM_HTML = `
  <form class="a11y-specimen__form">
    <p class="a11y-specimen__field">
      <input class="a11y-specimen__input" type="email" placeholder="you@example.com" />
    </p>
    <p class="a11y-specimen__field">
      <label class="a11y-specimen__label" for="a11y-code">优惠码</label>
      <input id="a11y-code" class="a11y-specimen__input a11y-specimen__input--short" type="text" value="DEVTOOLS" />
      <button class="a11y-specimen__icon" type="button"><svg class="a11y-specimen__icon-glyph" viewBox="0 0 12 12" aria-hidden="true"><path d="M1 1l10 10M11 1L1 11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>
      <span class="a11y-specimen__dot" role="img"></span>
    </p>
    <p class="a11y-specimen__field">
      <div class="a11y-specimen__fake" role="button">使用此优惠码</div>
    </p>
    <p class="a11y-specimen__muted">优惠码每月 1 日刷新，过期自动失效</p>
    <div class="a11y-specimen__order">
      <span class="a11y-specimen__chip">第 2 步 · 填写优惠码</span>
      <span class="a11y-specimen__chip">第 1 步 · 确认邮箱</span>
    </div>
  </form>
`;

/** 修复版表单：五处问题逐一修复，视觉顺序也与源码顺序一致。 */
const FIXED_FORM_HTML = `
  <form class="a11y-specimen__form">
    <p class="a11y-specimen__field">
      <label class="a11y-specimen__label" for="a11y-email">邮箱</label>
      <input id="a11y-email" class="a11y-specimen__input" type="email" placeholder="you@example.com" />
    </p>
    <p class="a11y-specimen__field">
      <label class="a11y-specimen__label" for="a11y-code">优惠码</label>
      <input id="a11y-code" class="a11y-specimen__input a11y-specimen__input--short" type="text" value="DEVTOOLS" />
      <button class="a11y-specimen__icon" type="button" aria-label="清除优惠码"><svg class="a11y-specimen__icon-glyph" viewBox="0 0 12 12" aria-hidden="true"><path d="M1 1l10 10M11 1L1 11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>
      <span class="a11y-specimen__badge">有货</span>
    </p>
    <p class="a11y-specimen__field">
      <button class="a11y-specimen__real" type="button">使用此优惠码</button>
    </p>
    <p class="a11y-specimen__muted a11y-specimen__muted--ok">优惠码每月 1 日刷新，过期自动失效</p>
    <div class="a11y-specimen__order a11y-specimen__order--ok">
      <span class="a11y-specimen__chip">第 1 步 · 确认邮箱</span>
      <span class="a11y-specimen__chip">第 2 步 · 填写优惠码</span>
    </div>
  </form>
`;

const SPECIMEN_STYLES = `
.a11y-specimen {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  align-items: flex-start;
  padding: 16px;
  border: 1px solid #dbe3f0;
  border-radius: 8px;
  background: #e9eef4;
  color: #334155;
  font: 13px/1.6 ui-sans-serif, system-ui, sans-serif;
}
.a11y-specimen__main {
  flex: 1 1 340px;
  min-width: 0;
}
.a11y-specimen__hint {
  margin: 0 0 10px;
  font-size: 12px;
  color: #475569;
}
.a11y-specimen__hint code {
  padding: 0 3px;
  border-radius: 3px;
  background: #dbe3f0;
  font: 12px ui-monospace, SFMono-Regular, Menlo, monospace;
}
.a11y-specimen__form {
  margin: 0;
  padding: 14px;
  border: 1px dashed #b9c6e0;
  border-radius: 6px;
  background: #fff;
}
.a11y-specimen__field {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin: 0 0 10px;
}
.a11y-specimen__label {
  font-weight: 600;
  color: #475569;
}
.a11y-specimen__input {
  padding: 5px 8px;
  border: 1px solid #94a7c4;
  border-radius: 5px;
  color: #334155;
  font: 13px ui-sans-serif, system-ui, sans-serif;
}
.a11y-specimen__input--short {
  width: 110px;
}
.a11y-specimen__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: 1px solid #cbd5e1;
  border-radius: 5px;
  background: #fff;
  color: #334155;
  cursor: pointer;
}
.a11y-specimen__icon-glyph {
  width: 11px;
  height: 11px;
}
.a11y-specimen__dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #16a34a;
}
.a11y-specimen__badge {
  padding: 2px 8px;
  border-radius: 999px;
  background: #dcfce7;
  color: #14532d;
  font-size: 12px;
  font-weight: 600;
}
.a11y-specimen__fake {
  display: inline-block;
  padding: 6px 14px;
  border-radius: 6px;
  background: #2f4fb0;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}
.a11y-specimen__real {
  padding: 6px 14px;
  border: none;
  border-radius: 6px;
  background: #2f4fb0;
  color: #fff;
  font: 600 13px ui-sans-serif, system-ui, sans-serif;
  cursor: pointer;
}
.a11y-specimen__muted {
  margin: 0 0 10px;
  font-size: 12px;
  color: #b3bcc9;
}
.a11y-specimen__muted--ok {
  color: #475569;
}
.a11y-specimen__order {
  display: flex;
  gap: 8px;
  flex-direction: row-reverse;
}
.a11y-specimen__order--ok {
  flex-direction: row;
}
.a11y-specimen__chip {
  padding: 4px 10px;
  border-radius: 999px;
  background: #eef2f7;
  color: #334155;
  font-size: 12px;
}
.a11y-specimen__status {
  margin: 8px 2px 0;
  min-height: 1em;
  font-size: 12px;
  color: #475569;
}
.a11y-specimen__readout {
  flex: 1 1 230px;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 4px 10px;
  align-content: start;
  margin: 0;
  padding: 10px 12px;
  border: 1px dashed #b9c6e0;
  border-radius: 6px;
  background: #fff;
  font: 12px/1.6 ui-monospace, SFMono-Regular, Menlo, monospace;
}
.a11y-specimen__readout dt {
  color: #475569;
  white-space: nowrap;
}
.a11y-specimen__readout dd {
  margin: 0;
  color: #172033;
  text-align: right;
}
`;

/* ---------------------------------------------------------------------------
 * 页面内 mini 检查器：只覆盖三类可以在本地真实判定的问题。
 * 1. 缺可访问名称：表单控件没有 label / aria-label / aria-labelledby / title；
 *    button 没有文本也没有 aria 名称；role="img" 的图形没有 aria 名称。
 * 2. 键盘不可达：带 role="button" / role="link" 的元素既不是原生可聚焦标签，
 *    也没有 tabindex。
 * 3. 低对比度文字：带直接文本的元素，color 与最近不透明祖先背景的对比度
 *    低于 WCAG AA 正文阈值（本课标本文字均小于 24px，统一按 4.5:1 判定；
 *    真实审计对大文字用 3:1）。
 * ------------------------------------------------------------------------- */

/** WCAG AA 对正文文本的对比度阈值；大文字（约 24px 以上）为 3:1。 */
const AA_TEXT_RATIO = 4.5;

/** 原生就支持聚焦与键盘操作的标签。 */
const NATURAL_FOCUS_TAGS = new Set(['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA']);

interface AuditResult {
  missingNames: number;
  keyboardBlocked: number;
  lowContrast: number;
  minRatio: number;
}

/** aria-label / aria-labelledby 是否给元素提供了名称。 */
function hasAriaName(element: Element): boolean {
  if (element.getAttribute('aria-label')?.trim()) {
    return true;
  }
  const labelledby = element.getAttribute('aria-labelledby')?.trim();
  if (labelledby) {
    return labelledby
      .split(/\s+/)
      .some((id) => document.getElementById(id)?.textContent?.trim());
  }
  return false;
}

/** 表单控件的名称来源：aria 名称、title 或 label 关联（for 或包裹）。 */
function formControlHasName(control: Element): boolean {
  if (hasAriaName(control) || control.getAttribute('title')?.trim()) {
    return true;
  }
  const id = control.getAttribute('id');
  if (id) {
    const selector = `label[for="${CSS.escape(id)}"]`;
    if (document.querySelector(selector) !== null) {
      return true;
    }
  }
  return control.closest('label') !== null;
}

/** 元素是否有不经过子元素、直接挂在自己身上的文本。 */
function hasDirectText(element: Element): boolean {
  return Array.from(element.childNodes).some(
    (node) =>
      node.nodeType === Node.TEXT_NODE &&
      (node.textContent ?? '').trim().length > 0,
  );
}

/** 把 getComputedStyle 返回的 rgb()/rgba() 字符串拆成通道值。 */
function parseColor(value: string): [number, number, number, number] | undefined {
  const match = value.match(/rgba?\(([^)]*)\)/);
  if (!match) {
    return undefined;
  }
  const parts = match[1]
    .split(/[\s,/]+/)
    .filter((part) => part.length > 0)
    .map(Number);
  if (parts.length < 3 || parts.slice(0, 3).some((part) => Number.isNaN(part))) {
    return undefined;
  }
  return [parts[0], parts[1], parts[2], parts.length >= 4 ? parts[3] : 1];
}

/** WCAG 相对亮度：sRGB 通道先线性化，再按人眼敏感度加权。 */
function relativeLuminance(rgb: [number, number, number]): number {
  const channel = (value: number): number => {
    const v = value / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(rgb[0]) + 0.7152 * channel(rgb[1]) + 0.0722 * channel(rgb[2]);
}

/** 对比率 =（较亮的亮度 + 0.05）/（较暗的亮度 + 0.05），范围 1:1 – 21:1。 */
function contrastRatio(a: number, b: number): number {
  const [hi, lo] = a >= b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * 沿祖先链找第一个非透明背景色。半透明背景按与白色合成近似处理——
 * 本课标本的所有背景均不透明，混合分支只是让检查器在通用页面上不至于算错方向。
 */
function effectiveBackground(element: Element): [number, number, number] {
  let node: Element | null = element;
  while (node) {
    const bg = parseColor(window.getComputedStyle(node).backgroundColor);
    if (bg && bg[3] > 0) {
      const blend = (part: number) => Math.round(part * bg[3] + 255 * (1 - bg[3]));
      return [blend(bg[0]), blend(bg[1]), blend(bg[2])];
    }
    node = node.parentElement;
  }
  return [255, 255, 255];
}

function findMissingNames(scope: ParentNode): number {
  let missing = 0;
  scope.querySelectorAll('input:not([type="hidden"]), textarea, select').forEach((control) => {
    if (!formControlHasName(control)) {
      missing += 1;
    }
  });
  scope.querySelectorAll('button').forEach((button) => {
    if (!hasAriaName(button) && !(button.textContent ?? '').trim()) {
      missing += 1;
    }
  });
  scope.querySelectorAll('[role="img"]').forEach((graphic) => {
    if (!hasAriaName(graphic)) {
      missing += 1;
    }
  });
  return missing;
}

function findKeyboardBlocked(scope: ParentNode): number {
  let blocked = 0;
  scope.querySelectorAll('[role="button"], [role="link"]').forEach((element) => {
    const native =
      NATURAL_FOCUS_TAGS.has(element.tagName) ||
      (element.tagName === 'A' && element.hasAttribute('href'));
    if (!native && !element.hasAttribute('tabindex')) {
      blocked += 1;
    }
  });
  return blocked;
}

function findLowContrastText(scope: HTMLElement): { count: number; minRatio: number } {
  let count = 0;
  let minRatio = Number.POSITIVE_INFINITY;
  scope.querySelectorAll('*').forEach((element) => {
    if (!hasDirectText(element)) {
      return;
    }
    const color = parseColor(window.getComputedStyle(element).color);
    if (!color) {
      return;
    }
    const ratio = contrastRatio(
      relativeLuminance([color[0], color[1], color[2]]),
      relativeLuminance(effectiveBackground(element)),
    );
    if (ratio < AA_TEXT_RATIO) {
      count += 1;
      minRatio = Math.min(minRatio, ratio);
    }
  });
  return { count, minRatio: count > 0 ? minRatio : Number.NaN };
}

function audit(scope: HTMLElement): AuditResult {
  const contrast = findLowContrastText(scope);
  return {
    missingNames: findMissingNames(scope),
    keyboardBlocked: findKeyboardBlocked(scope),
    lowContrast: contrast.count,
    minRatio: contrast.minRatio,
  };
}

export function createA11ySpecimen(root: HTMLElement): A11yInstance {
  root.classList.add('a11y-specimen');
  root.innerHTML = `
    <div class="a11y-specimen__main">
      <p class="a11y-specimen__hint">无障碍标本：先打开 DevTools——Elements 面板选中下方任一元素查看 <b>Accessibility</b> 标签页；Command Menu（<code>Command+Shift+P</code> / <code>Control+Shift+P</code>）输入 rendering 打开 Rendering 抽屉，在 <b>Emulate vision deficiencies</b> 里换视角。readout 是页面内 mini 检查器的真实统计，只覆盖缺名称、键盘不可达与低对比度三类问题。</p>
      <div class="a11y-specimen__form-host"></div>
      <p class="a11y-specimen__status">—</p>
    </div>
    <dl class="a11y-specimen__readout">
      <dt>可检测问题</dt><dd class="a11y-specimen__cell-total">—</dd>
      <dt>缺可访问名称</dt><dd class="a11y-specimen__cell-names">—</dd>
      <dt>键盘不可达</dt><dd class="a11y-specimen__cell-keyboard">—</dd>
      <dt>低对比度文字</dt><dd class="a11y-specimen__cell-contrast">—</dd>
    </dl>
  `;

  const styleEl = document.createElement('style');
  styleEl.textContent = SPECIMEN_STYLES;
  root.append(styleEl);

  const formHost = root.querySelector('.a11y-specimen__form-host') as HTMLElement;
  const statusEl = root.querySelector('.a11y-specimen__status') as HTMLElement;
  const cells = {
    total: root.querySelector('.a11y-specimen__cell-total') as HTMLElement,
    names: root.querySelector('.a11y-specimen__cell-names') as HTMLElement,
    keyboard: root.querySelector('.a11y-specimen__cell-keyboard') as HTMLElement,
    contrast: root.querySelector('.a11y-specimen__cell-contrast') as HTMLElement,
  };

  let fixed = false;

  function buildForm(): void {
    formHost.innerHTML = fixed ? FIXED_FORM_HTML : BROKEN_FORM_HTML;
  }

  function paint(): void {
    const result = audit(formHost);
    cells.total.textContent = String(
      result.missingNames + result.keyboardBlocked + result.lowContrast,
    );
    cells.names.textContent = String(result.missingNames);
    cells.keyboard.textContent = String(result.keyboardBlocked);
    cells.contrast.textContent =
      result.lowContrast > 0
        ? `${result.lowContrast} 处 · 最低 ${result.minRatio.toFixed(2)}:1`
        : '达标';
  }

  /* 事件委托挂在 formHost 上：切换修复模式重建表单后监听依然有效。 */
  function onFormClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target.closest('.a11y-specimen__fake')) {
      statusEl.textContent = '点击有反应——但 Tab 聚焦不到它，Enter / Space 也触发不了';
      return;
    }
    if (target.closest('.a11y-specimen__real')) {
      statusEl.textContent = '原生 button：Tab 可聚焦，Enter / Space 均触发';
      return;
    }
    if (target.closest('.a11y-specimen__icon')) {
      if (fixed) {
        const codeInput = formHost.querySelector<HTMLInputElement>('#a11y-code');
        if (codeInput) {
          codeInput.value = '';
        }
        statusEl.textContent = '已清除优惠码——aria-label 让读屏读出「清除优惠码，按钮」';
      } else {
        statusEl.textContent = '图标按钮点击有反应，但它没有可访问名称，读屏只能读出「按钮」';
      }
    }
  }

  formHost.addEventListener('click', onFormClick);
  buildForm();
  paint();

  return {
    update(options) {
      if (options.fixed === fixed) {
        return;
      }
      fixed = options.fixed;
      buildForm();
      statusEl.textContent = '—';
      paint();
    },
    dispose() {
      formHost.removeEventListener('click', onFormClick);
    },
  };
}
