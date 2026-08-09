/**
 * 范例介绍：演示批渲染如何合并 draw call，以及什么因素会打断批次。
 *
 * 演示内容：铺一组精灵，通过控件切换纹理策略（共享 vs 独立）、blend mode 排列（统一 vs 交替）、
 * 精灵数量。用 monkey-patch 拦截 WebGL 的 drawElements / drawArrays，每帧计数 draw call，
 * 并配合 FPS 反映 draw call 增多时的性能代价。
 *
 * 输入：textureMode（shared / distinct）、blendMode（normal / alternating）、count（精灵数）。
 * 主要操作：apply 把参数映射到每个精灵的 texture / blendMode，并按 count 增删精灵；
 * ticker 里每帧在 render（LOW 优先级，晚于本回调）之前读取上一帧 render 累加的 draw call 数。
 *
 * 预期结果：
 *   - shared + normal：draw call ≈ 1-2，无论 count 多少——所有精灵合成一个批次。
 *   - distinct（24 张独立纹理 > 16 张/批次上限）：draw call 明显增多——批次被纹理数量打断。
 *   - alternating：draw call ≈ count——相邻精灵的 blend mode 反复切换，每次切换都打断批次。
 *   - draw call 增多时 FPS 随之下降，直观反映 draw call 的性能代价。
 *
 * 阅读主线：先看 createDrawCallCounter 如何拦截 WebGL 绘制调用，再看 buildTextures /
 * syncSprites 如何按 textureMode / blendMode 构造精灵，最后看 ticker 如何在 render 之前
 * 读取上一帧的 draw call 计数。
 */
import {
  Application,
  Sprite,
  Graphics,
  Text,
  Container,
  BLEND_MODES,
} from 'pixi.js';
import type { Texture } from 'pixi.js';
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export interface PerformanceOptions {
  textureMode: 'shared' | 'distinct';
  blendMode: 'normal' | 'alternating';
  count: number;
}

export interface PerformanceSnapshot {
  drawCalls: number;
  sprites: number;
  fps: number;
  textureMode: string;
  blendMode: string;
}

export interface PerformanceInstance {
  update(options: PerformanceOptions): void;
  dispose(): void;
}

const MONO = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
} as const;

// 独立纹理池大小：故意大于「每批次 16 张纹理」上限，distinct 模式下必然打断批次。
const POOL_SIZE = 24;
const CELL = 28;
const GAP = 4;

/**
 * 拦截 WebGL 的所有 draw 变体并对调用计数。
 * 为什么需要：PixiJS 没有公开 draw call 计数 API，而 draw call 是本课的核心可观察量。
 * 影响什么：每个 drawElements / drawArrays 调用 ≈ 一次 GPU 提交，计数即为 draw call 数。
 * dispose 时必须 restore，否则会泄漏到下一个实例。
 */
function createDrawCallCounter(gl: WebGL2RenderingContext) {
  let count = 0;
  const orig = {
    drawElements: gl.drawElements.bind(gl),
    drawArrays: gl.drawArrays.bind(gl),
    drawElementsInstanced: gl.drawElementsInstanced.bind(gl),
    drawArraysInstanced: gl.drawArraysInstanced.bind(gl),
  };

  gl.drawElements = ((...args: Parameters<typeof gl.drawElements>) => {
    count += 1;
    return orig.drawElements(...args);
  }) as typeof gl.drawElements;
  gl.drawArrays = ((...args: Parameters<typeof gl.drawArrays>) => {
    count += 1;
    return orig.drawArrays(...args);
  }) as typeof gl.drawArrays;
  gl.drawElementsInstanced = ((
    ...args: Parameters<typeof gl.drawElementsInstanced>
  ) => {
    count += 1;
    return orig.drawElementsInstanced(...args);
  }) as typeof gl.drawElementsInstanced;
  gl.drawArraysInstanced = ((...args: Parameters<typeof gl.drawArraysInstanced>) => {
    count += 1;
    return orig.drawArraysInstanced(...args);
  }) as typeof gl.drawArraysInstanced;

  return {
    get value() {
      return count;
    },
    reset() {
      count = 0;
    },
    restore() {
      gl.drawElements = orig.drawElements;
      gl.drawArrays = orig.drawArrays;
      gl.drawElementsInstanced = orig.drawElementsInstanced;
      gl.drawArraysInstanced = orig.drawArraysInstanced;
    },
  };
}

// 用黄金角分布把索引映射成均匀色相，shared 模式靠 tint 上色，distinct 模式靠纹理本身的颜色。
function hueToRgb(h: number): number {
  const c = 0.62;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = 0.5 - c / 2;
  const [r, g, b] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return (
    (Math.round((r + m) * 255) << 16) |
    (Math.round((g + m) * 255) << 8) |
    Math.round((b + m) * 255)
  );
}

