/**
 * 范例介绍：「渲染负载标本」——一页持续运行的渲染负载，供读者开启 Rendering 抽屉的
 * 三个叠加层逐一对照。
 * - 动画区：Controls 的「动画实现」切换两种 CSS 动画——layout 用关键帧每帧改 top/left
 *   （每帧触发布局与重绘），transform 用同一运动轨迹改写 transform（由合成器直接移动
 *   已绘制好的层）。开启 Paint flashing：前者每帧闪绿，后者基本不闪。
 * - 内容插入：Controls 的「插入方式」决定横幅何时出现——async 模拟网络返回（约 700ms
 *   后插入，已脱离输入窗口，偏移计入），sync 点击立即插入（处于输入后 500ms 窗口内，
 *   hadRecentInput=true，不计入）。开启 Layout Shift Regions：两种插入都闪紫。
 * - readout：FPS 估计（近 12 帧 rAF 间隔均值）、偏移事件（计入/总数）、最近偏移分值
 *   （含 hadRecentInput 判定）。
 * 前置状态：无需环境；Frame rendering stats 的 HUD 常驻整个视口右上角，不限于标本区。
 * 主要操作：勾选叠加层 → 切换动画实现/插入方式 → 对照叠加层与 readout。
 * 预期结果：layout 动画持续闪绿、transform 不闪；async 插入计入、sync 插入不计入。
 * 阅读主线：两套 @keyframes 是重绘对照的本体；insertBanner() 的调用时机决定
 * layout-shift 条目的 hadRecentInput；FPS 估计用 createRenderLoop 的 rAF 间隔实测。
 */
import { createRenderLoop } from '../../assets/canvas-runtime.js';

/** 动画实现：Controls 的「动画实现」单选值。 */
export type AnimationMode = 'layout' | 'transform';

/** 插入方式：Controls 的「插入方式」单选值。 */
export type InsertionMode = 'async' | 'sync';

export interface RenderSpecimenOptions {
  animation: AnimationMode;
  insertion: InsertionMode;
}

export interface RenderInstance {
  update(options: RenderSpecimenOptions): void;
  dispose(): void;
}

/** 动画实现的中文标签，stories 用它生成带中文标签的单选控件。 */
export const ANIMATION_LABELS: Record<AnimationMode, string> = {
  layout: '每帧改 top/left',
  transform: '只用 transform',
};

/** 插入方式的中文标签，stories 用它生成带中文标签的单选控件。 */
export const INSERTION_LABELS: Record<InsertionMode, string> = {
  async: '网络返回后插入',
  sync: '点击立即插入',
};

/** PerformanceObserver 的 layout-shift 条目里本课用到的字段。 */
interface LayoutShiftLike {
  value: number;
  hadRecentInput: boolean;
}

/** FPS 估计的滑动窗口：取近 N 帧 rAF 间隔的平均值。 */
const FPS_WINDOW = 12;
/** FPS 读数的刷新间隔（毫秒）：readout 不必逐帧重绘。 */
const FPS_PAINT_INTERVAL = 500;
/** 异步插入的延迟（毫秒）：大于 500ms 输入窗口，偏移才会计入。 */
const INSERT_DELAY_MS = 700;
/** 内容区最多保留的横幅数：超出后移除最旧的（移除同样是一次真实偏移）。 */
const MAX_BANNERS = 4;
/** 内容区初始的原有内容块数。 */
const INITIAL_BLOCK_COUNT = 2;

