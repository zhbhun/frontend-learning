/**
 * 范例介绍：「查询标本」——一个带辨识度的静态页面（主视觉块、三个按钮、待办列表、
 * 输入框），readout 用与命令行相同的语义显示「目标选择器」的 $ 首个匹配与 $$ 匹配数，
 * 供读者在 DevTools Console 里运行 Command Line API 对照。
 * 前置状态：无需任何环境；读者打开 DevTools 的 Console 面板（Command+Option+J），
 *   执行上下文保持 top（演示页内嵌在当前文档中）。
 * 主要操作：Controls 切换「目标选择器」；在命令行运行 $、$$、$x、inspect、copy、
 *   monitorEvents、$0；点击标本按钮、在输入框打字、在 Elements 里选中标本元素。
 * 预期结果：readout 与命令行运行结果一致（$ 取首个元素、$$ 返回数组）；切到
 *   '.specimen-nothing' 演示无匹配（$ 为 undefined、$$ 为 []）；「最近点击」「输入框
 *   keydown」随交互更新，可对照 monitorEvents 在 Console 打印的事件对象。
 * 阅读主线：update() 用 document.querySelector / querySelectorAll 计算读数——正是
 *   命令行里 $ / $$ 的底层语义，对照 readout 就是在对答案。
 */

/** 演示页下拉提供的目标选择器。 */
export type SelectorId =
  | '.specimen-btn'
  | '.specimen-list li'
  | '.specimen-list li.done'
  | 'input.specimen-input'
  | '#specimen-hero'
  | '.specimen-nothing';

export interface QuerySpecimenOptions {
  selector: SelectorId;
}

export interface QuerySpecimenInstance {
  update(options: QuerySpecimenOptions): void;
  dispose(): void;
}

const SPECIMEN_STYLES = `
.query-specimen {
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
.query-specimen__main {
  flex: 1 1 320px;
  min-width: 0;
}
.query-specimen__hint {
  margin: 0 0 10px;
  font-size: 12px;
  color: #5d6f67;
}
.query-specimen__hint code {
  padding: 0 3px;
  border-radius: 3px;
  background: #dbe3f0;
  font: 12px ui-monospace, SFMono-Regular, Menlo, monospace;
}
.specimen-hero {
  margin: 0 0 12px;
  padding: 14px 16px;
  border-radius: 8px;
  background: linear-gradient(135deg, #31456e, #4f7cff);
  color: #fff;
  font-weight: 600;
}
.specimen-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0 0 12px;
}
.specimen-btn {
  padding: 6px 14px;
  border: 1px solid transparent;
  border-radius: 6px;
  font: 600 13px ui-sans-serif, system-ui, sans-serif;
  cursor: pointer;
}
.specimen-btn--primary {
  background: #4f7cff;
  color: #fff;
}
.specimen-btn--ghost {
  background: transparent;
  border-color: #b9c6e0;
  color: #334155;
}
.specimen-btn--danger {
  background: #b91c1c;
  color: #fff;
}
.specimen-list {
  margin: 0 0 12px;
  padding-left: 20px;
}
.specimen-list li.done {
  text-decoration: line-through;
  color: #8a97a8;
}
.specimen-input {
  box-sizing: border-box;
  width: 100%;
  padding: 6px 10px;
  border: 1px solid #b9c6e0;
  border-radius: 6px;
  font: 13px ui-monospace, SFMono-Regular, Menlo, monospace;
}
.query-specimen__readout {
  flex: 1 1 230px;
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
.query-specimen__readout dt {
  color: #5d6f67;
  white-space: nowrap;
}
.query-specimen__readout dd {
  margin: 0;
  color: #172033;
  text-align: right;
}
`;

/* 把一个元素压成一行可读描述：标签 + id/类名 + 截断的文字。 */
function describe(el: Element): string {
  const tag = el.tagName.toLowerCase();
  const id = el.id ? `#${el.id}` : '';
  const classes = Array.from(el.classList)
    .map((name) => `.${name}`)
    .join('');
  const text = (el.textContent ?? '').trim().replace(/\s+/g, ' ');
  const label = text ? `「${text.length > 6 ? `${text.slice(0, 6)}…` : text}」` : '';
  return `${tag}${id}${classes}${label}`;
}

