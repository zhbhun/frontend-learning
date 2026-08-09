/**
 * 变换范例 transform.ts
 *
 * 演示内容：PixiJS 显示对象的 position、scale、rotation、pivot、skew、anchor
 *   如何组合改变对象在父坐标系中的样子，以及父子变换如何沿场景图继承。
 *
 * 三个场景（分别对应 README.mdx 的三个 Canvas）：
 *   1. createTransformDemo —— 在一个 Graphics 上同时调 position/scale/rotation/pivot/skew。
 *      红色十字标记 pivot 的世界位置（恰好等于对象的 position），
 *      直观看到「pivot 是旋转/缩放中心」和「设 pivot 会视觉移动对象」。
 *      Graphics 没有 anchor（只有纹理类叶子节点才有），正好演示「非纹理对象用 pivot」。
 *   2. createAnchorDemo —— 在 Sprite 上调 anchor，展示纹理内容原点如何偏移、
 *      旋转中心如何随 anchor 改变，并与 pivot 的语义对比。
 *   3. createCompositeDemo —— 父 Container 旋转/缩放，子对象在父局部坐标系定位，
 *      展示子对象的世界变换 = 父世界变换 × 子局部变换。
 *
 * 输入：来自 Storybook 控件的可热更参数（每场景一组，见 transform.stories.ts）。
 * 主要操作：拖动控件，观察对象形态、红色十字位置和左下角读数。
 * 预期结果：
 *   - pivot/anchor 改变会让对象视觉移动（与 CSS transform-origin 不同）；
 *   - scale/rotation/skew 都围绕 pivot；
 *   - Sprite 用 anchor 居中最简，Container/Graphics 用 pivot 居中；
 *   - 父级变换沿父子链叠加到所有子孙。
 *
 * 阅读主线：各 createXxxDemo → makeScene 包装 → setup 闭包返回的 apply（应用控件参数）
 *   → emit（产出读数）。共享 helper（initApp / attachTickerPause / drawDirectionShape）
 *   是支撑外壳。
 */
import {
  Application,
  Container,
  Graphics,
  Sprite,
  Texture,
  type Ticker,
} from 'pixi.js';

// 共享：初始化 Application，复用 canvasStory 传入的画布；resizeTo 让画布跟随舞台尺寸。
// 为什么需要：PixiJS v8 的 Application 必须异步 init 渲染器，而 canvasStory 的 create
// 要求同步返回实例，因此各场景用 makeScene 包一层，init 完成前先缓存控件参数。
async function initApp(canvas: HTMLCanvasElement): Promise<Application> {
  const app = new Application();
  await app.init({
    canvas,
    resizeTo: canvas.parentElement ?? canvas,
    background: '#f8fafc',
    antialias: true,
  });
  return app;
}

// 共享：画布离开视口或页面隐藏时暂停 Ticker，省 GPU；回到视口再恢复。
// PixiJS 的 Ticker 自带 requestAnimationFrame，不接管就会一直空转渲染。
function attachTickerPause(canvas: HTMLCanvasElement, ticker: Ticker): () => void {
  let near = false;
  const doc = canvas.ownerDocument;
  const sync = () => {
    const visible = near && doc?.visibilityState !== 'hidden';
    if (visible) {
      ticker.start();
    } else {
      ticker.stop();
    }
  };
  const io = new IntersectionObserver(
    (entries) => {
      near = entries.at(-1)?.isIntersecting ?? false;
      sync();
    },
    { rootMargin: '200px 0px' },
  );
  io.observe(canvas);
  doc?.addEventListener('visibilitychange', sync);
  return () => {
    io.disconnect();
    doc?.removeEventListener('visibilitychange', sync);
  };
}

interface SceneCtx {
  app: Application;
  stage: Container;
}

// 共享：把异步 init 包成 canvasStory 期望的同步实例。
// setup 在 app 就绪后执行、返回 apply；apply 到达前来的控件参数先缓存到 pending。
function makeScene<T>(
  canvas: HTMLCanvasElement,
  setup: (ctx: SceneCtx) => (options: T) => void,
): { update(options: T): void; dispose(): void } {
  let app: Application | null = null;
  let detach: (() => void) | null = null;
  let apply: ((options: T) => void) | null = null;
  let pending: T | null = null;
  let disposed = false;

  void (async () => {
    app = await initApp(canvas);
    if (disposed) {
      app.destroy();
      return;
    }
    detach = attachTickerPause(canvas, app.ticker);
    apply = setup({ app, stage: app.stage });
    if (pending !== null) {
      apply(pending);
      pending = null;
    }
  })();

  return {
    update(options) {
      if (apply) {
        apply(options);
      } else {
        pending = options;
      }
    },
    dispose() {
      disposed = true;
      detach?.();
      app?.destroy();
      app = null;
    },
  };
}

