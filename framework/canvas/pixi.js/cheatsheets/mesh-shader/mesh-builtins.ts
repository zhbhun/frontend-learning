/**
 * 范例介绍：演示内置 MeshPlane——细分四边形 + 默认 shader（参与场景图变换），每帧扰动顶点做波浪。
 *
 * 演示内容：一张用 Graphics 生成的图案纹理贴到 MeshPlane 上，按振幅与波密度做正弦波浪扭曲。
 * 输入：振幅 amplitude、波密度 waveDensity。
 * 主要操作：每帧基于「原始顶点位置 + 时间 + 参数」改写 aPosition 缓冲，buffer.update() 推到 GPU。
 * 预期结果：
 *   - 调「振幅」→ 纹理起伏幅度变大 / 变小。
 *   - 调「波密度」→ 波浪流动加快 / 减慢、波数变化。
 *   - 与自定义 Shader 范例对比：MeshPlane 有 pivot / position（响应场景图变换），纹理跟随顶点拉扯。
 *
 * 阅读主线：先看 buildTexture（generateTexture 把 Graphics 转成纹理），再看「缓存原始顶点 →
 *   每帧扰动 → buffer.update()」这条形变主线，最后看 dispose 的释放与离屏暂停。
 */
import { Application, Graphics, MeshPlane, Texture } from 'pixi.js';
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export interface PlaneDemoArgs {
  amplitude: number;
  waveDensity: number;
}

export interface PlaneDemoSnapshot {
  amplitude: number;
  waveDensity: number;
}

export interface PlaneDemoInstance {
  update(args: PlaneDemoArgs): void;
  dispose(): void;
}

const PLANE_W = 260;
const PLANE_H = 200;
const SEG_X = 20; // 细分段数；顶点数 = 段数 + 1
const SEG_Y = 16;

// 顶点缓冲的最小结构：data 是 x/y 交错的 Float32Array，update() 把改动推到 GPU。
interface PositionBuffer {
  data: Float32Array;
  update(): void;
}

// 生成一张有明显图案的纹理，便于观察波浪扭曲时的拉扯。
function buildTexture(app: Application): Texture {
  const g = new Graphics();
  g.rect(0, 0, PLANE_W, PLANE_H).fill({ color: 0x1b2440 }); // 深色底
  g.rect(0, 0, PLANE_W, PLANE_H).stroke({ width: 4, color: 0x6ee7b7 }); // 边框
  // 网格线：波浪时能清楚看到顶点被拉扯
  for (let x = 0; x <= PLANE_W; x += 26) {
    g.moveTo(x, 0).lineTo(x, PLANE_H);
  }
  for (let y = 0; y <= PLANE_H; y += 26) {
    g.moveTo(0, y).lineTo(PLANE_W, y);
  }
  g.stroke({ width: 2, color: 0x334155 });
  // 几个色块，让扭曲更易辨认
  g.circle(70, 60, 28).fill(0x4f7cff);
  g.circle(190, 140, 28).fill(0xff8c42);
  g.rect(120, 70, 40, 40).fill(0xff5a7a);
  return app.renderer.generateTexture(g);
}

export function createPlaneDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: PlaneDemoSnapshot) => void,
): PlaneDemoInstance {
  const app = new Application();

  let disposed = false;
  let destroyed = false;
  let ready = false;
  let current: PlaneDemoArgs = { amplitude: 14, waveDensity: 3 };
  let plane: MeshPlane | null = null;
  let basePositions: Float32Array | null = null;
  let positionBuffer: PositionBuffer | null = null;

  const initial = readCanvasSize(canvas);
  const initPromise = app.init({
    canvas,
    width: Math.max(320, initial.width),
    height: Math.max(240, initial.height),
    background: '#0f1220',
    preference: 'webgl',
  });

  initPromise
    .then(() => {
      if (disposed) {
        destroyAll();
        return;
      }
      ready = true;

      const texture = buildTexture(app);
      plane = new MeshPlane({
        texture,
        verticesX: SEG_X + 1,
        verticesY: SEG_Y + 1,
      });
      plane.pivot.set(PLANE_W / 2, PLANE_H / 2); // 居中：内置 mesh 参与场景图变换
      app.stage.addChild(plane);

      // 缓存原始顶点，每帧基于它叠加扰动，避免反复偏移导致的累积漂移。
      const attr = plane.geometry.getAttribute('aPosition');
      positionBuffer = attr.buffer as PositionBuffer;
      basePositions = new Float32Array(positionBuffer.data);

      app.ticker.add(() => {
        if (!plane || !positionBuffer || !basePositions) {
          return;
        }
        const t = (performance.now() / 1000) * current.waveDensity;
        const data = positionBuffer.data;
        for (let i = 0; i < data.length; i += 2) {
          const baseX = basePositions[i];
          const baseY = basePositions[i + 1];
          // 横向波：y 随 x 与时间正弦起伏，UV 固定 → 纹理跟随顶点被拉伸
          data[i + 1] = baseY + Math.sin(baseX * 0.05 + t) * current.amplitude;
        }
        // 改完必须 update()：buffer 不监听自身 data 数组，不调用就停在 CPU。
        positionBuffer.update();
      });

      layout();
      emitSnapshot();
    })
    .catch(() => {
      // 渲染器初始化失败时画布保持空白。
    });

  function layout() {
    if (!plane) {
      return;
    }
    plane.x = app.screen.width / 2;
    plane.y = app.screen.height / 2;
  }

  function emitSnapshot() {
    emit({
      amplitude: current.amplitude,
      waveDensity: current.waveDensity,
    });
  }

  function destroyAll() {
    if (destroyed) {
      return;
    }
    destroyed = true;
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

  // 离屏时暂停渲染循环以省 GPU。
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
    update(args) {
      current = args;
      emitSnapshot();
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
