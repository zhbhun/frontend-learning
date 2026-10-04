/**
 * 范例介绍：「动画标本」——同一段从左到右的滑行用四种实现播放，供 Animations
 *   面板捕获对照。
 * 输入与前置：无网络依赖。Controls 选择动画类型（CSS transition / CSS
 *   animation / Web Animations API / JS 驱动 rAF）、时长与缓动曲线，作用于
 *   下一次「播放」。
 * 主要操作：点标本内的「播放」触发一轮滑行；读者在 DevTools 的 Animations
 *   面板里慢放（25% / 10%）、Replay、拖动红色播放线，或在 Details 里拖拽
 *   时序；缓动在 Elements > Styles 的 Easing Editor 里调。
 * 预期结果：readout 显示 playState 状态、墙钟实测耗时、结束时的
 *   Animation.currentTime 与页面 Animation 对象数
 *   （document.getAnimations().length）。前三种实现经过浏览器动画模型：
 *   对象数 1，面板能捕获；rAF 每帧自算 transform，不产生 Animation 对象：
 *   对象数 0，面板捕获不到——捕获边界的现场证据。
 * 阅读主线：play() 按 animationKind 分派四种实现 → 单个 rAF 循环：rAF 模式下
 *   它就是动画本体，其余模式轮询 Animation 对象把真实状态同步到 readout →
 *   end 事件或进度走满后定格读数。
 */

export type AnimationKind = 'transition' | 'keyframes' | 'waapi' | 'raf';

export interface AnimationSpecimenOptions {
  /** 动画实现：前三种走浏览器动画模型，raf 每帧自算。 */
  animationKind: AnimationKind;
  /** 下一次播放的时长（毫秒）。 */
  durationMs: number;
  /** 下一次播放的缓动函数（CSS easing 值）。 */
  easing: string;
}

export interface AnimationSpecimenInstance {
  update(options: AnimationSpecimenOptions): void;
  dispose(): void;
}

const KIND_LABELS: Record<AnimationKind, string> = {
  transition: 'CSS transition',
  keyframes: 'CSS animation',
  waapi: 'Web Animations API',
  raf: 'JS 驱动（rAF）',
};

/** Animation.playState 的中文判读。 */
const PLAY_STATE_LABELS: Record<string, string> = {
  idle: '未启动',
  pending: '待启动',
  running: '播放中',
  paused: '已暂停',
  finished: '已结束',
};

/** 轨道两端各留这段距离，球从左缘滑到右缘。 */
const TRACK_PADDING = 8;

const SPECIMEN_STYLES = `
.anim-specimen {
  margin: 0 auto;
  padding: 14px;
  border: 1px solid #dbe3f0;
  border-radius: 8px;
  background: #f4f7fc;
  color: #334155;
  font: 13px/1.6 ui-sans-serif, system-ui, sans-serif;
}
.anim-specimen__body {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
}
.anim-specimen__main {
  flex: 1 1 320px;
  min-width: 0;
  display: grid;
  gap: 10px;
  align-content: start;
}
.anim-specimen__title {
  margin: 0;
  font-weight: 700;
  color: #172033;
}
.anim-specimen__track {
  position: relative;
  height: 64px;
  border: 1px solid #dbe3f0;
  border-radius: 8px;
  background: linear-gradient(90deg, #f6f8fb, #e8eefb);
  overflow: hidden;
}
.anim-specimen__ball {
  position: absolute;
  top: 12px;
  left: 8px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, #7ea2ff, #4f7cff);
  will-change: transform;
}
/* CSS animation 模式用的关键帧：终点走自定义属性，播放时按轨道实测宽度写入。 */
@keyframes specimen-travel {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(var(--specimen-travel-x, 240px));
  }
}
.anim-specimen__bar {
  display: flex;
  align-items: center;
  gap: 10px;
}
.anim-specimen__play {
  padding: 4px 16px;
  border: 1px solid #b9c6e0;
  border-radius: 6px;
  background: #f6f8fb;
  color: #334155;
  font: 12px ui-sans-serif, system-ui, sans-serif;
  cursor: pointer;
}
.anim-specimen__kind {
  font: 12px ui-monospace, SFMono-Regular, Menlo, monospace;
  color: #5d6f8a;
}
.anim-specimen__hint {
  margin: 10px 0 0;
  color: #5d6f67;
  font-size: 12px;
}
.anim-specimen__hint code {
  padding: 0 3px;
  border-radius: 3px;
  background: #dbe3f0;
  font: 12px ui-monospace, SFMono-Regular, Menlo, monospace;
}
.anim-specimen__readout {
  flex: 1 1 280px;
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
.anim-specimen__readout dt {
  color: #5d6f67;
  white-space: nowrap;
}
.anim-specimen__readout dd {
  margin: 0;
  color: #172033;
  text-align: right;
  word-break: break-all;
}
`;

