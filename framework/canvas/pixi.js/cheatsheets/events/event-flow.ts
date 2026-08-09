/**
 * 范例介绍：演示命中测试如何决定事件目标，以及事件沿父子链冒泡的完整流程。
 *
 * 场景：一个静态「父容器」面板，里面有两个部分重叠的子节点「A（圆，在上）」和
 * 「B（矩形）」。指针实时跟随一个小圆点。
 * 输入：
 *   - stopPropagation：子节点收到 pointerdown 时是否调用 e.stopPropagation()。
 *   - interactiveChildren：父容器是否允许子节点参与命中测试。
 * 主要操作：移动指针看坐标；在 A / B / 重叠区 / 空白区按下。
 *
 * 预期结果（读数「谁收到事件」按触发顺序列出）：
 *   - 命中 A：[A, 父容器]；开启 stopPropagation 后只剩 [A]（不再冒泡到父）。
 *   - 命中 B：[B, 父容器]；stopPropagation 同理。
 *   - 命中空白：[父容器]。
 *   - 关闭 interactiveChildren：即使指针在子节点上，也只命中父容器。
 *
 * 阅读主线：先看 parent / childA / childB 的 eventMode 与 pointerdown 监听里的
 * record()，再看 stopPropagation 与 interactiveChildren 控件如何改变命中与冒泡，
 * 最后看 trackPointer 如何用 app.renderer.events.pointer 拿到世界坐标。
 */
import { Application, Container, Graphics, Text } from 'pixi.js';
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export interface EventFlowArgs {
  stopPropagation: boolean;
  interactiveChildren: boolean;
}

export interface EventFlowSnapshot {
  received: string;
  pointer: string;
}

export interface EventFlowInstance {
  update(args: EventFlowArgs): void;
  dispose(): void;
}

const MONO = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: 12,
} as const;

const CHILD_R = 40;
const CHILD_W = 120;
const CHILD_H = 80;

export function createEventFlowDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: EventFlowSnapshot) => void,
): EventFlowInstance {
  const app = new Application();
  let disposed = false;
  let destroyed = false;
  let ready = false;
  let current: EventFlowArgs = {
    stopPropagation: false,
    interactiveChildren: true,
  };

  // 本次按下里已触发的节点名（按冒泡顺序）；用事件实例判断「新一轮按下」。
  let received: string[] = [];
  let lastEvent: unknown = null;
  let emitScheduled = false;
  let pointerText = '—';

  // 父容器：静态面板，子节点的共同祖先，事件会冒泡到这里。
  const parent = new Container();
  parent.name = '父容器';
  parent.eventMode = 'static';

  const panel = new Graphics(); // 父容器的可见背景
  parent.addChild(panel);

  // 子节点 A：圆，加在 B 之后 → 重叠区里 A 在更上层，命中优先。
  const childA = new Graphics();
  childA.name = 'A';
  childA.eventMode = 'static';
  childA.circle(0, 0, CHILD_R).fill({ color: 0x4f7cff, alpha: 0.9 });
  childA.circle(0, 0, CHILD_R).stroke({ color: 0xe2e8f0, width: 2 });

  // 子节点 B：矩形
  const childB = new Graphics();
  childB.name = 'B';
  childB.eventMode = 'static';
  childB.roundRect(-CHILD_W / 2, -CHILD_H / 2, CHILD_W, CHILD_H, 10).fill({
    color: 0xf59e0b,
    alpha: 0.9,
  });
  childB
    .roundRect(-CHILD_W / 2, -CHILD_H / 2, CHILD_W, CHILD_H, 10)
    .stroke({ color: 0xe2e8f0, width: 2 });

  // 跟随指针的小圆点
  const cursor = new Graphics();
  cursor.circle(0, 0, 5).fill({ color: 0xffffff, alpha: 0.9 });

  const hint = new Text({
    text: '在 A / B / 重叠区 / 空白处按下，观察「谁收到事件」',
    style: { ...MONO, fill: 0x94a3b8, fontSize: 11 },
  });
  hint.anchor.set(0.5, 1);

  function layout() {
    const w = app.screen.width;
    const h = app.screen.height;
    panel.clear();
    panel.roundRect(0, 0, w, h, 16).fill({ color: 0x1e293b });

    const cy = h * 0.45;
    // 让 A 与 B 水平方向部分重叠
    childA.position.set(w * 0.46, cy);
    childB.position.set(w * 0.58, cy);
    hint.position.set(w / 2, h - 14);
  }

  // 记录冒泡路径上的每个节点：同一事件实例的首次 record 开启新一轮记录。
  function record(name: string, e: unknown) {
    if (e !== lastEvent) {
      received = [];
      lastEvent = e;
    }
    received.push(name);
    scheduleEmit();
  }

  function scheduleEmit() {
    if (emitScheduled) {
      return;
    }
    emitScheduled = true;
    // 派发是同步的：等当前冒泡链跑完，再统一上报完整路径。
    setTimeout(() => {
      emitScheduled = false;
      emit({
        received: received.length ? received.join(' → ') : '（无）',
        pointer: pointerText,
      });
    }, 0);
  }

  childA.on('pointerdown', (e) => {
    if (current.stopPropagation) {
      // 阻止事件继续冒泡到父容器（父的处理函数不再触发）
      e.stopPropagation();
    }
    record('A', e);
  });
  childB.on('pointerdown', (e) => {
    if (current.stopPropagation) {
      e.stopPropagation();
    }
    record('B', e);
  });
  parent.on('pointerdown', (e) => {
    record('父容器', e);
  });

  // 指针跟踪走 events.pointer（EventSystem 维护的最近指针状态），
  // 由 ticker 逐帧读取世界坐标，不依赖某个对象被命中。
  function trackPointer() {
    const pointer = app.renderer.events.pointer;
    cursor.position.copyFrom(pointer.global);
    pointerText = `${Math.round(pointer.global.x)}, ${Math.round(pointer.global.y)}`;
    // 实时把坐标推给读数（canvasStory 会节流）；保留上次的冒泡路径文本。
    emit({
      received: received.length ? received.join(' → ') : '（尚未按下）',
      pointer: pointerText,
    });
  }

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
    // 顺序：父容器在底，B 次之，A 最上（重叠区 A 优先命中）
    parent.addChild(childB, childA);
    app.stage.addChild(parent, cursor, hint);
    layout();

    // 每帧用 EventSystem 的最近指针状态更新光标点与坐标读数。
    app.ticker.add(trackPointer);

    applyArgs(current);
    emit({ received: '（尚未按下）', pointer: pointerText });
  });

  function applyArgs(args: EventFlowArgs) {
    current = args;
    // 关闭后，命中测试跳过父容器的全部子节点 → 指针落在子节点上也只命中父容器。
    parent.interactiveChildren = args.interactiveChildren;
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
