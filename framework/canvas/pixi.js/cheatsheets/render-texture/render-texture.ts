/**
 * 范例介绍：演示 RenderTexture 的核心工作流——把一个离屏场景每帧渲染进 RenderTexture，
 * 再把这张纹理挂到舞台上的 Sprite 显示并复用，并用 clear 开关对比「每帧快照」与「累积保留」。
 *
 * 演示内容：
 *   - 源场景 sourceScene（旋转的轨道粒子 + 中心标记）从不加入舞台，只作为渲染输入。
 *   - RenderTexture rt 承接渲染结果，每帧由 renderer.render({ container, target, clear }) 更新。
 *   - 主显示 Sprite 与角落迷你 Sprite 共享同一张 rt，证明纹理「可复用」。
 *
 * 输入：clearMode（'clear' 每帧清除 | 'accumulate' 累积保留），映射到 renderer.render 的 clear 布尔。
 *
 * 主要操作：每帧 ticker 里旋转轨道粒子，再 renderer.render({ container: sourceScene, target: rt, clear })。
 *   - clear=true：纹理先清透明再画粒子，只看到当前位置（快照）。
 *   - clear=false：不清除，粒子轨迹逐帧累积成完整圆环（拖尾）。
 *
 * 预期结果：
 *   - 切到「每帧清除」：主显示区只有一个移动的亮点。
 *   - 切到「累积保留」：亮点轨迹逐步铺成圆环，迷你区同步累积（共享纹理）。
 *   - 两块显示区内容始终一致 → 证明同一张 RenderTexture 被多个 Sprite 复用。
 *
 * 阅读主线：先看 RenderTexture.create 的选项（dynamic:true 为 resize 预留、resolution 决定后备像素），
 * 再看 ticker 里 renderer.render 的 target 与 clear，最后看舞台 Sprite 如何复用这张纹理。
 */
import {
  Application,
  Container,
  Graphics,
  RenderTexture,
  Sprite,
  Text,
} from 'pixi.js';
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export interface RenderTextureOptions {
  clearMode: 'clear' | 'accumulate';
}

export interface RenderTextureSnapshot {
  clearMode: string;
  textureSize: string;
  textureResolution: number;
  backingPixels: string;
  displaySprites: number;
}

export interface RenderTextureInstance {
  update(options: RenderTextureOptions): void;
  dispose(): void;
}

const TEXTURE_SIZE = 256;
const TEXTURE_RESOLUTION = 2;

const MONO = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
} as const;

