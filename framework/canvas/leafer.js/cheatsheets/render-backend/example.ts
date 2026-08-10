/**
 * 范例：渲染后端与渲染循环。
 *
 * 演示内容：Leafer 在浏览器中固定使用 Canvas 2D 后端；渲染按需触发（节点不变即不出帧）；
 *           maxFPS 给连续变化场景的出帧率封顶；usePartRender 切换「只重绘变化区域 / 全量重绘」。
 *
 * 输入 / 前置：canvasStory 传入一个已挂载的 <canvas>，直接作为 Leafer 的 view。
 *
 * 主要操作：
 *   1) new Leafer({ view: canvas, width, height, fill, maxFPS, usePartRender }) 建立场景：
 *      一个持续旋转的指示器（用来不断制造数据变化）+ 一个静态描边底框（衬托局部渲染只更新局部）。
 *   2) 用一个独立的 requestAnimationFrame 循环改变 spinner.rotation，每次赋值都会触发 Leafer 的按需渲染。
 *   3) update(options) 把 maxFPS / usePartRender 写入 leafer.config（与 leafer.renderer.config 同一引用，立即生效），
 *      并按 continuous 决定是否继续驱动变化。
 *   4) 定时轮询 leafer.renderer 的状态字段，emit 给 readout 展示后端类型、实测帧率与累计帧数。
 *
 * 预期结果：
 *   - 调小 maxFPS → 旋转变顿、实测 FPS 跟随下降、累计帧数增长变慢。
 *   - 关闭「持续触发渲染」→ 没有数据变化，累计帧数很快停止增长（按需渲染的直接证据）。
 *   - 切换「局部渲染」→ 首帧后重绘策略在「仅变化区域 / 全量」之间切换。
 *
 * 阅读主线：createRenderBackend 建立后端与场景 → 驱动循环与读数轮询 → update 适配输入 → dispose 回收。
 */
import { Leafer, Group, Rect, Text } from 'leafer-ui';
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export interface RenderBackendOptions {
  maxFPS: number;
  usePartRender: boolean;
  continuous: boolean;
}

export interface RenderBackendSnapshot {
  backend: string;
  maxFPS: number;
  fps: number;
  totalTimes: number;
  partRender: boolean;
  state: string;
}

export interface RenderBackendInstance {
  update(options: RenderBackendOptions): void;
  dispose(): void;
}

const SPINNER_BOX = 160;
const ORBIT_RADIUS = 52;
const DOT_SIZE = 18;
const HUB_SIZE = 16;
const FRAME_INSET = 16;

