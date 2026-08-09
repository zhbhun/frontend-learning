/**
 * 范例介绍：演示 Texture 与 Sprite 的分工——同一个 Texture（图像数据）被 Sprite（显示对象）
 * 放进场景，anchor 决定纹理在精灵内的锚点，tint 在不改动 Texture 的前提下染色。
 * 输入：anchor（0,0 / 0.5,0.5 / 1,1）与 tint（颜色）。
 * 主要操作：用 Texture.from 把程序生成的箭头画布包成 Texture → new Sprite(texture) →
 * anchor.set / tint 运行时修改 → ticker 缓慢自转，让锚点位置一目了然。
 * 预期结果：切 anchor 时精灵绕不同点旋转、定位中心随之偏移；改 tint 时纹理整体染色，
 * 证明染色是 Sprite 层的能力、Texture 数据不变。
 * 阅读主线：先看 createArrowTexture 如何得到 Texture，再看 new Sprite 与 anchor/tint 用法，
 * 最后看 update 的热更新与 dispose 的资源释放、离屏暂停。
 */
import { Application, Sprite, Texture } from 'pixi.js';

export interface SpriteDemoArgs {
  anchor: string;
  tint: string;
}

export interface SpriteDemoSnapshot {
  anchor: string;
  size: string;
  tint: string;
}

export interface SpriteDemoInstance {
  update(args: SpriteDemoArgs): void;
  dispose(): void;
}

// anchor 控件值 → 坐标；0~1 归一化，(0,0) 左上、(1,1) 右下。
const ANCHOR_MAP: Record<string, [number, number]> = {
  '0,0': [0, 0],
  '0.5,0.5': [0.5, 0.5],
  '1,1': [1, 1],
};

const ANCHOR_LABELS: Record<string, string> = {
  '0,0': '左上 (0, 0)',
  '0.5,0.5': '中心 (0.5, 0.5)',
  '1,1': '右下 (1, 1)',
};

// 把 CSS 颜色字符串转成 0xRRGGBB 数值，喂给 sprite.tint。
function tintToNumber(color: string): number {
  return Number.parseInt(color.replace('#', ''), 16);
}

// 在离屏 canvas 上画一个方向箭头：白色主体（染色后直接显色）+ 蓝色箭头（染色后相乘）。
// 用 Texture.from(canvas) 包成 Texture——生产里这一步通常由 Assets.load(图片) 完成。
function createArrowTexture(): Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 160;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(8, 36, 96, 24, 12);
  ctx.fill();

  ctx.fillStyle = '#4f7cff';
  ctx.beginPath();
  ctx.moveTo(104, 12);
  ctx.lineTo(152, 48);
  ctx.lineTo(104, 84);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#1f2937';
  ctx.fillRect(20, 46, 56, 4);

  return Texture.from(canvas);
}

export function createSpriteDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: SpriteDemoSnapshot) => void,
): SpriteDemoInstance {
  const app = new Application();

  let disposed = false;
  let ready = false;
  let current: SpriteDemoArgs = { anchor: '0.5,0.5', tint: '#ffffff' };
  let sprite: Sprite | null = null;
  let texture: Texture | null = null;

  function applyArgs(args: SpriteDemoArgs) {
    if (!sprite) {
      return;
    }
    const [ax, ay] = ANCHOR_MAP[args.anchor] ?? [0.5, 0.5];
    // anchor 是精灵特有的锚点：定位、缩放、旋转都以它为参考点。
    sprite.anchor.set(ax, ay);
    // tint 与纹理颜色相乘，实现「不换图也能改外观」。
    sprite.tint = tintToNumber(args.tint);
  }

  function emitSnapshot() {
    if (!ready || !texture) {
      return;
    }
    emit({
      anchor: ANCHOR_LABELS[current.anchor] ?? current.anchor,
      size: `${Math.round(texture.width)} × ${Math.round(texture.height)}`,
      tint: current.tint,
    });
  }

  app.init({
    canvas,
    background: '#1a1a2e',
    antialias: true,
    resizeTo: canvas.parentElement ?? window,
  })
    .then(() => {
      if (disposed) {
        app.destroy();
        return;
      }
      ready = true;

      // Texture 是图像数据，Sprite 是把它放进场景的显示对象。
      texture = createArrowTexture();
      sprite = new Sprite(texture);
      sprite.position.set(app.screen.width / 2, app.screen.height / 2);
      applyArgs(current);
      app.stage.addChild(sprite);

      // 缓慢自转，让 anchor 锚点的位置直观可见；每帧重新居中适配画布尺寸。
      app.ticker.add(() => {
        if (!sprite) {
          return;
        }
        sprite.rotation += 0.01;
        sprite.x = app.screen.width / 2;
        sprite.y = app.screen.height / 2;
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
        // Texture 的生命周期独立于 Sprite：销毁纹理要单独调用，避免缓存与显存残留。
        texture?.destroy(true);
        app.destroy();
      }
    },
  };
}