export function createQuerySpecimen(root: HTMLElement): QuerySpecimenInstance {
  root.classList.add('query-specimen');
  root.innerHTML = `
    <div class="query-specimen__main">
      <p class="query-specimen__hint">查询标本：在下方 Controls 切换「目标选择器」，readout 显示 <code>$</code> 首个匹配与 <code>$$</code> 匹配数。按 <code>Command+Option+J</code>（macOS）或 <code>Control+Shift+J</code>（Windows、Linux）打开 Console，在命令行运行相同的表达式（如 <code>$$('.specimen-btn')</code>）与 readout 对答案；标本元素可 <code>inspect</code>、按钮与输入框可 <code>monitorEvents</code>。</p>
      <div id="specimen-hero" class="specimen-hero">查询标本 · 主视觉块</div>
      <div class="specimen-toolbar">
        <button type="button" class="specimen-btn specimen-btn--primary">提交</button>
        <button type="button" class="specimen-btn specimen-btn--ghost">取消</button>
        <button type="button" class="specimen-btn specimen-btn--danger">删除</button>
      </div>
      <ul class="specimen-list">
        <li>买入《DevTools 速查手册》</li>
        <li class="done">升级到最新稳定版 Chrome</li>
        <li>录制一段 Performance 轨迹</li>
      </ul>
      <input type="text" class="specimen-input" placeholder="在这里打字试试" />
    </div>
    <dl class="query-specimen__readout">
      <dt>目标选择器</dt><dd class="query-specimen__cell-selector"></dd>
      <dt>$() 首个匹配</dt><dd class="query-specimen__cell-first"></dd>
      <dt>$$() 匹配数</dt><dd class="query-specimen__cell-count"></dd>
      <dt>最近点击</dt><dd class="query-specimen__cell-click"></dd>
      <dt>输入框 keydown</dt><dd class="query-specimen__cell-keydown"></dd>
    </dl>
  `;

  const styleEl = document.createElement('style');
  styleEl.textContent = SPECIMEN_STYLES;
  root.append(styleEl);

  const cells = {
    selector: root.querySelector('.query-specimen__cell-selector') as HTMLElement,
    first: root.querySelector('.query-specimen__cell-first') as HTMLElement,
    count: root.querySelector('.query-specimen__cell-count') as HTMLElement,
    click: root.querySelector('.query-specimen__cell-click') as HTMLElement,
    keydown: root.querySelector('.query-specimen__cell-keydown') as HTMLElement,
  };

  let current: QuerySpecimenOptions = { selector: '.specimen-btn' };
  let firstMatch = '—';
  let matchCount = '0';
  let lastClick = '—';
  let keydownCount = 0;

  function paint() {
    cells.selector.textContent = current.selector;
    cells.first.textContent = firstMatch;
    cells.count.textContent = matchCount;
    cells.click.textContent = lastClick;
    cells.keydown.textContent = String(keydownCount);
  }

  /* 与命令行 $ / $$ 相同的语义：querySelector 取首个，querySelectorAll 数个数。 */
  function evaluate(options: QuerySpecimenOptions) {
    current = options;
    try {
      const all = Array.from(document.querySelectorAll(options.selector));
      matchCount = String(all.length);
      firstMatch = all.length === 0 ? '（无匹配）' : describe(all[0]);
    } catch {
      firstMatch = '（无效选择器）';
      matchCount = '—';
    }
    paint();
  }

  root.querySelectorAll('.specimen-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      lastClick = `「${(btn.textContent ?? '').trim()}」`;
      paint();
    });
  });

  const input = root.querySelector('.specimen-input') as HTMLInputElement;
  input.addEventListener('keydown', () => {
    keydownCount += 1;
    paint();
  });

  return {
    update(options) {
      evaluate(options);
    },
    dispose() {
      /* 事件监听都绑定在标本自身元素上，随舞台移除一并释放，无全局资源。 */
    },
  };
}