// 共享：画一个非对称图形——矩形 + 右指箭头 + 左上角色块。
// 非对称让旋转朝向、翻转、倾斜都能被肉眼分辨，避免正方形看不出转没转。
function drawDirectionShape(g: Graphics, width = 140, height = 90): Graphics {
  g.rect(0, 0, width, height)
    .fill({ color: 0x4f7cff })
    .stroke({ color: 0x1e3a8a, width: 2 });
  // 右指箭头：标明朝向
  g.moveTo(width - 34, height / 2)
    .lineTo(width - 8, height / 2)
    .lineTo(width - 20, height / 2 - 13)
    .lineTo(width - 20, height / 2 + 13)
    .closePath()
    .fill({ color: 0xf8fafc });
  // 左上角色块：辨认翻转
  g.rect(7, 7, 16, 16).fill({ color: 0xf59e0b });
  return g;
}

// 共享：在某个位置画红色十字 + 圆环，标记「旋转中心 / 局部原点对齐点」。
function drawCrossMarker(g: Graphics): Graphics {
  g.circle(0, 0, 7)
    .stroke({ color: 0xef4444, width: 2 })
    .moveTo(-14, 0)
    .lineTo(14, 0)
    .moveTo(0, -14)
    .lineTo(0, 14)
    .stroke({ color: 0xef4444, width: 2 });
  return g;
}

// 共享：画 stage 中心的浅色参考十字，便于看 position 相对中心的偏移。
function drawGuide(g: Graphics, width: number, height: number): void {
  g.clear();
  g.moveTo(width / 2 - 18, height / 2)
    .lineTo(width / 2 + 18, height / 2)
    .moveTo(width / 2, height / 2 - 18)
    .lineTo(width / 2, height / 2 + 18)
    .stroke({ color: 0xcbd5e1, width: 1 });
}

/* -------------------------------------------------------------------------- */
/* 场景 1：position / scale / rotation / pivot / skew                          */
/* -------------------------------------------------------------------------- */

export interface TransformOptions {
  positionX: number;
  positionY: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  pivotX: number;
  pivotY: number;
  skewX: number;
  skewY: number;
}

export interface TransformSnapshot {
  position: string;
  scale: string;
  rotationDeg: number;
  pivot: string;
  skew: string;
}

export interface TransformInstance {
  update(options: TransformOptions): void;
  dispose(): void;
}

export function createTransformDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: TransformSnapshot) => void,
): TransformInstance {
  return makeScene<TransformOptions>(canvas, ({ app, stage }) => {
    const guide = new Graphics();
    stage.addChild(guide);

    const shape = new Graphics();
    drawDirectionShape(shape);
    stage.addChild(shape);

    // 红色十字标记 pivot 的世界位置——它恰好等于 shape.position（旋转中心）。
    const pivotMarker = new Graphics();
    stage.addChild(pivotMarker);

    return (o) => {
      const { width, height } = app.screen;
      drawGuide(guide, width, height);

      // position 以 stage 中心为基准：控件默认 0 时对象落在画面中央区域
      shape.position.set(width / 2 + o.positionX, height / 2 + o.positionY);
      shape.scale.set(o.scaleX, o.scaleY);
      shape.rotation = o.rotation;
      // pivot 是 scale/rotation/skew 围绕的中心（局部坐标，像素）
      shape.pivot.set(o.pivotX, o.pivotY);
      shape.skew.set(o.skewX, o.skewY);

      // pivot 局部点经变换后落在父坐标系的 position——旋转中心就是 shape.position
      pivotMarker.position.copyFrom(shape.position);
      pivotMarker.clear();
      drawCrossMarker(pivotMarker);

      emit({
        position: `${o.positionX}, ${o.positionY}`,
        scale: `${o.scaleX.toFixed(2)}, ${o.scaleY.toFixed(2)}`,
        rotationDeg: Math.round((o.rotation * 180) / Math.PI),
        pivot: `${o.pivotX}, ${o.pivotY}`,
        skew: `${o.skewX.toFixed(2)}, ${o.skewY.toFixed(2)}`,
      });
    };
  });
}

/* -------------------------------------------------------------------------- */
/* 场景 2：anchor（Sprite 专有，与 pivot 对比）                                */
/* -------------------------------------------------------------------------- */