export function createPerformanceDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: PerformanceSnapshot) => void,
): PerformanceInstance {
  const app = new Application();
  let disposed = false;
  let destroyed = false;
  let ready = false;
  let current: PerformanceOptions = {
    textureMode: 'shared',
    blendMode: 'normal',
    count: 150,
  };

  let counter: ReturnType<typeof createDrawCallCounter> | null = null;

  // shared 模式只复用一张白色纹理，靠 tint 区分颜色——tint 改的是顶点色，不打断批次。
  const sharedTextures: Texture[] = [];
  // distinct 模式用独立纹理池（每张不同颜色），纹理源各不相同，超过 16 张会打断批次。
  const distinctTextures: Texture[] = [];
  let generatedTextures: Texture[] = [];

  const layer = new Container();
  const sprites: Sprite[] = [];

  const title = new Text({
    text: '批渲染与 draw call',
    style: { ...MONO, fontSize: 16, fill: 0xe2e8f0 },
  });
  title.anchor.set(0.5, 0);

  const hint = new Text({
    text: '切换纹理策略 / blend 排列，读数反映 draw call 数与 FPS',
    style: { ...MONO, fontSize: 12, fill: 0x94a3b8 },
  });
  hint.anchor.set(0.5, 0);

  // 用纯色 Graphics 烘焙成纹理：shared 池只做一张白色，distinct 池做 POOL_SIZE 张彩色。
  function buildTextures() {
    const renderer = app.renderer;
    sharedTextures.length = 0;
    distinctTextures.length = 0;

    const white = new Graphics();
    white.rect(0, 0, CELL, CELL).fill({ color: 0xffffff });
    sharedTextures.push(renderer.generateTexture(white));
    white.destroy();

    for (let i = 0; i < POOL_SIZE; i += 1) {
      const hue = (i * 137.5) % 360;
      const g = new Graphics();
      g.rect(0, 0, CELL, CELL).fill({ color: hueToRgb(hue) });
      distinctTextures.push(renderer.generateTexture(g));
      g.destroy();
    }
    generatedTextures = [...sharedTextures, ...distinctTextures];
  }

  // 按 count 增删精灵，再按 textureMode / blendMode 更新每个精灵的属性。
  function syncSprites(opts: PerformanceOptions) {
    const desired = opts.count;

    while (sprites.length < desired) {
      const sprite = new Sprite(sharedTextures[0]);
      sprite.anchor.set(0.5);
      layer.addChild(sprite);
      sprites.push(sprite);
    }
    while (sprites.length > desired) {
      const sprite = sprites.pop()!;
      layer.removeChild(sprite);
      sprite.destroy();
    }

    for (let i = 0; i < sprites.length; i += 1) {
      const sprite = sprites[i];
      if (opts.textureMode === 'shared') {
        if (sprite.texture !== sharedTextures[0]) {
          sprite.texture = sharedTextures[0];
        }
        sprite.tint = hueToRgb((i * 137.5) % 360);
      } else {
        sprite.texture = distinctTextures[i % POOL_SIZE];
        sprite.tint = 0xffffff;
      }
      sprite.blendMode =
        opts.blendMode === 'alternating' && i % 2 === 1
          ? BLEND_MODES.SCREEN
          : BLEND_MODES.NORMAL;
    }

    layout();
  }

  function layout() {
    const w = app.screen.width;
    const h = app.screen.height;
    title.position.set(w / 2, h * 0.06);
    hint.position.set(w / 2, h * 0.06 + 24);

    const step = CELL + GAP;
    const cols = Math.max(1, Math.floor((w - 32) / step));
    const startX = (w - cols * step) / 2 + step / 2;
    const startY = h * 0.2;

    for (let i = 0; i < sprites.length; i += 1) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      sprites[i].position.set(startX + col * step, startY + row * step);
    }
  }

  const initial = readCanvasSize(canvas);
  const initPromise = app.init({
    canvas,
    width: Math.max(320, initial.width),
    height: Math.max(240, initial.height),
    // 强制 WebGL：draw call 计数依赖对 gl 上下文的拦截，WebGPU / Canvas 后端无法拦截。
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

    // 拦截 draw call：必须在拿到 renderer.gl 之后。preference: 'webgl' 保证此处是 WebGL 后端。
    const glRenderer = app.renderer;
    if (!('gl' in glRenderer)) {
      throw new Error('draw call 计数需要 WebGL 渲染器，请确认 preference 为 webgl。');
    }
    counter = createDrawCallCounter(glRenderer.gl);

    buildTextures();
    app.stage.addChild(layer, title, hint);
    syncSprites(current);

    let emitAccum = 0;
    app.ticker.add((ticker) => {
      // render 绑定在 LOW 优先级，晚于本 NORMAL 回调；
      // 因此这里的 counter.value 是「上一帧 render」累加的完整 draw call 数。
      const lastFrame = counter ? counter.value : 0;
      counter?.reset();

      emitAccum += ticker.deltaMS;
      if (emitAccum >= 120) {
        emitAccum = 0;
        emit({
          drawCalls: lastFrame,
          sprites: sprites.length,
          fps: Math.round(app.ticker.FPS),
          textureMode: current.textureMode,
          blendMode: current.blendMode,
        });
      }
    });
  });

  function destroyAll() {
    if (destroyed) {
      return;
    }
    destroyed = true;
    counter?.restore();
    for (const texture of generatedTextures) {
      texture.destroy(true);
    }
    generatedTextures = [];
    app.destroy(true, { children: true });
  }

  const visibilityObserver = new IntersectionObserver(
    (entries) => {
      if (!ready) {
        return;
      }
      if (entries.at(-1)?.isIntersecting) {
        app.start();
      } else {
        app.stop();
      }
    },
    { rootMargin: '200px 0px' },
  );
  visibilityObserver.observe(canvas);

  const resizeObserver = createResizeObserver(canvas, () => {
    if (!app.renderer) {
      return;
    }
    const size = readCanvasSize(canvas);
    app.renderer.resize(size.width, size.height);
    layout();
  });

  return {
    update(options) {
      current = options;
      if (!ready) {
        return;
      }
      syncSprites(options);
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
