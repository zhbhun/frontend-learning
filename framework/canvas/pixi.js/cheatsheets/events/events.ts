/**
 * 范例介绍：演示 eventMode 如何决定一个显示对象能否被命中、能否发出事件。
 *
 * 场景：铺满画布的静态「背景」之上放一个「目标」圆形。
 * 输入：目标 eventMode（none / passive / auto / static / dynamic）。
 * 主要操作：在画布上按下指针。
 *
 * 预期结果：
 *   - static / dynamic：目标命中，读数显示「目标」，圆形短暂变绿放大。
 *   - passive / auto / none：目标自身不参与命中也不发事件，事件穿透到静态背景，
 *     读数显示「背景（穿透）」。auto 即使父级可交互也不在此目标上发事件。
 *
 * 阅读主线：先看 background 与 target 的 eventMode 和 pointerdown 监听，
 * 再看 applyArgs 如何在运行时切换 target.eventMode（下次命中测试即生效），
 * 最后看 dispose 的资源释放与离屏暂停。
 */
import { Application, Graphics, Text } from 'pixi.js';
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type EventModeValue = 'none' | 'passive' | 'auto' | 'static' | 'dynamic';

export interface EventModeArgs {
  eventMode: EventModeValue;
}

export interface EventModeSnapshot {
  lastHit: string;
  eventMode: string;
}

export interface EventModeInstance {
  update(args: EventModeArgs): void;
  dispose(): void;
}

const MONO = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: 12,
} as const;

const TARGET_RADIUS = 44;

export function createEventModeDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: EventModeSnapshot) => void,
): EventModeInstance {
  const app = new Application();
  let disposed = false;
  let destroyed = false;
  let ready = false;
  let current: EventModeArgs = { eventMode: 'static' };
  let lastHit = '（尚未按下）';
  // 命中高亮衰减值：1 最强，线性衰减到 0
  let highlight = 0;
  // 标记需要重绘目标（eventMode 变更、布局变化或命中后）
  let dirty = true;

  // 背景：静态面板，承接穿透目标的事件。命中测试基于它绘制的几何包围盒。
  const background = new Graphics();
  background.name = '背景';
  background.eventMode = 'static';

  // 目标：位于背景之上的圆形，eventMode 由控件切换。
  const target = new Graphics();
  target.name = '目标';
  target.eventMode = 'static';

  const label = new Text({ text: '', style: { ...MONO, fill: 0xe2e8f0 } });
  label.anchor.set(0.5, 1);

  function drawTarget() {
    const color = highlight > 0 ? 0x22c55e : 0x4f7cff;
    const scale = 1 + highlight * 0.18;
    const r = TARGET_RADIUS * scale;
    target.clear();
    target.circle(0, 0, r).fill({ color });
    target.circle(0, 0, r).stroke({ color: 0xe2e8f0, width: 2 });
  }

  function layout() {
    const w = app.screen.width;
    const h = app.screen.height;
    background.clear();
    background.roundRect(0, 0, w, h, 16).fill({ color: 0x1e293b });
    target.position.set(w / 2, h / 2 - 12);
    label.position.set(w / 2, h - 16);
    dirty = true;
  }

  // 目标与背景是 stage 的兄弟节点：命中谁，谁的处理函数触发。
  // 目标命中时记录并高亮；目标不命中（passive / auto / none）时事件落到背景。
  target.on('pointerdown', () => {
    lastHit = '目标';
    highlight = 1;
    dirty = true;
    emit({ lastHit, eventMode: current.eventMode });
  });
  background.on('pointerdown', () => {
    lastHit = '背景（穿透）';
    emit({ lastHit, eventMode: current.eventMode });
  });

  const initial = readCanvasSize(canvas);
  const initPromise = app.init({
    canvas,
    width: Math.max(320, initial.width),
    height: Math.max(240, initial.height),
    antialias: true,
    backgroundAlpha: 0,
    preference: 'webgl',
  });

  initPromise.then(() => {
    if (disposed) {
      destroyAll();
      return;
    }
    ready = true;
    app.stage.addChild(background, target, label);
    layout();

    // 高亮期间逐帧衰减并重绘；无高亮时只在 dirty 时重绘一次。
    app.ticker.add((t) => {
      if (highlight > 0) {
        highlight = Math.max(0, highlight - t.deltaMS / 350);
        dirty = true;
      }
      if (dirty) {
        dirty = false;
        drawTarget();
      }
    });

    applyArgs(current);
    emit({ lastHit, eventMode: current.eventMode });
  });

  function applyArgs(args: EventModeArgs) {
    current = args;
    // 运行时直接改 eventMode：下一次命中测试会读取新值，无需重建对象。
    target.eventMode = args.eventMode;
    label.text = `目标 eventMode = '${args.eventMode}'`;
    // 切到不可命中模式时清掉残留高亮，避免视觉与读数不一致
    if (args.eventMode !== 'static' && args.eventMode !== 'dynamic') {
      highlight = 0;
      dirty = true;
    }
  }

  function destroyAll() {
    if (destroyed) {
      return;
    }
    destroyed = true;
    app.destroy(true, { children: true });
  }

  const resizeObserver = createResizeObserver(canvas, () => {
    if (!app.renderer) {
      return;
    }
    const size = readCanvasSize(canvas);
    app.renderer.resize(size.width, size.height);
    layout();
  });

  // 离屏时暂停渲染循环以省 GPU
  const visibilityObserver = new IntersectionObserver(
    (entries) => {
      if (!ready) {
        return;
      }
      const visible = entries.at(-1)?.isIntersecting ?? false;
      if (visible) {
        app.start();
      } else {
        app.stop();
      }
    },
    { rootMargin: '200px 0px' },
  );
  visibilityObserver.observe(canvas);

  return {
    update(args) {
      if (ready) {
        applyArgs(args);
      } else {
        current = args;
      }
    },
    dispose() {
      disposed = true;
      visibilityObserver.disconnect();
      resizeObserver.disconnect();
      if (app.renderer) {
        destroyAll();
      } else {
        initPromise.then(destroyAll);
      }
    },
  };
}