const SPECIMEN_STYLES = `
.render-specimen {
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
.render-specimen__main {
  flex: 1 1 320px;
  min-width: 0;
}
.render-specimen__hint {
  margin: 0 0 10px;
  font-size: 12px;
  color: #5d6f67;
}
.render-specimen__hint code {
  padding: 0 3px;
  border-radius: 3px;
  background: #dbe3f0;
  font: 12px ui-monospace, SFMono-Regular, Menlo, monospace;
}
.render-specimen__strip {
  position: relative;
  height: 64px;
  margin-bottom: 10px;
  border: 1px dashed #b9c6e0;
  border-radius: 6px;
  background: rgb(255 255 255 / 85%);
  overflow: hidden;
}
.render-specimen__mover {
  position: absolute;
  top: 0;
  left: 0;
  width: 160px;
  height: 40px;
  border-radius: 6px;
  background: linear-gradient(135deg, #4f7cff, #7c5cff);
  box-shadow: 0 4px 10px rgb(23 32 51 / 35%);
  color: #fff;
  font: 600 11px/40px ui-monospace, SFMono-Regular, Menlo, monospace;
  text-align: center;
  letter-spacing: 0.04em;
}
/* 同一段往返运动的两套实现：top/left 走主线程的布局+重绘，transform 走合成器。 */
.render-specimen__mover--layout {
  animation: render-specimen-move-layout 2.2s ease-in-out infinite alternate;
}
.render-specimen__mover--transform {
  animation: render-specimen-move-transform 2.2s ease-in-out infinite alternate;
}
@keyframes render-specimen-move-layout {
  from {
    top: 12px;
    left: 0;
  }
  to {
    top: 0;
    left: 240px;
  }
}
@keyframes render-specimen-move-transform {
  from {
    transform: translate(0, 12px);
  }
  to {
    transform: translate(240px, 0);
  }
}
.render-specimen__row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px dashed #b9c6e0;
  border-radius: 6px;
  background: rgb(255 255 255 / 85%);
}
.render-specimen__trigger {
  padding: 6px 14px;
  border: 1px solid #4f7cff;
  border-radius: 6px;
  background: #4f7cff;
  color: #fff;
  font: 600 13px ui-sans-serif, system-ui, sans-serif;
  cursor: pointer;
}
.render-specimen__trigger:disabled {
  opacity: 0.55;
  cursor: default;
}
.render-specimen__reset {
  padding: 6px 14px;
  border: 1px solid #94a7c4;
  border-radius: 6px;
  background: #fff;
  color: #334155;
  font: 600 13px ui-sans-serif, system-ui, sans-serif;
  cursor: pointer;
}
.render-specimen__state {
  font: 600 12px ui-monospace, SFMono-Regular, Menlo, monospace;
  color: #172033;
}
.render-specimen__status {
  margin: 8px 2px 0;
  min-height: 1em;
  font-size: 12px;
  color: #5d6f67;
}
.render-specimen__feed {
  display: grid;
  gap: 8px;
  margin-top: 10px;
  padding: 10px 12px;
  border: 1px dashed #b9c6e0;
  border-radius: 6px;
  background: rgb(255 255 255 / 85%);
}
.render-specimen__banner {
  padding: 8px 10px;
  border: 1px solid #b08cff;
  border-radius: 6px;
  background: linear-gradient(135deg, #efe7ff, #e2d6ff);
  color: #4a3d78;
  font-size: 12px;
}
.render-specimen__block {
  padding: 8px 10px;
  border: 1px solid #d5dfee;
  border-radius: 6px;
  background: #f4f7fb;
  color: #5d6f67;
  font-size: 12px;
}
.render-specimen__readout {
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
.render-specimen__readout dt {
  color: #5d6f67;
  white-space: nowrap;
}
.render-specimen__readout dd {
  margin: 0;
  color: #172033;
  text-align: right;
}
`;