/** rAF 模式的缓动求值：与 CSS 同名曲线保持同一手感。 */
function easeValue(progress: number, easing: string): number {
  if (easing === 'linear') {
    return progress;
  }
  const presets: Record<string, [number, number, number, number]> = {
    ease: [0.25, 0.1, 0.25, 1],
    'ease-in': [0.42, 0, 1, 1],
    'ease-out': [0, 0, 0.58, 1],
    'ease-in-out': [0.42, 0, 0.58, 1],
  };
  const preset = presets[easing];
  if (preset) {
    return cubicBezier(progress, ...preset);
  }
  const custom = easing.match(/cubic-bezier\(([^)]+)\)/);
  if (custom) {
    const points = custom[1].split(',').map((part) => Number(part.trim()));
    if (points.length === 4 && points.every((n) => Number.isFinite(n))) {
      return cubicBezier(progress, points[0], points[1], points[2], points[3]);
    }
  }
  return progress;
}

/** 标准 cubic-bezier(x1,y1,x2,y2)：二分求 x(t)=progress，再取 y(t)。 */
function cubicBezier(
  progress: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  if (progress <= 0) {
    return 0;
  }
  if (progress >= 1) {
    return 1;
  }
  let low = 0;
  let high = 1;
  let t = progress;
  for (let i = 0; i < 24; i += 1) {
    const x = bezierAxis(t, x1, x2);
    if (Math.abs(x - progress) < 0.0001) {
      break;
    }
    if (x < progress) {
      low = t;
    } else {
      high = t;
    }
    t = (low + high) / 2;
  }
  return bezierAxis(t, y1, y2);
}

function bezierAxis(t: number, a: number, b: number): number {
  const u = 1 - t;
  return 3 * u * u * t * a + 3 * u * t * t * b + t * t * t;
}