export function createRenderBackend(
  canvas: HTMLCanvasElement,
  emit: (snapshot: RenderBackendSnapshot) => void,
): RenderBackendInstance {
  const initial = readCanvasSize(canvas);

  const leafer = new Leafer({
    view: canvas,
    width: initial.width,
    height: initial.height,
    fill: '#f8fafc',
    // demo 以 60 作为观察基线；库默认值见 README 参考表（源码 120，受显示器刷新率约束）。
    maxFPS: 60,
    usePartRender: true,
  });

  // 静态描边底框：本身从不变化，只在首帧 / resize 时进入全量重绘，
  // 用来衬托 usePartRender 开启时每帧只需重绘 spinner 所在的局部区域。
  const frame = new Rect({
    x: FRAME_INSET,
    y: FRAME_INSET,
    width: Math.max(0, initial.width - FRAME_INSET * 2),
    height: Math.max(0, initial.height - FRAME_INSET * 2),
    cornerRadius: 12,
    stroke: '#e2e8f0',
    strokeWidth: 1,
  });
  leafer.add(frame);

  const label = new Text({
    text: 'Canvas 2D · 按需渲染',
    x: initial.width / 2,
    y: 30,
    fontSize: 16,
    fontWeight: 600,
    fill: '#172033',
    around: 'top',
  });
  leafer.add(label);

  // 旋转指示器：持续改变它的 rotation，就是持续触发 Leafer 按需渲染的最小来源。
  // around: 'center' 让旋转以自身中心为原点，配合 x/y = 画布中心即可原地旋转。
  const spinner = new Group({
    x: initial.width / 2,
    y: initial.height / 2,
    width: SPINNER_BOX,
    height: SPINNER_BOX,
    around: 'center',
  });

  const center = SPINNER_BOX / 2;

  spinner.add(
    new Rect({
      x: center - 60,
      y: center - 60,
      width: 120,
      height: 120,
      cornerRadius: 60,
      stroke: '#dbe3f0',
      strokeWidth: 2,
    }),
  );

  spinner.add(
    new Rect({
      x: center - HUB_SIZE / 2,
      y: center - HUB_SIZE / 2,
      width: HUB_SIZE,
      height: HUB_SIZE,
      cornerRadius: HUB_SIZE / 2,
      fill: '#4f7cff',
    }),
  );

  const dotColors = ['#4f7cff', '#22c55e', '#f59e0b'];
  for (let i = 0; i < 3; i++) {
    const angle = (i * 2 * Math.PI) / 3;
    spinner.add(
      new Rect({
        x: center + ORBIT_RADIUS * Math.cos(angle) - DOT_SIZE / 2,
        y: center + ORBIT_RADIUS * Math.sin(angle) - DOT_SIZE / 2,
        width: DOT_SIZE,
        height: DOT_SIZE,
        cornerRadius: DOT_SIZE / 2,
        fill: dotColors[i],
      }),
    );
  }
  leafer.add(spinner);

  // 持续触发渲染的驱动循环：每帧给节点写一个新值，Leafer 的 watcher 会自动请求一帧按需渲染。
  // 出帧节奏由 Leafer 自己按 maxFPS 约束，与本循环的 60fps 请求无关。
  let driving = false;
  let rafId = 0;
  let lastTime = 0;

  function tick(time: number) {
    if (!driving) return;
    const dt = lastTime ? (time - lastTime) / 1000 : 0;
    lastTime = time;
    const current = spinner.rotation ?? 0;
    spinner.rotation = (current + dt * 90) % 360;
    rafId = requestAnimationFrame(tick);
  }

  function setDriving(value: boolean) {
    if (value === driving) return;
    driving = value;
    if (value) {
      lastTime = 0;
      rafId = requestAnimationFrame(tick);
    } else {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
  }

  // 读数轮询：独立于 Leafer 的渲染节奏，按固定间隔上报后端类型与渲染状态。
  // FPS / totalTimes 都直接读自 leafer.renderer，避免在正文里暴露实现内部变量。
  const poll = window.setInterval(() => {
    const renderer = leafer.renderer;
    const context = leafer.canvas && leafer.canvas.context;
    const backend =
      context && typeof (context as { arc?: unknown }).arc === 'function'
        ? 'Canvas 2D'
        : '未知';

    let state: string;
    if (!renderer.running) {
      state = '已停止';
    } else if (renderer.rendering) {
      state = '渲染中';
    } else if (renderer.changed) {
      state = '等待帧';
    } else {
      state = '空闲';
    }

    emit({
      backend,
      maxFPS: renderer.config.maxFPS as number,
      fps: renderer.FPS,
      totalTimes: renderer.totalTimes,
      partRender: Boolean(renderer.config.usePartRender),
      state,
    });
  }, 200);

  // 尺寸同步：容器变化时重排场景中心，并通知 Leafer 重算画布与触发一次渲染。
  function applySize() {
    const { width, height } = readCanvasSize(canvas);
    leafer.resize({ width, height });
    frame.width = Math.max(0, width - FRAME_INSET * 2);
    frame.height = Math.max(0, height - FRAME_INSET * 2);
    label.x = width / 2;
    spinner.x = width / 2;
    spinner.y = height / 2;
  }

  const resizeObserver = createResizeObserver(canvas, applySize);

  return {
    update(options) {
      // leafer.config 与 leafer.renderer.config 是同一对象引用，运行时改写立即生效。
      leafer.config.maxFPS = options.maxFPS;
      leafer.config.usePartRender = options.usePartRender;
      setDriving(options.continuous);
    },
    dispose() {
      setDriving(false);
      window.clearInterval(poll);
      resizeObserver.disconnect();
      leafer.destroy();
    },
  };
}
