/**
 * 场景图坐标空间演示。
 *
 * 演示内容：一棵 app.stage → parent（Container）→ child（Graphics）的小树，
 * 外加一个直接挂在 stage 上的原点参考点。重点展示「本地坐标相对父、
 * 全局坐标由父→子逐级累积」这一场景图核心机制。
 *
 * 输入：parentX（父容器在 stage 中的本地 X）、childX（红圆在 parent 中的本地 X）。
 * 主要操作：拖动两个滑块。改 parentX 时蓝框与红圆整体平移（父变换传递给子）；
 * 改 childX 时只有红圆在蓝框内平移（本地坐标相对父节点）。
 *
 * 预期结果：红圆的全局 X 始终等于「父 X + 子本地 X」，左下角读数里
 * 「子对象 X（全局）」与「父 + 子本地」两行始终相等，证明累积关系。
 * stage 原点参考点不受 parentX 影响，对比说明「直接子级」与「嵌套子级」的差异。
 *
 * 阅读主线：先看 buildScene 建立的 Container 父子结构（谁是根、谁分组、谁是叶子），
 * 再看 applyOptions 如何改 position 并用 getGlobalPosition 读取实测全局坐标。
 */
import { Application, Container, Graphics, Text } from 'pixi.js';
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export interface SceneGraphOptions {
  parentX: number;
  childX: number;
}

export interface SceneGraphSnapshot {
  parentLocalX: number;
  childLocalX: number;
  childGlobalX: number;
  cumulative: number;
}

export interface SceneGraphInstance {
  update(options: SceneGraphOptions): void;
  dispose(): void;
}

const PARENT_Y = 100;
const CHILD_Y = 55;
const FRAME_W = 200;
const FRAME_H = 110;

const LABEL_STYLE = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: 12,
} as const;

export function createSceneGraph(
  canvas: HTMLCanvasElement,
  emit: (snapshot: SceneGraphSnapshot) => void,
): SceneGraphInstance {
  const app = new Application();
  let disposed = false;
  let destroyed = false;
  let current: SceneGraphOptions = { parentX: 80, childX: 70 };

  // 父容器：分组节点。Container 本身不产生像素，靠内部的框和子对象体现位置与范围。
  const parent = new Container();
  parent.label = 'parent';

  // 让 parent 的本地空间可见：半透明圆角矩形 + 标签。
  const frame = new Graphics()
    .roundRect(0, 0, FRAME_W, FRAME_H, 14)
    .fill({ color: 0x4f7cff, alpha: 0.1 })
    .stroke({ color: 0x4f7cff, alpha: 0.6, width: 2 });
  const parentLabel = new Text({
    text: 'parent（Container）',
    style: { ...LABEL_STYLE, fill: 0x4f7cff },
  });
  parentLabel.position.set(12, 8);
  parent.addChild(frame, parentLabel);

  // 子对象：红圆。v8 中 Graphics 是叶子节点，不能有自己的子节点，只能作为 parent 的子级。
  // 它的 position 相对 parent 的原点，而不是相对屏幕。
  const child = new Graphics().circle(0, 0, 16).fill(0xef4444);
  child.label = 'child';
  const childLabel = new Text({
    text: 'child',
    style: { ...LABEL_STYLE, fill: 0xef4444 },
  });
  parent.addChild(child, childLabel);

  // stage 原点参考：直接挂在 app.stage 上，不经过 parent，因此不受 parentX 影响。
  const origin = new Graphics().circle(0, 0, 4).fill(0x94a3b8);
  const originLabel = new Text({
    text: 'stage 原点 (0, 0)',
    style: { ...LABEL_STYLE, fill: 0x64748b },
  });
  originLabel.position.set(10, -16);
  origin.position.set(28, 28);

  // 应用参数并派生读数。改 position 后立刻读全局坐标，向观察者证明累积关系。
  function applyOptions() {
    parent.position.set(current.parentX, PARENT_Y);
    child.position.set(current.childX, CHILD_Y);
    childLabel.position.set(current.childX + 22, CHILD_Y - 8);

    // getGlobalPosition 内部会更新变换链，返回 child 本地原点在全局坐标系下的位置。
    // 因为 stage 在原点且这里只有 x 偏移，全局 X == parent.x + child.x。
    const global = child.getGlobalPosition();
    emit({
      parentLocalX: Math.round(parent.position.x),
      childLocalX: Math.round(child.position.x),
      childGlobalX: Math.round(global.x),
      cumulative: Math.round(parent.position.x + child.position.x),
    });

    if (app.renderer) {
      app.render();
    }
  }

  // Application 选项走异步 init，复用 story 注入的画布。
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
    // 只有加入 app.stage（或它的子树）后，对象才进入场景图并被渲染。
    app.stage.addChild(origin, originLabel, parent);
    applyOptions();
  });

  function destroyAll() {
    if (destroyed) {
      return;
    }
    destroyed = true;
    app.destroy(true, { children: true });
  }

  // 画布尺寸变化时同步 renderer，保持坐标系一致。
  const resizeObserver = createResizeObserver(canvas, () => {
    if (!app.renderer) {
      return;
    }
    const size = readCanvasSize(canvas);
    app.renderer.resize(size.width, size.height);
    applyOptions();
  });

  // 离屏暂停 Ticker 以省 GPU；回到视口或页面可见时恢复。
  const visibilityObserver = new IntersectionObserver(
    (entries) => {
      if (!app.ticker) {
        return;
      }
      const visible =
        (entries.at(-1)?.isIntersecting ?? false) &&
        document.visibilityState !== 'hidden';
      if (visible) {
        app.ticker.start();
      } else {
        app.ticker.stop();
      }
    },
    { rootMargin: '200px 0px' },
  );
  visibilityObserver.observe(canvas);

  return {
    update(options) {
      current = options;
      applyOptions();
    },
    dispose() {
      disposed = true;
      visibilityObserver.disconnect();
      resizeObserver.disconnect();
      // init 可能尚未完成：完成后再销毁，避免残留 renderer。
      if (app.renderer) {
        destroyAll();
      } else {
        initPromise.then(destroyAll);
      }
    },
  };
}
