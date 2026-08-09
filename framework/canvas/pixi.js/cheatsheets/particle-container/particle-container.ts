/**
 * 范例介绍：演示 ParticleContainer 如何高效渲染大量同纹理粒子，以及 dynamicProperties 如何
 * 决定哪些属性每帧上传 GPU、哪些只在创建时上传一次。
 *
 * 演示内容：一个可调数量（100–5000）的粒子场，每个粒子持续漂移、自转、循环染色。控件可切换
 * position / rotation / color 是否动态——切为静态时对应属性的视觉效果立即冻结（CPU 仍在更新
 * particle.x / rotation / tint，但 GPU 缓冲不再每帧刷新），直观展示「静态属性 = 渲染时跳过」。
 *
 * 输入：count（粒子数）、positionDynamic、rotationDynamic、colorDynamic。
 * 主要操作：apply 时按当前 dynamicProperties 重建 ParticleContainer 并从持久化 states 填充粒子；
 * ticker 里无条件更新所有粒子的 x / y / rotation / tint（逻辑层始终运行，视觉层只反映动态属性）。
 *
 * 预期结果：
 *   - 增大 count 到数千，帧率读数仍接近 60——ParticleContainer 的吞吐能力。
 *   - position 切静态 → 粒子位置冻结；切回动态时粒子跳到 CPU 一直追踪的新位置。
 *   - rotation 切静态 → 自转停止。
 *   - color 切静态 → 染色停止。
 *
 * 阅读主线：先看 createCircleTexture 如何生成共享纹理、createTintLut 如何预算色表，再看
 * rebuildContainer 如何按 dynamicProperties 创建容器并从 states 填充粒子，最后看 ticker 如何
 * 无条件更新所有属性——静态属性因不刷新 GPU 缓冲而画面冻结。
 */
import {
  Application,
  Color,
  Particle,
  ParticleContainer,
  Rectangle,
  Text,
  Texture,
} from 'pixi.js';
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export interface ParticleDemoArgs {
  count: number;
  positionDynamic: boolean;
  rotationDynamic: boolean;
  colorDynamic: boolean;
}

export interface ParticleDemoSnapshot {
  count: number;
  dynamicProperties: string;
  fps: number;
}

export interface ParticleDemoInstance {
  update(args: ParticleDemoArgs): void;
  dispose(): void;
}

const MONO = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
} as const;

// 粒子纹理尺寸（像素）；白色径向渐变圆，tint 染色后直接显色。
const TEX_SIZE = 24;

// 预算 360 色 HSL → 数值查找表，ticker 里按 hue 索引取色，避免每帧反复解析颜色字符串。
function createTintLut(): number[] {
  const lut = new Array<number>(360);
  const color = new Color();
  for (let h = 0; h < 360; h++) {
    color.setValue(`hsl(${h}, 85%, 62%)`);
    lut[h] = color.toNumber();
  }
  return lut;
}

// 在离屏 canvas 上画一个白色径向渐变圆，包成 Texture 供所有粒子共享。
// 生产中这一步通常由 Assets.load(图片) 或精灵图完成；这里用程序生成保持范例自包含。
function createCircleTexture(): Texture {
  const canvas = document.createElement('canvas');
  canvas.width = TEX_SIZE;
  canvas.height = TEX_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const half = TEX_SIZE / 2;
  const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.4, 'rgba(255,255,255,0.85)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);
  return Texture.from(canvas);
}

// 逻辑层状态：即使容器被重建（切 dynamicProperties 时），states 也保持连续，
// 粒子的位置 / 旋转不会因控件切换而全部重置。
interface ParticleState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  baseHue: number;
}