export function createRenderSpecimen(
  root: HTMLElement,
): RenderInstance {
  root.classList.add('render-specimen');
  root.innerHTML = `
    <div class="render-specimen__main">
      <p class="render-specimen__hint">渲染负载标本：先打开 <b>Rendering</b> 抽屉（<code>Command+Shift+P</code> / <code>Control+Shift+P</code> 输入 rendering → Show Rendering）勾选 <b>Paint flashing</b>、<b>Layout Shift Regions</b> 与 <b>Frame rendering stats</b>，再回来操作。HUD 常驻整个视口右上角，不限于标本区；离屏或切走标签页时读数冻结属正常现象。</p>
      <div class="render-specimen__strip"><span class="render-specimen__mover render-specimen__mover--layout">top/left</span></div>
      <div class="render-specimen__row">
        <button type="button" class="render-specimen__trigger">插入一段内容</button>
        <button type="button" class="render-specimen__reset">重置标本</button>
        <span class="render-specimen__state">动画 <b class="render-specimen__state-animation"></b> · 插入 <b class="render-specimen__state-insertion"></b></span>
      </div>
      <p class="render-specimen__status">—</p>
      <div class="render-specimen__feed"></div>
    </div>
    <dl class="render-specimen__readout">
      <dt>FPS 估计</dt><dd class="render-specimen__cell-fps">—</dd>
      <dt>偏移事件</dt><dd class="render-specimen__cell-shifts">0 次 · 计入 0</dd>
      <dt>最近偏移分值</dt><dd class="render-specimen__cell-last">—</dd>
    </dl>
  `;

  const styleEl = document.createElement('style');
  styleEl.textContent = SPECIMEN_STYLES;
  root.append(styleEl);

  const mover = root.querySelector(
    '.render-specimen__mover',
  ) as HTMLElement;
  const trigger = root.querySelector(
    '.render-specimen__trigger',
  ) as HTMLButtonElement;
  const reset = root.querySelector(
    '.render-specimen__reset',
  ) as HTMLButtonElement;
  const stateAnimation = root.querySelector(
    '.render-specimen__state-animation',
  ) as HTMLElement;
  const stateInsertion = root.querySelector(
    '.render-specimen__state-insertion',
  ) as HTMLElement;
  const statusEl = root.querySelector(
    '.render-specimen__status',
  ) as HTMLElement;
  const feed = root.querySelector(
    '.render-specimen__feed',
  ) as HTMLElement;
  const cells = {
    fps: root.querySelector('.render-specimen__cell-fps') as HTMLElement,
    shifts: root.querySelector(
      '.render-specimen__cell-shifts',
    ) as HTMLElement,
    last: root.querySelector('.render-specimen__cell-last') as HTMLElement,
  };

  let animation: AnimationMode = 'layout';
  let insertion: InsertionMode = 'async';
  let bannerSeq = 0;
  let shiftTotal = 0;
  let shiftCounted = 0;
  let lastShift: LayoutShiftLike | undefined;
  let pendingTimer = 0;

  function paint(): void {
    stateAnimation.textContent = ANIMATION_LABELS[animation];
    stateInsertion.textContent = INSERTION_LABELS[insertion];
    cells.shifts.textContent = `${shiftTotal} 次 · 计入 ${shiftCounted}`;
    if (lastShift === undefined) {
      cells.last.textContent = '—';
    } else {
      cells.last.textContent = `${lastShift.value.toFixed(4)} · ${
        lastShift.hadRecentInput ? '不计入（hadRecentInput）' : '计入'
      }`;
    }
  }

  /* 切换 mover 的类名即切换动画实现：top/left 与 transform 两套关键帧共用一条运动轨迹。 */
  function applyAnimation(): void {
    mover.className =
      animation === 'layout'
        ? 'render-specimen__mover render-specimen__mover--layout'
        : 'render-specimen__mover render-specimen__mover--transform';
    mover.textContent = animation === 'layout' ? 'top/left' : 'transform';
  }

  function buildFeed(): void {
    feed.replaceChildren();
    const notes = [
      '页面原有内容 #1 —— 被插入的横幅挤下去时，就是一次布局偏移',
      '页面原有内容 #2',
    ];
    notes.forEach((text) => {
      const block = document.createElement('div');
      block.className = 'render-specimen__block';
      block.textContent = text;
      feed.append(block);
    });
  }

  /* 偏移实测：PerformanceObserver 读出每次 layout-shift 的分值与 hadRecentInput。
     不用 buffered:true——标本只统计自己创建之后的偏移，避免把 Storybook 装配期的
     无关偏移算进读数。 */
  const shiftObserver = new PerformanceObserver((list) => {
    const entries = list.getEntries() as unknown as LayoutShiftLike[];
    for (const entry of entries) {
      shiftTotal += 1;
      if (!entry.hadRecentInput) {
        shiftCounted += 1;
      }
      lastShift = entry;
    }
    paint();
  });
  shiftObserver.observe({ type: 'layout-shift', buffered: false });

  /* 插入一条没有预留高度的横幅：插入与移除都会挤动下方内容，制造真实的布局偏移。 */
  function insertBanner(): void {
    bannerSeq += 1;
    const banner = document.createElement('div');
    banner.className = 'render-specimen__banner';
    banner.textContent = `网络内容 #${bannerSeq} · 没有预留高度的横幅，插入时把下方内容挤开`;
    feed.prepend(banner);
    while (feed.children.length > MAX_BANNERS + INITIAL_BLOCK_COUNT) {
      feed.lastElementChild?.remove();
    }
  }

  function onTriggerClick(): void {
    if (pendingTimer !== 0) {
      return;
    }
    if (insertion === 'sync') {
      /* 立即插入：偏移与点击同帧发生，落在输入后 500ms 窗口内，
         条目带 hadRecentInput=true，CLS 不计入——但紫色照样闪。 */
      statusEl.textContent = '已插入：偏移发生在点击同帧（输入窗口内）';
      insertBanner();
      return;
    }
    /* 异步插入：模拟网络返回，延迟大于 500ms 输入窗口，
       偏移脱离输入，条目计入。 */
    statusEl.textContent = '加载中…（模拟网络返回）';
    trigger.disabled = true;
    pendingTimer = window.setTimeout(() => {
      pendingTimer = 0;
      trigger.disabled = false;
      statusEl.textContent = '网络返回，横幅插入（已脱离 500ms 输入窗口）';
      insertBanner();
    }, INSERT_DELAY_MS);
  }

  function onResetClick(): void {
    if (pendingTimer !== 0) {
      window.clearTimeout(pendingTimer);
      pendingTimer = 0;
    }
    trigger.disabled = false;
    buildFeed();
    shiftTotal = 0;
    shiftCounted = 0;
    lastShift = undefined;
    statusEl.textContent = '已重置：内容清空，偏移读数归零';
    paint();
  }

  trigger.addEventListener('click', onTriggerClick);
  reset.addEventListener('click', onResetClick);

  /* FPS 估计：近 FPS_WINDOW 帧 rAF 间隔的均值。循环在离屏或标签页隐藏时自动暂停，
     readout 冻结属正常现象。 */
  const frameDeltas: number[] = [];
  let lastFpsPaint = 0;
  const renderLoop = createRenderLoop(root, (delta: number) => {
    if (delta <= 0) {
      return;
    }
    frameDeltas.push(delta * 1000);
    if (frameDeltas.length > FPS_WINDOW) {
      frameDeltas.shift();
    }
    const now = performance.now();
    if (now - lastFpsPaint >= FPS_PAINT_INTERVAL) {
      lastFpsPaint = now;
      const average =
        frameDeltas.reduce((sum, ms) => sum + ms, 0) / frameDeltas.length;
      cells.fps.textContent = `${Math.round(1000 / average)}`;
    }
  });

  buildFeed();
  applyAnimation();
  paint();

  return {
    update(options) {
      animation = options.animation;
      insertion = options.insertion;
      applyAnimation();
      paint();
    },
    dispose() {
      trigger.removeEventListener('click', onTriggerClick);
      reset.removeEventListener('click', onResetClick);
      if (pendingTimer !== 0) {
        window.clearTimeout(pendingTimer);
        pendingTimer = 0;
      }
      shiftObserver.disconnect();
      renderLoop.dispose();
    },
  };
}
