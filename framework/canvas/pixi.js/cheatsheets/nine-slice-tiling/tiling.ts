/**
 * 范例介绍：演示 TilingSprite 的平铺填充——把一张纹理按独立瓦片变换（tilePosition /
 * tileScale / tileRotation）重复铺满矩形，而不是拉伸。
 * 输入：tileScale（每个瓦片的缩放）、tileRotation（每个瓦片的旋转，度）。
 * 主要操作：用 Texture.from 把程序生成的瓦片画布包成 Texture →
 * new TilingSprite({ texture, width, height }) → ticker 持续推进 tilePosition.x 滚动图案 →
 * 运行时改 tileScale / tileRotation。
 * 预期结果：画布上铺满完全相同的瓦片（数得出重复次数）；调 tileScale 时每个瓦片同步变大或
 * 变小（重复次数随之改变）；调 tileRotation 时每个瓦片原地旋转；图案整体持续向左滚动——
 * 证明滚动发生在瓦片变换层、精灵位置不动。
 * 阅读主线：先看 createTileTexture 如何画一个非对称瓦片，再看构造 options 与 ticker 里的
 * tilePosition，最后看 update 的热更与 dispose 的资源释放、离屏暂停。
 */
import { Application, TilingSprite, Texture } from 'pixi.js';

export interface TilingArgs {
  tileScale: number;
  tileRotation: number; // 度
}

export interface TilingSnapshot {
  tileScale: string;
  tileRotation: string;
  area: string;
}

export interface TilingInstance {
  update(args: TilingArgs): void;
  dispose(): void;
}

const TILE = 80;

// 生成瓦片纹理：非对称几何标记 + 边框，平铺后能数出重复次数、看出旋转方向。
function createTileTexture(): Texture {
  const cnv = document.createElement('canvas');
  cnv.width = TILE;
  cnv.height = TILE;
  const ctx = cnv.getContext('2d');
  if (!ctx) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }

  // 深色底。
  ctx.fillStyle = '#1e3a5f';
  ctx.fillRect(0, 0, TILE, TILE);

  // 边框：显示瓦片边界，重复时接缝清晰。
  ctx.strokeStyle = '#67e8f9';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, TILE - 2, TILE - 2);

  // 中心菱形（青色），非对称方向标记：旋转时一眼看出朝向。
  ctx.fillStyle = '#22d3ee';
  ctx.beginPath();
  ctx.moveTo(TILE / 2, 12);
  ctx.lineTo(TILE - 12, TILE / 2);
  ctx.lineTo(TILE / 2, TILE - 12);
  ctx.lineTo(12, TILE / 2);
  ctx.closePath();
  ctx.fill();

  // 四角小点（琥珀色），缩放与旋转时都能辨别单个瓦片。
  ctx.fillStyle = '#fbbf24';
  const r = 3;
  for (const [px, py] of [
    [12, 12],
    [TILE - 12, 12],
    [12, TILE - 12],
    [TILE - 12, TILE - 12],
  ]) {
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
  }

  return Texture.from(cnv);
}

export function createTilingDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: TilingSnapshot) => void,
): TilingInstance {
  const app = new Application();

  let disposed = false;
  let ready = false;
  let current: TilingArgs = { tileScale: 1, tileRotation: 0 };
  let tiling: TilingSprite | null = null;
  let texture: Texture | null = null;

  function applyArgs(args: TilingArgs) {
    if (!tiling) {
      return;
    }
    // tileScale 是独立于精灵 scale 的瓦片缩放；set(n) 同时设 x、y。
    tiling.tileScale.set(args.tileScale);
    // tileRotation 接收弧度；控件用度，这里转换。
    tiling.tileRotation = (args.tileRotation * Math.PI) / 180;
  }

  function emitSnapshot() {
    if (!ready || !tiling) {
      return;
    }
    emit({
      tileScale: current.tileScale.toFixed(2),
      tileRotation: `${current.tileRotation}°`,
      area: `${Math.round(tiling.width)} × ${Math.round(tiling.height)}`,
    });
  }

  app
    .init({
      canvas,
      background: '#0b1120',
      antialias: true,
      resizeTo: canvas.parentElement ?? window,
    })
    .then(() => {
      if (disposed) {
        app.destroy();
        return;
      }
      ready = true;

      texture = createTileTexture();
      tiling = new TilingSprite({
        texture,
        width: app.screen.width,
        height: app.screen.height,
      });
      app.stage.addChild(tiling);
      applyArgs(current);

      // 用 tilePosition.x 持续滚动纹理：图案流动而精灵位置不变——这是平铺的核心特征。
      app.ticker.add(() => {
        if (!tiling) {
          return;
        }
        tiling.tilePosition.x -= 0.6;
        // 保持铺满画布（画布尺寸可能随容器变化）。
        if (tiling.width !== app.screen.width) {
          tiling.width = app.screen.width;
        }
        if (tiling.height !== app.screen.height) {
          tiling.height = app.screen.height;
        }
      });

      emitSnapshot();
    })
    .catch(() => {
      // 渲染器初始化失败时画布保持空白。
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
      if (ready) {
        applyArgs(args);
        emitSnapshot();
      }
    },
    dispose() {
      disposed = true;
      visibilityObserver.disconnect();
      if (ready) {
        texture?.destroy(true);
        app.destroy();
      }
    },
  };
}
