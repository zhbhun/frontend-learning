/**
 * 范例介绍：「CSS 标本」页——一张样式有层次的卡片（CSS 自定义属性主题、
 * 特异性竞争的两条规则、:hover 与 is-active 状态、::after 伪元素），
 * 供读者用 DevTools 的 Styles、Computed 与盒模型实时查看和修改。
 * 输入或前置状态：Controls 的「状态类」（是否给卡片加 is-active 类）与
 *   「--card-accent」主题色；默认主题色不写行内样式，换成其他颜色后，
 *   Styles 顶部才会出现 element.style 行内声明。
 * 主要操作：右键卡片元素选 Inspect；在 Styles 里改值、用 .cls 加类、
 *   用 :hov 强制 :hover、点 Show sidebar 打开盒模型；在 Computed 里核对最终值。
 * 预期结果：readout 持续读取 getComputedStyle，显示卡片的最终背景色、
 *   边框颜色、内边距与尺寸——无论改动来自 Controls 还是读者自己的 DevTools，
 *   读数都会实时刷新。
 * 阅读主线：Styles 管规则来源与级联，Computed 管最终生效值，盒模型管几何。
 */
import { createRenderLoop } from '../../assets/canvas-runtime.js';

export type SpecimenState = 'default' | 'is-active';

export interface SpecimenOptions {
  /** 状态类：是否给 .specimen-card 加 is-active。 */
  state: SpecimenState;
  /** 主题色：--card-accent 的取值。 */
  accent: string;
}

export interface CssSpecimenInstance {
  update(options: SpecimenOptions): void;
  dispose(): void;
}

/** Controls 里的默认主题色；等于它时不写行内样式，让 element.style 保持为空。 */
export const DEFAULT_ACCENT = '#0d7c66';

/*
  标本的全部样式。故意写出层次，让读者在 DevTools 里能看到：
  - 自定义属性集中在 .css-specimen 上，var() 出现在卡片规则里；
  - .card-note 有两条特异性不同的规则竞争，输的一条在 Styles 里被划线；
  - .card-title 没有自己的颜色声明，会显示在 Inherited from 段；
  - margin 四边不同、左边 border 更粗、padding 上下与左右不同，盒模型图里一眼可核对。
*/
const SPECIMEN_STYLES = `
.css-specimen {
  /* 主题色通过 CSS 自定义属性（custom property）下发：改它，整张卡片跟着变 */
  --card-accent: ${DEFAULT_ACCENT};
  --card-bg: #ffffff;

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
.css-specimen__main {
  flex: 1 1 300px;
  min-width: 0;
}
.css-specimen__hint {
  margin: 0 0 10px;
  font-size: 12px;
  color: #5d6f67;
}
.specimen-card {
  background: var(--card-bg);
  border: 2px solid var(--card-accent);
  border-left-width: 8px;
  border-radius: 10px;
  padding: 14px 20px;
  margin: 16px 24px 16px 8px;
  position: relative;
  max-width: 380px;
}
.specimen-card:hover {
  box-shadow: 0 6px 18px rgb(23 32 51 / 28%);
}
.specimen-card.is-active {
  background: #eef2f7;
}
.card-title {
  margin: 0 0 6px;
  font-size: 15px;
  font-weight: 600;
}
.css-specimen .card-note {
  /* 特异性更高，这条胜出；另一条 .card-note 会在 Styles 里被划线 */
  color: var(--card-accent);
}
.card-note {
  color: #5a6472;
  margin: 0;
}
.specimen-card::after {
  content: '标本';
  position: absolute;
  top: -9px;
  right: 12px;
  padding: 1px 8px;
  border-radius: 999px;
  background: var(--card-accent);
  color: #ffffff;
  font-size: 11px;
  line-height: 1.5;
}
.css-specimen__readout {
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
.css-specimen__readout dt {
  color: #5d6f67;
  white-space: nowrap;
}
.css-specimen__readout dd {
  margin: 0;
  color: #172033;
  text-align: right;
}
`;

export function createCssSpecimen(root: HTMLElement): CssSpecimenInstance {
  root.classList.add('css-specimen');
  root.innerHTML = `
    <div class="css-specimen__main">
      <p class="css-specimen__hint">CSS 标本：右键下面任意元素选 Inspect（检查），按正文提示用 Styles、Computed 与盒模型调试。</p>
      <section class="specimen-card">
        <h3 class="card-title">标本卡片</h3>
        <p class="card-note">我的颜色由两条规则竞争，特异性高的那条胜出——输掉的那条在 Styles 里被划线。</p>
      </section>
    </div>
    <dl class="css-specimen__readout">
      <dt>状态类</dt><dd class="css-specimen__cell-state"></dd>
      <dt>背景颜色</dt><dd class="css-specimen__cell-bg"></dd>
      <dt>边框颜色</dt><dd class="css-specimen__cell-border"></dd>
      <dt>内边距</dt><dd class="css-specimen__cell-padding"></dd>
      <dt>尺寸</dt><dd class="css-specimen__cell-size"></dd>
    </dl>
  `;

  const styleEl = document.createElement('style');
  styleEl.textContent = SPECIMEN_STYLES;
  root.append(styleEl);

  const card = root.querySelector('.specimen-card') as HTMLElement;
  const cells = {
    state: root.querySelector('.css-specimen__cell-state') as HTMLElement,
    bg: root.querySelector('.css-specimen__cell-bg') as HTMLElement,
    border: root.querySelector('.css-specimen__cell-border') as HTMLElement,
    padding: root.querySelector('.css-specimen__cell-padding') as HTMLElement,
    size: root.querySelector('.css-specimen__cell-size') as HTMLElement,
  };

  /*
    读者在 DevTools 里的修改不会触发页面 JS 回调，只能靠轮询发现：
    循环读取计算样式，只在读数变化时更新 readout。离屏或页面隐藏时自动暂停。
  */
  let signature = '';

  function frame() {
    const computed = getComputedStyle(card);
    const stateText = card.classList.contains('is-active') ? 'is-active' : '—';
    const backgroundColor = computed.backgroundColor;
    const borderColor = computed.borderTopColor;
    const padding = computed.padding;
    const size = `${card.offsetWidth} × ${card.offsetHeight} px`;

    const next = [stateText, backgroundColor, borderColor, padding, size].join(
      '|',
    );
    if (next === signature) {
      return;
    }
    signature = next;

    cells.state.textContent = stateText;
    cells.bg.textContent = backgroundColor;
    cells.border.textContent = borderColor;
    cells.padding.textContent = padding;
    cells.size.textContent = size;
  }

  const renderLoop = createRenderLoop(root, frame);
  renderLoop.renderOnce();

  let current: SpecimenOptions = { state: 'default', accent: DEFAULT_ACCENT };

  function applyOptions() {
    if (current.accent === DEFAULT_ACCENT) {
      root.style.removeProperty('--card-accent');
    } else {
      root.style.setProperty('--card-accent', current.accent);
    }
    card.classList.toggle('is-active', current.state === 'is-active');
  }

  return {
    update(options) {
      current = options;
      applyOptions();
    },
    dispose() {
      renderLoop.dispose();
    },
  };
}