export function createParticleDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ParticleDemoSnapshot) => void,
): ParticleDemoInstance {
  const app = new Application();
  let disposed = false;
  let destroyed = false;
  let ready = false;
  let current: ParticleDemoArgs = {
    count: 1000,
    positionDynamic: true,
    rotationDynamic: false,
    colorDynamic: false,
  };

  let texture: Texture | null = null;
  let tintLut: number[] = [];
  let container: ParticleContainer | null = null;
  const states: ParticleState[] = [];

  const title = new Text({
    text: '粒子容器（ParticleContainer）',
    style: { ...MONO, fontSize: 16, fill: 0xe2e8f0 },
  });
  title.anchor.set(0.5, 0);

  const hint = new Text({
    text: '切静态属性 → 对应视觉效果冻结；增大数量 → 帧率仍接近 60',
    style: { ...MONO, fontSize: 12, fill: 0x94a3b8 },
  });
  hint.anchor.set(0.5, 0);

  function layout() {
    const w = app.screen.width;
    const h = app.screen.height;
    const cx = w / 2;
    title.position.set(cx, h * 0.06);
    hint.position.set(cx, h * 0.06 + 24);
  }

  // 按目标数量增减 states；新增的 state 用随机参数填充，已有的保持不变。
  function ensureStates(count: number) {
    const w = app.screen.width;
    const h = app.screen.height;
    while (states.length < count) {
      states.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.7,
        vy: (Math.random() - 0.5) * 0.7,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.035,
        baseHue: Math.random() * 360,
      });
    }
    if (states.length > count) {
      states.length = count;
    }
  }

  // 按 dynamicProperties 重建容器。切控件时调用——dynamicProperties 在构造时决定 GPU
  // 缓冲布局，运行时改 _properties 不会重新生成 update 函数，所以重建是最可靠的方式。
  function rebuildContainer(args: ParticleDemoArgs) {
    if (!texture) {
      return;
    }
    if (container) {
      app.stage.removeChild(container);
      container.destroy();
      container = null;
    }

    container = new ParticleContainer({
      texture,
      dynamicProperties: {
        position: args.positionDynamic,
        rotation: args.rotationDynamic,
        color: args.colorDynamic,
        vertex: false,
        uvs: false,
      },
      boundsArea: new Rectangle(0, 0, app.screen.width, app.screen.height),
    });

    ensureStates(args.count);
    const particles: Particle[] = [];
    for (let i = 0; i < args.count; i++) {
      const s = states[i];
      particles.push(
        new Particle({
          texture,
          x: s.x,
          y: s.y,
          rotation: s.rotation,
          anchorX: 0.5,
          anchorY: 0.5,
          tint: tintLut[s.baseHue | 0],
        }),
      );
    }
    container.addParticle(...particles);
    app.stage.addChild(container);
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
    texture = createCircleTexture();
    tintLut = createTintLut();
    app.stage.addChild(title, hint);
    layout();
    rebuildContainer(current);

    let emitAccum = 0;
    app.ticker.add((ticker) => {
      const pcs = container?.particleChildren;
      if (!pcs || pcs.length === 0) {
        return;
      }
      const w = app.screen.width;
      const h = app.screen.height;
      const time = ticker.lastTime / 1000;

      // 逻辑层始终运行：无论 position / rotation / color 是否动态，都无条件更新 particle 属性。
      // 只有被标记为 dynamic 的属性才会每帧刷新 GPU 缓冲——静态属性的画面因此冻结。
      for (let i = 0; i < pcs.length; i++) {
        const s = states[i];
        const p = pcs[i];

        s.x += s.vx;
        s.y += s.vy;
        if (s.x < -TEX_SIZE) s.x += w + TEX_SIZE;
        else if (s.x > w + TEX_SIZE) s.x -= w + TEX_SIZE;
        if (s.y < -TEX_SIZE) s.y += h + TEX_SIZE;
        else if (s.y > h + TEX_SIZE) s.y -= h + TEX_SIZE;
        s.rotation += s.rotationSpeed;

        p.x = s.x;
        p.y = s.y;
        p.rotation = s.rotation;
        const hue = (s.baseHue + time * 35) % 360;
        p.tint = tintLut[hue | 0];
      }

      // 读数节流到 ~100ms，避免每帧 emit 抢占主线程。
      emitAccum += ticker.deltaMS;
      if (emitAccum >= 100) {
        emitAccum = 0;
        emit({
          count: pcs.length,
          dynamicProperties: formatDynamic(current),
          fps: Math.round(app.ticker.FPS),
        });
      }
    });
  });

  function formatDynamic(args: ParticleDemoArgs): string {
    const parts: string[] = [];
    if (args.positionDynamic) parts.push('position');
    if (args.rotationDynamic) parts.push('rotation');
    if (args.colorDynamic) parts.push('color');
    return parts.length > 0 ? parts.join(', ') : '（无）';
  }

  function destroyAll() {
    if (destroyed) {
      return;
    }
    destroyed = true;
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
    if (container) {
      // 窗口变化后更新 boundsArea，保持自定义边界与画布一致。
      container.boundsArea = new Rectangle(0, 0, size.width, size.height);
    }
  });

  return {
    update(args) {
      current = args;
      if (ready) {
        rebuildContainer(args);
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
