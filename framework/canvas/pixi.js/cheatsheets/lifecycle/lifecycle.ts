/**
 * 范例介绍：演示 Container.destroy 的 children 选项如何决定释放范围。
 *   - children:true  → 递归销毁子级，子级 destroyed 标记变 true，GPU 资源随之释放。
 *   - children:false（默认）→ 子级只脱离父级，对象本身完整保留，成为等待 JS GC 的孤儿。
 *
 * 输入：children（boolean），销毁时是否递归销毁子级。每次切换都会销毁当前批次并重建。
 *
 * 主要操作：切换 children → destroy(batch, options) → 统计被销毁与孤儿子级 → 重建批次。
 *
 * 预期结果：
 *   - children:true  → 读数「子级已销毁」= 6/6，「孤儿子级」= 0。
 *   - children:false → 读数「子级已销毁」= 0/6，「孤儿子级」= 6。
 *
 * 阅读主线：先看 buildBatch 构造子级树，再看 destroyBatch 如何按选项销毁并统计证据，
 * 最后看 dispose 的 app.destroy（应用级完整清理）。
 */
import { Application, Container, Graphics, Text } from 'pixi.js';
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export interface LifecycleArgs {
  children: boolean;
}

export interface LifecycleSnapshot {
  childrenOption: string;
  childrenDestroyed: number;
  totalChildren: number;
  orphans: number;
}

export interface LifecycleInstance {
  update(args: LifecycleArgs): void;
  dispose(): void;
}

const CHILD_COUNT = 6;
const PALETTE = [0x4f7cff, 0x22c55e, 0xef4444, 0xffd54f, 0xa855f7, 0x14b8a6];
const RING_RADIUS = 110;

export function createLifecycle(
  canvas: HTMLCanvasElement,
  emit: (snapshot: LifecycleSnapshot) => void,
): LifecycleInstance {
  const app = new Application();

  let disposed = false;
  let ready = false;
  let current: LifecycleArgs = { children: true };

  // 常驻对象：旋转环与提示文字，证明 ticker 始终运行、与批次销毁无关。
  let halo: Graphics | null = null;
  let hint: Text | null = null;

  // 当前批次（会被销毁重建）；trackedChildren 保留子级引用，销毁后用来检查 destroyed 状态。
  let batch: Container | null = null;
  let trackedChildren: Graphics[] = [];

  // 上一轮销毁的证据
  let hasDestroyed = false;
  let lastChildrenOpt = true;
  let lastChildrenDestroyed = 0;
  let lastOrphans = 0;

  function layout() {
    const w = app.screen.width;
    const h = app.screen.height;
    if (halo) halo.position.set(w / 2, h / 2);
    if (hint) hint.position.set(w / 2, 34);
    trackedChildren.forEach((sq, i) => {
      const angle = (i / CHILD_COUNT) * Math.PI * 2 - Math.PI / 2;
      sq.position.set(
        w / 2 + Math.cos(angle) * RING_RADIUS,
        h / 2 + Math.sin(angle) * RING_RADIUS,
      );
    });
  }

  function makeSquare(index: number): Graphics {
    const g = new Graphics();
    g.rect(-18, -18, 36, 36).fill({ color: PALETTE[index % PALETTE.length] });
    return g;
  }

  function buildBatch() {
    batch = new Container();
    trackedChildren = [];
    for (let i = 0; i < CHILD_COUNT; i++) {
      const sq = makeSquare(i);
      batch.addChild(sq);
      trackedChildren.push(sq);
    }
    app.stage.addChild(batch);
    layout();
  }

  function destroyBatch(childrenOpt: boolean) {
    if (!batch) return;
    hasDestroyed = true;
    lastChildrenOpt = childrenOpt;
    // 关键机制：destroy 的 options 决定释放范围。
    //   children:true  → 递归 destroy，子级 destroyed=true，GPU 资源释放。
    //   false（默认）  → 仅 removeChildren + 自身清理；子级对象完整保留，脱离场景树成为孤儿，
    //                    JS 引用断开后等 JS GC，但 PixiJS 不会主动释放其 GPU 资源。
    const options = childrenOpt ? { children: true } : false;
    batch.destroy(options);
    lastChildrenDestroyed = trackedChildren.filter((c) => c.destroyed).length;
    lastOrphans = trackedChildren.filter((c) => !c.destroyed).length;
    batch = null;
    trackedChildren = [];
  }

  function syncHint() {
    if (!hint) return;
    if (!hasDestroyed) {
      hint.text = '切换「递归销毁子级」触发一次销毁并重建';
      return;
    }
    hint.text = lastChildrenOpt
      ? `children:true → ${lastChildrenDestroyed}/${CHILD_COUNT} 子级已销毁`
      : `children:false → ${lastOrphans} 个子级脱离树但未销毁（孤儿）`;
  }

  function emitSnapshot() {
    if (!ready) return;
    syncHint();
    emit({
      childrenOption: lastChildrenOpt ? 'true' : 'false',
      childrenDestroyed: lastChildrenDestroyed,
      totalChildren: CHILD_COUNT,
      orphans: lastOrphans,
    });
  }

  function applyArgs(args: LifecycleArgs) {
    const prev = current.children;
    current = args;
    if (!ready) return;
    // 切换即触发销毁 + 重建，用新的 children 值执行销毁。
    if (args.children !== prev) {
      destroyBatch(args.children);
      buildBatch();
    }
    emitSnapshot();
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

  initPromise
    .then(() => {
      // init 完成前就被销毁，直接清理。
      if (disposed) {
        app.destroy();
        return;
      }
      ready = true;

      halo = new Graphics()
        .circle(0, 0, 70)
        .stroke({ color: 0x334155, width: 2, alpha: 0.5 });
      app.stage.addChild(halo);

      hint = new Text({
        text: '切换「递归销毁子级」观察读数',
        style: {
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          fontSize: 12,
          fill: 0x94a3b8,
        },
      });
      hint.anchor.set(0.5, 0);
      app.stage.addChild(hint);

      buildBatch();

      // autoStart 默认 true，ticker 已开始；注册逐帧回调让画面动起来，证明循环始终运行。
      app.ticker.add(() => {
        if (halo) halo.rotation += 0.01;
        trackedChildren.forEach((sq) => {
          sq.rotation += 0.03;
        });
      });

      applyArgs(current);
    })
    .catch(() => {
      // 渲染器初始化失败（如缺少 WebGL 支持），画布保持空白。
    });

  // 离屏时暂停渲染循环以省 GPU。
  const visibilityObserver = new IntersectionObserver(
    (entries) => {
      if (!ready) return;
      const visible = entries.at(-1)?.isIntersecting ?? false;
      if (visible) {
        app.start();
      } else {
        app.stop();
      }
    },
    { rootMargin: '200px 0px' },
  );
  visibilityObserver.observe(canvas.parentElement ?? canvas);

  // 画布尺寸变化时同步 renderer 并重排。
  const resizeObserver = createResizeObserver(canvas, () => {
    if (!app.renderer) return;
    const size = readCanvasSize(canvas);
    app.renderer.resize(size.width, size.height);
    layout();
  });

  return {
    update(args) {
      applyArgs(args);
    },
    dispose() {
      disposed = true;
      visibilityObserver.disconnect();
      resizeObserver.disconnect();
      if (ready) {
        // 应用级完整清理：停 ticker → 销毁 stage（含子级）→ 销毁 renderer。
        // 第一个 true 表示 removeView，display options 传给 stage.destroy。
        app.destroy(true, { children: true });
      }
    },
  };
}