export interface AnchorOptions {
  anchorX: number;
  anchorY: number;
  rotation: number;
}

export interface AnchorSnapshot {
  anchor: string;
  rotationDeg: number;
  textureSize: string;
}

export interface AnchorInstance {
  update(options: AnchorOptions): void;
  dispose(): void;
}

export function createAnchorDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: AnchorSnapshot) => void,
): AnchorInstance {
  // generateTexture 产生的纹理需要在 dispose 时显式销毁，这里持有引用。
  let texture: Texture | null = null;
  const scene = makeScene<AnchorOptions>(canvas, ({ app, stage }) => {
    // 用 Graphics 现画一个非对称图案再生成纹理，无需外部资源
    const source = new Graphics();
    drawDirectionShape(source, 120, 120);
    texture = app.renderer.generateTexture(source);
    source.destroy();

    const sprite = new Sprite(texture);
    stage.addChild(sprite);

    // 红色十字标记 sprite.position：无论 anchor 怎么变，旋转中心始终是 position
    const origin = new Graphics();
    stage.addChild(origin);
    const guide = new Graphics();
    stage.addChild(guide);

    return (o) => {
      const { width, height } = app.screen;
      drawGuide(guide, width, height);

      // anchor 决定纹理的哪一点对齐到 sprite 的局部原点（进而对齐到 position）
      sprite.anchor.set(o.anchorX, o.anchorY);
      sprite.rotation = o.rotation;
      sprite.position.set(width / 2, height / 2);

      origin.position.copyFrom(sprite.position);
      origin.clear();
      drawCrossMarker(origin);

      emit({
        anchor: `${o.anchorX.toFixed(2)}, ${o.anchorY.toFixed(2)}`,
        rotationDeg: Math.round((o.rotation * 180) / Math.PI),
        textureSize: `${Math.round(texture!.width)} × ${Math.round(texture!.height)}`,
      });
    };
  });

  return {
    update(options) {
      scene.update(options);
    },
    dispose() {
      scene.dispose();
      texture?.destroy(true);
      texture = null;
    },
  };
}

/* -------------------------------------------------------------------------- */
/* 场景 3：变换组合与父子继承                                                  */
/* -------------------------------------------------------------------------- */

export interface CompositeOptions {
  parentRotation: number;
  parentScale: number;
  childX: number;
  childY: number;
}

export interface CompositeSnapshot {
  parentRotationDeg: number;
  parentScale: string;
  childLocal: string;
  childWorld: string;
}

export interface CompositeInstance {
  update(options: CompositeOptions): void;
  dispose(): void;
}

export function createCompositeDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: CompositeSnapshot) => void,
): CompositeInstance {
  return makeScene<CompositeOptions>(canvas, ({ app, stage }) => {
    const parent = new Container();
    stage.addChild(parent);

    // 父容器可见边框：以 (0,0) 为中心绘制，pivot 默认 (0,0) 即围绕中心旋转/缩放
    const frame = new Graphics()
      .rect(-90, -65, 180, 130)
      .fill({ color: 0xeef2ff, alpha: 0.6 })
      .stroke({ color: 0x6366f1, width: 2 });
    parent.addChild(frame);

    // 父局部原点标记：子的 position 以此为基准度量
    const parentOrigin = new Graphics()
      .circle(0, 0, 5)
      .fill({ color: 0x6366f1 });
    parent.addChild(parentOrigin);

    // 子对象：在父局部坐标系定位，跟随父变换
    const child = new Graphics();
    drawDirectionShape(child, 80, 50);
    parent.addChild(child);

    const guide = new Graphics();
    stage.addChild(guide);

    return (o) => {
      const { width, height } = app.screen;
      drawGuide(guide, width, height);

      // 把父容器放到 stage 中央，再施加旋转/缩放——子的坐标系随之改变
      parent.position.set(width / 2, height / 2);
      parent.rotation = o.parentRotation;
      parent.scale.set(o.parentScale);

      // 子的 position 始终在父局部坐标系里度量
      child.position.set(o.childX, o.childY);

      // 子局部 (0,0) 在世界中的位置 = 父世界变换 × 子局部 position
      const wp = child.getGlobalPosition();
      emit({
        parentRotationDeg: Math.round((o.parentRotation * 180) / Math.PI),
        parentScale: o.parentScale.toFixed(2),
        childLocal: `${o.childX}, ${o.childY}`,
        childWorld: `${Math.round(wp.x)}, ${Math.round(wp.y)}`,
      });
    };
  });
}