export function createRenderTextureDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: RenderTextureSnapshot) => void,
): RenderTextureInstance {
  const app = new Application();
  let disposed = false;
  let destroyed = false;
  let ready = false;
  let current: RenderTextureOptions = { clearMode: 'clear' };

  // 源场景：只在离屏渲染进纹理时使用，从不加入 app.stage。
  // 中心 (128,128) 是半径 70 的轨道；粒子绕中心旋转，clear=false 时留下完整圆环轨迹。
  const sourceScene = new Container();

  const hub = new Graphics();
  hub.circle(0, 0, 5).fill(0x475569);
  hub.position.set(TEXTURE_SIZE / 2, TEXTURE_SIZE / 2);
  sourceScene.addChild(hub);

  const orbiter = new Container();
  orbiter.position.set(TEXTURE_SIZE / 2, TEXTURE_SIZE / 2);
  const dot = new Graphics();
  // 主粒子：亮蓝实心 + 浅蓝描边，在透明背景上拖尾清晰可辨。
  dot.circle(0, 0, 14).fill(0x4f7cff);
  dot.circle(0, 0, 14).stroke({ color: 0x93c5fd, width: 3 });
  dot.position.set(70, 0); // 轨道半径
  orbiter.addChild(dot);
  sourceScene.addChild(orbiter);

  // RenderTexture：dynamic:true 让后续 rt.resize() 能生效（本范例尺寸固定，仍保留以演示该选项）。
  // resolution:2 让放大显示时拖尾边缘保持锐利；后备像素 = 逻辑尺寸 × 分辨率 = 512。
  const rt = RenderTexture.create({
    width: TEXTURE_SIZE,
    height: TEXTURE_SIZE,
    resolution: TEXTURE_RESOLUTION,
    antialias: true,
    dynamic: true,
  });

  // 舞台：标题 + 主显示区 + 角落迷你区。两块显示区共享同一张 rt，证明「可复用」。
  const title = new Text({
    text: 'RenderTexture：离屏场景 → 可复用纹理',
    style: { ...MONO, fontSize: 15, fill: 0xe2e8f0 },
  });
  title.anchor.set(0.5, 0);

  // 主显示 Sprite（放大），外框让纹理区域在透明时也可见。
  const mainSprite = new Sprite(rt);
  mainSprite.anchor.set(0.5);
  const mainFrame = new Graphics();

  // 迷你显示 Sprite（缩小），共享同一张 rt。
  const miniSprite = new Sprite(rt);
  miniSprite.anchor.set(0.5);
  const miniFrame = new Graphics();
  const miniLabel = new Text({
    text: '复用同一张纹理',
    style: { ...MONO, fontSize: 11, fill: 0x94a3b8 },
  });
  miniLabel.anchor.set(0.5, 0);

  function drawFrame(g: Graphics, x: number, y: number, w: number, h: number) {
    g.clear();
    g.roundRect(x, y, w, h, Math.min(w, h) * 0.06).stroke({
      color: 0x334155,
      width: 1,
    });
  }

  function layout() {
    const w = app.screen.width;
    const h = app.screen.height;
    const cx = w / 2;

    title.position.set(cx, 14);

    // 主显示区：根据画布高度确定放大倍数，居中偏下。
    const mainSide = Math.min(h - 90, w - 80, 300);
    const mainScale = mainSide / TEXTURE_SIZE;
    mainSprite.scale.set(mainScale);
    mainSprite.position.set(cx, h * 0.55);

    const mainBox = TEXTURE_SIZE * mainScale;
    drawFrame(
      mainFrame,
      mainSprite.x - mainBox / 2,
      mainSprite.y - mainBox / 2,
      mainBox,
      mainBox,
    );

    // 迷你区：固定缩放，放右上角。
    const miniScale = 0.4;
    miniSprite.scale.set(miniScale);
    const miniBox = TEXTURE_SIZE * miniScale;
    miniSprite.position.set(w - 16 - miniBox / 2, 14 + miniBox / 2 + 8);
    drawFrame(
      miniFrame,
      miniSprite.x - miniBox / 2,
      miniSprite.y - miniBox / 2,
      miniBox,
      miniBox,
    );
    miniLabel.position.set(miniSprite.x, miniSprite.y + miniBox / 2 + 6);
  }

  function emitSnapshot() {
    emit({
      clearMode:
        current.clearMode === 'clear'
          ? '每帧清除 (clear=true)'
          : '累积保留 (clear=false)',
      textureSize: `${TEXTURE_SIZE} × ${TEXTURE_SIZE}`,
      textureResolution: rt.source.resolution,
      backingPixels: `${Math.round(
        rt.width * rt.source.resolution,
      )} × ${Math.round(rt.height * rt.source.resolution)}`,
      displaySprites: 2,
    });
  }

  // 核心机制：每帧旋转轨道粒子，再把源场景渲染进纹理。
  // target 把渲染目标从「屏幕画布」切换到 rt；clear 决定每帧是快照还是累积。
  function frame() {
    if (!ready) {
      return;
    }
    orbiter.rotation += 0.03;
    app.renderer.render({
      container: sourceScene,
      target: rt,
      clear: current.clearMode === 'clear',
    });
  }

  const initial = readCanvasSize(canvas);
  const initPromise = app.init({
    canvas,
    width: Math.max(320, initial.width),
    height: Math.max(240, initial.height),
    preference: 'webgl',
    background: '#0f172a',
    antialias: true,
  });

  initPromise.then(() => {
    if (disposed) {
      destroyAll();
      return;
    }
    ready = true;
    app.stage.addChild(
      title,
      mainFrame,
      mainSprite,
      miniFrame,
      miniSprite,
      miniLabel,
    );
    // ticker 回调默认优先级高于 Application 的渲染，因此纹理先更新，舞台再绘制到屏幕。
    app.ticker.add(frame);
    layout();
    emitSnapshot();
  });

  function destroyAll() {
    if (destroyed) {
      return;
    }
    destroyed = true;
    // RenderTexture 自行销毁：destroy(true) 同时释放 TextureSource 的 GPU 存储和 Texture 包装。
    // 销毁 Sprite 不会连带销毁它的纹理，因此 rt 必须显式 destroy。
    rt.destroy(true);
    app.destroy(true, { children: true });
  }

  // 画布尺寸变化时同步 renderer 并重排。
  const resizeObserver = createResizeObserver(canvas, () => {
    if (!app.renderer) {
      return;
    }
    const size = readCanvasSize(canvas);
    app.renderer.resize(size.width, size.height);
    layout();
  });

  // 离屏时暂停渲染循环以省 GPU；回到视口时恢复。
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
  visibilityObserver.observe(canvas.parentElement ?? canvas);

  return {
    update(options) {
      current = options;
      if (ready) {
        emitSnapshot();
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