export function createAnimationSpecimen(
  root: HTMLElement,
): AnimationSpecimenInstance {
  root.classList.add('anim-specimen');
  root.innerHTML = `
    <div class="anim-specimen__body">
      <div class="anim-specimen__main">
        <p class="anim-specimen__title">动画标本 · 同一段滑行，四种实现</p>
        <div class="anim-specimen__track">
          <div class="anim-specimen__ball"></div>
        </div>
        <div class="anim-specimen__bar">
          <button class="anim-specimen__play" type="button">播放</button>
          <span class="anim-specimen__kind" data-cell="kind">CSS transition</span>
        </div>
        <p class="anim-specimen__hint">
          先在 DevTools 打开 Animations 面板（<code>⋮ → More tools → Animations</code>，
          或 Command Menu 搜 Show Animations），再点「播放」。速度档、Replay、
          Details 拖拽都在面板里练；「JS 驱动（rAF）」实现不经过浏览器动画模型，
          用来对照捕获边界。
        </p>
      </div>
      <dl class="anim-specimen__readout">
        <dt>状态</dt><dd data-cell="state">待播放</dd>
        <dt>实测耗时（墙钟）</dt><dd data-cell="wall">—</dd>
        <dt>Animation.currentTime</dt><dd data-cell="current">—</dd>
        <dt>页面 Animation 对象数</dt><dd data-cell="count">—</dd>
      </dl>
    </div>
  `;

  const styleEl = document.createElement('style');
  styleEl.textContent = SPECIMEN_STYLES;
  root.append(styleEl);

  const ball = root.querySelector('.anim-specimen__ball') as HTMLElement;
  const track = root.querySelector('.anim-specimen__track') as HTMLElement;
  const playButton = root.querySelector('.anim-specimen__play') as HTMLElement;
  const kindLabel = root.querySelector('[data-cell="kind"]') as HTMLElement;
  const cells = {
    state: root.querySelector('[data-cell="state"]') as HTMLElement,
    wall: root.querySelector('[data-cell="wall"]') as HTMLElement,
    current: root.querySelector('[data-cell="current"]') as HTMLElement,
    count: root.querySelector('[data-cell="count"]') as HTMLElement,
  };

  let settings: AnimationSpecimenOptions = {
    animationKind: 'transition',
    durationMs: 1200,
    easing: 'ease-in-out',
  };
  let state: 'idle' | 'running' | 'finished' = 'idle';
  let loopId = 0;
  let startTime = 0;
  let travel = 0;
  /** 播放期间最后一次见到的 Animation 对象：结束时据此定格 currentTime。 */
  let observed: Animation | null = null;
  let waapi: Animation | null = null;
  let endListenerRemovers: Array<() => void> = [];

  function setText(cell: HTMLElement, text: string): void {
    if (cell.textContent !== text) {
      cell.textContent = text;
    }
  }

  /** 记录一次性的结束监听，reset 时统一摘除，避免跨轮误触发。 */
  function listenOnce(
    target: EventTarget,
    type: string,
    handler: () => void,
  ): void {
    const wrapped = (): void => handler();
    const remove = (): void => target.removeEventListener(type, wrapped);
    endListenerRemovers.push(remove);
    target.addEventListener(type, wrapped, { once: true });
  }

  function clearEndListeners(): void {
    for (const remove of endListenerRemovers) {
      remove();
    }
    endListenerRemovers = [];
  }

  function finish(wallMs: number): void {
    state = 'finished';
    if (loopId) {
      cancelAnimationFrame(loopId);
      loopId = 0;
    }
    setText(
      cells.state,
      settings.animationKind === 'raf' ? 'finished（自算）' : 'finished（已结束）',
    );
    setText(
      cells.wall,
      `${Math.round(wallMs)} ms（设定 ${Math.round(settings.durationMs)} ms）`,
    );
    const currentTime = observed?.currentTime;
    const ms = typeof currentTime === 'number' ? currentTime : null;
    setText(
      cells.current,
      ms == null ? '—（无 Animation 对象）' : `${Math.round(ms)} ms（动画时间轴）`,
    );
    // 「页面 Animation 对象数」保留播放期间的最后采样，结束后不再刷新。
  }

  function onEnded(): void {
    if (state !== 'running') {
      return; // 已定格（如面板 Replay 触发的重放）不重复计量
    }
    finish(performance.now() - startTime);
  }

  /** 播放期间的读数循环：rAF 模式下它就是动画本体，其余模式只轮询动画模型。 */
  function step(): void {
    const wallMs = performance.now() - startTime;

    if (settings.animationKind === 'raf') {
      const progress = Math.min(1, wallMs / settings.durationMs);
      const eased = easeValue(progress, settings.easing);
      ball.style.transform = `translateX(${(eased * travel).toFixed(1)}px)`;
      if (progress >= 1) {
        finish(wallMs);
        return;
      }
      setText(cells.state, 'running（自算）');
      setText(cells.wall, `进行中 ${Math.round(wallMs)} ms`);
      setText(cells.current, '—（无 Animation 对象）');
      setText(cells.count, '0');
      loopId = requestAnimationFrame(step);
      return;
    }

    const anim = ball.getAnimations()[0] ?? null;
    if (anim) {
      observed = anim;
      setText(
        cells.state,
        `${anim.playState}（${PLAY_STATE_LABELS[anim.playState] ?? anim.playState}）`,
      );
      const currentTime = anim.currentTime;
      setText(
        cells.current,
        typeof currentTime === 'number' ? `${Math.round(currentTime)} ms` : '—',
      );
    }
    setText(cells.wall, `进行中 ${Math.round(wallMs)} ms`);
    setText(cells.count, String(document.getAnimations().length));
    loopId = requestAnimationFrame(step);
  }

  function resetToIdle(): void {
    if (loopId) {
      cancelAnimationFrame(loopId);
      loopId = 0;
    }
    clearEndListeners();
    if (waapi) {
      waapi.cancel();
      waapi = null;
    }
    ball.style.transition = 'none';
    ball.style.animation = 'none';
    void ball.offsetWidth; // 强制重排，确保下一轮从起点出发
    ball.style.transition = '';
    ball.style.animation = '';
    ball.style.transform = 'translateX(0)';
    observed = null;
    state = 'idle';
    setText(cells.state, '待播放');
    setText(cells.wall, '—');
    setText(cells.current, '—');
    setText(cells.count, '—');
  }

  function play(): void {
    resetToIdle();
    state = 'running';
    startTime = performance.now();
    travel = Math.max(
      0,
      track.clientWidth - ball.offsetWidth - TRACK_PADDING * 2,
    );

    if (settings.animationKind === 'transition') {
      ball.style.transition = 'none';
      ball.style.transform = 'translateX(0)';
      void ball.offsetWidth; // 起点先生效，transition 才从起点出发
      ball.style.transition = `transform ${settings.durationMs}ms ${settings.easing}`;
      ball.style.transform = `translateX(${travel}px)`;
      listenOnce(ball, 'transitionend', onEnded);
    } else if (settings.animationKind === 'keyframes') {
      ball.style.animation = 'none';
      void ball.offsetWidth;
      ball.style.setProperty('--specimen-travel-x', `${travel}px`);
      ball.style.animation = `specimen-travel ${settings.durationMs}ms ${settings.easing} forwards`;
      listenOnce(ball, 'animationend', onEnded);
    } else if (settings.animationKind === 'waapi') {
      waapi = ball.animate(
        [{ transform: 'translateX(0)' }, { transform: `translateX(${travel}px)` }],
        { duration: settings.durationMs, easing: settings.easing, fill: 'forwards' },
      );
      listenOnce(waapi, 'finish', onEnded);
    }

    loopId = requestAnimationFrame(step);
  }

  playButton.addEventListener('click', play);

  return {
    update(options) {
      settings = options;
      setText(kindLabel, KIND_LABELS[options.animationKind]);
      resetToIdle();
    },
    dispose() {
      resetToIdle();
      playButton.removeEventListener('click', play);
    },
  };
}
